import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProjectHeader from "../components/ProjectHeader";
import { getApiUrl, fetchWithAuth } from "../utils/api";
import ProgressBar from "../components/ProgressBarForBreakdown";

const Script = () => {
	const { user, id } = useParams();
	const navigate = useNavigate();
	const [selectedFile, setSelectedFile] = useState(null); // Keep track of the file *before* upload starts
	const [isUploading, setIsUploading] = useState(false);
	const [isGeneratingBreakdown, setIsGeneratingBreakdown] = useState(false);
	const [uploadStatus, setUploadStatus] = useState("");
	// Add state to store uploaded scripts (example)
	const [uploadedScripts, setUploadedScripts] = useState([]);

	// Create a ref for the hidden file input
	const fileInputRef = useRef(null);

	const [script_list, setScriptList] = useState([]);
	const [selectedScript, setSelectedScript] = useState(null);
	const [pdfUrl, setPdfUrl] = useState(null);
	const [newFileName, setNewFileName] = useState("");
	const [showFileNameModal, setShowFileNameModal] = useState(false);
	const [tempFile, setTempFile] = useState(null);
	const [selectedModel, setSelectedModel] = useState("gpt-4.1-2025-04-14"); // Update default model
	const [isDeleting, setIsDeleting] = useState(false);
	const [progress, setProgress] = useState(0);
	const [breakdownMessage, setBreakdownMessage] = useState("");

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
			setScriptList(data); // Update the script list state
			return data; // Return the data for immediate use if needed
		} catch (error) {
			console.error("Error fetching scripts:", error);
			return []; // Return empty array on error
		}
	};

	// Use useEffect to fetch scripts only once when component mounts
	useEffect(() => {
		fetchScripts();
	}, []); // Empty dependency array means this runs once on mount

	// Function to handle the actual file upload logic
	const uploadFile = async (file, fileName) => {
		if (!file) return;

		try {
			// Start upload phase
			setIsUploading(true);
			setIsGeneratingBreakdown(false);
			setUploadStatus(`Uploading ${fileName}...`);
			setSelectedFile(null);

			const formData = new FormData();
			formData.append("scriptPdf", file);
			formData.append("fileName", fileName);

			const response = await fetch(getApiUrl(`/api/${id}/upload-script`), {
				method: "POST",
				body: formData,
				credentials: "include",
				mode: "cors",
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: "Upload failed" }));
				throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
			}

			const result = await response.json();
			setUploadedScripts((prev) => [...prev, { name: fileName }]);
			await fetchScripts();

			// Start breakdown generation phase
			setIsUploading(false);
			setIsGeneratingBreakdown(true);
			setUploadStatus("Generating script breakdown...");

			// Include model in the breakdown request if user is 2
			const breakdownUrl =
				user === "2"
					? getApiUrl(`/api/${id}/generate-breakdown/${fileName}?model=${selectedModel}`)
					: getApiUrl(`/api/${id}/generate-breakdown/${fileName}`);

			const breakdownResponse = await fetch(breakdownUrl, {
				method: "POST",
				mode: "cors",
			});

			if (!breakdownResponse.ok) {
				alert("Error in generating Breakdown , try again");
				throw new Error("Failed to generate script breakdown");
			}
			alert("Breakdown Generated Successfully");

			setUploadStatus("Breakdown generated successfully! Redirecting...");

			// Small delay before navigation to show success message
			setTimeout(() => {
				navigate(`/${user}/${id}/script-breakdown`);
			}, 1000);
		} catch (error) {
			console.error("Upload/Breakdown error:", error);
            alert("Error in generating Breakdown , try again");
			setUploadStatus(`Error: ${error.message}`);
			setTimeout(() => setUploadStatus(""), 5000);
		} finally {
			setIsUploading(false);
			setIsGeneratingBreakdown(false);
			setShowFileNameModal(false);
			setNewFileName("");
			setTempFile(null);
			setSelectedModel("gpt-4.1-2025-04-14"); // Reset model selection
		}
	};

	// const uploadFileWithProgress = async (file, fileName) => {
	// 	if (!file) return;

	// 	let eventSource = null;

	// 	try {
	// 		// Start upload phase
	// 		setIsUploading(true);
	// 		setIsGeneratingBreakdown(false);
	// 		setProgress(0);
	// 		setBreakdownMessage("");
	// 		setUploadStatus(`Uploading ${fileName}...`);
	// 		setSelectedFile(null);

	// 		const formData = new FormData();
	// 		formData.append("scriptPdf", file);
	// 		formData.append("fileName", fileName);

	// 		const response = await fetch(getApiUrl(`/api/${id}/upload-script`), {
	// 			method: "POST",
	// 			body: formData,
	// 			credentials: "include",
	// 			mode: "cors",
	// 		});

	// 		if (!response.ok) {
	// 			const errorData = await response.json().catch(() => ({ message: "Upload failed" }));
	// 			throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
	// 		}

	// 		const result = await response.json();
	// 		setUploadedScripts((prev) => [...prev, { name: fileName }]);
	// 		await fetchScripts();

	// 		// Start breakdown generation phase with SSE
	// 		setIsUploading(false);
	// 		setIsGeneratingBreakdown(true);
	// 		setProgress(0);
	// 		setUploadStatus("Initializing breakdown generation...");

	// 		// Include model in the breakdown request if user is 2
	// 		const breakdownUrl =
	// 			user === "2"
	// 				? getApiUrl(`/api/${id}/generate-breakdown-p/${fileName}?model=${selectedModel}`)
	// 				: getApiUrl(`/api/${id}/generate-breakdown-p/${fileName}`);

	// 		// Use EventSource for real-time progress updates
	// 		eventSource = new EventSource(breakdownUrl);

	// 		// Handle progress messages
	// 		eventSource.onmessage = (event) => {
	// 			// Console log every message from the event
	// 			console.log("SSE Message received:", event.data);

	// 			try {
	// 				const data = JSON.parse(event.data);

	// 				// Console log parsed data
	// 				console.log("Parsed SSE data:", data);

	// 				// Update progress percentage if available
	// 				if (data.progress !== undefined) {
	// 					setProgress(data.progress);
	// 					console.log(`Progress updated: ${data.progress}%`);
	// 				}

	// 				// Update status message
	// 				if (data.message) {
	// 					setBreakdownMessage(data.message);
	// 					setUploadStatus(data.message);
	// 					console.log("Status message:", data.message);
	// 				}

	// 				// Handle different status types
	// 				if (data.status === "completed") {
	// 					console.log("Breakdown completed successfully!", data);
	// 					setProgress(100);
	// 					setUploadStatus("Breakdown generated successfully! Redirecting...");
	// 					eventSource.close();

	// 					// Small delay before navigation to show success message
	// 					setTimeout(() => {
	// 						navigate(`/${user}/${id}/script-breakdown`);
	// 					}, 1000);
	// 				} else if (data.status === "error") {
	// 					console.error("Breakdown error:", data.message);
	// 					throw new Error(data.message || "Failed to generate breakdown");
	// 				}
	// 			} catch (parseError) {
	// 				console.error("Error parsing SSE data:", parseError);
	// 				setUploadStatus(`Error: ${parseError.message}`);
	// 				if (eventSource) eventSource.close();
	// 			}
	// 		};

	// 		// Handle SSE errors
	// 		eventSource.onerror = (error) => {
	// 			console.error("SSE connection error:", error);
	// 			console.error("EventSource readyState:", eventSource?.readyState);
	// 			if (eventSource) eventSource.close();
	// 			throw new Error("Connection to server lost during breakdown generation");
	// 		};

	// 		// Log when connection opens
	// 		eventSource.onopen = () => {
	// 			console.log("SSE connection opened successfully");
	// 		};
	// 	} catch (error) {
	// 		console.error("Upload/Breakdown error:", error);
	// 		setUploadStatus(`Error: ${error.message}`);
	// 		setProgress(0);

	// 		// Close EventSource if it's still open
	// 		if (eventSource) {
	// 			eventSource.close();
	// 		}

	// 		setTimeout(() => {
	// 			setUploadStatus("");
	// 			setProgress(0);
	// 			setBreakdownMessage("");
	// 		}, 5000);
	// 	} finally {
	// 		// Only reset states if we're not navigating (successful completion)
	// 		if (!uploadStatus.includes("Redirecting")) {
	// 			setIsUploading(false);
	// 			setIsGeneratingBreakdown(false);
	// 			setShowFileNameModal(false);
	// 			setNewFileName("");
	// 			setTempFile(null);
	// 			setSelectedModel("gpt-4.1-2025-04-14"); // Reset model selection
	// 		}
	// 	}
	// };

	// This function is called when the hidden file input changes

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

	// This function is called when the "Import New Draft" button is clicked
	const handleImportClick = () => {
		// Trigger the hidden file input
		if (fileInputRef.current) {
			fileInputRef.current.click();
		}
		setShowFileNameModal(true);
	};

	const handleDeleteScript = async (scriptName, e) => {
		e.stopPropagation(); // Prevent triggering script selection

		if (!window.confirm(`Are you sure you want to delete "${scriptName}"?`)) {
			return;
		}

		setIsDeleting(true);
		try {
			const response = await fetch(getApiUrl(`/api/${id}/delete-script/${scriptName}`), {
				method: "DELETE",
				credentials: "include",
				mode: "cors",
			});

			if (!response.ok) {
				throw new Error("Failed to delete script");
			}

			// Clear selected script if it was deleted
			if (selectedScript === scriptName) {
				setSelectedScript(null);
				setPdfUrl(null);
			}

			// Get fresh script list
			const newScriptList = await fetchScripts();
			setScriptList(newScriptList); // Explicitly update with new data
		} catch (error) {
			console.error("Error deleting script:", error);
			alert("Failed to delete script");
		} finally {
			setIsDeleting(false);
		}
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

	// Cleanup function to revoke object URL when component unmounts or PDF changes
	useEffect(() => {
		return () => {
			if (pdfUrl) {
				URL.revokeObjectURL(pdfUrl);
			}
		};
	}, [pdfUrl]);

	const isProcessing = isUploading || isGeneratingBreakdown;

	// Spinner component with inline animation
	const Spinner = () => (
		<div
			style={{
				width: "16px",
				height: "16px",
				border: "2px solid #f3f3f3",
				borderTop: "2px solid #3498db",
				borderRadius: "50%",
				animation: "spin 1s linear infinite",
				display: "inline-block",
			}}
		></div>
	);

	// Add the keyframes animation to the document head only once
	useEffect(() => {
		const existingStyle = document.getElementById("spinner-animation");
		if (!existingStyle) {
			const style = document.createElement("style");
			style.id = "spinner-animation";
			style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
			document.head.appendChild(style);
		}
	}, []);

	return (
		<div style={styles.pageContainer}>
			<ProjectHeader />

			<div style={styles.header}>
				<div>
					<h2 style={styles.pageTitle}>Script</h2>
				</div>
				<button onClick={handleImportClick} style={isProcessing ? styles.buttonDisabled : styles.button} disabled={isProcessing}>
					{isUploading ? "Uploading..." : "Import New Draft"}
				</button>
			</div>

			{/* Show upload/processing status */}
			{/* {(uploadStatus || isProcessing) && (
				<div style={styles.statusBar}>
					<div style={styles.statusMessage}>
						{uploadStatus || (isUploading ? "Uploading..." : "Generating breakdown...")}
						{isProcessing && <Spinner />}
					</div>
				</div>
			)} */}

			<input type="file" accept=".pdf" onChange={handleFileChange} style={{ display: "none" }} ref={fileInputRef} disabled={isProcessing} />

			{/* File Name Modal */}
			{showFileNameModal && (
				<div style={styles.modalOverlay}>
					<div style={styles.modal}>
						{isGeneratingBreakdown ? (
							<ProgressBar />
						) : (
							<div>
								<h3 style={styles.modalTitle}>Enter Script Name</h3>
								<form onSubmit={handleFileNameSubmit}>
									<input
										type="text"
										value={newFileName}
										onChange={(e) => setNewFileName(e.target.value)}
										placeholder="Enter script name"
										style={styles.fileNameInput}
										autoFocus
										disabled={isProcessing}
									/>

									{/* Show model selection dropdown only for user ID 2 */}
									{user === "2" && (
										<div style={styles.modelSelection}>
											<label style={styles.modelLabel}>Select LLM Model:</label>
											<select
												value={selectedModel}
												onChange={(e) => setSelectedModel(e.target.value)}
												style={styles.modelSelect}
												disabled={isProcessing}
											>
												<option value="gpt-4.1-2025-04-14">GPT-4.1 (2025-04-14)</option>
												<option value="gpt-5">GPT-5 (2025-08-07)</option>
												<option value="gpt-5-nano-2025-08-07">GPT-5 Nano (2025-08-07)</option>
												<option value="gpt-5-mini-2025-08-07">GPT-5 Mini (2025-08-07)</option>
											</select>
										</div>
									)}

									<div style={styles.modalButtons}>
										<button
											type="button"
											onClick={() => {
												setShowFileNameModal(false);
												setNewFileName("");
												setTempFile(null);
												setSelectedModel("gpt-4.1-2025-04-14"); // Reset model on cancel
											}}
											style={styles.cancelButton}
											disabled={isProcessing}
										>
											Cancel
										</button>
										<button
											type="submit"
											disabled={!newFileName.trim() || isProcessing}
											style={!newFileName.trim() || isProcessing ? styles.buttonDisabled : styles.submitButton}
										>
											{isProcessing ? "Processing..." : "Upload"}
										</button>
									</div>
								</form>
							</div>
						)}
					</div>
				</div>
			)}

			<div style={styles.mainContent}>
				{/* Left sidebar with script list */}
				<div style={styles.sidebar}>
					<h3>Drafts</h3>
					{script_list.length > 0 && (
						<div style={styles.scriptList}>
							{script_list.map((script, index) => (
								<div key={index} style={styles.scriptButtonContainer}>
									<button
										style={{
											...styles.scriptButton,
											...(selectedScript === script.name ? styles.scriptButtonActive : {}),
											...(isProcessing ? { opacity: 0.5, cursor: "not-allowed" } : {}),
										}}
										onClick={() => !isProcessing && handleScriptClick(script.name)}
										disabled={isProcessing}
									>
										v{script.version} - {script.name}
									</button>
									<button
										style={{
											...styles.deleteButton,
											...(isDeleting ? { cursor: "not-allowed", opacity: 0.5 } : {}),
										}}
										onClick={(e) => !isDeleting && handleDeleteScript(script.name, e)}
										disabled={isDeleting}
										title={isDeleting ? "Deleting..." : "Delete script"}
									>
										{isDeleting ? "⏳" : "🗑️"}
									</button>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Main content area */}
				<div style={styles.contentArea}>
					{isProcessing && (
						<div style={styles.processingOverlay}>
							<p style={styles.processingText}>{isUploading && "Uploading script..."}</p>
						</div>
					)}

					{!isProcessing && script_list.length === 0 && !uploadStatus && <p style={styles.placeholder}>Upload scripts to view them here</p>}
					{!isProcessing && script_list.length > 0 && !pdfUrl && <p style={styles.placeholder}>Select a script to view it here</p>}
					{!isProcessing && pdfUrl && <iframe src={pdfUrl} style={styles.pdfViewer} title="PDF Viewer" />}
				</div>
			</div>
		</div>
	);
};

const styles = {
	pageContainer: {
		display: "flex",
		flexDirection: "column",
		minHeight: "calc(100vh - 60px)",
		backgroundColor: "#fff",
	},
	header: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		padding: "1rem 2rem",
		borderBottom: "1px solid #eee",
		backgroundColor: "#fff",
	},
	mainContent: {
		display: "flex",
		flexGrow: 1,
		height: "calc(100vh - 120px)", // Adjust based on your header height
	},
	sidebar: {
		width: "250px",
		borderRight: "1px solid #eee",
		backgroundColor: "#f8f9fa",
		padding: "1rem",
		overflowY: "auto",
	},
	scriptList: {
		display: "flex",
		flexDirection: "column",
		gap: "0.5rem",
	},
	scriptButtonContainer: {
		display: "flex",
		gap: "0.5rem",
		alignItems: "center",
	},
	scriptButton: {
		padding: "0.75rem 1rem",
		backgroundColor: "#fff",
		border: "1px solid #e0e0e0",
		borderRadius: "4px",
		cursor: "pointer",
		textAlign: "left",
		fontSize: "0.9rem",
		color: "#333",
		transition: "all 0.2s ease",
		flexGrow: 1,
		"&:hover": {
			backgroundColor: "#f0f0f0",
			borderColor: "#ccc",
		},
	},
	deleteButton: {
		padding: "0.25rem 0.5rem",
		backgroundColor: "#fff",
		border: "1px solid #e0e0e0",
		borderRadius: "4px",
		cursor: "pointer",
		fontSize: "1.2rem",
		color: "#666",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		transition: "all 0.2s ease",
		"&:hover": {
			backgroundColor: "#fee",
			borderColor: "#fcc",
			color: "#d33",
		},
	},
	scriptButtonActive: {
		backgroundColor: "#e6f3ff",
		borderColor: "#1a73e8",
		color: "#1a73e8",
	},
	contentArea: {
		flexGrow: 1,
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		padding: "1rem",
		height: "100%", // Ensure full height
		position: "relative", // For proper iframe sizing
	},
	projectTitle: {
		fontSize: "1.5rem",
		fontWeight: "bold",
		margin: 0,
		color: "#000",
	},
	pageTitle: {
		fontSize: "1.1rem",
		fontWeight: "normal",
		margin: "0.25rem 0 0 0",
		color: "#555",
	},
	button: {
		padding: "0.6rem 1.2rem",
		backgroundColor: "#e0e0e0",
		color: "#333",
		border: "1px solid #ccc",
		borderRadius: "4px",
		cursor: "pointer",
		transition: "background-color 0.2s ease",
		fontWeight: "500",
		minWidth: "150px",
		textAlign: "center",
	},
	buttonDisabled: {
		padding: "0.6rem 1.2rem",
		backgroundColor: "#f5f5f5",
		color: "#aaa",
		border: "1px solid #ddd",
		borderRadius: "4px",
		cursor: "not-allowed",
		minWidth: "150px",
		textAlign: "center",
		fontWeight: "500",
	},
	placeholder: {
		fontSize: "1rem",
		color: "#aaa",
	},
	statusBar: {
		backgroundColor: "#f8f9fa",
		borderBottom: "1px solid #eee",
		padding: "0.75rem 2rem",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	statusMessage: {
		fontSize: "0.9rem",
		color: "#333",
		display: "flex",
		alignItems: "center",
		gap: "0.5rem",
	},
	processingOverlay: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		gap: "1rem",
		padding: "2rem",
	},
	processingText: {
		fontSize: "1rem",
		color: "#666",
		margin: 0,
	},
	pdfViewer: {
		width: "100%",
		height: "100%",
		border: "none",
	},
	modalOverlay: {
		position: "fixed",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
		zIndex: 1000,
	},
	modal: {
		backgroundColor: "white",
		padding: "2rem",
		borderRadius: "8px",
		width: "90%",
		maxWidth: "400px",
	},
	modalTitle: {
		margin: "0 0 1rem 0",
		fontSize: "1.2rem",
		color: "#333",
	},
	fileNameInput: {
		width: "100%",
		padding: "0.5rem",
		fontSize: "1rem",
		border: "1px solid #ccc",
		borderRadius: "4px",
		marginBottom: "1rem",
	},
	modalButtons: {
		display: "flex",
		justifyContent: "flex-end",
		gap: "1rem",
	},
	cancelButton: {
		padding: "0.5rem 1rem",
		backgroundColor: "#f5f5f5",
		border: "1px solid #ccc",
		borderRadius: "4px",
		cursor: "pointer",
	},
	submitButton: {
		padding: "0.5rem 1rem",
		backgroundColor: "#4CAF50",
		color: "white",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
	},
	modelSelection: {
		marginBottom: "1rem",
	},
	modelLabel: {
		display: "block",
		marginBottom: "0.5rem",
		fontSize: "0.9rem",
		color: "#333",
		fontWeight: "500",
	},
	modelSelect: {
		width: "100%",
		padding: "0.5rem",
		fontSize: "1rem",
		border: "1px solid #ccc",
		borderRadius: "4px",
		backgroundColor: "white",
		cursor: "pointer",
	},
};

export default Script;
