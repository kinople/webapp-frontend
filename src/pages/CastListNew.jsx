import React, { useState, useEffect, useCallback } from "react";
import ProjectHeader from "../components/ProjectHeader";
import { useParams } from "react-router-dom";
import { getApiUrl } from "../utils/api";
import "../css/CastListNew.css";

/*
  CastList (updated layout)
  - Left grey panel with index badge, character name
  - Shows: No. of scenes, INT/EXT counts, Location Group IDs (badges)
  - "View Options" and "View Scenes" buttons (prominent) in left panel
  - Right panel shows options table (S.No, Location Name, Media, Address, GMap Pin, Dates, Lock Location)
  - Scenes table shows columns: Scene No, Int./Ext., Location, Time, Synopsis, Characters
  - Add Option modal unchanged
*/

const AddActorOptionModal = ({ onClose, onSubmit, optionForm, setOptionForm }) => {
	const handleSubmit = async (e) => {
		e.preventDefault();
		await onSubmit(optionForm);
	};

	return (
		<div className="modalOverlay">
			<div className="modalContent">
				<h3 className="modalTitle">Add Actor Option</h3>
				<form onSubmit={handleSubmit} className="form">
					<div className="formGroup">
						<label className="label">Artist Name:</label>
						<input
							type="text"
							value={optionForm.actorName}
							onChange={(e) => setOptionForm((p) => ({ ...p, actorName: e.target.value }))}
							className="input"
							required
						/>
					</div>

					<div className="formGroup">
						<label className="label">Media (links):</label>
						<input
							type="text"
							value={optionForm.media}
							onChange={(e) => setOptionForm((p) => ({ ...p, media: e.target.value }))}
							className="input"
							placeholder="Comma separated links (optional)"
						/>
					</div>

					<div className="formGroup">
						<label className="label">Contact Details:</label>
						<textarea
							value={optionForm.contact}
							onChange={(e) => setOptionForm((p) => ({ ...p, contact: e.target.value }))}
							className="input"
							placeholder="Phone / email / other contact info"
						/>
					</div>

					<div className="formGroup">
						<label className="label">Dates / Availability:</label>
						<input
							type="text"
							value={optionForm.dates}
							onChange={(e) => setOptionForm((p) => ({ ...p, dates: e.target.value }))}
							className="input"
							placeholder="e.g. 2025-08-01 to 2025-08-10"
						/>
					</div>

					<div className="formGroup">
						<label className="label">Details:</label>
						<textarea
							value={optionForm.details}
							onChange={(e) => setOptionForm((p) => ({ ...p, details: e.target.value }))}
							className="input"
							placeholder="Short description / role notes"
						/>
					</div>

					<div className="formGroup">
						<label className="label">Notes:</label>
						<textarea value={optionForm.notes} onChange={(e) => setOptionForm((p) => ({ ...p, notes: e.target.value }))} className="input" />
					</div>

					<div className="formButtons">
						<button type="submit" className="submitButton">
							Add Option
						</button>
						<button type="button" onClick={onClose} className="cancelButton">
							Cancel
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

function findFirstField(obj = {}, candidates = []) {
	for (const k of candidates) {
		if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== "") return obj[k];
	}
	return undefined;
}

function renderSceneSummary(scene) {
	if (!scene) return null;
	if (typeof scene === "string") return <div style={{ whiteSpace: "pre-wrap" }}>{scene}</div>;
	if (typeof scene === "object") {
		const entries = Object.entries(scene).slice(0, 5);
		return (
			<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
				{entries.map(([k, v]) => (
					<div key={k} style={{ display: "flex", gap: 8 }}>
						<strong style={{ minWidth: 110, color: "#334155" }}>{k}:</strong>
						<div style={{ color: "#0f1724", wordBreak: "break-word" }}>{String(v)}</div>
					</div>
				))}
			</div>
		);
	}
	return <div>{String(scene)}</div>;
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
	const [optionForm, setOptionForm] = useState({ actorName: "", media: "", contact: "", dates: "", details: "", notes: "" });
	const [selectedOptions, setSelectedOptions] = useState(new Set());
	const [lockedOptions, setLockedOptions] = useState(new Set());
	const [sceneChars, setSceneChars] = useState({});
	const [scenes, setScenes] = useState([]);
	const [isSelectingMode, setIsSelectingMode] = useState(new Set()); // Track which characters are in selecting mode

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

	const handleScenesClick = (character, scenes) => {
		setSelectedCharacter(character);
		setSelectedCharacterScenes(scenes || []);
		setShowScenesModal(true);
	};

	function analyzeScenes(CharScenes) {
		const result = { total: 0, intCount: 0, extCount: 0, locationGroupIds: new Set() };
		if (!Array.isArray(CharScenes)) return result;

		result.total = CharScenes.length;

		scenes.forEach((scene) => {
			if (scene["Scene Number"] in CharScenes) {
				if (scene["Int./Ext."] === "INT.") {
					result.intCount += 1;
				} else {
					result.extCount += 1;
				}
				result.locationGroupIds.add(scene["Location"]);
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
					dates: form.dates,
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
			setOptionForm({ actorName: "", media: "", contact: "", dates: "", details: "", notes: "" });
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

	const toggleLockOption = useCallback((idx, optId) => {
		const key = `${idx}-${optId}`;
		setLockedOptions((prev) => {
			const next = new Set(prev);
			Array.from(prev).forEach((k) => {
				if (k.startsWith(`${idx}-`)) next.delete(k);
			});
			if (!prev.has(key)) next.add(key);
			return next;
		});
	}, []);

	/* helpers to extract option fields with fallbacks */
	const getOptionField = (opt, keys) => {
		if (!opt) return "-";
		const val = findFirstField(opt, keys);
		if (val === undefined || val === null || String(val).trim() === "") return "-";
		// if it's an array, join it
		if (Array.isArray(val)) return val.join(", ");
		return String(val);
	};

	const getSceneField = (s, keys) => {
		if (!s) return "-";
		if (typeof s === "string") return s;
		const val = findFirstField(s, keys);
		if (val === undefined || val === null || String(val).trim() === "") return "-";
		if (Array.isArray(val)) return val.join(", ");
		return String(val);
	};

	const getData = (s, field) => {
		var data = "";
		scenes.forEach((scene) => {
			if (scene["Scene Number"] === s) {
				data = scene[field];
				return;
			}
		});
		//console.log("FFff=-- ", data);
		return data || "N/A";
	};

	return (
		<div className="page">
			<ProjectHeader />

			<div className="contentArea">
				{isLoading ? (
					<div className="message">Loading cast list…</div>
				) : error ? (
					<div className="errorMessage">{error}</div>
				) : !castData || !(Array.isArray(castData.cast_list) && castData.cast_list.length) ? (
					<div className="message">No cast members found</div>
				) : (
					<>
						<div className="scriptInfo">
							<h2 className="heading">Cast List – {castData.project_name}</h2>
							<p className="subheading">Total Characters: {castData.total_characters ?? castData.cast_list.length}</p>
						</div>

						{castData.cast_list.map((member, idx) => {
							const sceneAnalysis = analyzeScenes(member.scenes || []);
							const lgArray = Array.from(sceneAnalysis.locationGroupIds);

							return (
								<div key={idx} className="card">
									{/* Left grey framed panel */}
									<div className="leftPanel">
										<div className="leftTop">
											<div className="indexBadge">{idx + 1}</div>
											<div className="leftTitle">{member.character}</div>
										</div>
										<div className="leftSection">
											<div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>No. of scenes</div>
											<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
												<div className="countBox">{sceneAnalysis.total}</div>

												<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
													<div className="smallCount">
														<div className="smallLabel">Int.</div>
														<div className="smallNumber">{sceneAnalysis.intCount}</div>
													</div>
													<div className="smallCount">
														<div className="smallLabel">Ext.</div>
														<div className="smallNumber">{sceneAnalysis.extCount}</div>
													</div>
													<div className="smallCount">
														<div className="smallLabel">Int./Ext.</div>
														<div className="smallNumber">
															{Math.max(
																0,
																sceneAnalysis.total - (sceneAnalysis.intCount + sceneAnalysis.extCount)
															)}
														</div>
													</div>
												</div>
											</div>
										</div>
										<div className="leftSection">
											<div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>Location Groups</div>
											<div
												style={{
													display: "flex",
													gap: 8,
													flexWrap: "wrap",
													maxHeight: "120px", // Fixed height
													overflowY: "auto", // Scrollable
													paddingRight: "4px", // Space for scrollbar
												}}
											>
												{lgArray.length ? (
													lgArray.map((g, i) => (
														<div key={i} className="lgBadge">
															{g}
														</div>
													))
												) : (
													<div style={{ color: "#6b7280" }}>—</div>
												)}
											</div>
										</div>
										<div className="viewButtons">
											<button
												className={`viewBtn ${expandedOptions.has(idx) ? "viewBtnActive" : ""}`}
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
												className={`viewBtn ${expandedScenes.has(idx) ? "viewBtnActive" : ""}`}
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

									{/* Right panel */}
									<div className="rightPanel">
										{!expandedScenes.has(idx) ? (
											<>
												{/* Option controls */}
												{expandedOptions.has(idx) && (
													<div className="optionButtons">
														<button
															className="newBtn"
															onClick={() => {
																setSelectedCharacterIndex(idx);
																setShowAddOptionModal(true);
																setOptionForm({
																	actorName: "",
																	media: "",
																	contact: "",
																	dates: "",
																	details: "",
																	notes: "",
																});
															}}
														>
															+ Add Option
														</button>

														<button
															className={`removeBtn ${isSelectingMode.has(idx) ? "selecting" : "notSelecting"}`}
															onClick={() => {
																if (!isSelectingMode.has(idx)) {
																	// Enter selection mode
																	setIsSelectingMode((prev) => new Set(prev).add(idx));
																} else {
																	// In selection mode - remove selected options
																	const selectedForCharacter = Array.from(selectedOptions)
																		.filter((key) => key.startsWith(`${idx}-`))
																		.map((key) => key.split("-")[1]);

																	if (selectedForCharacter.length === 0) {
																		alert("Please select options to remove");
																		return;
																	}

																	if (
																		window.confirm(
																			`Are you sure you want to remove ${selectedForCharacter.length} selected option(s)?`
																		)
																	) {
																		selectedForCharacter.forEach((optId) => {
																			removeActorOption(idx, optId);
																		});
																		// Clear selections and exit selecting mode
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
															{!isSelectingMode.has(idx)
																? "– Remove Option"
																: `Remove Selected (${
																		Array.from(selectedOptions).filter((key) => key.startsWith(`${idx}-`))
																			.length
																  })`}
														</button>

														{isSelectingMode.has(idx) && (
															<button
																className="removeBtn"
																onClick={() => {
																	// Clear selections for this character and exit selecting mode
																	setSelectedOptions((prev) => {
																		const next = new Set();
																		prev.forEach((key) => {
																			if (!key.startsWith(`${idx}-`)) {
																				next.add(key);
																			}
																		});
																		return next;
																	});
																	setIsSelectingMode((prev) => {
																		const next = new Set(prev);
																		next.delete(idx);
																		return next;
																	});
																}}
															>
																Cancel
															</button>
														)}
													</div>
												)}

												{/* Updated Options Table */}
												<table className="table">
													<thead>
														<tr>
															{isSelectingMode.has(idx) && <th className="th">Select</th>}
															<th className="th">S.No</th>
															<th className="th">Actor Name</th>
															<th className="th">Media</th>
															<th className="th">Contact</th>
															<th className="th">Details</th>
															<th className="th">Notes</th>
															<th className="th">Dates</th>
															<th className="th">Lock Location</th>
														</tr>
													</thead>

													<tbody>
														{member.cast_options && Object.keys(member.cast_options).length > 0 ? (
															Object.entries(member.cast_options).map(([optId, opt], i) => {
																const key = `${idx}-${optId}`;
																const locked = lockedOptions.has(key);
																const otherLocked = Array.from(lockedOptions).some(
																	(k) => k.startsWith(`${idx}-`) && k !== key
																);

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

																const notes = getOptionField(opt, [
																	"notes",
																	"gmap_pin",
																	"gmapPin",
																	"gmap_link",
																	"google_map",
																	"google_map_link",
																]);
																const dates = getOptionField(opt, [
																	"dates",
																	"availability",
																	"date_range",
																	"available",
																]);

																return (
																	<tr key={optId} className="tr">
																		{isSelectingMode.has(idx) && (
																			<td className="td">
																				<input
																					type="checkbox"
																					checked={selectedOptions.has(key)}
																					onChange={(e) => {
																						setSelectedOptions((prev) => {
																							const next = new Set(prev);
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
																		<td className="td">{i + 1}</td>
																		<td className="td">{ActorName}</td>
																		<td className="td">{media}</td>
																		<td className="td">{contact}</td>
																		<td className="td">{details}</td>
																		<td className="td">{notes}</td>
																		<td className="td">{dates}</td>
																		<td className="td">
																			<button
																				className={`lockBtn ${locked ? "locked" : ""} ${
																					otherLocked && !locked ? "disabled" : ""
																				}`}
																				onClick={() => toggleLockOption(idx, optId)}
																				disabled={otherLocked && !locked}
																			>
																				{locked ? "🔒 Lock" : "🔓 Lock"}
																			</button>
																		</td>
																	</tr>
																);
															})
														) : (
															<tr>
																<td colSpan={isSelectingMode.has(idx) ? 9 : 8} className="emptyRow">
																	No options added
																</td>
															</tr>
														)}
													</tbody>
												</table>
											</>
										) : (
											// Scenes listing - updated table columns
											<div>
												<table className="table">
													<thead>
														<tr>
															<th className="th">Scene No</th>
															<th className="th">Int./Ext.</th>
															<th className="th">Location</th>
															<th className="th">Time </th>
															<th className="th">Synopsis</th>
															<th className="th">Characters</th>
														</tr>
													</thead>
													<tbody>
														{(member.scenes || []).length ? (
															(member.scenes || []).map((s, i) => {
																const sceneNo = s;
																const intExt = getData(s, "Int./Ext.");
																const location = getData(s, "Location");
																const time = getData(s, "Time");
																const synopsis = getData(s, "Synopsis");
																const characters = sceneChars[s].join(" , ");

																return (
																	<tr key={i} className="tr">
																		<td className="td">{sceneNo === "-" ? i + 1 : sceneNo}</td>
																		<td className="td">{intExt}</td>
																		<td className="td">{location}</td>
																		<td className="td">{time}</td>
																		<td className="td">{synopsis}</td>
																		<td className="td">{characters}</td>
																	</tr>
																);
															})
														) : (
															<tr>
																<td colSpan={6} className="emptyRow">
																	No scenes listed
																</td>
															</tr>
														)}
													</tbody>
												</table>
											</div>
										)}
									</div>
								</div>
							);
						})}
					</>
				)}
			</div>

			{/* Scenes Modal */}
			{showScenesModal && (
				<div className="modalOverlay">
					<div className="modalContent">
						<h3 className="modalTitle">Scenes for {selectedCharacter}</h3>
						<div style={{ maxHeight: "50vh", overflowY: "auto", marginBottom: 12 }}>
							{(selectedCharacterScenes || []).length === 0 ? (
								<div className="emptyRow">No scenes</div>
							) : (
								selectedCharacterScenes.map((s, i) => (
									<div key={i} style={{ marginBottom: 12, paddingBottom: 8, borderBottom: "1px dashed rgba(0,0,0,0.06)" }}>
										{renderSceneSummary(s)}
									</div>
								))
							)}
						</div>
						<div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
							<button className="cancelButton" onClick={() => setShowScenesModal(false)}>
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
		</div>
	);
};

export default CastListNew;
