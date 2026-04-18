// src/pages/ScriptBreakdownNew.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { getApiUrl, fetchWithAuth } from "../utils/api";
import "../css/ScriptBreakdownNew.css";
import { PiMagnifyingGlass, PiSlidersHorizontal } from "react-icons/pi";
import { FaFileExcel, FaPlus, FaTrash, FaCamera } from "react-icons/fa";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

/*
  ScriptBreakdown page - final variant:
  - Table view: props columns (Action Props, Other Props, Picture Vehicles, Animals, Extras, Wardrobe, Set Dressing)
	render as plain text in the table (no inline tag editors)
  - Scene editor view (opened when you click a row or press "Edit Breakdown") contains TagInput
	for those props fields — add/remove tags only inside the edit view (exactly like prior behavior)
  - Everything else (fetch/save, shadows, pdf preview) preserved
*/

/* ---------- parse TSV ---------- */
const decodeTSVCell = (value) => {
	const text = String(value ?? "");
	let result = "";
	for (let i = 0; i < text.length; i += 1) {
		const ch = text[i];
		const next = text[i + 1];
		if (ch === "\\" && next) {
			if (next === "n") {
				result += "\n";
				i += 1;
				continue;
			}
			if (next === "t") {
				result += "\t";
				i += 1;
				continue;
			}
			if (next === "\\") {
				result += "\\";
				i += 1;
				continue;
			}
		}
		result += ch;
	}
	return result;
};

