import React, { useState, useEffect, useMemo, useCallback } from "react";
import ProjectHeader from "../components/ProjectHeader";
import { useParams } from "react-router-dom";
import { getApiUrl } from "../utils/api";

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
		<div style={modalStyles.overlay}>
			<div style={modalStyles.content}>
				<h3>Add Location Option</h3>
				<form onSubmit={handleSubmit} style={modalStyles.form}>
					<div style={modalStyles.formGroup}>
						<label>Location Name:</label>
						<input
							type="text"
							value={optionForm.locationName || ""}
							onChange={(e) => handleInputChange("locationName", e.target.value)}
							style={modalStyles.input}
							required
							autoFocus
						/>
					</div>
					<div style={modalStyles.formGroup}>
						<label>Address:</label>
						<input
							type="text"
							value={optionForm.address || ""}
							onChange={(e) => handleInputChange("address", e.target.value)}
							style={modalStyles.input}
						/>
					</div>
					<div style={modalStyles.formGroup}>
						<label>Notes:</label>
						<textarea
							value={optionForm.notes || ""}
							onChange={(e) => handleInputChange("notes", e.target.value)}
							style={modalStyles.textarea}
							placeholder=""
						/>
					</div>
					<div style={modalStyles.formButtons}>
						<button type="submit" style={modalStyles.submitButton}>
							Add Option
						</button>
						<button type="button" onClick={onClose} style={modalStyles.cancelButton}>
							Cancel
						</button>
					</div>
				</form>
			</div>
		</div>
	);
});

