import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { getApiUrl } from "../utils/api";
import {
	PiPlusBold,
	PiMinusCircle,
	PiCaretUp,
	PiCaretDown,
	PiCheckSquareFill,
	PiSquare,
	PiFolderPlus,
	PiLockSimple,
	PiLockSimpleOpen,
	PiArrowsOutCardinal,
	PiArrowsInCardinal,
	PiFilmSlateFill,
	PiMapPinFill,
	PiUserFill,
	PiArrowsMerge,
	PiScissors,
	PiX,
	PiShuffle,
	PiCheck,
} from "react-icons/pi";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "../css/Locations.css";

// Create a memoized modal component
const MemoizedAddLocationOptionModal = React.memo(({ onClose, onSubmit, optionForm, setOptionForm }) => {
	const [dateRangeStart, setDateRangeStart] = useState("");
	const [dateRangeEnd, setDateRangeEnd] = useState("");
	const [selectedDates, setSelectedDates] = useState(optionForm.availableDates || []);

	const handleSubmit = async (e) => {
		e.preventDefault();
		await onSubmit({ ...optionForm, availableDates: selectedDates });
	};

	const handleInputChange = useCallback(
		(field, value) => {
			setOptionForm((prev) => ({
				...prev,
				[field]: value,
			}));
		},
		[setOptionForm]
	);

	const addDateRange = () => {
		if (!dateRangeStart || !dateRangeEnd) {
			alert("Please select both start and end dates");
			return;
		}
		if (dateRangeStart > dateRangeEnd) {
			alert("Start date must be before end date");
			return;
		}

		const rangeDates = [];
		const currentDate = new Date(dateRangeStart);
		const endDate = new Date(dateRangeEnd);

		while (currentDate <= endDate) {
			rangeDates.push(currentDate.toISOString().split("T")[0]);
			currentDate.setDate(currentDate.getDate() + 1);
		}

		setSelectedDates((prev) => {
			const newDates = [...prev];
			rangeDates.forEach((date) => {
				if (!newDates.includes(date)) {
					newDates.push(date);
				}
			});
			return newDates.sort();
		});

		setDateRangeStart("");
		setDateRangeEnd("");
	};

	const handleCalendarDateClick = (date) => {
		const dateStr = date.toLocaleDateString("en-CA").split("T")[0];
		setSelectedDates((prev) => {
			if (prev.includes(dateStr)) {
				return prev.filter((d) => d !== dateStr);
			} else {
				return [...prev, dateStr].sort();
			}
		});
	};

	const removeDate = (dateToRemove) => {
		setSelectedDates((prev) => prev.filter((d) => d !== dateToRemove));
	};

	const clearAllDates = () => {
		setSelectedDates([]);
	};

	const formatDisplayDate = (dateString) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
		});
	};

	const tileClassName = ({ date, view }) => {
		if (view === "month") {
			const dateStr = date.toLocaleDateString("en-CA").split("T")[0];
			if (selectedDates.includes(dateStr)) {
				return "loc-calendar-selected";
			}
		}
		return null;
	};

	return (
		<div className="loc-modal-overlay">
			<div className="loc-modal loc-modal-wide">
				<h3 className="loc-modal-title">Add Set Option</h3>
				<form onSubmit={handleSubmit} className="loc-form">
					<div className="loc-form-row">
						<div className="loc-form-column">
							<div className="loc-form-group">
								<label className="loc-label">Set Name:</label>
								<input
									type="text"
									value={optionForm.locationName || ""}
									onChange={(e) => handleInputChange("locationName", e.target.value)}
									className="loc-input"
									required
									autoFocus
								/>
							</div>
							<div className="loc-form-group">
								<label className="loc-label">Address:</label>
								<input
									type="text"
									value={optionForm.address || ""}
									onChange={(e) => handleInputChange("address", e.target.value)}
									className="loc-input"
								/>
							</div>
							<div className="loc-form-group">
								<label className="loc-label">Notes:</label>
								<textarea
									value={optionForm.notes || ""}
									onChange={(e) => handleInputChange("notes", e.target.value)}
									className="loc-textarea"
									placeholder=""
								/>
							</div>
							<div className="loc-form-group">
								<label className="loc-label">Media:</label>
								<input
									type="text"
									value={optionForm.media || ""}
									onChange={(e) => handleInputChange("media", e.target.value)}
									className="loc-input"
									placeholder="Media links or references"
								/>
							</div>
							<div className="loc-form-group">
								<label className="loc-label">Set Pin Link:</label>
								<input
									type="text"
									value={optionForm.locationPinLink || ""}
									onChange={(e) => handleInputChange("locationPinLink", e.target.value)}
									className="loc-input"
									placeholder="Google Maps or location pin URL"
								/>
							</div>
						</div>
						<div className="loc-form-column">
							<div className="loc-form-group">
								<label className="loc-label">Available Dates:</label>
								<div className="loc-date-picker-container">
									<div className="loc-date-range-inputs">
										<input
											type="date"
											value={dateRangeStart}
											onChange={(e) => setDateRangeStart(e.target.value)}
											className="loc-date-input"
										/>
										<span className="loc-date-separator">to</span>
										<input
											type="date"
											value={dateRangeEnd}
											min={dateRangeStart}
											onChange={(e) => setDateRangeEnd(e.target.value)}
											className="loc-date-input"
										/>
										<button
											type="button"
											onClick={addDateRange}
											className="loc-add-range-btn"
											disabled={!dateRangeStart || !dateRangeEnd}
										>
											Add Range
										</button>
									</div>
									<div className="loc-calendar-wrapper">
										<Calendar selectRange={false} onClickDay={handleCalendarDateClick} tileClassName={tileClassName} />
									</div>
									{selectedDates.length > 0 && (
										<div className="loc-selected-dates">
											<div className="loc-selected-dates-header">
												<span>Selected Dates ({selectedDates.length}):</span>
												<button type="button" onClick={clearAllDates} className="loc-clear-dates-btn">
													Clear All
												</button>
											</div>
											<div className="loc-dates-list">
												{selectedDates.map((date) => (
													<span key={date} className="loc-date-tag">
														{formatDisplayDate(date)}
														<button type="button" onClick={() => removeDate(date)} className="loc-remove-date-btn">
															×
														</button>
													</span>
												))}
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
					<div className="loc-modal-buttons">
						<button type="submit" className="loc-submit-btn">
							Add Option
						</button>
						<button type="button" onClick={onClose} className="loc-cancel-btn">
							Cancel
						</button>
					</div>
				</form>
			</div>
		</div>
	);
});