const parseTSV = (tsvText) => {
	try {
		const lines = tsvText.split("\n");
		if (lines.length < 2) return [];
		const headers = lines[0].split("\t").map((h) => h.trim());
		return lines
			.slice(1)
			.filter((l) => l.trim() !== "")
			.map((line, lineIdx) => {
				const values = line.split("\t").map((v) => decodeTSVCell(v.trim()));
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

const formatPageEighthsLabel = (totalEighths) => {
	const safeTotal = Math.max(1, parseInt(totalEighths, 10) || 1);
	const wholePages = Math.floor(safeTotal / 8);
	const eighths = safeTotal % 8;
	if (wholePages === 0) return `${Math.max(1, eighths)}/8`;
	if (eighths === 0) return `${wholePages}`;
	return `${wholePages} ${eighths}/8`;
};

const getMixedFractionParts = (totalEighths) => {
	const safeTotal = Math.max(1, parseInt(totalEighths, 10) || 1);
	return {
		whole: Math.floor(safeTotal / 8),
		eighth: safeTotal % 8,
	};
};

const getExcelColumnLabel = (columnNumber) => {
	let label = "";
	let current = Math.max(1, columnNumber);
	while (current > 0) {
		const remainder = (current - 1) % 26;
		label = String.fromCharCode(65 + remainder) + label;
		current = Math.floor((current - 1) / 26);
	}
	return label;
};

/* ---------- TagInput (CSV in/out) used only inside scene editor ---------- */
function TagInput({ value = "", onChange }) {
	const [tags, setTags] = useState(() => {
		if (!value) return [];
		return value
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);
	});
	const [input, setInput] = useState("");

	useEffect(() => {
		const newTags = (value || "")
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);
		setTags(newTags);
	}, [value]);

	const pushChange = (nextTags) => {
		setTags(nextTags);
		const csv = nextTags.join(", ");
		onChange && onChange(csv);
	};

	const handleKey = (e) => {
		if (e.key === "Enter" || e.key === ",") {
			e.preventDefault();
			const val = input.trim();
			if (!val) return setInput("");
			if (!tags.includes(val)) pushChange([...tags, val]);
			setInput("");
		} else if (e.key === "Backspace" && input === "") {
			if (tags.length > 0) pushChange(tags.slice(0, -1));
		}
	};

	const removeTag = (idx) => {
		const next = tags.filter((_, i) => i !== idx);
		pushChange(next);
	};

	return (
		<div className="sbn-tag-wrap">
			{tags.map((t, i) => (
				<div key={i} className="sbn-tag">
					<span style={{ marginRight: 8 }}>{t}</span>
					<button className="sbn-tag-x" onClick={() => removeTag(i)} aria-label={`Remove ${t}`}>
						×
					</button>
				</div>
			))}
			<input
				value={input}
				placeholder="Add tag and press Enter"
				onChange={(e) => setInput(e.target.value)}
				onKeyDown={handleKey}
				className="sbn-tag-input"
			/>
		</div>
	);
}

/* ---------- CharacterTagInput - select characters from available list ---------- */
function CharacterTagInput({ selectedIds = [], allCharacters = [], onChange }) {
	const [showDropdown, setShowDropdown] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const wrapperRef = useRef(null);

	// Get selected character objects
	const selectedCharacters = useMemo(() => {
		return selectedIds.map((id) => allCharacters.find((c) => c.id === id)).filter(Boolean);
	}, [selectedIds, allCharacters]);

	// Get available characters (not already selected)
	const availableCharacters = useMemo(() => {
		const filtered = allCharacters.filter((c) => !selectedIds.includes(c.id));
		if (!searchTerm) return filtered;
		return filtered.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
	}, [allCharacters, selectedIds, searchTerm]);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (e) => {
			if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
				setShowDropdown(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const addCharacter = (charId) => {
		if (!selectedIds.includes(charId)) {
			onChange([...selectedIds, charId]);
		}
		setSearchTerm("");
		setShowDropdown(false);
	};

	const removeCharacter = (charId) => {
		onChange(selectedIds.filter((id) => id !== charId));
	};

	return (
		<div className="sbn-character-tag-wrap" ref={wrapperRef}>
			<div className="sbn-character-tags">
				{selectedCharacters.map((char) => (
					<div key={char.id} className="sbn-tag sbn-character-tag">
						<span style={{ marginRight: 8 }}>{char.name}</span>
						<button className="sbn-tag-x" onClick={() => removeCharacter(char.id)} aria-label={`Remove ${char.name}`}>
							×
						</button>
					</div>
				))}
				<div className="sbn-character-input-wrap">
					<input
						type="text"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						onFocus={() => setShowDropdown(true)}
						placeholder="Search & add character..."
						className="sbn-tag-input sbn-character-search"
					/>
				</div>
			</div>
			{showDropdown && availableCharacters.length > 0 && (
				<div className="sbn-character-dropdown">
					{availableCharacters.map((char) => (
						<div key={char.id} className="sbn-character-option" onClick={() => addCharacter(char.id)}>
							{char.name}
						</div>
					))}
				</div>
			)}
			{showDropdown && availableCharacters.length === 0 && searchTerm && (
				<div className="sbn-character-dropdown">
					<div className="sbn-character-no-results">No characters found</div>
				</div>
			)}
		</div>
	);
}

function MixedFractionPageEighthsInput({ value = 1, onChange, compact = false, showHint = true }) {
	const parts = getMixedFractionParts(value);

	const updateWhole = (nextWhole) => {
		const whole = Math.max(0, parseInt(nextWhole, 10) || 0);
		const total = whole === 0 && parts.eighth === 0 ? 1 : (whole * 8) + parts.eighth;
		onChange(total);
	};

	const updateEighth = (nextEighth) => {
		const eighth = Math.min(7, Math.max(0, parseInt(nextEighth, 10) || 0));
		const total = parts.whole === 0 && eighth === 0 ? 1 : (parts.whole * 8) + eighth;
		onChange(total);
	};

	return (
		<div className="sbn-page-eighths-editor">
			<div className={compact ? "sbn-page-eighths-compact" : "sbn-page-eighths-mixed"}>
				<input
					type="number"
					min="0"
					step="1"
					value={parts.whole}
					onChange={(e) => updateWhole(e.target.value)}
					className={`sbn-form-input ${compact ? "sbn-page-eighths-compact-number" : "sbn-page-eighths-whole"}`}
					aria-label="Whole pages"
				/>
				{compact ? (
					<>
						<input
							type="number"
							min="0"
							max="7"
							step="1"
							value={parts.eighth}
							onChange={(e) => updateEighth(e.target.value)}
							className="sbn-form-input sbn-page-eighths-compact-number"
							aria-label="Page eighth numerator"
						/>
						<span className="sbn-page-eighths-compact-suffix">/8</span>
					</>
				) : (
					<>
						<span className="sbn-page-eighths-plus">and</span>
						<select
							value={parts.eighth}
							onChange={(e) => updateEighth(e.target.value)}
							className="sbn-form-select sbn-page-eighths-select"
							aria-label="Page eighths"
						>
							<option value="0">0/8</option>
							<option value="1">1/8</option>
							<option value="2">2/8</option>
							<option value="3">3/8</option>
							<option value="4">4/8</option>
							<option value="5">5/8</option>
							<option value="6">6/8</option>
							<option value="7">7/8</option>
						</select>
					</>
				)}
			</div>
			{showHint && (
				<span className="sbn-page-eighths-editor-hint">
					Saved as {formatPageEighthsLabel(value)}
				</span>
			)}
		</div>
	);
}

/* ---------- Main component ---------- */
const ScriptBreakdownNew = () => {
	const { user, id } = useParams();
	const projectName = useSelector((state) => state.project.projectName);
	const [scriptBreakdown, setScriptBreakdown] = useState([]);
	const [allScripts, setAllScripts] = useState([]);
	const [selectedScript, setSelectedScript] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	// 'table' = normal table view; 'scene' = scene editor & pdf preview
	const [viewMode, setViewMode] = useState("table");
	const [editingSceneIndex, setEditingSceneIndex] = useState(0);
	const [editingScene, setEditingScene] = useState(null);
	const [originalEditingScene, setOriginalEditingScene] = useState(null);
	const [pdfUrl, setPdfUrl] = useState(null);
	const [pdfZoom, setPdfZoom] = useState(100);
	const [hasBreakdown, setHasBreakdown] = useState(false);
	const [filterText, setFilterText] = useState("");
	const [selectedSearchField, setSelectedSearchField] = useState("ALL_FIELDS");
	const [showSearchFilterMenu, setShowSearchFilterMenu] = useState(false);
	const [parsing, setParsing] = useState([]);
	// Characters from breakdown API
	const [breakdownCharacters, setBreakdownCharacters] = useState([]);
	// All characters (merged from breakdown + castList)
	const [allCharacters, setAllCharacters] = useState([]);
	// Scene breakdowns as JSON objects
	const [sceneBreakdowns, setSceneBreakdowns] = useState([]);
	// scrolling shadows
	const [editingSceneParsing, setEditingSceneParsing] = useState({});
	// Character IDs for the currently editing scene
	const [editingCharacterIds, setEditingCharacterIds] = useState([]);
	const [originalEditingCharacterIds, setOriginalEditingCharacterIds] = useState([]);
	const tableWrapRef = useRef(null);
	const searchFilterRef = useRef(null);
	const [showLeftShadow, setShowLeftShadow] = useState(false);
	const [showRightShadow, setShowRightShadow] = useState(false);
	const [editParsing, setEditParsing] = useState(false);
	const [activeTab, setActiveTab] = useState("master");
	// Selected script for generated breakdown dropdown
	const [selectedGeneratedScript, setSelectedGeneratedScript] = useState(null);
	const [selectedGeneratedEpisode, setSelectedGeneratedEpisode] = useState("");
	const [projectEpisodeNumbers, setProjectEpisodeNumbers] = useState([]);
	const [projectType, setProjectType] = useState("Film");
	// Add/Remove Element state
	const [showAddElementModal, setShowAddElementModal] = useState(false);
	const [newElementName, setNewElementName] = useState("");
	const [isAddingElement, setIsAddingElement] = useState(false);
	const [customFields, setCustomFields] = useState([]);
	const [defaultFields, setDefaultFields] = useState([]);
	// Remove element mode
	const [removeElementMode, setRemoveElementMode] = useState(false);
	const [selectedElementToRemove, setSelectedElementToRemove] = useState(null);
	const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState(false);
	const [isRemovingElement, setIsRemovingElement] = useState(false);
	// Add Scene state
	const [showAddSceneModal, setShowAddSceneModal] = useState(false);
	const [addScenePosition, setAddScenePosition] = useState(0); // Position where to insert new scene
	const [showPositionSelector, setShowPositionSelector] = useState(false);
	const [isAddingScene, setIsAddingScene] = useState(false);
	// Remove Scene state
	const [removeSceneMode, setRemoveSceneMode] = useState(false);
	const [selectedScenesToRemove, setSelectedScenesToRemove] = useState([]);
	const [showRemoveSceneModal, setShowRemoveSceneModal] = useState(false);
	const [isRemovingScene, setIsRemovingScene] = useState(false);
	// Location and Cast lists for dropdowns
	const [locationList, setLocationList] = useState([]);
	const [castList, setCastList] = useState([]);
	// Split Scene state
	const [splitSceneMode, setSplitSceneMode] = useState(false);
	const [selectedSceneToSplit, setSelectedSceneToSplit] = useState(null);
	const [showSplitSceneModal, setShowSplitSceneModal] = useState(false);
	const [isSplittingScene, setIsSplittingScene] = useState(false);
	// Merge Scene state
	const [mergeSceneMode, setMergeSceneMode] = useState(false);
	const [selectedScenesToMerge, setSelectedScenesToMerge] = useState([]); // Array of 2 scenes
	const [showMergeSceneModal, setShowMergeSceneModal] = useState(false);
	const [isMergingScene, setIsMergingScene] = useState(false);
	const [mergeSceneForm, setMergeSceneForm] = useState({
		episode_number: "",
		scene_number: "",
		insert_relative: "before",
		insert_episode_number: "",
		insert_scene_number: "",
		int_ext: "INT.",
		location: "",
		set: "",
		time: "DAY",
		page_eighths: 1,
		synopsis: "",
		selectedCharacterIds: [],
		action_props: "",
		other_props: "",
		picture_vehicles: "",
		animals: "",
		extras: "",
		wardrobe: "",
		set_dressing: "",
	});
	const [splitSceneForm1, setSplitSceneForm1] = useState({
		episode_number: "",
		scene_number: "",
		insert_relative: "before",
		insert_episode_number: "",
		insert_scene_number: "",
		int_ext: "INT.",
		location: "",
		set: "",
		time: "DAY",
		page_eighths: 1,
		synopsis: "",
		selectedCharacterIds: [],
		action_props: "",
		other_props: "",
		picture_vehicles: "",
		animals: "",
		extras: "",
		wardrobe: "",
		set_dressing: "",
	});
	const [splitSceneForm2, setSplitSceneForm2] = useState({
		episode_number: "",
		scene_number: "",
		insert_relative: "after",
		insert_episode_number: "",
		insert_scene_number: "",
		int_ext: "INT.",
		location: "",
		set: "",
		time: "DAY",
		page_eighths: 1,
		synopsis: "",
		selectedCharacterIds: [],
		action_props: "",
		other_props: "",
		picture_vehicles: "",
		animals: "",
		extras: "",
		wardrobe: "",
		set_dressing: "",
	});
	const [newSceneForm, setNewSceneForm] = useState({
		episode_number: "",
		scene_number: "",
		int_ext: "INT.",
		location: "",
		set: "",
		time: "DAY",
		page_eighths: 1, // Store as number (1-1000 represents eighths of a page)
		synopsis: "",
		selectedCharacterIds: [], // Store selected character IDs for dropdown
		action_props: "",
		other_props: "",
		picture_vehicles: "",
		animals: "",
		extras: "",
		wardrobe: "",
		set_dressing: "",
	});

	// Reference Images state
	const [referenceImages, setReferenceImages] = useState([]);
	const [showReferenceImageModal, setShowReferenceImageModal] = useState(false);
	const [isUploadingImage, setIsUploadingImage] = useState(false);
	const [showImagePreviewModal, setShowImagePreviewModal] = useState(false);
	const [previewImageIndex, setPreviewImageIndex] = useState(0);

	// Derive master script (oldest/first uploaded) and generated scripts (all others)
	const masterScript = useMemo(() => {
		if (!allScripts || allScripts.length === 0) return null;
		// allScripts is sorted by version desc (newest first), so master is the last one
		return allScripts[allScripts.length - 1];
	}, [allScripts]);

	const generatedScripts = useMemo(() => {
		if (!allScripts) return [];
		// All scripts except the master (oldest one)
		return allScripts;
	}, [allScripts]);

	const generatedScriptsByEpisode = useMemo(() => {
		const groups = {};
		generatedScripts.forEach((script) => {
			const episodeNumber = String(script?.episodeNumber ?? "").trim();
			const key = episodeNumber || "__NO_EPISODE__";
			if (!groups[key]) groups[key] = [];
			groups[key].push(script);
		});

		Object.values(groups).forEach((scripts) => {
			scripts.sort((a, b) => (b.version || 0) - (a.version || 0));
		});

		return groups;
	}, [generatedScripts]);

	const generatedEpisodeOptions = useMemo(() => {
		const keys = Object.keys(generatedScriptsByEpisode);
		const ordered = keys.sort((a, b) => {
			if (a === "__NO_EPISODE__") return 1;
			if (b === "__NO_EPISODE__") return -1;

			const aNum = Number(a);
			const bNum = Number(b);
			const aIsNum = !Number.isNaN(aNum);
			const bIsNum = !Number.isNaN(bNum);
			if (aIsNum && bIsNum) return aNum - bNum;
			return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
		});

		return ordered.map((key) => ({
			key,
			label: key === "__NO_EPISODE__" ? "No Episode" : `Ep${key}`,
		}));
	}, [generatedScriptsByEpisode]);

	const addSceneEpisodeOptions = useMemo(() => {
		const episodeSet = new Set();

		projectEpisodeNumbers.forEach((ep) => {
			const normalized = String(ep ?? "").trim();
			if (normalized) episodeSet.add(normalized);
		});

		generatedEpisodeOptions.forEach((option) => {
			if (option.key && option.key !== "__NO_EPISODE__") {
				episodeSet.add(String(option.key).trim());
			}
		});

		sceneBreakdowns.forEach((scene) => {
			const episodeValue = String(scene?.episode_number ?? scene?.["Episode Number"] ?? "").trim();
			if (episodeValue) episodeSet.add(episodeValue);
		});

		return Array.from(episodeSet)
			.sort((a, b) => {
				const aNum = Number(a);
				const bNum = Number(b);
				const aIsNum = !Number.isNaN(aNum);
				const bIsNum = !Number.isNaN(bNum);
				if (aIsNum && bIsNum) return aNum - bNum;
				return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
			})
			.map((ep) => ({ key: ep, label: `Ep${ep}` }));
	}, [projectEpisodeNumbers, generatedEpisodeOptions, sceneBreakdowns]);


	const generatedScriptsForSelectedEpisode = useMemo(() => {
		if (!selectedGeneratedEpisode) return generatedScripts;
		return generatedScriptsByEpisode[selectedGeneratedEpisode] || [];
	}, [generatedScripts, generatedScriptsByEpisode, selectedGeneratedEpisode]);

	const hasEpisodeGrouping = useMemo(() => {
		if ((projectType || "").toLowerCase() !== "episodic") return false;
		return generatedScripts.some((script) => String(script?.episodeNumber ?? "").trim() !== "");
	}, [generatedScripts, projectType]);

	const filteredBreakdown = useMemo(() => {
		if (!scriptBreakdown.length) return [];
		if (!filterText) return scriptBreakdown;
		const q = filterText.toLowerCase();
		return scriptBreakdown.filter((row) => {
			if (selectedSearchField === "ALL_FIELDS") {
				return Object.values(row).some((v) =>
					String(v || "")
						.toLowerCase()
						.includes(q),
				);
			}

			return String(row[selectedSearchField] || "")
				.toLowerCase()
				.includes(q);
		});
	}, [scriptBreakdown, filterText, selectedSearchField]);

	const isEpisodicProject = useMemo(() => {
		return (projectType || "").trim().toLowerCase() === "episodic";
	}, [projectType]);

	const searchFieldOptions = useMemo(() => {
		const seen = new Set();
		const options = [{ key: "ALL_FIELDS", label: "All Fields" }];
		const addOption = (label) => {
			const cleanLabel = String(label || "").trim();
			if (!cleanLabel || seen.has(cleanLabel)) return;
			seen.add(cleanLabel);
			options.push({ key: cleanLabel, label: cleanLabel });
		};

		if (isEpisodicProject) addOption("Episode Number");
		[
			"Scene Number",
			"Int./Ext.",
			"Location",
			"Set",
			"Time",
			"Page Eighths",
			"Synopsis",
			"Characters",
			"Action Props",
			"Other Props",
			"Picture Vehicles",
			"Animals",
			"Extras",
			"Wardrobe",
			"Set Dressing",
		].forEach(addOption);

		customFields.forEach((fieldKey) =>
			addOption(
				String(fieldKey || "")
					.split("_")
					.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
					.join(" "),
			),
		);

		return options;
	}, [customFields, isEpisodicProject]);

	const getGeneratedScriptLabel = useCallback((script) => {
		const episodeNumber = String(script?.episodeNumber ?? "").trim();
		if (episodeNumber) {
			return `${script.name} (Ep${episodeNumber})`;
		}
		return `${script.name} (v${script.version})`;
	}, []);

	const getGeneratedDraftLabel = useCallback((script) => {
		const draftName = String(script?.name ?? "").trim();
		if (draftName) return draftName;
		if (script?.version) return `v${script.version}`;
		return "Draft";
	}, []);

	const latestScript = useMemo(() => {
		if (!allScripts || allScripts.length === 0) return null;
		return allScripts.reduce((a, b) => ((b?.version || 0) > (a?.version || 0) ? b : a), allScripts[0]);
	}, [allScripts]);

	const latestDraftLabel = useMemo(() => {
		if (!latestScript) return "";
		const baseLabel = getGeneratedDraftLabel(latestScript);
		const episodeNumber = String(latestScript?.episodeNumber ?? "").trim();
		return episodeNumber ? `${baseLabel} · Ep${episodeNumber}` : baseLabel;
	}, [getGeneratedDraftLabel, latestScript]);

	const getSceneIdentity = useCallback((sceneLike) => {
		if (!sceneLike) return { sceneNumber: "", episodeNumber: "" };

		const sceneNumber = String(sceneLike.scene_number ?? sceneLike["Scene Number"] ?? "").trim();
		const fallbackEpisodeNumber = activeTab === "generated" ? String(selectedGeneratedScript?.episodeNumber ?? "").trim() : "";
		const episodeNumber = String(sceneLike.episode_number ?? sceneLike["Episode Number"] ?? fallbackEpisodeNumber).trim();

		return { sceneNumber, episodeNumber };
	}, [activeTab, selectedGeneratedScript]);

	const findSceneIndexByIdentity = useCallback((sceneLike) => {
		const { sceneNumber, episodeNumber } = getSceneIdentity(sceneLike);
		if (!sceneNumber) return -1;

		const exactMatchIndex = sceneBreakdowns.findIndex((scene) => {
			const identity = getSceneIdentity(scene);
			return identity.sceneNumber === sceneNumber && identity.episodeNumber === episodeNumber;
		});
		if (exactMatchIndex !== -1) return exactMatchIndex;

		return sceneBreakdowns.findIndex((scene) => getSceneIdentity(scene).sceneNumber === sceneNumber);
	}, [getSceneIdentity, sceneBreakdowns]);

	const getSceneDataByIdentity = useCallback((sceneLike) => {
		const sceneIndex = findSceneIndexByIdentity(sceneLike);
		return sceneIndex === -1 ? null : sceneBreakdowns[sceneIndex];
	}, [findSceneIndexByIdentity, sceneBreakdowns]);

	const getSceneOptionsForEpisode = useCallback((episodeNumber) => {
		const targetEpisode = String(episodeNumber ?? "").trim();
		const seen = new Set();
		const options = [];

		sceneBreakdowns.forEach((scene) => {
			const identity = getSceneIdentity(scene);
			if (!identity.sceneNumber) return;
			if (isEpisodicProject && identity.episodeNumber !== targetEpisode) return;
			if (seen.has(identity.sceneNumber)) return;
			seen.add(identity.sceneNumber);
			options.push({ value: identity.sceneNumber, label: identity.sceneNumber });
		});

		return options;
	}, [getSceneIdentity, isEpisodicProject, sceneBreakdowns]);

	const mergeInsertSceneOptions = useMemo(() => {
		return getSceneOptionsForEpisode(mergeSceneForm.insert_episode_number);
	}, [getSceneOptionsForEpisode, mergeSceneForm.insert_episode_number]);

	const getAbsoluteInsertPosition = useCallback((position) => {
		if (position <= 0) return 0;

		const targetRow = filteredBreakdown[position - 1];
		if (!targetRow) return Math.max(0, Math.min(position, sceneBreakdowns.length));

		const absoluteIndex = findSceneIndexByIdentity(targetRow);
		if (absoluteIndex === -1) return Math.max(0, Math.min(position, sceneBreakdowns.length));

		return absoluteIndex + 1;
	}, [filteredBreakdown, findSceneIndexByIdentity, sceneBreakdowns.length]);

	const addSceneEpisodeOptionsForPosition = useMemo(() => {
		if (!isEpisodicProject) return addSceneEpisodeOptions;

		const prevScene = addScenePosition > 0 ? sceneBreakdowns[addScenePosition - 1] : null;
		const nextScene = sceneBreakdowns[addScenePosition] || null;

		const prevEp =
			String(prevScene?.episode_number ?? prevScene?.["Episode Number"] ?? "").trim();
		const nextEp =
			String(nextScene?.episode_number ?? nextScene?.["Episode Number"] ?? "").trim();

		// If both neighbors exist and are different, show just those two (prev first).
		if (prevEp && nextEp && prevEp !== nextEp) {
			return [
				{ key: prevEp, label: `Ep${prevEp}` },
				{ key: nextEp, label: `Ep${nextEp}` },
			];
		}

		// If same episode on both sides, lock to that episode.
		if (prevEp && nextEp && prevEp === nextEp) {
			return [{ key: prevEp, label: `Ep${prevEp}` }];
		}

		// If only one neighbor exists, lock to that episode.
		if (prevEp || nextEp) {
			const onlyEp = prevEp || nextEp;
			return [{ key: onlyEp, label: `Ep${onlyEp}` }];
		}

		// Fallback to all episodes when position has no neighbors.
		return addSceneEpisodeOptions;
	}, [
		addScenePosition,
		addSceneEpisodeOptions,
		isEpisodicProject,
		sceneBreakdowns,
	]);

	const isEpisodeLockedForPosition = useMemo(() => {
		if (!isEpisodicProject) return false;

		const prevScene = addScenePosition > 0 ? sceneBreakdowns[addScenePosition - 1] : null;
		const nextScene = sceneBreakdowns[addScenePosition] || null;

		const prevEp =
			String(prevScene?.episode_number ?? prevScene?.["Episode Number"] ?? "").trim();
		const nextEp =
			String(nextScene?.episode_number ?? nextScene?.["Episode Number"] ?? "").trim();

		if (prevEp && nextEp) return prevEp === nextEp;
		if (prevEp || nextEp) return true;
		return false;
	}, [addScenePosition, isEpisodicProject, sceneBreakdowns]);


	const getReferenceSceneQuery = useCallback((sceneIndex) => {
		const sceneData = sceneBreakdowns[sceneIndex];
		const { sceneNumber, episodeNumber } = getSceneIdentity(sceneData);
		const params = new URLSearchParams();
		if (sceneNumber) params.set("scene_number", sceneNumber);
		if (episodeNumber) params.set("episode_number", episodeNumber);
		const query = params.toString();
		return query ? `?${query}` : "";
	}, [getSceneIdentity, sceneBreakdowns]);

	// View-only mode when on generated tab
	const isViewOnly = activeTab === "generated";

	const updateShadows = () => {
		const el = tableWrapRef.current;
		if (!el) return;
		setShowLeftShadow(el.scrollLeft > 8);
		setShowRightShadow(el.scrollWidth - el.clientWidth - el.scrollLeft > 8);
	};

	useEffect(() => {
		const el = tableWrapRef.current;
		if (!el) return;
		updateShadows();
		const onScroll = () => requestAnimationFrame(updateShadows);
		el.addEventListener("scroll", onScroll);
		window.addEventListener("resize", updateShadows);
		return () => {
			el.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", updateShadows);
		};
	}, [tableWrapRef.current]);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (searchFilterRef.current && !searchFilterRef.current.contains(event.target)) {
				setShowSearchFilterMenu(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	/* ---------- fetchers ---------- */
	const fetchBreakdown = async (scriptId) => {
		try {
			setIsLoading(true);
			setError(null);
			const res = await fetch(getApiUrl(`/api/fetch-generated-breakdown?script_id=${scriptId}`), { method: "GET" });
			if (!res.ok) {
				if (res.status === 404) {
					setHasBreakdown(false);
					setError("No breakdown available. Please generate a breakdown first by uploading and processing a script.");
				} else {
					throw new Error(`Failed to fetch breakdown: ${res.status}`);
				}
				return;
			}
			const data = await res.json();
			if (data.parsing) {
				setParsing(data.parsing);
			} else {
				setError("No parsing data found");
			}
			// Store characters list from breakdown
			if (data.characters) {
				setBreakdownCharacters(data.characters);
			}
			// Store scene breakdowns as JSON
			if (data.scene_breakdowns) {
				setSceneBreakdowns(data.scene_breakdowns);
			}
			// Store default and custom fields
			if (data.default_fields) {
				setDefaultFields(data.default_fields);
			}
			if (data.custom_fields) {
				setCustomFields(data.custom_fields);
			} else {
				setCustomFields([]);
			}
			if (data.tsv_content) {
				const parsed = parseTSV(data.tsv_content);
				const parsedWithIndex = parsed.map((row, idx) => ({ row, idx }));
				parsedWithIndex.sort((a, b) => {
					const aEp = String(a.row?.episode_number ?? a.row?.["Episode Number"] ?? "").trim();
					const bEp = String(b.row?.episode_number ?? b.row?.["Episode Number"] ?? "").trim();
					if (!aEp && !bEp) return a.idx - b.idx;
					if (!aEp) return 1;
					if (!bEp) return -1;

					const aNum = Number(aEp);
					const bNum = Number(bEp);
					const aIsNum = !Number.isNaN(aNum);
					const bIsNum = !Number.isNaN(bNum);
					if (aIsNum && bIsNum) {
						if (aNum !== bNum) return aNum - bNum;
					} else {
						const cmp = aEp.localeCompare(bEp, undefined, { numeric: true, sensitivity: "base" });
						if (cmp !== 0) return cmp;
					}

					return a.idx - b.idx; // stable within same episode
				});
				setScriptBreakdown(parsedWithIndex.map((entry) => entry.row));
				setHasBreakdown(true);
			} else {
				setError("No breakdown data found");
				setHasBreakdown(false);
			}
		} catch (e) {
			console.error(e);
			setError(e.message || "Failed to fetch breakdown");
			setHasBreakdown(false);
		} finally {
			setIsLoading(false);
		}
	};

	const fetchMasterBreakdown = async () => {
		try {
			setIsLoading(true);
			setError(null);
			const res = await fetch(getApiUrl(`/api/fetch-breakdown?project_id=${id}`), { method: "GET" });
			if (!res.ok) {
				if (res.status === 404) {
					setHasBreakdown(false);
					setError("No breakdown available. Please generate a breakdown first by uploading and processing a script.");
				} else {
					throw new Error(`Failed to fetch breakdown: ${res.status}`);
				}
				return;
			}
			const data = await res.json();
			if (data.parsing) {
				setParsing(data.parsing);
			} else {
				setError("No parsing data found");
			}
			// Store characters list from breakdown
			if (data.characters) {
				setBreakdownCharacters(data.characters);
			}
			// Store scene breakdowns as JSON
			if (data.scene_breakdowns) {
				setSceneBreakdowns(data.scene_breakdowns);
			}
			// Store default and custom fields
			if (data.default_fields) {
				setDefaultFields(data.default_fields);
			}
			if (data.custom_fields) {
				setCustomFields(data.custom_fields);
			} else {
				setCustomFields([]);
			}
			if (data.tsv_content) {
				const parsed = parseTSV(data.tsv_content);
				setScriptBreakdown(parsed);
				setHasBreakdown(true);
			} else {
				setError("No breakdown data found");
				setHasBreakdown(false);
			}
		} catch (e) {
			console.error(e);
			setError(e.message || "Failed to fetch breakdown");
			setHasBreakdown(false);
		} finally {
			setIsLoading(false);
		}
	};

	const fetchProjectType = useCallback(async () => {
		try {
			const response = await fetchWithAuth(getApiUrl(`/api/project-name/${id}`), {
				method: "GET",
				credentials: "include",
				mode: "cors",
			});
			if (!response.ok) return;
			const data = await response.json();
			setProjectType(data.projectType || "Film");
		} catch (error) {
			console.error("Error fetching project type:", error);
		}
	}, [id]);

	const fetchAllScripts = async () => {
		try {
			const res = await fetch(getApiUrl(`/api/${id}/script-list`), { method: "GET" });
			if (res.ok) {
				const scripts = await res.json();
				const sorted = (scripts || []).sort((a, b) => (b.version || 0) - (a.version || 0));
				const activeScripts = sorted.filter((s) => s.status !== "archived");
				setAllScripts(activeScripts);
				console.log("all scripts ------------ ", sorted);
				if (activeScripts.length > 0) {
					// Always load master script (oldest one, last in sorted array) by default
					fetchMasterBreakdown();

					// Set default generated script to the newest (first in sorted array) if there are multiple scripts
					if (activeScripts.length > 0) {
						setSelectedGeneratedScript(activeScripts[0]);
					}
				}
			} else {
				console.error("Failed to fetch scripts");
			}
		} catch (e) {
			console.error("Error fetching scripts", e);
		}
	};

	const loadPdfPreview = async (scriptName) => {
		try {
			// Use script-serve endpoint which serves the file directly (no hash; zoom/toolbar set below)
			const url = getApiUrl(`/api/${id}/script-serve/${scriptName}`);
			setPdfUrl(url);
		} catch (e) {
			console.error("Error loading PDF", e);
		}
	};

	const PDF_ZOOM_MIN = 50;
	const PDF_ZOOM_MAX = 200;
	const PDF_ZOOM_STEP = 25;

	const handlePdfZoomIn = () => {
		setPdfZoom((z) => Math.min(z + PDF_ZOOM_STEP, PDF_ZOOM_MAX));
	};
	const handlePdfZoomOut = () => {
		setPdfZoom((z) => Math.max(z - PDF_ZOOM_STEP, PDF_ZOOM_MIN));
	};

	const handleScriptSelect = (script) => {
		setSelectedScript(script);
		if (script?.id) {
			fetchBreakdown(script.id);
		}
	};

	// ========== Reference Images Handlers ==========
	const loadReferenceImages = useCallback(async (sceneIndex) => {
		try {
			const response = await fetch(getApiUrl(`/api/${id}/scene/${sceneIndex}/reference-images${getReferenceSceneQuery(sceneIndex)}`));
			if (response.ok) {
				const data = await response.json();
				setReferenceImages(data.reference_images || []);
				setPreviewImageIndex(0);

				// Also sync sceneBreakdowns to keep both states in sync
				setSceneBreakdowns((prev) => {
					const updated = [...prev];
					if (updated[sceneIndex]) {
						updated[sceneIndex].reference_images = data.reference_images || [];
					}
					return updated;
				});
			} else {
				setReferenceImages([]);
			}
		} catch (e) {
			console.error("Error loading reference images:", e);
			setReferenceImages([]);
		}
	}, [getReferenceSceneQuery, id]);

	const handleUploadReferenceImage = useCallback(async (file, sceneIndex) => {
		if (!file) return;

		setIsUploadingImage(true);
		try {
			const formData = new FormData();
			formData.append('file', file);

			const response = await fetch(getApiUrl(`/api/${id}/scene/${sceneIndex}/upload-reference-image${getReferenceSceneQuery(sceneIndex)}`), {
				method: 'POST',
				body: formData,
			});

			if (!response.ok) throw new Error('Failed to upload image');

			// Reload reference images from API to get fresh data (single source of truth)
			await loadReferenceImages(sceneIndex);

			alert('Image uploaded successfully!');
		} catch (e) {
			console.error('Error uploading image:', e);
			alert('Failed to upload image');
		} finally {
			setIsUploadingImage(false);
		}
	}, [getReferenceSceneQuery, id, loadReferenceImages]);

	const handleDeleteReferenceImage = useCallback(
		async (imageId, sceneIndex) => {
			if (!window.confirm('Are you sure you want to delete this image?')) return;

			try {
				const response = await fetch(getApiUrl(`/api/${id}/scene/${sceneIndex}/reference-image/${imageId}${getReferenceSceneQuery(sceneIndex)}`), {
					method: 'DELETE',
				});

				if (!response.ok) throw new Error('Failed to delete image');

				// Reload reference images from API to get fresh data
				await loadReferenceImages(sceneIndex);

				alert('Image deleted successfully!');
			} catch (e) {
				console.error('Error deleting image:', e);
				alert('Failed to delete image');
			}
		},
		[getReferenceSceneQuery, id, loadReferenceImages]
	);

	useEffect(() => {
		fetchProjectType();
		fetchAllScripts();
		// Initial breakdown will be fetched after scripts are loaded and first script is selected
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fetchProjectType, id]);

	useEffect(() => {
		const fetchProjectEpisodes = async () => {
			if ((projectType || "").toLowerCase() !== "episodic") {
				setProjectEpisodeNumbers([]);
				return;
			}
			try {
				const response = await fetch(getApiUrl(`/api/projects/${id}/episodes`));
				if (!response.ok) {
					setProjectEpisodeNumbers([]);
					return;
				}
				const data = await response.json();
				const episodes = Array.isArray(data?.episodes) ? data.episodes : [];
				const episodeNumbers = [...new Set(
					episodes
						.map((episode) => String(episode?.ep_number ?? "").trim())
						.filter(Boolean),
				)];
				setProjectEpisodeNumbers(episodeNumbers);
			} catch (error) {
				console.error("Error fetching project episodes:", error);
				setProjectEpisodeNumbers([]);
			}
		};

		fetchProjectEpisodes();
	}, [id, projectType]);

	// Fetch location list for Add Scene dropdown
	useEffect(() => {
		const fetchLocationList = async () => {
			try {
				const response = await fetch(getApiUrl(`/api/${id}/locations`));
				if (response.ok) {
					const data = await response.json();
					setLocationList(data.locations || []);
				}
			} catch (error) {
				console.error("Error fetching location list:", error);
			}
		};
		fetchLocationList();
	}, [id]);

	// Fetch cast list for Add Scene dropdown
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

	// Build allCharacters from castList (primary source of truth)
	useEffect(() => {
		const mergedCharacters = [];

		// Use castList as the only source - use cast_id as the unique identifier
		castList.forEach((cast) => {
			if (cast.character) {
				mergedCharacters.push({
					id: String(cast.cast_id), // Use cast_id as string for consistent comparison
					name: cast.character,
					cast_id: String(cast.cast_id),
				});
			}
		});

		setAllCharacters(mergedCharacters);
	}, [castList]);

	// Load correct breakdown when tab changes
	useEffect(() => {
		if (!hasEpisodeGrouping) {
			setSelectedGeneratedEpisode("");
			return;
		}

		if (generatedEpisodeOptions.length === 0) {
			setSelectedGeneratedEpisode("");
			return;
		}

		const episodeExists = generatedEpisodeOptions.some((option) => option.key === selectedGeneratedEpisode);
		if (!episodeExists) {
			setSelectedGeneratedEpisode(generatedEpisodeOptions[0].key);
		}
	}, [generatedEpisodeOptions, hasEpisodeGrouping, selectedGeneratedEpisode]);

	useEffect(() => {
		if (!hasEpisodeGrouping) return;

		if (generatedScriptsForSelectedEpisode.length === 0) {
			setSelectedGeneratedScript(null);
			return;
		}

		const selectedExists = generatedScriptsForSelectedEpisode.some((script) => script.id === selectedGeneratedScript?.id);
		if (!selectedExists) {
			setSelectedGeneratedScript(generatedScriptsForSelectedEpisode[0]);
		}
	}, [generatedScriptsForSelectedEpisode, hasEpisodeGrouping, selectedGeneratedScript]);

	useEffect(() => {
		if (activeTab === "master" && masterScript) {
			setSelectedScript(masterScript);
			fetchMasterBreakdown();
		} else if (activeTab === "generated" && selectedGeneratedScript) {
			setSelectedScript(selectedGeneratedScript);
			fetchBreakdown(selectedGeneratedScript.id);
		}
		// Reset view mode when switching tabs
		setViewMode("table");
		setEditingScene(null);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeTab, masterScript, selectedGeneratedScript]);


	// Helper function to convert snake_case to Title Case for display
	const snakeCaseToTitleCase = (str) => {
		return str
			.split("_")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	};

	const areIdListsEqual = useCallback((a = [], b = []) => {
		if (a.length !== b.length) return false;
		return a.every((value, index) => String(value) === String(b[index]));
	}, []);

	// Helper function to convert JSON scene breakdown to display format
	const sceneBreakdownToDisplayFormat = (sceneData) => {
		if (!sceneData) return null;
		// Convert array fields to comma-separated strings
		const arrayToString = (arr) => {
			if (!arr || !Array.isArray(arr) || arr.length === 0) return "N/A";
			return arr.join(", ");
		};
		const result = {
			"Scene Number": sceneData.scene_number || "",
			"Int./Ext.": sceneData.int_ext || "",
			Location: sceneData.location || "",
			Set: sceneData.set || sceneData.location || "",
			Time: sceneData.time || "",
			"Page Eighths": sceneData.page_eighths || "",
			Synopsis: sceneData.synopsis || "",
			Characters: arrayToString(sceneData.characters),
			"Action Props": arrayToString(sceneData.action_props),
			"Other Props": arrayToString(sceneData.other_props),
			"Picture Vehicles": arrayToString(sceneData.picture_vehicles),
			Animals: arrayToString(sceneData.animals),
			Extras: arrayToString(sceneData.extras),
			Wardrobe: arrayToString(sceneData.wardrobe),
			"Set Dressing": arrayToString(sceneData.set_dressing),
		};
		if (isEpisodicProject) {
			result["Episode Number"] = sceneData.episode_number || "";
		}
		// Add custom fields
		customFields.forEach((fieldKey) => {
			const displayName = snakeCaseToTitleCase(fieldKey);
			result[displayName] = arrayToString(sceneData[fieldKey]);
		});
		return result;
	};

	/* ---------- open the scene editor (either from button or row click) ---------- */
	const openSceneEditorAt = (index) => {
		if (!sceneBreakdowns || sceneBreakdowns.length === 0) return;
		const idx = Math.max(0, Math.min(index, sceneBreakdowns.length - 1));

		// Check if the scene exists at this index
		const sceneData = sceneBreakdowns[idx];
		if (!sceneData) {
			console.warn(`Scene at index ${idx} not found - may have been deleted`);
			alert("This scene is no longer available. It may have been deleted.");
			return;
		}

		// Load PDF when entering scene editor (if not already loaded)
		if (masterScript?.name && !pdfUrl) {
			loadPdfPreview(masterScript.name);
		}

		setEditingSceneIndex(idx);
		// Use JSON scene breakdown data (which is correct) instead of TSV parsed data
		const displayData = sceneBreakdownToDisplayFormat(sceneData);
		setEditingScene(displayData);
		setOriginalEditingScene(displayData);
		setEditingSceneParsing(parsing[idx] || { heading: "", content: "" });


		// Match characters by NAME from sceneData.characters to find IDs in allCharacters (castlist)
		// This ensures consistency with the castlist regardless of old characters_ids
		if (sceneData && sceneData.characters && Array.isArray(sceneData.characters)) {
			const matchedIds = sceneData.characters
				.map((charName) => {
					const normalizedName = String(charName).trim().toUpperCase();
					const foundChar = allCharacters.find((c) => c.name?.toUpperCase() === normalizedName);
					return foundChar?.id;
				})
				.filter(Boolean);
			setEditingCharacterIds(matchedIds);
			setOriginalEditingCharacterIds(matchedIds);
		} else {
			setEditingCharacterIds([]);
			setOriginalEditingCharacterIds([]);
		}
		console.log(parsing[idx]);
		setViewMode("scene");

		// Load reference images for this scene
		loadReferenceImages(idx);

		// scroll to top so editor is visible
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const handleStartSceneEditor = () => {
		// Load PDF when entering scene editor
		if (masterScript?.name && !pdfUrl) {
			loadPdfPreview(masterScript.name);
		}
		openSceneEditorAt(0);
	};

	const handlePreviousScene = () => {
		if (editingSceneIndex > 0) openSceneEditorAt(editingSceneIndex - 1);
	};
	const handleNextScene = () => {
		if (editingSceneIndex < scriptBreakdown.length - 1) openSceneEditorAt(editingSceneIndex + 1);
	};

	const isLatestScript = () => {
		if (!selectedScript || allScripts.length === 0) return false;
		const latest = allScripts.reduce((a, b) => (b.version > (a.version || 0) ? b : a), allScripts[0]);
		return selectedScript.name === latest.name && selectedScript.version === latest.version;
	};

	// Helper function to parse comma-separated string to array, handling N/A values
	const parseToArray = (value) => {
		if (!value || value.trim().toUpperCase() === "N/A") return [];
		return value
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean);
	};

	const parsePageEighthsValue = useCallback((pageStr) => {
		if (!pageStr) return 1;
		const str = String(pageStr).trim();
		const fractionMatch = str.match(/^(\d+)?\s*(\d+)\/8$/);
		if (fractionMatch) {
			const whole = parseInt(fractionMatch[1] || "0", 10);
			const eighths = parseInt(fractionMatch[2] || "0", 10);
			if (Number.isNaN(whole) || Number.isNaN(eighths)) return 1;
			return Math.max(1, (whole * 8) + eighths);
		}

		const wholeOnly = parseInt(str, 10);
		if (!Number.isNaN(wholeOnly)) return Math.max(1, wholeOnly * 8);
		return 1;
	}, []);

	const formatPageEighthsValue = useCallback((totalEighths) => {
		const safeTotal = Math.max(1, parseInt(totalEighths, 10) || 1);
		const wholePages = Math.floor(safeTotal / 8);
		const eighths = safeTotal % 8;
		if (wholePages === 0) return `${Math.max(1, eighths)}/8`;
		if (eighths === 0) return `${wholePages}`;
		return `${wholePages} ${eighths}/8`;
	}, []);

	const getPageEighthParts = useCallback((pageStr) => {
		const total = parsePageEighthsValue(pageStr);
		return {
			whole: Math.floor(total / 8),
			eighth: total % 8,
		};
	}, [parsePageEighthsValue]);

	const updateEditingScenePageEighths = useCallback((nextParts) => {
		const nextWhole = Math.max(0, parseInt(nextParts.whole, 10) || 0);
		const nextEighth = Math.min(7, Math.max(0, parseInt(nextParts.eighth, 10) || 0));
		const normalizedTotal = nextWhole === 0 && nextEighth === 0 ? 1 : (nextWhole * 8) + nextEighth;
		setEditingScene((prev) => ({ ...prev, "Page Eighths": formatPageEighthsValue(normalizedTotal) }));
	}, [formatPageEighthsValue]);

	const hasSceneChanges = useMemo(() => {
		if (!editingScene || !originalEditingScene) return false;
		const sceneChanged = JSON.stringify(editingScene) !== JSON.stringify(originalEditingScene);
		const charactersChanged = !areIdListsEqual(editingCharacterIds, originalEditingCharacterIds);
		return sceneChanged || charactersChanged;
	}, [editingScene, originalEditingScene, editingCharacterIds, originalEditingCharacterIds, areIdListsEqual]);

	const handleSaveSceneChanges = useCallback(async () => {
		if (!editingScene) return;
		try {
			// Update the TSV breakdown for table display
			const updatedBreakdown = [...scriptBreakdown];
			updatedBreakdown[editingSceneIndex] = editingScene;
			console.log("editing scene is ", editingScene);

			// Update the scene breakdowns (JSON format) with all fields from editingScene
			const updatedSceneBreakdowns = [...sceneBreakdowns];
			if (updatedSceneBreakdowns[editingSceneIndex]) {
				// Get character names from the IDs for the characters field
				const charNames = editingCharacterIds.map((id) => allCharacters.find((c) => c.id === id)?.name).filter(Boolean);

				const updatedScene = {
					...updatedSceneBreakdowns[editingSceneIndex],
					// Map all fields from editingScene to scene breakdown format
					scene_number: editingScene["Scene Number"] || updatedSceneBreakdowns[editingSceneIndex].scene_number,
					int_ext: editingScene["Int./Ext."] || updatedSceneBreakdowns[editingSceneIndex].int_ext,
					location: editingScene["Location"] || updatedSceneBreakdowns[editingSceneIndex].location,
					set: editingScene["Set"] || updatedSceneBreakdowns[editingSceneIndex].set || editingScene["Location"],
					time: editingScene["Time"] || updatedSceneBreakdowns[editingSceneIndex].time,
					page_eighths: formatPageEighthsValue(parsePageEighthsValue(
						editingScene["Page Eighths"] || updatedSceneBreakdowns[editingSceneIndex].page_eighths
					)),
					synopsis: editingScene["Synopsis"] ?? updatedSceneBreakdowns[editingSceneIndex].synopsis,
					// Characters handled via character IDs
					characters_ids: [...editingCharacterIds],
					characters: charNames,
					// Parse array fields from comma-separated strings
					action_props: parseToArray(editingScene["Action Props"]),
					other_props: parseToArray(editingScene["Other Props"]),
					picture_vehicles: parseToArray(editingScene["Picture Vehicles"]),
					animals: parseToArray(editingScene["Animals"]),
					extras: parseToArray(editingScene["Extras"]),
					wardrobe: parseToArray(editingScene["Wardrobe"]),
					set_dressing: parseToArray(editingScene["Set Dressing"]),
				};

				// Handle custom fields
				customFields.forEach((fieldKey) => {
					const displayName = snakeCaseToTitleCase(fieldKey);
					updatedScene[fieldKey] = parseToArray(editingScene[displayName]);
				});

				updatedSceneBreakdowns[editingSceneIndex] = updatedScene;
			}

			console.log("Saving scene breakdowns", updatedSceneBreakdowns[editingSceneIndex]);

			const response = await fetch(getApiUrl(`/api/${id}/update-breakdown`), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					script_id: masterScript?.id, // Always update master script
					scene_breakdowns: updatedSceneBreakdowns,
					parsing: parsing,
					characters: allCharacters,
				}),
			});

			if (!response.ok) throw new Error("Failed to save changes");
			setScriptBreakdown(updatedBreakdown);
			setSceneBreakdowns(updatedSceneBreakdowns);
			setOriginalEditingScene(editingScene);
			setOriginalEditingCharacterIds([...editingCharacterIds]);
			alert("Changes saved successfully!");
		} catch (e) {
			console.error(e);
			alert("Failed to save changes. Try again.");
		}
	}, [parsing, editingScene, scriptBreakdown, sceneBreakdowns, editingCharacterIds, allCharacters, editingSceneIndex, id, masterScript, formatPageEighthsValue, parsePageEighthsValue]);

	/* ---------- Add Element ---------- */
	const handleAddElement = useCallback(async () => {
		if (!newElementName.trim()) {
			alert("Please enter an element name");
			return;
		}
		if (!masterScript?.id) {
			alert("No script selected");
			return;
		}

		setIsAddingElement(true);
		try {
			const response = await fetch(getApiUrl(`/api/${id}/add-element`), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					script_id: masterScript.id,
					element_name: newElementName.trim(),
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Failed to add element");
			}

			// Update custom fields
			if (data.custom_fields) {
				setCustomFields(data.custom_fields);
			}

			// Add the new element to all scene breakdowns locally
			const elementKey = data.element_key;
			setSceneBreakdowns((prev) =>
				prev.map((scene) => ({
					...scene,
					[elementKey]: scene[elementKey] || [],
				})),
			);

			setNewElementName("");
			setShowAddElementModal(false);
			alert(`Element "${newElementName}" added successfully!`);
		} catch (e) {
			console.error(e);
			alert(e.message || "Failed to add element");
		} finally {
			setIsAddingElement(false);
		}
	}, [newElementName, masterScript, id]);

	/* ---------- Remove Element ---------- */
	const handleRemoveElement = useCallback(async () => {
		if (!selectedElementToRemove) {
			alert("No element selected");
			return;
		}
		if (!masterScript?.id) {
			alert("No script selected");
			return;
		}

		setIsRemovingElement(true);
		try {
			const response = await fetch(getApiUrl(`/api/${id}/remove-element`), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					script_id: masterScript.id,
					element_key: selectedElementToRemove,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Failed to remove element");
			}

			// Update custom fields
			if (data.custom_fields) {
				setCustomFields(data.custom_fields);
			}

			// Remove the element from all scene breakdowns locally
			setSceneBreakdowns((prev) =>
				prev.map((scene) => {
					const newScene = { ...scene };
					delete newScene[selectedElementToRemove];
					return newScene;
				}),
			);

			setSelectedElementToRemove(null);
			setShowRemoveConfirmModal(false);
			setRemoveElementMode(false);
			alert(`Element removed successfully!`);
		} catch (e) {
			console.error(e);
			alert(e.message || "Failed to remove element");
		} finally {
			setIsRemovingElement(false);
		}
	}, [selectedElementToRemove, masterScript, id]);

	// Toggle remove element mode
	const handleRemoveElementClick = () => {
		if (removeElementMode && selectedElementToRemove) {
			// If already in remove mode and an element is selected, show confirmation
			setShowRemoveConfirmModal(true);
		} else {
			// Toggle remove mode
			setRemoveElementMode(!removeElementMode);
			setSelectedElementToRemove(null);
		}
	};

	/* ---------- Remove Scene ---------- */
	const handleRemoveSceneClick = () => {
		if (removeSceneMode) {
			if (selectedScenesToRemove.length > 0) {
				// In remove mode with selections, open confirmation instead of cancelling.
				setShowRemoveSceneModal(true);
				return;
			}

			// Cancel remove mode only when nothing is selected.
			setRemoveSceneMode(false);
			setSelectedScenesToRemove([]);
			setShowRemoveSceneModal(false);
		} else {
			// Enter remove mode
			setRemoveSceneMode(true);
			setSelectedScenesToRemove([]);
			// Cancel other modes
			setShowPositionSelector(false);
			setRemoveElementMode(false);
			setSplitSceneMode(false);
			setMergeSceneMode(false);
		}
	};

	const handleSelectSceneToRemove = (scene) => {
		setSelectedScenesToRemove((prev) => {
			const isSelected = prev.some((selected) =>
				(selected.id && scene.id && selected.id === scene.id) ||
				(selected.scene_number === scene.scene_number &&
					String(selected.episode_number || "") === String(scene.episode_number || ""))
			);

			if (isSelected) {
				return prev.filter((selected) =>
					!((selected.id && scene.id && selected.id === scene.id) ||
					(selected.scene_number === scene.scene_number &&
						String(selected.episode_number || "") === String(scene.episode_number || "")))
				);
			}

			return [...prev, scene];
		});
	};

	const handleRemoveScene = useCallback(async () => {
		if (selectedScenesToRemove.length === 0) {
			alert("No scenes selected");
			return;
		}
		if (!masterScript?.id) {
			alert("No script selected");
			return;
		}

		setIsRemovingScene(true);
		try {
			for (const scene of selectedScenesToRemove) {
				const response = await fetch(getApiUrl(`/api/${id}/remove-scene`), {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						script_id: masterScript.id,
						scene_id: scene.id ?? null,
						scene_number: scene.scene_number,
						episode_number: scene.episode_number || "",
					}),
				});

				const data = await response.json();

				if (!response.ok) {
					throw new Error(data.message || `Failed to remove scene ${scene.scene_number}`);
				}

				if (data.scene_breakdowns) {
					setSceneBreakdowns(data.scene_breakdowns);
				}
			}

			// Re-fetch breakdown to get updated data
			fetchMasterBreakdown();

			setSelectedScenesToRemove([]);
			setShowRemoveSceneModal(false);
			setRemoveSceneMode(false);
			alert(selectedScenesToRemove.length === 1 ? "Scene removed successfully!" : "Scenes removed successfully!");
		} catch (e) {
			console.error(e);
			alert(e.message || "Failed to remove scene");
		} finally {
			setIsRemovingScene(false);
		}
	}, [selectedScenesToRemove, masterScript, id]);

	/* ---------- Split Scene ---------- */
	const handleSplitSceneClick = () => {
		if (splitSceneMode) {
			// Cancel split mode
			setSplitSceneMode(false);
			setSelectedSceneToSplit(null);
		} else {
			// Enter split mode
			setSplitSceneMode(true);
			setSelectedSceneToSplit(null);
			// Cancel other modes
			setShowPositionSelector(false);
			setRemoveSceneMode(false);
			setRemoveElementMode(false);
			setMergeSceneMode(false);
		}
	};

	const handleSelectSceneToSplit = (scene) => {
		setSelectedSceneToSplit(scene);
		// Pre-fill both forms with the original scene data
		const originalSceneNumber = scene.scene_number || "";
		const fallbackEpisode = activeTab === "generated" ? String(selectedGeneratedScript?.episodeNumber ?? "").trim() : "";
		const sceneEpisodeNumber = String(scene?.episode_number ?? scene?.["Episode Number"] ?? fallbackEpisode).trim();

		// Parse array fields to comma-separated strings for the form
		const arrayToString = (arr) => {
			if (!arr || !Array.isArray(arr) || arr.length === 0) return "";
			return arr.join(", ");
		};

		// Parse page_eighths string to number
		const parsePageEighths = (pageStr) => {
			if (!pageStr) return 1;
			const str = String(pageStr);
			// Handle formats like "1/8", "2/8", "1", "1 1/8", etc.
			const match = str.match(/^(\d+)?\s*(\d+)\/8$/);
			if (match) {
				const whole = parseInt(match[1] || "0", 10);
				const eighths = parseInt(match[2], 10);
				return whole * 8 + eighths;
			}
			// Just a whole number
			const wholeOnly = parseInt(str, 10);
			if (!isNaN(wholeOnly)) return wholeOnly * 8;
			return 1;
		};

		// Match characters by name to get IDs from castlist
		const matchCharactersByName = (characters) => {
			if (!characters || !Array.isArray(characters)) return [];
			return characters
				.map((charName) => {
					const normalizedName = String(charName).trim().toUpperCase();
					const foundChar = allCharacters.find((c) => c.name?.toUpperCase() === normalizedName);
					return foundChar?.id;
				})
				.filter(Boolean);
		};

		const baseForm = {
			episode_number: sceneEpisodeNumber || "",
			scene_number: "",
			insert_relative: "before",
			insert_episode_number: isEpisodicProject ? (sceneEpisodeNumber || "") : "",
			insert_scene_number: originalSceneNumber || "",
			int_ext: scene.int_ext || "INT.",
			location: scene.location || "",
			set: scene.set || scene.location || "",
			time: scene.time || "DAY",
			page_eighths: Math.max(1, Math.floor(parsePageEighths(scene.page_eighths) / 2)),
			synopsis: scene.synopsis || "",
			selectedCharacterIds: matchCharactersByName(scene.characters),
			action_props: arrayToString(scene.action_props),
			other_props: arrayToString(scene.other_props),
			picture_vehicles: arrayToString(scene.picture_vehicles),
			animals: arrayToString(scene.animals),
			extras: arrayToString(scene.extras),
			wardrobe: arrayToString(scene.wardrobe),
			set_dressing: arrayToString(scene.set_dressing),
		};

		// Add custom fields
		customFields.forEach((fieldKey) => {
			baseForm[fieldKey] = arrayToString(scene[fieldKey]);
		});

		// Set first form with original scene number
		setSplitSceneForm1({ ...baseForm, scene_number: originalSceneNumber });
		// Set second form with suggested scene number (e.g., 1A -> 1B)
		const suggestedNumber = suggestNextSceneNumber(originalSceneNumber);
		setSplitSceneForm2({
			...baseForm,
			scene_number: suggestedNumber,
			insert_relative: "after",
			insert_episode_number: isEpisodicProject ? (sceneEpisodeNumber || "") : "",
			insert_scene_number: originalSceneNumber || "",
		});

		setSplitSceneMode(false);
		setShowSplitSceneModal(true);
	};

	// Helper to suggest next scene number (e.g., 1A -> 1B, 1 -> 1A)
	const suggestNextSceneNumber = (sceneNumber) => {
		if (!sceneNumber) return "";
		const str = String(sceneNumber).trim();
		// Check if ends with a letter
		const match = str.match(/^(.*)([A-Z])$/i);
		if (match) {
			const base = match[1];
			const letter = match[2].toUpperCase();
			if (letter === "Z") return `${base}AA`; // Z -> AA
			return `${base}${String.fromCharCode(letter.charCodeAt(0) + 1)}`;
		}
		// No letter suffix, add 'A'
		return `${str}A`;
	};

	const handleSplitScene = useCallback(async () => {
		// Validate required fields for both forms
		const validateForm = (form, formName) => {
			if (isEpisodicProject && !String(form.episode_number ?? "").trim()) {
				alert(`${formName}: Episode Number is required`);
				return false;
			}
			if (isEpisodicProject && !String(form.insert_episode_number ?? "").trim()) {
				alert(`${formName}: Insert Episode is required`);
				return false;
			}
			if (!String(form.insert_scene_number ?? "").trim()) {
				alert(`${formName}: Insert Scene is required`);
				return false;
			}
			if (!form.scene_number.trim()) {
				alert(`${formName}: Scene Number is required`);
				return false;
			}
			if (!form.int_ext.trim()) {
				alert(`${formName}: Int./Ext. is required`);
				return false;
			}
			if (!form.location.trim()) {
				alert(`${formName}: Location is required`);
				return false;
			}
			if (!form.time.trim()) {
				alert(`${formName}: Time is required`);
				return false;
			}
			if (!form.page_eighths || form.page_eighths < 1 || form.page_eighths > 1000) {
				alert(`${formName}: Page Eighths must be between 1 and 1000`);
				return false;
			}
			if (!form.synopsis.trim()) {
				alert(`${formName}: Synopsis is required`);
				return false;
			}
			return true;
		};

		if (!validateForm(splitSceneForm1, "Scene 1")) return;
		if (!validateForm(splitSceneForm2, "Scene 2")) return;

		// Validate scene numbers are different
		const sceneNum1 = splitSceneForm1.scene_number.trim();
		const sceneNum2 = splitSceneForm2.scene_number.trim();

		if (sceneNum1 === sceneNum2) {
			alert("Scene numbers must be different for the two split scenes");
			return;
		}

		const getSceneEpisode = (sceneLike) => {
			const fallbackEpisode = activeTab === "generated" ? String(selectedGeneratedScript?.episodeNumber ?? "").trim() : "";
			return String(sceneLike?.episode_number ?? sceneLike?.["Episode Number"] ?? fallbackEpisode).trim();
		};

		const originalSceneNumber = String(selectedSceneToSplit?.scene_number ?? "").trim();
		const originalEpisodeNumber = getSceneEpisode(selectedSceneToSplit);
		const scene1EpisodeNumber = String(splitSceneForm1.episode_number ?? "").trim();
		const scene2EpisodeNumber = String(splitSceneForm2.episode_number ?? "").trim();

		const isDuplicateScene = (sceneNumber, episodeNumber) =>
			sceneBreakdowns.some((scene) => {
				const existingSceneNumber = String(scene.scene_number ?? "").trim();
				if (existingSceneNumber !== sceneNumber) return false;

				const existingEpisodeNumber = getSceneEpisode(scene);
				const isOriginalScene =
					(scene.id && selectedSceneToSplit?.id && scene.id === selectedSceneToSplit.id) ||
					(existingSceneNumber === originalSceneNumber &&
						(!isEpisodicProject || existingEpisodeNumber === originalEpisodeNumber));

				if (isOriginalScene) return false;
				if (!isEpisodicProject) return true;
				return existingEpisodeNumber === episodeNumber;
			});

		if (isDuplicateScene(sceneNum1, scene1EpisodeNumber)) {
			if (isEpisodicProject) {
				alert(`Scene number "${sceneNum1}" already exists in Episode ${scene1EpisodeNumber || "-"}.`);
			} else {
				alert(`Scene number "${sceneNum1}" already exists in another scene`);
			}
			return;
		}
		if (isDuplicateScene(sceneNum2, scene2EpisodeNumber)) {
			if (isEpisodicProject) {
				alert(`Scene number "${sceneNum2}" already exists in Episode ${scene2EpisodeNumber || "-"}.`);
			} else {
				alert(`Scene number "${sceneNum2}" already exists in another scene`);
			}
			return;
		}

		if (!masterScript?.id) {
			alert("No script selected");
			return;
		}

		setIsSplittingScene(true);
		try {
			// Helper to format page eighths
			const formatPageEighths = (num) => {
				if (num <= 0) return "1/8";
				const wholePages = Math.floor(num / 8);
				const eighths = num % 8;
				if (wholePages === 0) return `${eighths}/8`;
				if (eighths === 0) return `${wholePages}`;
				return `${wholePages} ${eighths}/8`;
			};

			// Helper to parse comma-separated strings into arrays
			const parseToArray = (str) =>
				str
					? str
						.split(",")
						.map((s) => s.trim())
						.filter(Boolean)
					: [];

			// Prepare scene data for both scenes
			const prepareSceneData = (form, referenceImagesOverride) => {
				const selectedIds = form.selectedCharacterIds || [];
				const selectedCharacterNames = selectedIds
					.map((charId) => {
						const char = allCharacters.find((c) => c.id === charId);
						return char?.name || "";
					})
					.filter(Boolean);

				const sceneData = {
					...form,
					page_eighths: formatPageEighths(form.page_eighths),
					characters: selectedCharacterNames,
					characters_ids: selectedIds,
					action_props: parseToArray(form.action_props),
					other_props: parseToArray(form.other_props),
					picture_vehicles: parseToArray(form.picture_vehicles),
					animals: parseToArray(form.animals),
					extras: parseToArray(form.extras),
					wardrobe: parseToArray(form.wardrobe),
					set_dressing: parseToArray(form.set_dressing),
					reference_images: referenceImagesOverride || [],
				};
				delete sceneData.selectedCharacterIds;

				// Parse custom fields
				customFields.forEach((fieldKey) => {
					sceneData[fieldKey] = parseToArray(form[fieldKey] || "");
				});

				return sceneData;
			};

			// Find the position of the original scene
			const originalScene = getSceneDataByIdentity(selectedSceneToSplit);
			const originalPosition = findSceneIndexByIdentity(selectedSceneToSplit);
			const originalReferenceImages =
				(originalScene && Array.isArray(originalScene.reference_images) ? originalScene.reference_images : null) ||
				(Array.isArray(selectedSceneToSplit.reference_images) ? selectedSceneToSplit.reference_images : []) ||
				[];

			const scene1Target = {
				scene_number: splitSceneForm1.insert_scene_number,
				episode_number: isEpisodicProject ? splitSceneForm1.insert_episode_number : "",
			};
			const scene2Target = {
				scene_number: splitSceneForm2.insert_scene_number,
				episode_number: isEpisodicProject ? splitSceneForm2.insert_episode_number : "",
			};

			const targetIndex1 = findSceneIndexByIdentity(scene1Target);
			const targetIndex2 = findSceneIndexByIdentity(scene2Target);

			if (targetIndex1 === -1 || targetIndex2 === -1) {
				alert("Selected insert scene not found");
				return;
			}

			let insertPosition1 = splitSceneForm1.insert_relative === "after" ? targetIndex1 + 1 : targetIndex1;
			let insertPosition2 = splitSceneForm2.insert_relative === "after" ? targetIndex2 + 1 : targetIndex2;

			const deleteIndex = originalPosition;
			if (deleteIndex !== -1) {
				if (deleteIndex < insertPosition1) insertPosition1 -= 1;
				if (deleteIndex < insertPosition2) insertPosition2 -= 1;
			}

			const insertPosition2Final = insertPosition1 <= insertPosition2 ? insertPosition2 + 1 : insertPosition2;

			// Step 1: Delete the original scene
			const deleteResponse = await fetch(getApiUrl(`/api/${id}/remove-scene`), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					script_id: masterScript.id,
					scene_id: selectedSceneToSplit.id,
					scene_number: selectedSceneToSplit.scene_number,
					episode_number: selectedSceneToSplit.episode_number || "",
				}),
			});

			if (!deleteResponse.ok) {
				const deleteData = await deleteResponse.json();
				throw new Error(deleteData.message || "Failed to delete original scene");
			}

			// Step 2: Add the first new scene at the original position
			const scene1Data = prepareSceneData(splitSceneForm1, originalReferenceImages);
			const add1Response = await fetch(getApiUrl(`/api/${id}/add-scene`), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					script_id: masterScript.id,
					position: Math.max(0, insertPosition1),
					scene_data: scene1Data,
				}),
			});

			if (!add1Response.ok) {
				const add1Data = await add1Response.json();
				throw new Error(add1Data.message || "Failed to add first split scene");
			}

			// Step 3: Add the second new scene right after the first
			const scene2Data = prepareSceneData(splitSceneForm2, originalReferenceImages);
			const add2Response = await fetch(getApiUrl(`/api/${id}/add-scene`), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					script_id: masterScript.id,
					position: Math.max(0, insertPosition2Final),
					scene_data: scene2Data,
				}),
			});

			const add2Data = await add2Response.json();

			if (!add2Response.ok) {
				throw new Error(add2Data.message || "Failed to add second split scene");
			}

			// Update scene breakdowns locally with the response
			if (add2Data.scene_breakdowns) {
				setSceneBreakdowns(add2Data.scene_breakdowns);
			}

			// Re-fetch breakdown to get updated data
			fetchMasterBreakdown();

			setShowSplitSceneModal(false);
			setSelectedSceneToSplit(null);
			// Reset forms
			const emptyForm = {
				episode_number: isEpisodicProject ? (addSceneEpisodeOptions[0]?.key || "") : "",
				scene_number: "",
				insert_relative: "before",
				insert_episode_number: isEpisodicProject ? (addSceneEpisodeOptions[0]?.key || "") : "",
				insert_scene_number: "",
				int_ext: "INT.",
				location: "",
				set: "",
				time: "DAY",
				page_eighths: 1,
				synopsis: "",
				selectedCharacterIds: [],
				action_props: "",
				other_props: "",
				picture_vehicles: "",
				animals: "",
				extras: "",
				wardrobe: "",
				set_dressing: "",
			};
			setSplitSceneForm1(emptyForm);
			setSplitSceneForm2(emptyForm);
			alert("Scene split successfully!");
		} catch (e) {
			console.error(e);
			alert(e.message || "Failed to split scene");
		} finally {
			setIsSplittingScene(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		splitSceneForm1,
		splitSceneForm2,
		selectedSceneToSplit,
		masterScript,
		id,
		sceneBreakdowns,
		allCharacters,
		customFields,
		isEpisodicProject,
		addSceneEpisodeOptions,
		activeTab,
		selectedGeneratedScript,
		findSceneIndexByIdentity,
		getSceneDataByIdentity,
	]);

	/* ---------- Merge Scene ---------- */
	const handleMergeSceneClick = () => {
		if (mergeSceneMode) {
			// Cancel merge mode
			setMergeSceneMode(false);
			setSelectedScenesToMerge([]);
		} else {
			// Enter merge mode
			setMergeSceneMode(true);
			setSelectedScenesToMerge([]);
			// Cancel other modes
			setShowPositionSelector(false);
			setRemoveSceneMode(false);
			setRemoveElementMode(false);
			setSplitSceneMode(false);
		}
	};

	const handleSelectSceneToMerge = (scene) => {
		// Check if scene is already selected
		const isAlreadySelected = selectedScenesToMerge.some((s) => s.id === scene.id || s.scene_number === scene.scene_number);

		if (isAlreadySelected) {
			// Deselect the scene
			setSelectedScenesToMerge(selectedScenesToMerge.filter((s) => s.id !== scene.id && s.scene_number !== scene.scene_number));
		} else if (selectedScenesToMerge.length < 2) {
			// Add to selection (max 2)
			const newSelection = [...selectedScenesToMerge, scene];
			setSelectedScenesToMerge(newSelection);

			// If we now have 2 scenes selected, open the modal
			if (newSelection.length === 2) {
				// Pre-fill the merge form with combined data from both scenes
				const scene1 = newSelection[0];
				const scene2 = newSelection[1];

				// Helper to merge arrays from both scenes
				const mergeArrays = (arr1, arr2) => {
					const combined = [...(arr1 || []), ...(arr2 || [])];
					return [...new Set(combined)].join(", ");
				};

				// Parse page_eighths and combine
				const parsePageEighths = (pageStr) => {
					if (!pageStr) return 0;
					const str = String(pageStr);
					const match = str.match(/^(\d+)?\s*(\d+)\/8$/);
					if (match) {
						const whole = parseInt(match[1] || "0", 10);
						const eighths = parseInt(match[2], 10);
						return whole * 8 + eighths;
					}
					const wholeOnly = parseInt(str, 10);
					if (!isNaN(wholeOnly)) return wholeOnly * 8;
					return 1;
				};

				// Match characters by name to get IDs from castlist
				const matchCharactersByName = (characters) => {
					if (!characters || !Array.isArray(characters)) return [];
					return characters
						.map((charName) => {
							const normalizedName = String(charName).trim().toUpperCase();
							const foundChar = allCharacters.find((c) => c.name?.toUpperCase() === normalizedName);
							return foundChar?.id;
						})
						.filter(Boolean);
				};

				// Combine characters from both scenes (unique)
				const combinedCharacterIds = [...new Set([...matchCharactersByName(scene1.characters), ...matchCharactersByName(scene2.characters)])];

				// Use the first scene's basic info as default, combine the rest
				const fallbackEpisode = activeTab === "generated" ? String(selectedGeneratedScript?.episodeNumber ?? "").trim() : "";
				const scene1Episode = String(scene1?.episode_number ?? scene1?.["Episode Number"] ?? fallbackEpisode).trim();

				const mergedForm = {
					episode_number: scene1Episode || "",
					scene_number: scene1.scene_number || "", // Default to first scene's number
					insert_relative: "before",
					insert_episode_number: isEpisodicProject ? (scene1Episode || "") : "",
					insert_scene_number: scene1.scene_number || "",
					int_ext: scene1.int_ext || scene2.int_ext || "INT.",
					location: scene1.location || scene2.location || "",
					set: scene1.set || scene1.location || scene2.set || scene2.location || "",
					time: scene1.time || scene2.time || "DAY",
					page_eighths: parsePageEighths(scene1.page_eighths) + parsePageEighths(scene2.page_eighths),
					synopsis: [scene1.synopsis, scene2.synopsis].filter(Boolean).join(" "),
					selectedCharacterIds: combinedCharacterIds,
					action_props: mergeArrays(scene1.action_props, scene2.action_props),
					other_props: mergeArrays(scene1.other_props, scene2.other_props),
					picture_vehicles: mergeArrays(scene1.picture_vehicles, scene2.picture_vehicles),
					animals: mergeArrays(scene1.animals, scene2.animals),
					extras: mergeArrays(scene1.extras, scene2.extras),
					wardrobe: mergeArrays(scene1.wardrobe, scene2.wardrobe),
					set_dressing: mergeArrays(scene1.set_dressing, scene2.set_dressing),
				};

				// Add custom fields
				customFields.forEach((fieldKey) => {
					mergedForm[fieldKey] = mergeArrays(scene1[fieldKey], scene2[fieldKey]);
				});

				setMergeSceneForm(mergedForm);
				setMergeSceneMode(false);
				setShowMergeSceneModal(true);
			}
		}
	};

	const handleMergeScene = useCallback(async () => {
		// Validate required fields
		if (isEpisodicProject && !String(mergeSceneForm.episode_number ?? "").trim()) {
			alert("Episode Number is required");
			return;
		}
		if (!mergeSceneForm.scene_number.trim()) {
			alert("Scene Number is required");
			return;
		}
		if (!mergeSceneForm.int_ext.trim()) {
			alert("Int./Ext. is required");
			return;
		}
		if (!mergeSceneForm.location.trim()) {
			alert("Location is required");
			return;
		}
		if (!mergeSceneForm.time.trim()) {
			alert("Time is required");
			return;
		}
		if (!mergeSceneForm.page_eighths || mergeSceneForm.page_eighths < 1 || mergeSceneForm.page_eighths > 1000) {
			alert("Page Eighths must be between 1 and 1000");
			return;
		}
		if (!mergeSceneForm.synopsis.trim()) {
			alert("Synopsis is required");
			return;
		}
		if (!mergeSceneForm.insert_scene_number?.trim()) {
			alert("Insert Scene is required");
			return;
		}
		if (isEpisodicProject && !String(mergeSceneForm.insert_episode_number ?? "").trim()) {
			alert("Insert Episode is required");
			return;
		}

		// Check for duplicate scene number (excluding the scenes being merged)
		const newEpisodeNumber = String(mergeSceneForm.episode_number ?? "").trim();
		const newSceneNumber = mergeSceneForm.scene_number.trim();
		const mergedSceneNumbers = selectedScenesToMerge.map((s) => s.scene_number?.trim());
		const duplicateScene = sceneBreakdowns.find((scene) => {
			const existingSceneNumber = String(scene.scene_number ?? "").trim();
			if (existingSceneNumber !== newSceneNumber) return false;
			if (mergedSceneNumbers.includes(existingSceneNumber)) return false;
			if (!isEpisodicProject) return true;

			const existingEpisodeNumber = String(scene.episode_number ?? scene["Episode Number"] ?? "").trim();
			return existingEpisodeNumber === newEpisodeNumber;
		});
		if (duplicateScene) {
			if (isEpisodicProject) {
				alert(`Scene number "${newSceneNumber}" already exists in Episode ${newEpisodeNumber || "-"}. Please use a unique scene number for this episode.`);
			} else {
				alert(`Scene number "${newSceneNumber}" already exists. Please use a unique scene number.`);
			}
			return;
		}

		if (!masterScript?.id) {
			alert("No script selected");
			return;
		}

		if (selectedScenesToMerge.length !== 2) {
			alert("Please select exactly 2 scenes to merge");
			return;
		}

		setIsMergingScene(true);
		try {
			// Helper to format page eighths
			const formatPageEighths = (num) => {
				if (num <= 0) return "1/8";
				const wholePages = Math.floor(num / 8);
				const eighths = num % 8;
				if (wholePages === 0) return `${eighths}/8`;
				if (eighths === 0) return `${wholePages}`;
				return `${wholePages} ${eighths}/8`;
			};

			// Helper to parse comma-separated strings into arrays
			const parseToArray = (str) =>
				str
					? str
						.split(",")
						.map((s) => s.trim())
						.filter(Boolean)
					: [];

			// Get character names from selected IDs
			const selectedIds = mergeSceneForm.selectedCharacterIds || [];
			const selectedCharacterNames = selectedIds
				.map((charId) => {
					const char = allCharacters.find((c) => c.id === charId);
					return char?.name || "";
				})
				.filter(Boolean);

			const sceneData = {
				...mergeSceneForm,
				page_eighths: formatPageEighths(mergeSceneForm.page_eighths),
				characters: selectedCharacterNames,
				characters_ids: selectedIds,
				action_props: parseToArray(mergeSceneForm.action_props),
				other_props: parseToArray(mergeSceneForm.other_props),
				picture_vehicles: parseToArray(mergeSceneForm.picture_vehicles),
				animals: parseToArray(mergeSceneForm.animals),
				extras: parseToArray(mergeSceneForm.extras),
				wardrobe: parseToArray(mergeSceneForm.wardrobe),
				set_dressing: parseToArray(mergeSceneForm.set_dressing),
			};
			delete sceneData.selectedCharacterIds;

			const collectReferenceImages = (scene) =>
				Array.isArray(scene?.reference_images) ? scene.reference_images : [];
			const mergeReferenceImages = (...lists) => {
				const merged = [];
				const seen = new Set();
				lists.flat().forEach((img) => {
					const id = img?.id;
					if (!id || seen.has(id)) return;
					seen.add(id);
					merged.push(img);
				});
				return merged;
			};
			sceneData.reference_images = mergeReferenceImages(
				collectReferenceImages(selectedScenesToMerge[0]),
				collectReferenceImages(selectedScenesToMerge[1]),
			);

			// Parse custom fields
			customFields.forEach((fieldKey) => {
				sceneData[fieldKey] = parseToArray(mergeSceneForm[fieldKey] || "");
			});

			// Find the target insert scene and compute position relative to it
			const insertTarget = {
				scene_number: mergeSceneForm.insert_scene_number,
				episode_number: isEpisodicProject ? mergeSceneForm.insert_episode_number : "",
			};
			const targetIndex = findSceneIndexByIdentity(insertTarget);
			if (targetIndex === -1) {
				alert("Selected insert scene not found");
				return;
			}

			let insertPosition = mergeSceneForm.insert_relative === "after" ? targetIndex + 1 : targetIndex;
			const deletePositions = selectedScenesToMerge
				.map((scene) => findSceneIndexByIdentity(scene))
				.filter((pos) => pos >= 0);
			const deletionsBefore = deletePositions.filter((pos) => pos < insertPosition).length;
			const adjustedPosition = Math.max(0, insertPosition - deletionsBefore);

			// Step 1: Delete the first scene
			const delete1Response = await fetch(getApiUrl(`/api/${id}/remove-scene`), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					script_id: masterScript.id,
					scene_id: selectedScenesToMerge[0].id,
					scene_number: selectedScenesToMerge[0].scene_number,
					episode_number: selectedScenesToMerge[0].episode_number || "",
				}),
			});

			if (!delete1Response.ok) {
				const deleteData = await delete1Response.json();
				throw new Error(deleteData.message || "Failed to delete first scene");
			}

			// Step 2: Delete the second scene
			const delete2Response = await fetch(getApiUrl(`/api/${id}/remove-scene`), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					script_id: masterScript.id,
					scene_id: selectedScenesToMerge[1].id,
					scene_number: selectedScenesToMerge[1].scene_number,
					episode_number: selectedScenesToMerge[1].episode_number || "",
				}),
			});

			if (!delete2Response.ok) {
				const deleteData = await delete2Response.json();
				throw new Error(deleteData.message || "Failed to delete second scene");
			}

			// Step 3: Add the merged scene at the user-selected position
			const addResponse = await fetch(getApiUrl(`/api/${id}/add-scene`), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					script_id: masterScript.id,
					position: adjustedPosition,
					scene_data: sceneData,
				}),
			});

			const addData = await addResponse.json();

			if (!addResponse.ok) {
				throw new Error(addData.message || "Failed to add merged scene");
			}

			// Update scene breakdowns locally with the response
			if (addData.scene_breakdowns) {
				setSceneBreakdowns(addData.scene_breakdowns);
			}

			// Re-fetch breakdown to get updated data
			fetchMasterBreakdown();

			setShowMergeSceneModal(false);
			setSelectedScenesToMerge([]);
			// Reset form
			setMergeSceneForm({
				episode_number: isEpisodicProject ? (addSceneEpisodeOptions[0]?.key || "") : "",
				scene_number: "",
				int_ext: "INT.",
				location: "",
				set: "",
				time: "DAY",
				page_eighths: 1,
				synopsis: "",
				insert_relative: "before",
				insert_episode_number: isEpisodicProject ? (addSceneEpisodeOptions[0]?.key || "") : "",
				insert_scene_number: "",
				selectedCharacterIds: [],
				action_props: "",
				other_props: "",
				picture_vehicles: "",
				animals: "",
				extras: "",
				wardrobe: "",
				set_dressing: "",
			});
			alert("Scenes merged successfully!");
		} catch (e) {
			console.error(e);
			alert(e.message || "Failed to merge scenes");
		} finally {
			setIsMergingScene(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		mergeSceneForm,
		selectedScenesToMerge,
		masterScript,
		id,
		sceneBreakdowns,
		allCharacters,
		customFields,
		isEpisodicProject,
		addSceneEpisodeOptions,
		findSceneIndexByIdentity,
	]);

	/* ---------- Add Scene ---------- */
	const handleAddSceneClick = () => {
		setShowPositionSelector(!showPositionSelector);
		// Cancel other modes
		setRemoveSceneMode(false);
		setRemoveElementMode(false);
		setSplitSceneMode(false);
		setMergeSceneMode(false);
	};

	const handleSelectPosition = (position) => {
		const absolutePosition = getAbsoluteInsertPosition(position);
		setAddScenePosition(absolutePosition);
		setShowPositionSelector(false);
		const episodeOptionsForPosition = isEpisodicProject ? addSceneEpisodeOptionsForPosition : [];
		const prevScene = absolutePosition > 0 ? sceneBreakdowns[absolutePosition - 1] : null;
		const nextScene = sceneBreakdowns[absolutePosition] || null;
		const prevEp =
			String(prevScene?.episode_number ?? prevScene?.["Episode Number"] ?? "").trim();
		const nextEp =
			String(nextScene?.episode_number ?? nextScene?.["Episode Number"] ?? "").trim();
		const defaultEpisode = isEpisodicProject
			? (prevEp || nextEp || episodeOptionsForPosition[0]?.key || "")
			: "";
		// Reset the form
		setNewSceneForm({
			episode_number: defaultEpisode,
			scene_number: "",
			int_ext: "INT.",
			location: "",
			set: "",
			time: "DAY",
			page_eighths: 1,
			synopsis: "",
		});
		setShowAddSceneModal(true);
	};

	const handleAddScene = useCallback(async () => {
		// Validate required fields
		if (isEpisodicProject && !String(newSceneForm.episode_number ?? "").trim()) {
			alert("Episode Number is required");
			return;
		}
		if (!newSceneForm.scene_number.trim()) {
			alert("Scene Number is required");
			return;
		}
		if (!newSceneForm.int_ext.trim()) {
			alert("Int./Ext. is required");
			return;
		}
		if (!newSceneForm.location.trim()) {
			alert("Location is required");
			return;
		}
		if (!newSceneForm.set.trim()) {
			alert("Set is required");
			return;
		}
		if (!newSceneForm.time.trim()) {
			alert("Time is required");
			return;
		}
		if (!newSceneForm.page_eighths || newSceneForm.page_eighths < 1 || newSceneForm.page_eighths > 1000) {
			alert("Page Eighths must be between 1 and 1000");
			return;
		}
		if (!newSceneForm.synopsis.trim()) {
			alert("Synopsis is required");
			return;
		}

		// Check for duplicate scene number
		const newEpisodeNumber = String(newSceneForm.episode_number ?? "").trim();
		const newSceneNumber = newSceneForm.scene_number.trim();
		const duplicateScene = sceneBreakdowns.find((scene) => {
			const existingSceneNumber = String(scene.scene_number ?? "").trim();
			if (existingSceneNumber !== newSceneNumber) return false;

			if (!isEpisodicProject) return true;

			const existingEpisodeNumber = String(scene.episode_number ?? scene["Episode Number"] ?? "").trim();
			return existingEpisodeNumber === newEpisodeNumber;
		});
		if (duplicateScene) {
			if (isEpisodicProject) {
				alert(`Scene number "${newSceneNumber}" already exists in Episode ${newEpisodeNumber || "-"}. Please use a unique scene number for this episode.`);
			} else {
				alert(`Scene number "${newSceneNumber}" already exists. Please use a unique scene number.`);
			}
			return;
		}

		if (!masterScript?.id) {
			alert("No script selected");
			return;
		}

		setIsAddingScene(true);
		try {
			// Convert page_eighths number to string format (e.g., 1 -> "1/8", 8 -> "1", 9 -> "1 1/8")
			const formatPageEighths = (num) => {
				if (num <= 0) return "1/8";
				const wholePages = Math.floor(num / 8);
				const eighths = num % 8;
				if (wholePages === 0) return `${eighths}/8`;
				if (eighths === 0) return `${wholePages}`;
				return `${wholePages} ${eighths}/8`;
			};

			// Parse comma-separated strings into arrays
			const parseToArray = (str) =>
				str
					? str
						.split(",")
						.map((s) => s.trim())
						.filter(Boolean)
					: [];

			// Get character names from selected IDs (using allCharacters from breakdown)
			const selectedIds = newSceneForm.selectedCharacterIds || [];
			const selectedCharacterNames = selectedIds
				.map((charId) => {
					const char = allCharacters.find((c) => c.id === charId);
					return char?.name || "";
				})
				.filter(Boolean);

			const sceneDataToSend = {
				...newSceneForm,
				synopsis: newSceneForm.synopsis,
				page_eighths: formatPageEighths(newSceneForm.page_eighths),
				characters: selectedCharacterNames,
				characters_ids: selectedIds,
				action_props: parseToArray(newSceneForm.action_props),
				other_props: parseToArray(newSceneForm.other_props),
				picture_vehicles: parseToArray(newSceneForm.picture_vehicles),
				animals: parseToArray(newSceneForm.animals),
				extras: parseToArray(newSceneForm.extras),
				wardrobe: parseToArray(newSceneForm.wardrobe),
				set_dressing: parseToArray(newSceneForm.set_dressing),
			};
			// Remove the temporary selectedCharacterIds field
			delete sceneDataToSend.selectedCharacterIds;

			// Parse custom fields as arrays too
			customFields.forEach((fieldKey) => {
				sceneDataToSend[fieldKey] = parseToArray(newSceneForm[fieldKey] || "");
			});

			const response = await fetch(getApiUrl(`/api/${id}/add-scene`), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					script_id: masterScript.id,
					position: addScenePosition,
					scene_data: sceneDataToSend,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Failed to add scene");
			}

			// Update scene breakdowns locally with the new scene
			if (data.scene_breakdowns) {
				setSceneBreakdowns(data.scene_breakdowns);
			}

			// Re-fetch breakdown to get updated data
			fetchMasterBreakdown();

			setShowAddSceneModal(false);
			setNewSceneForm({
				episode_number: "",
				scene_number: "",
				int_ext: "INT.",
				location: "",
				set: "",
				time: "DAY",
				page_eighths: 1,
				synopsis: "",
				selectedCharacterIds: [],
				action_props: "",
				other_props: "",
				picture_vehicles: "",
				animals: "",
				extras: "",
				wardrobe: "",
				set_dressing: "",
			});
			alert("Scene added successfully!");
		} catch (e) {
			console.error(e);
			alert(e.message || "Failed to add scene");
		} finally {
			setIsAddingScene(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [newSceneForm, masterScript, id, addScenePosition, isEpisodicProject, sceneBreakdowns]);

	/* ---------- Export to Excel ---------- */
	const exportToExcel = useCallback(async () => {
		if (!sceneBreakdowns || sceneBreakdowns.length === 0) {
			alert("No breakdown data to export");
			return;
		}

		const includeEpisodeNumber = sceneBreakdowns.some((scene) => String(scene?.episode_number || "").trim() !== "");
		const customFieldHeaders = customFields.map((fieldKey) => snakeCaseToTitleCase(fieldKey));
		const headers = [
			...(includeEpisodeNumber ? ["Episode Number"] : []),
			"Scene Number",
			"Int./Ext.",
			"Set",
			"Location",
			"Time",
			"Page Eighths",
			"Synopsis",
			"Characters",
			"Set Dressing",
			"Action Props",
			"Other Props",
			"Animals",
			"Extras",
			"Picture Vehicles",
			"Wardrobe",
			...customFieldHeaders,
			"ID",
		];

		const workbook = new ExcelJS.Workbook();
		const worksheet = workbook.addWorksheet("Breakdown");

		const lastColumnLetter = getExcelColumnLabel(headers.length);
		const titleText = activeTab === "generated" ? "Generated Breakdown Export" : "Master Breakdown Export";
		const scriptLabel = selectedScript?.name || selectedGeneratedScript?.name || masterScript?.name || "Not set";

		const titleRow = worksheet.addRow([titleText]);
		worksheet.mergeCells(`A${titleRow.number}:${lastColumnLetter}${titleRow.number}`);
		titleRow.getCell(1).font = { bold: true, size: 15, color: { argb: "FF1F2937" } };
		titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
		titleRow.getCell(1).fill = {
			type: "pattern",
			pattern: "solid",
			fgColor: { argb: "FFFFE082" },
		};

		const projectRow = worksheet.addRow([`Project: ${projectName || "Not set"}`]);
		worksheet.mergeCells(`A${projectRow.number}:${lastColumnLetter}${projectRow.number}`);
		projectRow.getCell(1).font = { bold: true, size: 12 };

		const scriptRow = worksheet.addRow([`Script: ${scriptLabel}`]);
		worksheet.mergeCells(`A${scriptRow.number}:${lastColumnLetter}${scriptRow.number}`);

		const sceneCountRow = worksheet.addRow([`Scenes: ${sceneBreakdowns.length}`]);
		worksheet.mergeCells(`A${sceneCountRow.number}:${lastColumnLetter}${sceneCountRow.number}`);

		worksheet.addRow([]);

		const headerRow = worksheet.addRow(headers);
		headerRow.eachCell((cell) => {
			cell.fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: "FFD3D3D3" },
			};
			cell.font = { bold: true, color: { argb: "FF111827" } };
			cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
			cell.border = {
				top: { style: "thin", color: { argb: "FFCBD5E1" } },
				left: { style: "thin", color: { argb: "FFCBD5E1" } },
				bottom: { style: "thin", color: { argb: "FF94A3B8" } },
				right: { style: "thin", color: { argb: "FFCBD5E1" } },
			};
		});

		sceneBreakdowns.forEach((scene) => {
			const rowData = [
				...(includeEpisodeNumber ? [scene.episode_number || ""] : []),
				scene.scene_number || "",
				scene.int_ext || "",
				scene.set || "",
				scene.location || "",
				scene.time || "",
				scene.page_eighths || "",
				scene.synopsis || "",
				(scene.characters || []).join(", "),
				(scene.set_dressing || []).join(", "),
				(scene.action_props || []).join(", "),
				(scene.other_props || []).join(", "),
				(scene.animals || []).join(", "),
				(scene.extras || []).join(", "),
				(scene.picture_vehicles || []).join(", "),
				(scene.wardrobe || []).join(", "),
				...customFields.map((fieldKey) => (scene[fieldKey] || []).join(", ")),
				scene.id ?? "",
			];

			const row = worksheet.addRow(rowData);
			row.eachCell((cell, colNumber) => {
				cell.alignment = {
					vertical: "top",
					horizontal: [1, 2, 3, 6, 7].includes(colNumber) ? "center" : "left",
					wrapText: true,
				};
				cell.border = {
					top: { style: "thin", color: { argb: "FFE5E7EB" } },
					left: { style: "thin", color: { argb: "FFE5E7EB" } },
					bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
					right: { style: "thin", color: { argb: "FFE5E7EB" } },
				};
			});
		});

		worksheet.columns = headers.map((header) => {
			switch (header) {
				case "Episode Number":
					return { width: 14 };
				case "Scene Number":
					return { width: 12 };
				case "Int./Ext.":
				case "Time":
				case "Page Eighths":
				case "ID":
					return { width: 12 };
				case "Set":
					return { width: 24 };
				case "Location":
					return { width: 28 };
				case "Synopsis":
					return { width: 48 };
				case "Characters":
					return { width: 26 };
				default:
					return { width: 20 };
			}
		});

		worksheet.views = [{ state: "frozen", ySplit: headerRow.number }];

		const buffer = await workbook.xlsx.writeBuffer();
		const blob = new Blob([buffer], {
			type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		});
		const baseName = selectedScript?.name || selectedGeneratedScript?.name || masterScript?.name || "script_breakdown";
		const filename = `${baseName.replace(/\.[^/.]+$/, "").replace(/\s+/g, "_")}_breakdown.xlsx`;
		saveAs(blob, filename);
	}, [sceneBreakdowns, customFields, activeTab, selectedScript, selectedGeneratedScript, masterScript, projectName]);

	/* ---------- props columns: explicit list ---------- */
	const propsHeaderNames = useMemo(() => {
		return new Set([
			"action props",
			"other props",
			"picture vehicles",
			"animals",
			"extras",
			"extra",
			"wardrobe",
			"set dressing",
			"set dressings",
			"set-dressing",
			"set-dressings",
		]);
	}, []);

	const propsKeys = useMemo(() => {
		const customFieldDisplayNames = customFields.map((fieldKey) => snakeCaseToTitleCase(fieldKey));

		// Start with custom field display names (they're always props/tags)
		const keys = [...customFieldDisplayNames];

		// Add default props from scriptBreakdown if available
		if (scriptBreakdown && scriptBreakdown.length > 0) {
			Object.keys(scriptBreakdown[0]).forEach((k) => {
				if (!k) return;
				const lower = k.trim().toLowerCase();
				if (propsHeaderNames.has(lower) || /prop/i.test(k)) {
					if (!keys.includes(k)) {
						keys.push(k);
					}
				}
			});
		}

		return keys;
	}, [scriptBreakdown, propsHeaderNames, customFields]);

	/* ---------- updateTableCell helper (used by scene editor only) ---------- */
	const updateTableCell = (row, header, newValue) => {
		const idx = scriptBreakdown.indexOf(row);
		if (idx === -1) {
			// fallback match by Scene Number/Scene No.
			const sceneKeys = ["Scene Number", "Scene No.", "Scene No", "Scene"];
			for (const sk of sceneKeys) {
				if (sk in row) {
					const sceneVal = row[sk];
					const fallbackIdx = scriptBreakdown.findIndex((r) => r[sk] === sceneVal);
					if (fallbackIdx !== -1) {
						setScriptBreakdown((prev) => prev.map((r, i) => (i === fallbackIdx ? { ...r, [header]: newValue } : r)));
						return;
					}
				}
			}
			return;
		}
		setScriptBreakdown((prev) => prev.map((r, i) => (i === idx ? { ...r, [header]: newValue } : r)));
	};

	/* ---------- Scene editor render (props fields use TagInput) ---------- */
	const renderSceneEditor = () => {
		if (!editingScene) return null;
		return (
			<div className="sbn-scene-editor">
				<div className="sbn-scene-header">
					<div className="sbn-scene-navigation">
						<button className="sbn-nav-btn" onClick={handlePreviousScene} disabled={editingSceneIndex === 0}>
							‹ Previous
						</button>
						<h3 className="sbn-scene-title">
							Scene {editingScene["Scene Number"] || editingSceneIndex + 1}
							<span className="sbn-scene-counter">
								({editingSceneIndex + 1} of {scriptBreakdown.length})
							</span>
							{isViewOnly && <span className="sbn-view-only-badge">View Only</span>}
						</h3>
						<button className="sbn-nav-btn" onClick={handleNextScene} disabled={editingSceneIndex === scriptBreakdown.length - 1}>
							Next ›
						</button>
					</div>

					<button
						className="sbn-close-btn"
						onClick={() => {
							setViewMode("table");
							setEditingScene(null);
						}}
					>
						✕
					</button>
				</div>

				<div className="sbn-scene-content">
					{Object.entries(editingScene).map(([key, value]) => {
						const isProps = propsKeys.includes(key);
						const isCharacters = key.toLowerCase() === "characters";
						const isSet = key.toLowerCase() === "set";
						const isPageEighths = key === "Page Eighths";
						const pageEighthParts = isPageEighths ? getPageEighthParts(value) : null;
						return (
							<div key={key} className="sbn-field-group">
								<label className="sbn-field-label">{key}:</label>
								{isViewOnly ? (
									// Read-only display for generated breakdowns
									<div className="sbn-field-readonly">
										{isProps || isCharacters ? (
											<div className="sbn-readonly-tags">
												{(value || "N/A").split(",").map((tag, i) => (
													<span key={i} className="sbn-readonly-tag">
														{tag.trim() || "N/A"}
													</span>
												))}
											</div>
										) : (
											<div className="sbn-readonly-text">{value || "N/A"}</div>
										)}
									</div>
								) : isCharacters ? (
									<CharacterTagInput
										selectedIds={editingCharacterIds}
										allCharacters={allCharacters}
										onChange={(newIds) => {
											setEditingCharacterIds(newIds);
											// Also update the scene's characters display text
											const charNames = newIds
												.map((id) => allCharacters.find((c) => c.id === id)?.name)
												.filter(Boolean)
												.join(", ");
											setEditingScene((prev) => ({ ...prev, [key]: charNames }));
										}}
									/>
								) : isSet ? (
									<select
										className="sbn-form-select"
										value={value || ""}
										onChange={(e) => {
											setEditingScene({ ...editingScene, [key]: e.target.value });
										}}
									>
										<option value="">Select Set...</option>
										{locationList.map((loc) => (
											<option key={loc.location_id || loc.location} value={loc.location}>
												{loc.location}
											</option>
										))}
									</select>
								) : isPageEighths ? (
									<MixedFractionPageEighthsInput
										value={parsePageEighthsValue(value)}
										onChange={(nextValue) => {
											setEditingScene((prev) => ({ ...prev, [key]: formatPageEighthsValue(nextValue) }));
										}}
										compact
										showHint={false}
									/>
								) : isProps ? (
									<TagInput
										value={value || ""}
										onChange={(csv) => {
											setEditingScene((prev) => ({ ...prev, [key]: csv }));
										}}
									/>
								) : (
									<textarea
										className="sbn-field-input"
										value={value || ""}
										onChange={(e) => {
											setEditingScene({ ...editingScene, [key]: e.target.value });
										}}
										rows={key === "Synopsis" || key.toLowerCase().includes("synopsis") ? 4 : 2}
									/>
								)}
							</div>
						);
					})}

					{/* Reference Images Section */}
					{(referenceImages.length > 0 || !isViewOnly) && (
						<div className="sbn-reference-images-section">
							<h4 className="sbn-reference-title">Reference Images ({referenceImages.length})</h4>

							{/* Upload Area */}
							{!isViewOnly && (
								<div className="sbn-image-upload-area">
									<label className="sbn-image-upload-label">
										<input
											type="file"
											accept="image/*"
											onChange={(e) => {
												if (e.target.files && e.target.files[0]) {
													handleUploadReferenceImage(e.target.files[0], editingSceneIndex);
													e.target.value = ""; // Reset input
												}
											}}
											disabled={isUploadingImage}
											className="sbn-image-upload-input"
											multiple={false}
										/>
										<span className="sbn-image-upload-btn">
											{isUploadingImage ? "Uploading..." : "📸 Upload Image"}
										</span>
									</label>
								</div>
							)}

							{/* Images Gallery */}
							{referenceImages.length > 0 && (
								<div className="sbn-images-gallery">
									{referenceImages.map((image, idx) => (
										<div key={image.id} className="sbn-image-item">
																<img
																	src={getApiUrl(`/api/${id}/reference-image/serve/${editingSceneIndex}/${image.id}${getReferenceSceneQuery(editingSceneIndex)}`)}
												alt={image.filename}
												className="sbn-image-thumbnail"
												onClick={() => {
													setPreviewImageIndex(idx);
													setShowImagePreviewModal(true);
												}}
											/>
											<div className="sbn-image-info">
												<span className="sbn-image-name">{image.filename}</span>
												{!isViewOnly && (
													<button
														className="sbn-image-delete-btn"
														onClick={() => handleDeleteReferenceImage(image.id, editingSceneIndex)}
														title="Delete image"
													>
														🗑️
													</button>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					)}
				</div>

				<div className="sbn-scene-actions">
					{!isViewOnly && (
						<button className="sbn-scene-save-btn" onClick={handleSaveSceneChanges} disabled={!hasSceneChanges}>
							Save Changes
						</button>
					)}
					<button
						className="sbn-cancel-btn"
						onClick={() => {
							setEditingScene(null);
							setViewMode("table");
						}}
					>
						{isViewOnly ? "Close" : "Cancel"}
					</button>
				</div>
			</div>
		);
	};

	/* ---------- Table render:
	   - Table cells show plain text; props columns are plain CSV strings in table
	   - Clicking a row opens the scene editor (where TagInput is available)
	   - Only show columns up to "Other Props"
  */
	const renderTableContent = () => {
		if (scriptBreakdown.length === 0) return null;
		const allHeaders = Object.keys(scriptBreakdown[0] || {});

		// Define the default columns to show
		let defaultVisibleColumns = [
			"Scene Number",
			"Int./Ext.",
			"Location",
			"Time",
			"Page Eighths",
			"Synopsis",
			"Characters",
			"Action Props",
			"Other Props",
			"Picture Vehicles",
			"Animals",
			"Extras",
			"Wardrobe",
			"Set Dressing",
			"Reference",
		];

		// If Episode Number exists in data, insert it as the first column
		if (isEpisodicProject && allHeaders.some((h) => h.toLowerCase() === "episode number")) {
			defaultVisibleColumns = ["Episode Number", ...defaultVisibleColumns];
		}

		// Add custom fields to visible columns
		const customFieldDisplayNames = customFields.map((fieldKey) => snakeCaseToTitleCase(fieldKey));
		const visibleColumns = [...defaultVisibleColumns, ...customFieldDisplayNames];

		// Define special columns that are calculated dynamically (not in TSV data)
		const specialColumns = ["Reference"];

		// Filter headers to only show visible columns that exist in data
		const headers = visibleColumns
			.filter((col) => allHeaders.some((h) => h.toLowerCase() === col.toLowerCase()) || customFieldDisplayNames.includes(col) || specialColumns.includes(col))
			.map((col) => allHeaders.find((h) => h.toLowerCase() === col.toLowerCase()) || col);

		const filtered = filteredBreakdown;

		// Check if value is N/A or empty for badge display
		const isNAValue = (val) => {
			if (!val) return true;
			const trimmed = String(val).trim().toLowerCase();
			return trimmed === "" || trimmed === "n/a" || trimmed === "na";
		};

		return (
			<div className="sbn-table-wrapper">
				<div className="sbn-table-container" ref={tableWrapRef}>
					{showLeftShadow && <div className="sbn-left-shadow" />}
					{showRightShadow && <div className="sbn-right-shadow" />}

					<table className="sbn-table">
						<thead className="sbn-thead">
							<tr className="sbn-header-row">
								{showPositionSelector && <th className="sbn-header-cell sbn-insert-col">Insert</th>}
								{removeSceneMode && <th className="sbn-header-cell sbn-remove-col">Remove</th>}
								{splitSceneMode && <th className="sbn-header-cell sbn-split-col">Split</th>}
								{mergeSceneMode && <th className="sbn-header-cell sbn-merge-col">Merge</th>}
								{headers.map((h, i) => {
									// Check if this is a custom field (can be removed)
									const fieldKey = h.toLowerCase().replace(/ /g, "_").replace(/-/g, "_");
									const isCustomField = customFields.includes(fieldKey);
									const isSelected = selectedElementToRemove === fieldKey;

									return (
										<th key={i} className={`sbn-header-cell ${isSelected ? "sbn-header-selected" : ""}`}>
											<div className="sbn-header-content">
												{removeElementMode && isCustomField && (
													<input
														type="checkbox"
														className="sbn-remove-checkbox"
														checked={isSelected}
														onChange={(e) => {
															e.stopPropagation();
															if (isSelected) {
																setSelectedElementToRemove(null);
															} else {
																setSelectedElementToRemove(fieldKey);
															}
														}}
														onClick={(e) => e.stopPropagation()}
													/>
												)}
												<span>{h}</span>
											</div>
										</th>
									);
								})}
							</tr>
						</thead>
						<tbody className="sbn-tbody">
							{/* Insert at beginning option */}
							{showPositionSelector && (
								<tr className="sbn-insert-row">
									<td colSpan={headers.length + 1}>
										<button className="sbn-insert-btn sbn-insert-btn-full" onClick={() => handleSelectPosition(0)}>
											<FaPlus className="sbn-insert-icon" />
											<span>Insert new scene at the beginning</span>
										</button>
									</td>
								</tr>
							)}
							{filtered.map((row, rIdx) => (
								<React.Fragment key={rIdx}>
									<tr
										className={`sbn-data-row ${showPositionSelector ? "sbn-row-selectable" : ""} ${removeSceneMode ? "sbn-row-removable" : ""
											} ${splitSceneMode ? "sbn-row-splittable" : ""} ${mergeSceneMode ? "sbn-row-mergeable" : ""}`}
										onClick={() => {
											if (showPositionSelector) return; // Disable row click in position selector mode
											if (removeSceneMode) return; // Disable row click in remove mode
											if (splitSceneMode) return; // Disable row click in split mode
											if (mergeSceneMode) return; // Disable row click in merge mode
											// Find the matching scene in sceneBreakdowns by scene number
											const jsonIdx = findSceneIndexByIdentity(row);
											openSceneEditorAt(jsonIdx === -1 ? rIdx : jsonIdx);
										}}
									>
										{showPositionSelector && (
											<td className="sbn-data-cell sbn-insert-cell">
												<span className="sbn-row-number">{rIdx + 1}</span>
											</td>
										)}
								{removeSceneMode && (
									<td className="sbn-data-cell sbn-remove-cell">
										<input
											type="checkbox"
											className="sbn-remove-checkbox"
											checked={selectedScenesToRemove.some((scene) => {
												const sceneData = getSceneDataByIdentity(row);
												if (sceneData?.id && scene.id) return sceneData.id === scene.id;
												return scene.scene_number === row["Scene Number"];
											})}
										onChange={(e) => {
											e.stopPropagation();
											const sceneNum = row["Scene Number"];
											const sceneData = getSceneDataByIdentity(row);
											if (sceneData) {
												handleSelectSceneToRemove(sceneData);
											} else {
												handleSelectSceneToRemove({
													scene_number: sceneNum,
													location: row["Location"],
													synopsis: row["Synopsis"],
													episode_number: row["Episode Number"] || "",
												});
												}
											}}
											onClick={(e) => e.stopPropagation()}
											aria-label={`Select scene ${row["Scene Number"]} for removal`}
										/>
									</td>
								)}
										{splitSceneMode && (
											<td className="sbn-data-cell sbn-split-cell">
												<button
													className="sbn-split-scene-select-btn"
													onClick={(e) => {
														e.stopPropagation();
														const sceneNum = row["Scene Number"];
														const sceneData = getSceneDataByIdentity(row);
														if (sceneData) {
															handleSelectSceneToSplit(sceneData);
														} else {
															// Fallback if not found in sceneBreakdowns
															handleSelectSceneToSplit({
																id: rIdx,
																scene_number: sceneNum,
																int_ext: row["Int./Ext."],
																location: row["Location"],
																time: row["Time"],
																page_eighths: row["Page Eighths"],
																synopsis: row["Synopsis"],
																characters_ids: [],
															});
														}
													}}
												>
													✂️
												</button>
											</td>
										)}
										{mergeSceneMode && (
											<td className="sbn-data-cell sbn-merge-cell">
												{(() => {
													const sceneNum = row["Scene Number"];
													const sceneData = getSceneDataByIdentity(row);
													const isSelected = selectedScenesToMerge.some(
														(s) => s.scene_number === sceneNum || s.id === sceneData?.id,
													);
													return (
														<button
															className={`sbn-merge-scene-select-btn ${isSelected ? "sbn-merge-selected" : ""}`}
															onClick={(e) => {
																e.stopPropagation();
																if (sceneData) {
																	handleSelectSceneToMerge(sceneData);
																} else {
																	// Fallback if not found in sceneBreakdowns
																	handleSelectSceneToMerge({
																		id: rIdx,
																		scene_number: sceneNum,
																		int_ext: row["Int./Ext."],
																		location: row["Location"],
																		time: row["Time"],
																		page_eighths: row["Page Eighths"],
																		synopsis: row["Synopsis"],
																		characters_ids: [],
																	});
																}
															}}
														>
															{isSelected ? "✓" : "🔗"}
														</button>
													);
												})()}
											</td>
										)}
										{headers.map((header, cIdx) => {
											// For custom fields, we need to get the value from sceneBreakdowns
											const fieldKey = header.toLowerCase().replace(/ /g, "_").replace(/-/g, "_");
											const isCustomField = customFields.includes(fieldKey);

											let cellValue = row[header] ?? "";

											// Handle Reference column
											if (header === "Reference") {
												const sceneData = getSceneDataByIdentity(row);
												const referenceImageCount = sceneData?.reference_images?.length || 0;
												return (
													<td key={cIdx} className="sbn-data-cell">
														<div
															className="sbn-reference-btn"
															style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "6px", background: referenceImageCount > 0 ? "#e3eaff" : "#f5f5f5", border: "1px solid #d0d0d0" }}
														>
															<FaCamera style={{ color: referenceImageCount > 0 ? "#3a6eea" : "#aaa", fontSize: "18px" }} />
															<span style={{ fontWeight: 600, color: referenceImageCount > 0 ? "#3a6eea" : "#888", fontSize: "15px" }}>{referenceImageCount}</span>
														</div>
													</td>
												);
											}

											// If custom field, get from sceneBreakdowns
											if (isCustomField) {
												const customSceneNum = row["Scene Number"];
												const customSceneData = sceneBreakdowns.find((s) => s.scene_number === customSceneNum);
												if (customSceneData && customSceneData[fieldKey]) {
													const arr = customSceneData[fieldKey];
												} else {
													cellValue = "N/A";
												}
											}

											const isSceneNumber = header.toLowerCase().includes("scene") && header.toLowerCase().includes("number");
											const isPropColumn = propsKeys.includes(header) || isCustomField;
											const isSelected = selectedElementToRemove === fieldKey;
											const isSynopsisColumn = header === "Synopsis";

											return (
												<td key={cIdx} className={`sbn-data-cell ${isSelected ? "sbn-cell-selected" : ""} ${isSynopsisColumn ? "sbn-synopsis-cell" : ""}`}>
													{isSceneNumber ? (
														<span className="sbn-cell-scene-number">{cellValue}</span>
													) : isPropColumn && isNAValue(cellValue) ? (
														<span className="sbn-na-badge">N/A</span>
													) : (
														<span className="sbn-cell-text">{cellValue}</span>
													)}
												</td>
											);
										})}
									</tr>
									{/* Insert after this row option */}
									{showPositionSelector && (
										<tr className="sbn-insert-row">
											<td colSpan={headers.length + 1}>
												<button className="sbn-insert-btn" onClick={() => handleSelectPosition(rIdx + 1)}>
													<FaPlus className="sbn-insert-icon" />
													<span>Insert after Scene {row["Scene Number"]}</span>
												</button>
											</td>
										</tr>
									)}
								</React.Fragment>
							))}
						</tbody>
					</table>
				</div>
			</div>
		);
	};

	function renderScreenplay(content) {
		const lines = content.split(/\r?\n/);
		let lastType = "action";

		return lines.map((line, i) => {
			const trimmed = line.trim();
			if (!trimmed) return <br key={i} />;

			// 🎬 Scene Heading (INT./EXT.)
			if (/^(INT\.|EXT\.|INT\/EXT\.)/i.test(trimmed)) {
				lastType = "heading";
				return (
					<div key={i} className="sbn-scene-heading">
						{trimmed.toUpperCase()}
					</div>
				);
			}

			// 👤 Character name line (e.g., JOHN: or JOHN (V.O.))
			if (/^[A-Z0-9 .,'()\-]+:?\s*$/.test(trimmed) && trimmed === trimmed.toUpperCase()) {
				lastType = "character";
				return (
					<div key={i} className="sbn-character-name">
						{trimmed.replace(/:$/, "")}
					</div>
				);
			}

			// 💬 Dialogue (follows a character line)
			if (lastType === "character") {
				lastType = "dialogue";
				return (
					<div key={i} className="sbn-dialogue-block">
						{trimmed}
					</div>
				);
			}

			// 🗣️ Parenthetical
			if (/^\(.*\)$/.test(trimmed)) {
				lastType = "parenthetical";
				return (
					<div key={i} className="sbn-parenthetical">
						{trimmed}
					</div>
				);
			}

			// 🎞️ Transition (CUT TO:, FADE OUT., etc.)
			if (/^(CUT TO:|FADE OUT\.|FADE IN:|DISSOLVE TO:)/i.test(trimmed)) {
				lastType = "transition";
				return (
					<div key={i} className="sbn-transition-text">
						{trimmed.toUpperCase()}
					</div>
				);
			}

			// 📝 Action / description
			lastType = "action";
			return (
				<div key={i} className="sbn-action-text">
					{trimmed}
				</div>
			);
		});
	}

	useEffect(() => {
		console.log("saving parsing in backend..........");
		handleSaveSceneChanges();
	}, [parsing]);

	const EditParsingModal = () => {
		const handleSave = () => {
			const newPars = [...parsing];
			newPars[editingSceneIndex] = editingSceneParsing;
			setParsing(newPars);
			setEditParsing(false);
		};

		return (
			<div className="sbn-overlay">
				<div className="sbn-modal">
					{/* Editable Title */}
					<input
						type="text"
						value={editingSceneParsing.heading}
						onChange={(e) =>
							setEditingSceneParsing({
								...editingSceneParsing,
								heading: e.target.value,
							})
						}
						placeholder="Scene Title"
						className="sbn-scene-heading-input"
					/>

					{/* Editable Content */}
					<textarea
						className="sbn-text-area"
						value={editingSceneParsing.content}
						onChange={(e) =>
							setEditingSceneParsing({
								...editingSceneParsing,
								content: e.target.value,
							})
						}
						placeholder="Enter scene content..."
					/>

					{/* Buttons */}
					<div className="sbn-button-row">
						<button className="sbn-save-btn" onClick={handleSave}>
							Save
						</button>
						<button className="sbn-close-btn-m" onClick={() => setEditParsing(false)}>
							Close
						</button>
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className="sbn-page-container">
			<datalist id="sbn-location-options">
				{locationList.map((loc) => (
					<option key={loc.location_id || loc.location} value={loc.location} />
				))}
			</datalist>
			{editParsing && EditParsingModal()}
			{/* Add Element Modal - inlined to prevent re-render on typing */}
			{showAddElementModal && (
				<div className="sbn-overlay" onClick={() => setShowAddElementModal(false)}>
					<div className="sbn-element-modal" onClick={(e) => e.stopPropagation()}>
						<div className="sbn-element-modal-header">
							<h3>Add New Element</h3>
							<button className="sbn-modal-close-btn" onClick={() => setShowAddElementModal(false)}>
								×
							</button>
						</div>
						<div className="sbn-element-modal-body">
							<label className="sbn-element-label">Element Name</label>
							<input
								type="text"
								value={newElementName}
								onChange={(e) => setNewElementName(e.target.value)}
								placeholder="e.g., Special Effects, Makeup..."
								className="sbn-element-input"
								autoFocus
								onKeyDown={(e) => {
									if (e.key === "Enter" && !isAddingElement) {
										handleAddElement();
									}
								}}
							/>
							<p className="sbn-element-hint">
								This will add a new column to all scenes in the breakdown. The element name will be converted to a field key (e.g.,
								"Special Effects" becomes "special_effects").
							</p>
						</div>
						<div className="sbn-element-modal-footer">
							<button className="sbn-element-cancel-btn" onClick={() => setShowAddElementModal(false)} disabled={isAddingElement}>
								Cancel
							</button>
							<button className="sbn-element-add-btn" onClick={handleAddElement} disabled={isAddingElement || !newElementName.trim()}>
								{isAddingElement ? "Adding..." : "Add Element"}
							</button>
						</div>
					</div>
				</div>
			)}
			{/* Image Preview Modal */}
			{showImagePreviewModal && referenceImages.length > 0 && (
				<div className="sbn-overlay" onClick={() => setShowImagePreviewModal(false)}>
					<div className="sbn-image-preview-modal" onClick={(e) => e.stopPropagation()}>
						<button className="sbn-modal-close-btn" onClick={() => setShowImagePreviewModal(false)}>
							×
						</button>
						<div className="sbn-image-preview-container">
								<img
									src={getApiUrl(
										`/api/${id}/reference-image/serve/${editingSceneIndex}/${referenceImages[previewImageIndex].id}${getReferenceSceneQuery(editingSceneIndex)}`
									)}
								alt={referenceImages[previewImageIndex].filename}
								className="sbn-image-preview"
							/>
							<div className="sbn-image-nav">
								<button
									className="sbn-image-nav-btn"
									onClick={() =>
										setPreviewImageIndex(
											previewImageIndex === 0 ? referenceImages.length - 1 : previewImageIndex - 1
										)
									}
								>
									‹ Previous
								</button>
								<span className="sbn-image-counter">
									{previewImageIndex + 1} of {referenceImages.length}
								</span>
								<button
									className="sbn-image-nav-btn"
									onClick={() =>
										setPreviewImageIndex(
											previewImageIndex === referenceImages.length - 1 ? 0 : previewImageIndex + 1
										)
									}
								>
									Next ›
								</button>
							</div>
							<div className="sbn-image-info-detail">
								<p className="sbn-image-filename">{referenceImages[previewImageIndex].filename}</p>
								<p className="sbn-image-date">{referenceImages[previewImageIndex].uploaded_at}</p>
							</div>
						</div>
					</div>
				</div>
			)}
			{/* Remove Element Confirm Modal - simplified */}
			{showRemoveConfirmModal && (
				<div className="sbn-overlay" onClick={() => setShowRemoveConfirmModal(false)}>
					<div className="sbn-element-modal sbn-confirm-modal" onClick={(e) => e.stopPropagation()}>
						<div className="sbn-element-modal-header">
							<h3>Remove Element</h3>
							<button className="sbn-modal-close-btn" onClick={() => setShowRemoveConfirmModal(false)}>
								×
							</button>
						</div>
						<div className="sbn-element-modal-body">
							<p className="sbn-confirm-text">
								Are you sure you want to remove{" "}
								<strong>"{selectedElementToRemove ? snakeCaseToTitleCase(selectedElementToRemove) : ""}"</strong>?
							</p>
						</div>
						<div className="sbn-element-modal-footer">
							<button className="sbn-element-cancel-btn" onClick={() => setShowRemoveConfirmModal(false)} disabled={isRemovingElement}>
								Cancel
							</button>
							<button className="sbn-element-remove-btn" onClick={handleRemoveElement} disabled={isRemovingElement}>
								{isRemovingElement ? "Removing..." : "Remove"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Remove Scene Confirm Modal */}
			{showRemoveSceneModal && selectedScenesToRemove.length > 0 && (
				<div className="sbn-overlay" onClick={() => setShowRemoveSceneModal(false)}>
					<div className="sbn-element-modal sbn-confirm-modal" onClick={(e) => e.stopPropagation()}>
						<div className="sbn-element-modal-header">
							<h3>Remove Scenes</h3>
							<button className="sbn-modal-close-btn" onClick={() => setShowRemoveSceneModal(false)}>
								×
							</button>
						</div>
						<div className="sbn-element-modal-body">
							<p className="sbn-confirm-text">
								Are you sure you want to remove <strong>{selectedScenesToRemove.length}</strong> selected scene{selectedScenesToRemove.length > 1 ? "s" : ""}?
							</p>
							<p className="sbn-confirm-warning">
								This will permanently delete the selected scene breakdown data. This action cannot be undone.
							</p>
							<div className="sbn-confirm-scene-list">
								{selectedScenesToRemove.map((scene) => (
									<p key={`${scene.id || scene.scene_number}-${scene.episode_number || ""}`} className="sbn-confirm-detail">
										<strong>Scene {scene.scene_number}</strong>
										{scene.location ? ` - ${scene.location}` : ""}
									</p>
								))}
							</div>
						</div>
						<div className="sbn-element-modal-footer">
							<button
								className="sbn-element-cancel-btn"
								onClick={() => {
									setShowRemoveSceneModal(false);
									setSelectedScenesToRemove([]);
								}}
								disabled={isRemovingScene}
							>
								Cancel
							</button>
							<button className="sbn-element-remove-btn" onClick={handleRemoveScene} disabled={isRemovingScene}>
								{isRemovingScene ? "Removing..." : `Remove ${selectedScenesToRemove.length} Scene${selectedScenesToRemove.length > 1 ? "s" : ""}`}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Split Scene Modal */}
			{showSplitSceneModal && selectedSceneToSplit && (
				<div className="sbn-overlay" onClick={() => setShowSplitSceneModal(false)}>
					<div className="sbn-split-scene-modal" onClick={(e) => e.stopPropagation()}>
						<div className="sbn-split-scene-modal-header">
							<h3>Split Scene {selectedSceneToSplit.scene_number}</h3>
							<button className="sbn-modal-close-btn" onClick={() => setShowSplitSceneModal(false)}>
								×
							</button>
						</div>
						<div className="sbn-split-scene-modal-body">
							<div className="sbn-split-scene-forms">
								{/* Scene 1 Form */}
								<div className="sbn-split-scene-form-container">
									<h4 className="sbn-split-form-title">Scene 1</h4>
									<div className="sbn-add-scene-form">
										<div className="sbn-form-divider">
											<span>Insert Position</span>
										</div>
										<div className="sbn-form-row">
											<div className="sbn-form-group">
												<label className="sbn-form-label">
													Insert <span className="sbn-required">*</span>
												</label>
												<select
													value={splitSceneForm1.insert_relative}
													onChange={(e) => setSplitSceneForm1({ ...splitSceneForm1, insert_relative: e.target.value })}
													className="sbn-form-select"
												>
													<option value="before">Before scene</option>
													<option value="after">After scene</option>
												</select>
											</div>
											{isEpisodicProject && (
												<div className="sbn-form-group">
													<label className="sbn-form-label">
														Insert Episode <span className="sbn-required">*</span>
													</label>
													<select
														value={splitSceneForm1.insert_episode_number || ""}
														onChange={(e) => {
															const nextEpisode = e.target.value;
															const nextOptions = getSceneOptionsForEpisode(nextEpisode);
															const nextScene =
																nextOptions.find((opt) => opt.value === splitSceneForm1.insert_scene_number)?.value ||
																nextOptions[0]?.value ||
																"";
															setSplitSceneForm1({
																...splitSceneForm1,
																insert_episode_number: nextEpisode,
																insert_scene_number: nextScene,
															});
														}}
														className="sbn-form-select"
													>
														<option value="">Select Episode...</option>
														{addSceneEpisodeOptions.map((opt) => (
															<option key={opt.key} value={opt.key}>{opt.label}</option>
														))}
													</select>
												</div>
											)}
										</div>
										<div className="sbn-form-group sbn-form-group-full">
											<label className="sbn-form-label">
												Insert Scene <span className="sbn-required">*</span>
											</label>
											<select
												value={splitSceneForm1.insert_scene_number || ""}
												onChange={(e) => setSplitSceneForm1({ ...splitSceneForm1, insert_scene_number: e.target.value })}
												className="sbn-form-select"
											>
												<option value="">Select Scene...</option>
												{getSceneOptionsForEpisode(splitSceneForm1.insert_episode_number).map((opt) => (
													<option key={opt.value} value={opt.value}>{opt.label}</option>
												))}
											</select>
										</div>
										<div className="sbn-form-divider">
											<span>Scene Details</span>
										</div>
										{isEpisodicProject && (
											<div className="sbn-form-group sbn-form-group-full">
												<label className="sbn-form-label">
													Episode Number <span className="sbn-required">*</span>
												</label>
												<select
													value={splitSceneForm1.episode_number || ""}
													onChange={(e) => setSplitSceneForm1({ ...splitSceneForm1, episode_number: e.target.value })}
													className="sbn-form-select"
												>
													<option value="">Select Episode...</option>
													{addSceneEpisodeOptions.map((opt) => (
														<option key={opt.key} value={opt.key}>{opt.label}</option>
													))}
												</select>
											</div>
										)}
										<div className="sbn-form-row">
											<div className="sbn-form-group">
												<label className="sbn-form-label">
													Scene Number <span className="sbn-required">*</span>
												</label>
												<input
													type="text"
													value={splitSceneForm1.scene_number}
													onChange={(e) => setSplitSceneForm1({ ...splitSceneForm1, scene_number: e.target.value })}
													placeholder="e.g., 1, 2A, 3..."
													className="sbn-form-input"
												/>
											</div>
											<div className="sbn-form-group">
												<label className="sbn-form-label">
													Int./Ext. <span className="sbn-required">*</span>
												</label>
												<select
													value={splitSceneForm1.int_ext}
													onChange={(e) => setSplitSceneForm1({ ...splitSceneForm1, int_ext: e.target.value })}
													className="sbn-form-select"
												>
													<option value="INT.">INT.</option>
													<option value="EXT.">EXT.</option>
													<option value="INT./EXT.">INT./EXT.</option>
												</select>
											</div>
										</div>
										<div className="sbn-form-row">
											<div className="sbn-form-group">
												<label className="sbn-form-label">
													Location <span className="sbn-required">*</span>
												</label>
												<input
													type="text"
													list="sbn-location-options"
													value={splitSceneForm1.location}
													onChange={(e) => setSplitSceneForm1({ ...splitSceneForm1, location: e.target.value })}
													placeholder="Select or type a location..."
													className="sbn-form-input"
												/>
											</div>
											<div className="sbn-form-group">
												<label className="sbn-form-label">Set</label>
												<select
													value={splitSceneForm1.set}
													onChange={(e) => setSplitSceneForm1({ ...splitSceneForm1, set: e.target.value })}
													className="sbn-form-select"
												>
													<option value="">Select Set...</option>
													{locationList.map((loc) => (
														<option key={loc.location_id || loc.location} value={loc.location}>
															{loc.location}
														</option>
													))}
												</select>
											</div>
										</div>
										<div className="sbn-form-row">
											<div className="sbn-form-group">
												<label className="sbn-form-label">
													Time <span className="sbn-required">*</span>
												</label>
												<select
													value={splitSceneForm1.time}
													onChange={(e) => setSplitSceneForm1({ ...splitSceneForm1, time: e.target.value })}
													className="sbn-form-select"
												>
													<option value="DAY">DAY</option>
													<option value="NIGHT">NIGHT</option>
													<option value="DAWN">DAWN</option>
													<option value="DUSK">DUSK</option>
													<option value="MORNING">MORNING</option>
													<option value="AFTERNOON">AFTERNOON</option>
													<option value="EVENING">EVENING</option>
													<option value="CONTINUOUS">CONTINUOUS</option>
													<option value="LATER">LATER</option>
													<option value="MOMENTS LATER">MOMENTS LATER</option>
												</select>
											</div>
											<div className="sbn-form-group">
												<label className="sbn-form-label">
													Page Eighths <span className="sbn-required">*</span>
												</label>
												<MixedFractionPageEighthsInput
													value={splitSceneForm1.page_eighths}
													onChange={(nextValue) =>
														setSplitSceneForm1({
															...splitSceneForm1,
															page_eighths: nextValue,
														})
													}
													compact
													showHint={false}
												/>
											</div>
										</div>
										<div className="sbn-form-group sbn-form-group-full">
											<label className="sbn-form-label">
												Synopsis <span className="sbn-required">*</span>
											</label>
											<textarea
												value={splitSceneForm1.synopsis}
												onChange={(e) => setSplitSceneForm1({ ...splitSceneForm1, synopsis: e.target.value })}
												placeholder="Brief description of the scene..."
												className="sbn-form-textarea"
												rows={2}
											/>
										</div>
										<div className="sbn-form-group sbn-form-group-full">
											<label className="sbn-form-label">Characters</label>
											<CharacterTagInput
												selectedIds={splitSceneForm1.selectedCharacterIds || []}
												allCharacters={allCharacters}
												onChange={(ids) => setSplitSceneForm1({ ...splitSceneForm1, selectedCharacterIds: ids })}
											/>
										</div>
										<div className="sbn-form-divider">
											<span>Additional Fields (Optional)</span>
										</div>

										<div className="sbn-form-row">
											<div className="sbn-form-group">
												<label className="sbn-form-label">Action Props</label>
												<input
													type="text"
													value={splitSceneForm1.action_props}
													onChange={(e) => setSplitSceneForm1({ ...splitSceneForm1, action_props: e.target.value })}
													placeholder="e.g., Gun, Phone..."
													className="sbn-form-input"
												/>
											</div>
											<div className="sbn-form-group">
												<label className="sbn-form-label">Other Props</label>
												<input
													type="text"
													value={splitSceneForm1.other_props}
													onChange={(e) => setSplitSceneForm1({ ...splitSceneForm1, other_props: e.target.value })}
													placeholder="e.g., Book, Lamp..."
													className="sbn-form-input"
												/>
											</div>
										</div>

										<div className="sbn-form-row">
											<div className="sbn-form-group">
												<label className="sbn-form-label">Picture Vehicles</label>
												<input
													type="text"
													value={splitSceneForm1.picture_vehicles}
													onChange={(e) => setSplitSceneForm1({ ...splitSceneForm1, picture_vehicles: e.target.value })}
													placeholder="e.g., Police Car, Taxi..."
													className="sbn-form-input"
												/>
											</div>
											<div className="sbn-form-group">
												<label className="sbn-form-label">Animals</label>
												<input
													type="text"
													value={splitSceneForm1.animals}
													onChange={(e) => setSplitSceneForm1({ ...splitSceneForm1, animals: e.target.value })}
													placeholder="e.g., Dog, Horse..."
													className="sbn-form-input"
												/>
											</div>
										</div>

										<div className="sbn-form-row">
											<div className="sbn-form-group">
												<label className="sbn-form-label">Extras</label>
												<input
													type="text"
													value={splitSceneForm1.extras}
													onChange={(e) => setSplitSceneForm1({ ...splitSceneForm1, extras: e.target.value })}
													placeholder="e.g., Crowd, Waiters..."
													className="sbn-form-input"
												/>
											</div>
											<div className="sbn-form-group">
												<label className="sbn-form-label">Wardrobe</label>
												<input
													type="text"
													value={splitSceneForm1.wardrobe}
													onChange={(e) => setSplitSceneForm1({ ...splitSceneForm1, wardrobe: e.target.value })}
													placeholder="e.g., Wedding Dress, Suit..."
													className="sbn-form-input"
												/>
											</div>
										</div>

										<div className="sbn-form-group sbn-form-group-full">
											<label className="sbn-form-label">Set Dressing</label>
											<input
												type="text"
												value={splitSceneForm1.set_dressing}
												onChange={(e) => setSplitSceneForm1({ ...splitSceneForm1, set_dressing: e.target.value })}
												placeholder="e.g., Christmas Decorations, Office Furniture..."
												className="sbn-form-input"
											/>
										</div>

										{/* Custom Fields for Scene 1 */}
										{customFields.length > 0 &&
											customFields.map((fieldKey) => (
												<div key={fieldKey} className="sbn-form-group sbn-form-group-full">
													<label className="sbn-form-label">{snakeCaseToTitleCase(fieldKey)}</label>
													<input
														type="text"
														value={splitSceneForm1[fieldKey] || ""}
														onChange={(e) => setSplitSceneForm1({ ...splitSceneForm1, [fieldKey]: e.target.value })}
														placeholder={`e.g., ${snakeCaseToTitleCase(fieldKey)} items...`}
														className="sbn-form-input"
													/>
												</div>
											))}
									</div>
								</div>

								{/* Divider */}
								<div className="sbn-split-scene-divider"></div>

								{/* Scene 2 Form */}
								<div className="sbn-split-scene-form-container">
									<h4 className="sbn-split-form-title">Scene 2</h4>
									<div className="sbn-add-scene-form">
										<div className="sbn-form-divider">
											<span>Insert Position</span>
										</div>
										<div className="sbn-form-row">
											<div className="sbn-form-group">
												<label className="sbn-form-label">
													Insert <span className="sbn-required">*</span>
												</label>
												<select
													value={splitSceneForm2.insert_relative}
													onChange={(e) => setSplitSceneForm2({ ...splitSceneForm2, insert_relative: e.target.value })}
													className="sbn-form-select"
												>
													<option value="before">Before scene</option>
													<option value="after">After scene</option>
												</select>
											</div>
											{isEpisodicProject && (
												<div className="sbn-form-group">
													<label className="sbn-form-label">
														Insert Episode <span className="sbn-required">*</span>
													</label>
													<select
														value={splitSceneForm2.insert_episode_number || ""}
														onChange={(e) => {
															const nextEpisode = e.target.value;
															const nextOptions = getSceneOptionsForEpisode(nextEpisode);
															const nextScene =
																nextOptions.find((opt) => opt.value === splitSceneForm2.insert_scene_number)?.value ||
																nextOptions[0]?.value ||
																"";
															setSplitSceneForm2({
																...splitSceneForm2,
																insert_episode_number: nextEpisode,
																insert_scene_number: nextScene,
															});
														}}
														className="sbn-form-select"
													>
														<option value="">Select Episode...</option>
														{addSceneEpisodeOptions.map((opt) => (
															<option key={opt.key} value={opt.key}>{opt.label}</option>
														))}
													</select>
												</div>
											)}
										</div>
										<div className="sbn-form-group sbn-form-group-full">
											<label className="sbn-form-label">
												Insert Scene <span className="sbn-required">*</span>
											</label>
											<select
												value={splitSceneForm2.insert_scene_number || ""}
												onChange={(e) => setSplitSceneForm2({ ...splitSceneForm2, insert_scene_number: e.target.value })}
												className="sbn-form-select"
											>
												<option value="">Select Scene...</option>
												{getSceneOptionsForEpisode(splitSceneForm2.insert_episode_number).map((opt) => (
													<option key={opt.value} value={opt.value}>{opt.label}</option>
												))}
											</select>
										</div>
										<div className="sbn-form-divider">
											<span>Scene Details</span>
										</div>
										{isEpisodicProject && (
											<div className="sbn-form-group sbn-form-group-full">
												<label className="sbn-form-label">
													Episode Number <span className="sbn-required">*</span>
												</label>
												<select
													value={splitSceneForm2.episode_number || ""}
													onChange={(e) => setSplitSceneForm2({ ...splitSceneForm2, episode_number: e.target.value })}
													className="sbn-form-select"
												>
													<option value="">Select Episode...</option>
													{addSceneEpisodeOptions.map((opt) => (
														<option key={opt.key} value={opt.key}>{opt.label}</option>
													))}
												</select>
											</div>
										)}
										<div className="sbn-form-row">
											<div className="sbn-form-group">
												<label className="sbn-form-label">
													Scene Number <span className="sbn-required">*</span>
												</label>
												<input
													type="text"
													value={splitSceneForm2.scene_number}
													onChange={(e) => setSplitSceneForm2({ ...splitSceneForm2, scene_number: e.target.value })}
													placeholder="e.g., 1, 2A, 3..."
													className="sbn-form-input"
												/>
											</div>
											<div className="sbn-form-group">
												<label className="sbn-form-label">
													Int./Ext. <span className="sbn-required">*</span>
												</label>
												<select
													value={splitSceneForm2.int_ext}
													onChange={(e) => setSplitSceneForm2({ ...splitSceneForm2, int_ext: e.target.value })}
													className="sbn-form-select"
												>
													<option value="INT.">INT.</option>
													<option value="EXT.">EXT.</option>
													<option value="INT./EXT.">INT./EXT.</option>
												</select>
											</div>
										</div>
										<div className="sbn-form-row">
											<div className="sbn-form-group">
												<label className="sbn-form-label">
													Location <span className="sbn-required">*</span>
												</label>
												<input
													type="text"
													list="sbn-location-options"
													value={splitSceneForm2.location}
													onChange={(e) => setSplitSceneForm2({ ...splitSceneForm2, location: e.target.value })}
													placeholder="Select or type a location..."
													className="sbn-form-input"
												/>
											</div>
											<div className="sbn-form-group">
												<label className="sbn-form-label">Set</label>
												<select
													value={splitSceneForm2.set}
													onChange={(e) => setSplitSceneForm2({ ...splitSceneForm2, set: e.target.value })}
													className="sbn-form-select"
												>
													<option value="">Select Set...</option>
													{locationList.map((loc) => (
														<option key={loc.location_id || loc.location} value={loc.location}>
															{loc.location}
														</option>
													))}
												</select>
											</div>
										</div>
										<div className="sbn-form-row">
											<div className="sbn-form-group">
												<label className="sbn-form-label">
													Time <span className="sbn-required">*</span>
												</label>
												<select
													value={splitSceneForm2.time}
													onChange={(e) => setSplitSceneForm2({ ...splitSceneForm2, time: e.target.value })}
													className="sbn-form-select"
												>
													<option value="DAY">DAY</option>
													<option value="NIGHT">NIGHT</option>
													<option value="DAWN">DAWN</option>
													<option value="DUSK">DUSK</option>
													<option value="MORNING">MORNING</option>
													<option value="AFTERNOON">AFTERNOON</option>
													<option value="EVENING">EVENING</option>
													<option value="CONTINUOUS">CONTINUOUS</option>
													<option value="LATER">LATER</option>
													<option value="MOMENTS LATER">MOMENTS LATER</option>
												</select>
											</div>
											<div className="sbn-form-group">
												<label className="sbn-form-label">
													Page Eighths <span className="sbn-required">*</span>
												</label>
												<MixedFractionPageEighthsInput
													value={splitSceneForm2.page_eighths}
													onChange={(nextValue) =>
														setSplitSceneForm2({
															...splitSceneForm2,
															page_eighths: nextValue,
														})
													}
													compact
													showHint={false}
												/>
											</div>
										</div>
										<div className="sbn-form-group sbn-form-group-full">
											<label className="sbn-form-label">
												Synopsis <span className="sbn-required">*</span>
											</label>
											<textarea
												value={splitSceneForm2.synopsis}
												onChange={(e) => setSplitSceneForm2({ ...splitSceneForm2, synopsis: e.target.value })}
												placeholder="Brief description of the scene..."
												className="sbn-form-textarea"
												rows={2}
											/>
										</div>
										<div className="sbn-form-group sbn-form-group-full">
											<label className="sbn-form-label">Characters</label>
											<CharacterTagInput
												selectedIds={splitSceneForm2.selectedCharacterIds || []}
												allCharacters={allCharacters}
												onChange={(ids) => setSplitSceneForm2({ ...splitSceneForm2, selectedCharacterIds: ids })}
											/>
										</div>
										<div className="sbn-form-divider">
											<span>Additional Fields (Optional)</span>
										</div>

										<div className="sbn-form-row">
											<div className="sbn-form-group">
												<label className="sbn-form-label">Action Props</label>
												<input
													type="text"
													value={splitSceneForm2.action_props}
													onChange={(e) => setSplitSceneForm2({ ...splitSceneForm2, action_props: e.target.value })}
													placeholder="e.g., Gun, Phone..."
													className="sbn-form-input"
												/>
											</div>
											<div className="sbn-form-group">
												<label className="sbn-form-label">Other Props</label>
												<input
													type="text"
													value={splitSceneForm2.other_props}
													onChange={(e) => setSplitSceneForm2({ ...splitSceneForm2, other_props: e.target.value })}
													placeholder="e.g., Book, Lamp..."
													className="sbn-form-input"
												/>
											</div>
										</div>

										<div className="sbn-form-row">
											<div className="sbn-form-group">
												<label className="sbn-form-label">Picture Vehicles</label>
												<input
													type="text"
													value={splitSceneForm2.picture_vehicles}
													onChange={(e) => setSplitSceneForm2({ ...splitSceneForm2, picture_vehicles: e.target.value })}
													placeholder="e.g., Police Car, Taxi..."
													className="sbn-form-input"
												/>
											</div>
											<div className="sbn-form-group">
												<label className="sbn-form-label">Animals</label>
												<input
													type="text"
													value={splitSceneForm2.animals}
													onChange={(e) => setSplitSceneForm2({ ...splitSceneForm2, animals: e.target.value })}
													placeholder="e.g., Dog, Horse..."
													className="sbn-form-input"
												/>
											</div>
										</div>

										<div className="sbn-form-row">
											<div className="sbn-form-group">
												<label className="sbn-form-label">Extras</label>
												<input
													type="text"
													value={splitSceneForm2.extras}
													onChange={(e) => setSplitSceneForm2({ ...splitSceneForm2, extras: e.target.value })}
													placeholder="e.g., Crowd, Waiters..."
													className="sbn-form-input"
												/>
											</div>
											<div className="sbn-form-group">
												<label className="sbn-form-label">Wardrobe</label>
												<input
													type="text"
													value={splitSceneForm2.wardrobe}
													onChange={(e) => setSplitSceneForm2({ ...splitSceneForm2, wardrobe: e.target.value })}
													placeholder="e.g., Wedding Dress, Suit..."
													className="sbn-form-input"
												/>
											</div>
										</div>

										<div className="sbn-form-group sbn-form-group-full">
											<label className="sbn-form-label">Set Dressing</label>
											<input
												type="text"
												value={splitSceneForm2.set_dressing}
												onChange={(e) => setSplitSceneForm2({ ...splitSceneForm2, set_dressing: e.target.value })}
												placeholder="e.g., Christmas Decorations, Office Furniture..."
												className="sbn-form-input"
											/>
										</div>

										{/* Custom Fields for Scene 2 */}
										{customFields.length > 0 &&
											customFields.map((fieldKey) => (
												<div key={fieldKey} className="sbn-form-group sbn-form-group-full">
													<label className="sbn-form-label">{snakeCaseToTitleCase(fieldKey)}</label>
													<input
														type="text"
														value={splitSceneForm2[fieldKey] || ""}
														onChange={(e) => setSplitSceneForm2({ ...splitSceneForm2, [fieldKey]: e.target.value })}
														placeholder={`e.g., ${snakeCaseToTitleCase(fieldKey)} items...`}
														className="sbn-form-input"
													/>
												</div>
											))}
									</div>
								</div>
							</div>
						</div>
						<div className="sbn-split-scene-modal-footer">
							<button className="sbn-element-cancel-btn" onClick={() => setShowSplitSceneModal(false)} disabled={isSplittingScene}>
								Cancel
							</button>
							<button className="sbn-split-scene-btn" onClick={handleSplitScene} disabled={isSplittingScene}>
								{isSplittingScene ? "Splitting..." : "Split Scene"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Merge Scene Modal */}
			{showMergeSceneModal && selectedScenesToMerge.length === 2 && (
				<div className="sbn-overlay" onClick={() => setShowMergeSceneModal(false)}>
					<div className="sbn-merge-scene-modal" onClick={(e) => e.stopPropagation()}>
						<div className="sbn-merge-scene-modal-header">
							<h3>
								Merge Scene {selectedScenesToMerge[0]?.scene_number} & Scene {selectedScenesToMerge[1]?.scene_number}
							</h3>
							<button className="sbn-modal-close-btn" onClick={() => setShowMergeSceneModal(false)}>
								×
							</button>
						</div>
						<div className="sbn-merge-scene-modal-body">
							<div className="sbn-merge-info-banner">
								<span>📋</span>
								<span>Merging scenes will combine their data. Review and edit the merged scene details below.</span>
							</div>
							<div className="sbn-add-scene-form">
								<div className="sbn-form-divider">
									<span>Insert Position</span>
								</div>
								<div className="sbn-form-row">
									<div className="sbn-form-group">
										<label className="sbn-form-label">
											Insert <span className="sbn-required">*</span>
										</label>
										<select
											value={mergeSceneForm.insert_relative}
											onChange={(e) => setMergeSceneForm({ ...mergeSceneForm, insert_relative: e.target.value })}
											className="sbn-form-select"
										>
											<option value="before">Before scene</option>
											<option value="after">After scene</option>
										</select>
									</div>
									{isEpisodicProject && (
										<div className="sbn-form-group">
											<label className="sbn-form-label">
												Insert Episode <span className="sbn-required">*</span>
											</label>
											<select
												value={mergeSceneForm.insert_episode_number || ""}
												onChange={(e) => {
													const nextEpisode = e.target.value;
													const nextOptions = getSceneOptionsForEpisode(nextEpisode);
													const nextScene =
														nextOptions.find((opt) => opt.value === mergeSceneForm.insert_scene_number)?.value ||
														nextOptions[0]?.value ||
														"";
													setMergeSceneForm({
														...mergeSceneForm,
														insert_episode_number: nextEpisode,
														insert_scene_number: nextScene,
													});
												}}
												className="sbn-form-select"
											>
												<option value="">Select Episode...</option>
												{addSceneEpisodeOptions.map((opt) => (
													<option key={opt.key} value={opt.key}>{opt.label}</option>
												))}
											</select>
										</div>
									)}
								</div>
								<div className="sbn-form-group sbn-form-group-full">
									<label className="sbn-form-label">
										Insert Scene <span className="sbn-required">*</span>
									</label>
									<select
										value={mergeSceneForm.insert_scene_number || ""}
										onChange={(e) => setMergeSceneForm({ ...mergeSceneForm, insert_scene_number: e.target.value })}
										className="sbn-form-select"
									>
										<option value="">Select Scene...</option>
										{mergeInsertSceneOptions.map((opt) => (
											<option key={opt.value} value={opt.value}>{opt.label}</option>
										))}
									</select>
								</div>
								<div className="sbn-form-divider">
									<span>Scene Details</span>
								</div>
								{isEpisodicProject && !isEpisodeLockedForPosition && (
									<div className="sbn-form-group sbn-form-group-full">
										<label className="sbn-form-label">
											Episode Number <span className="sbn-required">*</span>
										</label>
										<select
											value={mergeSceneForm.episode_number || ""}
											onChange={(e) => setMergeSceneForm({ ...mergeSceneForm, episode_number: e.target.value })}
											className="sbn-form-select"
										>
											<option value="">Select Episode...</option>
											{addSceneEpisodeOptionsForPosition.map((opt) => (
												<option key={opt.key} value={opt.key}>{opt.label}</option>
											))}
										</select>
									</div>
								)}
								<div className="sbn-form-row">
									<div className="sbn-form-group">
										<label className="sbn-form-label">
											Scene Number <span className="sbn-required">*</span>
										</label>
										<input
											type="text"
											value={mergeSceneForm.scene_number}
											onChange={(e) => setMergeSceneForm({ ...mergeSceneForm, scene_number: e.target.value })}
											placeholder="e.g., 1, 2A, 3..."
											className="sbn-form-input"
											autoFocus
										/>
									</div>
									<div className="sbn-form-group">
										<label className="sbn-form-label">
											Int./Ext. <span className="sbn-required">*</span>
										</label>
										<select
											value={mergeSceneForm.int_ext}
											onChange={(e) => setMergeSceneForm({ ...mergeSceneForm, int_ext: e.target.value })}
											className="sbn-form-select"
										>
											<option value="INT.">INT.</option>
											<option value="EXT.">EXT.</option>
											<option value="INT./EXT.">INT./EXT.</option>
										</select>
									</div>
								</div>

								<div className="sbn-form-row">
									<div className="sbn-form-group">
										<label className="sbn-form-label">
											Location <span className="sbn-required">*</span>
										</label>
										<input
											type="text"
											list="sbn-location-options"
											value={mergeSceneForm.location}
											onChange={(e) => setMergeSceneForm({ ...mergeSceneForm, location: e.target.value })}
											placeholder="Select or type a location..."
											className="sbn-form-input"
										/>
									</div>
									<div className="sbn-form-group">
										<label className="sbn-form-label">Set</label>
										<select
											value={mergeSceneForm.set}
											onChange={(e) => setMergeSceneForm({ ...mergeSceneForm, set: e.target.value })}
											className="sbn-form-select"
										>
											<option value="">Select Set...</option>
											{locationList.map((loc) => (
												<option key={loc.location_id || loc.location} value={loc.location}>
													{loc.location}
												</option>
											))}
										</select>
									</div>
								</div>

								<div className="sbn-form-row">
									<div className="sbn-form-group">
										<label className="sbn-form-label">
											Time <span className="sbn-required">*</span>
										</label>
										<select
											value={mergeSceneForm.time}
											onChange={(e) => setMergeSceneForm({ ...mergeSceneForm, time: e.target.value })}
											className="sbn-form-select"
										>
											<option value="DAY">DAY</option>
											<option value="NIGHT">NIGHT</option>
											<option value="DAWN">DAWN</option>
											<option value="DUSK">DUSK</option>
											<option value="MORNING">MORNING</option>
											<option value="AFTERNOON">AFTERNOON</option>
											<option value="EVENING">EVENING</option>
											<option value="CONTINUOUS">CONTINUOUS</option>
											<option value="LATER">LATER</option>
											<option value="MOMENTS LATER">MOMENTS LATER</option>
										</select>
									</div>
									<div className="sbn-form-group">
										<label className="sbn-form-label">
											Page Eighths <span className="sbn-required">*</span>
										</label>
										<MixedFractionPageEighthsInput
											value={mergeSceneForm.page_eighths}
											onChange={(nextValue) =>
												setMergeSceneForm({ ...mergeSceneForm, page_eighths: nextValue })
											}
											compact
											showHint={false}
										/>
									</div>
								</div>

								<div className="sbn-form-group sbn-form-group-full">
									<label className="sbn-form-label">
										Synopsis <span className="sbn-required">*</span>
									</label>
									<textarea
										value={mergeSceneForm.synopsis}
										onChange={(e) => setMergeSceneForm({ ...mergeSceneForm, synopsis: e.target.value })}
										placeholder="Brief description of the scene..."
										className="sbn-form-textarea"
										rows={3}
									/>
								</div>

								<div className="sbn-form-divider">
									<span>Additional Fields (Optional)</span>
								</div>

								<div className="sbn-form-group sbn-form-group-full">
									<label className="sbn-form-label">Characters</label>
									<CharacterTagInput
										selectedIds={mergeSceneForm.selectedCharacterIds || []}
										allCharacters={allCharacters}
										onChange={(ids) => setMergeSceneForm({ ...mergeSceneForm, selectedCharacterIds: ids })}
									/>
								</div>

								<div className="sbn-form-row">
									<div className="sbn-form-group">
										<label className="sbn-form-label">Action Props</label>
										<input
											type="text"
											value={mergeSceneForm.action_props}
											onChange={(e) => setMergeSceneForm({ ...mergeSceneForm, action_props: e.target.value })}
											placeholder="e.g., Gun, Phone..."
											className="sbn-form-input"
										/>
									</div>
									<div className="sbn-form-group">
										<label className="sbn-form-label">Other Props</label>
										<input
											type="text"
											value={mergeSceneForm.other_props}
											onChange={(e) => setMergeSceneForm({ ...mergeSceneForm, other_props: e.target.value })}
											placeholder="e.g., Book, Lamp..."
											className="sbn-form-input"
										/>
									</div>
								</div>

								<div className="sbn-form-row">
									<div className="sbn-form-group">
										<label className="sbn-form-label">Picture Vehicles</label>
										<input
											type="text"
											value={mergeSceneForm.picture_vehicles}
											onChange={(e) => setMergeSceneForm({ ...mergeSceneForm, picture_vehicles: e.target.value })}
											placeholder="e.g., Police Car, Taxi..."
											className="sbn-form-input"
										/>
									</div>
									<div className="sbn-form-group">
										<label className="sbn-form-label">Animals</label>
										<input
											type="text"
											value={mergeSceneForm.animals}
											onChange={(e) => setMergeSceneForm({ ...mergeSceneForm, animals: e.target.value })}
											placeholder="e.g., Dog, Horse..."
											className="sbn-form-input"
										/>
									</div>
								</div>

								<div className="sbn-form-row">
									<div className="sbn-form-group">
										<label className="sbn-form-label">Extras</label>
										<input
											type="text"
											value={mergeSceneForm.extras}
											onChange={(e) => setMergeSceneForm({ ...mergeSceneForm, extras: e.target.value })}
											placeholder="e.g., Crowd, Waiters..."
											className="sbn-form-input"
										/>
									</div>
									<div className="sbn-form-group">
										<label className="sbn-form-label">Wardrobe</label>
										<input
											type="text"
											value={mergeSceneForm.wardrobe}
											onChange={(e) => setMergeSceneForm({ ...mergeSceneForm, wardrobe: e.target.value })}
											placeholder="e.g., Wedding Dress, Suit..."
											className="sbn-form-input"
										/>
									</div>
								</div>

								<div className="sbn-form-group sbn-form-group-full">
									<label className="sbn-form-label">Set Dressing</label>
									<input
										type="text"
										value={mergeSceneForm.set_dressing}
										onChange={(e) => setMergeSceneForm({ ...mergeSceneForm, set_dressing: e.target.value })}
										placeholder="e.g., Christmas Decorations, Office Furniture..."
										className="sbn-form-input"
									/>
								</div>

								{/* Custom Fields */}
								{customFields.length > 0 &&
									customFields.map((fieldKey) => (
										<div key={fieldKey} className="sbn-form-group sbn-form-group-full">
											<label className="sbn-form-label">{snakeCaseToTitleCase(fieldKey)}</label>
											<input
												type="text"
												value={mergeSceneForm[fieldKey] || ""}
												onChange={(e) => setMergeSceneForm({ ...mergeSceneForm, [fieldKey]: e.target.value })}
												placeholder={`e.g., ${snakeCaseToTitleCase(fieldKey)} items...`}
												className="sbn-form-input"
											/>
										</div>
									))}
							</div>
						</div>
						<div className="sbn-merge-scene-modal-footer">
							<button
								className="sbn-element-cancel-btn"
								onClick={() => {
									setShowMergeSceneModal(false);
									setSelectedScenesToMerge([]);
								}}
								disabled={isMergingScene}
							>
								Cancel
							</button>
							<button className="sbn-merge-scene-btn" onClick={handleMergeScene} disabled={isMergingScene}>
								{isMergingScene ? "Merging..." : "Merge Scenes"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Add Scene Modal */}
			{showAddSceneModal && (
				<div className="sbn-overlay" onClick={() => setShowAddSceneModal(false)}>
					<div className="sbn-add-scene-modal" onClick={(e) => e.stopPropagation()}>
						<div className="sbn-add-scene-modal-header">
							<h3>Add a Scene</h3>
							<button className="sbn-modal-close-btn" onClick={() => setShowAddSceneModal(false)}>
								×
							</button>
						</div>
						<div className="sbn-add-scene-modal-body">
							<div className="sbn-add-scene-form">
								{isEpisodicProject && (
									<div className="sbn-form-group sbn-form-group-full">
										<label className="sbn-form-label">
											Episode Number <span className="sbn-required">*</span>
										</label>
										{isEpisodeLockedForPosition ? (
											<div className="sbn-form-value">
												{newSceneForm.episode_number
													? `Ep${newSceneForm.episode_number}`
													: "Episode not set"}
											</div>
										) : (
											<select
												value={newSceneForm.episode_number || ""}
												onChange={(e) => setNewSceneForm({ ...newSceneForm, episode_number: e.target.value })}
												className="sbn-form-select"
											>
												<option value="">Select Episode...</option>
												{(addSceneEpisodeOptionsForPosition.length > 0
													? addSceneEpisodeOptionsForPosition
													: addSceneEpisodeOptions
												).map((opt) => (
													<option key={opt.key} value={opt.key}>{opt.label}</option>
												))}
											</select>
										)}
									</div>
								)}
								<div className="sbn-form-row">
									<div className="sbn-form-group">
										<label className="sbn-form-label">
											Scene Number <span className="sbn-required">*</span>
										</label>
										<input
											type="text"
											value={newSceneForm.scene_number}
											onChange={(e) => setNewSceneForm({ ...newSceneForm, scene_number: e.target.value })}
											placeholder="e.g., 1, 2A, 3..."
											className="sbn-form-input"
											autoFocus
										/>
									</div>
									<div className="sbn-form-group">
										<label className="sbn-form-label">
											Int./Ext. <span className="sbn-required">*</span>
										</label>
										<select
											value={newSceneForm.int_ext}
											onChange={(e) => setNewSceneForm({ ...newSceneForm, int_ext: e.target.value })}
											className="sbn-form-select"
										>
											<option value="INT.">INT.</option>
											<option value="EXT.">EXT.</option>
											<option value="INT./EXT.">INT./EXT.</option>
										</select>
									</div>
								</div>

								<div className="sbn-form-row">
									<div className="sbn-form-group">
										<label className="sbn-form-label">
											Location <span className="sbn-required">*</span>
										</label>
										<input
											type="text"
											list="sbn-location-options"
											value={newSceneForm.location}
											onChange={(e) => setNewSceneForm({ ...newSceneForm, location: e.target.value })}
											placeholder="Select or type a location..."
											className="sbn-form-input"
										/>
									</div>
									<div className="sbn-form-group">
										<label className="sbn-form-label">
											Set <span className="sbn-required">*</span>
										</label>
										<select
											value={newSceneForm.set}
											onChange={(e) => setNewSceneForm({ ...newSceneForm, set: e.target.value })}
											className="sbn-form-select"
										>
											<option value="">Select Set...</option>
											{locationList.map((loc) => (
												<option key={loc.location_id || loc.location} value={loc.location}>
													{loc.location}
												</option>
											))}
										</select>
									</div>
								</div>

								<div className="sbn-form-row">
									<div className="sbn-form-group">
										<label className="sbn-form-label">
											Time <span className="sbn-required">*</span>
										</label>
										<select
											value={newSceneForm.time}
											onChange={(e) => setNewSceneForm({ ...newSceneForm, time: e.target.value })}
											className="sbn-form-select"
										>
											<option value="DAY">DAY</option>
											<option value="NIGHT">NIGHT</option>
											<option value="DAWN">DAWN</option>
											<option value="DUSK">DUSK</option>
											<option value="MORNING">MORNING</option>
											<option value="AFTERNOON">AFTERNOON</option>
											<option value="EVENING">EVENING</option>
											<option value="CONTINUOUS">CONTINUOUS</option>
											<option value="LATER">LATER</option>
											<option value="MOMENTS LATER">MOMENTS LATER</option>
										</select>
									</div>
									<div className="sbn-form-group">
										<label className="sbn-form-label">
											Page Eighths <span className="sbn-required">*</span>
										</label>
										<MixedFractionPageEighthsInput
											value={newSceneForm.page_eighths}
											onChange={(nextValue) => setNewSceneForm({ ...newSceneForm, page_eighths: nextValue })}
											compact
											showHint={false}
										/>
									</div>
								</div>

								<div className="sbn-form-group sbn-form-group-full">
									<label className="sbn-form-label">
										Synopsis <span className="sbn-required">*</span>
									</label>
									<textarea
										value={newSceneForm.synopsis}
										onChange={(e) => setNewSceneForm({ ...newSceneForm, synopsis: e.target.value })}
										placeholder="Brief description of the scene..."
										className="sbn-form-textarea"
										rows={3}
									/>
								</div>

								<div className="sbn-form-divider">
									<span>Additional Fields (Optional)</span>
								</div>

								<div className="sbn-form-group sbn-form-group-full">
									<label className="sbn-form-label">Characters</label>
									<CharacterTagInput
										selectedIds={newSceneForm.selectedCharacterIds || []}
										allCharacters={allCharacters}
										onChange={(ids) => setNewSceneForm({ ...newSceneForm, selectedCharacterIds: ids })}
									/>
								</div>

								<div className="sbn-form-row">
									<div className="sbn-form-group">
										<label className="sbn-form-label">Action Props</label>
										<input
											type="text"
											value={newSceneForm.action_props}
											onChange={(e) => setNewSceneForm({ ...newSceneForm, action_props: e.target.value })}
											placeholder="e.g., Gun, Phone..."
											className="sbn-form-input"
										/>
									</div>
									<div className="sbn-form-group">
										<label className="sbn-form-label">Other Props</label>
										<input
											type="text"
											value={newSceneForm.other_props}
											onChange={(e) => setNewSceneForm({ ...newSceneForm, other_props: e.target.value })}
											placeholder="e.g., Book, Lamp..."
											className="sbn-form-input"
										/>
									</div>
								</div>

								<div className="sbn-form-row">
									<div className="sbn-form-group">
										<label className="sbn-form-label">Picture Vehicles</label>
										<input
											type="text"
											value={newSceneForm.picture_vehicles}
											onChange={(e) => setNewSceneForm({ ...newSceneForm, picture_vehicles: e.target.value })}
											placeholder="e.g., Police Car, Taxi..."
											className="sbn-form-input"
										/>
									</div>
									<div className="sbn-form-group">
										<label className="sbn-form-label">Animals</label>
										<input
											type="text"
											value={newSceneForm.animals}
											onChange={(e) => setNewSceneForm({ ...newSceneForm, animals: e.target.value })}
											placeholder="e.g., Dog, Horse..."
											className="sbn-form-input"
										/>
									</div>
								</div>

								<div className="sbn-form-row">
									<div className="sbn-form-group">
										<label className="sbn-form-label">Extras</label>
										<input
											type="text"
											value={newSceneForm.extras}
											onChange={(e) => setNewSceneForm({ ...newSceneForm, extras: e.target.value })}
											placeholder="e.g., Crowd, Waiters..."
											className="sbn-form-input"
										/>
									</div>
									<div className="sbn-form-group">
										<label className="sbn-form-label">Wardrobe</label>
										<input
											type="text"
											value={newSceneForm.wardrobe}
											onChange={(e) => setNewSceneForm({ ...newSceneForm, wardrobe: e.target.value })}
											placeholder="e.g., Wedding Dress, Suit..."
											className="sbn-form-input"
										/>
									</div>
								</div>

								<div className="sbn-form-group sbn-form-group-full">
									<label className="sbn-form-label">Set Dressing</label>
									<input
										type="text"
										value={newSceneForm.set_dressing}
										onChange={(e) => setNewSceneForm({ ...newSceneForm, set_dressing: e.target.value })}
										placeholder="e.g., Christmas Decorations, Office Furniture..."
										className="sbn-form-input"
									/>
								</div>

								{/* Custom Fields */}
								{customFields.length > 0 && (
									<>
										<div className="sbn-form-divider">
											<span>Custom Fields</span>
										</div>
										{customFields.map((fieldKey, index) => (
											<div
												key={fieldKey}
												className={
													index % 2 === 0 && index < customFields.length - 1
														? "sbn-form-row"
														: "sbn-form-group sbn-form-group-full"
												}
											>
												{index % 2 === 0 && index < customFields.length - 1 ? (
													<>
														<div className="sbn-form-group">
															<label className="sbn-form-label">{snakeCaseToTitleCase(fieldKey)}</label>
															<input
																type="text"
																value={newSceneForm[fieldKey] || ""}
																onChange={(e) =>
																	setNewSceneForm({ ...newSceneForm, [fieldKey]: e.target.value })
																}
																placeholder={`e.g., ${snakeCaseToTitleCase(fieldKey)} items...`}
																className="sbn-form-input"
															/>
														</div>
														{customFields[index + 1] && (
															<div className="sbn-form-group">
																<label className="sbn-form-label">
																	{snakeCaseToTitleCase(customFields[index + 1])}
																</label>
																<input
																	type="text"
																	value={newSceneForm[customFields[index + 1]] || ""}
																	onChange={(e) =>
																		setNewSceneForm({
																			...newSceneForm,
																			[customFields[index + 1]]: e.target.value,
																		})
																	}
																	placeholder={`e.g., ${snakeCaseToTitleCase(
																		customFields[index + 1],
																	)} items...`}
																	className="sbn-form-input"
																/>
															</div>
														)}
													</>
												) : index % 2 !== 0 ? null : (
													<>
														<label className="sbn-form-label">{snakeCaseToTitleCase(fieldKey)}</label>
														<input
															type="text"
															value={newSceneForm[fieldKey] || ""}
															onChange={(e) => setNewSceneForm({ ...newSceneForm, [fieldKey]: e.target.value })}
															placeholder={`e.g., ${snakeCaseToTitleCase(fieldKey)} items...`}
															className="sbn-form-input"
														/>
													</>
												)}
											</div>
										))}
									</>
								)}

								<div className="sbn-form-position-info">
									<span className="sbn-position-label">Insert Position:</span>
									<span className="sbn-position-value">
										{addScenePosition === 0
											? "Before all scenes"
											: `After Scene ${sceneBreakdowns[addScenePosition - 1]?.scene_number || addScenePosition}`}
									</span>
								</div>
							</div>
						</div>
						<div className="sbn-add-scene-modal-footer">
							<button className="sbn-element-cancel-btn" onClick={() => setShowAddSceneModal(false)} disabled={isAddingScene}>
								Cancel
							</button>
							<button className="sbn-add-scene-btn" onClick={handleAddScene} disabled={isAddingScene}>
								{isAddingScene ? "Adding..." : "Add Scene"}
							</button>
						</div>
					</div>
				</div>
			)}

			<div className="sbn-main-content">
				{viewMode === "scene" ? (
					<div className="sbn-edit-layout">
						<div className="sbn-left-pane">{renderSceneEditor()}</div>
						<div className="sbn-right-pane">
							<div className="sbn-pdf-header">
								<h3 className="sbn-pdf-title">Script Preview</h3>
								{pdfUrl && (
									<div className="sbn-pdf-zoom-toolbar">
										<button
											type="button"
											className="sbn-pdf-zoom-btn"
											onClick={handlePdfZoomOut}
											title="Zoom out"
											aria-label="Zoom out"
										>
											−
										</button>
										<span className="sbn-pdf-zoom-value">{pdfZoom}%</span>
										<button
											type="button"
											className="sbn-pdf-zoom-btn"
											onClick={handlePdfZoomIn}
											title="Zoom in"
											aria-label="Zoom in"
										>
											+
										</button>
									</div>
								)}
							</div>

							{pdfUrl ? (
								<div className="sbn-pdf-viewer-wrap" style={{ ["--pdf-zoom"]: pdfZoom / 100 }}>
									<iframe src={`${pdfUrl}#toolbar=0&navpanes=0`} className="sbn-pdf-viewer" title="Script PDF Viewer" />
								</div>
							) : (
								<div className="sbn-pdf-placeholder">
									<p>Loading script PDF...</p>
								</div>
							)}
						</div>
					</div>
				) : (
					<div className="sbn-content-area">
						{/* Top Tabs Row */}
						<div className="sbn-top-bar">
							<div className="sbn-tabs-group">
								<button
									className={`sbn-tab-btn ${activeTab === "master" ? "sbn-tab-active" : ""}`}
									onClick={() => setActiveTab("master")}
								>
									Master Breakdown
								</button>
								<button
									className={`sbn-tab-btn ${activeTab === "generated" ? "sbn-tab-active" : ""}`}
									onClick={() => setActiveTab("generated")}
								>
									Generated Breakdown
								</button>
							</div>
							{/* Script selector dropdown for Generated tab */}
							{activeTab === "generated" && (
								<div className="sbn-script-selector">
									{generatedScripts.length > 0 ? (
										hasEpisodeGrouping ? (
											<div style={{ display: "flex", gap: "8px" }}>
												<select
													className="sbn-script-dropdown"
													value={selectedGeneratedEpisode}
													onChange={(e) => setSelectedGeneratedEpisode(e.target.value)}
												>
													{generatedEpisodeOptions.map((episode) => (
														<option key={episode.key} value={episode.key}>
															{episode.label}
														</option>
													))}
												</select>
												<select
													className="sbn-script-dropdown"
													value={selectedGeneratedScript?.id || ""}
													onChange={(e) => {
														const scriptId = parseInt(e.target.value, 10);
														const script = generatedScriptsForSelectedEpisode.find((s) => s.id === scriptId);
														if (script) setSelectedGeneratedScript(script);
													}}
												>
													{generatedScriptsForSelectedEpisode.map((script) => (
														<option key={script.id} value={script.id}>
															{getGeneratedDraftLabel(script)}
														</option>
													))}
												</select>
											</div>
										) : (
											<select
												className="sbn-script-dropdown"
												value={selectedGeneratedScript?.id || ""}
												onChange={(e) => {
													const scriptId = parseInt(e.target.value, 10);
													const script = generatedScripts.find((s) => s.id === scriptId);
													if (script) setSelectedGeneratedScript(script);
												}}
											>
												{generatedScripts.map((script) => (
													<option key={script.id} value={script.id}>
														{getGeneratedScriptLabel(script)}
													</option>
												))}
											</select>
										)
									) : (
										<span className="sbn-no-scripts-msg">No other scripts available</span>
									)}
								</div>
							)}
							{latestScript && (
								<div className="sbn-latest-draft" title="Latest draft">
									<span className="sbn-latest-draft-label">Latest draft</span>
									<span className="sbn-latest-draft-value">{latestDraftLabel}</span>
								</div>
							)}
						</div>

						{/* Search and Filter Row */}
						<div className="sbn-toolbar-row">
							<div className="sbn-toolbar-left">
								<div className="sbn-search-box">
									<PiMagnifyingGlass className="sbn-search-icon" />
									<input
										type="text"
										placeholder={`Search ${selectedSearchField === "ALL_FIELDS" ? "Scenes" : selectedSearchField}...`}
										value={filterText}
										onChange={(e) => setFilterText(e.target.value)}
										className="sbn-search-input"
									/>
								</div>
								<div className="sbn-filter-wrap" ref={searchFilterRef}>
									<button
										className={`sbn-filter-btn ${showSearchFilterMenu ? "sbn-filter-btn-active" : ""}`}
										onClick={() => setShowSearchFilterMenu((prev) => !prev)}
										type="button"
									>
										<PiSlidersHorizontal className="sbn-filter-icon" />
										<span>{selectedSearchField === "ALL_FIELDS" ? "Filter" : selectedSearchField}</span>
									</button>
									{showSearchFilterMenu && (
										<div className="sbn-filter-menu">
											{searchFieldOptions.map((option) => (
												<button
													key={option.key}
													type="button"
													className={`sbn-filter-option ${selectedSearchField === option.key ? "sbn-filter-option-active" : ""}`}
													onClick={() => {
														setSelectedSearchField(option.key);
														setShowSearchFilterMenu(false);
													}}
												>
													{option.label}
												</button>
											))}
										</div>
									)}
								</div>
							</div>
							<div className="sbn-toolbar-right">
								<button className="sbn-sync-btn" onClick={exportToExcel}>
									<span>
										<FaFileExcel />
									</span>
									<span>Export to Excel</span>
								</button>
								<button className="sbn-sync-btn">
									<span className="sbn-sync-symbol">⟳</span>
									<span>Sync Latest Scripts</span>
								</button>
							</div>
						</div>

						{/* Action Buttons Row - Only show for Master Breakdown */}
						{!isViewOnly && (
							<div className="sbn-actions-row">
								<button
									className={`sbn-action-btn  ${showPositionSelector ? "sbn-action-btn-active" : ""}`}
									onClick={handleAddSceneClick}
								>
									{showPositionSelector ? "Cancel" : "Add Scene"}
								</button>
								<button
									className={`sbn-action-btn ${removeSceneMode ? "sbn-action-btn-active sbn-action-btn-remove" : ""}`}
									onClick={handleRemoveSceneClick}
								>
									{removeSceneMode
										? selectedScenesToRemove.length > 0
											? `Confirm Remove (${selectedScenesToRemove.length})`
											: "Cancel Remove"
										: "Remove Scene"}
								</button>
								<button
									className="sbn-action-btn sbn-action-btn-add"
									onClick={() => {
										setNewElementName("");
										setShowAddElementModal(true);
									}}
								>
									Add Element
								</button>
								<button
									className={`sbn-action-btn ${removeElementMode ? "sbn-action-btn-active" : ""} ${removeElementMode && selectedElementToRemove ? "sbn-action-btn-remove" : ""
										}`}
									onClick={handleRemoveElementClick}
								>
									{removeElementMode && selectedElementToRemove ? "Confirm Remove" : removeElementMode ? "Cancel" : "Remove Element"}
								</button>
								{removeElementMode && (
									<button
										className="sbn-action-btn sbn-action-btn-cancel"
										onClick={() => {
											setRemoveElementMode(false);
											setSelectedElementToRemove(null);
										}}
									>
										Cancel Selection
									</button>
								)}
								<button
									className={`sbn-action-btn ${splitSceneMode ? "sbn-action-btn-active sbn-action-btn-split" : ""}`}
									onClick={handleSplitSceneClick}
								>
									{splitSceneMode ? "Cancel Split" : "Split Scene"}
								</button>
								<button
									className={`sbn-action-btn ${mergeSceneMode ? "sbn-action-btn-active sbn-action-btn-merge" : ""}`}
									onClick={handleMergeSceneClick}
								>
									{mergeSceneMode
										? selectedScenesToMerge.length > 0
											? `Cancel (${selectedScenesToMerge.length}/2 selected)`
											: "Cancel Merge"
										: "Merge Scene"}
								</button>
							</div>
						)}

						{/* Table Content */}
						{activeTab === "generated" && generatedScripts.length === 0 ? (
							<div className="sbn-empty-container">
								<div className="sbn-message">No other scripts available</div>
								<div className="sbn-action-hint">
									<p>Upload additional scripts to see their generated breakdowns here.</p>
								</div>
							</div>
						) : isLoading ? (
							<div className="sbn-loading-container">
								<div className="sbn-spinner" />
								<div className="sbn-message">Loading breakdown...</div>
							</div>
						) : error ? (
							<div className="sbn-error-container">
								<div className="sbn-error-message">⚠️ {error}</div>
								{!hasBreakdown && allScripts.length > 0 && (
									<div className="sbn-action-hint">
										<p>To generate a breakdown:</p>
										<ol>
											<li>Go to Scripts page</li>
											<li>Upload a script if you haven't already</li>
											<li>Click "Generate Breakdown" on your script</li>
											<li>Return here to view the breakdown</li>
										</ol>
									</div>
								)}
							</div>
						) : scriptBreakdown.length === 0 ? (
							<div className="sbn-empty-container">
								<div className="sbn-message">No breakdown data available</div>
							</div>
						) : (
							renderTableContent()
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default ScriptBreakdownNew;
