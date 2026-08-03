import ProjectHeader from "../components/ProjectHeader";
import { useNavigate, useParams } from "react-router-dom";
import { eachDayOfInterval, format } from "date-fns";
import { useState, useEffect, useMemo, useRef } from "react";
import { getApiUrl } from "../utils/api";
import { DndContext, DragOverlay, closestCenter, pointerWithin, useDraggable, useDroppable, PointerSensor, KeyboardSensor, useSensor, useSensors, MeasuringStrategy } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToFirstScrollableAncestor } from "@dnd-kit/modifiers";
import DOODSchedule from "../components/DOOD";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "../css/ManageSchedules.css";
import React from "react";
import Loader from "../components/Loader";
import Chatbot from "../components/Chatbot";
import { useSelector } from "react-redux";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { FaFileExcel } from "react-icons/fa";
import { MdFormatColorFill } from "react-icons/md";
import EmptyState from "../components/EmptyState";
import CustomTimelineScrollbar from "../components/CustomTimelineScrollbar";
import CustomDatePicker from "../components/CustomDatePicker";

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

function formatSceneDisplay(sceneNumber, episodeNumber) {
	const scene = String(sceneNumber ?? "").trim();
	const episode = String(episodeNumber ?? "").trim();
	if (!scene) return "";
	return episode ? `Ep${episode}-${scene}` : scene;
}

function toDisplayList(value) {
	if (Array.isArray(value)) {
		return value
			.map((item) => String(item ?? "").trim())
			.filter(Boolean);
	}
	if (typeof value === "string") {
		return value
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean);
	}
	return [];
}

const SCENE_COLOR_OPTIONS = [
	{ value: "white", label: "White", accent: "#d1d5db", tint: "#ffffff", text: "#0f1724" },
	{ value: "yellow", label: "Yellow", accent: "#f59e0b", tint: "#fef3c7", text: "#92400e" },
	{ value: "blue", label: "Blue", accent: "#3b82f6", tint: "#dbeafe", text: "#1d4ed8" },
	{ value: "green", label: "Green", accent: "#22c55e", tint: "#dcfce7", text: "#166534" },
	{ value: "pink", label: "Pink", accent: "#ec4899", tint: "#fce7f3", text: "#9d174d" },
	{ value: "orange", label: "Orange", accent: "#f97316", tint: "#ffedd5", text: "#c2410c" },
];

const SCENE_COLOR_MAP = SCENE_COLOR_OPTIONS.reduce((acc, option) => {
	acc[option.value] = option;
	return acc;
}, {});

function normalizeSceneColor(color) {
	const normalized = String(color ?? "")
		.trim()
		.toLowerCase();
	return SCENE_COLOR_MAP[normalized] ? normalized : "white";
}

function getSceneColorMeta(color) {
	return SCENE_COLOR_MAP[normalizeSceneColor(color)];
}

function getSceneColorVars(color) {
	const meta = getSceneColorMeta(color);
	return {
		"--sched-scene-color-accent": meta.accent,
		"--sched-scene-color-tint": meta.tint,
		"--sched-scene-color-text": meta.text,
	};
}


const DragHandle = ({ handleProps = {} }) => {
	return (
		<div className="sched-drag-handle sched-drag-handle-static" aria-hidden="true" {...handleProps}>
			<span className="sched-drag-handle-dots" />
		</div>
	);
};

const SceneColorButton = ({ sceneId, sceneNumber, color, onSceneColorChange, interactive = true }) => {
	const [isOpen, setIsOpen] = React.useState(false);
	const popupRef = React.useRef(null);

	React.useEffect(() => {
		if (!isOpen) return undefined;

		const handlePointerDown = (event) => {
			if (popupRef.current && !popupRef.current.contains(event.target)) {
				setIsOpen(false);
			}
		};

		document.addEventListener("pointerdown", handlePointerDown);
		return () => document.removeEventListener("pointerdown", handlePointerDown);
	}, [isOpen]);

	return (
		<div
			className="sched-scene-color-picker"
			ref={popupRef}
			onPointerDown={(e) => e.stopPropagation()}
			onMouseDown={(e) => e.stopPropagation()}
			onClick={(e) => e.stopPropagation()}
		>
			<button
				type="button"
				className={`sched-scene-color-fill-button ${isOpen ? "is-open" : ""}`}
				style={getSceneColorVars(color)}
				onClick={(e) => {
					e.stopPropagation();
					if (interactive) {
						setIsOpen((prev) => !prev);
					}
				}}
				disabled={!interactive}
				aria-label={`Fill color for scene ${sceneNumber}`}
				title="Fill color"
			>
				<MdFormatColorFill aria-hidden="true" />
			</button>
			{isOpen && (
				<div className="sched-scene-color-palette" role="menu" aria-label={`Color choices for scene ${sceneNumber}`}>
					{SCENE_COLOR_OPTIONS.map((option) => (
						<button
							key={option.value}
							type="button"
							className={`sched-scene-color-option ${normalizeSceneColor(color) === option.value ? "active" : ""}`}
							style={getSceneColorVars(option.value)}
							onPointerDown={(e) => e.stopPropagation()}
							onClick={(e) => {
								e.stopPropagation();
								onSceneColorChange(sceneId, option.value);
								setIsOpen(false);
							}}
							aria-label={`${option.label} color for scene ${sceneNumber}`}
							title={option.label}
						/>
					))}
				</div>
			)}
		</div>
	);
};

const SceneCardInner = React.forwardRef(({ scene, style, className, rowAttributes, dragHandleProps, sceneHours, setSceneHours, characterNameToIdMap, isEpisodic, onSceneColorChange, onSceneClick, isEditing }, ref) => {
	const sceneColor = normalizeSceneColor(scene.scene_color);
	const rowStyle = {
		...style,
		...getSceneColorVars(sceneColor),
	};

	return (
		<tr
			ref={ref}
			style={rowStyle}
			className={`${className} sched-scene-color-row ${onSceneClick ? "sched-scene-row-clickable" : ""}`}
			onClick={onSceneClick ? () => onSceneClick(scene) : undefined}
			{...rowAttributes}
		>
			<td className="sched-data-cell sched-drag-handle-cell">
				{isEditing && <DragHandle handleProps={dragHandleProps} />}
			</td>
			{isEpisodic && <td className="sched-data-cell">{scene.episode_number || "-"}</td>}
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
					onPointerDown={(e) => e.stopPropagation()}
					onClick={(e) => e.stopPropagation()}
					value={sceneHours[scene.id]?.hours ?? ""}
					onChange={(e) => {
						const newSceneHours = { ...sceneHours };
						if (!newSceneHours[scene.id]) {
							newSceneHours[scene.id] = { hours: "", minutes: "" };
						}
						const value = parseInt(e.target.value);
						if (value < 0) {
							alert("Cannot have negative values for hours");
							return;
						}
						newSceneHours[scene.id].hours = value;
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
					onPointerDown={(e) => e.stopPropagation()}
					onClick={(e) => e.stopPropagation()}
					value={sceneHours[scene.id]?.minutes ?? ""}
					onChange={(e) => {
						const newSceneHours = { ...sceneHours };
						if (!newSceneHours[scene.id]) {
							newSceneHours[scene.id] = { hours: "", minutes: "" };
						}
						const value = parseInt(e.target.value);
						if (value < 0 || value > 60) {
							alert("Enter a acceptable value for minutes");
							return;
						}
						newSceneHours[scene.id].minutes = value;
						setSceneHours(newSceneHours);
					}}
				/>
			</td>
			<td className="sched-data-cell sched-scene-color-rail-cell">
				<SceneColorButton
					sceneId={scene.id}
					sceneNumber={scene.scene_number}
					color={sceneColor}
					onSceneColorChange={onSceneColorChange}
				/>
			</td>
		</tr>
	);
});

const SceneCard = ({ scene, isEditing, scheduleMode, sceneHours, setSceneHours, characterNameToIdMap, isEpisodic, onSceneColorChange, onSceneClick }) => {
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: scene.id,
		disabled: !isEditing,
	});

	const style = {
		cursor: isDragging ? "grabbing" : isEditing ? "grab" : "default",
		userSelect: "none",
		opacity: isDragging ? 0.18 : 1,
	};

	return (
		<SceneCardInner
			ref={setNodeRef}
			style={style}
			className={`sched-data-row ${isEditing ? "sched-data-row-draggable" : ""}`}
			rowAttributes={{
				"data-schedule-scene-row": "true",
				"data-scene-id": String(scene.id),
				...(isEditing ? { ...attributes, ...listeners } : {}),
			}}
			dragHandleProps={{
				...attributes,
				...listeners,
			}}
			scene={scene}
			scheduleMode={scheduleMode}
			sceneHours={sceneHours}
			setSceneHours={setSceneHours}
			characterNameToIdMap={characterNameToIdMap}
			isEpisodic={isEpisodic}
			onSceneColorChange={onSceneColorChange}
			onSceneClick={onSceneClick}
			isEditing={isEditing}
		/>
	);
};

const SceneDragOverlay = ({ scene, characterNameToIdMap, isEpisodic, showHours }) => {
	const sceneColor = normalizeSceneColor(scene.scene_color);
	return (
		<div className="sched-scene-drag-overlay" style={getSceneColorVars(sceneColor)}>
			<table className="sched-table sched-scene-drag-overlay-table">
				<tbody>
					<tr className="sched-data-row sched-scene-color-row">
						<td className="sched-data-cell sched-drag-handle-cell">
							<DragHandle />
						</td>
						{isEpisodic && <td className="sched-data-cell">{scene.episode_number || "-"}</td>}
						<td className="sched-data-cell">{scene.scene_number}</td>
						<td className="sched-data-cell">{scene.int_ext || "N/A"}</td>
						<td className="sched-data-cell sched-location-synopsis-column">
							{scene.location_name} <br /> <br />
							Synopsis: {scene.synopsis || "N/A"}
						</td>
						<td className="sched-data-cell">{formatPageEights(scene.page_eighths) || "N/A"}</td>
						<td className="sched-data-cell">{(scene.character_names || []).map((name) => characterNameToIdMap[name.toUpperCase()] || name).join(", ")}</td>
						{showHours && <td className="sched-data-cell sched-scene-drag-overlay-hours">Est. Hours</td>}
					</tr>
				</tbody>
			</table>
		</div>
	);
};

const DragPlaceholderRow = ({ colSpan, dragHeight }) => {
	return (
		<tr className="sched-drop-placeholder-row">
			<td className="sched-drop-placeholder-cell" colSpan={colSpan}>
				<div className="sched-drop-placeholder-inner" style={{ minHeight: dragHeight ? `${dragHeight}px` : "40px" }} />
			</td>
		</tr>
	);
};

const renderRowsWithPlaceholder = ({ scenes, containerId, dragPreview, activeDragId, colSpan, renderScene, dragHeight }) => {
	const rows = [];
	const showPlaceholder = dragPreview?.containerId === containerId;
	const previewIndex = showPlaceholder ? dragPreview.index : -1;
	const filteredScenes =
		dragPreview?.sourceContainerId === containerId && activeDragId
			? scenes.filter((scene) => String(scene.id) !== String(activeDragId))
			: scenes;

	filteredScenes.forEach((scene, index) => {
		if (previewIndex === index) {
			rows.push(<DragPlaceholderRow key={`placeholder-${containerId}-${index}`} colSpan={colSpan} dragHeight={dragHeight} />);
		}
		rows.push(renderScene(scene));
	});

	if (previewIndex === filteredScenes.length) {
		rows.push(<DragPlaceholderRow key={`placeholder-${containerId}-end`} colSpan={colSpan} dragHeight={dragHeight} />);
	} else if (filteredScenes.length === 0 && previewIndex === 0 && activeDragId) {
		rows.push(<DragPlaceholderRow key={`placeholder-${containerId}-empty`} colSpan={colSpan} dragHeight={dragHeight} />);
	}

	return rows;
};

const CalendarDragPlaceholderBlock = ({ dragHeight }) => {
	return (
		<div className="sched-calendar-scene-block sched-drop-placeholder-inner" style={{ minHeight: dragHeight ? `${dragHeight}px` : "40px", border: "2px dashed #9ca3af", background: "#f3f4f6" }} />
	);
};

const renderBlocksWithPlaceholder = ({ scenes, containerId, dragPreview, activeDragId, renderScene, dragHeight }) => {
	const blocks = [];
	const showPlaceholder = dragPreview?.containerId === containerId;
	const previewIndex = showPlaceholder ? dragPreview.index : -1;
	const filteredScenes =
		dragPreview?.sourceContainerId === containerId && activeDragId
			? scenes.filter((scene) => String(scene.id) !== String(activeDragId))
			: scenes;

	filteredScenes.forEach((scene, index) => {
		if (previewIndex === index) {
			blocks.push(<CalendarDragPlaceholderBlock key={`placeholder-${containerId}-${index}`} dragHeight={dragHeight} />);
		}
		blocks.push(renderScene(scene));
	});

	if (previewIndex === filteredScenes.length) {
		blocks.push(<CalendarDragPlaceholderBlock key={`placeholder-${containerId}-end`} dragHeight={dragHeight} />);
	} else if (filteredScenes.length === 0 && previewIndex === 0 && activeDragId) {
		blocks.push(<CalendarDragPlaceholderBlock key={`placeholder-${containerId}-empty`} dragHeight={dragHeight} />);
	}

	return blocks;
};

const ScheduleColumn = ({ day, isEditing, scheduleMode, sceneHours, setSceneHours, setScheduleDays, characterNameToIdMap, isEpisodic, dragPreview, activeDragId, onSceneColorChange, onSceneClick, dragHeight }) => {
	const { setNodeRef } = useDroppable({
		id: day.id,
	});

	const [drop, setDrop] = useState(true);

	const d = day.date.split("-");

	return (
		<div id={`day-column-${day.id}`} ref={setNodeRef} className={`sched-day-card ${!drop ? "sched-day-card-collapsed" : ""}`}>
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
				<table className="sched-table">
					<thead className="sched-thead">
						<tr className="sched-header-row">
							<th className="sched-header-cell sched-drag-handle-header" />
							{isEpisodic && <th className="sched-header-cell">Ep</th>}
							<th className="sched-header-cell">Scene</th>
							<th className="sched-header-cell">Int./Ext.</th>
							<th className="sched-header-cell sched-location-synopsis-column">Location/Synopsis</th>
							<th className="sched-header-cell">Pgs</th>
							<th className="sched-header-cell">Characters</th>
							<th className="sched-header-cell">Est. Hours</th>
							<th className="sched-header-cell sched-scene-color-rail-header" />
						</tr>
					</thead>
					<tbody>
						{renderRowsWithPlaceholder({
							scenes: day.scenes,
							containerId: day.id,
							dragPreview,
							activeDragId,
							colSpan: isEpisodic ? 9 : 8,
							dragHeight: dragHeight,
							renderScene: (scene) => (
								<SceneCard
									key={scene.id}
									scene={scene}
									isEditing={isEditing}
									scheduleMode={scheduleMode}
									sceneHours={sceneHours}
									setSceneHours={setSceneHours}
									characterNameToIdMap={characterNameToIdMap}
									isEpisodic={isEpisodic}
									onSceneColorChange={onSceneColorChange}
									onSceneClick={onSceneClick}
								/>
							),
						})}
					</tbody>
				</table>
			)}
		</div>
	);
};

