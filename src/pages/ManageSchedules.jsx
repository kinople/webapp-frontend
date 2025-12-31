import ProjectHeader from "../components/ProjectHeader";
import { useNavigate, useParams } from "react-router-dom";
import { eachDayOfInterval, format } from "date-fns";
import { useState, useEffect, useMemo } from "react";
import { getApiUrl } from "../utils/api";
import { DndContext, closestCenter, useDroppable, PointerSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DOODSchedule from "../components/DOOD";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "../css/ManageSchedules.css";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Loader from "../components/Loader";
import Chatbot from "../components/Chatbot";
import { useSelector } from "react-redux";

function formatPageEights(pageEights) {
	if (!pageEights) return "N/A";
	var whole = pageEights.split("/")[0];
	whole = parseInt(whole);
	if (whole > 8) {
		whole = Math.floor(whole / 8);
		var eighths = whole % 8;
		return `${whole}  ${eighths}/8`;
	}
	return pageEights;
}

const SceneCard = ({ scene, isEditing, scheduleMode, sceneHours, setSceneHours, characterNameToIdMap }) => {
	const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: scene.id, disabled: !isEditing });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		cursor: "grab",
		userSelect: "none",
	};

	return (
		<tr ref={setNodeRef} style={style} className="sched-data-row" {...attributes} {...listeners}>
			<td className="sched-data-cell">{scene.scene_number}</td>

			<td className="sched-data-cell">{scene.int_ext || "N/A"}</td>
			<td className="sched-data-cell sched-location-synopsis-column">
				{scene.location_name} <br /> <br />
				Synopsis: {scene.synopsis || "N/A"}
			</td>

			<td className="sched-data-cell">{formatPageEights(scene.page_eighths) || "N/A"}</td>

			<td className="sched-data-cell">{(scene.character_names || []).map((name) => characterNameToIdMap[name.toUpperCase()] || name).join(", ")}</td>
			<td className="sched-data-cell">
				<input
					type="number"
					className="sched-hours-input"
					placeholder="HH"
					value={sceneHours[scene.scene_number]?.hours ?? ""}
					onChange={(e) => {
						const newSceneHours = { ...sceneHours };
						if (!newSceneHours[scene.scene_number]) {
							newSceneHours[scene.scene_number] = { hours: "", minutes: "" };
						}
						const value = parseInt(e.target.value);
						console.log(value);
						if (value < 0) {
							alert("Cannot have negative values for hours");
							return;
						}
						newSceneHours[scene.scene_number].hours = value;
						setSceneHours(newSceneHours);
					}}
				/>
				<span>
					:
					<br />
				</span>
				<input
					type="number"
					className="sched-hours-input"
					placeholder="MM"
					value={sceneHours[scene.scene_number]?.minutes ?? ""}
					onChange={(e) => {
						const newSceneHours = { ...sceneHours };
						if (!newSceneHours[scene.scene_number]) {
							newSceneHours[scene.scene_number] = { hours: "", minutes: "" };
						}
						const value = parseInt(e.target.value);
						console.log(value);
						if (value < 0 || value > 60) {
							alert("Enter a acceptable value for minutes");
							return;
						}
						newSceneHours[scene.scene_number].minutes = value;
						setSceneHours(newSceneHours);
					}}
				/>
			</td>
		</tr>
	);
};

const ScheduleColumn = ({ day, isEditing, scheduleMode, sceneHours, setSceneHours, setScheduleDays, characterNameToIdMap }) => {
	const { setNodeRef } = useDroppable({
		id: day.id,
	});

	const [drop, setDrop] = useState(true);

	const d = day.date.split("-");

	return (
		<div ref={setNodeRef} className={`sched-day-card ${!drop ? "sched-day-card-collapsed" : ""}`}>
			<div className="sched-day-header">
				<h4>{d[2] + "-" + d[1] + "-" + d[0]}</h4>
				<button
					onClick={() => {
						setDrop(!drop);
					}}
				>
					{drop ? "▲" : "▼"}
				</button>
				{isEditing && (
					<button
						onClick={() => {
							setScheduleDays((prev) => prev.filter((d) => d.id !== day.id));
						}}
						disabled={day.scenes.length > 0}
						className="sched-remove-day-btn"
					>
						Remove
					</button>
				)}
			</div>
			{drop && (
				<SortableContext items={day.scenes.map((s) => s.id)} strategy={verticalListSortingStrategy}>
					<table className="sched-table">
						<thead className="sched-thead">
							<tr className="sched-header-row">
								<th className="sched-header-cell">Scene</th>

								<th className="sched-header-cell">Int./Ext.</th>
								<th className="sched-header-cell sched-location-synopsis-column">Location/Synopsis</th>
								<th className="sched-header-cell">Pgs</th>

								<th className="sched-header-cell">Characters</th>

								<th className="sched-header-cell">Est. Hours</th>
							</tr>
						</thead>
						<tbody>
							{day.scenes.map((scene) => (
								<SceneCard
									key={scene.id}
									scene={scene}
									isEditing={isEditing}
									scheduleMode={scheduleMode}
									sceneHours={sceneHours}
									setSceneHours={setSceneHours}
									characterNameToIdMap={characterNameToIdMap}
								/>
							))}
						</tbody>
					</table>
				</SortableContext>
			)}
		</div>
	);
};

