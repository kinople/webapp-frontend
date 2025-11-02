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
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Loader from "../components/Loader";

const SceneCard = ({ scene, isEditing, scheduleMode, sceneHours, setSceneHours, characterMap }) => {
	const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: scene.id, disabled: !isEditing });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		cursor: "grab",
		userSelect: "none",
	};

	return (
		<tr ref={setNodeRef} style={{ ...style, ...styles.trStyle }} {...attributes} {...listeners}>
			<td style={styles.tdStyle}>{scene.scene_number}</td>

			<td style={styles.tdStyle}>{scene.int_ext || "N/A"}</td>
			<td style={{ ...styles.tdStyle, ...styles.locationSynopsisColumn }}>
				{scene.location_name} <br /> <br />
				Synopsis: {scene.synopsis || "N/A"}
			</td>

			{<td style={styles.tdStyle}>{scene.page_eighths || "N/A"}</td>}

			<td style={styles.tdStyle}>{(scene.character_ids || []).join(", ")}</td>
			{
				<td style={styles.tdStyle}>
					<input
						type="number"
						style={{ width: "40px", marginLeft: "10px" }}
						placeholder="HH"
						value={sceneHours[scene.scene_number]?.hours || ""}
						onChange={(e) => {
							const newSceneHours = { ...sceneHours };
							if (!newSceneHours[scene.scene_number]) {
								newSceneHours[scene.scene_number] = { hours: "", minutes: "" };
							}
							newSceneHours[scene.scene_number].hours = e.target.value;
							setSceneHours(newSceneHours);
						}}
					/>
					<span>
						:
						<br />
					</span>
					<input
						type="number"
						style={{ width: "40px", marginLeft: "10px" }}
						placeholder="MM"
						value={sceneHours[scene.scene_number]?.minutes || ""}
						onChange={(e) => {
							const newSceneHours = { ...sceneHours };
							if (!newSceneHours[scene.scene_number]) {
								newSceneHours[scene.scene_number] = { hours: "", minutes: "" };
							}
							newSceneHours[scene.scene_number].minutes = e.target.value;
							setSceneHours(newSceneHours);
						}}
					/>
				</td>
			}
		</tr>
	);
};

