import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { getApiUrl } from "../utils/api";
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
				<h3 className="loc-modal-title">Add Location Option</h3>
				<form onSubmit={handleSubmit} className="loc-form">
					<div className="loc-form-row">
						<div className="loc-form-column">
							<div className="loc-form-group">
								<label className="loc-label">Location Name:</label>
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
								<label className="loc-label">Location Pin Link:</label>
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
	const [isSelectingMode, setIsSelectingMode] = useState(new Set()); // Track which locations are in selecting mode
	const [collapsedCards, setCollapsedCards] = useState(new Set()); // Track collapsed cards
	const [optionDetailsModal, setOptionDetailsModal] = useState(null); // Store option data for modal: { option, isLocked, locationName }

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

	return (
		<div className="loc-page-container">
			<div className="loc-main-content">
				<div className="loc-content-area">
					{isLoading ? (
						<div className="loc-loading-container">
							<div className="loc-spinner" />
							<div className="loc-message">Loading locations...</div>
						</div>
					) : error ? (
						<div className="loc-error-container">
							<div className="loc-error-message">⚠️ {error}</div>
						</div>
					) : !locationData || locationData.locations.length === 0 ? (
						<div className="loc-empty-container">
							<div className="loc-message">No locations found</div>
						</div>
					) : (
						<>
							<div className="loc-header-info">
								<h2 className="loc-heading">Location Groups - {locationData.project_name}</h2>
								<p className="loc-subheading">Total Location Groups: {locationData.total_locations}</p>
							</div>

							<div className="loc-action-buttons">
								<button className="loc-action-btn loc-action-btn-primary">Add Location Group</button>
								<button className="loc-action-btn">Remove Location Group</button>
							</div>

							{locationData.locations.map((location, index) => {
								const isCollapsed = collapsedCards.has(index);
								return (
									<div key={index} className={`loc-card ${isCollapsed ? "loc-card-collapsed" : ""}`}>
										<div className={`loc-left-panel ${isCollapsed ? "loc-left-panel-collapsed" : ""}`}>
											<div className="loc-left-top">
												<span className="loc-index-badge">{index + 1}</span>
												<span className="loc-left-title">{location.location}</span>
												<button
													className="loc-collapse-btn"
													onClick={() => {
														setCollapsedCards((prev) => {
															const next = new Set(prev);
															if (next.has(index)) next.delete(index);
															else next.add(index);
															return next;
														});
													}}
													title={isCollapsed ? "Expand" : "Collapse"}
												>
													{isCollapsed ? "▼" : "▲"}
												</button>
											</div>

											{!isCollapsed && (
												<>
													<div className="loc-left-section">
														<div className="loc-section-label">No. of Scenes</div>
														<div className="loc-stats-row">
															<div className="loc-count-box">{location.scene_count}</div>
														</div>
													</div>

													<div className="loc-left-section">
														<div className="loc-section-label">Details</div>
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

													<div className="loc-view-buttons">
														<button
															className={`loc-view-btn ${expandedOptions.has(index) ? "loc-view-btn-active" : ""}`}
															onClick={() => {
																setExpandedOptions((prev) => new Set(prev).add(index));
																setExpandedScenes((prev) => {
																	const next = new Set(prev);
																	next.delete(index);
																	return next;
																});
															}}
														>
															View Options
														</button>
														<button
															className={`loc-view-btn ${expandedScenes.has(index) ? "loc-view-btn-active" : ""}`}
															onClick={() => {
																setExpandedScenes((prev) => new Set(prev).add(index));
																setExpandedOptions((prev) => {
																	const next = new Set(prev);
																	next.delete(index);
																	return next;
																});
															}}
														>
															View Scenes
														</button>
													</div>
												</>
											)}
										</div>

										{!isCollapsed && (
											<div className="loc-right-panel">
												{!expandedScenes.has(index) ? (
													// Show location options table
													<>
														{expandedOptions.has(index) && (
															<div className="loc-option-buttons">
																<button
																	className="loc-action-btn loc-action-btn-primary"
																	onClick={() => {
																		setSelectedLocationIndex(index);
																		setShowAddOptionModal(true);
																	}}
																>
																	+ Add Option
																</button>

																<button
																	className={`loc-action-btn ${
																		isSelectingMode.has(index) ? "loc-selecting" : ""
																	}`}
																	onClick={() => {
																		if (!isSelectingMode.has(index)) {
																			// Enter selection mode
																			setIsSelectingMode((prev) => new Set(prev).add(index));
																		} else {
																			// In selection mode - remove selected options
																			const selectedForLocation = Array.from(selectedOptions)
																				.filter((key) => key.startsWith(`${index}-`))
																				.map((key) => key.split("-")[1]);

																			if (selectedForLocation.length === 0) {
																				alert("Please select options to remove");
																				return;
																			}

																			if (
																				confirm(
																					`Are you sure you want to remove ${selectedForLocation.length} selected option(s)?`
																				)
																			) {
																				selectedForLocation.forEach((optionId) => {
																					removeLocationOption(index, optionId);
																				});
																				// Clear selections and exit selecting mode
																				setSelectedOptions((prev) => {
																					const next = new Set(prev);
																					selectedForLocation.forEach((optionId) => {
																						next.delete(`${index}-${optionId}`);
																					});
																					return next;
																				});
																				setIsSelectingMode((prev) => {
																					const next = new Set(prev);
																					next.delete(index);
																					return next;
																				});
																			}
																		}
																	}}
																>
																	{!isSelectingMode.has(index)
																		? "– Remove Option"
																		: `Remove Selected (${
																				Array.from(selectedOptions).filter((key) =>
																					key.startsWith(`${index}-`)
																				).length
																		  })`}
																</button>

																{isSelectingMode.has(index) && (
																	<button
																		className="loc-action-btn"
																		onClick={() => {
																			// Clear selections for this location and exit selecting mode
																			setSelectedOptions((prev) => {
																				const next = new Set();
																				prev.forEach((key) => {
																					if (!key.startsWith(`${index}-`)) {
																						next.add(key);
																					}
																				});
																				return next;
																			});
																			setIsSelectingMode((prev) => {
																				const next = new Set(prev);
																				next.delete(index);
																				return next;
																			});
																		}}
																	>
																		Cancel
																	</button>
																)}
															</div>
														)}
														<table className="loc-table">
															<thead className="loc-thead">
																<tr className="loc-header-row">
																	{isSelectingMode.has(index) && <th className="loc-header-cell">Select</th>}
																	<th className="loc-header-cell">Location Name</th>
																	<th className="loc-header-cell">Address</th>
																	<th className="loc-header-cell">Notes</th>
																	<th className="loc-header-cell">Media</th>
																	<th className="loc-header-cell">Location Pin Link</th>
																	<th className="loc-header-cell">Available Dates</th>
																	<th className="loc-header-cell">Lock</th>
																</tr>
															</thead>
															<tbody className="loc-tbody">
																{location.location_options &&
																Object.keys(location.location_options).length > 0 ? (
																	Object.entries(location.location_options).map(
																		([optionId, option], optionIndex) => {
																			const optionKey = `${index}-${optionId}`;
																			const isLocked =
																				location.locked === optionId ||
																				location.locked === parseInt(optionId) ||
																				String(location.locked) === optionId;
																			const hasAnyLocked =
																				location.locked !== -1 &&
																				location.locked !== "-1" &&
																				location.locked !== null &&
																				location.locked !== undefined;
																			const dates = option.available_dates || option.availableDates;

																			return (
																				<tr
																					key={optionIndex}
																					className="loc-data-row loc-data-row-clickable"
																					onClick={() => {
																						setOptionDetailsModal({
																							option,
																							isLocked,
																							locationName: location.location,
																						});
																					}}
																				>
																					{isSelectingMode.has(index) && (
																						<td className="loc-data-cell" onClick={(e) => e.stopPropagation()}>
																							<input
																								type="checkbox"
																								checked={selectedOptions.has(optionKey)}
																								onChange={(e) => {
																									setSelectedOptions((prev) => {
																										const next = new Set(prev);
																										if (e.target.checked) {
																											next.add(optionKey);
																										} else {
																											next.delete(optionKey);
																										}
																										return next;
																									});
																								}}
																							/>
																						</td>
																					)}
																					<td className="loc-data-cell">
																						{option.locationName ||
																							option.location_name ||
																							"-"}
																					</td>
																					<td className="loc-data-cell">
																						{option.address || "-"}
																					</td>
																					<td className="loc-data-cell loc-truncate">
																						{option.notes || "-"}
																					</td>
																					<td className="loc-data-cell loc-truncate">
																						{option.media || "-"}
																					</td>
																					<td className="loc-data-cell" onClick={(e) => e.stopPropagation()}>
																						{option.location_pin_link ||
																						option.locationPinLink ? (
																							<a
																								href={
																									option.location_pin_link ||
																									option.locationPinLink
																								}
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
																					<td className="loc-data-cell loc-dates-cell">
																						{(() => {
																							if (
																								!dates ||
																								(Array.isArray(dates) &&
																									dates.length === 0)
																							)
																								return "-";
																							if (Array.isArray(dates)) {
																								return dates.length > 3
																									? `${dates
																											.slice(0, 3)
																											.map((d) =>
																												new Date(
																													d
																												).toLocaleDateString(
																													"en-US",
																													{
																														month: "short",
																														day: "numeric",
																													}
																												)
																											)
																											.join(", ")} +${
																											dates.length - 3
																									  } more`
																									: dates
																											.map((d) =>
																												new Date(
																													d
																												).toLocaleDateString(
																													"en-US",
																													{
																														month: "short",
																														day: "numeric",
																													}
																												)
																											)
																											.join(", ");
																							}
																							return dates;
																						})()}
																					</td>
																					<td className="loc-data-cell" onClick={(e) => e.stopPropagation()}>
																						<button
																							onClick={() =>
																								toggleLockOption(
																									index,
																									optionId,
																									location.location_id
																								)
																							}
																							className={`loc-lock-btn ${
																								isLocked ? "loc-locked" : ""
																							} ${
																								!isLocked && hasAnyLocked
																									? "loc-disabled"
																									: ""
																							}`}
																							disabled={!isLocked && hasAnyLocked}
																							title={
																								isLocked
																									? "Click to unlock"
																									: hasAnyLocked
																									? "Another option is locked"
																									: "Click to lock"
																							}
																						>
																							{isLocked ? "🔒 Locked" : "🔓 Lock"}
																						</button>
																					</td>
																				</tr>
																			);
																		}
																	)
																) : (
																	<tr className="loc-data-row">
																		<td
																			colSpan={isSelectingMode.has(index) ? "8" : "7"}
																			className="loc-empty-row"
																		>
																			No location options added yet
																		</td>
																	</tr>
																)}
															</tbody>
														</table>
													</>
												) : (
													// Show scenes table - simplified without breakdown data
													<table className="loc-table">
														<thead className="loc-thead">
															<tr className="loc-header-row">
																<th className="loc-header-cell">Scene No.</th>
																<th className="loc-header-cell">Int./Ext.</th>
																<th className="loc-header-cell">Time</th>
															</tr>
														</thead>
														<tbody className="loc-tbody">
															{location.scenes && location.scenes.length > 0 ? (
																location.scenes.map((scene, sceneIndex) => (
																	<tr key={sceneIndex} className="loc-data-row">
																		<td className="loc-data-cell">{scene.scene_number}</td>
																		<td className="loc-data-cell">{scene.int_ext}</td>
																		<td className="loc-data-cell">{scene.time}</td>
																	</tr>
																))
															) : (
																<tr className="loc-data-row">
																	<td colSpan="3" className="loc-empty-row">
																		No scenes available
																	</td>
																</tr>
															)}
														</tbody>
													</table>
												)}
											</div>
										)}
									</div>
								);
							})}
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
									{optionDetailsModal.option.locationName || optionDetailsModal.option.location_name || "Location Option"}
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
		</div>
	);
};

export default Locations;