// Move modal styles outside the component to prevent recreation
const modalStyles = {
	overlay: {
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
	content: {
		backgroundColor: "#fff",
		padding: "20px",
		borderRadius: "8px",
		minWidth: "300px",
		maxWidth: "500px",
		maxHeight: "80vh",
		display: "flex",
		flexDirection: "column",
		gap: "15px",
	},
	form: {
		display: "flex",
		flexDirection: "column",
		gap: "15px",
	},
	formGroup: {
		display: "flex",
		flexDirection: "column",
		gap: "5px",
	},
	input: {
		padding: "8px",
		border: "1px solid #ccc",
		borderRadius: "4px",
		fontSize: "14px",
	},
	textarea: {
		padding: "8px",
		border: "1px solid #ccc",
		borderRadius: "4px",
		fontSize: "14px",
		minHeight: "60px",
		resize: "vertical",
	},
	formButtons: {
		display: "flex",
		gap: "10px",
		justifyContent: "flex-end",
		marginTop: "10px",
	},
	submitButton: {
		padding: "8px 16px",
		backgroundColor: "#4CAF50",
		color: "white",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
	},
	cancelButton: {
		padding: "8px 16px",
		backgroundColor: "#e0e0e0",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
	},
};

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
		<div style={styles.pageContainer}>
			<ProjectHeader />
			<div style={styles.mainContent}>
				<div style={styles.contentArea}>
					{isLoading ? (
						<div style={styles.message}>Loading locations...</div>
					) : error ? (
						<div style={styles.errorMessage}>{error}</div>
					) : !locationData || locationData.locations.length === 0 ? (
						<div style={styles.message}>No locations found</div>
					) : (
						<>
							<div style={styles.scriptInfo}>
								<h2>Locations - {locationData.project_name}</h2>
								<p>Total Locations: {locationData.total_locations}</p>
							</div>

							<div style={styles.actionButtons}>
								<button style={styles.AddLocationbutton}>Add Location</button>
								<button style={styles.button}>Remove Location</button>
							</div>

							{locationData.locations.map((location, index) => (
								<div key={index} style={styles.locationContainer}>
									<div style={styles.leftPanel}>
										<div style={styles.locationHeader}>
											<span style={styles.locationNumber}>{index + 1}</span>
											<span style={styles.locationName}>{location.location}</span>
										</div>

										<div style={styles.locationStats}>
											<div style={styles.sceneCount}>
												No. of Scenes
												<span style={styles.sceneCountNumber}>{location.scene_count}</span>
											</div>
											<div style={styles.locationInfo}>
												<div>Int./Ext.: {location.int_ext_types?.join(", ") || "-"}</div>
												<div>Times: {location.times?.join(", ") || "-"}</div>
											</div>
										</div>

										<div style={styles.viewButtons}>
											<button
												style={{
													...styles.viewButton,
													...(expandedOptions.has(index) ? styles.activeViewButton : styles.inactiveViewButton),
												}}
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
												style={{
													...styles.viewButton,
													...(expandedScenes.has(index) ? styles.activeViewButton : styles.inactiveViewButton),
												}}
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
									</div>

									<div style={styles.rightPanel}>
										{!expandedScenes.has(index) ? (
											// Show location options table
											<>
												{expandedOptions.has(index) && (
													<div style={styles.optionButtons}>
														<button
															style={styles.AddLocationbutton}
															onClick={() => {
																setSelectedLocationIndex(index);
																setShowAddOptionModal(true);
															}}
														>
															Add Option
														</button>

														<button
															style={{
																...styles.button,
																backgroundColor: isSelectingMode.has(index) ? "#6c757d" : "#e0e0e0",
																color: isSelectingMode.has(index) ? "white" : "black",
															}}
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
																? "Remove Option"
																: `Remove Selected (${
																		Array.from(selectedOptions).filter((key) =>
																			key.startsWith(`${index}-`)
																		).length
																  })`}
														</button>

														{isSelectingMode.has(index) && (
															<button
																style={styles.button}
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
												<table style={styles.table}>
													<thead>
														<tr>
															{isSelectingMode.has(index) && <th>Select</th>}
															<th>Location Name</th>
															<th>Address</th>
															<th>Notes</th>
															<th>Lock</th>
														</tr>
													</thead>
													<tbody>
														{location.location_options && Object.keys(location.location_options).length > 0 ? (
															Object.entries(location.location_options).map(([optionId, option], optionIndex) => {
																const optionKey = `${index}-${optionId}`;
																const isLocked = lockedOptions.has(optionKey);
																const hasAnyLocked = Array.from(lockedOptions).some((key) =>
																	key.startsWith(`${index}-`)
																);

																return (
																	<tr key={optionIndex} style={styles.tableRow}>
																		{isSelectingMode.has(index) && (
																			<td>
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
																		<td>{option.locationName || option.location_name || "-"}</td>
																		<td>{option.address || "-"}</td>
																		<td>{option.notes || "-"}</td>
																		<td>
																			<button
																				onClick={() => toggleLockOption(index, optionId)}
																				style={{
																					...styles.lockButton,
																					...(isLocked ? styles.lockedButton : {}),
																					opacity: !isLocked && hasAnyLocked ? 0.5 : 1,
																					cursor:
																						!isLocked && hasAnyLocked
																							? "not-allowed"
																							: "pointer",
																				}}
																				disabled={!isLocked && hasAnyLocked}
																				title={
																					isLocked
																						? "Click to unlock"
																						: hasAnyLocked
																						? "Another option is locked"
																						: "Click to lock"
																				}
																			>
																				{isLocked ? "Locked" : "Lock"}
																			</button>
																		</td>
																	</tr>
																);
															})
														) : (
															<tr style={styles.tableRow}>
																<td
																	colSpan={isSelectingMode.has(index) ? "5" : "5"}
																	style={{ textAlign: "center", fontStyle: "italic", color: "#666" }}
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
											<table style={styles.table}>
												<thead>
													<tr>
														<th>Scene No.</th>
														<th>Int./Ext.</th>
														<th>Time</th>
													</tr>
												</thead>
												<tbody>
													{location.scenes && location.scenes.length > 0 ? (
														location.scenes.map((scene, sceneIndex) => (
															<tr key={sceneIndex} style={styles.tableRow}>
																<td>{scene.scene_number}</td>
																<td>{scene.int_ext}</td>
																<td>{scene.time}</td>
															</tr>
														))
													) : (
														<tr style={styles.tableRow}>
															<td colSpan="3" style={{ textAlign: "center", fontStyle: "italic", color: "#666" }}>
																No scenes available
															</td>
														</tr>
													)}
												</tbody>
											</table>
										)}
									</div>
								</div>
							))}
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

const styles = {
	// Page-level styles (from CastListNew for modern look)
	page: {
		minHeight: "100vh",
		background: "linear-gradient(135deg, #f5f7fa, #c3cfe2)",
		fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
		padding: "2rem",
		color: "#0f1724",
	},
	pageContainer: {
		display: "flex",
		flexDirection: "column",
		minHeight: "100vh",
		backgroundColor: "#fff",
	},
	mainContent: {
		padding: "20px",
	},
	contentArea: { display: "flex", flexDirection: "column", gap: "2rem" },
	heading: { fontSize: "2rem", color: "#2C3440", margin: 0 },
	subheading: { fontSize: "1.2rem", color: "#2C3440", margin: 0 },

	scriptInfo: {
		textAlign: "center",
		padding: "1rem",
		backgroundColor: "rgba(255,255,255,0.6)",
		backdropFilter: "blur(8px)",
		borderRadius: "12px",
		border: "1px solid rgba(255,255,255,0.8)",
		boxShadow: "0 8px 16px rgba(0,0,0,0.05)",
	},

	card: {
		display: "flex",
		borderRadius: "12px",
		overflow: "hidden",
		background: "rgba(255,255,255,0.6)",
		backdropFilter: "blur(8px)",
		border: "1px solid rgba(230,230,230,0.9)",
		boxShadow: "0 8px 16px rgba(0,0,0,0.05)",
	},

	// Action buttons
	actionButtons: {
		display: "flex",
		gap: "10px",
		justifyContent: "center",
		marginBottom: "20px",
	},
	button: {
		padding: "8px 16px",
		backgroundColor: "#e0e0e0",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
	},
	AddLocationbutton: {
		padding: "8px 16px",
		background: "linear-gradient(135deg, #6c5ce7, #00b894)",
		border: "none",
		borderRadius: "4px",
		color: "white",
		cursor: "pointer",
	},

	// Location containers
	locationGroupContainer: {
		display: "flex",
		borderRadius: "12px",
		overflow: "hidden",
		background: "rgba(255,255,255,0.6)",
		backdropFilter: "blur(8px)",
		border: "1px solid rgba(230,230,230,0.9)",
		boxShadow: "0 8px 16px rgba(0,0,0,0.05)",
		minHeight: "fit-content",
		maxHeight: "400px",
	},
	locationContainer: {
		display: "flex",
		borderRadius: "12px",
		overflow: "hidden",
		background: "rgba(255,255,255,0.6)",
		backdropFilter: "blur(8px)",
		border: "1px solid rgba(230,230,230,0.9)",
		boxShadow: "0 8px 16px rgba(0,0,0,0.05)",
		minHeight: "fit-content",
		maxHeight: "400px",
	},
	ungroupedContainer: {
		display: "flex",
		borderRadius: "12px",
		overflow: "hidden",
		background: "rgba(255,255,255,0.6)",
		backdropFilter: "blur(8px)",
		border: "1px solid rgba(230,230,230,0.9)",
		boxShadow: "0 8px 16px rgba(0,0,0,0.05)",
	},

	/* Left grey framed panel */
	leftPanel: {
		width: "300px",
		padding: "1rem",
		background: "#f3f4f6",
		borderRight: "1px solid rgba(0,0,0,0.04)",
		display: "flex",
		flexDirection: "column",
		gap: "12px",
		overflow: "auto",
		minHeight: "fit-content",
	},
	leftTop: { display: "flex", alignItems: "center", gap: 12 },
	indexBadge: {
		width: 36,
		height: 36,
		borderRadius: "50%",
		background: "#fff",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		fontWeight: 700,
		color: "#111827",
		boxShadow: "0 2px 6px rgba(2,6,23,0.06)",
	},
	leftTitle: { fontSize: 16, fontWeight: 700, color: "#0f1724" },
	leftSection: { display: "flex", flexDirection: "column" },

	// Group/Location header styles
	groupHeader: {
		display: "flex",
		alignItems: "center",
		gap: "10px",
	},
	locationHeader: {
		display: "flex",
		alignItems: "center",
		gap: "10px",
	},
	groupNumber: {
		backgroundColor: "#fff",
		borderRadius: "50%",
		width: "36px",
		height: "36px",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		fontWeight: 700,
		color: "#111827",
		boxShadow: "0 2px 6px rgba(2,6,23,0.06)",
		fontSize: "14px",
	},
	locationNumber: {
		backgroundColor: "#fff",
		borderRadius: "50%",
		width: "36px",
		height: "36px",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		fontWeight: 700,
		color: "#111827",
		boxShadow: "0 2px 6px rgba(2,6,23,0.06)",
		fontSize: "14px",
	},
	groupName: {
		fontWeight: 700,
		color: "#0f1724",
		fontSize: 16,
	},
	locationName: {
		fontWeight: 700,
		color: "#0f1724",
		fontSize: 16,
	},
	ungroupedTitle: {
		margin: 0,
		fontWeight: 700,
		color: "#0f1724",
		fontSize: 16,
	},

	// Scene stats and counts
	sceneStats: {
		display: "flex",
		flexDirection: "column",
		gap: "10px",
	},
	locationStats: {
		display: "flex",
		flexDirection: "column",
		gap: "10px",
	},
	locationInfo: {
		display: "flex",
		flexDirection: "column",
		gap: "5px",
		fontSize: "0.9em",
		color: "#666",
	},
	countBox: {
		minWidth: 52,
		padding: "8px 10px",
		borderRadius: 8,
		background: "#fff",
		border: "1px solid #e6edf3",
		fontWeight: 700,
		textAlign: "center",
		color: "#0f1724",
	},
	smallCount: {
		display: "flex",
		flexDirection: "column",
		gap: 4,
		alignItems: "center",
		minWidth: 56,
	},
	smallLabel: { fontSize: 12, color: "#6b7280" },
	smallNumber: { fontWeight: 700, color: "#111827" },
	sceneCountNumber: {
		display: "inline-block",
		padding: "8px 10px",
		backgroundColor: "#fff",
		border: "1px solid #e6edf3",
		borderRadius: "8px",
		fontSize: "14px",
		minWidth: "52px",
		textAlign: "center",
		fontWeight: 700,
		color: "#0f1724",
		marginLeft: "8px",
	},

	lgBadge: {
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		padding: "6px 10px",
		borderRadius: 999,
		background: "#fff",
		border: "1px solid #e6edf3",
		fontSize: 13,
		color: "#0f1724",
	},

	// Checkbox styles
	checkboxGroup: {
		display: "flex",
		flexDirection: "column",
		gap: "5px",
	},
	checkbox: {
		cursor: "default",
	},

	// Input styles
	numberInput: {
		width: "40px",
		textAlign: "center",
		padding: "4px",
		borderRadius: "4px",
		border: "1px solid #e6edf3",
	},

	// View buttons
	viewButtons: { display: "flex", gap: 8, marginTop: 6 },
	viewBtn: {
		flex: 1,
		padding: "0.6rem",
		borderRadius: 8,
		border: "1px solid #e6edf3",
		background: "#fff",
		cursor: "pointer",
		fontWeight: 700,
		transition: "all 0.3s ease",
	},
	viewBtnActive: {
		background: "linear-gradient(135deg, #6c5ce7, #00b894)",
		color: "#fff",
		border: "none",
	},
	viewButton: {
		flex: 1,
		padding: "0.6rem",
		borderRadius: 8,
		border: "1px solid #e6edf3",
		background: "#fff",
		cursor: "pointer",
		fontWeight: 700,
		transition: "all 0.3s ease",
	},
	activeViewButton: {
		background: "linear-gradient(135deg, #6c5ce7, #00b894)",
		color: "#fff",
		border: "none",
	},
	inactiveViewButton: {
		backgroundColor: "#f3f4f6",
		color: "#666",
		border: "1px solid #e6e9ef",
	},

	/* Right panel */
	rightPanel: {
		flex: 1,
		padding: "1rem",
		backgroundColor: "#fff",
		overflow: "auto",
		minHeight: "fit-content",
	},

	optionButtons: { display: "flex", gap: "0.5rem", marginBottom: "1rem" },
	newBtn: {
		padding: "0.6rem 1.0rem",
		background: "linear-gradient(135deg, #6c5ce7, #00b894)",
		color: "#fff",
		border: "none",
		borderRadius: "6px",
		cursor: "pointer",
	},
	removeBtn: {
		padding: "0.6rem 1.0rem",
		background: "#f3f4f6",
		border: "1px solid #e6e9ef",
		borderRadius: "6px",
		cursor: "pointer",
	},

	// Table styles
	table: {
		width: "100%",
		borderCollapse: "collapse",
		background: "#fff",
		borderRadius: "8px",
		overflow: "hidden",
		border: "1px solid #e0e0e0",
	},
	th: {
		textAlign: "left",
		padding: "0.75rem",
		background: "rgba(0,0,0,0.03)",
		fontSize: 13,
		color: "#334155",
		position: "sticky",
		top: 0,
		zIndex: 1,
		borderBottom: "2px solid #ddd",
		fontWeight: "bold",
	},
	tr: { borderBottom: "1px solid rgba(0,0,0,0.06)" },
	td: {
		padding: "0.75rem",
		verticalAlign: "top",
		fontSize: 14,
		textAlign: "left",
		borderBottom: "1px solid #e0e0e0",
	},
	tableRow: {
		backgroundColor: "#fff",
		"&:hover": {
			backgroundColor: "#f5f5f5",
		},
	},
	optionRow: {
		backgroundColor: "#fafafa",
		"& td": {
			color: "#666",
			fontSize: "0.95em",
			paddingLeft: "32px",
		},
		"&:hover": {
			backgroundColor: "#f5f5f5",
		},
	},
	datesRow: {
		backgroundColor: "#f8f8f8",
		borderBottom: "1px solid #e0e0e0",
	},
	datesCell: {
		padding: "8px 32px",
		color: "#666",
		fontSize: "0.9em",
		fontStyle: "italic",
	},
	emptyRow: { textAlign: "center", color: "#666", padding: "1rem" },

	// Button styles
	iconButton: {
		background: "none",
		border: "none",
		cursor: "pointer",
		fontSize: "16px",
		padding: "4px 8px",
		borderRadius: "4px",
		transition: "background-color 0.2s",
		"&:hover": {
			backgroundColor: "#f0f0f0",
		},
	},
	scenesButton: {
		padding: "0.6rem",
		backgroundColor: "#f3f4f6",
		border: "1px solid #e6e9ef",
		borderRadius: "8px",
		cursor: "pointer",
		fontSize: "0.9em",
		color: "#0f1724",
		fontWeight: 600,
		"&:hover": {
			backgroundColor: "#e5e7eb",
		},
	},
	lockBtn: {
		padding: "0.35rem 0.7rem",
		border: "1px solid #d1d5db",
		borderRadius: "6px",
		cursor: "pointer",
		background: "#fff",
		fontSize: "0.9em",
		transition: "all 0.2s",
	},
	lockedBtn: {
		background: "linear-gradient(135deg, #6c5ce7, #00b894)",
		color: "#fff",
		border: "none",
	},
	lockButton: {
		padding: "0.35rem 0.7rem",
		backgroundColor: "#fff",
		border: "1px solid #d1d5db",
		borderRadius: "6px",
		cursor: "pointer",
		fontSize: "0.9em",
		transition: "all 0.2s",
		"&:hover": {
			backgroundColor: "#f0f0f0",
			borderColor: "#999",
		},
	},
	lockedButton: {
		background: "linear-gradient(135deg, #6c5ce7, #00b894)",
		color: "white",
		border: "none",
		"&:hover": {
			background: "linear-gradient(135deg, #5f4fd1, #00a67d)",
		},
	},
	removeButton: {
		padding: "4px 8px",
		backgroundColor: "#dc3545",
		color: "white",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
		fontSize: "12px",
		"&:hover": {
			backgroundColor: "#c82333",
		},
	},
	removeButtonContainer: {
		display: "flex",
		justifyContent: "center",
		padding: "16px",
		borderTop: "1px solid #e0e0e0",
	},

	// Message styles
	message: { textAlign: "center", padding: "2rem", color: "#666" },
	errorMessage: { textAlign: "center", padding: "2rem", color: "#dc3545" },

	// Modal styles
	modalOverlay: {
		position: "fixed",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "rgba(0,0,0,0.5)",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		zIndex: 1000,
		padding: 16,
	},
	modalContent: {
		background: "rgba(255,255,255,0.98)",
		backdropFilter: "blur(6px)",
		borderRadius: "12px",
		padding: "1.25rem",
		width: "100%",
		maxWidth: "760px",
		maxHeight: "80vh",
		boxShadow: "0 10px 30px rgba(2,6,23,0.12)",
		display: "flex",
		flexDirection: "column",
		gap: "15px",
	},
	modalTitle: { margin: 0, marginBottom: "0.75rem", color: "#2C3440", fontSize: 18 },
	closeButton: {
		padding: "0.55rem 0.9rem",
		background: "#f3f4f6",
		border: "1px solid #e6e9ef",
		borderRadius: "8px",
		cursor: "pointer",
		alignSelf: "flex-end",
	},

	// Form styles
	form: { display: "flex", flexDirection: "column", gap: "0.75rem" },
	formGroup: { display: "flex", flexDirection: "column", gap: "0.35rem" },
	label: { fontWeight: "600", color: "#2C3440", fontSize: 13 },
	input: {
		padding: "0.6rem",
		borderRadius: "8px",
		border: "1px solid #e6edf3",
		fontSize: "0.95rem",
		background: "#fff",
	},
	select: {
		padding: "0.6rem",
		borderRadius: "8px",
		border: "1px solid #e6edf3",
		backgroundColor: "#fff",
		fontSize: "0.95rem",
		width: "100%",
		maxWidth: "200px",
	},
	formButtons: { display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: 6 },
	submitButton: {
		padding: "0.6rem 1.0rem",
		background: "linear-gradient(135deg, #6c5ce7, #00b894)",
		color: "#fff",
		border: "none",
		borderRadius: "8px",
		cursor: "pointer",
	},
	cancelButton: {
		padding: "0.55rem 0.9rem",
		background: "#f3f4f6",
		border: "1px solid #e6e9ef",
		borderRadius: "8px",
		cursor: "pointer",
	},

	// Scenes list styles
	scenesList: {
		display: "flex",
		flexDirection: "column",
		gap: "8px",
		maxHeight: "400px",
		overflowY: "auto",
		padding: "10px",
		backgroundColor: "#f5f5f5",
		borderRadius: "8px",
	},
	sceneItem: {
		padding: "8px",
		backgroundColor: "#fff",
		borderRadius: "6px",
		boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
	},

	// Date picker styles
	datePickerContainer: {
		position: "fixed",
		zIndex: 5000,
		backgroundColor: "white",
		boxShadow: "0 10px 30px rgba(2,6,23,0.12)",
		borderRadius: "12px",
		padding: "12px",
		minWidth: "300px",
		transform: "translateX(-50%)",
		bottom: "calc(100% - 200px)",
	},
	datePickerSection: {
		display: "flex",
		justifyContent: "center",
	},
	dateDisplay: {
		backgroundColor: "#fff",
		borderRadius: "8px",
		"& .react-datepicker": {
			border: "none",
			boxShadow: "none",
		},
		"& .react-datepicker__day--highlighted": {
			backgroundColor: "#6c5ce7",
			color: "white",
		},
		"& .react-datepicker__day--keyboard-selected": {
			backgroundColor: "transparent",
			color: "inherit",
		},
		"& .react-datepicker__day:hover": {
			backgroundColor: "transparent",
			cursor: "default",
		},
	},
	selectedDates: {
		display: "flex",
		flexWrap: "wrap",
		gap: "8px",
		marginTop: "8px",
	},
	dateTag: {
		display: "flex",
		alignItems: "center",
		backgroundColor: "#f3f4f6",
		padding: "6px 10px",
		borderRadius: "6px",
		fontSize: "13px",
		border: "1px solid #e6edf3",
	},
	removeDate: {
		background: "none",
		border: "none",
		marginLeft: "6px",
		cursor: "pointer",
		padding: "0 4px",
		fontSize: "16px",
		color: "#666",
		"&:hover": {
			color: "#dc3545",
		},
	},
	flexibleText: {
		fontStyle: "italic",
		color: "#666",
		fontSize: "0.9em",
	},
	dateToggleContainer: {
		marginBottom: "15px",
	},
	dateToggleLabel: {
		display: "flex",
		alignItems: "center",
		gap: "8px",
		cursor: "pointer",
		fontSize: "0.95rem",
	},
	dateToggleCheckbox: {
		cursor: "pointer",
	},
};

export default Locations;