function findContainer(days, id) {
	for (const day of days) {
		if (day.id === id) {
			return day;
		}
		if (day.scenes.find((scene) => scene.id === id)) {
			return day;
		}
	}
	return null;
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

const ManageSchedules = () => {
	const navigate = useNavigate();
	const { user, id, scheduleId } = useParams();
	const [elementType, setElementType] = useState("location");
	const [element, setElement] = useState("");
	const [selectedElement, setSelectedElement] = useState("");
	const [maxScenes, setMaxScenes] = useState("");
	const [scheduleData, setScheduleData] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [selectedDates, setSelectedDates] = useState([]);
	const [originalDates, setOriginalDates] = useState([]);

	const [dateRangeStart, setDateRangeStart] = useState("");
	const [dateRangeEnd, setDateRangeEnd] = useState("");
	const [datePickerMode, setDatePickerMode] = useState("single");
	const [datePickerValue, setDatePickerValue] = useState("single");
	const [scheduleDays, setScheduleDays] = useState([]);
	const [originalScheduleDays, setOriginalScheduleDays] = useState([]);
	const [isEditing, setIsEditing] = useState(false);
	const [scenes, setScenes] = useState([]);
	const [scheduleMode, setScheduleMode] = useState("scenes");
	const [maxHours, setMaxHours] = useState({ hours: "", minutes: "" });
	const [maxPageEights, setMaxPageEights] = useState({ pages: "", eighths: "" });
	const [newScheduleDayInput, setNewScheduleDayInput] = useState("");
	const [sceneHours, setSceneHours] = useState({});
	const [DOODSelected, setDOODselected] = useState(false);
	const [generatedMaxScenes, setGeneratedMaxScenes] = useState("");
	const [scheduleDates, setScheduleDates] = useState({ start: "N/A", end: "N/A" });
	const [HoursSaved, setHoursSaved] = useState(false);

	const [conflicts, setConflicts] = useState([]);
	const [showConflictModal, setShowConflictModal] = useState(false);

	// Cast and Location lists from APIs
	const [castList, setCastList] = useState([]);
	const [locationList, setLocationList] = useState([]);

	// Characters from breakdown data (for dropdown and character mapping)
	const [breakdownCharacters, setBreakdownCharacters] = useState([]);
	const [breakdownScenes, setBreakdownScenes] = useState([]);

	const ConflictsModal = () => {
		if (!showConflictModal) return null;
		console.log("conflicts are : ", conflicts);

		return (
			<div
				className="sched-conflicts-modal-overlay"
				onClick={() => {
					setShowConflictModal(false);
				}}
			>
				<div className="sched-conflicts-modal" onClick={(e) => e.stopPropagation()}>
					<div className="sched-conflicts-modal-header">
						<h2 className="sched-conflicts-modal-heading">Conflicts in the Schedule</h2>
						<button
							className="sched-conflicts-modal-close-button"
							onClick={() => {
								setShowConflictModal(false);
							}}
						>
							×
						</button>
					</div>

					<div className="sched-conflicts-modal-content">
						{conflicts.length > 0 ? (
							<>
								<p className="sched-conflicts-count">
									Found {conflicts.length} scene
									{conflicts.length !== 1 ? "s" : ""} with conflicts
								</p>

								{conflicts.map((sceneConflict, index) => (
									<div key={index} className="sched-conflict-scene-container">
										<div className="sched-conflict-scene-header">
											Scene {sceneConflict.scene_number} scheduled on – {sceneConflict.date}
										</div>

										{sceneConflict.conflicts.map((msg, i) => (
											<div key={i} className="sched-conflict-item">
												{msg}
											</div>
										))}
									</div>
								))}
							</>
						) : (
							<div className="sched-no-conflicts">✓ No conflicts found in the schedule</div>
						)}
					</div>
				</div>
			</div>
		);
	};
	const handleSaveChanges = async () => {
		try {
			const filteredDays = scheduleDays.filter((day) => {
				return day.scenes && day.scenes.length > 0;
			});

			const schedule_by_day = filteredDays.reduce((acc, day) => {
				acc[day.date] = {
					date: day.date,
					scenes: day.scenes.map((scene) => ({
						scene_id: scene.scene_id,
						scene_number: scene.scene_number,
						location_name: scene.location_name,
						character_names: scene.character_names,
						character_ids: scene.character_ids,
					})),
				};
				return acc;
			}, {});
			console.log("schedule_by_day", schedule_by_day);

			const response = await fetch(getApiUrl(`/api/${id}/schedule/${scheduleId}`), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ schedule_by_day }),
			});

			if (!response.ok) {
				const errorData = await response.json();

				throw new Error(errorData.message || "Failed to save schedule");
			} else {
				setScheduleDays(filteredDays);
			}
			fetchScheduleData();
			alert("Schedule saved successfully!");
			setIsEditing(false);
		} catch (error) {
			console.error("Error saving schedule:", error);
			alert("Failed to save schedule: " + error.message);
			setScheduleDays(originalScheduleDays);
		}
	};

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
					// Use master script (oldest/first uploaded) for scheduling
					const masterScript = sortedScripts[sortedScripts.length - 1];

					const breakdownResponse = await fetch(getApiUrl(`/api/fetch-breakdown?script_id=${masterScript.id}`));
					if (!breakdownResponse.ok) {
						if (breakdownResponse.status === 404) {
							return;
						}
						throw new Error("Failed to fetch breakdown");
					}
					const breakdownData = await breakdownResponse.json();
					console.log("breakdownData ------------ ", breakdownData);

					if (breakdownData.tsv_content) {
						const parsedScenes = parseTSV(breakdownData.tsv_content);
						setScenes(parsedScenes);

						console.log("break-down------------- ", parsedScenes);
					}

					// Store breakdown characters (sorted by ID ascending) and scenes
					if (breakdownData.characters) {
						const sortedCharacters = [...breakdownData.characters].sort((a, b) => a.id - b.id);
						setBreakdownCharacters(sortedCharacters);
						console.log("breakdown characters: ", sortedCharacters);
					}

					if (breakdownData.scene_breakdowns) {
						setBreakdownScenes(breakdownData.scene_breakdowns);
						console.log("breakdown scenes: ", breakdownData.scene_breakdowns);
					}

					if (breakdownData.hours) {
						setHoursSaved(true);
						setSceneHours(breakdownData.hours);
					}
				}
			} catch (error) {
				console.error("Error fetching scenes:", error);
			}
		};

		fetchScenes();
	}, [id, scheduleId]);

	// Fetch cast list from API
	useEffect(() => {
		const fetchCastList = async () => {
			try {
				const response = await fetch(getApiUrl(`/api/${id}/cast-list`));
				if (response.ok) {
					const data = await response.json();
					setCastList(data.cast_list || []);
				}
			} catch (error) {
				console.error("Error fetching cast list:", error);
			}
		};
		fetchCastList();
	}, [id]);

	// Fetch location list from API
	useEffect(() => {
		const fetchLocationList = async () => {
			try {
				const response = await fetch(getApiUrl(`/api/${id}/locations`));
				if (response.ok) {
					const data = await response.json();
					setLocationList(data.locations || []);
					console.log("location list ------------ ", data);
				}
			} catch (error) {
				console.error("Error fetching location list:", error);
			}
		};
		fetchLocationList();
	}, [id]);

	const sensors = useSensors(useSensor(PointerSensor));

	const parseHours = (time) => {
		if (!time || (!time.hours && !time.minutes)) return 0;
		const hours = parseInt(time.hours, 10) || 0;
		const minutes = parseInt(time.minutes, 10) || 0;
		return hours + minutes / 60;
	};

	const formatHours = (totalHours) => {
		if (totalHours === null || totalHours === undefined) return { hours: "", minutes: "" };
		const h = Math.floor(totalHours);
		const m = Math.round((totalHours - h) * 60);
		return { hours: h.toString(), minutes: m.toString().padStart(2, "0") };
	};
	const fetchScheduleData = async () => {
		try {
			setIsLoading(true);
			const response = await fetch(getApiUrl(`/api/${id}/schedule/${scheduleId}`));
			if (!response.ok) {
				throw new Error("Failed to fetch schedule data");
			}
			const data = await response.json();
			console.log("schedule-data ------------ ", data);
			setScheduleData(data);
			setGeneratedMaxScenes(data["generated_schedule"]["max_scenes_per_day"] || "N/A");
		} catch (error) {
			console.error("Error fetching schedule data:", error);
			setError(error.message);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchScheduleData();
	}, [id, scheduleId]);

	// Create character name to ID map from breakdown characters
	const characterNameToIdMap = useMemo(() => {
		const map = {};
		breakdownCharacters.forEach((char) => {
			if (char.id && char.name) {
				map[char.name.toUpperCase()] = char.id;
			}
		});
		return map;
	}, [breakdownCharacters]);

	// Get locked option info for the selected location
	const selectedLocationLockedInfo = useMemo(() => {
		if (elementType !== "location" || !element) return null;

		const selectedLocation = locationList.find((loc) => loc.location === element);
		if (!selectedLocation) return null;

		const lockedOptionId = selectedLocation.locked;
		// Check if there's a locked option (locked is not -1 or "-1" or null)
		if (lockedOptionId === -1 || lockedOptionId === "-1" || lockedOptionId === null || lockedOptionId === undefined) {
			return null;
		}

		const locationOptions = selectedLocation.location_options || {};
		const lockedOption = locationOptions[String(lockedOptionId)];

		if (!lockedOption) return null;

		return {
			optionId: lockedOptionId,
			optionName: lockedOption.locationName || lockedOption.location_name || "Unknown",
			address: lockedOption.address || "",
			availableDates: lockedOption.available_dates || lockedOption.availableDates || [],
		};
	}, [elementType, element, locationList]);

	useEffect(() => {
		if (scheduleData && scheduleData.schedule && scheduleData.schedule.schedule_by_day) {
			// Build character name to ID mapping from castList API data (fallback)
			const charNameToId = {};
			castList.forEach((cast) => {
				if (cast.character && cast.cast_id) {
					charNameToId[cast.character] = cast.cast_id;
				}
			});

			if (scenes.length > 0) {
				let id = 0;
				const days = Object.values(scheduleData.schedule.schedule_by_day).map((day) => ({
					id: String(day.date),
					date: day.date,
					scenes: day.scenes
						.map((scheduledScene, index) => {
							// Find breakdown scene by matching the 'id' field
							const breakdownScene = breakdownScenes.find(
								(bs) => bs.id === scheduledScene.scene_id || bs.id === parseInt(scheduledScene.scene_id)
							);

							const newScene = {};

							if (breakdownScene) {
								newScene.id = id++;
								newScene.scene_id = scheduledScene.scene_id;
								newScene.scene_number = scheduledScene.scene_number || breakdownScene.scene_number;
								newScene.int_ext = breakdownScene.int_ext;
								newScene.time_of_day = breakdownScene.time_of_day;
								newScene.page_eighths = breakdownScene.page_eighths;
								newScene.synopsis = breakdownScene.synopsis;

								newScene.location_name = breakdownScene.location;

								newScene.character_names = breakdownScene.characters || [];

								// Use character_ids from breakdown data if available, otherwise map from names
								if (breakdownScene.characters_ids) {
									newScene.character_ids = breakdownScene.characters_ids;
								} else {
									newScene.character_ids = newScene.character_names.map((name) => charNameToId[name] || null);
								}
							} else {
								// Fallback to TSV scenes data if breakdown scene not found
								const fullScene = scenes.find((s) => (s["Scene Number"] || s["Scene No."]) === String(scheduledScene.scene_number));
								if (fullScene) {
									newScene.id = id++;
									newScene.scene_id = scheduledScene.scene_id;
									newScene.scene_number = scheduledScene.scene_number || fullScene["Scene Number"];
									newScene.int_ext = fullScene["Int./Ext."];
									newScene.time_of_day = fullScene["Time of Day"] || fullScene["Time"];
									newScene.page_eighths = fullScene["Page Eighths"] || fullScene["Pgs"];
									newScene.synopsis = fullScene["Synopsis"];

									newScene.location_name = fullScene["Location"];

									newScene.character_names = fullScene["Characters"] ? fullScene["Characters"].split(",").map((c) => c.trim()) : [];
									newScene.character_ids = newScene.character_names.map((name) => charNameToId[name] || null);
								} else {
									// Scene not found in breakdown data - it may have been deleted
									// Return null to filter it out
									console.log(
										`Scene ${scheduledScene.scene_number} (id: ${scheduledScene.scene_id}) not found in breakdown - may have been deleted`
									);
									return null;
								}
							}

							return newScene;
						})
						.filter((scene) => scene !== null && scene.scene_number), // Filter out deleted/missing scenes
				}));
				console.log("days -- ", days);
				const dates = days.map((item) => new Date(item.date));
				const startDate = new Date(Math.min(...dates));
				const endDate = new Date(Math.max(...dates));
				const formatDate = (d) =>
					d.toLocaleDateString("en-US", {
						year: "numeric",
						month: "long",
						day: "numeric",
					});

				setScheduleDates({ start: formatDate(startDate), end: formatDate(endDate) });
				setScheduleDays(days);
			} else {
				const days = Object.values(scheduleData.schedule.schedule_by_day).map((day) => ({
					id: String(day.date),
					date: day.date,
					scenes: day.scenes.map((scene, index) => ({
						...scene,
						id: scene.scene_id ? String(scene.scene_id) : `${day.date}-${index}-${scene.scene_number}`,
					})),
				}));
				setScheduleDays(days);
			}
		}
	}, [scheduleData, scenes, castList, breakdownScenes]);

	const handleDragEnd = (event) => {
		const { active, over } = event;

		if (!over) {
			return;
		}

		const activeId = active.id;
		const overId = over.id;

		if (activeId === overId) {
			return;
		}

		setScheduleDays((days) => {
			const activeContainer = findContainer(days, activeId);
			const overContainer = findContainer(days, overId);

			if (!activeContainer || !overContainer) {
				return days;
			}

			if (activeContainer.id === overContainer.id) {
				const activeIndex = activeContainer.scenes.findIndex((s) => s.id === activeId);
				const overIndex = overContainer.scenes.findIndex((s) => s.id === overId);
				if (activeIndex !== -1 && overIndex !== -1) {
					const newScenes = arrayMove(activeContainer.scenes, activeIndex, overIndex);
					const newDays = days.map((day) => {
						if (day.id === activeContainer.id) {
							return { ...day, scenes: newScenes };
						}
						return day;
					});
					return newDays;
				}
			} else {
				const activeDayIndex = days.findIndex((d) => d.id === activeContainer.id);
				const overDayIndex = days.findIndex((d) => d.id === overContainer.id);

				const activeSceneIndex = activeContainer.scenes.findIndex((s) => s.id === activeId);

				const newDays = [...days];
				const [movedScene] = newDays[activeDayIndex].scenes.splice(activeSceneIndex, 1);

				let overSceneIndex = overContainer.scenes.findIndex((s) => s.id === overId);
				if (overSceneIndex === -1) {
					overSceneIndex = newDays[overDayIndex].scenes.length;
				}

				newDays[overDayIndex].scenes.splice(overSceneIndex, 0, movedScene);

				return newDays;
			}
			return days;
		});
	};

	const parseDateRanges = (dateArray) => {
		const dates = [];
		dateArray.forEach((dateItem) => {
			if (dateItem.includes("-") && dateItem.split("-").length > 3) {
				const parts = dateItem.split("-");
				const startDate = `${parts[0]}-${parts[1]}-${parts[2]}`;
				const endDate = `${parts[3]}-${parts[4]}-${parts[5]}`;

				const current = new Date(startDate);
				const end = new Date(endDate);

				while (current <= end) {
					dates.push(current.toISOString().split("T")[0]);
					current.setDate(current.getDate() + 1);
				}
			} else {
				dates.push(dateItem);
			}
		});
		return dates;
	};

	const getExistingDates = () => {
		if (!selectedElement || !scheduleData?.dates) return [];

		const [type, name] = selectedElement.split("::");
		const datesSection = type === "location" ? "locations" : "characters";
		const elementData = scheduleData.dates[datesSection]?.[name];

		if (elementData?.dates) {
			return parseDateRanges(elementData.dates);
		}

		return [];
	};

	const hasChanges = () => {
		if (selectedDates.length !== originalDates.length) return true;

		const sortedSelected = [...selectedDates].sort();
		const sortedOriginal = [...originalDates].sort();

		return !sortedSelected.every((date, index) => date === sortedOriginal[index]);
	};

	const handleElementChange = (value) => {
		console.log("Element Changed:", value);
		setSelectedElement(value);
		setDateRangeStart("");
		setDateRangeEnd("");

		if (value && scheduleData?.dates) {
			const [type, name] = value.split("::");
			const datesSection = type === "location" ? "locations" : "characters";
			const elementData = scheduleData.dates[datesSection]?.[name];
			console.log("Element Data:", elementData);

			if (elementData?.dates) {
				console.log("Found dates for:", name, elementData.dates);
				const existingDates = parseDateRanges(elementData.dates);
				setSelectedDates(existingDates);
				setOriginalDates(existingDates);
			} else {
				setSelectedDates([]);
				setOriginalDates([]);
			}
		} else {
			setSelectedDates([]);
			setOriginalDates([]);
		}
	};

	useEffect(() => {
		if (elementType && element) {
			setSelectedElement(`${elementType}::${element}`);
		} else {
			setSelectedElement("");
		}
	}, [elementType, element]);

	useEffect(() => {
		if (selectedElement && scheduleData?.dates) {
			const existingDates = getExistingDates();
			setSelectedDates(existingDates);
			setOriginalDates(existingDates);
		}
	}, [scheduleData, selectedElement]);

	useEffect(() => {
		const detectConflicts = () => {
			const sceneConflicts = {};
			const scheduleByDay = scheduleData?.schedule?.schedule_by_day || {};
			const characterDates = scheduleData?.dates?.characters || {};
			const locationDates = scheduleData?.dates?.locations || {};

			Object.entries(scheduleByDay).forEach(([date, dayData]) => {
				const scenes = dayData.scenes || [];

				scenes.forEach((scene) => {
					const { scene_id, scene_number } = scene;
					const conflictList = [];

					// Find breakdown scene by matching the 'id' field
					const breakdownScene = breakdownScenes.find((bs) => bs.id === scene_id || bs.id === parseInt(scene_id));

					// Skip if scene doesn't exist in breakdown (may have been deleted)
					if (!breakdownScene) {
						// console.log(
						// 	`Scene ${scene_number} (id: ${scene_id}) not found in breakdown for conflict detection - may have been deleted`,
						// 	breakdownScene
						// );
						return; // Skip this scene
					}

					const character_names = breakdownScene?.characters || scene.character_names || [];
					const character_ids = breakdownScene?.characters_ids || scene.character_ids || [];
					const location_name = breakdownScene?.location || scene.location_name;

					character_ids?.forEach((charId, index) => {
						const charName = character_names?.[index];
						const charData = characterDates[charName];

						if (charData && charData.dates.length > 0) {
							if (!charData.dates.includes(dayData.date)) {
								conflictList.push(`Character "${charName}" is not available on ${dayData.date}`);
							}
						}
					});

					const locationData = locationDates[location_name];
					if (locationData && locationData.dates.length > 0) {
						if (!locationData.dates.includes(dayData.date)) {
							conflictList.push(`Location "${location_name}" is not available on ${dayData.date}`);
						}
					}

					if (conflictList.length > 0) {
						if (!sceneConflicts[scene_id]) {
							sceneConflicts[scene_id] = {
								scene_number,
								date: dayData.date,
								conflicts: [],
							};
						}
						sceneConflicts[scene_id].conflicts.push(...conflictList);
					}
				});
			});

			const newConflicts = Object.entries(sceneConflicts).map(([scene_id, { scene_number, date, conflicts }]) => ({
				scene_id,
				scene_number,
				date,
				conflicts,
			}));

			setConflicts(newConflicts);
		};

		if (scheduleData) {
			detectConflicts();
			console.log("conflicts----------", conflicts);
		}
	}, [scheduleData, breakdownScenes]);

	const getElementOptions = (type) => {
		const options = [];

		if (type === "location" && locationList.length > 0) {
			locationList.forEach((loc) => {
				options.push({
					value: loc.location,
					label: `📍 ${loc.location}`,
					location_id: loc.location_id,
				});
			});
		} else if (type === "character") {
			// Use breakdownCharacters (already sorted by ID ascending) if available
			if (breakdownCharacters.length > 0) {
				breakdownCharacters.forEach((char) => {
					options.push({
						value: char.name,
						label: `👤 ${char.name}`,
						character_id: char.id,
					});
				});
			} else if (castList.length > 0) {
				// Fallback to castList if breakdownCharacters not available
				castList.forEach((cast) => {
					options.push({
						value: cast.character,
						label: `👤 ${cast.character}`,
						cast_id: cast.cast_id,
					});
				});
			}
		}

		return options;
	};

	const getSelectedElementName = () => {
		if (!selectedElement) return "Select Element";

		const options = getElementOptions(elementType);
		const selected = options.find((opt) => opt.value === element);
		return selected ? selected.label : "Select Element";
	};

	const handleGenerateSchedule = async () => {
		let payload = {};
		let alertMessage = "";

		if (scheduleMode === "scenes") {
			if (!maxScenes || isNaN(maxScenes) || maxScenes <= 0) {
				alertMessage = "Please enter a valid number of scenes per day";
			} else {
				payload = { max_scenes_per_day: parseInt(maxScenes) };
			}
		} else if (scheduleMode === "page-eights") {
			const pages = parseInt(maxPageEights.pages, 10) || 0;
			const eighths = parseInt(maxPageEights.eighths, 10) || 0;
			const totalEighths = pages * 8 + eighths;
			if (totalEighths <= 0) {
				alertMessage = "Please enter a valid number of page-eights per day";
			} else {
				payload = { max_page_eighths_per_day: totalEighths };
			}
		} else if (scheduleMode === "hours") {
			const parsedHours = parseHours(maxHours);
			if (!HoursSaved) {
				alertMessage = "Please save Hours for each scene before generating schedule";
			}
			if (parsedHours <= 0) {
				alertMessage = "Please enter a valid number of hours per day";
			} else {
				payload = { max_hours_per_day: parsedHours };
			}
		}

		if (alertMessage) {
			alert(alertMessage);
			return;
		}

		try {
			setIsGenerating(true);
			const response = await fetch(getApiUrl(`/api/${id}/generate-schedule/${scheduleId}`), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			const result = await response.json();
			if (!response.ok) {
				throw new Error(`${result.message} \n Try changing constraints`);
			}
			console.log("Schedule generated successfully:", result);

			setTimeout(async () => {
				try {
					const refreshResponse = await fetch(getApiUrl(`/api/${id}/schedule/${scheduleId}`));
					if (refreshResponse.ok) {
						const refreshedData = await refreshResponse.json();
						setScheduleData(refreshedData);
						setGeneratedMaxScenes(refreshedData["generated_schedule"]["max_scenes_per_day"] || "N/A");

						alert("Schedule generated successfully!");
					} else {
						throw new Error("Failed to refresh schedule data");
					}
				} catch (refreshError) {
					console.error("Error refreshing schedule:", refreshError);
				}
			}, 1000);
		} catch (error) {
			console.error("Error generating schedule:", error);
			alert("Failed to generate schedule  - " + error.message);
		} finally {
			setIsGenerating(false);
		}
	};

	const handleSingleDateChange = (e) => {
		const selectedDate = e.target.value;
		if (selectedDate) {
			setSelectedDates((prev) => {
				if (prev.includes(selectedDate)) {
					return prev;
				} else {
					return [...prev, selectedDate].sort();
				}
			});
		}
	};

	const handleRangeStartChange = (e) => {
		setDateRangeStart(e.target.value);
	};

	const handleRangeEndChange = (e) => {
		setDateRangeEnd(e.target.value);
	};

	const addDateRange = async (t = "range") => {
		let start = dateRangeStart;
		let end = dateRangeEnd;

		if (!start || !end) {
			alert("Please select both start and end dates for the range");
			return;
		}

		if (start > end) {
			alert("Start date must be before end date");
			return;
		}

		const rangeDates = [];
		const currentDate = new Date(start);
		const endDate = new Date(end);

		while (currentDate <= endDate) {
			rangeDates.push(currentDate.toISOString().split("T")[0]);
			currentDate.setDate(currentDate.getDate() + 1);
		}

		await setSelectedDates(rangeDates);

		setDateRangeStart("");
		setDateRangeEnd("");
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

	const generateCalendarDays = () => {
		if (!scheduleData?.first_date || !scheduleData?.last_date) return [];

		const startDate = new Date(scheduleData.first_date);
		const endDate = new Date(scheduleData.last_date);

		const days = [];
		const currentDate = new Date(startDate);

		while (currentDate <= endDate) {
			days.push(new Date(currentDate));
			currentDate.setDate(currentDate.getDate() + 1);
		}

		return days;
	};

	const isDateInRange = (date) => {
		const dateStr = date.toISOString().split("T")[0];
		if (!selectedDates.includes(dateStr)) return false;

		const sortedDates = [...selectedDates].sort();
		const dateIndex = sortedDates.indexOf(dateStr);

		const hasConsecutiveBefore = dateIndex > 0 && new Date(sortedDates[dateIndex - 1]).getTime() === date.getTime() - 24 * 60 * 60 * 1000;
		const hasConsecutiveAfter =
			dateIndex < sortedDates.length - 1 && new Date(sortedDates[dateIndex + 1]).getTime() === date.getTime() + 24 * 60 * 60 * 1000;

		return hasConsecutiveBefore || hasConsecutiveAfter;
	};

	const getCalendarMonthYear = () => {
		if (!scheduleData?.first_date || !scheduleData?.last_date) return "";

		const startDate = new Date(scheduleData.first_date);
		const endDate = new Date(scheduleData.last_date);

		const startMonth = startDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
		const endMonth = endDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

		return startMonth === endMonth ? startMonth : `${startMonth} - ${endMonth}`;
	};

	const handleCalendarDateClick = (date) => {
		const dateStr = date.toLocaleDateString("en-CA").split("T")[0];

		console.log("clicked on ", dateStr);

		setSelectedDates((prev) => {
			if (prev.includes(dateStr)) {
				console.log("removed");
				return prev.filter((d) => d !== dateStr);
			} else {
				console.log("added");
				return [...prev, dateStr].sort();
			}
		});
	};

	const saveDates = async (f = "") => {
		if (!selectedElement) {
			alert("Please select an element");
			return;
		}

		try {
			setIsSaving(true);
			const [type, name] = selectedElement.split("::");
			const datesSection = type === "location" ? "locations" : "characters";

			console.log("Schedule Data:", scheduleData);
			console.log("Selected Type:", type);
			console.log("Selected Name:", name);
			console.log("Dates Section:", scheduleData.dates?.[datesSection]);
			if (!name) {
				alert("select an element to save dates");
				return;
			}
			const elementData = scheduleData.dates?.[datesSection]?.[name];
			console.log("Element Data:", elementData);

			if (!elementData || !elementData.id) {
				throw new Error(`Could not find data for ${type} "${name}"`);
			}

			const elementId = elementData.id;
			console.log("Element ID:", elementId);
			console.log("selected dates  --------------", selectedDates);

			const response = await fetch(getApiUrl(`/api/${id}/schedule/${scheduleId}/dates`), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					element_type: type,
					element_name: name,
					element_id: elementId,
					flexible: f === "Flexible",
					dates: f === "Flexible" ? [] : selectedDates,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to save dates");
			}

			const result = await response.json();
			console.log("Dates saved successfully:", result);
			alert("Dates saved successfully!");
			fetchScheduleData();
		} catch (error) {
			console.error("Error saving dates:", error);
			alert("Failed to save dates: " + error.message);
		} finally {
			setIsSaving(false);
			console.log("lastly -- ----------------", selectedDates);
		}
	};

	const getScheduledDates = () => {
		if (!selectedElement || !scheduleData?.schedule?.schedule_by_day) return [];

		const [type, name] = selectedElement.split("::");
		const scheduledDates = [];
		const scheduleByDay = scheduleData.schedule.schedule_by_day;

		if (scheduleByDay) {
			Object.values(scheduleByDay).forEach((dayData) => {
				const dayDate = dayData.date;
				const scenes = dayData.scenes || [];

				for (const scheduledScene of scenes) {
					// Find breakdown scene by matching the 'id' field
					const breakdownScene = breakdownScenes.find((bs) => bs.id === scheduledScene.scene_id || bs.id === parseInt(scheduledScene.scene_id));

					// Skip if scene doesn't exist in breakdown (may have been deleted)
					if (!breakdownScene) {
						console.warn(
							`Scene ${scheduledScene.scene_number} (id: ${scheduledScene.scene_id}) not found for scheduled dates - may have been deleted`
						);
						continue;
					}

					if (type === "character") {
						// Check if the character is in this breakdown scene's characters array
						const hasCharacter = breakdownScene.characters?.some((charName) => charName.toUpperCase() === name.toUpperCase());
						if (hasCharacter && !scheduledDates.includes(dayDate)) {
							scheduledDates.push(dayDate);
						}
					} else if (type === "location") {
						// Check if the location matches this breakdown scene's location
						if (breakdownScene.location?.toUpperCase() === name.toUpperCase()) {
							if (!scheduledDates.includes(dayDate)) {
								scheduledDates.push(dayDate);
							}
						}
					}
				}
			});
		}

		return scheduledDates.sort();
	};

	const generateScheduledCalendar = () => {
		const scheduledDates = getScheduledDates();

		const tileClassNameforScheduledDates = ({ date, view }) => {
			if (view === "month") {
				const formattedDate = date.toLocaleDateString("en-CA").split("T")[0];
				const scheduledDates = getScheduledDates();

				if (scheduledDates.includes(formattedDate)) {
					return "highlight-green";
				}
			}
		};
		return (
			<div className="sched-scheduled-calendar-container">
				<Calendar tileDisabled={() => true} tileClassName={tileClassNameforScheduledDates} />
			</div>
		);
	};

	const handleAddScheduleDay = () => {
		if (!newScheduleDayInput) {
			alert("Please select a date to add.");
			return;
		}

		const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
		if (!dateRegex.test(newScheduleDayInput)) {
			alert("Invalid date format. Please use yyyy-mm-dd.");
			return;
		}

		const parts = newScheduleDayInput.split("-");
		const year = parseInt(parts[0], 10);
		const month = parseInt(parts[1], 10);
		const day = parseInt(parts[2], 10);

		const dateObj = new Date(year, month - 1, day);

		if (dateObj.getFullYear() !== year || dateObj.getMonth() + 1 !== month || dateObj.getDate() !== day) {
			alert("Invalid date. Please enter a real date.");
			return;
		}

		const yyyyMMdd = newScheduleDayInput;

		setScheduleDays((prevDays) => {
			if (prevDays.some((d) => d.date === yyyyMMdd)) {
				alert("This date already exists in the schedule.");
				return prevDays;
			}
			return [...prevDays, { id: yyyyMMdd, date: yyyyMMdd, scenes: [] }].sort((a, b) => new Date(a.date) - new Date(b.date));
		});
		setNewScheduleDayInput("");
	};

	const handleSaveHours = async () => {
		for (let day of scheduleDays) {
			for (let scene of day.scenes) {
				if (!(scene.scene_number in sceneHours)) {
					alert(`Enter estimated Hours and minutes for scene ${scene.scene_number} before saving `);
					return;
				}
			}
		}

		try {
			const scriptsResponse = await fetch(getApiUrl(`/api/${id}/script-list`));
			if (!scriptsResponse.ok) {
				throw new Error("Failed to fetch script list");
			}
			const scripts = await scriptsResponse.json();
			const sortedScripts = (scripts || []).sort((a, b) => (b.version || 0) - (a.version || 0));

			if (sortedScripts.length > 0) {
				// Use master script (oldest/first uploaded) for scheduling
				const masterScript = sortedScripts[sortedScripts.length - 1];

				const SaveResponse = await fetch(getApiUrl(`/api/save-hours?script_id=${masterScript.id}`), {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						sceneHours,
					}),
				});
				if (!SaveResponse.ok) {
					throw new Error("Failed to save hours");
				}
				alert("Est. hours saved successlfully");
			}
		} catch (error) {
			alert("Error while saving hours ", error);
		}
	};

	const tileClassName = ({ date, view }) => {
		if (view === "month") {
			const formattedDate = date.toLocaleDateString("en-CA").split("T")[0];

			if (selectedDates.includes(formattedDate)) {
				return "highlight-blue";
			}
		}
	};
	const projectName = useSelector((state) => state.project.projectName);

	return (
		<div className="sched-page-container">
			{isGenerating && (
				<div className="sched-modal-overlay">
					<div className="sched-modal">
						<div className="sched-spinner"></div>
						<p className="sched-loading-text">Generating Schedule...</p>
					</div>
				</div>
			)}

			<div className="sched-header">
				<div className="sched-header-left">
					<h2 className="sched-page-title">Project : {projectName}</h2>
				</div>
				<div className="sched-header-right">
					<div className="sched-date-info">
						<div>Schedule Start Date: {scheduleDates.start || "Not set"}</div>
						<div>Schedule End Date: {scheduleDates.end || "Not set"}</div>
					</div>
				</div>
			</div>
			<div className="sched-content">
				<div className="sched-left-panel">
					<div className="sched-left-panel-header">Availability dates</div>
					<div className="sched-element-selector">
						<div className="sched-selector-header">
							<select
								value={elementType}
								onChange={(e) => {
									if (
										datePickerMode === "flexible" &&
										scheduleData["dates"][elementType === "location" ? "locations" : "characters"][element] &&
										!scheduleData["dates"][elementType === "location" ? "locations" : "characters"][element]["flexible"]
									) {
										alert(` You have not saved flexible dates for ${element}`);
									}
									setElementType(e.target.value);
								}}
								className="sched-element-dropdown"
							>
								<option value="location">Location Groups</option>
								<option value="character">Characters</option>
							</select>
						</div>
						<div className="sched-selector-header sched-selector-header-margin">
							<span>&lt;</span>
							<select
								value={element}
								onChange={(e) => {
									if (
										datePickerMode === "flexible" &&
										scheduleData["dates"][elementType === "location" ? "locations" : "characters"][element] &&
										!scheduleData["dates"][elementType === "location" ? "locations" : "characters"][element]["flexible"]
									) {
										alert(` You have not saved flexible dates for ${element}`);
									}
									setElement(e.target.value);
									console.log(scheduleData);
								}}
								className="sched-element-dropdown"
							>
								<option value="">Select Element</option>
								{getElementOptions(elementType).map((option, index) => (
									<option key={index} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
							<span>&gt;</span>
						</div>
					</div>

					{/* Locked Option Info Display */}
					{elementType === "location" && element && (
						<div className="sched-locked-option-info">
							{selectedLocationLockedInfo ? (
								<div className="sched-locked-option-card">
									<div className="sched-locked-option-header">
										<span className="sched-locked-icon">🔒</span>
										<span className="sched-locked-label">Locked Option:</span>
									</div>
									<div className="sched-locked-option-details">
										<div className="sched-locked-option-name">{selectedLocationLockedInfo.optionName}</div>
										{selectedLocationLockedInfo.address && (
											<div className="sched-locked-option-address">📍 {selectedLocationLockedInfo.address}</div>
										)}
										{selectedLocationLockedInfo.availableDates.length > 0 && (
											<div className="sched-locked-option-dates">
												<span className="sched-locked-dates-label">Available Dates: </span>
												<span className="sched-locked-dates-count">
													{selectedLocationLockedInfo.availableDates.length} date(s)
												</span>
											</div>
										)}
									</div>
									<div className="sched-locked-sync-note">
										<small>📌 Changes to dates here will sync to the locked option</small>
									</div>
								</div>
							) : (
								<div className="sched-no-locked-option">
									<span className="sched-unlocked-icon">🔓</span>
									<span>No option locked for this location</span>
								</div>
							)}
						</div>
					)}

					<div className="sched-given-dates">
						<div className="sched-section-title">Given Dates</div>

						<div className="sched-mode-selector">
							<label className="sched-mode-label">
								<input
									type="radio"
									value="flexible"
									checked={datePickerMode === "flexible"}
									onChange={(e) => {
										setDatePickerMode(e.target.value);
									}}
									className="sched-radio-input"
								/>
								Flexible Dates
							</label>
							<label className="sched-mode-label">
								<input
									type="radio"
									value="fixed"
									checked={datePickerMode === "fixed"}
									onChange={(e) => {
										setDatePickerMode(e.target.value);
									}}
									className="sched-radio-input"
								/>
								Fixed Dates
							</label>
						</div>
						{selectedElement &&
							scheduleData["dates"][elementType === "location" ? "locations" : "characters"][element] &&
							scheduleData["dates"][elementType === "location" ? "locations" : "characters"][element]["flexible"] && (
								<div className="sched-existing-dates-info">
									<span> ✅ Flexible dates saved for {element}</span>
								</div>
							)}
						{selectedElement ? (
							<div className="sched-date-picker-container">
								{scheduleData["dates"][elementType === "location" ? "locations" : "characters"][element] &&
									selectedDates.length === 0 &&
									!isSaving &&
									!scheduleData["dates"][elementType === "location" ? "locations" : "characters"][element]["flexible"] &&
									datePickerMode !== "flexible" && (
										<div className="sched-existing-dates-info">
											<span className="sched-existing-dates-label">{`No dates selected for ${getSelectedElementName()}`}</span>
										</div>
									)}

								{datePickerMode === "flexible" &&
									!(
										scheduleData["dates"][elementType === "location" ? "locations" : "characters"][element] &&
										scheduleData["dates"][elementType === "location" ? "locations" : "characters"][element]["flexible"]
									) && (
										<>
											<button
												onClick={() => {
													saveDates("Flexible");
												}}
												className="sched-add-range-button"
												disabled={!selectedElement}
											>
												Save Flexible dates
											</button>
										</>
									)}

								{datePickerMode === "fixed" && datePickerValue === "single" && (
									<input type="date" onChange={handleSingleDateChange} className="sched-date-picker" />
								)}

								{datePickerValue === "range" && datePickerMode === "fixed" && (
									<div className="sched-date-range-container">
										<div className="sched-date-range-inputs">
											<input
												type="date"
												value={dateRangeStart}
												onChange={handleRangeStartChange}
												className="sched-date-range-input"
												placeholder="Start Date"
											/>
											<span className="sched-date-range-separator">to</span>
											<input
												type="date"
												value={dateRangeEnd}
												min={dateRangeStart}
												onChange={handleRangeEndChange}
												className="sched-date-range-input"
												placeholder="End Date"
											/>
										</div>
										<button onClick={addDateRange} className="sched-add-range-button" disabled={!dateRangeStart || !dateRangeEnd}>
											Add Range
										</button>
									</div>
								)}

								{datePickerMode === "fixed" && (
									<div className="sched-mode-selector">
										<label className="sched-mode-label">
											<input
												type="radio"
												value="range"
												checked={datePickerValue === "range"}
												onChange={(e) => setDatePickerValue(e.target.value)}
												className="sched-radio-input"
											/>
											Range
										</label>
										<label className="sched-mode-label">
											<input
												type="radio"
												value="single"
												checked={datePickerValue === "single"}
												onChange={(e) => setDatePickerValue(e.target.value)}
												className="sched-radio-input"
											/>
											Single
										</label>
									</div>
								)}

								{(selectedDates.length > 0 || hasChanges()) && (
									<div className="sched-selected-dates-list">
										<div className="sched-selected-dates-header">
											<span>Selected Dates ({selectedDates.length}):</span>
											<div className="sched-date-actions">
												{hasChanges() && (
													<button
														onClick={saveDates}
														className="sched-save-dates-button"
														title="Save dates"
														disabled={isSaving}
													>
														{isSaving ? "Saving..." : "Save Dates"}
													</button>
												)}
												{selectedDates.length > 0 && (
													<button onClick={clearAllDates} className="sched-clear-all-button" title="Clear all dates">
														Clear All
													</button>
												)}
											</div>
										</div>
										{scheduleData?.first_date && scheduleData?.last_date && selectedDates.length > 0 && (
											<div className="sched-calendar-container">
												<Calendar
													selectRange={false}
													activeStartDate={null}
													onClickDay={handleCalendarDateClick}
													tileClassName={tileClassName}
												/>
											</div>
										)}
									</div>
								)}
							</div>
						) : (
							<div className="sched-calendar-placeholder">Select an element to choose dates</div>
						)}
					</div>

					<div className="sched-scheduled-dates">
						<div className="sched-section-title">Scheduled Dates</div>
						{selectedElement && scheduleData?.schedule ? (
							generateScheduledCalendar() || (
								<div className="sched-dates-placeholder">No scheduled dates for {getSelectedElementName()}</div>
							)
						) : (
							<div className="sched-dates-placeholder">
								{selectedElement ? "Generate schedule to see scheduled dates" : "Select an element to see scheduled dates"}
							</div>
						)}
					</div>
				</div>

				<div className="sched-center-panel">
					<div className="sched-schedule-header">
						Schedule
						{scheduleData?.schedule && (
							<span className="sched-schedule-header-generated">
								&nbsp;– Generated Schedule for {generatedMaxScenes || "N/A"} max scenes per day
							</span>
						)}
					</div>

					{conflicts.length > 0 && (
						<div className="sched-schedule-header sched-schedule-header-conflict">
							<button
								className="sched-conflict-button"
								onClick={() => {
									setShowConflictModal(true);
								}}
							>
								Show conflicts
							</button>

							<span className="sched-conflict-text">There are some conflicts in this schedule</span>
						</div>
					)}
					<ConflictsModal />

					<div className="sched-controls-section">
						<div className="sched-controls-group">
							<label className="sched-controls-label">
								Schedule By:
								<select value={scheduleMode} onChange={(e) => setScheduleMode(e.target.value)} className="sched-mode-dropdown">
									<option value="scenes">Max Scenes Per Day</option>
									<option value="page-eights">Max Page-Eights Per Day</option>
									<option value="hours">Max Shooting Hours Per Day</option>
								</select>
							</label>
						</div>

						{scheduleMode === "scenes" && (
							<div className="sched-controls-group">
								<label className="sched-controls-label">Max scenes:</label>
								<input
									type="number"
									value={maxScenes}
									onChange={(e) => setMaxScenes(e.target.value)}
									className="sched-page-input"
									placeholder="5"
									min="1"
								/>
							</div>
						)}

						{scheduleMode === "page-eights" && (
							<div className="sched-controls-group">
								<label className="sched-controls-label">Max page-eights:</label>
								<input
									type="number"
									value={maxPageEights.pages}
									onChange={(e) => setMaxPageEights({ ...maxPageEights, pages: e.target.value })}
									className="sched-page-input"
									placeholder="2"
									min="0"
								/>

								<input
									type="number"
									value={maxPageEights.eighths}
									onChange={(e) => setMaxPageEights({ ...maxPageEights, eighths: e.target.value })}
									className="sched-page-input"
									placeholder="3"
									min="0"
									max="7"
								/>
								<span>/8</span>
							</div>
						)}

						{scheduleMode === "hours" && (
							<div className="sched-controls-group">
								<label className="sched-controls-label">Max hours:</label>
								<input
									type="number"
									className="sched-page-input"
									placeholder="HH"
									value={maxHours.hours}
									onChange={(e) => setMaxHours({ ...maxHours, hours: e.target.value })}
								/>
								<span>:</span>
								<input
									type="number"
									className="sched-page-input"
									placeholder="MM"
									value={maxHours.minutes}
									onChange={(e) => setMaxHours({ ...maxHours, minutes: e.target.value })}
								/>
							</div>
						)}

						<div className="sched-controls-group">
							<button className="sched-generate-button" onClick={handleGenerateSchedule} disabled={isGenerating}>
								{isGenerating ? "GENERATING..." : "GENERATE"}
							</button>

							<div className="sched-flex-grow" />

							{scheduleData?.schedule &&
								(isEditing ? (
									<div className="sched-flex-row sched-gap-10" style={{ alignItems: "center" }}>
										<button onClick={handleSaveChanges} className="sched-action-btn-success">
											Save
										</button>

										<input
											label="Add a date"
											type="date"
											value={newScheduleDayInput}
											onChange={(e) => setNewScheduleDayInput(e.target.value)}
											className="sched-date-picker"
										/>
										<button onClick={handleAddScheduleDay} className="sched-action-btn-primary" disabled={!newScheduleDayInput}>
											Add Day
										</button>
										<button
											onClick={() => {
												setScheduleDays(originalScheduleDays);
												setIsEditing(false);
											}}
											className="sched-action-btn-danger"
										>
											Cancel
										</button>
									</div>
								) : (
									<button
										onClick={() => {
											setOriginalScheduleDays(JSON.parse(JSON.stringify(scheduleDays)));
											setIsEditing(true);
										}}
										className="sched-action-btn"
									>
										Edit
									</button>
								))}

							{scheduleMode == "hours" && (
								<button className="sched-action-btn" onClick={handleSaveHours}>
									Save Est. Hours
								</button>
							)}
						</div>
					</div>

					{scheduleData?.schedule && (
						<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
							<div className="sched-schedule-content">
								{scheduleDays.map((day) => {
									return (
										<ScheduleColumn
											key={day.id}
											day={day}
											isEditing={isEditing}
											scheduleMode={scheduleMode}
											sceneHours={sceneHours}
											setSceneHours={setSceneHours}
											setScheduleDays={setScheduleDays}
											characterNameToIdMap={characterNameToIdMap}
										/>
									);
								})}
							</div>
						</DndContext>
					)}
					{!scheduleData?.schedule && scenes.length > 0 && (
						<div className="sched-all-scenes-container">
							<h4>All Scenes</h4>
							<table className="sched-table">
								<thead className="sched-thead">
									<tr className="sched-header-row">
										<th className="sched-header-cell">Scene</th>

										<th className="sched-header-cell">Int./Ext.</th>
										<th className="sched-header-cell sched-location-synopsis-column">Location/Synopsis</th>

										<th className="sched-header-cell">Pgs</th>

										<th className="sched-header-cell">Characters</th>
										<th className="sched-header-cell">Est. Hours</th>
									</tr>
								</thead>
								<tbody>
									{scenes.map((scene, index) => (
										<tr key={index} className="sched-data-row">
											<td className="sched-data-cell">{scene["Scene Number"] || scene["Scene No."] || ""}</td>

											<td className="sched-data-cell">{scene["Int./Ext."]}</td>
											<td className="sched-data-cell sched-location-synopsis-column">
												{scene["Location"]}
												<br />
												<br /> Synopsis: {scene["Synopsis"]}
											</td>
											<td className="sched-data-cell">{formatPageEights(scene["Page Eighths"] || scene["Pgs"])}</td>
											<td className="sched-data-cell"> {scene["Characters"]}</td>
											<td className="sched-data-cell">
												<input
													type="number"
													className="sched-hours-input"
													placeholder="HH"
													value={sceneHours[scene["Scene Number"] ?? scene["Scene No."]]?.hours ?? ""}
													onChange={(e) => {
														const newSceneHours = { ...sceneHours };
														if (!newSceneHours[scene["Scene Number"] || scene["Scene No."]]) {
															newSceneHours[scene["Scene Number"] || scene["Scene No."]] = {
																hours: "",
																minutes: "",
															};
														}
														const value = parseInt(e.target.value);
														console.log(value);
														if (value < 0) {
															alert("Cannot have negative values for hours");
															return;
														}
														newSceneHours[scene["Scene Number"] || scene["Scene No."]].hours = value;
														setSceneHours(newSceneHours);
													}}
												/>
												<span>
													:<br />
												</span>
												<input
													type="number"
													className="sched-hours-input"
													placeholder="MM"
													value={sceneHours[scene["Scene Number"] ?? scene["Scene No."]]?.minutes ?? ""}
													onChange={(e) => {
														const newSceneHours = { ...sceneHours };
														if (!newSceneHours[scene["Scene Number"] || scene["Scene No."]]) {
															newSceneHours[scene["Scene Number"] || scene["Scene No."]] = {
																hours: "",
																minutes: "",
															};
														}
														const value = parseInt(e.target.value);
														console.log(value);
														if (value < 0 || value > 60) {
															alert("Enter a acceptable value for minutes");
															return;
														}
														newSceneHours[scene["Scene Number"] || scene["Scene No."]].minutes = value;
														setSceneHours(newSceneHours);
													}}
												/>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
					{!scheduleData?.schedule && scenes.length === 0 && (
						<div className="sched-empty-section">
							<div className="sched-empty-message">Generate rough schedule</div>
						</div>
					)}
				</div>

				<Chatbot scheduleData={scheduleData} scheduleDays={scheduleDays} scenes={scenes} id={id} fetchScheduleData={fetchScheduleData} />
			</div>
		</div>
	);
};

export default ManageSchedules;
