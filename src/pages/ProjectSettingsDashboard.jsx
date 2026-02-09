import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { getApiUrl, fetchWithAuth } from "../utils/api";
import "../css/ProjectSettingsDashboard.css";

const ProjectSettingsDashboard = () => {
	const { user, id: projectid } = useParams();
	const location = useLocation();
	const projectName = useSelector((state) => state.project.projectName);

	const [currentSection, setCurrentSection] = useState("general");
	const [showInviteMemberModal, setShowInviteMemberModal] = useState(false);
	const [inviteMemberLoading, setInviteMemberLoading] = useState(false);
	const [inviteMemberFormData, setInviteMemberFormData] = useState({ username: "", role_id: 2 });
	const [project, setProject] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	// Team members state
	const [teamMembers, setTeamMembers] = useState([]);
	const [teamLoading, setTeamLoading] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(null);

	// Archived scripts state
	const [archivedScripts, setArchivedScripts] = useState([]);
	const [archivedLoading, setArchivedLoading] = useState(false);
	const [restoringScript, setRestoringScript] = useState(null);

	const roles = [
		{ id: 1, name: "Owner", description: "Has all permissions" },
		{ id: 2, name: "Member", description: "Permission to edit projects" },
		{ id: 3, name: "Viewer", description: "Can see the projects" },
	];

	// Fetch team members from API
	const fetchTeamMembers = async () => {
		try {
			setTeamLoading(true);
			setError(null);

			const response = await fetchWithAuth(getApiUrl(`/api/projects/${projectid}/team`), {
				method: "GET",
			});

			if (!response.ok) {
				throw new Error("Failed to fetch team members");
			}

			const data = await response.json();
			setTeamMembers(data);
		} catch (err) {
			console.error("Error fetching team members:", err);
			setError(err.message);
		} finally {
			setTeamLoading(false);
		}
	};

	// Add team member via API
	const addTeamMember = async (username, roleId) => {
		try {
			setInviteMemberLoading(true);
			setError(null);

			const response = await fetchWithAuth(getApiUrl(`/api/projects/${projectid}/team/${username}`), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ role_id: roleId }),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: "Failed to add team member" }));
				throw new Error(errorData.message || "Failed to add team member");
			}

			await fetchTeamMembers();
			handleCloseInviteModal();
		} catch (err) {
			setError(err.message);
			console.error("Error adding team member:", err);
		} finally {
			setInviteMemberLoading(false);
		}
	};

	// Remove team member via API
	const removeTeamMember = async (username) => {
		try {
			setTeamLoading(true);
			setError(null);

			const response = await fetchWithAuth(getApiUrl(`/api/projects/${projectid}/team/${username}`), {
				method: "DELETE",
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: "Failed to remove team member" }));
				throw new Error(errorData.message || "Failed to remove team member");
			}

			await fetchTeamMembers();
			setConfirmDelete(null);
		} catch (err) {
			setError(err.message);
			console.error("Error removing team member:", err);
		} finally {
			setTeamLoading(false);
		}
	};

	// Fetch team members when members section is active
	useEffect(() => {
		if (currentSection === "members") {
			fetchTeamMembers();
		}
	}, [currentSection, projectid]);

	// Fetch archived scripts
	const fetchArchivedScripts = async () => {
		try {
			setArchivedLoading(true);
			const response = await fetchWithAuth(getApiUrl(`/api/${projectid}/archived-scripts`), {
				method: "GET",
			});

			if (!response.ok) {
				throw new Error("Failed to fetch archived scripts");
			}

			const data = await response.json();
			setArchivedScripts(data);
		} catch (err) {
			console.error("Error fetching archived scripts:", err);
		} finally {
			setArchivedLoading(false);
		}
	};

	// Restore a script
	const handleRestoreScript = async (scriptName) => {
		try {
			setRestoringScript(scriptName);
			const response = await fetchWithAuth(getApiUrl(`/api/${projectid}/restore-script/${scriptName}`), {
				method: "POST",
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: "Failed to restore script" }));
				throw new Error(errorData.message || "Failed to restore script");
			}

			// Refresh archived scripts list
			await fetchArchivedScripts();
		} catch (err) {
			console.error("Error restoring script:", err);
			setError(err.message);
		} finally {
			setRestoringScript(null);
		}
	};

	// Fetch archived scripts when general section is active
	useEffect(() => {
		if (currentSection === "general") {
			fetchArchivedScripts();
		}
	}, [currentSection, projectid]);

	useEffect(() => {
		const section = location.state?.section || "general";
		console.log(section, "-------------------------------------------------------------");

		if (["general", "members", "billing"].includes(section)) {
			setCurrentSection(section);
		} else {
			setCurrentSection("general");
		}
	}, [location.pathname, location.state]);

	const handleInviteMemberInputChange = (e) => {
		const { name, value } = e.target;
		setInviteMemberFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleOpenInviteModal = () => {
		setShowInviteMemberModal(true);
		setInviteMemberFormData({ username: "", role_id: 1 });
	};

	const handleCloseInviteModal = () => {
		setShowInviteMemberModal(false);
		setInviteMemberFormData({ username: "", role_id: 1 });
		setError(null);
	};

	const handleInviteMemberSubmit = (e) => {
		e.preventDefault();
		if (inviteMemberFormData.username.trim()) {
			addTeamMember(inviteMemberFormData.username.trim(), inviteMemberFormData.role_id);
		}
	};

	const handleDeleteClick = (username) => {
		setConfirmDelete(username);
	};

	const handleConfirmDelete = () => {
		if (confirmDelete) {
			removeTeamMember(confirmDelete);
		}
	};

	const handleCancelDelete = () => {
		setConfirmDelete(null);
	};

	const getRoleName = (roleId) => {
		const role = roles.find((r) => r.id === roleId);
		return role ? role.name : "Unknown";
	};

	const renderGeneralContent = () => (
		<div className="proj-settings-card">
			<div className="proj-settings-card-header">
				<div className="proj-settings-card-header-left">
					<h3 className="proj-settings-card-title">General Settings</h3>
					<p className="proj-settings-card-subtitle">View your project's details.</p>
				</div>
			</div>
			<div className="proj-settings-form-group">
				<label className="proj-settings-label">Project Name</label>
				<input type="text" value={projectName || ""} readOnly className="proj-settings-input" />
			</div>
			<div className="proj-settings-section-divider">
				<h4 className="proj-settings-section-title">Archived Drafts</h4>
				<ul className="proj-settings-drafts-list">
					{archivedLoading ? (
						<li className="proj-settings-draft-item">
							<div className="proj-settings-draft-info">
								<p>Loading archived scripts...</p>
							</div>
						</li>
					) : archivedScripts.length === 0 ? (
						<li className="proj-settings-draft-item">
							<div className="proj-settings-draft-info">
								<p>No archived scripts</p>
							</div>
						</li>
					) : (
						archivedScripts.map((script) => (
							<li key={script.id} className="proj-settings-draft-item">
								<div className="proj-settings-draft-info">
									<h4>{script.name}</h4>
									<p>Archived on: {script.archivedDate}</p>
								</div>
								<button
									className="proj-settings-btn proj-settings-btn-secondary"
									onClick={() => handleRestoreScript(script.name)}
									disabled={restoringScript === script.name}
								>
									{restoringScript === script.name ? "Restoring..." : "Restore"}
								</button>
							</li>
						))
					)}
				</ul>
			</div>
		</div>
	);

	const renderProjectMembersContent = () => (
		<>
			<div className="proj-settings-card">
				<div className="proj-settings-card-header">
					<div className="proj-settings-card-header-left">
						<h3 className="proj-settings-card-title">Active Members</h3>
						<p className="proj-settings-card-subtitle">
							{teamMembers.length} active member{teamMembers.length !== 1 ? "s" : ""}
						</p>
					</div>
					<button onClick={handleOpenInviteModal} className="proj-settings-btn proj-settings-btn-primary">
						+ Add Member
					</button>
				</div>

				{/* Error message */}
				{error && <div className="proj-settings-error">{error}</div>}

				<table className="proj-settings-table">
					<thead className="proj-settings-thead">
						<tr className="proj-settings-header-row">
							<th className="proj-settings-header-cell">User</th>
							<th className="proj-settings-header-cell">Role</th>
							<th className="proj-settings-header-cell">Action</th>
						</tr>
					</thead>
					<tbody>
						{teamLoading ? (
							<tr>
								<td colSpan="3" className="proj-settings-empty-row">
									Loading members...
								</td>
							</tr>
						) : teamMembers.length === 0 ? (
							<tr>
								<td colSpan="3" className="proj-settings-empty-row">
									No members yet.
								</td>
							</tr>
						) : (
							teamMembers.map((member) => (
								<tr key={member.username} className="proj-settings-data-row">
									<td className="proj-settings-data-cell">
										<div className="proj-settings-member-info">
											<div className="proj-settings-member-avatar">{member.username?.charAt(0).toUpperCase() || "?"}</div>
											<span>{member.username}</span>
										</div>
									</td>
									<td className="proj-settings-data-cell">{getRoleName(member.role_id)}</td>
									<td className="proj-settings-data-cell">
										<button
											onClick={() => handleDeleteClick(member.username)}
											className="proj-settings-btn proj-settings-btn-danger"
										>
											Remove
										</button>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>

				<div className="proj-settings-section-divider">
					<div className="proj-settings-card-header">
						<div className="proj-settings-card-header-left">
							<h3 className="proj-settings-card-title">Pending Invites</h3>
							<p className="proj-settings-card-subtitle">0 pending invites</p>
						</div>
					</div>
					<table className="proj-settings-table">
						<thead className="proj-settings-thead">
							<tr className="proj-settings-header-row">
								<th className="proj-settings-header-cell">User</th>
								<th className="proj-settings-header-cell">Invited</th>
								<th className="proj-settings-header-cell">Role</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td colSpan="3" className="proj-settings-empty-row">
									No pending invites
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			<button className="proj-settings-leave-btn">Leave Project</button>

			{/* Delete Confirmation Modal */}
			{confirmDelete && (
				<div className="proj-settings-modal-overlay">
					<div className="proj-settings-modal">
						<div className="proj-settings-modal-header">
							<h3 className="proj-settings-modal-title">Confirm Remove Member</h3>
							<button onClick={handleCancelDelete} className="proj-settings-modal-close">
								&times;
							</button>
						</div>
						<div className="proj-settings-modal-body">
							<p>
								Are you sure you want to remove <strong>{confirmDelete}</strong> from this project?
							</p>
						</div>
						<div className="proj-settings-modal-footer">
							<button type="button" onClick={handleCancelDelete} className="proj-settings-btn proj-settings-btn-secondary">
								Cancel
							</button>
							<button
								type="button"
								onClick={handleConfirmDelete}
								className="proj-settings-btn proj-settings-btn-danger"
								disabled={teamLoading}
							>
								{teamLoading ? "Removing..." : "Remove"}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);

	const renderBillingAndUsageContent = () => (
		<div className="proj-settings-card">
			<div className="proj-settings-card-header">
				<div className="proj-settings-card-header-left">
					<h3 className="proj-settings-card-title">Billing and Usage</h3>
					<p className="proj-settings-card-subtitle">Manage your subscription and view usage.</p>
				</div>
			</div>
			<p>Billing and usage content goes here.</p>
		</div>
	);

	return (
		<div className="proj-settings-page">
			<div className="proj-settings-header">
				<h1 className="proj-settings-title">{projectName}</h1>
				<p className="proj-settings-subtitle">Manage your project settings and members.</p>
			</div>

			{currentSection === "general" && renderGeneralContent()}
			{currentSection === "members" && renderProjectMembersContent()}
			{currentSection === "billing" && renderBillingAndUsageContent()}

			{showInviteMemberModal && (
				<div className="proj-settings-modal-overlay">
					<div className="proj-settings-modal">
						<div className="proj-settings-modal-header">
							<h3 className="proj-settings-modal-title">Add Team Member</h3>
							<button onClick={handleCloseInviteModal} className="proj-settings-modal-close">
								&times;
							</button>
						</div>
						<form onSubmit={handleInviteMemberSubmit}>
							<div className="proj-settings-modal-body">
								<div className="proj-settings-form-group">
									<label className="proj-settings-label">Username or Email</label>
									<input
										type="text"
										name="username"
										value={inviteMemberFormData.username}
										onChange={handleInviteMemberInputChange}
										required
										className="proj-settings-input"
										placeholder="Enter username or email"
										style={{ maxWidth: "100%" }}
									/>
								</div>
								<div className="proj-settings-form-group">
									<label className="proj-settings-label">Role</label>
									<select
										name="role_id"
										value={inviteMemberFormData.role_id}
										onChange={(e) =>
											setInviteMemberFormData((prev) => ({
												...prev,
												role_id: parseInt(e.target.value, 10),
											}))
										}
										className="proj-settings-select"
									>
										{roles.map((role) => (
											<option key={role.id} value={role.id}>
												{role.name} - {role.description}
											</option>
										))}
									</select>
								</div>
							</div>
							<div className="proj-settings-modal-footer">
								<button type="button" onClick={handleCloseInviteModal} className="proj-settings-btn proj-settings-btn-secondary">
									Cancel
								</button>
								<button type="submit" disabled={inviteMemberLoading} className="proj-settings-btn proj-settings-btn-primary">
									{inviteMemberLoading ? "Adding..." : "Add Member"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

export default ProjectSettingsDashboard;