const Locations = () => {
	const { user, id } = useParams();
	const [locationData, setLocationData] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [expandedOptions, setExpandedOptions] = useState(new Set());
	const [expandedScenes, setExpandedScenes] = useState(new Set());
	const [showAddOptionModal, setShowAddOptionModal] = useState(false);
	const [selectedLocationIndex, setSelectedLocationIndex] = useState(null);
	const [optionForm, setOptionForm] = useState({
		locationName: "",
		address: "",
		notes: "",
		availableDates: [],
		media: "",
		locationPinLink: "",
	});
	const [selectedOptions, setSelectedOptions] = useState(new Set());
	const [isSelectingMode, setIsSelectingMode] = useState(new Set());
	const [collapsedCards, setCollapsedCards] = useState(new Set());
	const [optionDetailsModal, setOptionDetailsModal] = useState(null);
	const [showAddGroupModal, setShowAddGroupModal] = useState(false);
	const [newGroupName, setNewGroupName] = useState("");
	const [selectedLocations, setSelectedLocations] = useState(new Set());
	const [showRemoveLocModal, setShowRemoveLocModal] = useState(false);
	// Location selection mode: null, 'remove', or 'merge'
	const [locationSelectionMode, setLocationSelectionMode] = useState(null);
	// Merge modal state
	const [showMergeModal, setShowMergeModal] = useState(false);
	const [mergedLocationName, setMergedLocationName] = useState("");
	const [mergeOptions, setMergeOptions] = useState(false);
	// Split modal state
	const [showSplitModal, setShowSplitModal] = useState(false);
	const [splitNewName1, setSplitNewName1] = useState("");
	const [splitNewName2, setSplitNewName2] = useState("");
	const [scenesForSet1, setScenesForSet1] = useState(new Set());
	const [scenesForSet2, setScenesForSet2] = useState(new Set());
	const [splitLocationScenes, setSplitLocationScenes] = useState([]);
	// Scene selection for new location
	const [allScenes, setAllScenes] = useState([]);
	const [selectedSceneIds, setSelectedSceneIds] = useState(new Set());
	const [loadingScenes, setLoadingScenes] = useState(false);
	const [masterScriptId, setMasterScriptId] = useState(null);
	// Cast data for showing cast IDs
	const [castMap, setCastMap] = useState({});
	// Breakdown synopsis map
	const [synopsisMap, setSynopsisMap] = useState({});
	// Regroup mode state
	const [isRegroupMode, setIsRegroupMode] = useState(false);
	const [sceneMoves, setSceneMoves] = useState([]); // Track scene moves: [{ scene_id, from_location_id, to_location_id }]
	const [draggedScene, setDraggedScene] = useState(null); // Currently dragged scene
	const [dragSourceLocationId, setDragSourceLocationId] = useState(null); // Source location of dragged scene

	// Memoize the option form setter to prevent unnecessary re-renders
	const memoizedSetOptionForm = useCallback((updater) => {
		setOptionForm(updater);
	}, []);

	// Memoize the form submission handler
	const handleFormSubmit = useCallback(
		async (formData) => {
			try {
				await addLocationOption(selectedLocationIndex, formData);
			} catch (error) {
				console.error("Error submitting form:", error);
				setError(error.message);
			}
		},
		[selectedLocationIndex]
	);

	// Memoize the modal close handler
	const handleModalClose = useCallback(() => {
		setShowAddOptionModal(false);
		setSelectedLocationIndex(null);
		setOptionForm({
			locationName: "",
			address: "",
			notes: "",
			availableDates: [],
			media: "",
			locationPinLink: "",
		});
	}, []);

	// Fetch scenes for scene selection when adding a new location
	const fetchScenesForSelection = useCallback(async () => {
		try {
			setLoadingScenes(true);
			// First, get the list of scripts
			const scriptsResponse = await fetch(getApiUrl(`/api/${id}/script-list`));
			if (!scriptsResponse.ok) {
				console.error("Failed to fetch scripts");
				return;
			}
			const scripts = await scriptsResponse.json();
			const sortedScripts = (scripts || []).sort((a, b) => (b.version || 0) - (a.version || 0));

			if (sortedScripts.length > 0) {
				// Get master script (oldest/first uploaded)
				const masterScript = sortedScripts[sortedScripts.length - 1];
				setMasterScriptId(masterScript.id);

				// Fetch breakdown
				const breakdownResponse = await fetch(getApiUrl(`/api/fetch-breakdown?script_id=${masterScript.id}`));
				if (breakdownResponse.ok) {
					const breakdownData = await breakdownResponse.json();
					const scenes = breakdownData.scene_breakdowns || [];
					setAllScenes(scenes);
				}
			}
		} catch (error) {
			console.error("Error fetching scenes for selection:", error);
		} finally {
			setLoadingScenes(false);
		}
	}, [id]);

	// Toggle scene selection
	const toggleSceneSelection = useCallback((sceneId) => {
		setSelectedSceneIds((prev) => {
			const next = new Set(prev);
			if (next.has(sceneId)) {
				next.delete(sceneId);
			} else {
				next.add(sceneId);
			}
			return next;
		});
	}, []);

	// Select/deselect all scenes
	const toggleSelectAllScenes = useCallback(() => {
		if (selectedSceneIds.size === allScenes.length) {
			setSelectedSceneIds(new Set());
		} else {
			setSelectedSceneIds(new Set(allScenes.map((scene) => scene.scene_id || scene.scene_number)));
		}
	}, [allScenes, selectedSceneIds.size]);

	// Fetch scenes when the add location modal is opened
	useEffect(() => {
		if (showAddGroupModal) {
			fetchScenesForSelection();
		}
	}, [showAddGroupModal, fetchScenesForSelection]);

	useEffect(() => {
		const fetchLocations = async () => {
			try {
				setIsLoading(true);
				const response = await fetch(getApiUrl(`/api/${id}/locations`));
				if (!response.ok) {
					throw new Error("Failed to fetch locations");
				}
				const jsonData = await response.json();
				console.log("location data ", jsonData);
				setLocationData(jsonData);

				// Set all locations to show options by default
				const defaultExpandedOptions = new Set(jsonData.locations?.map((_, index) => index) || []);
				setExpandedOptions(defaultExpandedOptions);
				// Make sure scenes are not expanded by default
				setExpandedScenes(new Set());
			} catch (error) {
				setError(error.message);
			} finally {
				setIsLoading(false);
			}
		};
		fetchLocations();
	}, [id]);

	// Fetch cast list to get cast IDs for each scene
	useEffect(() => {
		const fetchCastList = async () => {
			try {
				const response = await fetch(getApiUrl(`/api/${id}/cast-list`));
				if (!response.ok) return;
				const data = await response.json();

				// Create mapping from scene number to cast IDs
				const sceneTocastMap = {};
				if (data?.cast_list) {
					data.cast_list.forEach((cast) => {
						if (cast.scenes && Array.isArray(cast.scenes)) {
							cast.scenes.forEach((scene) => {
								const sceneKey = String(scene);
								if (!sceneTocastMap[sceneKey]) {
									sceneTocastMap[sceneKey] = [];
								}
								sceneTocastMap[sceneKey].push({
									cast_id: cast.cast_id,
									character: cast.character
								});
							});
						}
					});
				}
				setCastMap(sceneTocastMap);
			} catch (error) {
				console.error("Error fetching cast list:", error);
			}
		};

		fetchCastList();
	}, [id]);

	// Fetch breakdown data to get synopsis for each scene
	useEffect(() => {
		const fetchBreakdownForSynopsis = async () => {
			try {
				// First, get the list of scripts
				const scriptsResponse = await fetch(getApiUrl(`/api/${id}/script-list`));
				if (!scriptsResponse.ok) {
					console.error("Failed to fetch scripts");
					return;
				}
				const scripts = await scriptsResponse.json();
				const sortedScripts = (scripts || []).sort((a, b) => (b.version || 0) - (a.version || 0));

				if (sortedScripts.length > 0) {
					// Get master script (oldest/first uploaded)
					const masterScript = sortedScripts[sortedScripts.length - 1];

					// Fetch breakdown
					const breakdownResponse = await fetch(getApiUrl(`/api/fetch-breakdown?project_id=${id}`));
					if (breakdownResponse.ok) {
						const breakdownData = await breakdownResponse.json();
						const scenes = breakdownData.scene_breakdowns || [];
						
						// Create mapping from scene_number to synopsis
						const sceneToSynopsisMap = {};
						scenes.forEach((scene) => {
							const sceneKey = String(scene.scene_number || scene.scene_id);
							sceneToSynopsisMap[sceneKey] = scene.synopsis || "";
						});
						setSynopsisMap(sceneToSynopsisMap);
					}
				}
			} catch (error) {
				console.error("Error fetching breakdown for synopsis:", error);
			}
		};

		fetchBreakdownForSynopsis();
	}, [id]);

	const addLocationOption = async (locationIndex, formData) => {
		try {
			setIsLoading(true);
			const location = locationData.locations[locationIndex];
			const response = await fetch(getApiUrl(`/api/${id}/location/add-option`), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					location: location.location,
					location_id: location.location_id,
					...formData,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to add location option");
			}

			// Reset form and close modal
			setOptionForm({
				locationName: "",
				address: "",
				notes: "",
				availableDates: [],
				media: "",
				locationPinLink: "",
			});
			setShowAddOptionModal(false);

			// Refresh the locations data
			const refreshResponse = await fetch(getApiUrl(`/api/${id}/locations`));
			if (!refreshResponse.ok) {
				throw new Error("Failed to refresh locations");
			}
			const jsonData = await refreshResponse.json();
			setLocationData(jsonData);

			// Maintain the expanded state
			setExpandedOptions((prev) => new Set(prev));
		} catch (error) {
			console.error("Error adding location option:", error);
			setError(error.message);
		} finally {
			setIsLoading(false);
		}
	};

	const removeLocationOption = async (locationIndex, optionId) => {
		try {
			setIsLoading(true);
			const location = locationData.locations[locationIndex];
			const response = await fetch(getApiUrl(`/api/${id}/location/${location.location_id}/options/${optionId}`), {
				method: "DELETE",
			});

			if (!response.ok) {
				throw new Error("Failed to remove location option");
			}

			// Refresh the locations data
			const refreshResponse = await fetch(getApiUrl(`/api/${id}/locations`));
			if (!refreshResponse.ok) {
				throw new Error("Failed to refresh locations");
			}
			const jsonData = await refreshResponse.json();
			setLocationData(jsonData);

			// Maintain the expanded state
			setExpandedOptions((prev) => new Set(prev));
		} catch (error) {
			console.error("Error removing location option:", error);
			setError(error.message);
		} finally {
			setIsLoading(false);
		}
	};

	const toggleLockOption = async (locationIndex, optionId, locationId) => {
		try {
			const location = locationData.locations[locationIndex];
			const isCurrentlyLocked = location.locked === optionId || location.locked === parseInt(optionId);

			// Determine new lock value (-1 for unlock, optionId for lock)
			const newLockValue = isCurrentlyLocked ? -1 : optionId;

			// Call the backend API to update lock status
			const response = await fetch(getApiUrl(`/api/${id}/location/${locationId}/lock`), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ option_id: newLockValue }),
			});

			if (!response.ok) {
				throw new Error("Failed to update lock status");
			}

			// Refresh the locations data to get updated lock state
			const refreshResponse = await fetch(getApiUrl(`/api/${id}/locations`));
			if (!refreshResponse.ok) {
				throw new Error("Failed to refresh locations");
			}
			const jsonData = await refreshResponse.json();
			setLocationData(jsonData);
		} catch (error) {
			console.error("Error toggling lock:", error);
			setError(error.message);
		}
	};

	const addLocationGroup = async () => {
		try {
			if (!newGroupName.trim()) {
				alert("Please enter a location group name");
				return;
			}

			// Check if location name already exists (frontend check for faster feedback)
			const normalizedName = newGroupName.trim().toUpperCase();
			const existingLocation = locationData?.locations?.find(
				(loc) => loc.location?.toUpperCase() === normalizedName
			);
			if (existingLocation) {
				alert(`A location group with the name "${normalizedName}" already exists.`);
				return;
			}

			setIsLoading(true);

			// Build request body with optional scene IDs
			const requestBody = { 
				locationName: newGroupName.trim(),
				sceneIds: Array.from(selectedSceneIds),
				scriptId: masterScriptId
			};

			const response = await fetch(getApiUrl(`/api/${id}/location/add-group`), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(requestBody),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Failed to add location group");
			}

			// Close modal and reset form
			setShowAddGroupModal(false);
			setNewGroupName("");
			setSelectedSceneIds(new Set());
			setAllScenes([]);

			// Refresh the locations data
			const refreshResponse = await fetch(getApiUrl(`/api/${id}/locations`));
			if (!refreshResponse.ok) {
				throw new Error("Failed to refresh locations");
			}
			const jsonData = await refreshResponse.json();
			setLocationData(jsonData);

			// Update expanded options to include the new location
			setExpandedOptions((prev) => {
				const next = new Set(prev);
				next.add(jsonData.locations.length - 1);
				return next;
			});
		} catch (error) {
			console.error("Error adding location group:", error);
			alert(error.message);
		} finally {
			setIsLoading(false);
		}
	};

	const deleteLocationGroup = async (locationId, locationName, sceneCount) => {
		try {
			// Check if scene count is 0
			if (sceneCount > 0) {
				alert(`Cannot delete "${locationName}" - it has ${sceneCount} scene(s) assigned. Scene count must be 0 to delete.`);
				return;
			}

			setIsLoading(true);

			const response = await fetch(getApiUrl(`/api/${id}/location/${locationId}/delete-group`), {
				method: "DELETE",
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Failed to delete location group");
			}

			// Refresh the locations data
			const refreshResponse = await fetch(getApiUrl(`/api/${id}/locations`));
			if (!refreshResponse.ok) {
				throw new Error("Failed to refresh locations");
			}
			const jsonData = await refreshResponse.json();
			setLocationData(jsonData);

			// Update expanded options
			const defaultExpandedOptions = new Set(jsonData.locations?.map((_, index) => index) || []);
			setExpandedOptions(defaultExpandedOptions);
		} catch (error) {
			console.error("Error deleting location group:", error);
			alert(error.message);
		} finally {
			setIsLoading(false);
		}
	};

	// Get unique cast IDs for a location's scenes
	const getCastIdsForLocation = (locationScenes) => {
		const castIds = new Set();
		const castDetails = [];
		
		if (!locationScenes || !Array.isArray(locationScenes)) return [];
		
		locationScenes.forEach((scene) => {
			const sceneNumber = String(scene.scene_number || scene.scene_id);
			const sceneCasts = castMap[sceneNumber] || [];
			sceneCasts.forEach((cast) => {
				if (!castIds.has(cast.cast_id)) {
					castIds.add(cast.cast_id);
					castDetails.push(cast);
				}
			});
		});
		
		// Sort cast details by cast_id in ascending order
		return castDetails.sort((a, b) => {
			const aId = parseInt(a.cast_id) || 0;
			const bId = parseInt(b.cast_id) || 0;
			return aId - bId;
		});
	};

	// Get cast IDs for a specific scene
	const getCastForScene = (sceneNumber) => {
		const sceneKey = String(sceneNumber);
		const sceneCasts = castMap[sceneKey] || [];
		// Sort cast IDs in ascending order
		const sortedCastIds = sceneCasts
			.map(c => c.cast_id)
			.sort((a, b) => {
				const aId = parseInt(a) || 0;
				const bId = parseInt(b) || 0;
				return aId - bId;
			});
		return sortedCastIds.join(", ") || "N/A";
	};

	// Get synopsis for a specific scene from breakdown
	const getSynopsisForScene = (sceneNumber) => {
		const sceneKey = String(sceneNumber);
		return synopsisMap[sceneKey] || "-";
	};

	// Analyze scenes to get Int/Ext counts (similar to CastListNew)
	const analyzeLocationScenes = (locationScenes) => {
		const result = { total: 0, intCount: 0, extCount: 0, intExtCount: 0 };
		if (!Array.isArray(locationScenes)) return result;

		result.total = locationScenes.length;

		locationScenes.forEach((scene) => {
			const intExt = (scene.int_ext || "").toUpperCase();
			if (intExt.includes("INT.") && intExt.includes("EXT.")) {
				result.intExtCount += 1;
			} else if (intExt.includes("INT")) {
				result.intCount += 1;
			} else if (intExt.includes("EXT")) {
				result.extCount += 1;
			}
		});

		return result;
	};

	const toggleLocationSelection = (idx) => {
		if (!locationSelectionMode) return; // Don't allow selection if not in a mode
		
		setSelectedLocations((prev) => {
			const next = new Set(prev);
			if (next.has(idx)) {
				next.delete(idx);
				return next;
			}
			
			// For remove and split modes, only allow 1 selection
			if (locationSelectionMode === 'remove' || locationSelectionMode === 'split') {
				return new Set([idx]);
			}
			
			// For merge mode, allow up to 2 selections
			if (locationSelectionMode === 'merge') {
				if (next.size < 2) {
					next.add(idx);
				} else {
					// Replace the oldest selection with the new one
					const arr = Array.from(next);
					arr.shift();
					arr.push(idx);
					return new Set(arr);
				}
			}
			
			return next;
		});
	};

	// Enter remove mode
	const enterRemoveMode = () => {
		setLocationSelectionMode('remove');
		setSelectedLocations(new Set());
	};

	// Enter merge mode
	const enterMergeMode = () => {
		setLocationSelectionMode('merge');
		setSelectedLocations(new Set());
	};

	// Cancel selection mode
	const cancelSelectionMode = () => {
		setLocationSelectionMode(null);
		setSelectedLocations(new Set());
	};

	// Handle remove button click (when in remove mode)
	const handleRemoveLocationsClick = () => {
		if (selectedLocations.size === 1) {
			setShowRemoveLocModal(true);
		} else {
			alert("Please select a set to remove");
		}
	};

	// Handle merge button click - show merge modal
	const handleMergeLocationsClick = () => {
		if (selectedLocations.size === 2) {
			// Get the two selected locations and suggest a merged name
			const indices = Array.from(selectedLocations);
			const loc1 = locationData.locations[indices[0]];
			const loc2 = locationData.locations[indices[1]];
			setMergedLocationName(`${loc1.location} / ${loc2.location}`);
			setMergeOptions(false);
			setShowMergeModal(true);
		} else {
			alert("Please select exactly 2 sets to merge");
		}
	};

	// Perform the actual merge
	const performMergeLocations = async () => {
		try {
			if (!mergedLocationName.trim()) {
				alert("Please enter a name for the merged set");
				return;
			}

			const indices = Array.from(selectedLocations);
			const loc1 = locationData.locations[indices[0]];
			const loc2 = locationData.locations[indices[1]];

			setIsLoading(true);

			// First, get the master script ID if we don't have it
			let scriptId = masterScriptId;
			if (!scriptId) {
				const scriptsResponse = await fetch(getApiUrl(`/api/${id}/script-list`));
				if (scriptsResponse.ok) {
					const scripts = await scriptsResponse.json();
					const sortedScripts = (scripts || []).sort((a, b) => (b.version || 0) - (a.version || 0));
					if (sortedScripts.length > 0) {
						scriptId = sortedScripts[sortedScripts.length - 1].id;
					}
				}
			}

			const response = await fetch(getApiUrl(`/api/${id}/location/merge`), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					locationId1: loc1.location_id,
					locationId2: loc2.location_id,
					mergedName: mergedLocationName.trim(),
					mergeOptions: mergeOptions,
					scriptId: scriptId
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Failed to merge locations");
			}

			// Close modal and reset state
			setShowMergeModal(false);
			setMergedLocationName("");
			setMergeOptions(false);
			setSelectedLocations(new Set());
			setLocationSelectionMode(null);

			// Refresh the locations data
			const refreshResponse = await fetch(getApiUrl(`/api/${id}/locations`));
			if (!refreshResponse.ok) {
				throw new Error("Failed to refresh locations");
			}
			const jsonData = await refreshResponse.json();
			setLocationData(jsonData);

			alert(`Sets merged successfully! ${data.scenes_updated} scene(s) updated.`);
		} catch (error) {
			console.error("Error merging locations:", error);
			alert(error.message);
		} finally {
			setIsLoading(false);
		}
	};

	// Enter split mode
	const enterSplitMode = () => {
		setLocationSelectionMode('split');
		setSelectedLocations(new Set());
	};

	// Handle split button click - show split modal
	const handleSplitLocationClick = async () => {
		if (selectedLocations.size === 1) {
			const idx = Array.from(selectedLocations)[0];
			const location = locationData.locations[idx];
			
			// Get the scenes for this location
			const locationScenes = location.scenes || [];
			setSplitLocationScenes(locationScenes);
			console.log("locationScenes ", locationScenes);
			
			// Reset split form
			setSplitNewName1("");
			setSplitNewName2("");
			setScenesForSet1(new Set());
			setScenesForSet2(new Set());
			
			// Fetch master script ID if not available
			if (!masterScriptId) {
				try {
					const scriptsResponse = await fetch(getApiUrl(`/api/${id}/script-list`));
					if (scriptsResponse.ok) {
						const scripts = await scriptsResponse.json();
						const sortedScripts = (scripts || []).sort((a, b) => (b.version || 0) - (a.version || 0));
						if (sortedScripts.length > 0) {
							setMasterScriptId(sortedScripts[sortedScripts.length - 1].id);
						}
					}
				} catch (error) {
					console.error("Error fetching scripts:", error);
				}
			}
			
			setShowSplitModal(true);
		} else {
			alert("Please select a set to split");
		}
	};

	// Toggle scene assignment for split
	const toggleSceneForSplit = (sceneId, targetSet) => {
		const sceneIdStr = String(sceneId);
		
		if (targetSet === 1) {
			setScenesForSet1((prev) => {
				const next = new Set(prev);
				if (next.has(sceneIdStr)) {
					next.delete(sceneIdStr);
				} else {
					next.add(sceneIdStr);
				}
				return next;
			});
			// Remove from set 2 if it was there
			setScenesForSet2((prev) => {
				const next = new Set(prev);
				next.delete(sceneIdStr);
				return next;
			});
		} else {
			setScenesForSet2((prev) => {
				const next = new Set(prev);
				if (next.has(sceneIdStr)) {
					next.delete(sceneIdStr);
				} else {
					next.add(sceneIdStr);
				}
				return next;
			});
			// Remove from set 1 if it was there
			setScenesForSet1((prev) => {
				const next = new Set(prev);
				next.delete(sceneIdStr);
				return next;
			});
		}
	};

	// Perform the actual split
	const performSplitLocation = async () => {
		try {
			if (!splitNewName1.trim() || !splitNewName2.trim()) {
				alert("Please enter names for both new sets");
				return;
			}

			if (splitNewName1.trim().toUpperCase() === splitNewName2.trim().toUpperCase()) {
				alert("The two new set names must be different");
				return;
			}

			const totalScenes = splitLocationScenes.length;
			const assignedScenes = scenesForSet1.size + scenesForSet2.size;

			if (assignedScenes === 0) {
				alert("Please assign at least one scene to one of the new sets");
				return;
			}

			if (assignedScenes < totalScenes) {
				const unassigned = totalScenes - assignedScenes;
				if (!window.confirm(`${unassigned} scene(s) are not assigned to either set. They will remain unassigned. Continue?`)) {
					return;
				}
			}

			const idx = Array.from(selectedLocations)[0];
			const location = locationData.locations[idx];

			setIsLoading(true);

			// Ensure we have the script ID - fetch it if not available
			let scriptIdToUse = masterScriptId;
			if (!scriptIdToUse) {
				try {
					const scriptsResponse = await fetch(getApiUrl(`/api/${id}/script-list`));
					if (scriptsResponse.ok) {
						const scripts = await scriptsResponse.json();
						const sortedScripts = (scripts || []).sort((a, b) => (b.version || 0) - (a.version || 0));
						if (sortedScripts.length > 0) {
							scriptIdToUse = sortedScripts[sortedScripts.length - 1].id;
							setMasterScriptId(scriptIdToUse);
						}
					}
				} catch (error) {
					console.error("Error fetching scripts for split:", error);
				}
			}

			// Debug logging
			console.log("Split request data:", {
				locationId: location.location_id,
				newName1: splitNewName1.trim(),
				newName2: splitNewName2.trim(),
				scenesForSet1: Array.from(scenesForSet1),
				scenesForSet2: Array.from(scenesForSet2),
				scriptId: scriptIdToUse,
				splitLocationScenes: splitLocationScenes
			});

			const response = await fetch(getApiUrl(`/api/${id}/location/split`), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					locationId: location.location_id,
					newName1: splitNewName1.trim(),
					newName2: splitNewName2.trim(),
					scenesForSet1: Array.from(scenesForSet1),
					scenesForSet2: Array.from(scenesForSet2),
					scriptId: scriptIdToUse
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Failed to split location");
			}

			// Close modal and reset state
			setShowSplitModal(false);
			setSplitNewName1("");
			setSplitNewName2("");
			setScenesForSet1(new Set());
			setScenesForSet2(new Set());
			setSplitLocationScenes([]);
			setSelectedLocations(new Set());
			setLocationSelectionMode(null);

			// Refresh the locations data
			const refreshResponse = await fetch(getApiUrl(`/api/${id}/locations`));
			if (!refreshResponse.ok) {
				throw new Error("Failed to refresh locations");
			}
			const jsonData = await refreshResponse.json();
			setLocationData(jsonData);

			alert(`Set split successfully! ${data.scenes_to_set_1} scene(s) moved to "${splitNewName1.trim().toUpperCase()}" and ${data.scenes_to_set_2} scene(s) moved to "${splitNewName2.trim().toUpperCase()}".`);
		} catch (error) {
			console.error("Error splitting location:", error);
			alert(error.message);
		} finally {
			setIsLoading(false);
		}
	};

	const handleConfirmRemoveLocation = () => {
		if (selectedLocations.size === 1) {
			const idx = Array.from(selectedLocations)[0];
			const location = locationData.locations[idx];
			deleteLocationGroup(location.location_id, location.location, location.scene_count);
		}
		setShowRemoveLocModal(false);
		setSelectedLocations(new Set());
		setLocationSelectionMode(null);
	};

	// Enter regroup mode
	const enterRegroupMode = () => {
		setIsRegroupMode(true);
		setSceneMoves([]);
		// Force all locations to show scenes view
		const allIndices = new Set(locationData.locations.map((_, i) => i));
		setExpandedScenes(allIndices);
		setExpandedOptions(new Set());
		// Expand all cards
		setCollapsedCards(new Set());
	};

	// Cancel regroup mode
	const cancelRegroupMode = () => {
		setIsRegroupMode(false);
		setSceneMoves([]);
		setDraggedScene(null);
		setDragSourceLocationId(null);
		// Refresh to restore original state
		const fetchLocations = async () => {
			try {
				const response = await fetch(getApiUrl(`/api/${id}/locations`));
				if (response.ok) {
					const jsonData = await response.json();
					setLocationData(jsonData);
				}
			} catch (error) {
				console.error("Error refreshing locations:", error);
			}
		};
		fetchLocations();
	};

	// Apply regroup changes
	const applyRegroupChanges = async () => {
		if (sceneMoves.length === 0) {
			alert("No scenes have been moved. Exiting regroup mode.");
			setIsRegroupMode(false);
			return;
		}

		try {
			setIsLoading(true);

			// Get script ID if not already available
			let scriptId = masterScriptId;
			if (!scriptId) {
				const scriptsResponse = await fetch(getApiUrl(`/api/${id}/script-list`));
				if (scriptsResponse.ok) {
					const scripts = await scriptsResponse.json();
					const sortedScripts = (scripts || []).sort((a, b) => (b.version || 0) - (a.version || 0));
					if (sortedScripts.length > 0) {
						scriptId = sortedScripts[sortedScripts.length - 1].id;
					}
				}
			}
			

			const response = await fetch(getApiUrl(`/api/${id}/location/regroup-scenes`), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					moves: sceneMoves,
					scriptId: scriptId
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Failed to regroup scenes");
			}

			// Reset regroup mode
			setIsRegroupMode(false);
			setSceneMoves([]);
			setDraggedScene(null);
			setDragSourceLocationId(null);

			// Refresh the locations data
			const refreshResponse = await fetch(getApiUrl(`/api/${id}/locations`));
			if (refreshResponse.ok) {
				const jsonData = await refreshResponse.json();
				setLocationData(jsonData);
			}

			alert(`Scenes regrouped successfully! ${data.scenes_moved} scene(s) moved. ${data.scenes_removed_from_schedule} scene(s) marked as unscheduled.`);
		} catch (error) {
			console.error("Error applying regroup:", error);
			alert(error.message);
		} finally {
			setIsLoading(false);
		}
	};

	// Drag handlers for regroup mode
	const handleDragStart = (e, scene, locationId) => {
		if (!isRegroupMode) return;
		setDraggedScene(scene);
		setDragSourceLocationId(locationId);
		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("text/plain", JSON.stringify({ scene, locationId }));
	};

	const handleDragOver = (e, targetLocationId) => {
		if (!isRegroupMode || !draggedScene) return;
		if (targetLocationId === dragSourceLocationId) return;
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
	};

	const handleDrop = (e, targetLocationId) => {
		e.preventDefault();
		if (!isRegroupMode || !draggedScene || !dragSourceLocationId) return;
		if (targetLocationId === dragSourceLocationId) return;

		const sceneId = String(draggedScene.scene_id);

		// Add the move to sceneMoves
		setSceneMoves((prev) => {
			// Check if this scene was already moved
			const existingMoveIndex = prev.findIndex((m) => m.scene_id === sceneId);
			if (existingMoveIndex >= 0) {
				// Update the existing move
				const updated = [...prev];
				if (updated[existingMoveIndex].from_location_id === targetLocationId) {
					// Moving back to original - remove the move
					updated.splice(existingMoveIndex, 1);
				} else {
					updated[existingMoveIndex].to_location_id = targetLocationId;
				}
				return updated;
			}
			// Add new move
			return [...prev, {
				scene_id: sceneId,
				from_location_id: dragSourceLocationId,
				to_location_id: targetLocationId
			}];
		});

		// Update local state to reflect the move visually
		setLocationData((prevData) => {
			const newData = JSON.parse(JSON.stringify(prevData));
			const sourceIdx = newData.locations.findIndex((l) => l.location_id === dragSourceLocationId);
			const targetIdx = newData.locations.findIndex((l) => l.location_id === targetLocationId);

			if (sourceIdx >= 0 && targetIdx >= 0) {
				const sourceScenes = newData.locations[sourceIdx].scenes || [];
				const sceneIndex = sourceScenes.findIndex((s) => String(s.scene_id) === sceneId);

				if (sceneIndex >= 0) {
					const [movedScene] = sourceScenes.splice(sceneIndex, 1);
					if (!newData.locations[targetIdx].scenes) {
						newData.locations[targetIdx].scenes = [];
					}
					newData.locations[targetIdx].scenes.push(movedScene);

					// Update scene counts
					newData.locations[sourceIdx].scene_count = sourceScenes.length;
					newData.locations[targetIdx].scene_count = newData.locations[targetIdx].scenes.length;
				}
			}

			return newData;
		});

		setDraggedScene(null);
		setDragSourceLocationId(null);
	};

	const handleDragEnd = () => {
		setDraggedScene(null);
		setDragSourceLocationId(null);
	};

	return (
		<div className="loc-page-container">
			<div className="loc-main-content">
				<div className="loc-content-area">
					{isLoading ? (
						<div className="loc-loading-container">
							<div className="loc-spinner" />
							<div className="loc-message">Loading sets...</div>
						</div>
					) : error ? (
						<div className="loc-error-container">
							<div className="loc-error-message">⚠️ {error}</div>
						</div>
					) : !locationData || locationData.locations.length === 0 ? (
						<div className="loc-empty-container">
							<div className="loc-message">No sets found</div>
						</div>
					) : (
						<>
							{/* Page Header */}
							<div className="loc-page-header">
								<h1 className="loc-title">Total Sets: {locationData.total_locations || locationData.locations.length}</h1>

								{/* Header Action Buttons */}
								<div className="loc-header-actions">
									{isRegroupMode ? (
										<>
											<span className="loc-selection-mode-label loc-regroup-label">
												Regroup Mode: Drag scenes between sets ({sceneMoves.length} move{sceneMoves.length !== 1 ? 's' : ''} pending)
											</span>
											<button 
												className="loc-btn-primary" 
												onClick={applyRegroupChanges}
												disabled={sceneMoves.length === 0}
											>
												<PiCheck />
												Apply Regroup
											</button>
											<button className="loc-btn-cancel" onClick={cancelRegroupMode}>
												<PiX />
												Cancel
											</button>
										</>
									) : !locationSelectionMode ? (
										<>
											<button className="loc-btn-primary" onClick={() => setShowAddGroupModal(true)}>
												<PiPlusBold />
												Add Set
											</button>
											<button className="loc-btn-secondary" onClick={enterRemoveMode}>
												<PiMinusCircle />
												Remove Set
											</button>
											
											<div className="loc-header-divider-vertical"></div>
											
											<button className="loc-btn-secondary" onClick={enterMergeMode}>
												<PiArrowsMerge />
												Merge Sets
											</button>
											<button className="loc-btn-secondary" onClick={enterSplitMode}>
												<PiScissors />
												Split Set
											</button>
											<button className="loc-btn-secondary" onClick={enterRegroupMode}>
												<PiShuffle />
												Regroup
											</button>

											{/* Expand/Collapse All Buttons */}
											<div className="loc-header-divider-vertical"></div>
											<button className="loc-btn-secondary" onClick={() => setCollapsedCards(new Set())}>
												<PiArrowsOutCardinal />
												Expand All
											</button>
											<button
												className="loc-btn-secondary"
												onClick={() => {
													const allIndices = new Set(locationData.locations.map((_, i) => i));
													setCollapsedCards(allIndices);
												}}
											>
												<PiArrowsInCardinal />
												Compress All
											</button>
										</>
									) : locationSelectionMode === 'remove' ? (
										<>
											<span className="loc-selection-mode-label">Select a set to remove:</span>
											<button 
												className="loc-btn-danger" 
												onClick={handleRemoveLocationsClick}
												disabled={selectedLocations.size !== 1}
											>
												<PiMinusCircle />
												Remove Selected
											</button>
											<button className="loc-btn-cancel" onClick={cancelSelectionMode}>
												<PiX />
												Cancel
											</button>
										</>
									) : locationSelectionMode === 'merge' ? (
										<>
											<span className="loc-selection-mode-label">
												Select 2 sets to merge ({selectedLocations.size}/2 selected):
											</span>
											<button 
												className="loc-btn-primary" 
												onClick={handleMergeLocationsClick}
												disabled={selectedLocations.size !== 2}
											>
												<PiArrowsMerge />
												Merge Selected
											</button>
											<button className="loc-btn-cancel" onClick={cancelSelectionMode}>
												<PiX />
												Cancel
											</button>
										</>
									) : locationSelectionMode === 'split' ? (
										<>
											<span className="loc-selection-mode-label">
												Select a set to split ({selectedLocations.size}/1 selected):
											</span>
											<button 
												className="loc-btn-primary" 
												onClick={handleSplitLocationClick}
												disabled={selectedLocations.size !== 1}
											>
												<PiScissors />
												Split Selected
											</button>
											<button className="loc-btn-cancel" onClick={cancelSelectionMode}>
												<PiX />
												Cancel
											</button>
										</>
									) : null}
								</div>

								<div className="loc-header-divider"></div>
							</div>

							{/* Location Cards */}
							<div className="loc-cards-container">
								{locationData.locations.map((location, idx) => {
									const isCollapsed = collapsedCards.has(idx);
									const isSelected = selectedLocations.has(idx);
									const showOptions = expandedOptions.has(idx);
									const showScenes = expandedScenes.has(idx);

									// Determine lock status text for compressed view
									const hasLockedOption = location.locked !== -1 && location.locked !== "-1" && location.locked !== null && location.locked !== undefined;
									const lockStatusText = hasLockedOption ? "Option locked" : "Option not locked";

									return (
										<div key={idx} className={`loc-location-card ${isCollapsed ? "loc-collapsed" : ""}`}>
											{/* Card Header - Compressed View when collapsed */}
											<div className={`loc-card-header ${isCollapsed ? "loc-card-header-compressed" : ""}`}>
												<div className="loc-card-header-left">
													{/* Location Checkbox - Only show when in selection mode */}
													{locationSelectionMode && (
														<div
															className={`loc-location-checkbox ${isSelected ? "" : "loc-unchecked"}`}
															onClick={() => toggleLocationSelection(idx)}
														>
															{isSelected ? <PiCheckSquareFill /> : <PiSquare />}
														</div>
													)}

													{/* Location Info */}
													<div className={`loc-location-info ${isCollapsed ? "loc-location-info-inline" : ""}`}>
														<span className="loc-location-id-box">{idx + 1}</span>
														<span className="loc-location-name">{location.location}</span>
														<span className="loc-extra-id">#{location.location_id}</span>
													</div>

													{/* Collapse Button - only show here when expanded */}
													{!isCollapsed && (
														<button
															className={`loc-collapse-btn ${isCollapsed ? "loc-collapsed" : ""}`}
															onClick={() => {
																setCollapsedCards((prev) => {
																	const next = new Set(prev);
																	if (next.has(idx)) next.delete(idx);
																	else next.add(idx);
																	return next;
																});
															}}
														>
															{isCollapsed ? <PiCaretDown /> : <PiCaretUp />}
														</button>
													)}
												</div>

												{/* Compressed Stats - Only show when collapsed */}
												{isCollapsed && (
													<div className="loc-compressed-stats">
														<div className="loc-compressed-divider"></div>
														<div className="loc-compressed-stat-item">
															<PiFilmSlateFill className="loc-compressed-icon" />
															<span className="loc-compressed-stat-text">
																<span className="loc-compressed-value">{location.scene_count}</span>
																<span className="loc-compressed-label"> : Scenes</span>
															</span>
														</div>
														<div className="loc-compressed-divider"></div>
														<div className="loc-compressed-stat-item">
															<PiUserFill className="loc-compressed-icon" />
															<span className="loc-compressed-stat-text">
																<span className="loc-compressed-value">{getCastIdsForLocation(location.scenes).length}</span>
																<span className="loc-compressed-label"> : Cast</span>
															</span>
														</div>
														<div className="loc-compressed-divider"></div>
														<div className="loc-compressed-stat-item">
															<PiMapPinFill className="loc-compressed-icon" />
															<span className="loc-compressed-stat-text">
																<span className="loc-compressed-value">{Object.keys(location.location_options || {}).length}</span>
																<span className="loc-compressed-label"> : Options</span>
															</span>
														</div>
														<div className="loc-compressed-divider"></div>
														<div className="loc-compressed-stat-item">
															<span className="loc-compressed-stat-text loc-compressed-label">{lockStatusText}</span>
														</div>
														<div className="loc-compressed-divider"></div>
													</div>
												)}

												{/* Collapse/Expand Button - Right side when collapsed */}
												{isCollapsed && (
													<button
														className="loc-collapse-btn loc-collapse-btn-right"
														onClick={() => {
															setCollapsedCards((prev) => {
																const next = new Set(prev);
																if (next.has(idx)) next.delete(idx);
																else next.add(idx);
																return next;
															});
														}}
													>
														<PiCaretDown />
													</button>
												)}

												{/* Card Header Actions */}
												{!isCollapsed && (
													<div className="loc-card-header-actions">
														<button
															className="loc-btn-add-option"
															onClick={() => {
																setSelectedLocationIndex(idx);
																setShowAddOptionModal(true);
																setOptionForm({
																	locationName: "",
																	address: "",
																	notes: "",
																	availableDates: [],
																	media: "",
																	locationPinLink: "",
																});
															}}
														>
															<PiPlusBold />
															Add Option
														</button>

														<button
															className={`loc-btn-remove-option ${isSelectingMode.has(idx) ? "loc-active" : ""}`}
															onClick={() => {
																if (!isSelectingMode.has(idx)) {
																	setIsSelectingMode((prev) => new Set(prev).add(idx));
																} else {
																	const selectedForLocation = Array.from(selectedOptions)
																		.filter((key) => key.startsWith(`${idx}-`))
																		.map((key) => key.split("-")[1]);

																	if (selectedForLocation.length === 0) {
																		alert("Please select options to remove");
																		return;
																	}

																	if (
																		window.confirm(
																			`Are you sure you want to remove ${selectedForLocation.length} selected option(s)?`
																		)
																	) {
																		selectedForLocation.forEach((optId) => {
																			removeLocationOption(idx, optId);
																		});
																		setSelectedOptions((prev) => {
																			const next = new Set(prev);
																			selectedForLocation.forEach((optId) => {
																				next.delete(`${idx}-${optId}`);
																			});
																			return next;
																		});
																		setIsSelectingMode((prev) => {
																			const next = new Set(prev);
																			next.delete(idx);
																			return next;
																		});
																	}
																}
															}}
														>
															<PiMinusCircle />
															{!isSelectingMode.has(idx)
																? "Remove Option"
																: `Remove Selected (${
																		Array.from(selectedOptions).filter((key) => key.startsWith(`${idx}-`))
																			.length
																  })`}
														</button>
													</div>
												)}
											</div>

											{/* Card Body */}
											{!isCollapsed && (
												<div className="loc-card-body">
													{/* Left Panel */}
													{(() => {
														const sceneAnalysis = analyzeLocationScenes(location.scenes);
														const castDetails = getCastIdsForLocation(location.scenes);
														return (
															<div className="loc-left-panel">
																{/* Stats Bar */}
																<div className="loc-stats-bar">
																	<div className="loc-stat-item">
																		<span className="loc-stat-label">Scenes:</span>
																		<span className="loc-stat-value">{sceneAnalysis.total}</span>
																	</div>
																	<div className="loc-stat-item">
																		<span className="loc-stat-label">Int:</span>
																		<span className="loc-stat-value">{sceneAnalysis.intCount}</span>
																	</div>
																	<div className="loc-stat-item">
																		<span className="loc-stat-label">Ext:</span>
																		<span className="loc-stat-value">{sceneAnalysis.extCount}</span>
																	</div>
																	<div className="loc-stat-item">
																		<span className="loc-stat-label">Int/Ext:</span>
																		<span className="loc-stat-value">{sceneAnalysis.intExtCount}</span>
																	</div>
																</div>

																{/* Cast Section - shows cast IDs for this location's scenes */}
																<div className="loc-cast-section">
																	<span className="loc-section-title">Cast</span>
																	<div className="loc-cast-badges-container">
																		<div className="loc-cast-badges">
																			{castDetails.length > 0 ? (
																				castDetails.map((cast, i) => (
																					<div
																						key={i}
																						className="loc-cast-badge"
																						title={cast.character}
																					>
																						{cast.cast_id}
																					</div>
																				))
																			) : (
																				<span className="loc-empty-badge">No cast</span>
																			)}
																		</div>
																	</div>
																</div>

																{/* View Buttons */}
																<div className="loc-view-buttons">
																	<button
																		className={`loc-btn-view ${
																			showOptions ? "loc-btn-view-primary" : "loc-btn-view-outline"
																		} ${isRegroupMode ? "loc-btn-disabled" : ""}`}
																		onClick={() => {
																			if (isRegroupMode) return; // Disable in regroup mode
																			setExpandedOptions((p) => {
																				const n = new Set(p);
																				if (n.has(idx)) n.delete(idx);
																				else n.add(idx);
																				return n;
																			});
																			setExpandedScenes((p) => {
																				const n = new Set(p);
																				n.delete(idx);
																				return n;
																			});
																		}}
																		disabled={isRegroupMode}
																	>
																		View Options
																	</button>

																	<button
																		className={`loc-btn-view ${
																			showScenes ? "loc-btn-view-primary" : "loc-btn-view-outline"
																		} ${isRegroupMode ? "loc-btn-disabled" : ""}`}
																		onClick={() => {
																			if (isRegroupMode) return; // Disable in regroup mode
																			setExpandedScenes((p) => {
																				const n = new Set(p);
																				if (n.has(idx)) n.delete(idx);
																				else n.add(idx);
																				return n;
																			});
																			setExpandedOptions((p) => {
																				const n = new Set(p);
																				n.delete(idx);
																				return n;
																			});
																		}}
																	>
																		View Scenes
																	</button>
																</div>
															</div>
														);
													})()}

													{/* Right Panel */}
													<div className="loc-right-panel">
														{/* Table Header Bar - Only show for Options view */}
														{!showScenes && (
															<div className="loc-table-header-bar">
																{isSelectingMode.has(idx) && (
																	<div className="loc-table-header-cell" style={{ width: 50 }}></div>
																)}
																<div className="loc-table-header-cell loc-col-sno">S.No</div>
																<div className="loc-table-header-cell loc-col-name">Set Name</div>
																<div className="loc-table-header-cell loc-col-address">Address</div>
																<div className="loc-table-header-cell loc-col-notes">Notes</div>
																<div className="loc-table-header-cell loc-col-media">Media</div>
																<div className="loc-table-header-cell loc-col-pin">Pin Link</div>
																<div className="loc-table-header-cell loc-col-dates">Dates</div>
																<div className="loc-table-header-cell loc-col-lock">Lock</div>
															</div>
														)}

														{/* Table Content */}
														<div className="loc-table-content">
															{!showScenes ? (
																// Options Table
																location.location_options && Object.keys(location.location_options).length > 0 ? (
																	<table className="loc-data-table">
																		<tbody>
																			{Object.entries(location.location_options).map(([optId, opt], i) => {
																				const key = `${idx}-${optId}`;
																				const locked =
																					location.locked === optId ||
																					location.locked === parseInt(optId) ||
																					String(location.locked) === optId;
																				const hasAnyLocked =
																					location.locked !== -1 &&
																					location.locked !== "-1" &&
																					location.locked !== null &&
																					location.locked !== undefined;
																				const otherLocked = hasAnyLocked && !locked;

																				const locationName = opt.locationName || opt.location_name || "-";
																				const address = opt.address || "-";
																				const notes = opt.notes || "-";
																				const media = opt.media || "-";
																				const pinLink = opt.location_pin_link || opt.locationPinLink || "";
																				const dates = opt.available_dates || opt.availableDates || [];
																				const formatDate = (dateStr) => {
																					const d = new Date(dateStr);
																					return d.toLocaleDateString("en-US", {
																						month: "short",
																						day: "numeric",
																					});
																				};
																				const datesDisplay =
																					Array.isArray(dates) && dates.length > 0
																						? dates.length <= 3
																							? dates.map(formatDate).join(", ")
																							: `${dates
																									.slice(0, 2)
																									.map(formatDate)
																									.join(", ")} +${
																									dates.length - 2
																							  } more`
																						: "-";

																				return (
																					<tr
																						key={optId}
																						className={`${locked ? "loc-row-locked" : ""} loc-data-row-clickable`}
																						onClick={() => {
																							setOptionDetailsModal({
																								option: opt,
																								isLocked: locked,
																								locationName: location.location,
																							});
																						}}
																					>
																						{isSelectingMode.has(idx) && (
																							<td style={{ width: 50 }} onClick={(e) => e.stopPropagation()}>
																								<input
																									type="checkbox"
																									className="loc-select-checkbox"
																									checked={selectedOptions.has(key)}
																									onChange={(e) => {
																										setSelectedOptions((prev) => {
																											const next = new Set(
																												prev
																											);
																											if (e.target.checked) {
																												next.add(key);
																											} else {
																												next.delete(key);
																											}
																											return next;
																										});
																									}}
																								/>
																							</td>
																						)}
																						<td style={{ width: 70 }}>{i + 1}</td>
																						<td style={{ width: 140 }}>{locationName}</td>
																						<td style={{ width: 110 }}>{address}</td>
																						<td style={{ width: 90 }} className="loc-truncate">{notes}</td>
																						<td style={{ width: 80 }} className="loc-truncate">{media}</td>
																						<td style={{ width: 80 }} onClick={(e) => e.stopPropagation()}>
																							{pinLink ? (
																								<a
																									href={pinLink}
																									target="_blank"
																									rel="noopener noreferrer"
																									className="loc-link"
																								>
																									View
																								</a>
																							) : (
																								"-"
																							)}
																						</td>
																						<td
																							style={{ width: 90 }}
																							title={
																								Array.isArray(dates) && dates.length > 0
																									? `Available dates:\n${dates.join(
																											"\n"
																									  )}`
																									: "No dates set"
																							}
																						>
																							{datesDisplay}
																						</td>
																						<td onClick={(e) => e.stopPropagation()}>
																							<button
																								className={`loc-lock-btn ${
																									locked ? "loc-locked" : ""
																								} ${otherLocked ? "loc-disabled" : ""}`}
																								onClick={() =>
																									toggleLockOption(
																										idx,
																										optId,
																										location.location_id
																									)
																								}
																								disabled={otherLocked}
																								title={
																									locked
																										? "Click to unlock"
																										: otherLocked
																										? "Another option is locked"
																										: "Click to lock"
																								}
																							>
																								{locked ? (
																									<PiLockSimple />
																								) : (
																									<PiLockSimpleOpen />
																								)}
																								{locked ? "Locked" : "Lock"}
																							</button>
																						</td>
																					</tr>
																				);
																			})}
																		</tbody>
																	</table>
																) : (
																	<div className="loc-empty-state">
																		<PiFolderPlus className="loc-empty-icon" />
																		<span className="loc-empty-text">
																			No Data added for this Set
																		</span>
																	</div>
																)
															) : // Scenes Table
															(location.scenes || []).length > 0 || isRegroupMode ? (
																<div
																	className={`loc-scenes-drop-zone ${isRegroupMode ? "loc-drop-active" : ""} ${draggedScene && dragSourceLocationId !== location.location_id ? "loc-drop-target" : ""}`}
																	onDragOver={(e) => handleDragOver(e, location.location_id)}
																	onDrop={(e) => handleDrop(e, location.location_id)}
																>
																	{isRegroupMode && (location.scenes || []).length === 0 && (
																		<div className="loc-drop-placeholder">
																			Drop scenes here
																		</div>
																	)}
																	<table className="loc-data-table">
																		<thead>
																			<tr>
																				<th>Scene No</th>
																				<th>Int./Ext.</th>
																				<th>Set</th>
																				<th>Time</th>
																				<th>Synopsis</th>
																				<th>Cast</th>
																			</tr>
																		</thead>
																		<tbody>
																			{(location.scenes || []).map((scene, i) => (
																				<tr 
																					key={i}
																					draggable={isRegroupMode}
																					onDragStart={(e) => handleDragStart(e, scene, location.location_id)}
																					onDragEnd={handleDragEnd}
																					className={`${isRegroupMode ? "loc-scene-draggable" : ""} ${draggedScene && String(draggedScene.scene_id) === String(scene.scene_id) ? "loc-scene-dragging" : ""}`}
																				>
																					<td>{scene.scene_number}</td>
																					<td>{scene.int_ext}</td>
																					<td>{location.location}</td>
																					<td>{scene.time}</td>
																					<td className="loc-synopsis-cell">{getSynopsisForScene(scene.scene_number)}</td>
																					<td>{getCastForScene(scene.scene_number)}</td>
																				</tr>
																			))}
																		</tbody>
																	</table>
																</div>
															) : (
																<div className="loc-empty-state">
																	<PiFolderPlus className="loc-empty-icon" />
																	<span className="loc-empty-text">No scenes listed for this Set</span>
																</div>
															)}
														</div>
													</div>
												</div>
											)}
										</div>
									);
								})}
							</div>
						</>
					)}
				</div>
			</div>

			{/* Add Option Modal */}
			{showAddOptionModal && (
				<MemoizedAddLocationOptionModal
					onClose={handleModalClose}
					onSubmit={handleFormSubmit}
					optionForm={optionForm}
					setOptionForm={memoizedSetOptionForm}
				/>
			)}

			{/* Option Details Modal */}
			{optionDetailsModal && (
				<div className="loc-modal-overlay" onClick={() => setOptionDetailsModal(null)}>
					<div className="loc-option-details-modal" onClick={(e) => e.stopPropagation()}>
						<div className="loc-option-modal-header">
							<div className="loc-option-modal-title-row">
								{optionDetailsModal.isLocked && <span className="loc-locked-badge">🔒 Locked</span>}
								<h3 className="loc-option-modal-title">
									{optionDetailsModal.option.locationName || optionDetailsModal.option.location_name || "Set Option"}
								</h3>
							</div>
							<div className="loc-option-modal-subtitle">
								Location Group: {optionDetailsModal.locationName}
							</div>
							<button className="loc-option-modal-close" onClick={() => setOptionDetailsModal(null)}>
								×
							</button>
						</div>

						<div className="loc-option-modal-content">
							<div className="loc-option-modal-section">
								<div className="loc-option-modal-label">📍 Address</div>
								<div className="loc-option-modal-value">
									{optionDetailsModal.option.address || "Not specified"}
								</div>
							</div>

							<div className="loc-option-modal-section">
								<div className="loc-option-modal-label">📝 Notes</div>
								<div className="loc-option-modal-value loc-option-modal-notes">
									{optionDetailsModal.option.notes || "No notes"}
								</div>
							</div>

							<div className="loc-option-modal-section">
								<div className="loc-option-modal-label">🎬 Media</div>
								<div className="loc-option-modal-value">
									{optionDetailsModal.option.media || "No media"}
								</div>
							</div>

							<div className="loc-option-modal-section">
								<div className="loc-option-modal-label">🗺️ Location Pin</div>
								<div className="loc-option-modal-value">
									{optionDetailsModal.option.location_pin_link || optionDetailsModal.option.locationPinLink ? (
										<a
											href={optionDetailsModal.option.location_pin_link || optionDetailsModal.option.locationPinLink}
											target="_blank"
											rel="noopener noreferrer"
											className="loc-option-modal-link"
										>
											Open in Maps →
										</a>
									) : (
										"No location pin"
									)}
								</div>
							</div>

							<div className="loc-option-modal-section loc-option-modal-dates-section">
								<div className="loc-option-modal-label">
									📅 Available Dates ({(optionDetailsModal.option.available_dates || optionDetailsModal.option.availableDates || []).length})
								</div>
								<div className="loc-option-modal-dates-container">
									{(() => {
										const dates = optionDetailsModal.option.available_dates || optionDetailsModal.option.availableDates || [];
										if (dates.length === 0) {
											return <span className="loc-option-modal-no-dates">No dates specified</span>;
										}
										return (
											<div className="loc-option-modal-dates-list">
												{dates.map((d) => (
													<span key={d} className="loc-option-modal-date-tag">
														{new Date(d).toLocaleDateString("en-US", {
															weekday: "short",
															month: "short",
															day: "numeric",
															year: "numeric",
														})}
													</span>
												))}
											</div>
										);
									})()}
								</div>
							</div>
						</div>

						<div className="loc-option-modal-footer">
							<button className="loc-option-modal-close-btn" onClick={() => setOptionDetailsModal(null)}>
								Close
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Add Set Group Modal */}
			{showAddGroupModal && (
				<div className="loc-modal-overlay" onClick={() => setShowAddGroupModal(false)}>
					<div className="loc-modal loc-add-group-modal" onClick={(e) => e.stopPropagation()}>
						<h3 className="loc-modal-title">Add Set</h3>
						<form 
							onSubmit={(e) => {
								e.preventDefault();
								addLocationGroup();
							}} 
							className="loc-form"
						>
							<div className="loc-form-group">
								<label className="loc-label">Set Name:</label>
								<input
									type="text"
									value={newGroupName}
									onChange={(e) => setNewGroupName(e.target.value.toUpperCase())}
									className="loc-input loc-input-uppercase"
									placeholder="Enter set name (will be uppercase)"
									required
									autoFocus
								/>
								<span className="loc-input-hint">Name will be automatically converted to uppercase</span>
							</div>

							<div className="loc-modal-buttons">
								<button type="submit" className="loc-submit-btn" disabled={!newGroupName.trim()}>
									Add Set
								</button>
								<button 
									type="button" 
									onClick={() => {
										setShowAddGroupModal(false);
										setNewGroupName("");
										setSelectedSceneIds(new Set());
										setAllScenes([]);
									}} 
									className="loc-cancel-btn"
								>
									Cancel
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Remove Set Modal */}
			{showRemoveLocModal && selectedLocations.size === 1 && (
				<div className="loc-modal-overlay" onClick={() => {
					setShowRemoveLocModal(false);
					setLocationSelectionMode(null);
					setSelectedLocations(new Set());
				}}>
					<div className="loc-modal loc-modal-remove" onClick={(e) => e.stopPropagation()}>
						<h3 className="loc-modal-title">Remove Set</h3>
						<div className="loc-remove-modal-content">
							<p className="loc-remove-warning-text">
								Are you sure you want to remove the set{" "}
								<strong>"{locationData.locations[Array.from(selectedLocations)[0]]?.location}"</strong>?
							</p>
							<p className="loc-remove-info-text">
								This action cannot be undone. All set options associated with this set will also be deleted.
							</p>
						</div>
						<div className="loc-modal-buttons">
							<button type="button" onClick={handleConfirmRemoveLocation} className="loc-submit-btn loc-btn-danger">
								Remove Set
							</button>
							<button
								type="button"
								onClick={() => {
									setShowRemoveLocModal(false);
									setLocationSelectionMode(null);
									setSelectedLocations(new Set());
								}}
								className="loc-cancel-btn"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Merge Sets Modal */}
			{showMergeModal && selectedLocations.size === 2 && (
				<div className="loc-modal-overlay" onClick={() => {
					setShowMergeModal(false);
					setMergedLocationName("");
					setMergeOptions(false);
				}}>
					<div className="loc-modal loc-modal-merge" onClick={(e) => e.stopPropagation()}>
						<h3 className="loc-modal-title">Merge Sets</h3>
						<div className="loc-merge-modal-content">
							<p className="loc-merge-info-text">
								You are merging the following sets:
							</p>
							<div className="loc-merge-locations-list">
								{Array.from(selectedLocations).map((idx) => (
									<div key={idx} className="loc-merge-location-item">
										<span className="loc-merge-location-id">{idx + 1}</span>
										<span className="loc-merge-location-name">{locationData.locations[idx]?.location}</span>
										<span className="loc-merge-location-scenes">
											({locationData.locations[idx]?.scene_count || 0} scenes)
										</span>
									</div>
								))}
							</div>
							
							<div className="loc-form-group">
								<label className="loc-label">New Merged Set Name:</label>
								<input
									type="text"
									value={mergedLocationName}
									onChange={(e) => setMergedLocationName(e.target.value.toUpperCase())}
									className="loc-input loc-input-uppercase"
									placeholder="Enter name for merged set"
									autoFocus
								/>
							</div>

							<div className="loc-merge-checkbox-group">
								<label className="loc-merge-checkbox-label">
									<input
										type="checkbox"
										checked={mergeOptions}
										onChange={(e) => setMergeOptions(e.target.checked)}
										className="loc-merge-checkbox"
									/>
									<span>Merge set options from both sets</span>
								</label>
								<p className="loc-merge-checkbox-hint">
									{mergeOptions 
										? "Set options from both sets will be combined. No option will be locked."
										: "No set options will be kept in the merged set."
									}
								</p>
							</div>

							<p className="loc-merge-warning-text">
								This action will delete both original sets and update all associated scenes to use the new merged set.
							</p>
						</div>
						<div className="loc-modal-buttons">
							<button 
								type="button" 
								onClick={performMergeLocations} 
								className="loc-submit-btn"
								disabled={!mergedLocationName.trim()}
							>
								<PiArrowsMerge />
								Merge Sets
							</button>
							<button
								type="button"
								onClick={() => {
									setShowMergeModal(false);
									setMergedLocationName("");
									setMergeOptions(false);
								}}
								className="loc-cancel-btn"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Split Set Modal */}
			{showSplitModal && selectedLocations.size === 1 && (
				<div className="loc-modal-overlay" onClick={() => {
					setShowSplitModal(false);
					setSplitNewName1("");
					setSplitNewName2("");
					setScenesForSet1(new Set());
					setScenesForSet2(new Set());
					setSplitLocationScenes([]);
				}}>
					<div className="loc-modal loc-modal-split" onClick={(e) => e.stopPropagation()}>
						<h3 className="loc-modal-title">Split Set</h3>
						<div className="loc-split-modal-content">
							<p className="loc-split-info-text">
								You are splitting the set:
							</p>
							<div className="loc-split-source-set">
								<span className="loc-split-source-id">{Array.from(selectedLocations)[0] + 1}</span>
								<span className="loc-split-source-name">
									{locationData.locations[Array.from(selectedLocations)[0]]?.location}
								</span>
								<span className="loc-split-source-scenes">
									({splitLocationScenes.length} scenes)
								</span>
							</div>
							
							<div className="loc-split-names-row">
								<div className="loc-form-group loc-split-name-group">
									<label className="loc-label">New Set 1 Name: <span className="loc-required">*</span></label>
									<input
										type="text"
										value={splitNewName1}
										onChange={(e) => setSplitNewName1(e.target.value.toUpperCase())}
										className="loc-input loc-input-uppercase"
										placeholder="Enter name for set 1"
										required
									/>
								</div>
								<div className="loc-form-group loc-split-name-group">
									<label className="loc-label">New Set 2 Name: <span className="loc-required">*</span></label>
									<input
										type="text"
										value={splitNewName2}
										onChange={(e) => setSplitNewName2(e.target.value.toUpperCase())}
										className="loc-input loc-input-uppercase"
										placeholder="Enter name for set 2"
										required
									/>
								</div>
							</div>

							<div className="loc-split-scenes-section">
								<label className="loc-label">Assign Scenes to New Sets: <span className="loc-required">*</span></label>
								<p className="loc-split-scenes-hint">
									Click on a set column to assign each scene. Each scene can only belong to one set.
								</p>
								
								{splitLocationScenes.length === 0 ? (
									<div className="loc-split-no-scenes">
										No scenes in this set to split.
									</div>
								) : (
									<div className="loc-split-scenes-table-container">
										<table className="loc-split-scenes-table">
											<thead>
												<tr>
													<th className="loc-split-scene-col">Scene</th>
													<th className="loc-split-scene-details-col">Int/Ext</th>
													<th className="loc-split-scene-details-col">Time</th>
													<th className="loc-split-assign-col">
														{splitNewName1 || "Set 1"}
														<span className="loc-split-count">({scenesForSet1.size})</span>
													</th>
													<th className="loc-split-assign-col">
														{splitNewName2 || "Set 2"}
														<span className="loc-split-count">({scenesForSet2.size})</span>
													</th>
												</tr>
											</thead>
											<tbody>
												{splitLocationScenes.map((scene, idx) => {
													const sceneId = String(scene.scene_id );
													const isInSet1 = scenesForSet1.has(sceneId);
													const isInSet2 = scenesForSet2.has(sceneId);
													
													return (
														<tr key={idx} className="loc-split-scene-row">
															<td className="loc-split-scene-number">{scene.scene_number}</td>
															<td className="loc-split-scene-detail">{scene.int_ext || "-"}</td>
															<td className="loc-split-scene-detail">{scene.time || "-"}</td>
															<td 
																className={`loc-split-assign-cell ${isInSet1 ? "loc-split-assigned" : ""}`}
																onClick={() => toggleSceneForSplit(sceneId, 1)}
															>
																{isInSet1 ? <PiCheckSquareFill /> : <PiSquare />}
															</td>
															<td 
																className={`loc-split-assign-cell ${isInSet2 ? "loc-split-assigned" : ""}`}
																onClick={() => toggleSceneForSplit(sceneId, 2)}
															>
																{isInSet2 ? <PiCheckSquareFill /> : <PiSquare />}
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								)}

								<div className="loc-split-summary">
									<span className="loc-split-summary-item">
										<strong>{scenesForSet1.size}</strong> scene(s) → {splitNewName1 || "Set 1"}
									</span>
									<span className="loc-split-summary-item">
										<strong>{scenesForSet2.size}</strong> scene(s) → {splitNewName2 || "Set 2"}
									</span>
									<span className="loc-split-summary-item loc-split-unassigned">
										<strong>{splitLocationScenes.length - scenesForSet1.size - scenesForSet2.size}</strong> unassigned
									</span>
								</div>
							</div>

							<p className="loc-split-warning-text">
								This will delete the original set and create two new sets. Set options will be duplicated to both new sets.
								In the schedule, the new sets will have empty dates and flexible dates disabled.
							</p>
						</div>
						<div className="loc-modal-buttons">
							<button 
								type="button" 
								onClick={performSplitLocation} 
								className="loc-submit-btn"
								disabled={!splitNewName1.trim() || !splitNewName2.trim() || (scenesForSet1.size === 0 && scenesForSet2.size === 0)}
							>
								<PiScissors />
								Split Set
							</button>
							<button
								type="button"
								onClick={() => {
									setShowSplitModal(false);
									setSplitNewName1("");
									setSplitNewName2("");
									setScenesForSet1(new Set());
									setScenesForSet2(new Set());
									setSplitLocationScenes([]);
								}}
								className="loc-cancel-btn"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default Locations;
