import React, { useEffect, useState } from "react";

import { useParams, useNavigate } from "react-router-dom";
import "../css/CrewList.css";
import {
	PiFilmSlate,
	PiCamera,
	PiPalette,
	PiSpeakerHigh,
	PiDotsThreeOutline,
	PiNote,
	PiTrash,
	PiPencilSimple,
	PiPlus,
	PiUsersThree,
	PiCaretUp,
	PiCaretDown,
} from "react-icons/pi";

const DEPT_ICONS = {
	Direction: <PiFilmSlate />,
	Camera: <PiCamera />,
	Art: <PiPalette />,
	Sound: <PiSpeakerHigh />,
};

const EMPTY_STATE = (
	<div className="cl-empty-state" role="status" aria-live="polite">
		<div className="cl-empty-icon">
			<PiNote size={48} />
		</div>
		<div className="cl-empty-content">
			<h2 className="cl-empty-title">No departments added yet</h2>
			<p className="cl-empty-desc">
				A Crew List organizes your crew by department, with roles for each shoot day.
				<br />
				Add your first department to get started.
			</p>
		</div>
	</div>
);

export default function CrewList() {
	const { user, id } = useParams();
	const navigate = useNavigate(); // Add hook
	const [departments, setDepartments] = useState([]);
	const [saveStatus, setSaveStatus] = useState("");
	// Save handler
	async function handleSave() {
		setSaveStatus("");
		try {
			for (const dept of departments) {
				for (const crew of dept.crew) {
					const nameFilled = crew.name.trim().length > 0;
					const roleFilled = crew.role.trim().length > 0;
					if (nameFilled !== roleFilled) {
						setSaveStatus("Please fill both Name and Role for each crew member.");
						return;
					}
				}
			}

			const projectId = id;

			const payload = {
				notes: "",
				departments: departments.map((dept) => ({
					id: dept.id,
					name: dept.name,
					crew: dept.crew
						.filter((crew) => crew.name.trim())
						.map((crew) => ({
							id: crew.id,
							name: crew.name,
							role: crew.role
						}))
				}))
			};

			// Always update the single crew list
			const response = await fetch(`/api/projects/${projectId}/crewlist`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			});

			if (response.ok) {
				setSaveStatus("Crew List saved successfully!");
			} else {
				setSaveStatus("Failed to save Crew List.");
			}
		} catch (err) {
			setSaveStatus("Error saving Crew List.");
		}
	}
	const [newDept, setNewDept] = useState("");
	const [expanded, setExpanded] = useState([]);
	const [loading, setLoading] = useState(true);
	const [editDeptIdx, setEditDeptIdx] = useState(null);
	const [deptDraft, setDeptDraft] = useState("");
	const [collapsedCards, setCollapsedCards] = useState(new Set());

	useEffect(() => {
		let isActive = true;

		async function loadCrewList() {
			setLoading(true);
			try {
				const response = await fetch(`/api/projects/${id}/crewlist`);
				if (!response.ok) {
					return;
				}
				const crewData = await response.json();
				if (!isActive) {
					return;
				}
				const nextDepartments = (crewData?.departments || []).map((dept) => ({
					id: dept.id,
					name: dept.name,
					crew: (dept.crew_members || dept.crew || []).map((crew) => ({
						id: crew.id,
						name: crew.name || "",
						role: crew.role || ""
					}))
				}));
				setDepartments(nextDepartments);
				setExpanded(nextDepartments.map((_, idx) => idx));
				setCollapsedCards(new Set());
			} catch (err) {
				// Ignore load errors for now
			} finally {
				if (isActive) {
					setLoading(false);
				}
			}
		}

		if (id) {
			loadCrewList();
		} else {
			setLoading(false);
		}

		return () => {
			isActive = false;
		};
	}, [id]);

	function handleAddDept() {
		if (!newDept.trim()) return;
		const newDeptObj = {
			name: newDept.trim(),
			crew: [],
		};
		setDepartments((prev) => [...prev, newDeptObj]);
		setExpanded((prev) => [...prev, prev.length]);
		setNewDept("");
	}

	function handleEditDeptName(idx, name) {
		setDepartments((prev) => prev.map((d, i) => (i === idx ? { ...d, name, project_id: id } : d)));
	}

	async function handleDeleteDept(idx) {
		setSaveStatus("");
		const target = departments[idx];
		if (target?.id) {
			try {
				const response = await fetch(`/api/projects/${id}/crew-departments/${target.id}`, {
					method: "DELETE"
				});
				if (!response.ok) {
					setSaveStatus("Failed to delete department.");
					return;
				}
			} catch (err) {
				setSaveStatus("Error deleting department.");
				return;
			}
		}
		setDepartments((prev) => prev.filter((_, i) => i !== idx));
		setExpanded((prev) => prev.filter((i) => i !== idx).map((i) => (i > idx ? i - 1 : i)));
		setCollapsedCards((prev) => {
			const next = new Set();
			prev.forEach((i) => {
				if (i === idx) return;
				next.add(i > idx ? i - 1 : i);
			});
			return next;
		});
		setEditDeptIdx((prev) => {
			if (prev === idx) return null;
			if (prev == null) return prev;
			return prev > idx ? prev - 1 : prev;
		});
	}

	function handleAddCrew(idx) {
		const newCrew = { name: "", role: "", project_id: id };
		setDepartments((prev) =>
			prev.map((d, i) => (i === idx ? { ...d, crew: [...d.crew, newCrew] } : d))
		);
	}

	function handleUpdateCrewField(deptIdx, crewIdx, field, value) {
		setDepartments((prev) =>
			prev.map((d, i) =>
				i === deptIdx
					? { ...d, crew: d.crew.map((c, j) => (j === crewIdx ? { ...c, [field]: value } : c)) }
					: d
			)
		);
	}

	async function handleDeleteCrew(deptIdx, crewIdx) {
		setSaveStatus("");
		const target = departments[deptIdx]?.crew?.[crewIdx];
		if (target?.id) {
			try {
				const response = await fetch(`/api/projects/${id}/crew/${target.id}`, {
					method: "DELETE"
				});
				if (!response.ok) {
					setSaveStatus("Failed to delete crew member.");
					return;
				}
			} catch (err) {
				setSaveStatus("Error deleting crew member.");
				return;
			}
		}
		setDepartments((prev) =>
			prev.map((d, i) =>
				i === deptIdx ? { ...d, crew: d.crew.filter((_, j) => j !== crewIdx) } : d
			)
		);
	}

	function handleToggleExpand(idx) {
		setExpanded(expanded.includes(idx) ? expanded.filter((i) => i !== idx) : [...expanded, idx]);
	}

	if (loading) {
		return (
			<div className="cl-page-container">

				<div className="cl-main-content">
					<div className="cl-content-area">
						<div className="cl-skeleton-card" style={{ height: 120, marginBottom: 18 }} />
						<div className="cl-skeleton-card" style={{ height: 120, marginBottom: 18 }} />
					</div>
					<div style={{ marginTop: 32, textAlign: "center" }}>
						<button className="cl-save-btn" onClick={handleSave} style={{ padding: "10px 32px", fontSize: 18, background: "#2d72d9", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
							Save Crew List
						</button>
						{saveStatus && (
							<div style={{ marginTop: 12, color: saveStatus.includes("success") ? "green" : "red" }}>{saveStatus}</div>
						)}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="cl-page-container">

			<div className="cl-main-content">
				<div className="cl-content-area">
					<div className="cl-page-header">
						<div className="cl-header-left">
							<h1 className="cl-title">Crew List</h1>
							<p className="cl-desc">Organize your crew by department, assign roles, and set call times for each shoot day.</p>
						</div>
						<div className="cl-header-actions">
							<button
								className="cl-action-btn"
								onClick={() => navigate(`/${user}/${id}/call-sheets`)}
								style={{ backgroundColor: '#2d72d9', color: 'white', marginRight: '10px' }}
							>
								<PiFilmSlate /> Call Sheets
							</button>
							<button
								className="cl-action-btn cl-expand-all-btn"
								onClick={() => setCollapsedCards(new Set())}
								disabled={departments.length === 0}
							>
								<PiCaretDown />
								Expand All
							</button>
							<button
								className="cl-action-btn cl-collapse-all-btn"
								onClick={() => {
									const allIndices = new Set(departments.map((_, i) => i));
									setCollapsedCards(allIndices);
								}}
								disabled={departments.length === 0}
							>
								<PiCaretUp />
								Collapse all
							</button>
						</div>
					</div>

					<div className="cl-add-dept-bar">
						<input
							className="cl-dept-input"
							type="text"
							placeholder="Add Department (e.g. Camera, Sound, Art)"
							value={newDept}
							aria-label="Add Department"
							onChange={(e) => setNewDept(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleAddDept()}
						/>
						<button className="cl-add-dept-btn" onClick={handleAddDept} aria-label="Add Department">
							<PiPlus /> Add Department
						</button>
					</div>

					{departments.length === 0 ? (
						EMPTY_STATE
					) : (
						<div className="cl-department-list">
							{departments.map((dept, idx) => {
								const isOpen = expanded.includes(idx);
								const isCollapsed = collapsedCards.has(idx);
								const crewCount = dept.crew.length;

								return (
									<div key={idx} className={`cl-department-card ${isCollapsed ? "cl-collapsed" : ""}`}>
										<div
											className={`cl-card-header ${isCollapsed ? "cl-card-header-compressed" : ""}`}
											onClick={() => {
												if (isCollapsed) {
													setCollapsedCards((prev) => {
														const next = new Set(prev);
														next.delete(idx);
														return next;
													});
												}
											}}
										>
											<div className="cl-card-header-left">
												<div className="cl-character-info">
													<span className="cl-dept-id-box">{idx + 1}</span>
													{editDeptIdx === idx ? (
														<input
															className="cl-dept-title-input"
															value={deptDraft}
															onChange={(e) => setDeptDraft(e.target.value)}
															onBlur={() => {
																if (deptDraft.trim()) {
																	handleEditDeptName(idx, deptDraft);
																}
																setEditDeptIdx(null);
															}}
															onKeyDown={(e) => {
																if (e.key === "Enter" && deptDraft.trim()) {
																	handleEditDeptName(idx, deptDraft);
																	setEditDeptIdx(null);
																}
																if (e.key === "Escape") {
																	setEditDeptIdx(null);
																}
															}}
															aria-label="Edit Department Name"
															autoFocus
															onClick={(e) => e.stopPropagation()}
														/>
													) : (
														<>
															<span className="cl-dept-icon">{DEPT_ICONS[dept.name] || <PiDotsThreeOutline />}</span>
															<span className="cl-dept-title">{dept.name}</span>
														</>
													)}
													<span className="cl-crew-count-badge">
														<PiUsersThree /> {crewCount}
													</span>
												</div>

												{!isCollapsed && (
													<button
														className="cl-collapse-btn"
														onClick={(e) => {
															e.stopPropagation();
															setCollapsedCards((prev) => {
																const next = new Set(prev);
																next.add(idx);
																return next;
															});
														}}
														aria-label="Collapse"
													>
														<PiCaretUp />
													</button>
												)}
											</div>

											{isCollapsed && (
												<div className="cl-compressed-stats">
													<div className="cl-compressed-divider"></div>
													<div className="cl-compressed-stat-item">
														<PiUsersThree className="cl-compressed-icon" />
														<span className="cl-compressed-stat-text">
															<span className="cl-compressed-value">{crewCount}</span>
															<span className="cl-compressed-label"> Crew {crewCount !== 1 ? "Members" : "Member"}</span>
														</span>
													</div>
													<div className="cl-compressed-divider"></div>
												</div>
											)}

											{isCollapsed && (
												<button
													className="cl-collapse-btn cl-collapse-btn-right"
													onClick={(e) => {
														e.stopPropagation();
														setCollapsedCards((prev) => {
															const next = new Set(prev);
															next.delete(idx);
															return next;
														});
													}}
												>
													<PiCaretDown />
												</button>
											)}

											{!isCollapsed && (
												<div className="cl-card-header-actions">
													<button
														className="cl-icon-btn cl-edit-btn"
														onClick={(e) => {
															e.stopPropagation();
															setEditDeptIdx(idx);
															setDeptDraft(dept.name);
														}}
														aria-label="Edit Department"
													>
														<PiPencilSimple />
													</button>
													<button
														className="cl-icon-btn cl-delete-btn"
														onClick={async (e) => {
															e.stopPropagation();
															if (window.confirm(`Delete department "${dept.name}"?`)) {
																await handleDeleteDept(idx);
															}
														}}
														aria-label="Delete Department"
													>
														<PiTrash />
													</button>
													<button
														className={`cl-expand-toggle-btn ${isOpen ? "cl-expanded" : ""}`}
														onClick={(e) => {
															e.stopPropagation();
															handleToggleExpand(idx);
														}}
														aria-label={isOpen ? "Hide Crew" : "Show Crew"}
													>
														{isOpen ? "Hide Crew" : "Show Crew"}
														{isOpen ? <PiCaretUp /> : <PiCaretDown />}
													</button>
												</div>
											)}
										</div>

										{!isCollapsed && isOpen && (
											<div className="cl-card-body">
												<div className="cl-crew-table-container">
													<table className="cl-crew-table">
														<thead>
															<tr>
																<th>Role</th>
																<th>Name</th>
																<th className="cl-actions-col"></th>
															</tr>
														</thead>
														<tbody>
															{dept.crew.length === 0 && (
																<tr>
																	<td colSpan={3} className="cl-crew-empty">
																		<div className="cl-empty-crew-state">
																			<PiUsersThree size={24} />
																			<span>No crew members yet. Click "Add Crew Member" below to get started.</span>
																		</div>
																	</td>
																</tr>
															)}
															{dept.crew.map((crew, crewIdx) => (
																<tr key={crewIdx} className="cl-crew-row">
																	<td>
																		<input
																			className="cl-crew-input"
																			type="text"
																			placeholder="Enter role"
																			value={crew.role}
																			onChange={(e) => handleUpdateCrewField(idx, crewIdx, "role", e.target.value)}
																			aria-label="Crew Role"
																		/>
																	</td>
																	<td>
																		<input
																			className="cl-crew-input"
																			type="text"
																			placeholder="Enter name"
																			value={crew.name}
																			onChange={(e) => handleUpdateCrewField(idx, crewIdx, "name", e.target.value)}
																			aria-label="Crew Name"
																		/>
																	</td>
																	<td className="cl-actions-col">
																		<div className="cl-crew-actions">
																			<button
																				className="cl-icon-btn cl-delete-crew-btn"
																				onClick={async () => {
																					if (
																						window.confirm(
																							`Delete crew member "${crew.name || "this member"}"?`
																						)
																					) {
																						await handleDeleteCrew(idx, crewIdx);
																					}
																				}}
																				aria-label="Delete Crew Member"
																			>
																				<PiTrash />
																			</button>
																		</div>
																	</td>
																</tr>
															))}
														</tbody>
													</table>
												</div>
												<button className="cl-add-crew-btn" onClick={() => handleAddCrew(idx)} aria-label="Add Crew Member">
													<PiPlus /> Add Crew Member
												</button>
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}
				</div>
				<div className="cl-save-bar">
					<button className="cl-save-btn" onClick={handleSave}>
						Save Crew List
					</button>
					{saveStatus && (
						<div className={`cl-save-status ${saveStatus.includes("success") ? "is-success" : "is-error"}`}>
							{saveStatus}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
