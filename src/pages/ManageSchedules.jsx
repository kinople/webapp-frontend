import ProjectHeader from "../components/ProjectHeader";
import { useNavigate, useParams } from "react-router-dom";
import { eachDayOfInterval, format } from "date-fns";
import { useState, useEffect, useMemo, useRef } from "react";
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
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { FaFileExcel } from "react-icons/fa";

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

// Draggable scene card for unscheduled scenes
const UnscheduledSceneCard = ({ scene, isEditing, characterNameToIdMap }) => {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: scene.id,
		disabled: !isEditing,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		cursor: isEditing ? "grab" : "default",
		userSelect: "none",
		opacity: isDragging ? 0.5 : 1,
	};

	return (
		<tr ref={setNodeRef} style={style} className="sched-data-row sched-unscheduled-drag-row" {...attributes} {...listeners}>
			<td className="sched-data-cell sched-unscheduled-scene-number">{scene.scene_number}</td>
			<td className="sched-data-cell">{scene.int_ext || "N/A"}</td>
			<td className="sched-data-cell sched-location-synopsis-column">
				{scene.location_name} <br /> <br />
				Synopsis: {scene.synopsis || "N/A"}
			</td>
			<td className="sched-data-cell">{formatPageEights(scene.page_eighths) || "N/A"}</td>
			<td className="sched-data-cell">{(scene.character_names || []).map((name) => characterNameToIdMap[name.toUpperCase()] || name).join(", ")}</td>
		</tr>
	);
};

