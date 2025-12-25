import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { getApiUrl } from "../utils/api";
import "../css/Locations.css";

// Create a memoized modal component
const MemoizedAddLocationOptionModal = React.memo(({ onClose, onSubmit, optionForm, setOptionForm }) => {
	const handleSubmit = async (e) => {
		e.preventDefault();
		await onSubmit(optionForm);
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

	return (
		<div className="loc-modal-overlay">
			<div className="loc-modal">
				<h3 className="loc-modal-title">Add Location Option</h3>
				<form onSubmit={handleSubmit} className="loc-form">
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
	});
	const [selectedOptions, setSelectedOptions] = useState(new Set());
	const [isSelectingMode, setIsSelectingMode] = useState(new Set()); // Track which locations are in selecting mode
	const [lockedOptions, setLockedOptions] = useState(new Set()); // Track locked options
	const [collapsedCards, setCollapsedCards] = useState(new Set()); // Track collapsed cards

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

	const toggleLockOption = async (locationIndex, optionId) => {
		try {
			const key = `${locationIndex}-${optionId}`;
			const isCurrentlyLocked = lockedOptions.has(key);

			if (isCurrentlyLocked) {
				// Unlock this option
				setLockedOptions((prev) => {
					const next = new Set(prev);
					next.delete(key);
					return next;
				});
			} else {
				// Lock this option (and unlock any other locked option for this location)
				setLockedOptions((prev) => {
					const next = new Set(prev);
					// Remove any existing locks for this location
					Array.from(prev).forEach((lockedKey) => {
						if (lockedKey.startsWith(`${locationIndex}-`)) {
							next.delete(lockedKey);
						}
					});
					// Add the new lock
					next.add(key);
					return next;
				});
			}

			// Here you would typically make an API call to update the lock status
			// await fetch(getApiUrl(`/api/${id}/location/${location.location_id}/options/${optionId}/lock`), {
			//     method: 'POST',
			//     headers: { 'Content-Type': 'application/json' },
			//     body: JSON.stringify({ locked: !isCurrentlyLocked })
			// });
		} catch (error) {
			console.error("Error toggling lock:", error);
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
								<h2 className="loc-heading">Locations - {locationData.project_name}</h2>
								<p className="loc-subheading">Total Locations: {locationData.total_locations}</p>
							</div>

							<div className="loc-action-buttons">
								<button className="loc-action-btn loc-action-btn-primary">Add Location</button>
								<button className="loc-action-btn">Remove Location</button>
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
																	<th className="loc-header-cell">Lock</th>
																</tr>
															</thead>
															<tbody className="loc-tbody">
																{location.location_options &&
																Object.keys(location.location_options).length > 0 ? (
																	Object.entries(location.location_options).map(
																		([optionId, option], optionIndex) => {
																			const optionKey = `${index}-${optionId}`;
																			const isLocked = lockedOptions.has(optionKey);
																			const hasAnyLocked = Array.from(lockedOptions).some((key) =>
																				key.startsWith(`${index}-`)
																			);

																			return (
																				<tr key={optionIndex} className="loc-data-row">
																					{isSelectingMode.has(index) && (
																						<td className="loc-data-cell">
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
																					<td className="loc-data-cell">
																						{option.notes || "-"}
																					</td>
																					<td className="loc-data-cell">
																						<button
																							onClick={() =>
																								toggleLockOption(index, optionId)
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
																			colSpan={isSelectingMode.has(index) ? "5" : "5"}
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
		</div>
	);
};

export default Locations;
