// src/pages/ScriptBreakdownNew.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { getApiUrl } from "../utils/api";
import "../css/ScriptBreakdownNew.css";
import { PiMagnifyingGlass, PiSlidersHorizontal } from "react-icons/pi";

/*
  ScriptBreakdown page - final variant:
  - Table view: props columns (Action Props, Other Props, Picture Vehicles, Animals, Extras, Wardrobe, Set Dressing)
    render as plain text in the table (no inline tag editors)
  - Scene editor view (opened when you click a row or press "Edit Breakdown") contains TagInput
    for those props fields — add/remove tags only inside the edit view (exactly like prior behavior)
  - Everything else (fetch/save, shadows, pdf preview) preserved
*/

/* ---------- parse TSV ---------- */
const parseTSV = (tsvText) => {
	try {
		const lines = tsvText.split("\n");
		if (lines.length < 2) return [];
		const headers = lines[0].split("\t").map((h) => h.trim());
		return lines
			.slice(1)
			.filter((l) => l.trim() !== "")
			.map((line, lineIdx) => {
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

/* ---------- Main component ---------- */
const ScriptBreakdownNew = () => {
	const { user, id } = useParams();
	const [scriptBreakdown, setScriptBreakdown] = useState([]);
	const [allScripts, setAllScripts] = useState([]);
	const [selectedScript, setSelectedScript] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	// 'table' = normal table view; 'scene' = scene editor & pdf preview
	const [viewMode, setViewMode] = useState("table");
	const [editingSceneIndex, setEditingSceneIndex] = useState(0);
	const [editingScene, setEditingScene] = useState(null);
	const [pdfUrl, setPdfUrl] = useState(null);
	const [hasBreakdown, setHasBreakdown] = useState(false);
	const [filterText, setFilterText] = useState("");
	const [parsing, setParsing] = useState([]);
	// All characters available in the script (from API)
	const [allCharacters, setAllCharacters] = useState([]);
	// Scene breakdowns as JSON objects
	const [sceneBreakdowns, setSceneBreakdowns] = useState([]);
	// scrolling shadows
	const [editingSceneParsing, setEditingSceneParsing] = useState({});
	// Character IDs for the currently editing scene
	const [editingCharacterIds, setEditingCharacterIds] = useState([]);
	const tableWrapRef = useRef(null);
	const [showLeftShadow, setShowLeftShadow] = useState(false);
	const [showRightShadow, setShowRightShadow] = useState(false);
	const [editParsing, setEditParsing] = useState(false);
	const [activeTab, setActiveTab] = useState("master");

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

	/* ---------- fetchers ---------- */
	const fetchBreakdown = async (scriptId) => {
		try {
			setIsLoading(true);
			setError(null);
			const res = await fetch(getApiUrl(`/api/fetch-breakdown?script_id=${scriptId}`), { method: "GET" });
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
			// Store characters list
			if (data.characters) {
				setAllCharacters(data.characters);
			}
			// Store scene breakdowns as JSON
			if (data.scene_breakdowns) {
				setSceneBreakdowns(data.scene_breakdowns);
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

	const fetchAllScripts = async () => {
		try {
			const res = await fetch(getApiUrl(`/api/${id}/script-list`), { method: "GET" });
			if (res.ok) {
				const scripts = await res.json();
				const sorted = (scripts || []).sort((a, b) => (b.version || 0) - (a.version || 0));
				setAllScripts(sorted);
				if (sorted.length > 0) {
					handleScriptSelect(sorted[0]); // This will set the selected script and fetch its breakdown
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
			const response = await fetch(getApiUrl(`/api/${id}/script-file/${scriptName}`), { method: "GET" });
			if (response.ok) {
				const blob = await response.blob();
				const url = URL.createObjectURL(blob);
				setPdfUrl(url + "#view=FitH");
			}
		} catch (e) {
			console.error("Error loading PDF", e);
		}
	};

	const handleScriptSelect = (script) => {
		setSelectedScript(script);
		if (script?.id) {
			fetchBreakdown(script.id);
		}
	};

	useEffect(() => {
		fetchAllScripts();
		// Initial breakdown will be fetched after scripts are loaded and first script is selected
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id]);

	// Helper function to convert JSON scene breakdown to display format
	const sceneBreakdownToDisplayFormat = (sceneData) => {
		if (!sceneData) return null;
		// Convert array fields to comma-separated strings
		const arrayToString = (arr) => {
			if (!arr || !Array.isArray(arr) || arr.length === 0) return "N/A";
			return arr.join(", ");
		};
		return {
			"Scene Number": sceneData.scene_number || "",
			"Int./Ext.": sceneData.int_ext || "",
			Location: sceneData.location || "",
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
	};

	/* ---------- open the scene editor (either from button or row click) ---------- */
	const openSceneEditorAt = (index) => {
		if (!sceneBreakdowns || sceneBreakdowns.length === 0) return;
		const idx = Math.max(0, Math.min(index, sceneBreakdowns.length - 1));
		setEditingSceneIndex(idx);
		// Use JSON scene breakdown data (which is correct) instead of TSV parsed data
		const sceneData = sceneBreakdowns[idx];
		const displayData = sceneBreakdownToDisplayFormat(sceneData);
		setEditingScene(displayData);
		setEditingSceneParsing(parsing[idx]);
		// Set character IDs from scene breakdowns
		if (sceneData && sceneData.characters_ids) {
			setEditingCharacterIds([...sceneData.characters_ids]);
		} else {
			setEditingCharacterIds([]);
		}
		console.log(parsing[idx]);
		setViewMode("scene");

		// scroll to top so editor is visible
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const handleStartSceneEditor = () => openSceneEditorAt(0);

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

				updatedSceneBreakdowns[editingSceneIndex] = {
					...updatedSceneBreakdowns[editingSceneIndex],
					// Map all fields from editingScene to scene breakdown format
					scene_number: editingScene["Scene Number"] || updatedSceneBreakdowns[editingSceneIndex].scene_number,
					int_ext: editingScene["Int./Ext."] || updatedSceneBreakdowns[editingSceneIndex].int_ext,
					location: editingScene["Location"] || updatedSceneBreakdowns[editingSceneIndex].location,
					time: editingScene["Time"] || updatedSceneBreakdowns[editingSceneIndex].time,
					page_eighths: editingScene["Page Eighths"] || updatedSceneBreakdowns[editingSceneIndex].page_eighths,
					synopsis: editingScene["Synopsis"] || updatedSceneBreakdowns[editingSceneIndex].synopsis,
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
			}

			console.log("Saving scene breakdowns", updatedSceneBreakdowns[editingSceneIndex]);

			const response = await fetch(getApiUrl(`/api/${id}/update-breakdown`), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					scene_breakdowns: updatedSceneBreakdowns,
					parsing: parsing,
					characters: allCharacters,
				}),
			});

			if (!response.ok) throw new Error("Failed to save changes");
			setScriptBreakdown(updatedBreakdown);
			setSceneBreakdowns(updatedSceneBreakdowns);
			alert("Changes saved successfully!");
		} catch (e) {
			console.error(e);
			alert("Failed to save changes. Try again.");
		}
	}, [parsing, editingScene, scriptBreakdown, sceneBreakdowns, editingCharacterIds, allCharacters, editingSceneIndex, id]);

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
		if (!scriptBreakdown || scriptBreakdown.length === 0) return [];
		return Object.keys(scriptBreakdown[0]).filter((k) => {
			if (!k) return false;
			const lower = k.trim().toLowerCase();
			if (propsHeaderNames.has(lower)) return true;
			if (/prop/i.test(k)) return true;
			return false;
		});
	}, [scriptBreakdown, propsHeaderNames]);

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
						return (
							<div key={key} className="sbn-field-group">
								<label className="sbn-field-label">{key}:</label>
								{isCharacters ? (
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

					<div className="sbn-scene-actions">
						<button className="sbn-scene-save-btn" onClick={handleSaveSceneChanges}>
							Save Changes
						</button>
						<button
							className="sbn-cancel-btn"
							onClick={() => {
								setEditingScene(null);
								setViewMode("table");
							}}
						>
							Cancel
						</button>
					</div>
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

		// Define the columns to show (up to Other Props)
		const visibleColumns = ["Scene Number", "Int./Ext.", "Location", "Time", "Page Eighths", "Synopsis", "Characters", "Action Props", "Other Props"];

		// Filter headers to only show visible columns that exist in data
		const headers = visibleColumns
			.filter((col) => allHeaders.some((h) => h.toLowerCase() === col.toLowerCase()))
			.map((col) => allHeaders.find((h) => h.toLowerCase() === col.toLowerCase()) || col);

		const filtered = scriptBreakdown.filter((row) => {
			if (!filterText) return true;
			const q = filterText.toLowerCase();
			return Object.values(row).some((v) =>
				String(v || "")
					.toLowerCase()
					.includes(q)
			);
		});

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
								{headers.map((h, i) => (
									<th key={i} className="sbn-header-cell">
										{h}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="sbn-tbody">
							{filtered.map((row, rIdx) => (
								<tr
									key={rIdx}
									className="sbn-data-row"
									onClick={() => {
										// Find the matching scene in sceneBreakdowns by scene number
										const sceneNum = row["Scene Number"];
										const jsonIdx = sceneBreakdowns.findIndex((s) => s.scene_number === sceneNum);
										openSceneEditorAt(jsonIdx === -1 ? rIdx : jsonIdx);
									}}
								>
									{headers.map((header, cIdx) => {
										const cellValue = row[header] ?? "";
										const isSceneNumber = header.toLowerCase().includes("scene") && header.toLowerCase().includes("number");
										const isPropColumn = propsKeys.includes(header);

										return (
											<td key={cIdx} className="sbn-data-cell">
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
			{editParsing && EditParsingModal()}

			<div className="sbn-main-content">
				{viewMode === "scene" ? (
					<div className="sbn-edit-layout">
						<div className="sbn-left-pane">{renderSceneEditor()}</div>
						<div className="sbn-right-pane">
							<div className="sbn-pdf-header">
								<h3 className="sbn-pdf-title">Script Preview</h3>
								<button
									className="sbn-edit-parsing-btn"
									onClick={() => {
										setEditParsing(true);
									}}
								>
									edit
								</button>
							</div>

							{
								<div className="sbn-screenplay-container">
									{/* Scene Heading (title of the scene) */}
									<div className="sbn-scene-heading">{editingSceneParsing.heading?.toUpperCase() || "UNTITLED SCENE"}</div>

									{editingSceneParsing.content ? (
										renderScreenplay(editingSceneParsing.content)
									) : (
										<p className="sbn-action-text">No content available.</p>
									)}
								</div>
							}
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
						</div>

						{/* Search and Filter Row */}
						<div className="sbn-toolbar-row">
							<div className="sbn-toolbar-left">
								<div className="sbn-search-box">
									<PiMagnifyingGlass className="sbn-search-icon" />
									<input
										type="text"
										placeholder="Search Scenes (Scene No., Location, Synopsis...)"
										value={filterText}
										onChange={(e) => setFilterText(e.target.value)}
										className="sbn-search-input"
									/>
								</div>
								<button className="sbn-filter-btn">
									<PiSlidersHorizontal className="sbn-filter-icon" />
									<span>Filter</span>
								</button>
							</div>
							<div className="sbn-toolbar-right">
								<button className="sbn-sync-btn">
									<span className="sbn-sync-symbol">⟳</span>
									<span>Sync Latest Scripts</span>
								</button>
							</div>
						</div>

						{/* Action Buttons Row */}
						<div className="sbn-actions-row">
							<button className="sbn-action-btn">Add Scene</button>
							<button className="sbn-action-btn">Remove Scene</button>
							<button className="sbn-action-btn">Add Element</button>
							<button className="sbn-action-btn">Remove Element</button>
							<button className="sbn-action-btn">Split Scene</button>
							<button className="sbn-action-btn">Merge Scene</button>
						</div>

						{/* Table Content */}
						{isLoading ? (
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