function findContainer(days, id, unscheduledScenesWithIds = []) {
	// Check if it's the unscheduled container itself
	if (id === "unscheduled") {
		return { id: "unscheduled", scenes: unscheduledScenesWithIds };
	}

	// Check if scene is in unscheduled scenes
	if (unscheduledScenesWithIds.find((scene) => scene.id === id)) {
		return { id: "unscheduled", scenes: unscheduledScenesWithIds };
	}

	// Check scheduled days
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

	// Generate Schedule Modal state
	const [showGenerateModal, setShowGenerateModal] = useState(false);
	const [scheduleStartDate, setScheduleStartDate] = useState("");
	const [scheduleEndDate, setScheduleEndDate] = useState("");
	const [modalElementType, setModalElementType] = useState("character");
	const [modalElement, setModalElement] = useState("");
	const [modalSelectedDates, setModalSelectedDates] = useState([]);
	const [modalDatePickerMode, setModalDatePickerMode] = useState("flexible");
	const [modalDatePickerValue, setModalDatePickerValue] = useState("range");
	const [modalDateRangeStart, setModalDateRangeStart] = useState("");
	const [modalDateRangeEnd, setModalDateRangeEnd] = useState("");
	const [modalIsSaving, setModalIsSaving] = useState(false);
	const [modalUnavailableMode, setModalUnavailableMode] = useState(false);
	const modalContentRef = useRef(null);
	const doodContentRef = useRef(null);
	const doodGridRef = useRef(null);

	// DOOD Modal state
	const [showDoodModal, setShowDoodModal] = useState(false);
	const [doodElementType, setDoodElementType] = useState("character");
	const [doodData, setDoodData] = useState({}); // { elementName: { id, dates: [], flexible: bool } }
	const [doodIsSaving, setDoodIsSaving] = useState(false);
	const [doodStartDate, setDoodStartDate] = useState("");
	const [doodEndDate, setDoodEndDate] = useState("");

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

	// Generate Schedule Modal Component
	const GenerateScheduleModal = () => {
		if (!showGenerateModal) return null;

		// Check for elements with dates outside the schedule range
		const getElementsWithInvalidDates = () => {
			if (!scheduleStartDate || !scheduleEndDate || !scheduleData?.dates) {
				return { characters: [], locations: [] };
			}

			const startDate = new Date(scheduleStartDate);
			const endDate = new Date(scheduleEndDate);
			const invalidCharacters = [];
			const invalidLocations = [];

			const isDateOutOfRange = (dateStr) => {
				dateStr = dateStr.trim();
				if (dateStr.includes("-") && dateStr.split("-").length === 6) {
					// Date range format: YYYY-MM-DD-YYYY-MM-DD
					const parts = dateStr.split("-");
					const rangeStart = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
					const rangeEnd = new Date(`${parts[3]}-${parts[4]}-${parts[5]}`);
					return rangeStart < startDate || rangeEnd > endDate;
				} else {
					// Single date
					const date = new Date(dateStr);
					return date < startDate || date > endDate;
				}
			};

			// Check characters
			const characterDates = scheduleData.dates.characters || {};
			Object.entries(characterDates).forEach(([charName, charData]) => {
				const dates = charData?.dates || (Array.isArray(charData) ? charData : []);
				for (const dateStr of dates) {
					if (dateStr && isDateOutOfRange(dateStr)) {
						invalidCharacters.push(charName);
						break;
					}
				}
			});

			// Check locations
			const locationDates = scheduleData.dates.locations || {};
			Object.entries(locationDates).forEach(([locName, locData]) => {
				const dates = locData?.dates || (Array.isArray(locData) ? locData : []);
				for (const dateStr of dates) {
					if (dateStr && isDateOutOfRange(dateStr)) {
						invalidLocations.push(locName);
						break;
					}
				}
			});

			return { characters: invalidCharacters, locations: invalidLocations };
		};

		const elementsWithInvalidDates = getElementsWithInvalidDates();
		const hasInvalidDates = elementsWithInvalidDates.characters.length > 0 || elementsWithInvalidDates.locations.length > 0;

		const getModalElementOptions = (type) => {
			const options = [];
			if (type === "character") {
				const addedCharacters = new Set();
				castList.forEach((cast) => {
					const normalizedName = cast.character?.toUpperCase();
					if (normalizedName && !addedCharacters.has(normalizedName)) {
						addedCharacters.add(normalizedName);
						options.push({
							value: cast.character,
							label: `👤 ${cast.character}`,
							cast_id: cast.cast_id,
						});
					}
				});
			} else if (type === "location" && locationList.length > 0) {
				locationList.forEach((loc) => {
					options.push({
						value: loc.location,
						label: `📍 ${loc.location}`,
						location_id: loc.location_id,
					});
				});
			}
			return options;
		};

		const handleModalElementChange = (value) => {
			// Preserve scroll position
			const scrollTop = modalContentRef.current?.scrollTop;

			setModalElement(value);
			setModalDateRangeStart("");
			setModalDateRangeEnd("");

			// Helper to filter dates within schedule range
			const filterDatesInRange = (dates) => {
				if (!scheduleStartDate || !scheduleEndDate || !dates || dates.length === 0) return dates;
				const startDate = new Date(scheduleStartDate);
				const endDate = new Date(scheduleEndDate);
				return dates.filter((dateStr) => {
					const date = new Date(dateStr);
					return date >= startDate && date <= endDate;
				});
			};

			if (value && scheduleData?.dates) {
				const datesSection = modalElementType === "location" ? "locations" : "characters";
				const elementData = scheduleData.dates[datesSection]?.[value];

				if (elementData?.dates && elementData.dates.length > 0) {
					const existingDates = parseDateRanges(elementData.dates);
					setModalSelectedDates(filterDatesInRange(existingDates));
				} else {
					let lockedDates = [];
					if (modalElementType === "character") {
						const selectedChar = castList.find((cast) => cast.character === value);
						if (selectedChar && selectedChar.locked !== -1 && selectedChar.locked !== "-1") {
							const castOptions = selectedChar.cast_options || {};
							const lockedOption = castOptions[String(selectedChar.locked)];
							if (lockedOption) {
								lockedDates = lockedOption.available_dates || lockedOption.availableDates || [];
							}
						}
					} else if (modalElementType === "location") {
						const selectedLoc = locationList.find((loc) => loc.location === value);
						if (selectedLoc && selectedLoc.locked !== -1 && selectedLoc.locked !== "-1") {
							const locationOptions = selectedLoc.location_options || {};
							const lockedOption = locationOptions[String(selectedLoc.locked)];
							if (lockedOption) {
								lockedDates = lockedOption.available_dates || lockedOption.availableDates || [];
							}
						}
					}

					if (lockedDates.length > 0) {
						setModalSelectedDates(filterDatesInRange(lockedDates));
					} else {
						setModalSelectedDates([]);
					}
				}
			} else {
				setModalSelectedDates([]);
			}

			// Restore scroll position after state update
			requestAnimationFrame(() => {
				if (modalContentRef.current && scrollTop !== undefined) {
					modalContentRef.current.scrollTop = scrollTop;
				}
			});
		};

		const handleModalElementTypeChange = (value) => {
			// Preserve scroll position
			const scrollTop = modalContentRef.current?.scrollTop;

			setModalElementType(value);
			setModalElement("");
			setModalSelectedDates([]);

			// Restore scroll position after state update
			requestAnimationFrame(() => {
				if (modalContentRef.current && scrollTop !== undefined) {
					modalContentRef.current.scrollTop = scrollTop;
				}
			});
		};

		const handleModalDatePickerModeChange = (value) => {
			// Preserve scroll position
			const scrollTop = modalContentRef.current?.scrollTop;

			setModalDatePickerMode(value);

			// Restore scroll position after state update
			requestAnimationFrame(() => {
				if (modalContentRef.current && scrollTop !== undefined) {
					modalContentRef.current.scrollTop = scrollTop;
				}
			});
		};

		const handleModalDatePickerValueChange = (value) => {
			// Preserve scroll position
			const scrollTop = modalContentRef.current?.scrollTop;

			setModalDatePickerValue(value);

			// Restore scroll position after state update
			requestAnimationFrame(() => {
				if (modalContentRef.current && scrollTop !== undefined) {
					modalContentRef.current.scrollTop = scrollTop;
				}
			});
		};

		const handleModalDateRangeStartChange = (value) => {
			// Preserve scroll position
			const scrollTop = modalContentRef.current?.scrollTop;

			setModalDateRangeStart(value);

			// Restore scroll position after state update
			requestAnimationFrame(() => {
				if (modalContentRef.current && scrollTop !== undefined) {
					modalContentRef.current.scrollTop = scrollTop;
				}
			});
		};

		const handleModalDateRangeEndChange = (value) => {
			// Preserve scroll position
			const scrollTop = modalContentRef.current?.scrollTop;

			setModalDateRangeEnd(value);

			// Restore scroll position after state update
			requestAnimationFrame(() => {
				if (modalContentRef.current && scrollTop !== undefined) {
					modalContentRef.current.scrollTop = scrollTop;
				}
			});
		};

		const handleModalClearDates = () => {
			// Preserve scroll position
			const scrollTop = modalContentRef.current?.scrollTop;

			setModalSelectedDates([]);

			// Restore scroll position after state update
			requestAnimationFrame(() => {
				if (modalContentRef.current && scrollTop !== undefined) {
					modalContentRef.current.scrollTop = scrollTop;
				}
			});
		};

		const handleModalUnavailableModeChange = (isUnavailable) => {
			// Preserve scroll position
			const scrollTop = modalContentRef.current?.scrollTop;

			handleModalDatePickerModeChange("fixed");
			setModalUnavailableMode(isUnavailable);
			if (isUnavailable) {
				setModalSelectedDates([]);
			}

			// Restore scroll position after state update
			requestAnimationFrame(() => {
				if (modalContentRef.current && scrollTop !== undefined) {
					modalContentRef.current.scrollTop = scrollTop;
				}
			});
		};

		const handleModalCalendarDateClick = (date) => {
			const dateStr = date.toLocaleDateString("en-CA").split("T")[0];

			// Check if date is within start_date and end_date range
			if (scheduleStartDate && dateStr < scheduleStartDate) {
				alert("Cannot select dates before the schedule start date");
				return;
			}
			if (scheduleEndDate && dateStr > scheduleEndDate) {
				alert("Cannot select dates after the schedule end date");
				return;
			}

			// Preserve scroll position
			const scrollTop = modalContentRef.current?.scrollTop;

			setModalSelectedDates((prev) => {
				if (prev.includes(dateStr)) {
					return prev.filter((d) => d !== dateStr);
				} else {
					return [...prev, dateStr].sort();
				}
			});

			// Restore scroll position after state update
			requestAnimationFrame(() => {
				if (modalContentRef.current && scrollTop !== undefined) {
					modalContentRef.current.scrollTop = scrollTop;
				}
			});
		};

		const handleModalSingleDateChange = (e) => {
			const selectedDate = e.target.value;
			if (!selectedDate) return;

			// Check if date is within start_date and end_date range
			if (scheduleStartDate && selectedDate < scheduleStartDate) {
				alert("Cannot select dates before the schedule start date");
				return;
			}
			if (scheduleEndDate && selectedDate > scheduleEndDate) {
				alert("Cannot select dates after the schedule end date");
				return;
			}

			// Preserve scroll position
			const scrollTop = modalContentRef.current?.scrollTop;

			setModalSelectedDates((prev) => {
				if (prev.includes(selectedDate)) {
					return prev;
				} else {
					return [...prev, selectedDate].sort();
				}
			});

			// Restore scroll position after state update
			requestAnimationFrame(() => {
				if (modalContentRef.current && scrollTop !== undefined) {
					modalContentRef.current.scrollTop = scrollTop;
				}
			});
		};

		const modalTileClassName = ({ date, view }) => {
			if (view === "month") {
				const formattedDate = date.toLocaleDateString("en-CA").split("T")[0];

				// Check if date is outside the schedule range
				if (scheduleStartDate && formattedDate < scheduleStartDate) {
					return "disabled-date";
				}
				if (scheduleEndDate && formattedDate > scheduleEndDate) {
					return "disabled-date";
				}

				if (modalSelectedDates.includes(formattedDate)) {
					return "highlight-blue";
				}
			}
		};

		const modalTileDisabled = ({ date, view }) => {
			if (view === "month") {
				const formattedDate = date.toLocaleDateString("en-CA").split("T")[0];
				if (scheduleStartDate && formattedDate < scheduleStartDate) {
					return true;
				}
				if (scheduleEndDate && formattedDate > scheduleEndDate) {
					return true;
				}
			}
			return false;
		};

		const addModalDateRange = () => {
			if (!modalDateRangeStart || !modalDateRangeEnd) {
				alert("Please select both start and end dates for the range");
				return;
			}

			// Validate against schedule start/end dates
			if (scheduleStartDate && modalDateRangeStart < scheduleStartDate) {
				alert("Range start date cannot be before schedule start date");
				return;
			}
			if (scheduleEndDate && modalDateRangeEnd > scheduleEndDate) {
				alert("Range end date cannot be after schedule end date");
				return;
			}

			if (modalDateRangeStart > modalDateRangeEnd) {
				alert("Start date must be before end date");
				return;
			}

			// Preserve scroll position
			const scrollTop = modalContentRef.current?.scrollTop;

			const rangeDates = [];
			const currentDate = new Date(modalDateRangeStart);
			const endDate = new Date(modalDateRangeEnd);

			while (currentDate <= endDate) {
				rangeDates.push(currentDate.toISOString().split("T")[0]);
				currentDate.setDate(currentDate.getDate() + 1);
			}

			setModalSelectedDates(rangeDates);
			setModalDateRangeStart("");
			setModalDateRangeEnd("");

			// Restore scroll position after state update
			requestAnimationFrame(() => {
				if (modalContentRef.current && scrollTop !== undefined) {
					modalContentRef.current.scrollTop = scrollTop;
				}
			});
		};

		const handleModalSaveDates = async (flexible = false) => {
			if (!modalElement) {
				alert("Please select an element");
				return;
			}

			try {
				setModalIsSaving(true);
				const datesSection = modalElementType === "location" ? "locations" : "characters";
				const elementData = scheduleData.dates?.[datesSection]?.[modalElement];

				if (!elementData || !elementData.id) {
					throw new Error(`Could not find data for ${modalElementType} "${modalElement}"`);
				}

				const elementId = elementData.id;

				// Calculate dates to send - if unavailable mode, compute available dates
				let datesToSend = modalSelectedDates;
				if (!flexible && modalUnavailableMode && scheduleStartDate && scheduleEndDate) {
					// Generate all dates between start and end
					const allDates = [];
					const start = new Date(scheduleStartDate);
					const end = new Date(scheduleEndDate);
					const current = new Date(start);
					while (current <= end) {
						allDates.push(current.toISOString().split("T")[0]);
						current.setDate(current.getDate() + 1);
					}
					// Available dates = all dates - unavailable dates (modalSelectedDates)
					const unavailableSet = new Set(modalSelectedDates);
					datesToSend = allDates.filter((date) => !unavailableSet.has(date));
				}
				console.log("sending dates ::: ", datesToSend);
				const response = await fetch(getApiUrl(`/api/${id}/schedule/${scheduleId}/dates`), {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						element_type: modalElementType,
						element_name: modalElement,
						element_id: elementId,
						flexible: flexible,
						dates: flexible ? [] : datesToSend,
					}),
				});

				if (!response.ok) {
					throw new Error("Failed to save dates");
				}

				alert("Dates saved successfully!");
				fetchScheduleData();
			} catch (error) {
				console.error("Error saving dates:", error);
				alert("Failed to save dates: " + error.message);
			} finally {
				setModalIsSaving(false);
			}
		};

		const handleModalGenerate = async () => {
			if (!scheduleStartDate || !scheduleEndDate) {
				alert("Please select both start and end dates for the schedule");
				return;
			}

			if (scheduleStartDate > scheduleEndDate) {
				alert("Start date must be before end date");
				return;
			}

			let payload = {
				start_date: scheduleStartDate,
				last_date: scheduleEndDate,
			};
			let alertMessage = "";

			if (scheduleMode === "scenes") {
				if (!maxScenes || isNaN(maxScenes) || maxScenes <= 0) {
					alertMessage = "Please enter a valid number of scenes per day";
				} else {
					payload.max_scenes_per_day = parseInt(maxScenes);
				}
			} else if (scheduleMode === "page-eights") {
				const pages = parseInt(maxPageEights.pages, 10) || 0;
				const eighths = parseInt(maxPageEights.eighths, 10) || 0;
				const totalEighths = pages * 8 + eighths;
				if (totalEighths <= 0) {
					alertMessage = "Please enter a valid number of page-eights per day";
				} else {
					payload.max_page_eighths_per_day = totalEighths;
				}
			} else if (scheduleMode === "hours") {
				const parsedHours = parseHours(maxHours);
				if (!HoursSaved) {
					alertMessage = "Please save Hours for each scene before generating schedule";
				}
				if (parsedHours <= 0) {
					alertMessage = "Please enter a valid number of hours per day";
				} else {
					payload.max_hours_per_day = parsedHours;
				}
			}

			if (alertMessage) {
				alert(alertMessage);
				return;
			}

			try {
				setShowGenerateModal(false);
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

		return (
			<div className="sched-conflicts-modal-overlay" onClick={() => setShowGenerateModal(false)}>
				<div className="sched-generate-modal" ref={modalContentRef} onClick={(e) => e.stopPropagation()}>
					<div className="sched-conflicts-modal-header">
						<h2 className="sched-conflicts-modal-heading">Generate Schedule</h2>
						<button className="sched-conflicts-modal-close-button" onClick={() => setShowGenerateModal(false)}>
							×
						</button>
					</div>

					<div className="sched-generate-modal-content">
						{/* Schedule Date Range Section */}
						<div className="sched-generate-section">
							<h3 className="sched-section-title">Schedule Date Range</h3>
							<div className="sched-date-range-container">
								<div className="sched-date-range-inputs">
									<label className="sched-controls-label">
										Start Date:
										<input
											type="date"
											value={scheduleStartDate}
											onChange={(e) => setScheduleStartDate(e.target.value)}
											className="sched-date-range-input"
										/>
									</label>
									<span className="sched-date-range-separator">to</span>
									<label className="sched-controls-label">
										End Date:
										<input
											type="date"
											value={scheduleEndDate}
											min={scheduleStartDate}
											onChange={(e) => setScheduleEndDate(e.target.value)}
											className="sched-date-range-input"
										/>
									</label>
								</div>
							</div>
						</div>

						{/* Warning: Elements with dates outside range */}
						{hasInvalidDates && (
							<div className="sched-generate-section sched-invalid-dates-warning">
								<h3 className="sched-section-title" style={{ color: "#e74c3c" }}>
									⚠️ Dates Need Update
								</h3>
								<p style={{ color: "#e74c3c", marginBottom: "10px", fontSize: "14px" }}>
									The following elements have saved dates outside the schedule range. Please update their dates before generating the
									schedule:
								</p>
								{elementsWithInvalidDates.characters.length > 0 && (
									<div style={{ marginBottom: "8px" }}>
										<strong>Characters:</strong>{" "}
										<span style={{ color: "#c0392b" }}>{elementsWithInvalidDates.characters.join(", ")}</span>
									</div>
								)}
								{elementsWithInvalidDates.locations.length > 0 && (
									<div>
										<strong>Locations:</strong>{" "}
										<span style={{ color: "#c0392b" }}>{elementsWithInvalidDates.locations.join(", ")}</span>
									</div>
								)}
							</div>
						)}

						{/* Max Scenes Per Day Section */}
						<div className="sched-generate-section">
							<h3 className="sched-section-title">Scheduling Constraint</h3>
							<div className="sched-controls-group">
								<label className="sched-controls-label">
									Max Scenes Per Day:
									<input
										type="number"
										value={maxScenes}
										onChange={(e) => setMaxScenes(e.target.value)}
										className="sched-page-input"
										placeholder="5"
										min="1"
										style={{ marginLeft: "10px", width: "80px" }}
									/>
								</label>
							</div>
						</div>

						{/* Character/Location Availability Section */}
						{scheduleStartDate && scheduleEndDate && (
							<div className="sched-generate-section">
								<h3 className="sched-section-title">Set Availability Dates</h3>
								<div className="sched-element-selector">
									<div className="sched-selector-header">
										<select
											value={modalElementType}
											onChange={(e) => handleModalElementTypeChange(e.target.value)}
											className="sched-element-dropdown"
										>
											<option value="character">Characters</option>
											<option value="location">Sets</option>
										</select>
									</div>
									<div className="sched-selector-header sched-selector-header-margin">
										<select
											value={modalElement}
											onChange={(e) => handleModalElementChange(e.target.value)}
											className="sched-element-dropdown"
										>
											<option value="">Select Element</option>
											{getModalElementOptions(modalElementType).map((option, index) => (
												<option key={index} value={option.value}>
													{option.label}
												</option>
											))}
										</select>
									</div>
								</div>

								{modalElement && (
									<div className="sched-date-picker-container">
										{/* First level: Flexible / Fixed */}
										<div className="sched-mode-selector">
											<label className="sched-mode-label">
												<input
													type="radio"
													value="flexible"
													checked={modalDatePickerMode === "flexible"}
													onChange={(e) => handleModalDatePickerModeChange(e.target.value)}
													className="sched-radio-input"
												/>
												Flexible Dates
											</label>
											<label className="sched-mode-label">
												<input
													type="radio"
													value="fixed"
													checked={modalDatePickerMode === "fixed"}
													onChange={(e) => handleModalDatePickerModeChange(e.target.value)}
													className="sched-radio-input"
												/>
												Fixed Dates
											</label>
										</div>

										{modalDatePickerMode === "flexible" && (
											<button
												onClick={() => handleModalSaveDates(true)}
												className="sched-add-range-button"
												disabled={modalIsSaving}
											>
												{modalIsSaving ? "Saving..." : "Save Flexible Dates"}
											</button>
										)}

										{modalDatePickerMode === "fixed" && (
											<>
												{/* Second level: Available / Unavailable */}
												<div className="sched-mode-selector">
													<label className="sched-mode-label">
														<input
															type="radio"
															value="available"
															checked={!modalUnavailableMode}
															onChange={() => handleModalUnavailableModeChange(false)}
															className="sched-radio-input"
														/>
														Available Dates
													</label>
													<label className="sched-mode-label">
														<input
															type="radio"
															value="unavailable"
															checked={modalUnavailableMode}
															onChange={() => handleModalUnavailableModeChange(true)}
															className="sched-radio-input"
														/>
														Unavailable Dates
													</label>
												</div>

												{/* Third level: Range / Single */}
												<div className="sched-mode-selector">
													<label className="sched-mode-label">
														<input
															type="radio"
															value="range"
															checked={modalDatePickerValue === "range"}
															onChange={(e) => handleModalDatePickerValueChange(e.target.value)}
															className="sched-radio-input"
														/>
														Range
													</label>
													<label className="sched-mode-label">
														<input
															type="radio"
															value="single"
															checked={modalDatePickerValue === "single"}
															onChange={(e) => handleModalDatePickerValueChange(e.target.value)}
															className="sched-radio-input"
														/>
														Single
													</label>
												</div>

												{modalDatePickerValue === "range" && (
													<div className="sched-date-range-container">
														<div className="sched-date-range-inputs">
															<input
																type="date"
																value={modalDateRangeStart}
																min={scheduleStartDate}
																max={scheduleEndDate}
																onChange={(e) => handleModalDateRangeStartChange(e.target.value)}
																className="sched-date-range-input"
																placeholder="Start Date"
															/>
															<span className="sched-date-range-separator">to</span>
															<input
																type="date"
																value={modalDateRangeEnd}
																min={modalDateRangeStart || scheduleStartDate}
																max={scheduleEndDate}
																onChange={(e) => handleModalDateRangeEndChange(e.target.value)}
																className="sched-date-range-input"
																placeholder="End Date"
															/>
														</div>
														<button
															onClick={addModalDateRange}
															className="sched-add-range-button"
															disabled={!modalDateRangeStart || !modalDateRangeEnd}
														>
															Add Range
														</button>
													</div>
												)}

												{modalDatePickerValue === "single" && (
													<input
														type="date"
														min={scheduleStartDate}
														max={scheduleEndDate}
														onChange={handleModalSingleDateChange}
														className="sched-date-picker"
													/>
												)}

												{/* Always show calendar when Fixed is selected */}
												<div className="sched-selected-dates-list">
													<div className="sched-selected-dates-header">
														<span>
															{modalUnavailableMode ? "Unavailable" : "Selected"} Dates (
															{modalSelectedDates.length}):
														</span>
														<div className="sched-date-actions">
															<button
																onClick={() => handleModalSaveDates(false)}
																className="sched-save-dates-button"
																disabled={modalIsSaving}
															>
																{modalIsSaving ? "Saving..." : "Save Dates"}
															</button>
															<button onClick={handleModalClearDates} className="sched-clear-all-button">
																Clear All
															</button>
														</div>
													</div>
													<div className="sched-calendar-container">
														<Calendar
															selectRange={false}
															onClickDay={handleModalCalendarDateClick}
															tileClassName={modalTileClassName}
															tileDisabled={modalTileDisabled}
														/>
													</div>
												</div>
											</>
										)}
									</div>
								)}
							</div>
						)}

						{/* Generate Button */}
						<div className="sched-generate-section sched-generate-actions">
							<button
								className="sched-generate-button sched-generate-modal-btn"
								onClick={handleModalGenerate}
								disabled={!scheduleStartDate || !scheduleEndDate}
							>
								GENERATE SCHEDULE
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	};

	// DOOD (Day Out Of Days) Modal Component
	const DoodModal = () => {
		if (!showDoodModal) return null;

		// Generate array of dates between start and end
		const generateDateColumns = () => {
			if (!doodStartDate || !doodEndDate) return [];
			const dates = [];
			const start = new Date(doodStartDate);
			const end = new Date(doodEndDate);
			const current = new Date(start);
			while (current <= end) {
				dates.push(current.toISOString().split("T")[0]);
				current.setDate(current.getDate() + 1);
			}
			return dates;
		};

		const dateColumns = generateDateColumns();

		// Get elements based on selected type
		const getElements = () => {
			if (doodElementType === "character") {
				const elements = [];
				const addedCharacters = new Set();
				castList.forEach((cast) => {
					const normalizedName = cast.character?.toUpperCase();
					if (normalizedName && !addedCharacters.has(normalizedName)) {
						addedCharacters.add(normalizedName);
						elements.push({
							name: cast.character,
							id: cast.cast_id,
						});
					}
				});
				return elements;
			} else {
				return locationList.map((loc) => ({
					name: loc.location,
					id: loc.location_id,
				}));
			}
		};

		const elements = getElements();

		// Initialize doodData when modal opens or element type changes
		const initializeDoodData = () => {
			const newData = {};
			const datesSection = doodElementType === "character" ? "characters" : "locations";

			elements.forEach((elem) => {
				const existingData = scheduleData?.dates?.[datesSection]?.[elem.name];
				const existingDates = existingData?.dates || (Array.isArray(existingData) ? existingData : []);
				const isFlexible = scheduleData?.dates?.flexible?.[datesSection]?.[elem.id] || false;

				newData[elem.name] = {
					id: elem.id,
					dates: parseDateRanges(existingDates),
					flexible: isFlexible,
				};
			});
			setDoodData(newData);
		};

		// Check if a cell is selected (date is available)
		const isCellSelected = (elementName, date) => {
			return doodData[elementName]?.dates?.includes(date) || false;
		};

		// Check if element is flexible
		const isElementFlexible = (elementName) => {
			return doodData[elementName]?.flexible || false;
		};

		// Toggle a single cell
		const toggleCell = (elementName, date) => {
			if (isElementFlexible(elementName)) return; // Can't toggle if flexible

			const scrollTop = doodGridRef.current?.scrollTop;
			const scrollLeft = doodGridRef.current?.scrollLeft;
			setDoodData((prev) => {
				const current = prev[elementName] || { id: null, dates: [], flexible: false };
				const dates = current.dates || [];
				const newDates = dates.includes(date) ? dates.filter((d) => d !== date) : [...dates, date].sort();

				return {
					...prev,
					[elementName]: {
						...current,
						dates: newDates,
					},
				};
			});
			setTimeout(() => {
				if (doodGridRef.current) {
					if (scrollTop !== undefined) doodGridRef.current.scrollTop = scrollTop;
					if (scrollLeft !== undefined) doodGridRef.current.scrollLeft = scrollLeft;
				}
			}, 0);
		};

		// Toggle flexible mode for an element
		const toggleFlexible = (elementName) => {
			const scrollTop = doodGridRef.current?.scrollTop;
			const scrollLeft = doodGridRef.current?.scrollLeft;
			setDoodData((prev) => {
				const current = prev[elementName] || { id: null, dates: [], flexible: false };
				return {
					...prev,
					[elementName]: {
						...current,
						flexible: !current.flexible,
						dates: !current.flexible ? [] : current.dates, // Clear dates when setting flexible
					},
				};
			});
			setTimeout(() => {
				if (doodGridRef.current) {
					if (scrollTop !== undefined) doodGridRef.current.scrollTop = scrollTop;
					if (scrollLeft !== undefined) doodGridRef.current.scrollLeft = scrollLeft;
				}
			}, 0);
		};

		// Select all dates for an element
		const selectAllDates = (elementName) => {
			if (isElementFlexible(elementName)) return;

			const scrollTop = doodGridRef.current?.scrollTop;
			const scrollLeft = doodGridRef.current?.scrollLeft;
			setDoodData((prev) => {
				const current = prev[elementName] || { id: null, dates: [], flexible: false };
				return {
					...prev,
					[elementName]: {
						...current,
						dates: [...dateColumns],
					},
				};
			});
			setTimeout(() => {
				if (doodGridRef.current) {
					if (scrollTop !== undefined) doodGridRef.current.scrollTop = scrollTop;
					if (scrollLeft !== undefined) doodGridRef.current.scrollLeft = scrollLeft;
				}
			}, 0);
		};

		// Clear all dates for an element
		const clearAllDates = (elementName) => {
			if (isElementFlexible(elementName)) return;

			const scrollTop = doodGridRef.current?.scrollTop;
			const scrollLeft = doodGridRef.current?.scrollLeft;
			setDoodData((prev) => {
				const current = prev[elementName] || { id: null, dates: [], flexible: false };
				return {
					...prev,
					[elementName]: {
						...current,
						dates: [],
					},
				};
			});
			setTimeout(() => {
				if (doodGridRef.current) {
					if (scrollTop !== undefined) doodGridRef.current.scrollTop = scrollTop;
					if (scrollLeft !== undefined) doodGridRef.current.scrollLeft = scrollLeft;
				}
			}, 0);
		};

		// Save all DOOD data
		const handleDoodSave = async () => {
			try {
				setDoodIsSaving(true);

				const payload = {
					characters: {},
					locations: {},
					start_date: doodStartDate,
					end_date: doodEndDate,
				};

				const targetKey = doodElementType === "character" ? "characters" : "locations";

				Object.entries(doodData).forEach(([name, data]) => {
					payload[targetKey][name] = {
						id: data.id,
						dates: data.flexible ? [] : data.dates,
						flexible: data.flexible,
					};
				});

				console.log("payload of dood is :: ", payload);

				const response = await fetch(getApiUrl(`/api/${id}/schedule/${scheduleId}/dates/batch`), {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(payload),
				});

				if (!response.ok) {
					throw new Error("Failed to save DOOD data");
				}

				alert("DOOD data saved successfully!");
				fetchScheduleData();
			} catch (error) {
				console.error("Error saving DOOD data:", error);
				alert("Failed to save DOOD data: " + error.message);
			} finally {
				setDoodIsSaving(false);
			}
		};

		// Format date for header display
		const formatDateHeader = (dateStr) => {
			const date = new Date(dateStr);
			const day = date.getDate();
			const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
			return { day, weekday };
		};

		return (
			<div className="sched-conflicts-modal-overlay" onClick={() => setShowDoodModal(false)}>
				<div className="sched-dood-modal" onClick={(e) => e.stopPropagation()}>
					<div className="sched-conflicts-modal-header">
						<h2 className="sched-conflicts-modal-heading">Day Out Of Days (DOOD)</h2>
						<button className="sched-conflicts-modal-close-button" onClick={() => setShowDoodModal(false)}>
							×
						</button>
					</div>

					<div className="sched-dood-modal-content" ref={doodContentRef}>
						{/* Date Range Selection */}
						<div className="sched-dood-controls">
							<div className="sched-dood-date-range">
								<label>
									Start Date:
									<input
										type="date"
										value={doodStartDate}
										onChange={(e) => {
											const scrollTop = doodContentRef.current?.scrollTop;
											setDoodStartDate(e.target.value);
											requestAnimationFrame(() => {
												if (doodContentRef.current && scrollTop !== undefined) {
													doodContentRef.current.scrollTop = scrollTop;
												}
											});
										}}
										className="sched-date-range-input"
									/>
								</label>
								<label>
									End Date:
									<input
										type="date"
										value={doodEndDate}
										min={doodStartDate}
										onChange={(e) => {
											const scrollTop = doodContentRef.current?.scrollTop;
											setDoodEndDate(e.target.value);
											requestAnimationFrame(() => {
												if (doodContentRef.current && scrollTop !== undefined) {
													doodContentRef.current.scrollTop = scrollTop;
												}
											});
										}}
										className="sched-date-range-input"
									/>
								</label>
							</div>

							<div className="sched-dood-type-selector">
								<label>
									Show:
									<select
										value={doodElementType}
										onChange={(e) => {
											const scrollTop = doodContentRef.current?.scrollTop;
											setDoodElementType(e.target.value);
											requestAnimationFrame(() => {
												if (doodContentRef.current && scrollTop !== undefined) {
													doodContentRef.current.scrollTop = scrollTop;
												}
											});
										}}
										className="sched-element-dropdown"
									>
										<option value="character">Characters</option>
										<option value="location">Sets</option>
									</select>
								</label>
							</div>

							<button
								onClick={handleDoodSave}
								className="sched-action-btn-success"
								disabled={doodIsSaving || !doodStartDate || !doodEndDate}
							>
								{doodIsSaving ? "Saving..." : "Save All"}
							</button>
						</div>

						{/* DOOD Grid */}
						{doodStartDate && doodEndDate && dateColumns.length > 0 ? (
							<div className="sched-dood-grid-wrapper" ref={doodGridRef}>
								<div className="sched-dood-grid">
									<table className="sched-dood-table">
										<thead>
											<tr>
												<th className="sched-dood-header-cell sched-dood-element-header">
													{doodElementType === "character" ? "Character" : "Set"}
												</th>
												<th className="sched-dood-header-cell sched-dood-actions-header">Actions</th>
												{dateColumns.map((date) => {
													const { day, weekday } = formatDateHeader(date);
													return (
														<th key={date} className="sched-dood-header-cell sched-dood-date-header">
															<div className="sched-dood-date-label">
																<span className="sched-dood-weekday">{weekday}</span>
																<span className="sched-dood-day">{day}</span>
															</div>
														</th>
													);
												})}
											</tr>
										</thead>
										<tbody>
											{elements.map((elem) => (
												<tr key={elem.name} className={isElementFlexible(elem.name) ? "sched-dood-row-flexible" : ""}>
													<td className="sched-dood-element-cell">{elem.name}</td>
													<td className="sched-dood-actions-cell">
														<button
															onClick={() => toggleFlexible(elem.name)}
															className={`sched-dood-flex-btn ${isElementFlexible(elem.name) ? "active" : ""}`}
															title="Toggle Flexible"
														>
															F
														</button>
														<button
															onClick={() => selectAllDates(elem.name)}
															className="sched-dood-all-btn"
															disabled={isElementFlexible(elem.name)}
															title="Select All"
														>
															✓
														</button>
														<button
															onClick={() => clearAllDates(elem.name)}
															className="sched-dood-clear-btn"
															disabled={isElementFlexible(elem.name)}
															title="Clear All"
														>
															✕
														</button>
													</td>
													{dateColumns.map((date) => (
														<td
															key={date}
															className={`sched-dood-cell ${
																isElementFlexible(elem.name)
																	? "sched-dood-cell-flexible"
																	: isCellSelected(elem.name, date)
																		? "sched-dood-cell-selected"
																		: "sched-dood-cell-empty"
															}`}
															onClick={() => toggleCell(elem.name, date)}
														>
															{isElementFlexible(elem.name) ? "F" : isCellSelected(elem.name, date) ? "✓" : ""}
														</td>
													))}
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						) : (
							<div className="sched-dood-placeholder">
								{!doodStartDate || !doodEndDate
									? "Please set a schedule date range first (in the Generate Schedule modal)"
									: "No data to display"}
							</div>
						)}

						{/* Legend */}
						<div className="sched-dood-legend">
							<div className="sched-dood-legend-item">
								<span className="sched-dood-legend-box sched-dood-cell-selected"></span>
								<span>Available</span>
							</div>
							<div className="sched-dood-legend-item">
								<span className="sched-dood-legend-box sched-dood-cell-empty"></span>
								<span>Unavailable</span>
							</div>
							<div className="sched-dood-legend-item">
								<span className="sched-dood-legend-box sched-dood-cell-flexible"></span>
								<span>Flexible (any date)</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	};

	// Panel to display unscheduled scenes with drag-drop support
	const UnscheduledScenesPanel = ({ unscheduledScenesWithIds, isEditing, characterNameToIdMap }) => {
		const { setNodeRef } = useDroppable({
			id: "unscheduled",
		});

		const [isExpanded, setIsExpanded] = useState(true);

		const hasScenes = unscheduledScenesWithIds && unscheduledScenesWithIds.length > 0;

		return (
			(isEditing || hasScenes) && (
				<div ref={setNodeRef} className={`sched-unscheduled-panel ${!isExpanded ? "sched-unscheduled-panel-collapsed" : ""}`}>
					<div className="sched-unscheduled-panel-header">
						<h4>
							Unscheduled Scenes ({unscheduledScenesWithIds?.length || 0})
							{isEditing && <span className="sched-drag-hint"> - Drag scenes to schedule or unschedule them</span>}
						</h4>
						<button onClick={() => setIsExpanded(!isExpanded)}>{isExpanded ? "▲" : "▼"}</button>
					</div>
					{isExpanded && (
						<SortableContext items={hasScenes ? unscheduledScenesWithIds.map((s) => s.id) : []} strategy={verticalListSortingStrategy}>
							{hasScenes ? (
								<table className="sched-table">
									<thead className="sched-thead">
										<tr className="sched-header-row">
											<th className="sched-header-cell">Scene</th>
											<th className="sched-header-cell">Int./Ext.</th>
											<th className="sched-header-cell sched-location-synopsis-column">Location/Synopsis</th>
											<th className="sched-header-cell">Pgs</th>
											<th className="sched-header-cell">Characters</th>
										</tr>
									</thead>
									<tbody>
										{unscheduledScenesWithIds.map((scene) => (
											<UnscheduledSceneCard
												key={scene.id}
												scene={scene}
												isEditing={isEditing}
												characterNameToIdMap={characterNameToIdMap}
											/>
										))}
									</tbody>
								</table>
							) : (
								<div className="sched-unscheduled-empty">
									{isEditing ? "Drag scenes here to unschedule them" : "All scenes are scheduled"}
								</div>
							)}
						</SortableContext>
					)}
				</div>
			)
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
			console.log("schedule_by_day-----------", schedule_by_day);

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

					const breakdownResponse = await fetch(getApiUrl(`/api/fetch-breakdown?project_id=${id}`));
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

	// Initialize Generate Schedule modal dates from schedule data
	useEffect(() => {
		if (showGenerateModal && scheduleData) {
			const startDate = scheduleData.first_date || "";
			const endDate = scheduleData.last_date || "";
			if (startDate && !scheduleStartDate) {
				setScheduleStartDate(startDate);
			}
			if (endDate && !scheduleEndDate) {
				setScheduleEndDate(endDate);
			}
		}
	}, [showGenerateModal, scheduleData]);

	// Filter modalSelectedDates when start/end dates change
	useEffect(() => {
		if (!scheduleStartDate || !scheduleEndDate) return;

		const startDate = new Date(scheduleStartDate);
		const endDate = new Date(scheduleEndDate);

		// Filter modalSelectedDates if any dates are selected
		if (modalSelectedDates.length > 0) {
			const filteredModalDates = modalSelectedDates.filter((dateStr) => {
				const date = new Date(dateStr);
				return date >= startDate && date <= endDate;
			});
			if (filteredModalDates.length !== modalSelectedDates.length) {
				setModalSelectedDates(filteredModalDates);
			}
		}
	}, [scheduleStartDate, scheduleEndDate]);

	// Initialize DOOD modal when it opens
	useEffect(() => {
		if (showDoodModal && scheduleData) {
			// Set dates from schedule data
			const startDate = scheduleData.first_date || scheduleStartDate || "";
			const endDate = scheduleData.last_date || scheduleEndDate || "";
			setDoodStartDate(startDate);
			setDoodEndDate(endDate);

			// Initialize doodData with existing availability data
			if (startDate && endDate) {
				const datesSection = doodElementType === "character" ? "characters" : "locations";
				const elementsList = doodElementType === "character" ? castList : locationList;
				const newData = {};

				if (doodElementType === "character") {
					const addedCharacters = new Set();
					castList.forEach((cast) => {
						const normalizedName = cast.character?.toUpperCase();
						if (normalizedName && !addedCharacters.has(normalizedName)) {
							addedCharacters.add(normalizedName);
							const existingData = scheduleData?.dates?.[datesSection]?.[cast.character];
							const existingDates = existingData?.dates || (Array.isArray(existingData) ? existingData : []);
							const isFlexible = existingData?.flexible || false;

							newData[cast.character] = {
								id: cast.cast_id,
								dates: parseDateRanges(existingDates),
								flexible: isFlexible,
							};
						}
					});
				} else {
					locationList.forEach((loc) => {
						const existingData = scheduleData?.dates?.[datesSection]?.[loc.location];
						const existingDates = existingData?.dates || (Array.isArray(existingData) ? existingData : []);
						const isFlexible = existingData?.flexible || false;

						newData[loc.location] = {
							id: loc.location_id,
							dates: parseDateRanges(existingDates),
							flexible: isFlexible,
						};
					});
				}
				setDoodData(newData);
			}
		}
	}, [showDoodModal, doodElementType, scheduleData, castList, locationList]);

	// Filter DOOD dates when start/end dates change
	useEffect(() => {
		if (!doodStartDate || !doodEndDate || Object.keys(doodData).length === 0) return;

		const startDate = new Date(doodStartDate);
		const endDate = new Date(doodEndDate);

		let hasChanges = false;
		const filteredData = {};

		Object.entries(doodData).forEach(([elementName, elementData]) => {
			const currentDates = elementData.dates || [];
			const filteredDates = currentDates.filter((dateStr) => {
				const date = new Date(dateStr);
				return date >= startDate && date <= endDate;
			});

			if (filteredDates.length !== currentDates.length) {
				hasChanges = true;
			}

			filteredData[elementName] = {
				...elementData,
				dates: filteredDates,
			};
		});

		if (hasChanges) {
			setDoodData(filteredData);
		}
	}, [doodStartDate, doodEndDate]);

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

	// Calculate unscheduled scenes by comparing breakdown scenes with scheduled scenes
	const unscheduledScenes = useMemo(() => {
		if (!breakdownScenes || breakdownScenes.length === 0) return [];

		// Get all scheduled scene IDs from scheduleDays
		const scheduledSceneIds = new Set();
		scheduleDays.forEach((day) => {
			day.scenes.forEach((scene) => {
				scheduledSceneIds.add(scene.scene_id);
				scheduledSceneIds.add(parseInt(scene.scene_id));
			});
		});

		// Find scenes from breakdown that are not scheduled
		const unscheduled = breakdownScenes.filter((scene) => {
			return !scheduledSceneIds.has(scene.id) && !scheduledSceneIds.has(String(scene.id));
		});

		return unscheduled;
	}, [breakdownScenes, scheduleDays]);

	// Create unscheduled scenes with unique drag IDs (prefixed with 'unsched-' to avoid conflicts)
	const unscheduledScenesWithIds = useMemo(() => {
		return unscheduledScenes.map((scene) => ({
			id: `unsched-${scene.id}`,
			scene_id: scene.id,
			scene_number: scene.scene_number,
			int_ext: scene.int_ext,
			time_of_day: scene.time_of_day,
			page_eighths: scene.page_eighths,
			synopsis: scene.synopsis,
			location_name: scene.location,
			character_names: scene.characters || [],
			character_ids: scene.characters_ids || [],
		}));
	}, [unscheduledScenes]);

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

	// Get locked option info for the selected character
	const selectedCharacterLockedInfo = useMemo(() => {
		if (elementType !== "character" || !element) return null;

		const selectedCharacter = castList.find((cast) => cast.character === element);
		if (!selectedCharacter) return null;

		const lockedOptionId = selectedCharacter.locked;
		// Check if there's a locked option (locked is not -1 or "-1" or null)
		if (lockedOptionId === -1 || lockedOptionId === "-1" || lockedOptionId === null || lockedOptionId === undefined) {
			return null;
		}

		const castOptions = selectedCharacter.cast_options || {};
		const lockedOption = castOptions[String(lockedOptionId)];

		if (!lockedOption) return null;

		return {
			optionId: lockedOptionId,
			actorName: lockedOption.actor_name || lockedOption.actorName || "Unknown",
			contact: lockedOption.contact || "",
			availableDates: lockedOption.available_dates || lockedOption.availableDates || [],
		};
	}, [elementType, element, castList]);

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
								(bs) => bs.id === scheduledScene.scene_id || bs.id === parseInt(scheduledScene.scene_id),
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
										`Scene ${scheduledScene.scene_number} (id: ${scheduledScene.scene_id}) not found in breakdown - may have been deleted`,
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
				console.log("days -- ", days);
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
			const activeContainer = findContainer(days, activeId, unscheduledScenesWithIds);
			const overContainer = findContainer(days, overId, unscheduledScenesWithIds);

			if (!activeContainer || !overContainer) {
				return days;
			}

			// Handle dropping scheduled scenes into unscheduled container
			if (overContainer.id === "unscheduled" && activeContainer.id !== "unscheduled") {
				// Find and remove the scene from its current day
				const activeDayIndex = days.findIndex((d) => d.id === activeContainer.id);
				if (activeDayIndex === -1) return days;

				const activeSceneIndex = activeContainer.scenes.findIndex((s) => s.id === activeId);
				if (activeSceneIndex === -1) return days;

				const newDays = [...days];
				newDays[activeDayIndex] = {
					...newDays[activeDayIndex],
					scenes: newDays[activeDayIndex].scenes.filter((s) => s.id !== activeId),
				};

				return newDays;
			}

			// Handle dragging from unscheduled to a schedule day
			if (activeContainer.id === "unscheduled") {
				const overDayIndex = days.findIndex((d) => d.id === overContainer.id);
				if (overDayIndex === -1) return days;

				// Find the unscheduled scene being dragged
				const unscheduledScene = unscheduledScenesWithIds.find((s) => s.id === activeId);
				if (!unscheduledScene) return days;

				// Generate a new numeric ID for the scene (find max ID and add 1)
				let maxId = 0;
				days.forEach((day) => {
					day.scenes.forEach((scene) => {
						if (typeof scene.id === "number" && scene.id > maxId) {
							maxId = scene.id;
						}
					});
				});

				// Create a new scene object with a numeric ID for the schedule
				const newScene = {
					id: maxId + 1,
					scene_id: String(unscheduledScene.scene_id),
					scene_number: unscheduledScene.scene_number,
					int_ext: unscheduledScene.int_ext,
					time_of_day: unscheduledScene.time_of_day,
					page_eighths: unscheduledScene.page_eighths,
					synopsis: unscheduledScene.synopsis,
					location_name: unscheduledScene.location_name,
					character_names: unscheduledScene.character_names,
					character_ids: unscheduledScene.character_ids,
				};
				console.log("newScene-----------", newScene);

				const newDays = [...days];

				// Find insertion index
				let overSceneIndex = overContainer.scenes.findIndex((s) => s.id === overId);
				if (overSceneIndex === -1) {
					overSceneIndex = newDays[overDayIndex].scenes.length;
				}

				newDays[overDayIndex] = {
					...newDays[overDayIndex],
					scenes: [...newDays[overDayIndex].scenes.slice(0, overSceneIndex), newScene, ...newDays[overDayIndex].scenes.slice(overSceneIndex)],
				};

				return newDays;
			}

			// Handle reordering within the same day
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
				// Handle moving between different schedule days
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

		if (elementData?.dates && elementData.dates.length > 0) {
			return parseDateRanges(elementData.dates);
		}

		// Fallback: If character has a locked option with dates, use those
		if (type === "character" && selectedCharacterLockedInfo?.availableDates?.length > 0) {
			return selectedCharacterLockedInfo.availableDates;
		}

		// Fallback: If location has a locked option with dates, use those
		if (type === "location" && selectedLocationLockedInfo?.availableDates?.length > 0) {
			return selectedLocationLockedInfo.availableDates;
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

			if (elementData?.dates && elementData.dates.length > 0) {
				console.log("Found dates for:", name, elementData.dates);
				const existingDates = parseDateRanges(elementData.dates);
				setSelectedDates(existingDates);
				setOriginalDates(existingDates);
			} else {
				// Check for locked option dates as fallback
				let lockedDates = [];
				if (type === "character") {
					const selectedChar = castList.find((cast) => cast.character === name);
					if (selectedChar && selectedChar.locked !== -1 && selectedChar.locked !== "-1") {
						const castOptions = selectedChar.cast_options || {};
						const lockedOption = castOptions[String(selectedChar.locked)];
						if (lockedOption) {
							lockedDates = lockedOption.available_dates || lockedOption.availableDates || [];
						}
					}
				} else if (type === "location") {
					const selectedLoc = locationList.find((loc) => loc.location === name);
					if (selectedLoc && selectedLoc.locked !== -1 && selectedLoc.locked !== "-1") {
						const locationOptions = selectedLoc.location_options || {};
						const lockedOption = locationOptions[String(selectedLoc.locked)];
						if (lockedOption) {
							lockedDates = lockedOption.available_dates || lockedOption.availableDates || [];
						}
					}
				}

				if (lockedDates.length > 0) {
					console.log("Using locked option dates for:", name, lockedDates);
					setSelectedDates(lockedDates);
					setOriginalDates(lockedDates);
				} else {
					setSelectedDates([]);
					setOriginalDates([]);
				}
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
			// Track which characters we've added to avoid duplicates
			const addedCharacters = new Set();

			// Then add any characters from castList that aren't already included
			// This ensures newly added characters (with 0 scenes) also appear

			castList.forEach((cast) => {
				const normalizedName = cast.character?.toUpperCase();
				if (normalizedName && !addedCharacters.has(normalizedName)) {
					addedCharacters.add(normalizedName);
					options.push({
						value: cast.character,
						label: `👤 ${cast.character}`,
						cast_id: cast.cast_id,
					});
				}
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
							`Scene ${scheduledScene.scene_number} (id: ${scheduledScene.scene_id}) not found for scheduled dates - may have been deleted`,
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

	const exportScheduleToExcel = async (days, breakdown) => {
		const sceneMap = {};

		console.log("got breakdown -- ", breakdown);
		breakdown.forEach((scene) => {
			sceneMap[scene.id] = scene;
		});
		console.log("sceneMap -- ", sceneMap);

		const headers = [
			"Scene #",
			"Int/Ext",
			"Set",
			"Location",
			"Time",
			"Pages",
			"Synopsis",
			"Characters",
			"Set Dressing",
			"Action Props",
			"Other Props",
			"Animals",
			"Extras",
			"Picture Vehicles",
			"Wardrobe",
			"ID",
		];

		const getSceneRow = (scene) => {
			if (!scene) return [];
			return [
				scene.scene_number,
				scene.int_ext,
				scene.set,
				scene.location,
				scene.time,
				scene.page_eighths,
				scene.synopsis,
				(scene.characters || []).join(", "),
				(scene.set_dressing || []).join(", "),
				(scene.action_props || []).join(", "),
				(scene.other_props || []).join(", "),
				(scene.animals || []).join(", "),
				(scene.extras || []).join(", "),
				(scene.picture_vehicles || []).join(", "),
				(scene.wardrobe || []).join(", "),
				scene.id,
			];
		};

		const workbook = new ExcelJS.Workbook();
		const worksheet = workbook.addWorksheet("Schedule");

		const projectRow = worksheet.addRow([`Project: ${projectName || "Not set"}`]);
		projectRow.font = { bold: true, size: 12 };

		worksheet.addRow([`Schedule start date : ${scheduleDates?.start || "Not set"}`]);
		worksheet.addRow([`Schedule end date : ${scheduleDates?.end || "Not set"}`]);
		worksheet.addRow([]);

		Object.entries(days).forEach(([dayNum, day]) => {
			const dayRow = worksheet.addRow([`Day ${dayNum} - Date: ${day.date || "TBD"}`]);

			worksheet.mergeCells(`A${dayRow.number}:P${dayRow.number}`);

			const dayCell = dayRow.getCell(1);
			dayCell.fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: "FFFFE082" },
			};
			dayCell.alignment = { vertical: "middle", horizontal: "center" };
			dayCell.font = { bold: true, size: 12 };

			const headerRow = worksheet.addRow(headers);

			headerRow.eachCell((cell) => {
				cell.fill = {
					type: "pattern",
					pattern: "solid",
					fgColor: { argb: "FFD3D3D3" },
				};
				cell.font = { bold: true };
				cell.alignment = { horizontal: "center", vertical: "middle" };
				cell.border = { bottom: { style: "thin" } };
			});

			if (day.scenes && Array.isArray(day.scenes)) {
				day.scenes.forEach((s) => {
					const sceneData = sceneMap[parseInt(s.scene_id)];

					if (sceneData) {
						const rowData = getSceneRow(sceneData);
						const newRow = worksheet.addRow(rowData);

						newRow.getCell(1).alignment = { horizontal: "center" };
						newRow.getCell(5).alignment = { horizontal: "center" };
						newRow.getCell(6).alignment = { horizontal: "center" };
					}
				});
			}

			worksheet.addRow([]);
			worksheet.addRow([]);
		});

		worksheet.columns = [
			{ width: 10 },
			{ width: 10 },
			{ width: 25 },
			{ width: 35 },
			{ width: 10 },
			{ width: 10 },
			{ width: 50 },
			{ width: 30 },
			{ width: 20 },
			{ width: 20 },
			{ width: 20 },
			{ width: 20 },
			{ width: 20 },
			{ width: 20 },
			{ width: 20 },
			{ width: 10 },
		];

		const buffer = await workbook.xlsx.writeBuffer();
		const blob = new Blob([buffer], {
			type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		});
		saveAs(blob, `${(projectName || "Schedule").replace(/\s+/g, "_")}_Schedule.xlsx`);
	};

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
				{scheduleData?.schedule && (
					<button className="sched-sync-btn" onClick={() => exportScheduleToExcel(scheduleData.schedule.schedule_by_day, breakdownScenes)}>
						<span>
							<FaFileExcel />
						</span>
						<span>Export to Excel</span>
					</button>
				)}
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
					<button className="sched-dood-button" onClick={() => setShowDoodModal(true)}>
						See DOODs
					</button>
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
								<option value="location">Sets </option>
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
								</div>
							) : (
								<div className="sched-no-locked-option">
									<span className="sched-unlocked-icon">🔓</span>
									<span>No option locked for this location</span>
								</div>
							)}
						</div>
					)}

					{/* Locked Option Info Display for Characters */}
					{elementType === "character" && element && (
						<div className="sched-locked-option-info">
							{selectedCharacterLockedInfo ? (
								<div className="sched-locked-option-card">
									<div className="sched-locked-option-header">
										<span className="sched-locked-icon">🔒</span>
										<span className="sched-locked-label">Locked Option:</span>
									</div>
									<div className="sched-locked-option-details">
										<div className="sched-locked-option-name">{selectedCharacterLockedInfo.actorName}</div>
										{selectedCharacterLockedInfo.contact && (
											<div className="sched-locked-option-address">📞 {selectedCharacterLockedInfo.contact}</div>
										)}
										{selectedCharacterLockedInfo.availableDates.length > 0 && (
											<div className="sched-locked-option-dates">
												<span className="sched-locked-dates-label">Available Dates: </span>
												<span className="sched-locked-dates-count">
													{selectedCharacterLockedInfo.availableDates.length} date(s)
												</span>
											</div>
										)}
									</div>
								</div>
							) : (
								<div className="sched-no-locked-option">
									<span className="sched-unlocked-icon">🔓</span>
									<span>No option locked for this character</span>
								</div>
							)}
						</div>
					)}

					<div className="sched-given-dates">
						<div className="sched-section-title">Available Dates</div>

						{selectedElement &&
							scheduleData["dates"][elementType === "location" ? "locations" : "characters"][element] &&
							scheduleData["dates"][elementType === "location" ? "locations" : "characters"][element]["flexible"] && (
								<div className="sched-existing-dates-info">
									<span> ✅ Flexible dates for {element}</span>
								</div>
							)}
						{selectedElement ? (
							<div className="sched-date-picker-container">
								{scheduleData["dates"][elementType === "location" ? "locations" : "characters"][element] &&
									selectedDates.length === 0 &&
									!scheduleData["dates"][elementType === "location" ? "locations" : "characters"][element]["flexible"] && (
										<div className="sched-existing-dates-info">
											<span className="sched-existing-dates-label">{`No dates set for ${getSelectedElementName()}`}</span>
										</div>
									)}

								{selectedDates.length > 0 && (
									<div className="sched-selected-dates-list">
										<div className="sched-selected-dates-header">
											<span>Available Dates ({selectedDates.length}):</span>
										</div>
										<div className="sched-calendar-container">
											<Calendar
												selectRange={false}
												activeStartDate={null}
												tileClassName={tileClassName}
												tileDisabled={() => true}
											/>
										</div>
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
					<GenerateScheduleModal />
					<DoodModal />

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
							<button className="sched-generate-button" onClick={() => setShowGenerateModal(true)} disabled={isGenerating}>
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
							{/* Unscheduled Scenes Panel - Always visible */}
							<UnscheduledScenesPanel
								unscheduledScenesWithIds={unscheduledScenesWithIds}
								isEditing={isEditing}
								characterNameToIdMap={characterNameToIdMap}
							/>
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
