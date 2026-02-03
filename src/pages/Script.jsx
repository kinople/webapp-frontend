import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getApiUrl } from "../utils/api";
import "../css/Script.css";

// Local assets
import dropdownArrowImg from "../assets/dropdown-arrow.svg";
import leftArrowImg from "../assets/left-arrow.svg";
import rightArrowImg from "../assets/right-arrow.svg";

const Script = () => {
	const { user, id } = useParams();
	const navigate = useNavigate();
	const sidebarCollapsed = useSelector((state) => state.ui.navbarCollapsed);
	const [isUploading, setIsUploading] = useState(false);
	const [isGeneratingBreakdown, setIsGeneratingBreakdown] = useState(false);
	const [uploadStatus, setUploadStatus] = useState("");
	const [uploadedScripts, setUploadedScripts] = useState([]);

	const fileInputRef = useRef(null);

	const [script_list, setScriptList] = useState([]);
	const [selectedScript, setSelectedScript] = useState(null);
	const [pdfUrl, setPdfUrl] = useState(null);
	const [newFileName, setNewFileName] = useState("");
	const [showFileNameModal, setShowFileNameModal] = useState(false);
	const [tempFile, setTempFile] = useState(null);
	const [selectedModel, setSelectedModel] = useState("gpt-4.1-2025-04-14");
	const [progress, setProgress] = useState(0);
	const [breakdownMessage, setBreakdownMessage] = useState("");
	const [activeDropdown, setActiveDropdown] = useState(null);
	const [tabScrollIndex, setTabScrollIndex] = useState(0);

	// Show more tabs when sidebar is collapsed
	const VISIBLE_TABS = sidebarCollapsed ? 8 : 7;

	const fetchScripts = async () => {
		try {
			const response = await fetch(getApiUrl(`/api/${id}/script-list`), {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				mode: "cors",
			});

			if (!response.ok) {
				throw new Error("Failed to fetch scripts");
			}

			const data = await response.json();
			setScriptList(data);
			return data;
		} catch (error) {
			console.error("Error fetching scripts:", error);
			return [];
		}
	};

	useEffect(() => {
		fetchScripts();
	}, []);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (e) => {
			if (!e.target.closest(".script-tab-wrapper")) {
				setActiveDropdown(null);
			}
		};
		document.addEventListener("click", handleClickOutside);
		return () => document.removeEventListener("click", handleClickOutside);
	}, []);

	const uploadFile = async (file, fileName) => {
		if (!file) return;

		// Refs to track progress state across async operations
		let progressIntervalId = null;
		let currentProgress = 0;
		let breakdownComplete = false;

		// Helper to animate progress smoothly from current to target over duration
		const animateProgress = (startProgress, endProgress, duration) => {
			return new Promise((resolve) => {
				const updateInterval = 50; // ms
				const steps = Math.max(Math.floor(duration / updateInterval), 1);
				const increment = (endProgress - startProgress) / steps;
				let current = startProgress;

				const interval = setInterval(() => {
					current = Math.min(current + increment, endProgress);
					setProgress(Math.round(current));
					if (current >= endProgress) {
						clearInterval(interval);
						resolve();
					}
				}, updateInterval);
			});
		};

		// Progress messages at different stages
		const getProgressMessage = (progress) => {
			if (progress < 15) return "Uploading script...";
			if (progress < 30) return "Parsing PDF...";
			if (progress < 50) return "Extracting scenes...";
			if (progress < 75) return "Generating breakdown...";
			if (progress < 95) return "Processing scenes and elements...";
			return "Finalizing breakdown...";
		};

		try {
			setIsUploading(true);
			setIsGeneratingBreakdown(false);
			setUploadStatus(`Uploading ${fileName}...`);
			setBreakdownMessage("Uploading script...");
			
			// Start progress immediately at 1% so user sees it right away
			currentProgress = 1;
			setProgress(1);

			const formData = new FormData();
			formData.append("scriptPdf", file);
			formData.append("fileName", fileName);

			// Phase 1: Upload (0% → 15%) - Gradual smooth animation during upload
			// Start the progress animation FIRST before fetch
			const uploadProgressInterval = setInterval(() => {
				if (currentProgress < 14) {
					// Small increment of 0.2 every 40ms for smooth gradual progress
					currentProgress = Math.min(currentProgress + 0.2, 14);
					setProgress(Math.round(currentProgress));
					
					// Update message based on progress
					if (currentProgress < 5) {
						setBreakdownMessage("Uploading script...");
					} else if (currentProgress < 10) {
						setBreakdownMessage("Processing file...");
					} else {
						setBreakdownMessage("Analyzing script...");
					}
				}
			}, 40);

			// Now start the actual upload
			const response = await fetch(getApiUrl(`/api/${id}/upload-script`), {
				method: "POST",
				body: formData,
				credentials: "include",
				mode: "cors",
			});
			
			clearInterval(uploadProgressInterval);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: "Upload failed" }));
				throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
			}

			const uploadResult = await response.json();
			setUploadedScripts((prev) => [...prev, { name: fileName }]);
			await fetchScripts();

			// Complete upload phase - smoothly animate from current to 15%
			await animateProgress(currentProgress, 15, 400);
			currentProgress = 15;

			// Phase 2: Breakdown (15% → 95%) - Time-based on sceneCount
			setIsUploading(false);
			setIsGeneratingBreakdown(true);
			const sceneCount = uploadResult.scene_count || 0;
			setBreakdownMessage(`Starting breakdown... (${sceneCount} scenes detected)`);

			// Calculate expected breakdown time: sceneCount × 4 seconds (minimum 8 seconds)
			const timePerScene = 5000; // 4 seconds per scene
			const totalExpectedTime = Math.max(sceneCount * timePerScene, 8000);
			const breakdownStartTime = Date.now();

			// Helper to get scene-based progress message
			const getSceneProgressMessage = (elapsedTime, totalTime, totalScenes) => {
				if (totalScenes === 0) return "Processing breakdown...";
				// Calculate which scene we're on based on elapsed time
				const progressRatio = Math.min(elapsedTime / totalTime, 1);
				const currentScene = Math.min(Math.ceil(progressRatio * totalScenes), totalScenes);
				return `Processing scene ${currentScene}/${totalScenes}...`;
			};

			// Start breakdown API call (runs in parallel with progress animation)
			const breakdownUrl =
				user === "2"
					? getApiUrl(`/api/${id}/generate-breakdown/${fileName}?model=${selectedModel}`)
					: getApiUrl(`/api/${id}/generate-breakdown/${fileName}`);

			const breakdownPromise = fetch(breakdownUrl, {
				method: "POST",
				credentials: "include",
				mode: "cors",
			}).then((res) => {
				breakdownComplete = true;
				return res;
			});

			// Time-based progress animation (15% → 95%)
			// Progress = 15 + (elapsedTime / totalExpectedTime) × 80
			const updateInterval = 100; // ms
			progressIntervalId = setInterval(() => {
				if (!breakdownComplete) {
					const elapsedTime = Date.now() - breakdownStartTime;
					const timeBasedProgress = 15 + (elapsedTime / totalExpectedTime) * 80;
					// Cap at 95% until breakdown completes
					currentProgress = Math.min(timeBasedProgress, 95);
					setProgress(Math.round(currentProgress));
					setBreakdownMessage(getSceneProgressMessage(elapsedTime, totalExpectedTime, sceneCount));
				}
			}, updateInterval);

			// Wait for breakdown to complete
			const breakdownResponse = await breakdownPromise;
			clearInterval(progressIntervalId);
			progressIntervalId = null;

			if (!breakdownResponse.ok) {
				throw new Error("Failed to generate script breakdown");
			}

			// Phase 3: Completion (current% → 100%) - Smooth animation
			// If breakdown finished early, animate from current position to 100%
			// If breakdown finished at 95% or later, animate to 100%
			const finalProgress = Math.round(currentProgress);
			const completionDuration = finalProgress < 95 ? 1500 : 1000; // More time if finished early

			await animateProgress(finalProgress, 100, completionDuration);
			setProgress(100);
			setBreakdownMessage("Breakdown completed!");
		} catch (error) {
			console.error("Upload/Breakdown error:", error);
			if (progressIntervalId) {
				clearInterval(progressIntervalId);
			}
			alert("Error in generating Breakdown, try again");
			setUploadStatus(`Error: ${error.message}`);
			setShowFileNameModal(false);
			setIsGeneratingBreakdown(false);
			setProgress(0);
			setBreakdownMessage("");
			setTimeout(() => setUploadStatus(""), 5000);
		} finally {
			setIsUploading(false);
		}
	};

	const handleFileChange = (event) => {
		const file = event.target.files[0];
		if (file && file.type === "application/pdf") {
			setTempFile(file);
		} else if (file) {
			setUploadStatus("Please select a valid PDF file.");
			setTimeout(() => setUploadStatus(""), 3000);
		}
		if (fileInputRef.current) {
			fileInputRef.current.value = null;
		}
	};

	const handleImportClick = () => {
		if (fileInputRef.current) {
			fileInputRef.current.click();
		}
		setShowFileNameModal(true);
	};

	const handleDeleteScript = async (scriptName) => {
		if (!window.confirm(`Are you sure you want to delete "${scriptName}"?`)) {
			return;
		}

		try {
			const response = await fetch(getApiUrl(`/api/${id}/delete-script/${scriptName}`), {
				method: "DELETE",
				credentials: "include",
				mode: "cors",
			});

			if (!response.ok) {
				throw new Error("Failed to delete script");
			}

			if (selectedScript === scriptName) {
				setSelectedScript(null);
				setPdfUrl(null);
			}

			await fetchScripts();
			setActiveDropdown(null);
		} catch (error) {
			console.error("Error deleting script:", error);
			alert("Failed to delete script");
		}
	};

	const handleArchiveScript = async (scriptName) => {
		// Implement archive functionality
		console.log("Archive script:", scriptName);
		setActiveDropdown(null);
	};

	const handleScriptClick = async (script) => {
		try {
			const response = await fetch(getApiUrl(`/api/${id}/script-view/${script}`), {
				method: "GET",
				mode: "cors",
			});

			if (!response.ok) {
				throw new Error("Failed to fetch PDF");
			}

			const data = await response.json();
			setPdfUrl(data.url);
			setSelectedScript(script);
		} catch (error) {
			console.error("Error fetching script:", error);
			setUploadStatus("Failed to load the script");
			setTimeout(() => setUploadStatus(""), 3000);
		}
	};

	const handleFileNameSubmit = (e) => {
		e.preventDefault();
		if (newFileName.trim() && tempFile) {
			const sanitizedFileName = newFileName.trim().replace(/\s+/g, "-");
			uploadFile(tempFile, sanitizedFileName);
		}
	};

	const handleModalClose = () => {
		setShowFileNameModal(false);
		setNewFileName("");
		setTempFile(null);
		setSelectedModel("gpt-4.1-2025-04-14");
		setIsGeneratingBreakdown(false);
		setProgress(0);
		setBreakdownMessage("");
	};

	const handleViewBreakdown = () => {
		handleModalClose();
		navigate(`/${user}/${id}/script-breakdown`);
	};

	useEffect(() => {
		return () => {
			if (pdfUrl) {
				URL.revokeObjectURL(pdfUrl);
			}
		};
	}, [pdfUrl]);

	const isProcessing = isUploading || isGeneratingBreakdown;

	// Get visible tabs based on scroll index
	const visibleScripts = script_list.slice(tabScrollIndex, tabScrollIndex + VISIBLE_TABS);
	const canScrollLeft = tabScrollIndex > 0;
	const canScrollRight = tabScrollIndex + VISIBLE_TABS < script_list.length;

	const handleTabScrollLeft = () => {
		if (canScrollLeft) {
			setTabScrollIndex(tabScrollIndex - 1);
		}
	};

	const handleTabScrollRight = () => {
		if (canScrollRight) {
			setTabScrollIndex(tabScrollIndex + 1);
		}
	};

	// SVG Icons
	const PlusIcon = () => (
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);

	const XIcon = () => (
		<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);

	return (
		<div className="script-page-container">
			{/* Divider */}
			<hr className="script-divider" />

			{/* Header */}
			<div className="script-header">
				<div className="script-header-left">
					{/* Left Navigation Arrow */}
					<button className="script-nav-button" onClick={handleTabScrollLeft} disabled={!canScrollLeft}>
						<img src={leftArrowImg} alt="Previous" />
					</button>

					{/* Script Tabs */}
					<div className="script-tabs-container">
						{visibleScripts.length > 0 ? (
							visibleScripts.map((script) => (
								<div key={script.name} className="script-tab-wrapper">
									<button
										className={`script-tab ${selectedScript === script.name ? "active" : ""}`}
										onClick={() => {
											handleScriptClick(script.name);
										}}
										title={script.name}
									>
										<span className="script-tab-name">{script.name}</span>

										<span
											className="script-tab-arrow"
											onClick={(e) => {
												e.stopPropagation(); // prevents button click
												setActiveDropdown(activeDropdown === script.name ? null : script.name);
											}}
										>
											<img src={dropdownArrowImg} alt="" />
										</span>
									</button>

									{/* Dropdown Menu */}
									{activeDropdown === script.name && (
										<div className="script-tab-dropdown">
											<button className="script-tab-dropdown-item" onClick={() => handleArchiveScript(script.name)}>
												Archive draft
											</button>
											<button className="script-tab-dropdown-item" onClick={() => handleDeleteScript(script.name)}>
												Delete Draft
											</button>
										</div>
									)}
								</div>
							))
						) : (
							<span className="script-empty-tabs">No scripts uploaded yet</span>
						)}
					</div>

					{/* Right Navigation Arrow */}
					<button className="script-nav-button" onClick={handleTabScrollRight} disabled={!canScrollRight}>
						<img src={rightArrowImg} alt="Next" />
					</button>
				</div>

				{/* Import New Draft Button */}
				<button onClick={handleImportClick} className={`script-import-button ${isProcessing ? "disabled" : ""}`} disabled={isProcessing}>
					<PlusIcon />
					<span>{isUploading ? "Uploading..." : "Import New Draft"}</span>
				</button>
			</div>

			{/* Hidden File Input */}
			<input type="file" accept=".pdf" onChange={handleFileChange} className="script-hidden-input" ref={fileInputRef} disabled={isProcessing} />

			{/* Modal */}
			{showFileNameModal && (
				<div className="script-modal-overlay">
					<div className="script-modal">
						{isUploading || isGeneratingBreakdown ? (
							/* Progress Bar View - shows during upload AND breakdown phases */
							<div className="script-progress-modal">
								<h3 className="script-progress-title">{breakdownMessage || "Starting..."}</h3>
								<div className="script-progress-bar-container">
									<div className="script-progress-bar" style={{ width: `${progress}%` }} />
								</div>
								<span className="script-progress-percentage">{progress}%</span>
								{progress === 100 && (
									<div className="script-progress-footer">
										<button className="script-view-breakdown-button" onClick={handleViewBreakdown}>
											View Breakdown
										</button>
									</div>
								)}
							</div>
						) : (
							/* Enter Script Name View */
							<form onSubmit={handleFileNameSubmit}>
								<div className="script-modal-content">
									<h3 className="script-modal-title">Enter Script Name</h3>
									<div>
										<input
											type="text"
											value={newFileName}
											onChange={(e) => setNewFileName(e.target.value)}
											placeholder="Enter Script Name"
											className="script-filename-input"
											autoFocus
											disabled={isProcessing}
										/>
										{tempFile && (
											<div className="script-file-tag">
												<span className="script-file-tag-name">{tempFile.name}</span>
												<button type="button" className="script-file-tag-remove" onClick={() => setTempFile(null)}>
													<XIcon />
												</button>
											</div>
										)}
									</div>

									{/* Model Selection (admin only) */}
									{user === "2" && (
										<div className="script-model-selection">
											<label className="script-model-label">Select LLM Model:</label>
											<select
												value={selectedModel}
												onChange={(e) => setSelectedModel(e.target.value)}
												className="script-model-select"
												disabled={isProcessing}
											>
												<option value="gpt-4.1-2025-04-14">GPT-4.1 (2025-04-14)</option>
												<option value="gpt-5">GPT-5 (2025-08-07)</option>
												<option value="gpt-5-nano-2025-08-07">GPT-5 Nano (2025-08-07)</option>
												<option value="gpt-5-mini-2025-08-07">GPT-5 Mini (2025-08-07)</option>
											</select>
										</div>
									)}

									<div className="script-modal-buttons">
										<button type="button" onClick={handleModalClose} className="script-cancel-button" disabled={isProcessing}>
											Cancel
										</button>
										<button
											type="submit"
											disabled={!newFileName.trim() || !tempFile || isProcessing}
											className={`script-submit-button ${!newFileName.trim() || !tempFile || isProcessing ? "disabled" : ""}`}
										>
											Upload
										</button>
									</div>
								</div>
							</form>
						)}
					</div>
				</div>
			)}

			{/* Main Content Area */}
			<div className="script-main-content">
				<div className="script-content-viewer">
					{script_list.length === 0 && !uploadStatus ? (
						<p className="script-placeholder">Upload scripts to view them here</p>
					) : !pdfUrl ? (
						<p className="script-placeholder">Select a script to view it here</p>
					) : (
						<iframe src={pdfUrl} className="script-pdf-viewer" title="PDF Viewer" />
					)}
				</div>
			</div>
		</div>
	);
};

export default Script;