const ScheduleColumn = ({ day, isEditing, scheduleMode, sceneHours, setSceneHours, setScheduleDays }) => {
	const { setNodeRef } = useDroppable({
		id: day.id,
	});

	const [drop, setDrop] = useState(true);

	const d = day.date.split("-");

	return (
		<div
			ref={setNodeRef}
			style={{
				margin: "10px",
				padding: "10px",
				backgroundColor: drop ? "#f4f4f4ff" : "#bdbdbdff",
				borderRadius: "4px",
				width: "100%",
				display: "flex",
				flexDirection: "column",
			}}
		>
			<div style={{ width: "95%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<h4>{d[2] + "-" + d[1] + "-" + d[0]}</h4>
				<button
					onClick={() => {
						setDrop(!drop);
					}}
				>
					{drop ? "^" : "v"}
				</button>
				{isEditing && (
					<button
						onClick={() => {
							setScheduleDays((prev) => prev.filter((d) => d.id !== day.id));
						}}
						disabled={day.scenes.length > 0}
						style={styles.removeButton}
					>
						Remove
					</button>
				)}
			</div>
			{drop && (
				<SortableContext items={day.scenes.map((s) => s.id)} strategy={verticalListSortingStrategy}>
					<table style={styles.tableStyle}>
						<thead>
							<tr style={{ backgroundColor: "#e0e0e0" }}>
								<th style={styles.thStyle}>Scene</th>

								<th style={styles.thStyle}>Int./Ext.</th>
								<th style={{ ...styles.thStyle, ...styles.locationSynopsisColumn }}>Location/synopsis</th>
								{<th style={styles.thStyle}>Pgs</th>}

								<th style={styles.thStyle}>Characters</th>

								{<th style={{ margin: "100px", ...styles.thStyle }}>Est. Hours</th>}
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
	const [isSaving, setIsSaving] = useState(false); // Add saving state
	const [selectedDates, setSelectedDates] = useState([]);
	const [originalDates, setOriginalDates] = useState([]); // Track original dates for comparison
	const [chatInput, setChatInput] = useState("");
	const [chatMessages, setChatMessages] = useState([]);
	const [isSendingMessage, setIsSendingMessage] = useState(false);
	const [dateRangeStart, setDateRangeStart] = useState("");
	const [dateRangeEnd, setDateRangeEnd] = useState("");
	const [datePickerMode, setDatePickerMode] = useState("single"); // 'single' or 'range'
	const [datePickerValue, setDatePickerValue] = useState("single");
	const [scheduleDays, setScheduleDays] = useState([]);
	const [originalScheduleDays, setOriginalScheduleDays] = useState([]);
	const [isEditing, setIsEditing] = useState(false);
	const [scenes, setScenes] = useState([]);
	const [scheduleMode, setScheduleMode] = useState("scenes"); // 'scenes', 'page-eights', or 'hours'
	const [maxHours, setMaxHours] = useState({ hours: "", minutes: "" });
	const [maxPageEights, setMaxPageEights] = useState({ pages: "", eighths: "" }); // New state for max page-eights
	const [newScheduleDayInput, setNewScheduleDayInput] = useState("");
	const [sceneHours, setSceneHours] = useState({});
	const [DOODSelected, setDOODselected] = useState(false);
	const [generatedMaxScenes, setGeneratedMaxScenes] = useState("");
	const [scheduleDates, setScheduleDates] = useState({ start: "N/A", end: "N/A" });

	const handleSaveChanges = async () => {
		try {
			// ✅ Filter out days with no scenes
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

			const parsedSceneHours = Object.entries(sceneHours).reduce((acc, [sceneNumber, time]) => {
				acc[sceneNumber] = parseHours(time);
				return acc;
			}, {});
			console.log("parsed scene hourrs", parsedSceneHours);

			const response = await fetch(getApiUrl(`/api/${id}/schedule/${scheduleId}`), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ schedule_by_day, scene_hours: parsedSceneHours }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				if (response.status === 400 && errorData.conflicts) {
					const conflictMessage = errorData.conflicts.join("\n");
					alert(`Failed to save schedule due to availability conflicts:\n${conflictMessage}`);
				} else {
					throw new Error(errorData.message || "Failed to save schedule");
				}
				setScheduleDays(originalScheduleDays); // Revert to original state
				return;
			} else {
				setScheduleDays(filteredDays);
			}
			fetchScheduleData();
			alert("Schedule saved successfully!");
			setIsEditing(false);
		} catch (error) {
			console.error("Error saving schedule:", error);
			alert("Failed to save schedule: " + error.message);
			setScheduleDays(originalScheduleDays); // Revert to original state
		}
	};

	useEffect(() => {
		const fetchScenes = async () => {
			try {
				// First, get the list of scripts for the project
				const scriptsResponse = await fetch(getApiUrl(`/api/${id}/script-list`));
				if (!scriptsResponse.ok) {
					throw new Error("Failed to fetch script list");
				}
				const scripts = await scriptsResponse.json();
				const sortedScripts = (scripts || []).sort((a, b) => (b.version || 0) - (a.version || 0));

				if (sortedScripts.length > 0) {
					const latestScript = sortedScripts[0];

					// Then, fetch the breakdown for the latest script
					const breakdownResponse = await fetch(getApiUrl(`/api/fetch-breakdown?script_id=${latestScript.id}`));
					if (!breakdownResponse.ok) {
						if (breakdownResponse.status === 404) {
							return;
						}
						throw new Error("Failed to fetch breakdown");
					}
					const breakdownData = await breakdownResponse.json();

					if (breakdownData.tsv_content) {
						const parsedScenes = parseTSV(breakdownData.tsv_content);
						setScenes(parsedScenes);
						console.log("break-down------------- ", parsedScenes);
					}
				}
			} catch (error) {
				console.error("Error fetching scenes:", error);
			}
		};

		fetchScenes();
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

	useEffect(() => {
		if (scheduleData && scheduleData.schedule && scheduleData.schedule.schedule_by_day) {
			const chartoid = {};
			// Build chartoid mapping: assuming actor_schedule has keys and a character_id
			//console.log("Schedule -------------pritn   ", scheduleData);
			for (const c in scheduleData.schedule.actor_schedule) {
				chartoid[c] = scheduleData.schedule.actor_schedule[c]["character_id"];
			}
			if (scenes.length > 0) {
				const days = Object.values(scheduleData.schedule.schedule_by_day).map((day) => ({
					id: String(day.date),
					date: day.date,
					scenes: day.scenes.map((scheduledScene, index) => {
						const fullScene = scenes.find((s) => (s["Scene Number"] || s["Scene No."]) === String(scheduledScene.scene_number));

						const newScene = {
							...scheduledScene,
							id: scheduledScene.scene_id ? String(scheduledScene.scene_id) : `${day.date}-${index}-${scheduledScene.scene_number}`,
						};

						if (fullScene) {
							newScene.int_ext = fullScene["Int./Ext."];
							newScene.time_of_day = fullScene["Time of Day"] || fullScene["Time"];
							newScene.page_eighths = fullScene["Page Eighths"] || fullScene["Pgs"];
							newScene.synopsis = fullScene["Synopsis"];
							if (!newScene.location_name) {
								newScene.location_name = fullScene["Location"];
							}
							if (!newScene.character_names || newScene.character_names.length === 0) {
								newScene.character_names = fullScene["Characters"] ? fullScene["Characters"].split(",").map((c) => c.trim()) : [];
							}

							// Set character_ids based on character_names and chartoid
							newScene.character_ids = newScene.character_names.map(
								(name) => chartoid[name] || null // or "" if you prefer
							);
						}

						return newScene;
					}),
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
				// Fallback if scenes are not loaded yet
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
	}, [scheduleData, scenes]);

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
				// Sorting within the same container
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
				// Moving between containers
				const activeDayIndex = days.findIndex((d) => d.id === activeContainer.id);
				const overDayIndex = days.findIndex((d) => d.id === overContainer.id);

				const activeSceneIndex = activeContainer.scenes.findIndex((s) => s.id === activeId);

				const newDays = [...days];
				const [movedScene] = newDays[activeDayIndex].scenes.splice(activeSceneIndex, 1);

				let overSceneIndex = overContainer.scenes.findIndex((s) => s.id === overId);
				if (overSceneIndex === -1) {
					// Dropped on container, not on a scene
					overSceneIndex = newDays[overDayIndex].scenes.length;
				}

				newDays[overDayIndex].scenes.splice(overSceneIndex, 0, movedScene);

				return newDays;
			}
			return days;
		});
	};

	// Parse date ranges from the API response format
	const parseDateRanges = (dateArray) => {
		const dates = [];
		dateArray.forEach((dateItem) => {
			if (dateItem.includes("-") && dateItem.split("-").length > 3) {
				// This is a date range (e.g., "2025-07-05-2025-07-07")
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
				// Single date
				dates.push(dateItem);
			}
		});
		return dates;
	};

	// Get existing dates for the selected element
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

	// Check if dates have changed
	const hasChanges = () => {
		if (selectedDates.length !== originalDates.length) return true;

		const sortedSelected = [...selectedDates].sort();
		const sortedOriginal = [...originalDates].sort();

		return !sortedSelected.every((date, index) => date === sortedOriginal[index]);
	};

	// Reset selected dates when element changes and load existing dates
	const handleElementChange = (value) => {
		console.log("Element Changed:", value);
		setSelectedElement(value);
		setDateRangeStart("");
		setDateRangeEnd("");

		// Load existing dates for the selected element
		if (value && scheduleData?.dates) {
			const [type, name] = value.split("::");
			const datesSection = type === "location" ? "locations" : "characters";
			const elementData = scheduleData.dates[datesSection]?.[name];
			console.log("Element Data:", elementData);

			if (elementData?.dates) {
				console.log("Found dates for:", name, elementData.dates);
				const existingDates = parseDateRanges(elementData.dates);
				setSelectedDates(existingDates);
				setOriginalDates(existingDates); // Set original dates for comparison
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

	// Update the useEffect to load dates when schedule data changes
	useEffect(() => {
		if (selectedElement && scheduleData?.dates) {
			const existingDates = getExistingDates();
			setSelectedDates(existingDates);
			setOriginalDates(existingDates); // Set original dates for comparison
		}
	}, [scheduleData, selectedElement]);

	// Reload given dates section data
	const reloadGivenDatesData = async () => {
		if (!selectedElement) return;

		try {
			const response = await fetch(getApiUrl(`/api/${id}/schedule/${scheduleId}`));
			if (!response.ok) {
				throw new Error("Failed to reload schedule data");
			}
			const data = await response.json();

			// Update only the dates section of schedule data
			setScheduleData((prev) => ({
				...prev,
				dates: data.dates,
			}));

			// Reload dates for current element
			const [type, name] = selectedElement.split("::");
			const elementDates = data.dates[type === "location" ? "locations" : "characters"];

			if (elementDates && elementDates[name] && elementDates[name].dates) {
				const refreshedDates = parseDateRanges(elementDates[name].dates);
				console.log("refreshed dates ::::::::", refreshedDates);
				setSelectedDates(refreshedDates);
				setOriginalDates(refreshedDates); // Update original dates after reload
			} else {
				setSelectedDates([]);
				setOriginalDates([]);
			}
		} catch (error) {
			console.error("Error reloading given dates data:", error);
		}
	};

	// Create dropdown options from schedule data
	const getElementOptions = (type) => {
		if (!scheduleData) return [];
		const options = [];

		if (type === "location" && scheduleData.locations && Array.isArray(scheduleData.locations)) {
			scheduleData.locations.forEach((location) => {
				options.push({
					value: location,
					label: `📍 ${location}`,
				});
			});
		} else if (type === "character" && scheduleData.characters && Array.isArray(scheduleData.characters)) {
			scheduleData.characters.forEach((character) => {
				options.push({
					value: character,
					label: `👤 ${character}`,
				});
			});
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

			// Add a small delay before refreshing to ensure backend processing is complete
			setTimeout(async () => {
				try {
					// Refresh the schedule data to get the generated schedule
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
					// Don't show error to user since schedule was generated successfully
				}
			}, 1000); // 1 second delay
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
					// Remove date if already selected
					return prev;
				} else {
					// Add date if not selected
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

		// Generate all dates in the range
		const rangeDates = [];
		const currentDate = new Date(start);
		const endDate = new Date(end);

		while (currentDate <= endDate) {
			rangeDates.push(currentDate.toISOString().split("T")[0]);
			currentDate.setDate(currentDate.getDate() + 1);
		}

		// Add range dates to selected dates (avoiding duplicates)
		await setSelectedDates(rangeDates);

		// Clear range inputs
		setDateRangeStart("");
		setDateRangeEnd("");
	};

	const removeDate = (dateToRemove) => {
		setSelectedDates((prev) => prev.filter((d) => d !== dateToRemove));
	};

	const clearAllDates = () => {
		setSelectedDates([]);
		// Don't reset originalDates here - keep them for comparison
		// This way, clearing dates when there were original dates will show as a change
	};

	const formatDisplayDate = (dateString) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
		});
	};

	// Generate calendar days for display
	const generateCalendarDays = () => {
		if (!scheduleData?.first_date || !scheduleData?.last_date) return [];

		const startDate = new Date(scheduleData.first_date);
		const endDate = new Date(scheduleData.last_date);

		// Get the first Sunday of the week containing the start date
		// const firstSunday = new Date(startDate);
		// firstSunday.setDate(startDate.getDate() - startDate.getDay());

		// // Get the last Saturday of the week containing the end date
		// const lastSaturday = new Date(endDate);
		// lastSaturday.setDate(endDate.getDate() + (6 - endDate.getDay()));

		const days = [];
		const currentDate = new Date(startDate);

		while (currentDate <= endDate) {
			days.push(new Date(currentDate));
			currentDate.setDate(currentDate.getDate() + 1);
		}

		return days;
	};

	// Determine if a date is part of a range
	const isDateInRange = (date) => {
		const dateStr = date.toISOString().split("T")[0];
		if (!selectedDates.includes(dateStr)) return false;

		const sortedDates = [...selectedDates].sort();
		const dateIndex = sortedDates.indexOf(dateStr);

		// Check if this date is part of a consecutive sequence
		const hasConsecutiveBefore = dateIndex > 0 && new Date(sortedDates[dateIndex - 1]).getTime() === date.getTime() - 24 * 60 * 60 * 1000;
		const hasConsecutiveAfter =
			dateIndex < sortedDates.length - 1 && new Date(sortedDates[dateIndex + 1]).getTime() === date.getTime() + 24 * 60 * 60 * 1000;

		return hasConsecutiveBefore || hasConsecutiveAfter;
	};

	// Get the month and year for calendar header
	const getCalendarMonthYear = () => {
		if (!scheduleData?.first_date || !scheduleData?.last_date) return "";

		const startDate = new Date(scheduleData.first_date);
		const endDate = new Date(scheduleData.last_date);

		const startMonth = startDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
		const endMonth = endDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

		return startMonth === endMonth ? startMonth : `${startMonth} - ${endMonth}`;
	};

	// Handle calendar date click
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
			setIsSaving(true); // Set saving state to true
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
					dates: f === "Flexible" ? [] : selectedDates, // Array of date strings (can be empty)
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to save dates");
			}

			const result = await response.json();
			console.log("Dates saved successfully:", result);
			alert("Dates saved successfully!");
			fetchScheduleData();

			// Reload the given dates section
			//reloadGivenDatesData();
		} catch (error) {
			console.error("Error saving dates:", error);
			alert("Failed to save dates: " + error.message);
		} finally {
			setIsSaving(false); // Reset saving state
			console.log("lastly -- ----------------", selectedDates);
		}
	};

	// Get scheduled dates for the selected element
	const getScheduledDates = () => {
		if (!selectedElement || !scheduleData?.schedule?.actor_schedule) return [];

		const [type, name] = selectedElement.split("::");

		if (type === "character") {
			const actorSchedule = scheduleData.schedule.actor_schedule[name];
			return actorSchedule ? actorSchedule.dates || [] : [];
		} else if (type === "location") {
			// For locations, get all dates where this location is used
			const scheduledDates = [];
			const scheduleByDay = scheduleData.schedule.schedule_by_day;

			if (scheduleByDay) {
				Object.values(scheduleByDay).forEach((daySchedule) => {
					const hasLocation = daySchedule.scenes?.some((scene) => scene.location_name === name);
					if (hasLocation) {
						scheduledDates.push(daySchedule.date);
					}
				});
			}

			return scheduledDates;
		}

		return [];
	};

	// Generate calendar for scheduled dates
	const generateScheduledCalendar = () => {
		const scheduledDates = getScheduledDates();
		// const getActiveStartDate = () => {
		// 	if (scheduledDates.length > 0) {
		// 		const firstDate = new Date(scheduledDates[0]);
		// 		return new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
		// 	}
		// 	return new Date(); // fallback to current month
		// };

		const tileClassNameforScheduledDates = ({ date, view }) => {
			if (view === "month") {
				const formattedDate = date.toLocaleDateString("en-CA").split("T")[0]; // gives "YYYY-MM-DD"
				const scheduledDates = getScheduledDates();

				if (scheduledDates.includes(formattedDate)) {
					return "highlight-blue";
				}
			}
		};
		return (
			<div style={styles.scheduledCalendarContainer}>
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

		// Validate date components to prevent invalid dates like 30-02-2023
		if (dateObj.getFullYear() !== year || dateObj.getMonth() + 1 !== month || dateObj.getDate() !== day) {
			alert("Invalid date. Please enter a real date.");
			return;
		}

		const yyyyMMdd = newScheduleDayInput;

		// Check if the date is within the schedule's overall range
		// if (scheduleData?.first_date && scheduleData?.last_date) {
		// 	const scheduleStartDate = new Date(scheduleData.first_date);
		// 	const scheduleEndDate = new Date(scheduleData.last_date);
		// 	if (dateObj < scheduleStartDate || dateObj > scheduleEndDate) {
		// 		alert(`Date must be within the schedule range: ${scheduleData.first_date} to ${scheduleData.last_date}`);
		// 		return;
		// 	}
		// }

		setScheduleDays((prevDays) => {
			// Prevent adding duplicate dates
			if (prevDays.some((d) => d.date === yyyyMMdd)) {
				alert("This date already exists in the schedule.");
				return prevDays;
			}
			return [...prevDays, { id: yyyyMMdd, date: yyyyMMdd, scenes: [] }].sort((a, b) => new Date(a.date) - new Date(b.date));
		});
		setNewScheduleDayInput(""); // Clear the input after adding
	};

	const handleSendMessage = async () => {
		if (!chatInput.trim()) return;

		try {
			setIsSendingMessage(true);

			// Add user message to chat
			const userMessage = {
				type: "user",
				content: chatInput,
			};
			setChatMessages((prev) => [...prev, userMessage]);

			// Clear input
			setChatInput("");

			// Send message to backend
			const response = await fetch(getApiUrl(`/api/${id}/query`), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					question: chatInput,
					schedule: scheduleData,
					scheduleDays: scheduleDays,
					breakdown: scenes,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to process message");
			}

			const result = await response.json();

			console.log("bot ouput: ", result);

			// Add assistant response to chat
			const assistantMessage = {
				type: "assistant",
				content: result.message,
				// constraints: result.extra_constraints,
				// timestamp: new Date().toISOString(),
			};
			setChatMessages((prev) => [...prev, assistantMessage]);
			fetchScheduleData();

			// // Always refresh schedule data after a message response
			// const refreshResponse = await fetch(getApiUrl(`/api/${id}/schedule/${scheduleId}`));
			// if (refreshResponse.ok) {
			// 	const refreshedData = await refreshResponse.json();
			// 	console.log("Refreshed Schedule Data:", refreshedData);
			// 	setScheduleData(refreshedData);
			// } else {
			// 	console.error("Failed to refresh schedule data");
			// }
		} catch (error) {
			console.error("Error sending message:", error);
			// Add error message to chat
			const errorMessage = {
				type: "error",
				content: `Error: ${error.message}`,
				timestamp: new Date().toISOString(),
			};
			setChatMessages((prev) => [...prev, errorMessage]);
		} finally {
			setIsSendingMessage(false);
		}
	};

	if (DOODSelected) {
		return (
			<>
				<button
					onClick={() => {
						setDOODselected(false);
					}}
					style={styles.addButton}
				>
					Back
				</button>
				<DOODSchedule scheduleData={scheduleData} />
			</>
		);
	}

	const tileClassName = ({ date, view }) => {
		if (view === "month") {
			const formattedDate = date.toLocaleDateString("en-CA").split("T")[0]; // gives "YYYY-MM-DD"

			if (selectedDates.includes(formattedDate)) {
				return "highlight-blue";
			}
		}
	};

	return (
		<div style={styles.pageContainer}>
			<ProjectHeader />
			<div style={styles.header}>
				<div>
					<h2 style={styles.pageTitle}>Scheduling</h2>
				</div>
				<div style={styles.headerRight}>
					<div style={styles.dateInfo}>
						<div>Schedule Start Date: {scheduleDates.start || "Not set"}</div>
						<div>Schedule End Date:  {scheduleDates.end || "Not set"}</div>
					</div>
				</div>
			</div>
			<div style={styles.content}>
				<div style={styles.leftPanel}>
					<button
						onClick={() => {
							setDOODselected(true);
						}}
					>
						Add availability dates
					</button>
					<div style={styles.elementSelector}>
						<div style={styles.selectorHeader}>
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
								style={styles.elementDropdown}
							>
								<option value="location">Locations</option>
								<option value="character">Characters</option>
							</select>
						</div>
						<div style={{ ...styles.selectorHeader, marginTop: "20px" }}>
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
								style={styles.elementDropdown}
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

					<div style={styles.givenDates}>
						<div style={styles.sectionTitle}>Given Dates</div>

						<div style={styles.modeSelector}>
							<label style={styles.modeLabel}>
								<input
									type="radio"
									value="flexible"
									checked={datePickerMode === "flexible"}
									onChange={(e) => {
										setDatePickerMode(e.target.value);
									}}
									style={styles.radioInput}
								/>
								Flexible Dates
							</label>
							<label style={styles.modeLabel}>
								<input
									type="radio"
									value="fixed"
									checked={datePickerMode === "fixed"}
									onChange={(e) => {
										setDatePickerMode(e.target.value);
									}}
									style={styles.radioInput}
								/>
								Fixed Dates
							</label>
						</div>
						{selectedElement &&
							scheduleData["dates"][elementType === "location" ? "locations" : "characters"][element] &&
							scheduleData["dates"][elementType === "location" ? "locations" : "characters"][element]["flexible"] && (
								<div style={styles.existingDatesInfo}>
									<span> ✅ Flexible dates saved for {element}</span>
								</div>
							)}
						{selectedElement ? (
							<div style={styles.datePickerContainer}>
								{scheduleData["dates"][elementType === "location" ? "locations" : "characters"][element] &&
									selectedDates.length === 0 &&
									!isSaving &&
									!scheduleData["dates"][elementType === "location" ? "locations" : "characters"][element]["flexible"] &&
									datePickerMode !== "flexible" && (
										<div style={styles.existingDatesInfo}>
											<span style={styles.existingDatesLabel}>{`No dates selected for ${getSelectedElementName()}`}</span>
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
												style={styles.addRangeButton}
												disabled={!selectedElement}
											>
												Save Flexible dates
											</button>
										</>
									)}

								{datePickerMode === "fixed" && datePickerValue === "single" && (
									<input type="date" onChange={handleSingleDateChange} style={styles.datePicker} />
								)}

								{datePickerValue === "range" && datePickerMode === "fixed" && (
									<div style={styles.dateRangeContainer}>
										<div style={styles.dateRangeInputs}>
											<input
												type="date"
												value={dateRangeStart}
												onChange={handleRangeStartChange}
												style={styles.dateRangeInput}
												placeholder="Start Date"
											/>
											<span style={styles.dateRangeSeparator}>to</span>
											<input
												type="date"
												value={dateRangeEnd}
												min={dateRangeStart}
												onChange={handleRangeEndChange}
												style={styles.dateRangeInput}
												placeholder="End Date"
											/>
										</div>
										<button onClick={addDateRange} style={styles.addRangeButton} disabled={!dateRangeStart || !dateRangeEnd}>
											Add Range
										</button>
									</div>
								)}

								{datePickerMode === "fixed" && (
									<div style={styles.modeSelector}>
										<label style={styles.modeLabel}>
											<input
												type="radio"
												value="range"
												checked={datePickerValue === "range"}
												onChange={(e) => setDatePickerValue(e.target.value)}
												style={styles.radioInput}
											/>
											Range
										</label>
										<label style={styles.modeLabel}>
											<input
												type="radio"
												value="single"
												checked={datePickerValue === "single"}
												onChange={(e) => setDatePickerValue(e.target.value)}
												style={styles.radioInput}
											/>
											Single
										</label>
									</div>
								)}

								{(selectedDates.length > 0 || hasChanges()) && (
									<div style={styles.selectedDatesList}>
										<div style={styles.selectedDatesHeader}>
											<span>Selected Dates ({selectedDates.length}):</span>
											<div style={styles.dateActions}>
												{hasChanges() && (
													<button
														onClick={saveDates}
														style={styles.saveDatesButton}
														title="Save dates"
														disabled={isSaving}
													>
														{isSaving ? "Saving..." : "Save Dates"}
													</button>
												)}
												{selectedDates.length > 0 && (
													<button onClick={clearAllDates} style={styles.clearAllButton} title="Clear all dates">
														Clear All
													</button>
												)}
											</div>
										</div>
										{scheduleData?.first_date && scheduleData?.last_date && selectedDates.length > 0 && (
											<div style={styles.calendarContainer}>
												{/* <div style={styles.calendarHeader}>{getCalendarMonthYear()}</div>
												<div style={styles.calendarGrid}>
													<div style={styles.calendarDaysHeader}>
														{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
															<div key={day} style={styles.calendarDayHeader}>
																{day}
															</div>
														))}
													</div>
													<div style={styles.calendarDaysGrid}>
														{generateCalendarDays().map((date, index) => {
															const dateStr = date.toISOString().split("T")[0];
															const isSelected = selectedDates.includes(dateStr);
															const isInRange = isDateInRange(date);

															return (
																<div
																	key={index}
																	style={{
																		...styles.calendarDay,
																		...(isSelected && isInRange ? styles.calendarDayRangeSelected : {}),
																		...(isSelected && !isInRange ? styles.calendarDaySingleSelected : {}),
																	}}
																	onClick={() => handleCalendarDateClick(date)}
																>
																	{date.getDate()}
																</div>
															);
														})}
													</div>
												</div> */}

												<Calendar onClickDay={handleCalendarDateClick} tileClassName={tileClassName} />
											</div>
										)}
									</div>
								)}
							</div>
						) : (
							<div style={styles.calendarPlaceholder}>Select an element to choose dates</div>
						)}
					</div>

					<div style={styles.scheduledDates}>
						<div style={styles.sectionTitle}>Scheduled Dates</div>
						{selectedElement && scheduleData?.schedule ? (
							generateScheduledCalendar() || <div style={styles.datesPlaceholder}>No scheduled dates for {getSelectedElementName()}</div>
						) : (
							<div style={styles.datesPlaceholder}>
								{selectedElement ? "Generate schedule to see scheduled dates" : "Select an element to see scheduled dates"}
							</div>
						)}
					</div>
				</div>

				<div style={styles.centerPanel}>
					<div
						style={{
							...styles.scheduleHeader,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "8px",
							fontSize: "18px",
							fontWeight: "400",
							textAlign: "center",
						}}
					>
						Schedule
						{scheduleData?.schedule && (
							<span
								style={{
									fontSize: "14px",
									color: "#1e90ff",
									fontWeight: "500",
								}}
							>
								&nbsp;– Generated Schedule for {generatedMaxScenes || "N/A"} max scenes per day
							</span>
						)}
					</div>

					<div style={styles.maxPagesSection}>
						<div style={styles.maxPagesUpper}>
							<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
								<label style={{ display: "flex", alignItems: "center", gap: "4px" }}>
									Schedule By:
									<select value={scheduleMode} onChange={(e) => setScheduleMode(e.target.value)} style={styles.modeDropdown}>
										<option value="scenes">Max Scenes Per Day</option>
										<option value="page-eights">Max Page-Eights Per Day</option>
										<option value="hours">Max Shooting Hours Per Day</option>
									</select>
								</label>
							</div>
						</div>

						{scheduleMode === "scenes" && (
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<label style={styles.maxPagesLabel}>Max scenes:</label>
								<input
									type="number"
									value={maxScenes}
									onChange={(e) => setMaxScenes(e.target.value)}
									style={styles.pageInput}
									placeholder="5"
									min="1"
								/>
							</div>
						)}

						{scheduleMode === "page-eights" && (
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<label style={styles.maxPagesLabel}>Max page-eights:</label>
								<input
									type="number"
									value={maxPageEights.pages}
									onChange={(e) => setMaxPageEights({ ...maxPageEights, pages: e.target.value })}
									style={styles.pageInput}
									placeholder="2"
									min="0"
								/>

								<input
									type="number"
									value={maxPageEights.eighths}
									onChange={(e) => setMaxPageEights({ ...maxPageEights, eighths: e.target.value })}
									style={styles.pageInput}
									placeholder="3"
									min="0"
									max="7"
								/>
								<span>/8</span>
							</div>
						)}

						{scheduleMode === "hours" && (
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<label style={styles.maxPagesLabel}>Max hours:</label>
								<input
									type="number"
									style={{ width: "40px" }}
									placeholder="HH"
									value={maxHours.hours}
									onChange={(e) => setMaxHours({ ...maxHours, hours: e.target.value })}
								/>
								<span>:</span>
								<input
									type="number"
									style={{ width: "40px" }}
									placeholder="MM"
									value={maxHours.minutes}
									onChange={(e) => setMaxHours({ ...maxHours, minutes: e.target.value })}
								/>
							</div>
						)}

						<div style={styles.maxPagesUpper}>
							<button style={styles.generateButton} onClick={handleGenerateSchedule} disabled={isGenerating}>
								{isGenerating ? "GENERATING..." : "GENERATE"}
							</button>

							<div style={{ flexGrow: 1 }} />

							{scheduleData?.schedule &&
								(isEditing ? (
									<div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
										<button onClick={handleSaveChanges} style={styles.saveButton}>
											Save
										</button>

										<input
											label="Add a date"
											type="date"
											value={newScheduleDayInput}
											onChange={(e) => setNewScheduleDayInput(e.target.value)}
											style={styles.datePicker}
										/>
										<button onClick={handleAddScheduleDay} style={styles.addButton} disabled={!newScheduleDayInput}>
											Add Day
										</button>
										<button
											onClick={() => {
												setScheduleDays(originalScheduleDays);
												setIsEditing(false);
											}}
											style={styles.cancelButton}
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
										style={styles.editButton}
									>
										Edit
									</button>
								))}
						</div>
					</div>
					{scheduleData?.schedule && (
						<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
							<div style={{ display: "flex", flexDirection: "column" }}>
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
										/>
									);
								})}
							</div>
						</DndContext>
					)}
					{!scheduleData?.schedule && scenes.length > 0 && (
						<div style={{ margin: "10px", padding: "10px", backgroundColor: "#f4f4f4", borderRadius: "4px", width: "100%" }}>
							<h4>All Scenes</h4>
							<table style={styles.tableStyle}>
								<thead>
									<tr style={{ backgroundColor: "#e0e0e0" }}>
										<th style={styles.thStyle}>Scene</th>

										<th style={styles.thStyle}>Int./Ext.</th>
										<th style={{ ...styles.thStyle, ...styles.locationSynopsisColumn }}>Location/Synopsis</th>

										{<th style={styles.thStyle}>Pgs</th>}

										<th style={styles.thStyle}>Characters</th>
										{<th style={styles.thStyle}>Est. Hours</th>}
									</tr>
								</thead>
								<tbody>
									{scenes.map((scene, index) => (
										<tr key={index} style={styles.trStyle}>
											<td style={styles.tdStyle}>{scene["Scene Number"] || scene["Scene No."] || ""}</td>

											<td style={styles.tdStyle}>{scene["Int./Ext."]}</td>
											<td style={{ ...styles.tdStyle, ...styles.locationSynopsisColumn }}>
												{scene["Location"]}
												<br />
												<br /> Synopsis: {scene["Synopsis"]}
											</td>
											{/* <td style={styles.tdStyle}>{scene["Time of Day"] || scene["Time"]}</td> */}
											{<td style={styles.tdStyle}>{scene["Page Eighths"] || scene["Pgs"]}</td>}
											{/* <td style={styles.tdStyle}>{scene["Synopsis"]}</td> */}
											<td style={styles.tdStyle}>{scene["Characters"]}</td>
											{
												<td style={styles.tdStyle}>
													<input
														type="number"
														style={{ width: "40px" }}
														placeholder="HH"
														value={sceneHours[scene["Scene Number"] || scene["Scene No."]]?.hours || ""}
														onChange={(e) => {
															const newSceneHours = { ...sceneHours };
															if (!newSceneHours[scene["Scene Number"] || scene["Scene No."]]) {
																newSceneHours[scene["Scene Number"] || scene["Scene No."]] = {
																	hours: "",
																	minutes: "",
																};
															}
															newSceneHours[scene["Scene Number"] || scene["Scene No."]].hours = e.target.value;
															setSceneHours(newSceneHours);
														}}
													/>
													<span>
														:<br />
													</span>
													<input
														type="number"
														style={{ width: "40px" }}
														placeholder="MM"
														value={sceneHours[scene["Scene Number"] || scene["Scene No."]]?.minutes || ""}
														onChange={(e) => {
															const newSceneHours = { ...sceneHours };
															if (!newSceneHours[scene["Scene Number"] || scene["Scene No."]]) {
																newSceneHours[scene["Scene Number"] || scene["Scene No."]] = {
																	hours: "",
																	minutes: "",
																};
															}
															newSceneHours[scene["Scene Number"] || scene["Scene No."]].minutes = e.target.value;
															setSceneHours(newSceneHours);
														}}
													/>
												</td>
											}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
					{!scheduleData?.schedule && scenes.length === 0 && (
						<div style={styles.emptyScheduleSection}>
							<div style={styles.emptyScheduleMessage}>Generate rough schedule</div>
						</div>
					)}
				</div>

				<div style={styles.rightPanel}>
					<div style={styles.scheduleHeader}>Scheduling Assistant</div>
					<div style={styles.chatContainer}>
						<div style={styles.chatMessages}>
							<div style={styles.welcomeMessage}>
								Hello! I'm Kino, your scheduling assistant. I can help you with:
								<ul style={styles.assistantList}>
									<li>Understanding the current schedule</li>
									<li>Suggesting optimal shooting dates</li>
									<li>Adding scheduling constraints</li>
								</ul>
								How can I assist you today?
							</div>
							{chatMessages.map((message, index) => (
								<div
									key={index}
									style={{
										...styles.messageContainer,
										...(message.type === "user" ? styles.userMessage : {}),
										...(message.type === "assistant" ? styles.assistantMessage : {}),
										...(message.type === "error" ? styles.errorMessage : {}),
									}}
								>
									<div style={styles.messageContent}>
										<ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
									</div>
									{/* {message.constraints && (
										<div style={styles.constraintsContainer}>
											<div style={styles.constraintsHeader}>Added Constraints:</div>
											<pre style={styles.constraints}>{JSON.stringify(message.constraints, null, 2)}</pre>
										</div>
									)}
									<div style={styles.messageTimestamp}>{new Date(message.timestamp).toLocaleTimeString()}</div> */}
								</div>
							))}
						</div>
						{isSendingMessage && (
							<div style={{ ...styles.messageContainer, ...styles.assistantMessage, margin: "20px" }}>
								<Loader />
							</div>
						)}
						<div style={styles.chatInputContainer}>
							<input
								type="text"
								value={chatInput}
								onChange={(e) => setChatInput(e.target.value)}
								onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
								placeholder="Type your message here..."
								style={styles.chatInput}
								disabled={isSendingMessage}
							/>
							<button
								style={{
									...styles.sendButton,
									...(isSendingMessage ? styles.sendButtonDisabled : {}),
								}}
								onClick={handleSendMessage}
								disabled={isSendingMessage}
							>
								{isSendingMessage ? "Sending..." : "Send"}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

const styles = {
	pageContainer: {
		display: "flex",
		flexDirection: "column",
		minHeight: "100vh",
		backgroundColor: "#fff",
	},
	header: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "flex-start",
		padding: "1rem 2rem",
		borderBottom: "1px solid #eee",
		backgroundColor: "#fff",
	},
	pageTitle: {
		fontSize: "1.1rem",
		fontWeight: "normal",
		margin: "0.25rem 0 0 0",
		color: "#555",
	},
	headerRight: {
		textAlign: "right",

	},
	dateInfo: {
		fontSize: "0.9rem",
		color: "#555",
		lineHeight: "1.4",
		textAlign: "left",
	},
	content: {
		display: "flex",
		flex: 1,
		minHeight: "calc(100vh - 120px)",
	},
	leftPanel: {
		width: "260px",
		borderRight: "1px solid #ccc",
		backgroundColor: "#fff",
		display: "flex",
		flexDirection: "column",
	},
	elementSelector: {
		padding: "15px",
		borderBottom: "1px solid #ccc",
		textAlign: "center",
	},
	selectorHeader: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		gap: "10px",
		fontSize: "0.9rem",
	},
	elementDropdown: {
		padding: "4px 8px",
		border: "1px solid #ccc",
		borderRadius: "4px",
		fontSize: "0.9rem",
		backgroundColor: "#fff",
		cursor: "pointer",
		minWidth: "140px",
		textAlign: "center",
	},
	modeDropdown: {
		padding: "4px 8px",
		border: "1px solid #ccc",
		borderRadius: "4px",
		fontSize: "0.9rem",
		backgroundColor: "#fff",
		cursor: "pointer",
		minWidth: "180px",
		textAlign: "center",
	},
	elementName: {
		fontWeight: "500",
	},
	givenDates: {
		padding: "15px",
		borderBottom: "1px solid #ccc",
		flex: 1,
	},
	scheduledDates: {
		padding: "15px",
		flex: 1,
	},
	sectionTitle: {
		fontSize: "0.9rem",
		fontWeight: "500",
		marginBottom: "10px",
		textAlign: "center",
	},
	dateColumns: {
		display: "flex",
		marginBottom: "15px",
	},
	columnHeader: {
		flex: 1,
		textAlign: "center",
		fontSize: "0.9rem",
		fontWeight: "500",
		paddingBottom: "5px",
		borderBottom: "1px solid #ccc",
	},
	datePickerContainer: {
		display: "flex",
		flexDirection: "column",
		gap: "10px",
	},
	modeSelector: {
		display: "flex",
		gap: "12px",
		marginBottom: "10px",
	},
	modeLabel: {
		display: "flex",
		alignItems: "center",
		gap: "4px",
		fontSize: "0.8rem",
		color: "#333",
		cursor: "pointer",
	},
	radioInput: {
		margin: "0",
		cursor: "pointer",
	},
	datePicker: {
		padding: "8px",
		border: "1px solid #ccc",
		borderRadius: "4px",
		fontSize: "0.9rem",
		backgroundColor: "#fff",
		cursor: "pointer",
		width: "100%",
	},
	dateRangeContainer: {
		display: "flex",
		flexDirection: "column",
		gap: "8px",
	},
	dateRangeInputs: {
		display: "flex",
		alignItems: "center",
		gap: "4px",
		flexWrap: "wrap",
	},
	dateRangeInput: {
		padding: "6px",
		border: "1px solid #ccc",
		borderRadius: "4px",
		fontSize: "0.75rem",
		backgroundColor: "#fff",
		cursor: "pointer",
		minWidth: "100px",
		flex: 1,
	},
	dateRangeSeparator: {
		fontSize: "0.8rem",
		color: "#666",
		fontWeight: "500",
	},
	addRangeButton: {
		padding: "6px 12px",
		backgroundColor: "#007bff",
		color: "white",
		border: "none",
		borderRadius: "4px",
		fontSize: "0.8rem",
		cursor: "pointer",
		alignSelf: "flex-start",
		"&:disabled": {
			backgroundColor: "#ccc",
			cursor: "not-allowed",
		},
	},
	selectedDatesList: {
		display: "flex",
		flexDirection: "column",
		gap: "8px",
	},
	selectedDatesHeader: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		fontSize: "0.8rem",
		fontWeight: "500",
		color: "#333",
		marginBottom: "8px",
	},
	dateActions: {
		display: "flex",
		gap: "8px",
		alignItems: "center",
	},
	saveDatesButton: {
		background: "#28a745",
		color: "white",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
		fontSize: "0.7rem",
		fontWeight: "500",
		padding: "4px 8px",
		transition: "background-color 0.2s",
		"&:hover": {
			backgroundColor: "#218838",
		},
		"&:disabled": {
			backgroundColor: "#ccc",
			cursor: "not-allowed",
		},
	},
	clearAllButton: {
		background: "none",
		border: "none",
		cursor: "pointer",
		fontSize: "0.7rem",
		color: "#dc3545",
		textDecoration: "underline",
		padding: "2px 4px",
	},
	selectedDatesContainer: {
		display: "flex",
		flexDirection: "column",
		gap: "4px",
		maxHeight: "150px",
		overflowY: "auto",
	},
	selectedDateItem: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		padding: "6px 8px",
		backgroundColor: "#f8f9fa",
		borderRadius: "4px",
		border: "1px solid #e9ecef",
	},
	selectedDateText: {
		fontSize: "0.8rem",
		color: "#333",
	},
	removeDateButton: {
		background: "none",
		border: "none",
		cursor: "pointer",
		fontSize: "16px",
		fontWeight: "bold",
		color: "#dc3545",
		padding: "2px 6px",
		borderRadius: "3px",
		transition: "background-color 0.2s",
		"&:hover": {
			backgroundColor: "rgba(220, 53, 69, 0.1)",
		},
	},
	calendarPlaceholder: {
		fontSize: "0.8rem",
		color: "#999",
		textAlign: "center",
		padding: "20px 5px",
		fontStyle: "italic",
	},
	datesPlaceholder: {
		fontSize: "0.8rem",
		color: "#999",
		textAlign: "center",
		padding: "20px 5px",
		fontStyle: "italic",
	},
	centerPanel: {
		flex: 3,
		borderRight: "1px solid #ccc",
		backgroundColor: "#fff",
		display: "flex",
		flexDirection: "column",
		overflowY: "auto", // Make the central part scrollable
		overflowX: "hidden", // Remove horizontal scrolling
		maxHeight: "calc(100vh - 100px)", // Adjust height as needed
	},
	rightPanel: {
		flex: 1.5,
		backgroundColor: "#fff",
		display: "flex",
		flexDirection: "column",
		overflowY: "auto", // Make the central part scrollable
		overflowX: "hidden", // Remove horizontal scrolling
		maxHeight: "calc(100vh - 100px)", // Adjust height as needed
		// Make the central part scrollable
		// Remove horizontal scrolling
		// Adjust height as needed
	},
	chatContainer: {
		flex: 1,
		display: "flex",
		flexDirection: "column",
		padding: "15px",
	},
	chatMessages: {
		flex: 1,
		overflowY: "auto",
		marginBottom: "15px",
	},
	welcomeMessage: {
		backgroundColor: "#f8f9fa",
		padding: "15px",
		borderRadius: "8px",
		fontSize: "0.9rem",
		color: "#333",
		lineHeight: "1.4",
	},
	assistantList: {
		marginTop: "10px",
		paddingLeft: "20px",
		fontSize: "0.85rem",
		color: "#555",
	},
	chatInputContainer: {
		display: "flex",
		gap: "10px",
		padding: "10px",
		borderTop: "1px solid #eee",
	},
	chatInput: {
		flex: 1,
		padding: "8px 12px",
		border: "1px solid #ccc",
		borderRadius: "4px",
		fontSize: "0.9rem",
		"&:focus": {
			outline: "none",
			borderColor: "#007bff",
		},
	},
	sendButton: {
		padding: "8px 16px",
		backgroundColor: "#007bff",
		color: "white",
		border: "none",
		borderRadius: "4px",
		fontSize: "0.9rem",
		cursor: "pointer",
		"&:hover": {
			backgroundColor: "#0056b3",
		},
	},
	scheduleHeader: {
		padding: "15px",
		textAlign: "center",
		fontSize: "1rem",
		fontWeight: "500",
		borderBottom: "1px solid #ccc",
		backgroundColor: "#f8f9fa",
	},
	maxPagesSection: {
		padding: "20px",
		display: "flex",
		flexDirection: "row",
		alignItems: "center",
		gap: "4px",
		flexWrap: "wrap",
	},
	maxPagesUpper: {
		padding: "8px",
		display: "flex",
		flexDirection: "row",
		alignItems: "center",
		gap: "8px",
		flexWrap: "wrap",
	},
	maxPagesLabel: {
		fontSize: "0.9rem",
		color: "#333",
	},
	pageInput: {
		width: "40px",
		padding: "4px 6px",
		border: "1px solid #ccc",
		borderRadius: "3px",
		fontSize: "0.9rem",
		textAlign: "center",
	},
	generateButton: {
		padding: "6px 12px",
		backgroundColor: "#007bff",
		color: "white",
		border: "none",
		borderRadius: "3px",
		fontSize: "0.8rem",
		cursor: "pointer",
		fontWeight: "500",
	},
	emptyScheduleSection: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		flex: 1,
		padding: "40px 20px",
	},
	emptyScheduleMessage: {
		fontSize: "1.1rem",
		color: "#666",
		marginBottom: "30px",
		textAlign: "center",
	},
	scheduleContent: {
		flex: 1,
		padding: "20px",
		overflow: "auto",
	},
	scheduleDisplay: {
		fontSize: "0.9rem",
		lineHeight: "1.4",
		margin: 0,
		whiteSpace: "pre-wrap",
		wordWrap: "break-word",
	},
	existingDatesInfo: {
		marginBottom: "10px",
		padding: "8px",
		backgroundColor: "#e8f4f8",
		borderRadius: "4px",
		border: "1px solid #bee5eb",
	},
	existingDatesLabel: {
		fontSize: "0.75rem",
		color: "#0c5460",
		fontWeight: "500",
	},
	calendarContainer: {
		display: "flex",
		flexDirection: "column",
		gap: "8px",
	},
	calendarHeader: {
		textAlign: "center",
		fontSize: "0.9rem",
		fontWeight: "500",
		color: "#333",
		padding: "8px",
		backgroundColor: "#f8f9fa",
		borderRadius: "4px",
	},
	calendarGrid: {
		display: "flex",
		flexDirection: "column",
		gap: "4px",
	},
	calendarDaysHeader: {
		display: "grid",
		gridTemplateColumns: "repeat(7, 1fr)",
		gap: "2px",
	},
	calendarDayHeader: {
		textAlign: "center",
		fontSize: "0.7rem",
		fontWeight: "500",
		color: "#666",
		padding: "4px",
	},
	calendarDaysGrid: {
		display: "grid",
		gridTemplateColumns: "repeat(7, 1fr)",
		gap: "2px",
	},
	calendarDay: {
		textAlign: "center",
		fontSize: "0.7rem",
		padding: "6px 4px",
		borderRadius: "3px",
		cursor: "pointer",
		border: "1px solid #e9ecef",
		backgroundColor: "#fff",
		transition: "all 0.2s",
		"&:hover": {
			backgroundColor: "#f8f9fa",
		},
	},
	calendarDaySingleSelected: {
		backgroundColor: "#28a745",
		color: "white",
		border: "1px solid #28a745",
		"&:hover": {
			backgroundColor: "#218838",
		},
	},
	addButton: {
		padding: "8px 16px",
		backgroundColor: "#007bff",
		color: "white",
		border: "none",
		borderRadius: "4px",
		fontSize: "0.9rem",
		cursor: "pointer",
	},
	removeButton: {
		padding: "4px 8px",
		backgroundColor: "#dc3545",
		color: "white",
		border: "none",
		borderRadius: "4px",
		fontSize: "0.8rem",
		cursor: "pointer",
		":disabled": {
			backgroundColor: "#ccc",
			cursor: "not-allowed",
		},
	},

	calendarDayRangeSelected: {
		backgroundColor: "#007bff",
		color: "white",
		border: "1px solid #007bff",
		"&:hover": {
			backgroundColor: "#0056b3",
		},
	},
	calendarDayOtherMonth: {
		color: "#ccc",
		backgroundColor: "#f8f9fa",
	},
	calendarDayDisabled: {
		backgroundColor: "#f8f9fa",
		color: "#ccc",
		cursor: "not-allowed",
		"&:hover": {
			backgroundColor: "#f8f9fa",
		},
	},
	calendarDayScheduled: {
		backgroundColor: "#ffc107",
		color: "#212529",
		border: "1px solid #ffc107",
		fontWeight: "500",
	},
	scheduledCalendarContainer: {
		display: "flex",
		flexDirection: "column",
		gap: "8px",
	},
	messageContainer: {
		padding: "12px",
		marginBottom: "12px",
		borderRadius: "8px",
		maxWidth: "85%",
	},
	userMessage: {
		backgroundColor: "#007bff",
		color: "white",
		marginLeft: "auto",
	},
	assistantMessage: {
		backgroundColor: "#f8f9fa",
		color: "#333",
		marginRight: "auto",
		border: "1px solid #dee2e6",
	},
	errorMessage: {
		backgroundColor: "#dc3545",
		color: "white",
		marginRight: "auto",
	},
	messageContent: {
		fontSize: "0.9rem",
		lineHeight: "1.4",
		marginBottom: "4px",
	},
	messageTimestamp: {
		fontSize: "0.7rem",
		opacity: 0.8,
		marginTop: "4px",
	},
	constraintsContainer: {
		marginTop: "8px",
		padding: "8px",
		backgroundColor: "rgba(0, 0, 0, 0.05)",
		borderRadius: "4px",
	},
	constraintsHeader: {
		fontSize: "0.8rem",
		fontWeight: "500",
		marginBottom: "4px",
	},
	constraints: {
		fontSize: "0.8rem",
		margin: 0,
		whiteSpace: "pre-wrap",
		wordWrap: "break-word",
	},
	sendButtonDisabled: {
		backgroundColor: "#ccc",
		cursor: "not-allowed",
		"&:hover": {
			backgroundColor: "#ccc",
		},
	},
	editButton: {
		padding: "8px 16px",
		backgroundColor: "#007bff",
		color: "white",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
	},
	saveButton: {
		padding: "8px 16px",
		backgroundColor: "#28a745",
		color: "white",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
	},
	cancelButton: {
		padding: "8px 16px",
		backgroundColor: "#dc3545",
		color: "white",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
	},
	locationSynopsisColumn: {
		width: "30%",
	},
	// New styles for schedule table
	tableStyle: {
		width: "95%",

		borderCollapse: "collapse",
		marginTop: "10px",
		border: "2px solid #555", // Bold outer border
		fontSize: "0.65rem", // Reduced font size for table content
		tableLayout: "fixed", // Use fixed table layout
	},
	thStyle: {
		border: "none", // Remove inner borders
		padding: "8px",
		textAlign: "left",
		fontSize: "0.85rem", // Reduced font size for headers
		backgroundColor: "#e0e0e0",
	},
	trStyle: {
		backgroundColor: "#ffffffff", // Greyish background for rows
		borderBottom: "2px solid #ccc", // Add a subtle bottom border to each row
	},
	tdStyle: {
		border: "none", // Remove inner borders
		padding: "7px",
		margin: "3px",
		fontSize: "0.85rem", // Reduced font size for cells
	},
	highlight: {
		background: "#007bff !important",
		color: " white ",
		borderRadius: "50%",
	},
};
export default ManageSchedules;
