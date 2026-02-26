import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { getApiUrl } from "../utils/api";
import {
	PiPlusBold,
	PiMinusCircle,
	PiArrowsMerge,
	PiScissors,
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
	PiX,
} from "react-icons/pi";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "../css/CastListNew.css";

/*
  CastList - Figma Design Implementation
  - Header with total characters count
  - Add Character, Remove, Merge buttons
  - Character cards with checkbox, name, collapse/expand
  - Stats bar showing scenes, INT/EXT counts
  - Location badges grid
  - Table for actor options
  - View Options / View Scenes buttons
*/

const AddActorOptionModal = React.memo(({ onClose, onSubmit, optionForm, setOptionForm }) => {
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
		[setOptionForm],
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
				return "cln-calendar-selected";
			}
		}
		return null;
	};

	return (
		<div className="cln-modal-overlay">
			<div className="cln-modal cln-modal-wide">
				<h3 className="cln-modal-title">Add Actor Option</h3>
				<form onSubmit={handleSubmit} className="cln-form">
					<div className="cln-form-row">
						<div className="cln-form-column">
							<div className="cln-form-group">
								<label className="cln-label">Artist Name:</label>
								<input
									type="text"
									value={optionForm.actorName || ""}
									onChange={(e) => handleInputChange("actorName", e.target.value)}
									className="cln-input"
									required
									autoFocus
								/>
							</div>

							<div className="cln-form-group">
								<label className="cln-label">Media (links):</label>
								<input
									type="text"
									value={optionForm.media || ""}
									onChange={(e) => handleInputChange("media", e.target.value)}
									className="cln-input"
									placeholder="Comma separated links (optional)"
								/>
							</div>

							<div className="cln-form-group">
								<label className="cln-label">Contact Details:</label>
								<textarea
									value={optionForm.contact || ""}
									onChange={(e) => handleInputChange("contact", e.target.value)}
									className="cln-textarea"
									placeholder="Phone / email / other contact info"
								/>
							</div>

							<div className="cln-form-group">
								<label className="cln-label">Details:</label>
								<textarea
									value={optionForm.details || ""}
									onChange={(e) => handleInputChange("details", e.target.value)}
									className="cln-textarea"
									placeholder="Short description / role notes"
								/>
							</div>

							<div className="cln-form-group">
								<label className="cln-label">Notes:</label>
								<textarea
									value={optionForm.notes || ""}
									onChange={(e) => handleInputChange("notes", e.target.value)}
									className="cln-textarea"
								/>
							</div>
						</div>
						<div className="cln-form-column">
							<div className="cln-form-group">
								<label className="cln-label">Available Dates:</label>
								<div className="cln-date-picker-container">
									<div className="cln-date-range-inputs">
										<input
											type="date"
											value={dateRangeStart}
											onChange={(e) => setDateRangeStart(e.target.value)}
											className="cln-date-input"
										/>
										<span className="cln-date-separator">to</span>
										<input
											type="date"
											value={dateRangeEnd}
											min={dateRangeStart}
											onChange={(e) => setDateRangeEnd(e.target.value)}
											className="cln-date-input"
										/>
										<button
											type="button"
											onClick={addDateRange}
											className="cln-add-range-btn"
											disabled={!dateRangeStart || !dateRangeEnd}
										>
											Add Range
										</button>
									</div>
									<div className="cln-calendar-wrapper">
										<Calendar selectRange={false} onClickDay={handleCalendarDateClick} tileClassName={tileClassName} />
									</div>
									{selectedDates.length > 0 && (
										<div className="cln-selected-dates">
											<div className="cln-selected-dates-header">
												<span>Selected Dates ({selectedDates.length}):</span>
												<button type="button" onClick={clearAllDates} className="cln-clear-dates-btn">
													Clear All
												</button>
											</div>
											<div className="cln-dates-list">
												{selectedDates.map((date) => (
													<span key={date} className="cln-date-tag">
														{formatDisplayDate(date)}
														<button type="button" onClick={() => removeDate(date)} className="cln-remove-date-btn">
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
					<div className="cln-modal-buttons">
						<button type="submit" className="cln-submit-btn">
							Add Option
						</button>
						<button type="button" onClick={onClose} className="cln-cancel-btn">
							Cancel
						</button>
					</div>
				</form>
			</div>
		</div>
	);
});

function findFirstField(obj = {}, candidates = []) {
	for (const k of candidates) {
		if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== "") return obj[k];
	}
	return undefined;
}

const parseTSV = (tsvText) => {
	try {
		const lines = tsvText.split("\n");
		if (lines.length < 2) return [];
		const headers = lines[0].split("\t").map((h) => h.trim());
		return lines
			.slice(1)
			.filter((l) => l.trim() !== "")
			.map((line) => {
				const values = line.split("\t").map((v) => v.trim());
				return headers.reduce((obj, header, idx) => {
					obj[header] = values[idx] || "";
					return obj;
				}, {});
			});
	} catch (e) {
		console.error("Error parsing TSV", e);
		return [];
	}
};

const CastListNew = () => {
	const { user, id } = useParams();
	const [castData, setCastData] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [showScenesModal, setShowScenesModal] = useState(false);
	const [selectedCharacterScenes, setSelectedCharacterScenes] = useState([]);
	const [selectedCharacter, setSelectedCharacter] = useState(null);
	const [expandedOptions, setExpandedOptions] = useState(new Set());
	const [expandedScenes, setExpandedScenes] = useState(new Set());
	const [showAddOptionModal, setShowAddOptionModal] = useState(false);
	const [selectedCharacterIndex, setSelectedCharacterIndex] = useState(null);
	const [optionForm, setOptionForm] = useState({ actorName: "", media: "", contact: "", availableDates: [], details: "", notes: "" });
	const [selectedOptions, setSelectedOptions] = useState(new Set());
	const [sceneChars, setSceneChars] = useState({});
	const [scenes, setScenes] = useState([]);
	const [isSelectingMode, setIsSelectingMode] = useState(new Set());
	const [collapsedCards, setCollapsedCards] = useState(new Set());
	const [showAddGroupModal, setShowAddGroupModal] = useState(false);
	const [newGroupName, setNewGroupName] = useState("");
	const [selectedCharacters, setSelectedCharacters] = useState(new Set());
	const [locationMap, setLocationMap] = useState({});
	const [showRemoveCharModal, setShowRemoveCharModal] = useState(false);
	// Character selection mode: null, 'remove', or 'merge'
	const [characterSelectionMode, setCharacterSelectionMode] = useState(null);
	// Merge modal state
	const [showMergeModal, setShowMergeModal] = useState(false);
	const [mergedCharacterName, setMergedCharacterName] = useState("");
	const [mergeOptions, setMergeOptions] = useState(false);
	// Split modal state
	const [showSplitModal, setShowSplitModal] = useState(false);
	const [splitNewName1, setSplitNewName1] = useState("");
	const [splitNewName2, setSplitNewName2] = useState("");
	const [scenesForChar1, setScenesForChar1] = useState(new Set());
	const [scenesForChar2, setScenesForChar2] = useState(new Set());
	const [splitCharacterScenes, setSplitCharacterScenes] = useState([]);

	useEffect(() => {
		const CalculateScenceChars = (data) => {
			var newSceneChars = {};

			data["cast_list"].forEach((cast) => {
				cast["scenes"].forEach((scene) => {
					if (!(scene in newSceneChars)) {
						newSceneChars[scene] = [];
					}
					newSceneChars[scene].push(cast["cast_id"]);
				});
			});

			setSceneChars(newSceneChars);
			return;
		};

		const fetchCastList = async () => {
			setIsLoading(true);
			try {
				const res = await fetch(getApiUrl(`/api/${id}/cast-list`));
				if (!res.ok) throw new Error("Failed to fetch cast list");
				const data = await res.json();
				CalculateScenceChars(data);
				setCastData(data);
				console.log("cast-list ------------ ", data);
				if (Array.isArray(data?.cast_list)) setExpandedOptions(new Set(data.cast_list.map((_, i) => i)));
			} catch (e) {
				setError(e.message);
			} finally {
				setIsLoading(false);
			}
		};
		fetchCastList();
	}, [id]);

	useEffect(() => {
		const fetchScenes = async () => {
			try {
				const scriptsResponse = await fetch(getApiUrl(`/api/${id}/script-list`));
				if (!scriptsResponse.ok) {
					throw new Error("Failed to fetch script list");
				}
				const scripts = await scriptsResponse.json();
				const sortedScripts = (scripts || []).sort((a, b) => (b.version || 0) - (a.version || 0));

				if (sortedScripts.length > 0) {
					const masterScript = sortedScripts[sortedScripts.length - 1];
					const breakdownResponse = await fetch(getApiUrl(`/api/fetch-breakdown?project_id=${id}`));
					if (!breakdownResponse.ok) {
						if (breakdownResponse.status === 404) {
							return;
						}
						throw new Error("Failed to fetch breakdown");
					}
					const breakdownData = await breakdownResponse.json();

					// Use scene_breakdowns (JSON format) to get the 'set' field
					if (breakdownData.scene_breakdowns) {
						setScenes(breakdownData.scene_breakdowns);
						console.log("break-down------------- ", breakdownData.scene_breakdowns);
					} else if (breakdownData.tsv_content) {
						// Fallback to TSV parsing if scene_breakdowns not available
						const parsedScenes = parseTSV(breakdownData.tsv_content);
						setScenes(parsedScenes);
						console.log("break-down (tsv)------------- ", parsedScenes);
					}
				}
			} catch (error) {
				console.error("Error fetching scenes:", error);
			}
		};

		fetchScenes();
	}, [id]);

	// Fetch locations to get location IDs
	useEffect(() => {
		const fetchLocations = async () => {
			try {
				const response = await fetch(getApiUrl(`/api/${id}/locations`));
				if (!response.ok) return;
				const data = await response.json();

				// Create mapping from location name to location_id
				const mapping = {};
				if (data?.locations) {
					data.locations.forEach((loc) => {
						if (loc.location && loc.location_id) {
							mapping[loc.location] = loc.location_id;
						}
					});
				}
				setLocationMap(mapping);
			} catch (error) {
				console.error("Error fetching locations:", error);
			}
		};

		fetchLocations();
	}, [id]);

	function analyzeScenes(CharScenes) {
		const result = { total: 0, intCount: 0, extCount: 0, intExtCount: 0, locationGroupIds: new Set() };
		if (!Array.isArray(CharScenes)) return result;

		result.total = CharScenes.length;

		scenes.forEach((scene) => {
			// Support both JSON format (scene_number) and TSV format (Scene Number)
			const sceneNumber = scene.scene_number || scene["Scene Number"];
			if (CharScenes.includes(sceneNumber)) {
				// Support both JSON format (int_ext) and TSV format (Int./Ext.)
				const intExt = (scene.int_ext || scene["Int./Ext."] || "").toUpperCase();
				if (intExt.includes("INT.") && intExt.includes("EXT.")) {
					result.intExtCount += 1;
				} else if (intExt.includes("INT")) {
					result.intCount += 1;
				} else if (intExt.includes("EXT")) {
					result.extCount += 1;
				}
				// Use 'set' field (JSON format) for location grouping, fall back to 'location' or 'Location'
				const setLocation = scene.set || scene.location || scene["Location"];
				if (setLocation) {
					result.locationGroupIds.add(setLocation);
				}
			}
		});

		return result;
	}

	const addActorOption = async (idx, form) => {
		setIsLoading(true);
		try {
			const member = castData.cast_list[idx];
			const res = await fetch(getApiUrl(`/api/${id}/cast/add-option`), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					character: member.character,
					cast_id: member.cast_id,
					actorName: form.actorName,
					media: form.media,
					contact: form.contact,
					availableDates: form.availableDates || [],
					details: form.details,
					notes: form.notes,
				}),
			});
			if (!res.ok) {
				const text = await res.text().catch(() => null);
				throw new Error(text || "Failed to add actor option");
			}
			const refreshed = await (await fetch(getApiUrl(`/api/${id}/cast-list`))).json();
			console.log("new castlist ", refreshed);
			setCastData(refreshed);
			setShowAddOptionModal(false);
			setOptionForm({ actorName: "", media: "", contact: "", availableDates: [], details: "", notes: "" });
		} catch (e) {
			setError(e.message);
		} finally {
			setIsLoading(false);
		}
	};

	const removeActorOption = async (idx, optId) => {
		setIsLoading(true);
		try {
			const member = castData.cast_list[idx];
			await fetch(getApiUrl(`/api/${id}/cast/${member.cast_id}/options/${optId}`), { method: "DELETE" });
			const refreshed = await (await fetch(getApiUrl(`/api/${id}/cast-list`))).json();
			setCastData(refreshed);
		} catch (e) {
			setError(e.message);
		} finally {
			setIsLoading(false);
		}
	};

	const toggleLockOption = useCallback(
		async (idx, optId, castId) => {
			try {
				setIsLoading(true);
				const member = castData.cast_list[idx];
				const currentLocked = member.locked;

				// If already locked with this option, unlock it (-1), otherwise lock this option
				const newLockValue = String(currentLocked) === String(optId) ? -1 : optId;

				const res = await fetch(getApiUrl(`/api/${id}/cast/${castId}/lock`), {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ option_id: newLockValue }),
				});

				console.log("res ", res);
				if (!res.ok) {
					const text = await res.text().catch(() => null);
					throw new Error(text || "Failed to toggle lock");
				}

				// Refresh cast data
				const refreshed = await (await fetch(getApiUrl(`/api/${id}/cast-list`))).json();
				setCastData(refreshed);
			} catch (e) {
				setError(e.message);
				alert("Failed to toggle lock: " + e.message);
			} finally {
				setIsLoading(false);
			}
		},
		[castData, id],
	);

	const addCastGroup = async () => {
		try {
			if (!newGroupName.trim()) {
				alert("Please enter a character name");
				return;
			}

			const normalizedName = newGroupName.trim().toUpperCase();
			const existingCast = castData?.cast_list?.find((cast) => cast.character?.toUpperCase() === normalizedName);
			if (existingCast) {
				alert(`A character with the name "${normalizedName}" already exists.`);
				return;
			}

			setIsLoading(true);

			const response = await fetch(getApiUrl(`/api/${id}/cast/add-group`), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ characterName: newGroupName.trim() }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Failed to add cast group");
			}

			setShowAddGroupModal(false);
			setNewGroupName("");

			const refreshResponse = await fetch(getApiUrl(`/api/${id}/cast-list`));
			if (!refreshResponse.ok) {
				throw new Error("Failed to refresh cast list");
			}
			const jsonData = await refreshResponse.json();
			setCastData(jsonData);

			setExpandedOptions((prev) => {
				const next = new Set(prev);
				next.add(jsonData.cast_list.length - 1);
				return next;
			});
		} catch (error) {
			console.error("Error adding cast group:", error);
			alert(error.message);
		} finally {
			setIsLoading(false);
		}
	};

	const deleteCastGroup = async (castId, characterName, sceneCount) => {
		try {
			if (sceneCount > 0) {
				alert(`Cannot delete "${characterName}" - it has ${sceneCount} scene(s) assigned. Scene count must be 0 to delete.`);
				return;
			}

			setIsLoading(true);

			const response = await fetch(getApiUrl(`/api/${id}/cast/${castId}/delete-group`), {
				method: "DELETE",
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Failed to delete cast group");
			}

			setCharacterSelectionMode(null);

			const refreshResponse = await fetch(getApiUrl(`/api/${id}/cast-list`));
			if (!refreshResponse.ok) {
				throw new Error("Failed to refresh cast list");
			}
			const jsonData = await refreshResponse.json();
			setCastData(jsonData);

			const defaultExpandedOptions = new Set(jsonData.cast_list?.map((_, index) => index) || []);
			setExpandedOptions(defaultExpandedOptions);
		} catch (error) {
			console.error("Error deleting cast group:", error);
			alert(error.message);
		} finally {
			setIsLoading(false);
		}
	};

	const getOptionField = (opt, keys) => {
		if (!opt) return "-";
		const val = findFirstField(opt, keys);
		if (val === undefined || val === null || String(val).trim() === "") return "-";
		if (Array.isArray(val)) return val.join(", ");
		return String(val);
	};

	const getData = (s, field) => {
		var data = "";
		const searchStr = String(s);
		scenes.forEach((scene, idx) => {
			// Support both JSON format (scene_number) and TSV format (Scene Number)
			const sceneNumber = scene.scene_number || scene["Scene Number"];
			// Also check by 'id' field or array index (what castlist stores as scene ID)
			const sceneId = String(scene.id !== undefined ? scene.id : idx);
			const arrayIndex = String(idx);

			// Match by scene_number, id field, or array index
			if (sceneNumber === searchStr || sceneId === searchStr || arrayIndex === searchStr) {
				// Map field names between TSV and JSON formats
				const fieldMap = {
					"Scene Number": scene.scene_number || scene["Scene Number"],
					"Int./Ext.": scene.int_ext || scene["Int./Ext."],
					Location: scene.location || scene["Location"], // Use set first
					Time: scene.time || scene["Time"],
					"Page Eighths": scene.page_eighths || scene["Page Eighths"],
					Synopsis: scene.synopsis || scene["Synopsis"],
				};
				data = fieldMap[field] !== undefined ? fieldMap[field] : scene[field] || "";
				return;
			}
		});
		return data || "N/A";
	};

	const toggleCharacterSelection = (idx) => {
		if (!characterSelectionMode) return; // Don't allow selection if not in a mode

		setSelectedCharacters((prev) => {
			const next = new Set(prev);

			// If already selected, deselect it
			if (next.has(idx)) {
				next.delete(idx);
				return next;
			}

			// For merge mode, allow up to 2 selections
			if (characterSelectionMode === "merge") {
				if (next.size < 2) {
					next.add(idx);
				} else {
					// Replace the first one if already have 2
					const firstIdx = next.values().next().value;
					next.delete(firstIdx);
					next.add(idx);
				}
				return next;
			}

			// For remove and split modes, select only this one (single selection)
			return new Set([idx]);
		});
	};

	// Enter remove mode
	const enterRemoveMode = () => {
		setCharacterSelectionMode("remove");
		setSelectedCharacters(new Set());
	};

	// Cancel selection mode
	const cancelSelectionMode = () => {
		setCharacterSelectionMode(null);
		setSelectedCharacters(new Set());
	};

	// Enter merge mode
	const enterMergeMode = () => {
		setCharacterSelectionMode("merge");
		setSelectedCharacters(new Set());
	};

	// Handle merge button click - show merge modal
	const handleMergeCharactersClick = () => {
		if (selectedCharacters.size === 2) {
			// Get the two selected characters and suggest a merged name
			const indices = Array.from(selectedCharacters);
			const char1 = castData.cast_list[indices[0]];
			const char2 = castData.cast_list[indices[1]];
			setMergedCharacterName(`${char1.character} / ${char2.character}`);
			setMergeOptions(false);
			setShowMergeModal(true);
		} else {
			alert("Please select exactly 2 characters to merge");
		}
	};

	// Perform the actual merge
	const performMergeCharacters = async () => {
		try {
			if (!mergedCharacterName.trim()) {
				alert("Please enter a name for the merged character");
				return;
			}

			setIsLoading(true);

			const indices = Array.from(selectedCharacters);
			const char1 = castData.cast_list[indices[0]];
			const char2 = castData.cast_list[indices[1]];

			// Get scriptId from the first script
			let scriptId = null;
			try {
				const scriptsResponse = await fetch(getApiUrl(`/api/${id}/script-list`));
				if (scriptsResponse.ok) {
					const scripts = await scriptsResponse.json();
					if (scripts && scripts.length > 0) {
						const sortedScripts = scripts.sort((a, b) => (b.version || 0) - (a.version || 0));
						scriptId = sortedScripts[sortedScripts.length - 1]?.id;
					}
				}
			} catch (err) {
				console.error("Error fetching script ID:", err);
			}

			const response = await fetch(getApiUrl(`/api/${id}/cast/merge`), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					castId1: char1.cast_id,
					castId2: char2.cast_id,
					mergedName: mergedCharacterName.trim(),
					mergeOptions: mergeOptions,
					scriptId: scriptId,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Failed to merge characters");
			}

			// Close modal and reset state
			setShowMergeModal(false);
			setMergedCharacterName("");
			setMergeOptions(false);
			setSelectedCharacters(new Set());
			setCharacterSelectionMode(null);

			// Refresh cast list data
			const refreshResponse = await fetch(getApiUrl(`/api/${id}/cast-list`));
			if (!refreshResponse.ok) {
				throw new Error("Failed to refresh cast list");
			}
			const jsonData = await refreshResponse.json();
			setCastData(jsonData);

			alert(`Characters merged successfully! ${data.scenes_updated} scene(s) updated.`);
		} catch (error) {
			console.error("Error merging characters:", error);
			alert(error.message);
		} finally {
			setIsLoading(false);
		}
	};

	// Enter split mode
	const enterSplitMode = () => {
		setCharacterSelectionMode("split");
		setSelectedCharacters(new Set());
	};

	// Handle split button click - show split modal
	const handleSplitCharacterClick = () => {
		if (selectedCharacters.size === 1) {
			const idx = Array.from(selectedCharacters)[0];
			const member = castData.cast_list[idx];

			// Get the scenes for this character
			const characterScenes = member.scenes || [];
			setSplitCharacterScenes(characterScenes);
			console.log("characterScenes ", characterScenes);

			// Reset split form
			setSplitNewName1("");
			setSplitNewName2("");
			setScenesForChar1(new Set());
			setScenesForChar2(new Set());

			setShowSplitModal(true);
		} else {
			alert("Please select a character to split");
		}
	};

	// Toggle scene assignment for split - characters can share scenes
	const toggleSceneForSplit = (sceneNumber, targetChar) => {
		const sceneStr = String(sceneNumber);

		if (targetChar === 1) {
			setScenesForChar1((prev) => {
				const next = new Set(prev);
				if (next.has(sceneStr)) {
					next.delete(sceneStr);
				} else {
					next.add(sceneStr);
				}
				return next;
			});
		} else {
			setScenesForChar2((prev) => {
				const next = new Set(prev);
				if (next.has(sceneStr)) {
					next.delete(sceneStr);
				} else {
					next.add(sceneStr);
				}
				return next;
			});
		}
	};

	// Perform the actual split
	const performSplitCharacter = async () => {
		try {
			if (!splitNewName1.trim() || !splitNewName2.trim()) {
				alert("Please enter names for both new characters");
				return;
			}

			if (splitNewName1.trim().toUpperCase() === splitNewName2.trim().toUpperCase()) {
				alert("The two new character names must be different");
				return;
			}

			const totalScenes = splitCharacterScenes.length;
			const assignedScenes = new Set([...scenesForChar1, ...scenesForChar2]).size;

			if (scenesForChar1.size === 0 && scenesForChar2.size === 0) {
				alert("Please assign at least one scene to one of the new characters");
				return;
			}

			if (assignedScenes < totalScenes) {
				const unassigned = totalScenes - assignedScenes;
				if (
					!window.confirm(
						`${unassigned} scene(s) are not assigned to either character. They will be removed from both new characters. Continue?`,
					)
				) {
					return;
				}
			}

			const idx = Array.from(selectedCharacters)[0];
			const member = castData.cast_list[idx];

			setIsLoading(true);

			// Get scriptId
			let scriptIdToUse = null;
			try {
				const scriptsResponse = await fetch(getApiUrl(`/api/${id}/script-list`));
				if (scriptsResponse.ok) {
					const scripts = await scriptsResponse.json();
					const sortedScripts = (scripts || []).sort((a, b) => (b.version || 0) - (a.version || 0));
					if (sortedScripts.length > 0) {
						scriptIdToUse = sortedScripts[sortedScripts.length - 1].id;
					}
				}
			} catch (error) {
				console.error("Error fetching scripts for split:", error);
			}

			// Debug logging
			console.log("Split character request data:", {
				castId: member.cast_id,
				newName1: splitNewName1.trim(),
				newName2: splitNewName2.trim(),
				scenesForChar1: Array.from(scenesForChar1),
				scenesForChar2: Array.from(scenesForChar2),
				scriptId: scriptIdToUse,
			});

			const response = await fetch(getApiUrl(`/api/${id}/cast/split`), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					castId: member.cast_id,
					newName1: splitNewName1.trim(),
					newName2: splitNewName2.trim(),
					scenesForChar1: Array.from(scenesForChar1),
					scenesForChar2: Array.from(scenesForChar2),
					scriptId: scriptIdToUse,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Failed to split character");
			}

			// Close modal and reset state
			setShowSplitModal(false);
			setSplitNewName1("");
			setSplitNewName2("");
			setScenesForChar1(new Set());
			setScenesForChar2(new Set());
			setSplitCharacterScenes([]);
			setSelectedCharacters(new Set());
			setCharacterSelectionMode(null);

			// Refresh the cast list data
			const refreshResponse = await fetch(getApiUrl(`/api/${id}/cast-list`));
			if (!refreshResponse.ok) {
				throw new Error("Failed to refresh cast list");
			}
			const jsonData = await refreshResponse.json();
			setCastData(jsonData);

			alert(
				`Character split successfully! ${data.scenes_to_char_1} scene(s) assigned to "${splitNewName1.trim().toUpperCase()}" and ${data.scenes_to_char_2} scene(s) assigned to "${splitNewName2.trim().toUpperCase()}".`,
			);
		} catch (error) {
			console.error("Error splitting character:", error);
			alert(error.message);
		} finally {
			setIsLoading(false);
		}
	};

	const handleRemoveCharactersClick = () => {
		// Only show the modal if exactly one character is selected
		if (selectedCharacters.size === 1) {
			setShowRemoveCharModal(true);
		} else {
			alert("Please select a character to remove");
		}
	};

	const handleConfirmRemoveCharacter = () => {
		if (selectedCharacters.size === 1) {
			const idx = Array.from(selectedCharacters)[0];
			const member = castData.cast_list[idx];
			const sceneAnalysis = analyzeScenes(member.scenes || []);
			deleteCastGroup(member.cast_id, member.character, sceneAnalysis.total);
		}
		setShowRemoveCharModal(false);
		setSelectedCharacters(new Set());
		setCharacterSelectionMode(null);
	};

	return (
		<div className="cln-page-container">
			<div className="cln-main-content">
				<div className="cln-content-area">
					{isLoading ? (
						<div className="cln-loading-container">
							<div className="cln-spinner" />
							<div className="cln-message">Loading cast list…</div>
						</div>
					) : error ? (
						<div className="cln-error-container">
							<div className="cln-error-message">⚠️ {error}</div>
						</div>
					) : !castData || !(Array.isArray(castData.cast_list) && castData.cast_list.length) ? (
						<div className="cln-empty-container">
							<div className="cln-message">No cast members found</div>
						</div>
					) : (
						<>
							{/* Page Header */}
							<div className="cln-page-header">
								<h1 className="cln-title">Total Characters :{castData.total_characters ?? castData.cast_list.length}</h1>

								{/* Header Action Buttons */}
								<div className="cln-header-actions">
									{!characterSelectionMode ? (
										<>
											<button className="cln-btn-primary" onClick={() => setShowAddGroupModal(true)}>
												<PiPlusBold />
												Add Character
											</button>
											<button className="cln-btn-secondary" onClick={enterRemoveMode}>
												<PiMinusCircle />
												Remove
											</button>

											<div className="cln-header-divider-vertical"></div>

											<button className="cln-btn-secondary" onClick={enterMergeMode}>
												<PiArrowsMerge />
												Merge Characters
											</button>
											<button className="cln-btn-secondary" onClick={enterSplitMode}>
												<PiScissors />
												Split Character
											</button>

											{/* Expand/Collapse All Buttons */}
											<div className="cln-header-divider-vertical"></div>
											<button className="cln-btn-secondary" onClick={() => setCollapsedCards(new Set())}>
												<PiArrowsOutCardinal />
												Expand All
											</button>
											<button
												className="cln-btn-secondary"
												onClick={() => {
													const allIndices = new Set(castData.cast_list.map((_, i) => i));
													setCollapsedCards(allIndices);
												}}
											>
												<PiArrowsInCardinal />
												Compress All
											</button>
										</>
									) : characterSelectionMode === "remove" ? (
										<>
											<span className="cln-selection-mode-label">Select a character to remove:</span>
											<button
												className="cln-btn-danger"
												onClick={handleRemoveCharactersClick}
												disabled={selectedCharacters.size !== 1}
											>
												<PiMinusCircle />
												Remove Selected
											</button>
											<button className="cln-btn-cancel" onClick={cancelSelectionMode}>
												<PiX />
												Cancel
											</button>
										</>
									) : characterSelectionMode === "merge" ? (
										<>
											<span className="cln-selection-mode-label">
												Select 2 characters to merge ({selectedCharacters.size}/2 selected):
											</span>
											<button
												className="cln-btn-primary"
												onClick={handleMergeCharactersClick}
												disabled={selectedCharacters.size !== 2}
											>
												<PiArrowsMerge />
												Merge Selected
											</button>
											<button className="cln-btn-cancel" onClick={cancelSelectionMode}>
												<PiX />
												Cancel
											</button>
										</>
									) : characterSelectionMode === "split" ? (
										<>
											<span className="cln-selection-mode-label">
												Select a character to split ({selectedCharacters.size}/1 selected):
											</span>
											<button
												className="cln-btn-primary"
												onClick={handleSplitCharacterClick}
												disabled={selectedCharacters.size !== 1}
											>
												<PiScissors />
												Split Selected
											</button>
											<button className="cln-btn-cancel" onClick={cancelSelectionMode}>
												<PiX />
												Cancel
											</button>
										</>
									) : null}
								</div>

								<div className="cln-header-divider"></div>
							</div>

							{/* Character Cards */}
							<div className="cln-cards-container">
								{castData.cast_list.map((member, idx) => {
									const sceneAnalysis = analyzeScenes(member.scenes || []);
									const locationArray = Array.from(sceneAnalysis.locationGroupIds);
									const isCollapsed = collapsedCards.has(idx);
									const isSelected = selectedCharacters.has(idx);
									const showOptions = expandedOptions.has(idx);
									const showScenes = expandedScenes.has(idx);

									// locationArray already contains unique location IDs from sceneAnalysis

									// Determine lock status text for compressed view
									const hasLockedOption =
										member.locked !== -1 && member.locked !== "-1" && member.locked !== null && member.locked !== undefined;
									const lockStatusText = hasLockedOption ? "Option locked" : "Option not locked";

									return (
										<div key={idx} className={`cln-character-card ${isCollapsed ? "cln-collapsed" : ""}`}>
											{/* Card Header - Compressed View when collapsed */}
											<div className={`cln-card-header ${isCollapsed ? "cln-card-header-compressed" : ""}`}>
												<div className="cln-card-header-left">
													{/* Character Checkbox - Only show when in selection mode */}
													{characterSelectionMode && (
														<div
															className={`cln-character-checkbox ${isSelected ? "" : "cln-unchecked"}`}
															onClick={() => toggleCharacterSelection(idx)}
														>
															{isSelected ? <PiCheckSquareFill /> : <PiSquare />}
														</div>
													)}

													{/* Character Info */}
													<div className={`cln-character-info ${isCollapsed ? "cln-character-info-inline" : ""}`}>
														<span className="cln-cast-id-box">{idx + 1}</span>
														<span className="cln-character-name">{member.character}</span>
														<span className="cln-extra-id">#{member.cast_id}</span>
													</div>

													{/* Collapse Button - only show here when expanded */}
													{!isCollapsed && (
														<button
															className={`cln-collapse-btn ${isCollapsed ? "cln-collapsed" : ""}`}
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
													<div className="cln-compressed-stats">
														<div className="cln-compressed-divider"></div>
														<div className="cln-compressed-stat-item">
															<PiFilmSlateFill className="cln-compressed-icon" />
															<span className="cln-compressed-stat-text">
																<span className="cln-compressed-value">{sceneAnalysis.total}</span>
																<span className="cln-compressed-label"> : Scenes</span>
															</span>
														</div>
														<div className="cln-compressed-divider"></div>
														<div className="cln-compressed-stat-item">
															<PiMapPinFill className="cln-compressed-icon" />
															<span className="cln-compressed-stat-text">
																<span className="cln-compressed-value">{locationArray.length}</span>
																<span className="cln-compressed-label"> : Locations</span>
															</span>
														</div>
														<div className="cln-compressed-divider"></div>
														<div className="cln-compressed-stat-item">
															<PiUserFill className="cln-compressed-icon" />
															<span className="cln-compressed-stat-text cln-compressed-label">
																{lockStatusText}
															</span>
														</div>
														<div className="cln-compressed-divider"></div>
													</div>
												)}

												{/* Collapse/Expand Button - Right side when collapsed */}
												{isCollapsed && (
													<button
														className="cln-collapse-btn cln-collapse-btn-right"
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
													<div className="cln-card-header-actions">
														<button
															className="cln-btn-add-option"
															onClick={() => {
																setSelectedCharacterIndex(idx);
																setShowAddOptionModal(true);
																setOptionForm({
																	actorName: "",
																	media: "",
																	contact: "",
																	availableDates: [],
																	details: "",
																	notes: "",
																});
															}}
														>
															<PiPlusBold />
															Add Option
														</button>

														<button
															className={`cln-btn-remove-option ${isSelectingMode.has(idx) ? "cln-active" : ""}`}
															onClick={() => {
																if (!isSelectingMode.has(idx)) {
																	setIsSelectingMode((prev) => new Set(prev).add(idx));
																} else {
																	const selectedForCharacter = Array.from(selectedOptions)
																		.filter((key) => key.startsWith(`${idx}-`))
																		.map((key) => key.split("-")[1]);

																	if (selectedForCharacter.length === 0) {
																		alert("Please select options to remove");
																		return;
																	}

																	if (
																		window.confirm(
																			`Are you sure you want to remove ${selectedForCharacter.length} selected option(s)?`,
																		)
																	) {
																		selectedForCharacter.forEach((optId) => {
																			removeActorOption(idx, optId);
																		});
																		setSelectedOptions((prev) => {
																			const next = new Set(prev);
																			selectedForCharacter.forEach((optId) => {
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
												<div className="cln-card-body">
													{/* Left Panel */}
													<div className="cln-left-panel">
														{/* Stats Bar */}
														<div className="cln-stats-bar">
															<div className="cln-stat-item">
																<span className="cln-stat-label">Scenes:</span>
																<span className="cln-stat-value">{sceneAnalysis.total}</span>
															</div>
															<div className="cln-stat-item">
																<span className="cln-stat-label">Int:</span>
																<span className="cln-stat-value">{sceneAnalysis.intCount}</span>
															</div>
															<div className="cln-stat-item">
																<span className="cln-stat-label">Ext:</span>
																<span className="cln-stat-value">{sceneAnalysis.extCount}</span>
															</div>
															<div className="cln-stat-item">
																<span className="cln-stat-label">Int/Ext:</span>
																<span className="cln-stat-value">{sceneAnalysis.intExtCount}</span>
															</div>
														</div>

														{/* Sets Group - shows unique set IDs */}
														<div className="cln-locations-section">
															<span className="cln-section-title">Sets </span>
															<div className="cln-location-badges-container">
																<div className="cln-location-badges">
																	{locationArray.length > 0 ? (
																		locationArray.map((locationName, i) => {
																			const locationId = locationMap[locationName] || locationName;
																			return (
																				<div
																					key={i}
																					className="cln-location-badge"
																					title={locationName}
																				>
																					{locationId}
																				</div>
																			);
																		})
																	) : (
																		<span className="cln-empty-badge">No locations</span>
																	)}
																</div>
															</div>
														</div>

														{/* View Buttons */}
														<div className="cln-view-buttons">
															<button
																className={`cln-btn-view ${
																	showOptions ? "cln-btn-view-primary" : "cln-btn-view-outline"
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
																className={`cln-btn-view ${
																	showScenes ? "cln-btn-view-primary" : "cln-btn-view-outline"
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
													<div className="cln-right-panel">
														{/* Table Header Bar - Only show for Options view */}
														{!showScenes && (
															<div className="cln-table-header-bar">
																{isSelectingMode.has(idx) && (
																	<div className="cln-table-header-cell" style={{ width: 50 }}></div>
																)}
																<div className="cln-table-header-cell cln-col-sno">S.No</div>
																<div className="cln-table-header-cell cln-col-actor">Actor Name</div>
																<div className="cln-table-header-cell cln-col-media">Media</div>
																<div className="cln-table-header-cell cln-col-contact">Contact</div>
																<div className="cln-table-header-cell cln-col-details">Details</div>
																<div className="cln-table-header-cell cln-col-notes">Notes</div>
																<div className="cln-table-header-cell cln-col-dates">Dates</div>
																<div className="cln-table-header-cell cln-col-lock">Lock</div>
															</div>
														)}

														{/* Table Content */}
														<div className="cln-table-content">
															{!showScenes ? (
																// Options Table
																member.cast_options && Object.keys(member.cast_options).length > 0 ? (
																	<table className="cln-data-table">
																		<tbody>
																			{Object.entries(member.cast_options).map(([optId, opt], i) => {
																				const key = `${idx}-${optId}`;
																				const locked =
																					member.locked === optId ||
																					member.locked === parseInt(optId) ||
																					String(member.locked) === optId;
																				const hasAnyLocked =
																					member.locked !== -1 &&
																					member.locked !== "-1" &&
																					member.locked !== null &&
																					member.locked !== undefined;
																				const otherLocked = hasAnyLocked && !locked;

																				const ActorName = getOptionField(opt, [
																					"actor_name",
																					"location",
																					"location_name",
																					"name",
																					"Location Name",
																					"place",
																				]);
																				const media = getOptionField(opt, [
																					"media",
																					"media_links",
																					"links",
																					"photos",
																					"mediaLink",
																					"mediaLinks",
																					"actorName",
																				]);
																				const contact = getOptionField(opt, [
																					"contact",
																					"addr",
																					"locationAddress",
																					"location_address",
																					"Address",
																				]);
																				const details = getOptionField(opt, [
																					"details",
																					"gmap_pin",
																					"gmapPin",
																					"gmap_link",
																					"google_map",
																					"google_map_link",
																				]);
																				const notes = getOptionField(opt, ["notes"]);
																				const dates =
																					opt.available_dates || opt.availableDates || [];
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
																						className={locked ? "cln-row-locked" : ""}
																					>
																						{isSelectingMode.has(idx) && (
																							<td style={{ width: 50 }}>
																								<input
																									type="checkbox"
																									className="cln-select-checkbox"
																									checked={selectedOptions.has(key)}
																									onChange={(e) => {
																										setSelectedOptions((prev) => {
																											const next = new Set(
																												prev,
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
																						<td style={{ width: 140 }}>{ActorName}</td>
																						<td style={{ width: 90 }}>{media}</td>
																						<td style={{ width: 110 }}>{contact}</td>
																						<td style={{ width: 100 }}>{details}</td>
																						<td style={{ width: 90 }}>{notes}</td>
																						<td
																							style={{ width: 90 }}
																							title={
																								Array.isArray(dates) && dates.length > 0
																									? `Available dates:\n${dates.join(
																											"\n",
																										)}`
																									: "No dates set"
																							}
																						>
																							{datesDisplay}
																						</td>
																						<td>
																							<button
																								className={`cln-lock-btn ${
																									locked ? "cln-locked" : ""
																								} ${otherLocked ? "cln-disabled" : ""}`}
																								onClick={() =>
																									toggleLockOption(
																										idx,
																										optId,
																										member.cast_id,
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
																	<div className="cln-empty-state">
																		<PiFolderPlus className="cln-empty-icon" />
																		<span className="cln-empty-text">
																			No Data added for this Character
																		</span>
																	</div>
																)
															) : // Scenes Table
															(member.scenes || []).length > 0 ? (
																<table className="cln-data-table">
																	<thead>
																		<tr>
																			<th>Scene No</th>
																			<th>Int./Ext.</th>
																			<th>Location</th>
																			<th>Time</th>
																			<th>Synopsis</th>
																			<th>Characters</th>
																		</tr>
																	</thead>
																	<tbody>
																		{(member.scenes || []).map((s, i) => {
																			const sceneNo = getData(s, "Scene Number");
																			const intExt = getData(s, "Int./Ext.");
																			const location = getData(s, "Location");
																			const time = getData(s, "Time");
																			const synopsis = getData(s, "Synopsis");
																			const characters = sceneChars[s]
																				? sceneChars[s].join(", ")
																				: "N/A";

																			return (
																				<tr key={i}>
																					<td>{sceneNo !== "N/A" ? sceneNo : i + 1}</td>
																					<td>{intExt}</td>
																					<td>{location}</td>
																					<td>{time}</td>
																					<td>{synopsis}</td>
																					<td>{characters}</td>
																				</tr>
																			);
																		})}
																	</tbody>
																</table>
															) : (
																<div className="cln-empty-state">
																	<PiFolderPlus className="cln-empty-icon" />
																	<span className="cln-empty-text">No scenes listed for this Character</span>
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

			{/* Scenes Modal */}
			{showScenesModal && (
				<div className="cln-modal-overlay">
					<div className="cln-modal">
						<h3 className="cln-modal-title">Scenes for {selectedCharacter}</h3>
						<div className="cln-modal-content-scroll">
							{(selectedCharacterScenes || []).length === 0 ? (
								<div className="cln-empty-state">No scenes</div>
							) : (
								selectedCharacterScenes.map((s, i) => {
									const sceneNumber = getData(s, "Scene Number");
									return (
										<div key={i} className="cln-scene-item">
											Scene {sceneNumber !== "N/A" ? sceneNumber : i + 1}
										</div>
									);
								})
							)}
						</div>
						<div className="cln-modal-buttons">
							<button className="cln-cancel-btn" onClick={() => setShowScenesModal(false)}>
								Close
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Add Option Modal */}
			{showAddOptionModal && (
				<AddActorOptionModal
					onClose={() => setShowAddOptionModal(false)}
					onSubmit={(form) => addActorOption(selectedCharacterIndex, form)}
					optionForm={optionForm}
					setOptionForm={setOptionForm}
				/>
			)}

			{/* Add Cast Group Modal */}
			{showAddGroupModal && (
				<div className="cln-modal-overlay" onClick={() => setShowAddGroupModal(false)}>
					<div className="cln-modal" onClick={(e) => e.stopPropagation()}>
						<h3 className="cln-modal-title">Add Character</h3>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								addCastGroup();
							}}
							className="cln-form"
						>
							<div className="cln-form-group">
								<label className="cln-label">Character Name:</label>
								<input
									type="text"
									value={newGroupName}
									onChange={(e) => setNewGroupName(e.target.value.toUpperCase())}
									className="cln-input cln-input-uppercase"
									placeholder="Enter character name (will be uppercase)"
									required
									autoFocus
								/>
								<span className="cln-input-hint">Name will be automatically converted to uppercase</span>
							</div>
							<div className="cln-modal-buttons">
								<button type="submit" className="cln-submit-btn" disabled={!newGroupName.trim()}>
									Add Character
								</button>
								<button
									type="button"
									onClick={() => {
										setShowAddGroupModal(false);
										setNewGroupName("");
									}}
									className="cln-cancel-btn"
								>
									Cancel
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Remove Character Modal */}
			{showRemoveCharModal && selectedCharacters.size === 1 && (
				<div
					className="cln-modal-overlay"
					onClick={() => {
						setShowRemoveCharModal(false);
						setCharacterSelectionMode(null);
						setSelectedCharacters(new Set());
					}}
				>
					<div className="cln-modal cln-modal-remove" onClick={(e) => e.stopPropagation()}>
						<h3 className="cln-modal-title">Remove Character</h3>
						<div className="cln-remove-modal-content">
							<p className="cln-remove-warning-text">
								Are you sure you want to remove the character{" "}
								<strong>"{castData.cast_list[Array.from(selectedCharacters)[0]]?.character}"</strong>?
							</p>
							<p className="cln-remove-info-text">
								This action cannot be undone. All actor options associated with this character will also be deleted.
							</p>
						</div>
						<div className="cln-modal-buttons">
							<button type="button" onClick={handleConfirmRemoveCharacter} className="cln-submit-btn cln-btn-danger">
								Remove Character
							</button>
							<button
								type="button"
								onClick={() => {
									setShowRemoveCharModal(false);
									setCharacterSelectionMode(null);
									setSelectedCharacters(new Set());
								}}
								className="cln-cancel-btn"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Merge Characters Modal */}
			{showMergeModal && selectedCharacters.size === 2 && (
				<div
					className="cln-modal-overlay"
					onClick={() => {
						setShowMergeModal(false);
						setMergedCharacterName("");
						setMergeOptions(false);
					}}
				>
					<div className="cln-modal cln-modal-merge" onClick={(e) => e.stopPropagation()}>
						<h3 className="cln-modal-title">Merge Characters</h3>
						<div className="cln-merge-modal-content">
							<p className="cln-merge-info-text">You are merging the following characters:</p>
							<div className="cln-merge-characters-list">
								{Array.from(selectedCharacters).map((idx) => (
									<div key={idx} className="cln-merge-character-item">
										<span className="cln-merge-character-id">{idx + 1}</span>
										<span className="cln-merge-character-name">{castData.cast_list[idx]?.character}</span>
										<span className="cln-merge-character-scenes">({castData.cast_list[idx]?.scene_count || 0} scenes)</span>
									</div>
								))}
							</div>

							<div className="cln-form-group">
								<label className="cln-label">New Merged Character Name:</label>
								<input
									type="text"
									value={mergedCharacterName}
									onChange={(e) => setMergedCharacterName(e.target.value.toUpperCase())}
									className="cln-input cln-input-uppercase"
									placeholder="Enter name for merged character"
									autoFocus
								/>
							</div>

							<div className="cln-merge-checkbox-group">
								<label className="cln-merge-checkbox-label">
									<input
										type="checkbox"
										checked={mergeOptions}
										onChange={(e) => setMergeOptions(e.target.checked)}
										className="cln-merge-checkbox"
									/>
									<span>Merge actor options from both characters</span>
								</label>
								<p className="cln-merge-checkbox-hint">
									{mergeOptions
										? "Actor options from both characters will be combined. No option will be locked."
										: "No actor options will be kept in the merged character."}
								</p>
							</div>

							<p className="cln-merge-warning-text">
								This action will delete both original characters and update all associated scenes to use the new merged character. Dates
								from both characters will be combined in the schedule.
							</p>
						</div>
						<div className="cln-modal-buttons">
							<button type="button" onClick={performMergeCharacters} className="cln-submit-btn" disabled={!mergedCharacterName.trim()}>
								<PiArrowsMerge />
								Merge Characters
							</button>
							<button
								type="button"
								onClick={() => {
									setShowMergeModal(false);
									setMergedCharacterName("");
									setMergeOptions(false);
								}}
								className="cln-cancel-btn"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Split Character Modal */}
			{showSplitModal && selectedCharacters.size === 1 && (
				<div
					className="cln-modal-overlay"
					onClick={() => {
						setShowSplitModal(false);
						setSplitNewName1("");
						setSplitNewName2("");
						setScenesForChar1(new Set());
						setScenesForChar2(new Set());
						setSplitCharacterScenes([]);
					}}
				>
					<div className="cln-modal cln-modal-split" onClick={(e) => e.stopPropagation()}>
						<h3 className="cln-modal-title">Split Character</h3>
						<div className="cln-split-modal-content">
							<p className="cln-split-info-text">You are splitting the character:</p>
							<div className="cln-split-source-char">
								<span className="cln-split-source-id">{Array.from(selectedCharacters)[0] + 1}</span>
								<span className="cln-split-source-name">{castData.cast_list[Array.from(selectedCharacters)[0]]?.character}</span>
								<span className="cln-split-source-scenes">({splitCharacterScenes.length} scenes)</span>
							</div>

							<div className="cln-split-names-row">
								<div className="cln-form-group cln-split-name-group">
									<label className="cln-label">
										New Character 1 Name: <span className="cln-required">*</span>
									</label>
									<input
										type="text"
										value={splitNewName1}
										onChange={(e) => setSplitNewName1(e.target.value.toUpperCase())}
										className="cln-input cln-input-uppercase"
										placeholder="Enter name for character 1"
										required
									/>
								</div>
								<div className="cln-form-group cln-split-name-group">
									<label className="cln-label">
										New Character 2 Name: <span className="cln-required">*</span>
									</label>
									<input
										type="text"
										value={splitNewName2}
										onChange={(e) => setSplitNewName2(e.target.value.toUpperCase())}
										className="cln-input cln-input-uppercase"
										placeholder="Enter name for character 2"
										required
									/>
								</div>
							</div>

							<div className="cln-split-scenes-section">
								<label className="cln-label">
									Assign Scenes to New Characters: <span className="cln-required">*</span>
								</label>
								<p className="cln-split-scenes-hint">
									A scene can be assigned to one or both characters. Click the checkboxes to assign.
								</p>

								{splitCharacterScenes.length === 0 ? (
									<div className="cln-split-no-scenes">No scenes for this character to split.</div>
								) : (
									<div className="cln-split-scenes-table-container">
										<table className="cln-split-scenes-table">
											<thead>
												<tr>
													<th className="cln-split-scene-col">Scene</th>
													<th className="cln-split-scene-details-col">Int/Ext</th>
													<th className="cln-split-scene-details-col">Location</th>
													<th className="cln-split-assign-col">
														{splitNewName1 || "Char 1"}
														<span className="cln-split-count">({scenesForChar1.size})</span>
													</th>
													<th className="cln-split-assign-col">
														{splitNewName2 || "Char 2"}
														<span className="cln-split-count">({scenesForChar2.size})</span>
													</th>
												</tr>
											</thead>
											<tbody>
												{splitCharacterScenes.map((sceneId, idx) => {
													const sceneIdStr = String(sceneId);
													const isInChar1 = scenesForChar1.has(sceneIdStr);
													const isInChar2 = scenesForChar2.has(sceneIdStr);
													// Get actual scene data using scene ID
													const sceneNumber = getData(sceneId, "Scene Number");
													const intExt = getData(sceneId, "Int./Ext.");
													const location = getData(sceneId, "Location");

													return (
														<tr key={idx} className="cln-split-scene-row">
															<td className="cln-split-scene-number">
																{sceneNumber !== "N/A" ? sceneNumber : sceneId}
															</td>
															<td className="cln-split-scene-detail">{intExt || "-"}</td>
															<td className="cln-split-scene-detail">{location || "-"}</td>
															<td
																className={`cln-split-assign-cell ${isInChar1 ? "cln-split-assigned" : ""}`}
																onClick={() => toggleSceneForSplit(sceneIdStr, 1)}
															>
																{isInChar1 ? <PiCheckSquareFill /> : <PiSquare />}
															</td>
															<td
																className={`cln-split-assign-cell ${isInChar2 ? "cln-split-assigned" : ""}`}
																onClick={() => toggleSceneForSplit(sceneIdStr, 2)}
															>
																{isInChar2 ? <PiCheckSquareFill /> : <PiSquare />}
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								)}

								<div className="cln-split-summary">
									<span className="cln-split-summary-item">
										<strong>{scenesForChar1.size}</strong> scene(s) → {splitNewName1 || "Char 1"}
									</span>
									<span className="cln-split-summary-item">
										<strong>{scenesForChar2.size}</strong> scene(s) → {splitNewName2 || "Char 2"}
									</span>
									<span className="cln-split-summary-item cln-split-unassigned">
										<strong>{splitCharacterScenes.length - new Set([...scenesForChar1, ...scenesForChar2]).size}</strong>{" "}
										unassigned
									</span>
								</div>
							</div>

							<p className="cln-split-warning-text">
								This will delete the original character and create two new characters. Actor options will be duplicated to both new
								characters. In the schedule, the new characters will have empty dates and flexible dates disabled.
							</p>
						</div>
						<div className="cln-modal-buttons">
							<button
								type="button"
								onClick={performSplitCharacter}
								className="cln-submit-btn"
								disabled={!splitNewName1.trim() || !splitNewName2.trim() || (scenesForChar1.size === 0 && scenesForChar2.size === 0)}
							>
								<PiScissors />
								Split Character
							</button>
							<button
								type="button"
								onClick={() => {
									setShowSplitModal(false);
									setSplitNewName1("");
									setSplitNewName2("");
									setScenesForChar1(new Set());
									setScenesForChar2(new Set());
									setSplitCharacterScenes([]);
								}}
								className="cln-cancel-btn"
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

export default CastListNew;
