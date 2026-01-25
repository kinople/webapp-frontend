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
	PiArrowsMerge,
	PiScissors,
	PiX,
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
	// Scene selection for new location
	const [allScenes, setAllScenes] = useState([]);
	const [selectedSceneIds, setSelectedSceneIds] = useState(new Set());
	const [loadingScenes, setLoadingScenes] = useState(false);
	const [masterScriptId, setMasterScriptId] = useState(null);

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

	const toggleLocationSelection = (idx) => {
		if (!locationSelectionMode) return; // Don't allow selection if not in a mode
		
		setSelectedLocations((prev) => {
			const next = new Set(prev);
			if (next.has(idx)) {
				next.delete(idx);
				return next;
			}
			
			// For remove mode, only allow 1 selection
			if (locationSelectionMode === 'remove') {
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

	// Handle split button click (dummy for now)
	const handleSplitLocationClick = () => {
		alert("Split functionality coming soon!");
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
									{!locationSelectionMode ? (
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
											<button className="loc-btn-secondary" onClick={handleSplitLocationClick}>
												<PiScissors />
												Split Set
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
													<div className="loc-left-panel">
														{/* Stats Bar */}
														<div className="loc-stats-bar">
															<div className="loc-stat-item">
																<span className="loc-stat-label">Scenes:</span>
																<span className="loc-stat-value">{location.scene_count}</span>
															</div>
															<div className="loc-stat-item">
																<span className="loc-stat-label">Options:</span>
																<span className="loc-stat-value">{Object.keys(location.location_options || {}).length}</span>
															</div>
														</div>

														{/* Details Section */}
														<div className="loc-details-section">
															<span className="loc-section-title">Details</span>
															<div className="loc-info-box">
																<div className="loc-info-row">
																	<span className="loc-info-label">Int./Ext.:</span>
																	<span className="loc-info-value">
																		{location.int_ext_types?.join(", ") || "-"}
																	</span>
																</div>
																<div className="loc-info-row">
																	<span className="loc-info-label">Times:</span>
																	<span className="loc-info-value">{location.times?.join(", ") || "-"}</span>
																</div>
															</div>
														</div>

														{/* View Buttons */}
														<div className="loc-view-buttons">
															<button
																className={`loc-btn-view ${
																	showOptions ? "loc-btn-view-primary" : "loc-btn-view-outline"
																}`}
																onClick={() => {
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
															>
																View Options
															</button>

															<button
																className={`loc-btn-view ${
																	showScenes ? "loc-btn-view-primary" : "loc-btn-view-outline"
																}`}
																onClick={() => {
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
															(location.scenes || []).length > 0 ? (
																<table className="loc-data-table">
																	<thead>
																		<tr>
																			<th>Scene No</th>
																			<th>Int./Ext.</th>
																			<th>Time</th>
																		</tr>
																	</thead>
																	<tbody>
																		{(location.scenes || []).map((scene, i) => (
																			<tr key={i}>
																				<td>{scene.scene_number}</td>
																				<td>{scene.int_ext}</td>
																				<td>{scene.time}</td>
																			</tr>
																		))}
																	</tbody>
																</table>
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
		</div>
	);
};

export default Locations;