// Draggable scene card for unscheduled scenes
const UnscheduledSceneCard = ({ scene, isEditing, characterNameToIdMap, isEpisodic, onSceneClick, onSceneColorChange }) => {
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: scene.id,
		disabled: !isEditing,
	});

	const style = {
		cursor: isDragging ? "grabbing" : isEditing ? "grab" : "default",
		userSelect: "none",
		opacity: isDragging ? 0.18 : 1,
	};

	return (
		<tr
			ref={setNodeRef}
			style={{ ...style, ...getSceneColorVars(scene.scene_color) }}
			className={`sched-data-row sched-scene-color-row sched-unscheduled-drag-row ${isEditing ? "sched-data-row-draggable" : ""} ${onSceneClick ? "sched-scene-row-clickable" : ""}`}
			onClick={onSceneClick ? () => onSceneClick(scene) : undefined}
			data-schedule-scene-row="true"
			data-scene-id={String(scene.id)}
			{...(isEditing ? { ...attributes, ...listeners } : {})}
		>
			<td className="sched-data-cell sched-drag-handle-cell">
				{isEditing && (
					<DragHandle
						handleProps={{
							...attributes,
							...listeners,
						}}
					/>
				)}
			</td>
			{isEpisodic && <td className="sched-data-cell">{scene.episode_number || "-"}</td>}
			<td className="sched-data-cell sched-unscheduled-scene-number">{scene.scene_number}</td>
			<td className="sched-data-cell">{scene.int_ext || "N/A"}</td>
			<td className="sched-data-cell sched-location-synopsis-column">
				{scene.location_name} <br /> <br />
				Synopsis: {scene.synopsis || "N/A"}
			</td>
			<td className="sched-data-cell">{formatPageEights(scene.page_eighths) || "N/A"}</td>
			<td className="sched-data-cell">{(scene.character_names || []).map((name) => characterNameToIdMap[name.toUpperCase()] || name).join(", ")}</td>
			<td className="sched-data-cell sched-scene-color-rail-cell">
				<SceneColorButton
					sceneId={scene.id}
					sceneNumber={scene.scene_number}
					color={scene.scene_color}
					onSceneColorChange={onSceneColorChange}
					interactive={true}
				/>
			</td>
		</tr>
	);
};

// Draggable scene block for calendar view
const CalendarSceneBlock = ({ scene, isEditing }) => {
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: scene.id,
		disabled: !isEditing,
	});

	const style = {
		cursor: isEditing ? "grab" : "default",
		userSelect: "none",
		opacity: isDragging ? 0.2 : 1,
		...getSceneColorVars(scene.scene_color),
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`sched-calendar-scene-block ${isEditing ? "sched-calendar-scene-draggable" : ""}`}
			{...attributes}
			{...listeners}
			data-calendar-scene-block="true"
			data-scene-id={String(scene.id)}
		>
			<b>
				<div>
					{formatSceneDisplay(scene.scene_number, scene.episode_number)}
					{"   "}
					{scene.int_ext && scene.int_ext} {"      "}
					{scene.location_name || "N/A"}
					{"    -    "}
					{scene.time_of_day && <span>{scene.time_of_day}</span>}
				</div>
			</b>
		</div>
	);
};

// Droppable calendar day column
const CalendarDayColumn = ({ day, isEditing, formatCalendarDateHeader, dragPreview, activeDragId, dragHeight }) => {
	const { setNodeRef } = useDroppable({
		id: `calendar-${day.id}`,
	});

	const { weekday, fullDate } = formatCalendarDateHeader(day.date);

	return (
		<div ref={setNodeRef} id={`calendar-column-${day.id}`} className={`sched-calendar-day-column ${isEditing ? "sched-calendar-day-droppable" : ""}`}>
			<div className="sched-calendar-day-header">
				<span className="sched-calendar-weekday">{weekday}</span>
				<span className="sched-calendar-date-label">{fullDate}</span>
			</div>
			<div className="sched-calendar-scenes-container">
				{day.scenes && day.scenes.length > 0 || (dragPreview?.containerId === String(day.id) && activeDragId) ? (
					renderBlocksWithPlaceholder({
						scenes: day.scenes || [],
						containerId: String(day.id),
						dragPreview,
						activeDragId,
						dragHeight: dragHeight,
						renderScene: (scene) => <CalendarSceneBlock key={scene.id} scene={scene} isEditing={isEditing} />
					})
				) : (
					<div className="sched-calendar-no-scenes">{isEditing ? "Drop scenes here" : "No scenes"}</div>
				)}
			</div>
		</div>
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
		if (String(day.id) === String(id)) {
			return day;
		}
		if (day.scenes.find((scene) => String(scene.id) === String(id))) {
			return day;
		}
	}
	return null;
}

function resolveDropTarget(days, targetId, unscheduledScenesWithIds = [], insertAtTop = false) {
	const container = insertAtTop
		? targetId === "unscheduled"
			? { id: "unscheduled", scenes: unscheduledScenesWithIds }
			: days.find((day) => day.id === targetId)
		: findContainer(days, targetId, unscheduledScenesWithIds);

	if (!container) {
		return null;
	}

	if (insertAtTop) {
		return { containerId: container.id, index: 0 };
	}

	if (targetId === container.id) {
		return { containerId: container.id, index: container.scenes.length };
	}

	const overIndex = container.scenes.findIndex((scene) => scene.id === targetId);
	return {
		containerId: container.id,
		index: overIndex === -1 ? container.scenes.length : overIndex,
	};
}

function getScheduleContainerElement(containerId, isCalendarTarget = false) {
	if (isCalendarTarget) return document.getElementById(`calendar-column-${containerId}`);
	return document.getElementById(`day-column-${containerId}`) || document.getElementById(`calendar-column-${containerId}`);
}

function getPointerBasedInsertIndex(containerId, activeId, pointerY, isCalendarTarget = false) {
	const container = getScheduleContainerElement(containerId, isCalendarTarget);
	if (!container) return null;

	let rows = [...container.querySelectorAll('tr[data-schedule-scene-row="true"]')];
	if (rows.length === 0) {
		rows = [...container.querySelectorAll('div[data-calendar-scene-block="true"]')];
	}

	rows = rows.filter((row) => row.dataset.sceneId !== String(activeId));

	for (let index = 0; index < rows.length; index += 1) {
		const rect = rows[index].getBoundingClientRect();
		const midpoint = rect.top + rect.height / 2;
		if (pointerY < midpoint) {
			return index;
		}
	}

	return rows.length;
}

function getContainerIdFromPointer(x, y) {
	// Use elementsFromPoint to look through layers (DragOverlay may be on top)
	const elements = document.elementsFromPoint(x, y);
	if (!elements || elements.length === 0) return null;

	for (const element of elements) {
		const timelineNode = element.closest('[id^="timeline-node-"]');
		if (timelineNode?.id) {
			return timelineNode.id.replace("timeline-node-", "");
		}

		const dayColumn = element.closest('[id^="day-column-"]');
		if (dayColumn?.id) {
			return dayColumn.id.replace("day-column-", "");
		}

		const calendarColumn = element.closest('[id^="calendar-column-"]');
		if (calendarColumn?.id) {
			return calendarColumn.id.replace("calendar-column-", "calendar-");
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



// Custom collision detection algorithm that prioritizes the timeline scrollbar dots,
// and falls back to closestCenter for sorting lists to ensure both work flawlessly.
const customCollisionDetection = (args) => {
	const { pointerCoordinates, droppableContainers } = args;
	if (!pointerCoordinates) {
		return closestCenter(args);
	}

	const pointerCollisions = pointerWithin(args);

	if (pointerCollisions.length > 0) {
		const timelineCollision = pointerCollisions.find((collision) => {
			if (!String(collision.id).startsWith("timeline-nav-")) {
				return false;
			}

			const dayId = String(collision.id).replace("timeline-nav-", "");
			const node = document.getElementById(`timeline-node-${dayId}`);
			if (!node) return false;

			const rect = node.getBoundingClientRect();
			return (
				pointerCoordinates.x >= rect.left &&
				pointerCoordinates.x <= rect.right &&
				pointerCoordinates.y >= rect.top &&
				pointerCoordinates.y <= rect.bottom
			);
		});

		if (timelineCollision) {
			return [timelineCollision];
		}
	}

	const nonTimelineContainers = droppableContainers.filter(
		(container) => !String(container.id).startsWith("timeline-nav-"),
	);

	if (nonTimelineContainers.length > 0) {
		const pointerHits = pointerWithin({
			...args,
			droppableContainers: nonTimelineContainers,
		});
		if (pointerHits.length > 0) {
			return pointerHits;
		}

		return closestCenter({
			...args,
			droppableContainers: nonTimelineContainers,
		});
	}

	return closestCenter(args);
};
// Panel to display unscheduled scenes with drag-drop support
const UnscheduledScenesPanel = ({ unscheduledScenesWithIds, isEditing, characterNameToIdMap, isEpisodic, dragPreview, activeDragId, onSceneClick, dragHeight, onSceneColorChange }) => {
	const { setNodeRef } = useDroppable({
		id: "unscheduled",
	});

	const [isExpanded, setIsExpanded] = useState(true);

	const hasScenes = unscheduledScenesWithIds && unscheduledScenesWithIds.length > 0;

	return (
		(isEditing || hasScenes) && (
			<div id="day-column-unscheduled" ref={setNodeRef} className={`sched-unscheduled-panel ${!isExpanded ? "sched-unscheduled-panel-collapsed" : ""}`}>
				<div className="sched-unscheduled-panel-header">
					<h4>
						Unscheduled Scenes ({unscheduledScenesWithIds?.length || 0})
						{isEditing && <span className="sched-drag-hint"> - Drag scenes to schedule or unschedule them</span>}
					</h4>
					<button onClick={() => setIsExpanded(!isExpanded)}>{isExpanded ? "▲" : "▼"}</button>
				</div>
				{isExpanded && (
					hasScenes ? (
						<table className="sched-table">
							<thead className="sched-thead">
								<tr className="sched-header-row">
									<th className="sched-header-cell sched-drag-handle-header" />
									{isEpisodic && <th className="sched-header-cell">Ep</th>}
									<th className="sched-header-cell">Scene</th>
									<th className="sched-header-cell">Int./Ext.</th>
									<th className="sched-header-cell sched-location-synopsis-column">Location/Synopsis</th>
									<th className="sched-header-cell">Pgs</th>
									<th className="sched-header-cell">Characters</th>
									<th className="sched-header-cell sched-scene-color-rail-header" />
								</tr>
							</thead>
							<tbody>
								{renderRowsWithPlaceholder({
									scenes: unscheduledScenesWithIds,
									containerId: "unscheduled",
									dragPreview,
									activeDragId,
									colSpan: isEpisodic ? 8 : 7,
									dragHeight: dragHeight,
									renderScene: (scene) => (
										<UnscheduledSceneCard
											key={scene.id}
											scene={scene}
											isEditing={isEditing}
											characterNameToIdMap={characterNameToIdMap}
											isEpisodic={isEpisodic}
											onSceneClick={onSceneClick}
											onSceneColorChange={onSceneColorChange}
										/>
									),
								})}
							</tbody>
						</table>
					) : (
						<div className={`sched-unscheduled-empty ${dragPreview?.containerId === "unscheduled" && activeDragId ? "sched-unscheduled-empty-target" : ""}`}>
							{isEditing ? "Drag scenes here to unschedule them" : "All scenes are scheduled"}
						</div>
					)
				)}
			</div>
		)
	);
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
	const isEpisodic = useMemo(() => scenes.some((s) => s.episode_number || s["Episode Number"]), [scenes]);
	const [scheduleMode, setScheduleMode] = useState("scenes");
	const [maxHours, setMaxHours] = useState({ hours: "", minutes: "" });
	const [maxPageEights, setMaxPageEights] = useState({ pages: "", eighths: "" });
	const [newScheduleDayInput, setNewScheduleDayInput] = useState("");
	const [sceneHours, setSceneHours] = useState({});
	const [DOODSelected, setDOODselected] = useState(false);
	const [generatedMaxScenes, setGeneratedMaxScenes] = useState("");
	const [generatedTotalShootDays, setGeneratedTotalShootDays] = useState("");
	const [scheduleDates, setScheduleDates] = useState({ start: "N/A", end: "N/A" });
	const [HoursSaved, setHoursSaved] = useState(false);
	const [constraintType, setConstraintType] = useState("");
	const [maxGeneratedPageEightsPerDay, setGeneratedMaxPageEightsPerDay] = useState("");
	const [generatedMaxHoursPerDay, setGeneratedMaxHoursPerDay] = useState("");
	const [conflicts, setConflicts] = useState([]);
	const [showConflictModal, setShowConflictModal] = useState(false);
	const [isDraggingScene, setIsDraggingScene] = useState(false);
	const [activeDragId, setActiveDragId] = useState(null);
	const [dragPreview, setDragPreview] = useState(null);
	const [unscheduledSceneOrder, setUnscheduledSceneOrder] = useState([]);

	// Generate Schedule Modal state
	const [showGenerateModal, setShowGenerateModal] = useState(false);
	const [scheduleStartDate, setScheduleStartDate] = useState("");
	const [scheduleEndDate, setScheduleEndDate] = useState("");
	const [modalElementType, setModalElementType] = useState("character");
	const [modalElement, setModalElement] = useState("");
	const [modalAvailableDates, setModalAvailableDates] = useState([]);
	const [modalUnavailableDates, setModalUnavailableDates] = useState([]);
	const [modalDatePickerMode, setModalDatePickerMode] = useState("flexible");
	const [modalDatePickerValue, setModalDatePickerValue] = useState("range");
	const [modalDateRangeStart, setModalDateRangeStart] = useState("");
	const [modalDateRangeEnd, setModalDateRangeEnd] = useState("");
	const [modalIsSaving, setModalIsSaving] = useState(false);
	const [modalAddMode, setModalAddMode] = useState("available"); // "available" or "unavailable"
	const modalContentRef = useRef(null);
	const doodContentRef = useRef(null);
	const activeSceneRef = useRef(null);
	const lastHoveredTimelineIdRef = useRef(null);
	const lastHoveredContainerRef = useRef(null);
	const activeDragRectRef = useRef(null);
	const pointerPosRef = useRef({ x: 0, y: 0 });
	const doodGridRef = useRef(null);

	// DOOD Modal state
	const [showDoodModal, setShowDoodModal] = useState(false);
	const [doodModalTab, setDoodModalTab] = useState("dood"); // "dood" or "calendar"
	const [doodElementType, setDoodElementType] = useState("character");
	const [doodData, setDoodData] = useState({}); // { elementName: { id, dates: [], unavailable_dates: [], flexible: bool } }
	const [doodOriginalData, setDoodOriginalData] = useState({}); // Original data when modal opens, used to track changes
	const [doodIsSaving, setDoodIsSaving] = useState(false);
	const [doodSelectionMode, setDoodSelectionMode] = useState("available"); // "available" or "unavailable"
	const [doodViewMode, setDoodViewMode] = useState("available"); // "available" or "scheduled"

	// Calendar editing state
	const [isCalendarEditing, setIsCalendarEditing] = useState(false);
	const [calendarOriginalDays, setCalendarOriginalDays] = useState([]);
	const [isCalendarSaving, setIsCalendarSaving] = useState(false);
	const calendarGridRef = useRef(null);
	const calendarContentRef = useRef(null);
	const scheduleContentRef = useRef(null);

	// Cast and Location lists from APIs
	const [castList, setCastList] = useState([]);
	const [locationList, setLocationList] = useState([]);

	// Characters from breakdown data (for dropdown and character mapping)
	const [breakdownCharacters, setBreakdownCharacters] = useState([]);
	const [breakdownScenes, setBreakdownScenes] = useState([]);

	const [parsing, setParsing] = useState([]);
	const [selectedSceneDetails, setSelectedSceneDetails] = useState(null);

	const renderConflictsModal = () => {
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

	const renderSceneDetailsModal = () => {
		if (!selectedSceneDetails) return null;

		const { scene, breakdownScene, parsingScene } = selectedSceneDetails;
		const displaySceneNumber = formatSceneDisplay(
			scene?.scene_number || breakdownScene?.scene_number,
			scene?.episode_number || breakdownScene?.episode_number,
		);
		const sceneHeading = parsingScene?.heading || breakdownScene?.heading || breakdownScene?.set || breakdownScene?.location || "";
		const subtitle = [
			scene?.int_ext || scene?.["Int./Ext."] || breakdownScene?.int_ext,
			scene?.location_name || scene?.Location || breakdownScene?.location,
			scene?.time_of_day || scene?.Time || scene?.["Time of Day"] || breakdownScene?.time,
		]
			.filter(Boolean)
			.join(" • ");
		const synopsis = scene?.synopsis || scene?.Synopsis || breakdownScene?.synopsis;
		const pageEighths = scene?.page_eighths || scene?.["Page Eighths"] || breakdownScene?.page_eighths;
		const characterList = toDisplayList(scene?.character_names || scene?.Characters || breakdownScene?.characters);
		const breakdownGroups = [
			{ label: "Action Props", items: toDisplayList(breakdownScene?.action_props) },
			{ label: "Other Props", items: toDisplayList(breakdownScene?.other_props) },
			{ label: "Picture Vehicles", items: toDisplayList(breakdownScene?.picture_vehicles) },
			{ label: "Animals", items: toDisplayList(breakdownScene?.animals) },
			{ label: "Extras", items: toDisplayList(breakdownScene?.extras) },
			{ label: "Wardrobe", items: toDisplayList(breakdownScene?.wardrobe) },
			{ label: "Set Dressing", items: toDisplayList(breakdownScene?.set_dressing) },
		];
		const metaCards = [
			{ label: "Set", value: breakdownScene?.set || scene?.location_name || scene?.Location || breakdownScene?.location || "-" },
			{ label: "Time", value: scene?.time_of_day || scene?.Time || scene?.["Time of Day"] || breakdownScene?.time || "-" },
			{ label: "Pages", value: formatPageEights(pageEighths) || "-" },
			{ label: "Cast", value: characterList.length ? characterList.join(", ") : "-" },
		];

		return (
			<div className="sched-conflicts-modal-overlay" onClick={() => setSelectedSceneDetails(null)}>
				<div className="sched-scene-details-modal" onClick={(e) => e.stopPropagation()}>
					<div className="sched-scene-details-hero">
						<div className="sched-scene-details-header-copy">
							<div className="sched-scene-details-kicker">Scene Breakdown</div>
							<h2 className="sched-conflicts-modal-heading">Scene {displaySceneNumber || "-"}</h2>
							{subtitle && <div className="sched-scene-details-subtitle">{subtitle}</div>}
						</div>
						<button className="sched-conflicts-modal-close-button" onClick={() => setSelectedSceneDetails(null)}>
							×
						</button>
					</div>

					<div className="sched-scene-details-content">
						<div className="sched-scene-details-meta-grid">
							{metaCards.map((card) => (
								<div key={card.label} className="sched-scene-details-meta-card">
									<div className="sched-scene-details-meta-label">{card.label}</div>
									<div className="sched-scene-details-meta-value">{card.value}</div>
								</div>
							))}
						</div>



						{synopsis && (
							<div className="sched-scene-details-section">
								<div className="sched-scene-details-label">Synopsis</div>
								<div className="sched-scene-details-body">{synopsis}</div>
							</div>
						)}

						<div className="sched-scene-details-section">
							<div className="sched-scene-details-label">Breakdown</div>
							<div className="sched-scene-details-breakdown-grid">
								{breakdownGroups.map((group) => (
									<div key={group.label} className="sched-scene-details-breakdown-card">
										<div className="sched-scene-details-breakdown-title">{group.label}</div>
										{group.items.length > 0 ? (
											<div className="sched-scene-details-chip-list">
												{group.items.map((item) => (
													<span key={`${group.label}-${item}`} className="sched-scene-details-chip">
														{item}
													</span>
												))}
											</div>
										) : (
											<div className="sched-scene-details-empty">None listed</div>
										)}
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	};

	// Generate Schedule Modal Component
	const renderGenerateScheduleModal = () => {
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
						const isLocked = cast.locked !== -1 && cast.locked !== "-1" && cast.locked !== null && cast.locked !== undefined;
						let lockedOptionName = "";
						if (isLocked) {
							const castOptions = cast.cast_options || {};
							const lockedOpt = castOptions[String(cast.locked)];
							lockedOptionName = lockedOpt?.name || lockedOpt?.option_name || String(cast.locked);
						}
						options.push({
							value: cast.character,
							label: `👤 ${cast.character}`,
							cast_id: cast.cast_id,
							isLocked,
							lockedOptionName,
						});
					}
				});
			} else if (type === "location" && locationList.length > 0) {
				locationList.forEach((loc) => {
					const isLocked = loc.locked !== -1 && loc.locked !== "-1" && loc.locked !== null && loc.locked !== undefined;
					let lockedOptionName = "";
					if (isLocked) {
						const locationOptions = loc.location_options || {};
						const lockedOpt = locationOptions[String(loc.locked)];
						lockedOptionName = lockedOpt?.name || lockedOpt?.option_name || String(loc.locked);
					}
					options.push({
						value: loc.location,
						label: `📍 ${loc.location}`,
						location_id: loc.location_id,
						isLocked,
						lockedOptionName,
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
				if (!scheduleStartDate || !scheduleEndDate || !dates || dates.length === 0) return dates || [];
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

				// Load saved unavailable dates
				const savedUnavailableDates = elementData?.unavailable_dates || [];
				const filteredUnavailable = filterDatesInRange(savedUnavailableDates);
				setModalUnavailableDates(filteredUnavailable);

				// Load available dates
				let filteredAvailable = [];
				if (elementData?.dates && elementData.dates.length > 0) {
					const existingDates = parseDateRanges(elementData.dates);
					filteredAvailable = filterDatesInRange(existingDates);
					setModalAvailableDates(filteredAvailable);
				} else {
					// Try to get locked dates as default available dates
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
						filteredAvailable = filterDatesInRange(lockedDates);
						setModalAvailableDates(filteredAvailable);
					} else {
						setModalAvailableDates([]);
					}
				}

				// Auto-select flexible/fixed mode based on whether dates exist
				const hasDates = filteredAvailable.length > 0 || filteredUnavailable.length > 0;
				if (hasDates) {
					setModalDatePickerMode("fixed");
				} else {
					setModalDatePickerMode("flexible");
				}
			} else {
				setModalAvailableDates([]);
				setModalUnavailableDates([]);
				setModalDatePickerMode("flexible");
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
			setModalAvailableDates([]);
			setModalUnavailableDates([]);

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

			setModalAvailableDates([]);
			setModalUnavailableDates([]);

			// Restore scroll position after state update
			requestAnimationFrame(() => {
				if (modalContentRef.current && scrollTop !== undefined) {
					modalContentRef.current.scrollTop = scrollTop;
				}
			});
		};

		const handleModalAddModeChange = (mode) => {
			// Preserve scroll position
			const scrollTop = modalContentRef.current?.scrollTop;

			handleModalDatePickerModeChange("fixed");
			setModalAddMode(mode);

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

			if (modalAddMode === "available") {
				// Add to available, remove from unavailable
				setModalAvailableDates((prev) => {
					if (prev.includes(dateStr)) {
						return prev.filter((d) => d !== dateStr);
					} else {
						return [...prev, dateStr].sort();
					}
				});
				setModalUnavailableDates((prev) => prev.filter((d) => d !== dateStr));
			} else {
				// Add to unavailable, remove from available
				setModalUnavailableDates((prev) => {
					if (prev.includes(dateStr)) {
						return prev.filter((d) => d !== dateStr);
					} else {
						return [...prev, dateStr].sort();
					}
				});
				setModalAvailableDates((prev) => prev.filter((d) => d !== dateStr));
			}

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

			if (modalAddMode === "available") {
				// Add to available, remove from unavailable
				setModalAvailableDates((prev) => {
					if (prev.includes(selectedDate)) {
						return prev;
					} else {
						return [...prev, selectedDate].sort();
					}
				});
				setModalUnavailableDates((prev) => prev.filter((d) => d !== selectedDate));
			} else {
				// Add to unavailable, remove from available
				setModalUnavailableDates((prev) => {
					if (prev.includes(selectedDate)) {
						return prev;
					} else {
						return [...prev, selectedDate].sort();
					}
				});
				setModalAvailableDates((prev) => prev.filter((d) => d !== selectedDate));
			}

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

				// Show green for available dates, red for unavailable dates
				if (modalAvailableDates.includes(formattedDate)) {
					return "highlight-green";
				}
				if (modalUnavailableDates.includes(formattedDate)) {
					return "highlight-red";
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

			// Add range dates to the appropriate list based on mode
			if (modalAddMode === "available") {
				setModalAvailableDates(rangeDates);
				// Remove these dates from unavailable if present
				setModalUnavailableDates((prev) => prev.filter((d) => !rangeDates.includes(d)));
			} else {
				setModalUnavailableDates(rangeDates);
				// Remove these dates from available if present
				setModalAvailableDates((prev) => prev.filter((d) => !rangeDates.includes(d)));
			}
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

				// Prepare dates and unavailable_dates
				let datesToSend = [];
				let unavailableDatesToSend = [];

				if (flexible) {
					// Flexible mode: clear both dates and unavailable_dates
					datesToSend = [];
					unavailableDatesToSend = [];
				} else {
					// Send both available and unavailable dates
					datesToSend = modalAvailableDates;
					unavailableDatesToSend = modalUnavailableDates;
				}

				console.log("sending dates ::: ", datesToSend);
				console.log("sending unavailable_dates ::: ", unavailableDatesToSend);
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
						dates: datesToSend,
						unavailable_dates: unavailableDatesToSend,
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

		const handleCloseGenerateModal = () => {
			setShowGenerateModal(false);
			setModalElementType("character");
			setModalElement("");
			setModalAvailableDates([]);
			setModalUnavailableDates([]);
			setModalDatePickerMode("flexible");
			setModalDatePickerValue("range");
			setModalDateRangeStart("");
			setModalDateRangeEnd("");
			setModalAddMode("available");
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
				if (maxPageEights.pages === "" || maxPageEights.eighths === "") {
					alertMessage = "Please fill in both pages and eighths fields";
				} else {
					const pages = parseInt(maxPageEights.pages, 10) || 0;
					const eighths = parseInt(maxPageEights.eighths, 10) || 0;
					const totalEighths = pages * 8 + eighths;
					if (totalEighths <= 0) {
						alertMessage = "Please enter a valid number of page-eights per day";
					} else {
						payload.max_page_eighths_per_day = totalEighths;
					}
				}
			} else if (scheduleMode === "hours") {
				if (!HoursSaved) {
					alertMessage = "Please save Hours for each scene before generating schedule";
				} else if (maxHours.hours === "" || maxHours.minutes === "") {
					alertMessage = "Please fill in both hours and minutes fields";
				} else {
					const parsedHours = parseHours(maxHours);
					if (parsedHours <= 0) {
						alertMessage = "Please enter a valid number of hours per day";
					} else {
						payload.max_hours_per_day = parsedHours;
					}
				}
			}

			if (alertMessage) {
				alert(alertMessage);
				return;
			}

			try {
				handleCloseGenerateModal();
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
				setGeneratedTotalShootDays(result.total_shoot_days || "N/A");

				setTimeout(async () => {
					try {
						const refreshResponse = await fetch(getApiUrl(`/api/${id}/schedule/${scheduleId}`));
						if (refreshResponse.ok) {
							const refreshedData = await refreshResponse.json();
							setScheduleData(refreshedData);
							setGeneratedMaxScenes(refreshedData["generated_schedule"]["constraints"]["max_scenes_per_day"] || "N/A");
							setConstraintType(refreshedData["generated_schedule"]["constraints"]["constraint_type"] || "N/A");
							setGeneratedMaxPageEightsPerDay(refreshedData["generated_schedule"]["constraints"]["max_page_eighths_per_day"] || "N/A");
							setGeneratedMaxHoursPerDay(refreshedData["generated_schedule"]["constraints"]["max_hours_per_day"] || "N/A");
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
			<div className="sched-conflicts-modal-overlay" onClick={handleCloseGenerateModal}>
				<div className="sched-generate-modal" ref={modalContentRef} onClick={(e) => e.stopPropagation()}>
					<div className="sched-conflicts-modal-header">
						<h2 className="sched-conflicts-modal-heading">Generate Schedule</h2>
						<button className="sched-conflicts-modal-close-button" onClick={handleCloseGenerateModal}>
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
										<CustomDatePicker
											value={scheduleStartDate}
											onChange={(e) => setScheduleStartDate(e.target.value)}
											className="sched-date-range-input"
										/>
									</label>
									<span className="sched-date-range-separator">to</span>
									<label className="sched-controls-label">
										End Date:
										<CustomDatePicker
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

						{/* Scheduling Constraint Section */}
						<div className="sched-generate-section">
							<h3 className="sched-section-title">Scheduling Constraint</h3>
							<div className="sched-controls-group">
								<label className="sched-controls-label">
									Schedule By:
									<select
										value={scheduleMode}
										onChange={(e) => setScheduleMode(e.target.value)}
										className="sched-mode-dropdown"
										style={{ marginLeft: "10px" }}
									>
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
										min="1"
										style={{ marginLeft: "10px", width: "80px" }}
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
										min="0"
										style={{ marginLeft: "10px", width: "60px" }}
									/>
									<input
										type="number"
										value={maxPageEights.eighths}
										onChange={(e) => setMaxPageEights({ ...maxPageEights, eighths: e.target.value })}
										className="sched-page-input"
										min="0"
										max="7"
										style={{ marginLeft: "5px", width: "60px" }}
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
										style={{ marginLeft: "10px", width: "60px" }}
									/>
									<span>:</span>
									<input
										type="number"
										className="sched-page-input"
										placeholder="MM"
										value={maxHours.minutes}
										onChange={(e) => setMaxHours({ ...maxHours, minutes: e.target.value })}
										style={{ marginLeft: "5px", width: "60px" }}
									/>
								</div>
							)}
						</div>

						{/* Character/Location Availability Section */}
						{scheduleStartDate && scheduleEndDate && (
							<div className="sched-generate-section">
								<h3 className="sched-section-title">Edit Availability Dates</h3>
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
									<div className="sched-selector-header sched-selector-header-margin" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
										{(() => {
											const selectedOpt = getModalElementOptions(modalElementType).find(o => o.value === modalElement);
											if (selectedOpt?.isLocked) {
												return (
													<span style={{
														display: "inline-flex",
														alignItems: "center",
														gap: "4px",
														background: "rgba(251,191,36,0.15)",
														border: "1px solid rgba(251,191,36,0.5)",
														color: "#fbbf24",
														borderRadius: "6px",
														padding: "2px 8px",
														fontSize: "0.75rem",
														fontWeight: 600,
														whiteSpace: "nowrap",
													}}>
														🔒 Locked{selectedOpt.lockedOptionName ? `: ${selectedOpt.lockedOptionName}` : ""}
													</span>
												);
											}
											return null;
										})()}
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
											<>
												{modalAvailableDates.length === 0 && modalUnavailableDates.length === 0 && (
													<p className="sched-flexible-info-text">
														No dates are set for this {modalElementType}. It will be considered <strong>flexible</strong> and can be scheduled on any available day.
													</p>
												)}
												<button
													onClick={() => handleModalSaveDates(true)}
													className="sched-add-range-button"
													disabled={modalIsSaving}
												>
													{modalIsSaving ? "Saving..." : "Save Flexible Dates"}
												</button>
											</>
										)}

										{modalDatePickerMode === "fixed" && (
											<>
												{/* Second level: Available / Unavailable mode selector */}
												<div className="sched-mode-selector">
													<label className="sched-mode-label">
														<input
															type="checkbox"
															checked={modalAddMode === "available"}
															onChange={() => handleModalAddModeChange("available")}
															className="sched-checkbox-input"
														/>
														Mark Available (Green)
													</label>
													<label className="sched-mode-label">
														<input
															type="checkbox"
															checked={modalAddMode === "unavailable"}
															onChange={() => handleModalAddModeChange("unavailable")}
															className="sched-checkbox-input"
														/>
														Mark Unavailable (Red)
													</label>
												</div>

												{/* Date Range Selector */}
												<div className="sched-date-range-container">
													<div className="sched-date-range-inputs">
														<CustomDatePicker
															value={modalDateRangeStart}
															min={scheduleStartDate}
															max={scheduleEndDate}
															onChange={(e) => handleModalDateRangeStartChange(e.target.value)}
															className="sched-date-range-input"
															placeholder="Start Date"
														/>
														<span className="sched-date-range-separator">to</span>
														<CustomDatePicker
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

												{/* Always show calendar when Fixed is selected */}
												<div className="sched-selected-dates-list">
													<div className="sched-selected-dates-header">
														<span>
															Available: {modalAvailableDates.length} | Unavailable: {modalUnavailableDates.length}
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
	const renderDoodModal = () => {
		if (!showDoodModal) return null;

		// Generate array of dates between start and end
		const doodStart = scheduleStartDate || scheduleData?.first_date || "";
		const doodEnd = scheduleEndDate || scheduleData?.last_date || "";

		const generateDateColumns = () => {
			if (!doodStart || !doodEnd) return [];
			const dates = [];
			const start = new Date(doodStart);
			const end = new Date(doodEnd);
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

		// Get scheduled dates for each element based on scheduleDays state
		const getScheduledDatesForElement = (elementName) => {
			if (!scheduleDays || scheduleDays.length === 0) return [];
			const scheduledDates = [];
			scheduleDays.forEach((day) => {
				if (day.scenes && day.scenes.length > 0) {
					day.scenes.forEach((scene) => {
						if (doodElementType === "character") {
							// Check if character is in this scene
							const characterNames = scene.character_names || [];
							if (characterNames.some((name) => name.toUpperCase() === elementName.toUpperCase())) {
								if (!scheduledDates.includes(day.date)) {
									scheduledDates.push(day.date);
								}
							}
						} else {
							// Check if location matches
							if (scene.location_name && scene.location_name.toUpperCase() === elementName.toUpperCase()) {
								if (!scheduledDates.includes(day.date)) {
									scheduledDates.push(day.date);
								}
							}
						}
					});
				}
			});
			return scheduledDates.sort();
		};

		// Get locked option info for an element
		const getLockedOptionInfo = (elementName) => {
			if (doodElementType === "character") {
				const selectedChar = castList.find((cast) => cast.character?.toUpperCase() === elementName.toUpperCase());
				if (!selectedChar) return null;

				const lockedOptionId = selectedChar.locked;
				if (lockedOptionId === -1 || lockedOptionId === "-1" || lockedOptionId === null || lockedOptionId === undefined) {
					return null;
				}

				const castOptions = selectedChar.cast_options || {};
				const lockedOption = castOptions[String(lockedOptionId)];

				if (!lockedOption) return null;

				return {
					optionName: lockedOption.actor_name || lockedOption.actorName || "Unknown",
				};
			} else {
				const selectedLoc = locationList.find((loc) => loc.location?.toUpperCase() === elementName.toUpperCase());
				if (!selectedLoc) return null;

				const lockedOptionId = selectedLoc.locked;
				if (lockedOptionId === -1 || lockedOptionId === "-1" || lockedOptionId === null || lockedOptionId === undefined) {
					return null;
				}

				const locationOptions = selectedLoc.location_options || {};
				const lockedOption = locationOptions[String(lockedOptionId)];

				if (!lockedOption) return null;

				return {
					optionName: lockedOption.locationName || lockedOption.location_name || "Unknown",
				};
			}
		};

		// Check if a date is scheduled for an element
		const isDateScheduled = (elementName, date) => {
			return getScheduledDatesForElement(elementName).includes(date);
		};

		// Initialize doodData when modal opens or element type changes
		const initializeDoodData = () => {
			const newData = {};
			const datesSection = doodElementType === "character" ? "characters" : "locations";

			elements.forEach((elem) => {
				const existingData = scheduleData?.dates?.[datesSection]?.[elem.name];
				const existingDates = existingData?.dates || (Array.isArray(existingData) ? existingData : []);
				const existingUnavailableDates = existingData?.unavailable_dates || [];
				const isFlexible = existingData?.flexible || scheduleData?.dates?.flexible?.[datesSection]?.[elem.id] || false;

				newData[elem.name] = {
					id: elem.id,
					dates: parseDateRanges(existingDates),
					unavailable_dates: parseDateRanges(existingUnavailableDates),
					flexible: isFlexible,
				};
			});
			setDoodData(newData);
		};

		// Check if a cell is selected (date is available)
		const isCellSelected = (elementName, date) => {
			return doodData[elementName]?.dates?.includes(date) || false;
		};

		// Check if a cell is marked as unavailable
		const isCellUnavailable = (elementName, date) => {
			return doodData[elementName]?.unavailable_dates?.includes(date) || false;
		};

		// Check if element is flexible
		const isElementFlexible = (elementName) => {
			return doodData[elementName]?.flexible || false;
		};

		// Check if doodData has changed from original
		const hasDoodChanges = () => {
			if (Object.keys(doodData).length !== Object.keys(doodOriginalData).length) return true;
			for (const elementName of Object.keys(doodData)) {
				const current = doodData[elementName];
				const original = doodOriginalData[elementName];
				if (!original) return true;
				if (current.flexible !== original.flexible) return true;
				if (JSON.stringify(current.dates?.sort()) !== JSON.stringify(original.dates?.sort())) return true;
				if (JSON.stringify(current.unavailable_dates?.sort()) !== JSON.stringify(original.unavailable_dates?.sort())) return true;
			}
			return false;
		};

		// Check if any element has dates outside the doodStart-doodEnd range
		const hasDatesOutOfRange = () => {
			if (!doodStart || !doodEnd || Object.keys(doodData).length === 0) return false;
			const rangeStart = new Date(doodStart);
			const rangeEnd = new Date(doodEnd);
			for (const elementName of Object.keys(doodData)) {
				const data = doodData[elementName];
				if (data.flexible) continue;
				const allDates = [...(data.dates || []), ...(data.unavailable_dates || [])];
				for (const dateStr of allDates) {
					const d = new Date(dateStr);
					if (d < rangeStart || d > rangeEnd) return true;
				}
			}
			return false;
		};

		// Toggle a single cell based on selection mode
		const toggleCell = (elementName, date) => {
			if (isElementFlexible(elementName)) return; // Can't toggle if flexible

			const scrollTop = doodGridRef.current?.scrollTop;
			const scrollLeft = doodGridRef.current?.scrollLeft;
			setDoodData((prev) => {
				const current = prev[elementName] || { id: null, dates: [], unavailable_dates: [], flexible: false };
				const dates = current.dates || [];
				const unavailableDates = current.unavailable_dates || [];

				if (doodSelectionMode === "available") {
					// Toggle in available dates
					const isCurrentlySelected = dates.includes(date);
					const newDates = isCurrentlySelected ? dates.filter((d) => d !== date) : [...dates, date].sort();
					// Remove from unavailable if adding to available
					const newUnavailable = isCurrentlySelected ? unavailableDates : unavailableDates.filter((d) => d !== date);
					return {
						...prev,
						[elementName]: {
							...current,
							dates: newDates,
							unavailable_dates: newUnavailable,
						},
					};
				} else {
					// Toggle in unavailable dates
					const isCurrentlyUnavailable = unavailableDates.includes(date);
					const newUnavailable = isCurrentlyUnavailable ? unavailableDates.filter((d) => d !== date) : [...unavailableDates, date].sort();
					// Remove from available if adding to unavailable
					const newDates = isCurrentlyUnavailable ? dates : dates.filter((d) => d !== date);
					return {
						...prev,
						[elementName]: {
							...current,
							dates: newDates,
							unavailable_dates: newUnavailable,
						},
					};
				}
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
				const current = prev[elementName] || { id: null, dates: [], unavailable_dates: [], flexible: false };
				return {
					...prev,
					[elementName]: {
						...current,
						flexible: !current.flexible,
						dates: !current.flexible ? [] : current.dates, // Clear dates when setting flexible
						unavailable_dates: !current.flexible ? [] : current.unavailable_dates, // Clear unavailable dates when setting flexible
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

		// Select all dates for an element (based on current selection mode)
		const selectAllDates = (elementName) => {
			if (isElementFlexible(elementName)) return;

			const scrollTop = doodGridRef.current?.scrollTop;
			const scrollLeft = doodGridRef.current?.scrollLeft;
			setDoodData((prev) => {
				const current = prev[elementName] || { id: null, dates: [], unavailable_dates: [], flexible: false };
				if (doodSelectionMode === "available") {
					return {
						...prev,
						[elementName]: {
							...current,
							dates: [...dateColumns],
							unavailable_dates: [], // Clear unavailable when selecting all as available
						},
					};
				} else {
					return {
						...prev,
						[elementName]: {
							...current,
							dates: [], // Clear available when selecting all as unavailable
							unavailable_dates: [...dateColumns],
						},
					};
				}
			});
			setTimeout(() => {
				if (doodGridRef.current) {
					if (scrollTop !== undefined) doodGridRef.current.scrollTop = scrollTop;
					if (scrollLeft !== undefined) doodGridRef.current.scrollLeft = scrollLeft;
				}
			}, 0);
		};

		// Clear all dates for an element (clears both available and unavailable dates)
		const clearAllDates = (elementName) => {
			if (isElementFlexible(elementName)) return;

			const scrollTop = doodGridRef.current?.scrollTop;
			const scrollLeft = doodGridRef.current?.scrollLeft;
			setDoodData((prev) => {
				const current = prev[elementName] || { id: null, dates: [], unavailable_dates: [], flexible: false };
				return {
					...prev,
					[elementName]: {
						...current,
						dates: [],
						unavailable_dates: [],
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
					start_date: doodStart,
					end_date: doodEnd,
				};

				const targetKey = doodElementType === "character" ? "characters" : "locations";

				// Filter helper: only keep dates within doodStart to doodEnd range
				const filterDatesInRange = (dates) => {
					if (!dates || dates.length === 0 || !doodStart || !doodEnd) return dates || [];
					const rangeStart = new Date(doodStart);
					const rangeEnd = new Date(doodEnd);
					return dates.filter((dateStr) => {
						const d = new Date(dateStr);
						return d >= rangeStart && d <= rangeEnd;
					});
				};

				Object.entries(doodData).forEach(([name, data]) => {
					payload[targetKey][name] = {
						id: data.id,
						dates: data.flexible ? [] : filterDatesInRange(data.dates),
						flexible: data.flexible,
						unavailable_dates: data.flexible ? [] : filterDatesInRange(data.unavailable_dates || []),
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
				setDoodOriginalData(JSON.parse(JSON.stringify(doodData))); // Update original data so Save button hides
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
			const month = date.toLocaleDateString("en-US", { month: "short" });
			return { day, weekday, month };
		};

		// Format date for calendar display
		const formatCalendarDateHeader = (dateStr) => {
			const date = new Date(dateStr);
			const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
			const dd = String(date.getDate()).padStart(2, "0");
			const mm = String(date.getMonth() + 1).padStart(2, "0");
			const yyyy = date.getFullYear();
			const fullDate = `${dd}/${mm}/${yyyy}`;
			return { weekday, fullDate };
		};

		return (
			<div className="sched-conflicts-modal-overlay" onClick={() => setShowDoodModal(false)}>
				<div className="sched-dood-modal" onClick={(e) => e.stopPropagation()}>
					<div className="sched-conflicts-modal-header">
						<h2 className="sched-conflicts-modal-heading">Schedule Overview</h2>
						<button className="sched-conflicts-modal-close-button" onClick={() => setShowDoodModal(false)}>
							×
						</button>
					</div>

					{/* Tabs */}
					<div className="sched-modal-tabs">
						<button className={`sched-modal-tab ${doodModalTab === "dood" ? "active" : ""}`} onClick={() => setDoodModalTab("dood")}>
							DOODs
						</button>
						<button className={`sched-modal-tab ${doodModalTab === "calendar" ? "active" : ""}`} onClick={() => setDoodModalTab("calendar")}>
							Schedule Calendar
						</button>
					</div>

					{doodModalTab === "dood" ? (
						<div className="sched-dood-modal-content" ref={doodContentRef}>
							<div className="sched-dood-controls">

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

								<div className="sched-dood-view-selector">
									<label>
										View:
										<select
											value={doodViewMode}
											onChange={(e) => setDoodViewMode(e.target.value)}
											className="sched-element-dropdown"
										>
											<option value="available">See Available Dates</option>
											<option value="scheduled">See Scheduled Dates</option>
										</select>
									</label>
								</div>

								{doodViewMode === "available" && (
									<div className="sched-dood-mode-selector">
										<label>
											Selection Mode:
											<select
												value={doodSelectionMode}
												onChange={(e) => setDoodSelectionMode(e.target.value)}
												className="sched-element-dropdown"
											>
												<option value="available">Available Dates</option>
												<option value="unavailable">Unavailable Dates</option>
											</select>
										</label>
									</div>
								)}

								{doodViewMode === "available" && (hasDoodChanges() || hasDatesOutOfRange()) && (
									<button
										onClick={handleDoodSave}
										className="sched-action-btn-success"
										disabled={doodIsSaving || !doodStart || !doodEnd}
									>
										{doodIsSaving ? "Saving..." : "Save All"}
									</button>
								)}
							</div>

							{/* DOOD Grid */}
							{doodStart && doodEnd && dateColumns.length > 0 ? (
								<div className="sched-dood-grid-wrapper" ref={doodGridRef}>
									<div className="sched-dood-grid">
										<table className="sched-dood-table">
											<thead>
												<tr>
													<th className="sched-dood-header-cell sched-dood-element-header">
														{doodElementType === "character" ? "Character" : "Set"}
													</th>
													{doodViewMode === "available" && (
														<th className="sched-dood-header-cell sched-dood-actions-header">Actions</th>
													)}
													{dateColumns.map((date) => {
														const { day, weekday, month } = formatDateHeader(date);
														return (
															<th key={date} className="sched-dood-header-cell sched-dood-date-header">
																<div className="sched-dood-date-label">
																	<span className="sched-dood-weekday">{weekday}</span>
																	<span className="sched-dood-day">{day}</span>
																	<span className="sched-dood-month">{month}</span>
																</div>
															</th>
														);
													})}
												</tr>
											</thead>
											<tbody>
												{elements.map((elem) => {
													const lockedInfo = getLockedOptionInfo(elem.name);
													return (
														<tr
															key={elem.name}
															className={
																doodViewMode === "available" && isElementFlexible(elem.name)
																	? "sched-dood-row-flexible"
																	: ""
															}
														>
															<td className="sched-dood-element-cell">
																<div>{elem.name}</div>
																<div className="sched-dood-locked-info">
																	{lockedInfo ? (
																		<span className="sched-dood-locked">
																			(Option Locked: {lockedInfo.optionName})
																		</span>
																	) : (
																		<span className="sched-dood-not-locked">(Not Locked)</span>
																	)}
																</div>
															</td>
															{doodViewMode === "available" && (
																<td className="sched-dood-actions-cell">
																	<button
																		onClick={() => toggleFlexible(elem.name)}
																		className={`sched-dood-flex-btn ${isElementFlexible(elem.name) ? "active" : ""}`}
																		title="Toggle Flexible"
																	>
																		F
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
															)}
															{doodViewMode === "available"
																? // Available dates view - editable
																dateColumns.map((date) => {
																	const isFlexible = isElementFlexible(elem.name);
																	const isSelected = isCellSelected(elem.name, date);
																	const isUnavailable = isCellUnavailable(elem.name, date);

																	let cellClass = "sched-dood-cell";
																	let cellContent = "";

																	if (isFlexible) {
																		cellClass += " sched-dood-cell-flexible";
																		cellContent = "F";
																	} else if (isUnavailable) {
																		cellClass += " sched-dood-cell-unavailable";
																		cellContent = "✕";
																	} else if (isSelected) {
																		cellClass += " sched-dood-cell-selected";
																		cellContent = "✓";
																	} else {
																		cellClass += " sched-dood-cell-empty";
																	}

																	return (
																		<td
																			key={date}
																			className={cellClass}
																			onClick={() => toggleCell(elem.name, date)}
																		>
																			{cellContent}
																		</td>
																	);
																})
																: // Scheduled dates view - read only
																dateColumns.map((date) => {
																	const isScheduled = isDateScheduled(elem.name, date);

																	return (
																		<td
																			key={date}
																			className={`sched-dood-cell ${isScheduled ? "sched-dood-cell-scheduled" : "sched-dood-cell-empty"}`}
																			style={{ cursor: "default" }}
																		>
																			{isScheduled ? "✓" : ""}
																		</td>
																	);
																})}
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								</div>
							) : (
								<div className="sched-dood-placeholder">
									{!doodStart || !doodEnd
										? "Please set a schedule date range first (in the Generate Schedule modal)"
										: "No data to display"}
								</div>
							)}

							{/* Legend */}
							<div className="sched-dood-legend">
								{doodViewMode === "available" ? (
									<>
										<div className="sched-dood-legend-item">
											<span className="sched-dood-legend-box sched-dood-cell-selected"></span>
											<span>Available</span>
										</div>
										<div className="sched-dood-legend-item">
											<span className="sched-dood-legend-box sched-dood-cell-unavailable"></span>
											<span>Unavailable</span>
										</div>
										<div className="sched-dood-legend-item">
											<span className="sched-dood-legend-box sched-dood-cell-empty"></span>
											<span>Unselected</span>
										</div>
										<div className="sched-dood-legend-item">
											<span className="sched-dood-legend-box sched-dood-cell-flexible"></span>
											<span>Flexible (any date)</span>
										</div>
									</>
								) : (
									<>
										<div className="sched-dood-legend-item">
											<span className="sched-dood-legend-box sched-dood-cell-scheduled"></span>
											<span>Scheduled</span>
										</div>
										<div className="sched-dood-legend-item">
											<span className="sched-dood-legend-box sched-dood-cell-empty"></span>
											<span>Not Scheduled</span>
										</div>
									</>
								)}
							</div>
						</div>
					) : (
						/* Schedule Calendar Tab */
						<div className="sched-calendar-modal-content" ref={calendarContentRef}>
							{/* Edit Controls */}
							<div className="sched-calendar-controls">
								{!isCalendarEditing ? (
									<button
										onClick={() => {
											setCalendarOriginalDays(JSON.parse(JSON.stringify(scheduleDays)));
											setIsCalendarEditing(true);
										}}
										className="sched-action-btn"
										disabled={!scheduleDays || scheduleDays.length === 0}
									>
										Edit Schedule
									</button>
								) : (
									<>
										<button onClick={handleCalendarSaveChanges} className="sched-action-btn-success" disabled={isCalendarSaving}>
											{isCalendarSaving ? "Saving..." : "Save Changes"}
										</button>
										<button
											onClick={() => {
												setScheduleDays(calendarOriginalDays);
												setIsCalendarEditing(false);
											}}
											className="sched-action-btn-cancel"
											disabled={isCalendarSaving}
										>
											Cancel
										</button>
										<span className="sched-calendar-edit-hint">Drag and drop scenes between days to reschedule</span>
									</>
								)}
							</div>
							{scheduleDays && scheduleDays.length > 0 ? (
								<div className="sched-calendar-grid-wrapper" ref={calendarGridRef}>
										<DndContext
											sensors={sensors}
											collisionDetection={closestCenter}
											measuring={{
												droppable: {
													strategy: MeasuringStrategy.Always,
												},
											}}
											onDragStart={(event) => {
												setActiveDragId(event.active.id);
												setIsDraggingScene(true);
												if (event.active.rect.current.initial) {
													activeDragRectRef.current = event.active.rect.current.initial;
												}
											}}
											onDragOver={handleDragOver}
											onDragCancel={() => {
												setActiveDragId(null);
												setIsDraggingScene(false);
											}}
											onDragEnd={(event) => {
												handleCalendarDragEnd(event);
												setActiveDragId(null);
												setIsDraggingScene(false);
											}}
										>
											<div className="sched-calendar-grid">
												{scheduleDays.map((day) => (
													<CalendarDayColumn
														key={day.id}
														day={day}
														isEditing={isCalendarEditing}
														formatCalendarDateHeader={formatCalendarDateHeader}
														dragPreview={dragPreview}
														activeDragId={activeDragId}
														dragHeight={activeDragRectRef.current?.height}
													/>
												))}
											</div>
											<DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.08)" }}>
												{activeDragId ? (() => {
													const dragScene = getActiveScene();
													if (!dragScene) return null;
													return (
														<div
															className="sched-calendar-scene-block sched-calendar-scene-draggable"
															style={{
																...getSceneColorVars(dragScene.scene_color),
																opacity: 0.9,
																transform: "scale(1.02)",
																boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
																cursor: "grabbing",
																pointerEvents: "none",
															}}
														>
															<b>
																<div>
																	{formatSceneDisplay(dragScene.scene_number, dragScene.episode_number)}
																	{"   "}
																	{dragScene.int_ext && dragScene.int_ext} {"      "}
																	{dragScene.location_name || "N/A"}
																	{"    -    "}
																	{dragScene.time_of_day && <span>{dragScene.time_of_day}</span>}
																</div>
															</b>
														</div>
													);
												})() : null}
											</DragOverlay>
										</DndContext>
								</div>
							) : (
								<div className="sched-calendar-placeholder">No schedule data available. Generate a schedule first.</div>
							)}
						</div>
					)}
				</div>
			</div>
		);
	};

	const handleSaveChanges = async () => {
		try {
			const filteredDays = await persistScheduleDays(scheduleDays);
			setScheduleDays(filteredDays);
			fetchScheduleData();
			alert("Schedule saved successfully!");
			setIsEditing(false);
		} catch (error) {
			console.error("Error saving schedule:", error);
			alert("Failed to save schedule: " + error.message);
			setScheduleDays(originalScheduleDays);
		}
	};

	// Calendar edit save function - uses same API as handleSaveChanges
	const handleCalendarSaveChanges = async () => {
		const scrollLeft = calendarGridRef.current?.scrollLeft;
		const scrollTop = calendarGridRef.current?.scrollTop;
		const contentScrollTop = calendarContentRef.current?.scrollTop;
		setIsCalendarSaving(true);
		try {
			const filteredDays = await persistScheduleDays(scheduleDays);
			setScheduleDays(filteredDays);
			await fetchScheduleData();
			setIsCalendarEditing(false);
			// Restore scroll position after React re-renders
			const restoreScroll = () => {
				if (calendarGridRef.current) {
					if (scrollLeft !== undefined) calendarGridRef.current.scrollLeft = scrollLeft;
					if (scrollTop !== undefined) calendarGridRef.current.scrollTop = scrollTop;
				}
				if (calendarContentRef.current && contentScrollTop !== undefined) {
					calendarContentRef.current.scrollTop = contentScrollTop;
				}
			};
			setTimeout(restoreScroll, 50);
			setTimeout(restoreScroll, 100);
			setTimeout(restoreScroll, 200);
			setTimeout(() => alert("Schedule saved successfully!"), 250);
		} catch (error) {
			console.error("Error saving calendar schedule:", error);
			alert("Failed to save schedule: " + error.message);
			setScheduleDays(calendarOriginalDays);
		} finally {
			setIsCalendarSaving(false);
		}
	};

	// Helper function to find container for calendar drag-drop
	const findCalendarContainer = (days, id) => {
		// Check if it's a day container
		const calendarPrefix = "calendar-";
		if (typeof id === "string" && id.startsWith(calendarPrefix)) {
			const dayId = id.replace(calendarPrefix, "");
			const day = days.find((d) => String(d.id) === dayId);
			return day || null;
		}

		// Check if it's a scene
		for (const day of days) {
			if (day.scenes.find((scene) => scene.id === id)) {
				return day;
			}
		}
		return null;
	};

	// Handle drag end for calendar view
	const handleCalendarDragEnd = (event) => {
		const { active, over } = event;
		const scrollLeft = calendarGridRef.current?.scrollLeft;
		const scrollTop = calendarGridRef.current?.scrollTop;
		const contentScrollTop = calendarContentRef.current?.scrollTop;

		const previewAtDrop = dragPreview;
		setDragPreview(null);

		if (!over) {
			return;
		}

		const activeId = active.id;
		const overId = over.id;

		if (activeId === overId) {
			return;
		}

		setScheduleDays((days) => {
			const activeContainer = findCalendarContainer(days, activeId);

			let targetContainerId = overId;
			if (typeof overId === "string" && overId.startsWith("calendar-")) {
				targetContainerId = overId.replace("calendar-", "");
			}

			const fallbackTarget = resolveDropTarget(days, targetContainerId, [], false);
			const finalTarget = previewAtDrop || fallbackTarget;

			if (!activeContainer || !finalTarget) {
				return days;
			}

			const overContainer = days.find((day) => String(day.id) === String(finalTarget.containerId));
			if (!overContainer) {
				return days;
			}

			// Handle reordering within the same day
			if (activeContainer.id === overContainer.id) {
				const activeIndex = activeContainer.scenes.findIndex((s) => s.id === activeId);
				if (activeIndex !== -1) {
					const reorderedScenes = [...activeContainer.scenes];
					const [movedScene] = reorderedScenes.splice(activeIndex, 1);
					const insertIndex = Math.max(0, Math.min(finalTarget.index, reorderedScenes.length));
					reorderedScenes.splice(insertIndex, 0, movedScene);
					return days.map((day) => (day.id === activeContainer.id ? { ...day, scenes: reorderedScenes } : day));
				}
				return days;
			}

			// Handle moving between different days
			const activeDayIndex = days.findIndex((d) => d.id === activeContainer.id);
			const overDayIndex = days.findIndex((d) => d.id === overContainer.id);

			if (activeDayIndex === -1 || overDayIndex === -1) return days;

			const activeSceneIndex = activeContainer.scenes.findIndex((s) => s.id === activeId);
			if (activeSceneIndex === -1) return days;

			const newActiveScenes = [...activeContainer.scenes];
			const [movedScene] = newActiveScenes.splice(activeSceneIndex, 1);
			const newOverScenes = [...overContainer.scenes];
			const overSceneIndex = Math.max(0, Math.min(finalTarget.index, newOverScenes.length));
			newOverScenes.splice(overSceneIndex, 0, movedScene);

			const newDays = [...days];
			newDays[activeDayIndex] = {
				...newDays[activeDayIndex],
				scenes: newActiveScenes,
			};
			newDays[overDayIndex] = {
				...newDays[overDayIndex],
				scenes: newOverScenes,
			};

			return newDays;
		});

		// Restore scroll position after React re-renders
		const restoreScroll = () => {
			if (calendarGridRef.current) {
				if (scrollLeft !== undefined) calendarGridRef.current.scrollLeft = scrollLeft;
				if (scrollTop !== undefined) calendarGridRef.current.scrollTop = scrollTop;
			}
			if (calendarContentRef.current && contentScrollTop !== undefined) {
				calendarContentRef.current.scrollTop = contentScrollTop;
			}
		};
		setTimeout(restoreScroll, 0);
		setTimeout(restoreScroll, 50);
		setTimeout(restoreScroll, 100);
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

					if (breakdownData.parsing) {
						setParsing(breakdownData.parsing);
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
		fetchCastList();
	}, [id]);

	// Fetch location list from API
	useEffect(() => {
		fetchLocationList();
	}, [id]);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
	);

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

	const buildSchedulePayload = (days) => {
		const filteredDays = days.filter((day) => day.scenes && day.scenes.length > 0);
		const schedule_by_day = filteredDays.reduce((acc, day) => {
			acc[day.date] = {
				date: day.date,
				scenes: day.scenes.map((scene) => ({
					scene_id: scene.scene_id,
					scene_number: scene.scene_number,
					episode_number: scene.episode_number,
					location_name: scene.location_name,
					character_names: scene.character_names,
					character_ids: scene.character_ids,
					scene_color: normalizeSceneColor(scene.scene_color),
				})),
			};
			return acc;
		}, {});
		return {
			filteredDays,
			schedule_by_day,
			unscheduled_scene_order: unscheduledSceneOrder,
		};
	};

	const persistScheduleDays = async (days) => {
		const { filteredDays, schedule_by_day, unscheduled_scene_order } = buildSchedulePayload(days);
		const response = await fetch(getApiUrl(`/api/${id}/schedule/${scheduleId}`), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ schedule_by_day, unscheduled_scene_order }),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.message || "Failed to save schedule");
		}

		return filteredDays;
	};

	const updateSceneColor = async (sceneId, color) => {
		const normalizedColor = normalizeSceneColor(color);

		// Resolve the actual breakdown scene_id (unscheduled scenes use 'unsched-<id>' as their id)
		const unschedScene = unscheduledScenesWithIds.find((s) => String(s.id) === String(sceneId));
		const breakdownId = unschedScene ? String(unschedScene.scene_id) : null;

		// For scheduled scenes, look up scene_id from scheduleDays
		const scheduledScene = !breakdownId
			? scheduleDays.flatMap((d) => d.scenes).find((s) => String(s.id) === String(sceneId))
			: null;
		const actualSceneId = breakdownId || (scheduledScene ? String(scheduledScene.scene_id) : String(sceneId));

		// Optimistic update: update breakdownScenes locally
		const prevBreakdown = breakdownScenes;
		setBreakdownScenes((prev) =>
			prev.map((s) =>
				String(s.id) === actualSceneId ? { ...s, scene_color: normalizedColor } : s
			)
		);

		// Also update scheduleDays for immediate visual feedback
		const prevDays = scheduleDays;
		setScheduleDays((days) =>
			days.map((day) => ({
				...day,
				scenes: day.scenes.map((scene) =>
					String(scene.scene_id) === actualSceneId ? { ...scene, scene_color: normalizedColor } : scene
				),
			}))
		);

		try {
			const response = await fetch(getApiUrl(`/api/${id}/scene-color`), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ scene_id: actualSceneId, color: normalizedColor }),
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Failed to save scene color");
			}
		} catch (error) {
			console.error("Error updating scene color:", error);
			// Revert optimistic updates
			setBreakdownScenes(prevBreakdown);
			setScheduleDays(prevDays);
			alert("Failed to save scene color: " + error.message);
		}
	};

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

	const refreshSupportingData = async () => {
		await Promise.all([fetchCastList(), fetchLocationList()]);
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
			setGeneratedMaxScenes(data["generated_schedule"]["constraints"]["max_scenes_per_day"] || "N/A");
			setGeneratedTotalShootDays(data["generated_schedule"]["total_shoot_days"] || "N/A");
			setConstraintType(data["generated_schedule"]["constraints"]["constraint_type"] || "N/A");
			console.log("conatraont type set as ::: ", typeof data["generated_schedule"]["constraints"]["constraint_type"]);
			setGeneratedMaxPageEightsPerDay(data["generated_schedule"]["constraints"]["max_page_eighths_per_day"] || "N/A");
			setGeneratedMaxHoursPerDay(data["generated_schedule"]["constraints"]["max_hours_per_day"] || "N/A");
		} catch (error) {
			console.error("Error fetching schedule data:", error);
			setError(error.message);
		} finally {
			setIsLoading(false);
		}
	};

	function parsePageEights(PageEights) {
		if (!PageEights) return "N/A";
		PageEights = parseInt(PageEights);
		var m = PageEights % 8;
		PageEights -= m;
		PageEights /= 8;
		return `${PageEights} ${m}/8 `;
	}

	useEffect(() => {
		const handlePointerMove = (e) => {
			pointerPosRef.current = { x: e.clientX, y: e.clientY };
		};
		window.addEventListener("pointermove", handlePointerMove, { capture: true });
		window.addEventListener("mousemove", handlePointerMove, { capture: true });
		return () => {
			window.removeEventListener("pointermove", handlePointerMove, { capture: true });
			window.removeEventListener("mousemove", handlePointerMove, { capture: true });
		};
	}, []);

	useEffect(() => {
		fetchScheduleData();
	}, [id, scheduleId]);

	// Initialize Generate Schedule modal dates from schedule data
	useEffect(() => {
		if (scheduleData) {
			const startDate = scheduleData.first_date || "";
			const endDate = scheduleData.last_date || "";
			if (startDate) {
				setScheduleStartDate(startDate);
			}
			if (endDate) {
				setScheduleEndDate(endDate);
			}
		}
	}, [scheduleData]);

	// Filter modal dates when start/end dates change
	useEffect(() => {
		if (!scheduleStartDate || !scheduleEndDate) return;

		const startDate = new Date(scheduleStartDate);
		const endDate = new Date(scheduleEndDate);

		// Filter modalAvailableDates if any dates are selected
		if (modalAvailableDates.length > 0) {
			const filteredModalDates = modalAvailableDates.filter((dateStr) => {
				const date = new Date(dateStr);
				return date >= startDate && date <= endDate;
			});
			if (filteredModalDates.length !== modalAvailableDates.length) {
				setModalAvailableDates(filteredModalDates);
			}
		}

		// Filter modalUnavailableDates if any dates are selected
		if (modalUnavailableDates.length > 0) {
			const filteredUnavailableDates = modalUnavailableDates.filter((dateStr) => {
				const date = new Date(dateStr);
				return date >= startDate && date <= endDate;
			});
			if (filteredUnavailableDates.length !== modalUnavailableDates.length) {
				setModalUnavailableDates(filteredUnavailableDates);
			}
		}
	}, [scheduleStartDate, scheduleEndDate]);

	// Initialize DOOD modal when it opens
	useEffect(() => {
		if (showDoodModal && scheduleData) {
			// Use Generate Schedule modal dates first, fall back to scheduleData
			const startDate = scheduleStartDate || scheduleData.first_date || "";
			const endDate = scheduleEndDate || scheduleData.last_date || "";

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
							const existingUnavailableDates = existingData?.unavailable_dates || [];
							const isFlexible = existingData?.flexible || false;

							newData[cast.character] = {
								id: cast.cast_id,
								dates: parseDateRanges(existingDates),
								unavailable_dates: parseDateRanges(existingUnavailableDates),
								flexible: isFlexible,
							};
						}
					});
				} else {
					locationList.forEach((loc) => {
						const existingData = scheduleData?.dates?.[datesSection]?.[loc.location];
						const existingDates = existingData?.dates || (Array.isArray(existingData) ? existingData : []);
						const existingUnavailableDates = existingData?.unavailable_dates || [];
						const isFlexible = existingData?.flexible || false;

						newData[loc.location] = {
							id: loc.location_id,
							dates: parseDateRanges(existingDates),
							unavailable_dates: parseDateRanges(existingUnavailableDates),
							flexible: isFlexible,
						};
					});
				}
				setDoodData(newData);
				setDoodOriginalData(JSON.parse(JSON.stringify(newData))); // Deep copy for comparison
			}
		}
	}, [showDoodModal, doodElementType, scheduleData, castList, locationList]);

	// Sync Generate Schedule modal's selected element dates when scheduleData changes (e.g. after DOOD save)
	useEffect(() => {
		if (!modalElement || !scheduleData?.dates) return;

		const datesSection = modalElementType === "location" ? "locations" : "characters";
		const elementData = scheduleData.dates[datesSection]?.[modalElement];

		// Helper to filter dates within schedule range
		const filterDatesInRange = (dates) => {
			if (!scheduleStartDate || !scheduleEndDate || !dates || dates.length === 0) return dates || [];
			const start = new Date(scheduleStartDate);
			const end = new Date(scheduleEndDate);
			return dates.filter((dateStr) => {
				const d = new Date(dateStr);
				return d >= start && d <= end;
			});
		};

		if (elementData) {
			// Update available dates
			if (elementData.dates && elementData.dates.length > 0) {
				const existingDates = parseDateRanges(elementData.dates);
				setModalAvailableDates(filterDatesInRange(existingDates));
			} else {
				setModalAvailableDates([]);
			}

			// Update unavailable dates
			const savedUnavailableDates = elementData.unavailable_dates || [];
			setModalUnavailableDates(filterDatesInRange(savedUnavailableDates));

			// Update flexible/fixed mode
			const hasDates = (elementData.dates && elementData.dates.length > 0) || savedUnavailableDates.length > 0;
			setModalDatePickerMode(hasDates ? "fixed" : "flexible");
		} else {
			setModalAvailableDates([]);
			setModalUnavailableDates([]);
			setModalDatePickerMode("flexible");
		}
	}, [scheduleData, modalElement, modalElementType]);



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

	const findBreakdownSceneIndex = (sceneLike) => {
		if (!sceneLike || !Array.isArray(breakdownScenes) || breakdownScenes.length === 0) {
			return -1;
		}

		const rawId = sceneLike.scene_id ?? sceneLike.id;
		if (rawId !== undefined && rawId !== null && String(rawId).trim() !== "") {
			const normalizedId = String(rawId);
			const byIdIndex = breakdownScenes.findIndex((candidate) => String(candidate?.id) === normalizedId);
			if (byIdIndex !== -1) {
				return byIdIndex;
			}
		}

		const sceneNumber = String(sceneLike.scene_number || sceneLike["Scene Number"] || sceneLike["Scene No."] || "").trim();
		const episodeNumber = String(sceneLike.episode_number || sceneLike["Episode Number"] || "").trim();
		if (!sceneNumber) {
			return -1;
		}

		return breakdownScenes.findIndex((candidate) => {
			const candidateSceneNumber = String(candidate?.scene_number || "").trim();
			const candidateEpisodeNumber = String(candidate?.episode_number || "").trim();
			if (candidateSceneNumber !== sceneNumber) {
				return false;
			}
			if (episodeNumber) {
				return candidateEpisodeNumber === episodeNumber;
			}
			return true;
		});
	};

	const handleSceneClick = (sceneLike) => {
		if (isDraggingScene) return;

		const breakdownIndex = findBreakdownSceneIndex(sceneLike);
		const breakdownScene = breakdownIndex >= 0 ? breakdownScenes[breakdownIndex] : null;
		const parsingScene = breakdownIndex >= 0 ? parsing[breakdownIndex] : null;

		setSelectedSceneDetails({
			scene: sceneLike,
			breakdownScene,
			parsingScene,
		});
	};

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
		const orderedScenes = unscheduledScenes.map((scene) => ({
			id: `unsched-${scene.id}`,
			scene_id: scene.id,
			scene_number: scene.scene_number,
			episode_number: scene.episode_number,
			int_ext: scene.int_ext,
			time_of_day: scene.time,
			page_eighths: scene.page_eighths,
			synopsis: scene.synopsis,
			location_name: scene.location,
			character_names: scene.characters || [],
			character_ids: scene.characters_ids || [],
			scene_color: normalizeSceneColor(scene.scene_color),
		}));

		const orderIndex = new Map(unscheduledSceneOrder.map((sceneId, index) => [String(sceneId), index]));
		return orderedScenes.sort((a, b) => {
			const aIndex = orderIndex.get(String(a.scene_id));
			const bIndex = orderIndex.get(String(b.scene_id));
			if (aIndex === undefined && bIndex === undefined) return 0;
			if (aIndex === undefined) return 1;
			if (bIndex === undefined) return -1;
			return aIndex - bIndex;
		});
	}, [unscheduledSceneOrder, unscheduledScenes]);

	// Color sync useEffect removed — colors now come from breakdownScenes (single source of truth)

	useEffect(() => {
		const savedOrder = Array.isArray(scheduleData?.unscheduled_scene_order)
			? scheduleData.unscheduled_scene_order.map((sceneId) => String(sceneId))
			: [];
		const currentIds = unscheduledScenes.map((scene) => String(scene.id));

		setUnscheduledSceneOrder((prev) => {
			const baseOrder = savedOrder.length > 0 ? savedOrder : prev;
			const next = [
				...baseOrder.filter((sceneId) => currentIds.includes(sceneId)),
				...currentIds.filter((sceneId) => !baseOrder.includes(sceneId)),
			];
			const prevKeys = prev.join("|");
			const nextKeys = next.join("|");
			return prevKeys === nextKeys ? prev : next;
		});
	}, [scheduleData, unscheduledScenes]);

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
		if (isEditing || isCalendarEditing) return;

		if (scheduleData && scheduleData.schedule && scheduleData.schedule.schedule_by_day) {
			// Build character name to ID mapping from castList API data (fallback)
			const charNameToId = {};
			castList.forEach((cast) => {
				if (cast.character && cast.cast_id) {
					charNameToId[cast.character] = cast.cast_id;
				}
			});

			if (scenes.length > 0) {
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
								newScene.id = String(scheduledScene.scene_id ?? breakdownScene.id);
								newScene.scene_id = scheduledScene.scene_id;
								newScene.scene_number = scheduledScene.scene_number || breakdownScene.scene_number;
								newScene.episode_number =
									scheduledScene.episode_number ||
									breakdownScene.episode_number ||
									breakdownScene["Episode Number"] ||
									"";
								newScene.int_ext = breakdownScene.int_ext;
								newScene.time_of_day = breakdownScene.time;
								newScene.page_eighths = breakdownScene.page_eighths;
								newScene.synopsis = breakdownScene.synopsis;

								newScene.location_name = breakdownScene.location;

								newScene.character_names = breakdownScene.characters || [];
								newScene.scene_color = normalizeSceneColor(breakdownScene.scene_color || scheduledScene.scene_color);

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
									newScene.id = String(scheduledScene.scene_id);
									newScene.scene_id = scheduledScene.scene_id;
									newScene.scene_number = scheduledScene.scene_number || fullScene["Scene Number"];
									newScene.episode_number = scheduledScene.episode_number || fullScene["Episode Number"] || "";
									newScene.int_ext = fullScene["Int./Ext."];
									newScene.time_of_day = fullScene["Time of Day"] || fullScene["Time"];
									newScene.page_eighths = fullScene["Page Eighths"] || fullScene["Pgs"];
									newScene.synopsis = fullScene["Synopsis"];

									newScene.location_name = fullScene["Location"];

									newScene.character_names = fullScene["Characters"] ? fullScene["Characters"].split(",").map((c) => c.trim()) : [];
									newScene.character_ids = newScene.character_names.map((name) => charNameToId[name] || null);
									newScene.scene_color = normalizeSceneColor(scheduledScene.scene_color);
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
				const formatDate = (d) => {
					const dd = String(d.getDate()).padStart(2, "0");
					const mm = String(d.getMonth() + 1).padStart(2, "0");
					const yyyy = d.getFullYear();
					return `${dd}/${mm}/${yyyy}`;
				};

				setScheduleDates({ start: formatDate(startDate), end: formatDate(endDate) });
				setScheduleDays(days);
			} else {
				const days = Object.values(scheduleData.schedule.schedule_by_day).map((day) => ({
					id: String(day.date),
					date: day.date,
					scenes: day.scenes.map((scene, index) => ({
						...scene,
						episode_number: scene.episode_number || "",
						id: scene.scene_id ? String(scene.scene_id) : `${day.date}-${index}-${scene.scene_number}`,
						scene_color: normalizeSceneColor(
							(breakdownScenes.find(bs => String(bs.id) === String(scene.scene_id))?.scene_color) || scene.scene_color
						),
					})),
				}));
				console.log("days -- ", days);
				setScheduleDays(days);
			}
		}
	}, [scheduleData, scenes, castList, breakdownScenes, isEditing, isCalendarEditing]);

	const handleDragStart = (event) => {
		setIsDraggingScene(true);
		setActiveDragId(event.active.id);
		lastHoveredContainerRef.current = null;
		if (event.active.rect.current.initial) {
			activeDragRectRef.current = event.active.rect.current.initial;
		}
		const activeContainer = findContainer(scheduleDays, event.active.id, unscheduledScenesWithIds);
		if (activeContainer) {
			const activeIndex = activeContainer.scenes.findIndex((scene) => String(scene.id) === String(event.active.id));
			setDragPreview({
				containerId: activeContainer.id,
				index: Math.max(activeIndex, 0),
				sourceContainerId: activeContainer.id,
			});
		} else {
			setDragPreview(null);
		}
	};

	const handleDragCancel = () => {
		setIsDraggingScene(false);
		setActiveDragId(null);
		setDragPreview(null);
		lastHoveredTimelineIdRef.current = null;
		lastHoveredContainerRef.current = null;
	};

	const handleDragEnd = (event) => {
		setIsDraggingScene(false);
		const { active, over } = event;
		const previewAtDrop = dragPreview;
		setActiveDragId(null);
		setDragPreview(null);
		lastHoveredTimelineIdRef.current = null;
		lastHoveredContainerRef.current = null;

		if (!over && !previewAtDrop) {
			return;
		}

		const activeId = active.id;
		const overId = over?.id ?? previewAtDrop?.containerId;

		let targetContainerId = overId;
		let insertAtTop = false;

		// Intercept timeline node drops to place at the top of that day
		if (typeof overId === "string" && overId.startsWith("timeline-nav-")) {
			targetContainerId = overId.replace("timeline-nav-", "");
			insertAtTop = true;
		}

		if (activeId === targetContainerId) {
			return;
		}

		setScheduleDays((days) => {
			const activeContainer = findContainer(days, activeId, unscheduledScenesWithIds);
			const fallbackTarget = resolveDropTarget(days, targetContainerId, unscheduledScenesWithIds, insertAtTop);
			const finalTarget = previewAtDrop || fallbackTarget;
			const overContainer = finalTarget
				? finalTarget.containerId === "unscheduled"
					? { id: "unscheduled", scenes: unscheduledScenesWithIds }
					: days.find((day) => day.id === finalTarget.containerId)
				: null;

			if (!activeContainer || !overContainer || !finalTarget) {
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

				const movedScene = activeContainer.scenes.find((s) => s.id === activeId);
					if (movedScene?.scene_id !== undefined && movedScene?.scene_id !== null) {
						const movedSceneOrderId = String(movedScene.scene_id);
						setUnscheduledSceneOrder((prev) => {
							const withoutScene = prev.filter((sceneId) => sceneId !== movedSceneOrderId);
							const insertIndex = Math.max(0, Math.min(finalTarget.index, withoutScene.length));
							withoutScene.splice(insertIndex, 0, movedSceneOrderId);
							return withoutScene;
						});
					}

					return newDays;
				}

			// Handle dragging from unscheduled to a schedule day
			if (activeContainer.id === "unscheduled" && overContainer.id !== "unscheduled") {
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
					episode_number: unscheduledScene.episode_number,
					int_ext: unscheduledScene.int_ext,
					time_of_day: unscheduledScene.time_of_day,
					page_eighths: unscheduledScene.page_eighths,
					synopsis: unscheduledScene.synopsis,
					location_name: unscheduledScene.location_name,
					character_names: unscheduledScene.character_names,
					character_ids: unscheduledScene.character_ids,
					scene_color: normalizeSceneColor(unscheduledScene.scene_color),
				};

				const newDays = [...days];
				const overSceneIndex = Math.min(finalTarget.index, newDays[overDayIndex].scenes.length);
				if (unscheduledScene.scene_id !== undefined && unscheduledScene.scene_id !== null) {
					const movedSceneOrderId = String(unscheduledScene.scene_id);
					setUnscheduledSceneOrder((prev) => prev.filter((sceneId) => sceneId !== movedSceneOrderId));
				}

				newDays[overDayIndex] = {
					...newDays[overDayIndex],
					scenes: [...newDays[overDayIndex].scenes.slice(0, overSceneIndex), newScene, ...newDays[overDayIndex].scenes.slice(overSceneIndex)],
				};

				return newDays;
			}

			// Handle reordering within the same day
			if (activeContainer.id === overContainer.id) {
				if (activeContainer.id === "unscheduled") {
					const reorderedScenes = activeContainer.scenes.filter((scene) => String(scene.id) !== String(activeId));
					const movedScene = activeContainer.scenes.find((scene) => String(scene.id) === String(activeId));
					if (!movedScene) return days;

					const insertIndex = Math.max(0, Math.min(finalTarget.index, reorderedScenes.length));
					reorderedScenes.splice(insertIndex, 0, movedScene);
					setUnscheduledSceneOrder(reorderedScenes.map((scene) => String(scene.scene_id)));
					return days;
				}
				const activeIndex = activeContainer.scenes.findIndex((s) => s.id === activeId);
				if (activeIndex !== -1) {
					const reorderedScenes = [...activeContainer.scenes];
					const [movedScene] = reorderedScenes.splice(activeIndex, 1);
					const insertIndex = Math.max(0, Math.min(finalTarget.index, reorderedScenes.length));
					reorderedScenes.splice(insertIndex, 0, movedScene);
					return days.map((day) => (day.id === activeContainer.id ? { ...day, scenes: reorderedScenes } : day));
				}
			} else {
				// Handle moving between different schedule days
				const activeDayIndex = days.findIndex((d) => d.id === activeContainer.id);
				const overDayIndex = days.findIndex((d) => d.id === overContainer.id);

				const activeSceneIndex = activeContainer.scenes.findIndex((s) => s.id === activeId);

				const newDays = [...days];
				const [movedScene] = newDays[activeDayIndex].scenes.splice(activeSceneIndex, 1);
				const overSceneIndex = Math.min(finalTarget.index, newDays[overDayIndex].scenes.length);
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
					const location_name = breakdownScene?.set || scene.location_name;
					//////////


					// console.log("breakdownScenescheck",breakdownScenes)
					character_ids?.forEach((charId, index) => {
						const charName = character_names?.[index];
						const charData = characterDates[charName];

						if (charData) {
							// Check if character is marked as unavailable on this date
							if (charData.unavailable_dates && charData.unavailable_dates.includes(dayData.date)) {
								conflictList.push(`Character "${charName}" is marked as unavailable on ${dayData.date}`);
							}
							// Check if character has available dates set but this date is not included
							else if (charData.dates && charData.dates.length > 0 && !charData.flexible) {
								if (!charData.dates.includes(dayData.date)) {
									conflictList.push(`Character "${charName}" is not available on ${dayData.date}`);
								}
							}
						}
					});

					const locationData = locationDates[location_name];
					// console.log("locationDates",locationDates);

					if (locationData) {
						// Check if location is marked as unavailable on this date
						if (locationData.unavailable_dates && locationData.unavailable_dates.includes(dayData.date)) {
							conflictList.push(`Location "${location_name}" is marked as unavailable on ${dayData.date}`);
						}
						// Check if location has available dates set but this date is not included
						else if (locationData.dates && locationData.dates.length > 0 && !locationData.flexible) {
							if (!locationData.dates.includes(dayData.date)) {
								conflictList.push(`Location "${location_name}" is not available on ${dayData.date}`);
							}
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
			if (maxPageEights.pages === "" || maxPageEights.eighths === "") {
				alertMessage = "Please fill in both pages and eighths fields";
			} else {
				const pages = parseInt(maxPageEights.pages, 10) || 0;
				const eighths = parseInt(maxPageEights.eighths, 10) || 0;
				const totalEighths = pages * 8 + eighths;
				if (totalEighths <= 0) {
					alertMessage = "Please enter a valid number of page-eights per day";
				} else {
					payload = { max_page_eighths_per_day: totalEighths };
				}
			}
		} else if (scheduleMode === "hours") {
			if (!HoursSaved) {
				alertMessage = "Please save Hours for each scene before generating schedule";
			} else if (maxHours.hours === "" || maxHours.minutes === "") {
				alertMessage = "Please fill in both hours and minutes fields";
			} else {
				const parsedHours = parseHours(maxHours);
				if (parsedHours <= 0) {
					alertMessage = "Please enter a valid number of hours per day";
				} else {
					payload = { max_hours_per_day: parsedHours };
				}
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
			setGeneratedTotalShootDays(result.total_shoot_days || "N/A");

			setTimeout(async () => {
				try {
					const refreshResponse = await fetch(getApiUrl(`/api/${id}/schedule/${scheduleId}`));
					if (refreshResponse.ok) {
						const refreshedData = await refreshResponse.json();
						setScheduleData(refreshedData);
						setGeneratedMaxScenes(refreshedData["generated_schedule"]["constraints"]["max_scenes_per_day"] || "N/A");
						setGeneratedTotalShootDays(refreshedData["generated_schedule"]["total_shoot_days"] || "N/A");
						setConstraintType(refreshedData["generated_schedule"]["constraints"]["constraint_type"] || "N/A");
						setGeneratedMaxPageEightsPerDay(refreshedData["generated_schedule"]["constraints"]["max_page_eighths_per_day"] || "N/A");
						setGeneratedMaxHoursPerDay(refreshedData["generated_schedule"]["constraints"]["max_hours_per_day"] || "N/A");

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
		const dd = String(date.getDate()).padStart(2, "0");
		const mm = String(date.getMonth() + 1).padStart(2, "0");
		const yyyy = date.getFullYear();
		return `${dd}/${mm}/${yyyy}`;
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
		// for (let day of scheduleDays) {
		// 	for (let scene of day.scenes) {
		// 		if (!(scene.scene_number in sceneHours)) {
		// 			alert(`Enter estimated Hours and minutes for scene ${scene.scene_number} before saving `);
		// 			return;
		// 		}
		// 	}
		// }

		try {
			const scriptsResponse = await fetch(getApiUrl(`/api/${id}/script-list`));
			if (!scriptsResponse.ok) {
				throw new Error("Failed to fetch script list");
			}
			const scripts = await scriptsResponse.json();
			const sortedScripts = (scripts || []).sort((a, b) => (b.version || 0) - (a.version || 0));
			console.log("Scene Hours ::::: ", sceneHours)
			if (sortedScripts.length > 0) {
				// Use master script (oldest/first uploaded) for scheduling
				const masterScript = sortedScripts[sortedScripts.length - 1];

				const SaveResponse = await fetch(getApiUrl(`/api/save-hours?project_id=${id}`), {
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
	const sidebarCollapsed = useSelector((state) => state.ui.navbarCollapsed);
	const sidebarWidth = sidebarCollapsed ? "60px" : "238px";

	const handleClearSchedule = async () => {
		if (!window.confirm("Are you sure you want to clear the schedule? This will remove the generated schedule and all availability dates for every location and character.")) {
			return;
		}
		try {
			const response = await fetch(getApiUrl(`/api/${id}/clear-schedule/${scheduleId}`), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});
			if (!response.ok) {
				const errData = await response.json().catch(() => ({}));
				throw new Error(errData.message || "Failed to clear schedule");
			}
			// Reset local state
			setScheduleDays([]);
			setIsEditing(false);
			setConstraintType("");
			setGeneratedMaxScenes("");
			setGeneratedTotalShootDays("");
			setGeneratedMaxPageEightsPerDay("");
			setGeneratedMaxHoursPerDay("");
			setScheduleDates({ start: "N/A", end: "N/A" });
			setSelectedDates([]);
			setElement("");
			setSelectedElement("");
			alert("Schedule cleared successfully!");
			fetchScheduleData();
		} catch (error) {
			console.error("Error clearing schedule:", error);
			alert("Failed to clear schedule: " + error.message);
		}
	};

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

	// Helper to get scene object for DragOverlay
	const getActiveScene = () => {
		if (!activeDragId) return null;

		const unscheduledMatch = unscheduledScenesWithIds.find((s) => s.id === activeDragId);
		if (unscheduledMatch) return unscheduledMatch;

		for (const day of scheduleDays) {
			const match = day.scenes.find((s) => s.id === activeDragId);
			if (match) return match;
		}
		return null;
	};

	const activeScene = getActiveScene();
	const showHoursInOverlay = activeScene ? !String(activeDragId || "").startsWith("unsched-") : false;

	const updateDragPreviewForTarget = (activeId, targetContainerId, insertAtTop = false) => {
		if (!targetContainerId || !activeId) {
			setDragPreview(null);
			return;
		}

		const isCalendarTarget = typeof targetContainerId === "string" && targetContainerId.startsWith("calendar-");
		const normalizedTargetId = isCalendarTarget ? targetContainerId.replace("calendar-", "") : targetContainerId;

		const activeContainer = findContainer(scheduleDays, activeId, unscheduledScenesWithIds);
		const target = resolveDropTarget(scheduleDays, normalizedTargetId, unscheduledScenesWithIds, insertAtTop);
		if (!activeContainer || !target) {
			setDragPreview(null);
			return;
		}

		let previewIndex = target.index;
		if (!insertAtTop) {
			const pointerIndex = getPointerBasedInsertIndex(target.containerId, activeId, pointerPosRef.current.y, isCalendarTarget);
			if (pointerIndex !== null) {
				previewIndex = pointerIndex;
			}
		}

		if (activeContainer.id === target.containerId) {
			previewIndex = Math.max(0, Math.min(previewIndex, target.containerId === "unscheduled"
				? unscheduledScenesWithIds.filter((scene) => String(scene.id) !== String(activeId)).length
				: (scheduleDays.find((day) => day.id === target.containerId)?.scenes || []).filter((scene) => String(scene.id) !== String(activeId)).length));
		}

		setDragPreview((prev) => {
			if (
				prev?.containerId === target.containerId &&
				prev?.index === previewIndex &&
				prev?.sourceContainerId === activeContainer.id
			) {
				return prev;
			}
			return { containerId: target.containerId, index: previewIndex, sourceContainerId: activeContainer.id };
		});
	};

	const handleDragOver = (event) => {
		const { active, over } = event;
		const overId = over?.id;
		const activeId = active?.id;

		if (!overId || !activeId) {
			setDragPreview(null);
			return;
		}

		if (overId && typeof overId === "string" && overId.startsWith("timeline-nav-")) {
				if (lastHoveredTimelineIdRef.current !== overId) {
					lastHoveredTimelineIdRef.current = overId;
					const dayId = overId.replace("timeline-nav-", "");
					const el = document.getElementById(`day-column-${dayId}`);
					if (el && scheduleContentRef.current) {
						scheduleContentRef.current.scrollTo({
							top: el.offsetTop - 16,
							behavior: "auto"
						});
					}
				}
			updateDragPreviewForTarget(activeId, overId.replace("timeline-nav-", ""), true);
			return;
		} else {
			lastHoveredTimelineIdRef.current = null;
		}

		updateDragPreviewForTarget(activeId, overId);
	};

	useEffect(() => {
		if (!isDraggingScene || !activeDragId) return;

		let frameId = null;

		const updateFromPointer = () => {
			const { x, y } = pointerPosRef.current;
			const containerId = getContainerIdFromPointer(x, y);

			if (containerId) {
				lastHoveredContainerRef.current = containerId;
				updateDragPreviewForTarget(activeDragId, containerId);
			}
			frameId = requestAnimationFrame(updateFromPointer);
		};

		frameId = requestAnimationFrame(updateFromPointer);

		return () => {
			if (frameId) {
				cancelAnimationFrame(frameId);
			}
		};
	}, [isDraggingScene, activeDragId, scheduleDays, unscheduledScenesWithIds]);

	return (
		<div className="sched-page-container" style={{ left: sidebarWidth }}>
			{isGenerating && (
				<div className="sched-modal-overlay">
					<div className="sched-modal">
						<div className="sched-spinner"></div>
						<p className="sched-loading-text">Generating Schedule...</p>
					</div>
				</div>
			)}


			<div className="sched-content">
				<div className="sched-left-panel">
					<div className="sched-left-panel-header">
						{projectName && <span className="sched-left-panel-project-name">{projectName}</span>}
						<span className="sched-left-panel-header-title">Availability Dates</span>
					</div>
					<div className="sched-left-panel-dates-bar">
						<div className="sched-date-info-inline">
							<div className="sched-date-info-item">
								<span className="sched-date-info-label">Start</span>
								<span className="sched-date-info-value">{scheduleDates.start || "Not set"}</span>
							</div>
							<div className="sched-date-info-item">
								<span className="sched-date-info-label">End</span>
								<span className="sched-date-info-value">{scheduleDates.end || "Not set"}</span>
							</div>
						</div>
						<button className="sched-action-btn sched-dood-btn" onClick={() => setShowDoodModal(true)}>
							DOODS
						</button>
					</div>
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
						<div className="sched-section-title">Available / Unavailable Dates</div>

						{selectedElement ? (
							<div className="sched-date-picker-container">
								{(() => {
									const datesSection = elementType === "location" ? "locations" : "characters";
									const elementData = scheduleData?.dates?.[datesSection]?.[element];
									const unavailableDates = elementData?.unavailable_dates || [];
									const availableDates = selectedDates || [];
									const isFlexible = elementData?.flexible || false;

									// Combined tile className for both available and unavailable dates
									const combinedTileClassName = ({ date, view }) => {
										if (view === "month") {
											const formattedDate = date.toLocaleDateString("en-CA").split("T")[0];
											if (availableDates.includes(formattedDate)) {
												return "highlight-green";
											}
											if (unavailableDates.includes(formattedDate)) {
												return "highlight-red";
											}
										}
									};

									return (
										<div className="sched-selected-dates-list">
											<div className="sched-selected-dates-header">
												<span>
													Available: {availableDates.length} | Unavailable: {unavailableDates.length}
												</span>
												{isFlexible && <span> ✅ Flexible</span>}
											</div>
											<div className="sched-calendar-container">
												<Calendar
													selectRange={false}
													activeStartDate={null}
													tileClassName={combinedTileClassName}
													tileDisabled={() => true}
												/>
											</div>
										</div>
									);
								})()}
							</div>
						) : (
							<div className="sched-calendar-placeholder">Select an element to see dates</div>
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
						{scheduleData?.schedule && (constraintType === "scenes" || constraintType === "page_eights" || constraintType === "hours") && (
							<span className="sched-schedule-header-generated">
								&nbsp;– Generated Schedule with{" "}
								{constraintType === "scenes"
									? `max ${generatedMaxScenes} scenes per day`
									: constraintType === "hours"
										? `max ${generatedMaxHoursPerDay} hours per day`
										: `max ${parsePageEights(maxGeneratedPageEightsPerDay)} page eights per day`}
								{generatedTotalShootDays ? ` • ${generatedTotalShootDays} shoot days` : ""}
							</span>
						)}
					</div>

					{constraintType === "scenes" && conflicts.length > 0 && (
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

					{renderConflictsModal()}
					{renderGenerateScheduleModal()}
					{renderDoodModal()}
					{renderSceneDetailsModal()}

					<div className="sched-controls-section">
						<div className="sched-controls-group">
							<span className="sched-controls-label" style={{ fontWeight: "600" }}>
								Schedule By:&nbsp;
								<span style={{ fontWeight: "400" }}>
									{scheduleMode === "scenes" && "Max Scenes Per Day"}
									{scheduleMode === "page-eights" && "Max Page-Eights Per Day"}
									{scheduleMode === "hours" && "Max Shooting Hours Per Day"}
								</span>
							</span>
						</div>

						<div className="sched-controls-group">
							<span className="sched-controls-label">
								{scheduleMode === "scenes" && (
									<>
										Max Scenes: <strong>{maxScenes || "–"}</strong>
									</>
								)}
								{scheduleMode === "page-eights" && (
									<>
										Max Page-Eights:{" "}
										<strong>
											{maxPageEights.pages || "0"} {maxPageEights.eighths || "0"}/8
										</strong>
									</>
								)}
								{scheduleMode === "hours" && (
									<>
										Max Hours:{" "}
										<strong>
											{maxHours.hours || "0"}:{maxHours.minutes || "00"}
										</strong>
									</>
								)}
							</span>
						</div>

						<div className="sched-controls-group">
							<button className="sched-action-btn sched-action-btn-primary sched-generate-button" onClick={() => setShowGenerateModal(true)} disabled={isGenerating}>
								{isGenerating ? "Generating..." : (scheduleData?.schedule ? "REGENERATE" : "Generate")}
							</button>

							{scheduleData?.schedule && (
								<button
									className="sched-action-btn sched-export-btn"
									onClick={() => exportScheduleToExcel(scheduleData.schedule.schedule_by_day, breakdownScenes)}
								>
									<FaFileExcel />
									<span>Export</span>
								</button>
							)}

							<div className="sched-flex-grow" />

							{scheduleData?.schedule &&
								(isEditing ? (
									<div className="sched-flex-row sched-gap-10" style={{ alignItems: "center" }}>
										<button onClick={handleSaveChanges} className="sched-action-btn sched-action-btn-success">
											Save
										</button>

										<CustomDatePicker
											value={newScheduleDayInput}
											onChange={(e) => setNewScheduleDayInput(e.target.value)}
											className="sched-edit-date-input"
										/>
										<button onClick={handleAddScheduleDay} className="sched-action-btn sched-action-btn-primary" disabled={!newScheduleDayInput}>
											Add Day
										</button>
										<button
											onClick={() => {
												setScheduleDays(originalScheduleDays);
												setIsEditing(false);
											}}
											className="sched-action-btn sched-action-btn-cancel"
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
										className="sched-action-btn sched-action-btn-edit"
									>
										Edit
									</button>
								))}

							{scheduleMode == "hours" && (
								<button className="sched-action-btn sched-action-btn-primary" onClick={handleSaveHours}>
									Save Est. Hours
								</button>
							)}

							{scheduleData?.schedule && (
								<button className="sched-action-btn sched-action-btn-clear" onClick={handleClearSchedule}>
									Clear Schedule
								</button>
							)}
						</div>
					</div>

					{scheduleData?.schedule && (
						<DndContext
							sensors={sensors}
							collisionDetection={customCollisionDetection}
							measuring={{
								droppable: {
									strategy: MeasuringStrategy.Always,
								},
							}}
							onDragStart={handleDragStart}
							onDragOver={handleDragOver}
							onDragEnd={handleDragEnd}
							onDragCancel={handleDragCancel}
							autoScroll={{
								canScroll: (element) => {
									// Disable dnd-kit auto-scroll if cursor is over the timeline scrollbar track
									const track = document.querySelector(".sched-custom-scrollbar-track");
									if (track) {
										const rect = track.getBoundingClientRect();
										if (
											pointerPosRef.current.x >= rect.left &&
											pointerPosRef.current.x <= rect.right &&
											pointerPosRef.current.y >= rect.top &&
											pointerPosRef.current.y <= rect.bottom
										) {
											return false;
										}
									}
									return true;
								}
							}}
						>
							<CustomTimelineScrollbar
								scrollRef={scheduleContentRef}
								days={(isEditing || (unscheduledScenesWithIds && unscheduledScenesWithIds.length > 0)) ? [{ id: "unscheduled", date: "Unscheduled" }, ...scheduleDays] : scheduleDays}
								isEditing={isEditing}
								isDraggingScene={isDraggingScene}
							/>
							<div
								className={`sched-schedule-content sched-schedule-content-custom-scroll ${isEditing ? "sched-schedule-content-editing" : ""}`}
								ref={scheduleContentRef}
							>
								{/* Unscheduled Scenes Panel - Now part of scroll container */}
								<UnscheduledScenesPanel
									unscheduledScenesWithIds={unscheduledScenesWithIds}
									isEditing={isEditing}
									characterNameToIdMap={characterNameToIdMap}
									isEpisodic={isEpisodic}
									dragPreview={dragPreview}
									activeDragId={activeDragId}
									onSceneClick={handleSceneClick}
									dragHeight={activeDragRectRef.current?.height}
									onSceneColorChange={updateSceneColor}
								/>
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
											isEpisodic={isEpisodic}
											dragPreview={dragPreview}
											activeDragId={activeDragId}
											onSceneColorChange={updateSceneColor}
											onSceneClick={handleSceneClick}
											dragHeight={activeDragRectRef.current?.height}
										/>
									);
								})}
							</div>
							<DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.08)" }}>
								{activeScene ? (
									<SceneDragOverlay
										scene={activeScene}
										characterNameToIdMap={characterNameToIdMap}
										isEpisodic={isEpisodic}
										showHours={showHoursInOverlay}
									/>
								) : null}
							</DragOverlay>

						</DndContext>
					)}
					{!scheduleData?.schedule && scenes.length > 0 && (
						<div className="sched-all-scenes-container sched-all-scenes-scroll">
							<h4>All Scenes</h4>
							<table className="sched-table">
								<thead className="sched-thead">
									<tr className="sched-header-row">
										{isEpisodic && <th className="sched-header-cell">Ep</th>}
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
										<tr key={index} className="sched-data-row sched-scene-row-clickable" onClick={() => handleSceneClick(scene)}>
											{isEpisodic && <td className="sched-data-cell">{scene["Episode Number"] || scene.episode_number || "-"}</td>}
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
													onClick={(e) => e.stopPropagation()}
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
													onClick={(e) => e.stopPropagation()}
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
						<EmptyState title="No Data Available" subtitle="Upload a script to create schedules." />
					)}
				</div>

				<Chatbot
					scheduleData={scheduleData}
					scheduleDays={scheduleDays}
					scenes={scenes}
					conflicts={conflicts}
					id={id}
					fetchScheduleData={fetchScheduleData}
					refreshSupportingData={refreshSupportingData}
				/>
			</div>
		</div>
	);
};

export default ManageSchedules;
