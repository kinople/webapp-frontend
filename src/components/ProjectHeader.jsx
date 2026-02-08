import React, { useEffect, useState } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { getApiUrl, fetchWithAuth } from "../utils/api";
import { useSelector } from "react-redux";

const ProjectHeader = () => {
	const { user, id } = useParams();
	const [showModal, setShowModal] = useState(false);
	const [showAddModal, setShowAddModal] = useState(false);
	const [teamMembers, setTeamMembers] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [newUsername, setNewUsername] = useState("");
	const [selectedRoleId, setSelectedRoleId] = useState(2); // Default to Member
	const [projectName, setProjectName] = useState(useSelector((state) => state.project.projectName));
	const navigate = useNavigate();

	const [adding, setAdding] = useState(false);
	//	const [projectLoading, setProjectLoading] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(null); // Store username to delete

	const roles = [
		{ id: 1, name: "Owner", description: "Has all permissions" },
		{ id: 2, name: "Member", description: "Permission to edit projects" },
		{ id: 3, name: "Viewer", description: "Can see the projects" },
	];

	const fetchProjectDetails = async () => {
		try {
			//setProjectLoading(true);
			const response = await fetchWithAuth(getApiUrl(`/api/project-name/${id}`), {
				method: "GET",
			});

			if (!response.ok) {
				console.error("Failed to fetch project details");
				setProjectName(`Project - ${id}`); // Fallback to ID if fetch fails
				return;
			}

			const data = await response.json();
			setProjectName(data.projectName || data.name || `Project - ${id}`);
		} catch (err) {
			console.error("Error fetching project details:", err);
			setProjectName(`Project - ${id}`); // Fallback to ID if error occurs
		} finally {
			//setProjectLoading(false);
		}
	};

	useEffect(() => {
		fetchProjectDetails();
	}, []);

	const fetchTeamMembers = async () => {
		try {
			setLoading(true);
			setError(null);

			const response = await fetchWithAuth(getApiUrl(`/api/projects/${id}/team`), {
				method: "GET",
			});

			console.log("Response status:", response.status);

			if (!response.ok) {
				const errorText = await response.text();
				console.log("Error response text:", errorText);
				throw new Error(`Failed to fetch team members: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();
			console.log("Team members data:", data);
			setTeamMembers(data);
		} catch (err) {
			console.error("Error fetching team members:", err);
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const addTeamMember = async (username, roleId) => {
		try {
			setAdding(true);
			setError(null);

			const response = await fetchWithAuth(getApiUrl(`/api/projects/${id}/team/${username}`), {
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
			setShowAddModal(false);
			setNewUsername("");
			setSelectedRoleId(2); // Reset to Member
		} catch (err) {
			setError(err.message);
			console.error("Error adding team member:", err);
		} finally {
			setAdding(false);
		}
	};

	const removeTeamMember = async (username) => {
		try {
			setLoading(true);
			setError(null);

			const response = await fetchWithAuth(getApiUrl(`/api/projects/${id}/team/${username}`), {
				method: "DELETE",
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: "Failed to remove team member" }));
				throw new Error(errorData.message || "Failed to remove team member");
			}

			// Refresh team members list after successful removal
			await fetchTeamMembers();
		} catch (err) {
			setError(err.message);
			console.error("Error removing team member:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleTeamIconClick = async () => {
		setShowModal(true); // Open modal immediately
		console.log("modal clicked");
		try {
			await fetchTeamMembers(); // Then fetch data in background
		} catch (err) {
			console.error("Fetch failed:", err);
			// Optionally show an error inside the modal
		}
	};

	const handleAddMemberClick = () => {
		setShowAddModal(true);
		setError(null);
	};

	const handleAddMemberSubmit = (e) => {
		e.preventDefault();
		if (newUsername.trim()) {
			addTeamMember(newUsername.trim(), selectedRoleId);
		}
	};

	const closeModal = () => {
		setShowModal(false);
		setTeamMembers([]);
		setError(null);
	};

	const closeAddModal = () => {
		setShowAddModal(false);
		setNewUsername("");
		setSelectedRoleId(2); // Reset to Member
		setError(null);
	};

	const handleDeleteClick = (username) => {
		setConfirmDelete(username);
	};

	const handleConfirmDelete = async () => {
		if (confirmDelete) {
			await removeTeamMember(confirmDelete);
			setConfirmDelete(null);
		}
	};

	const handleCancelDelete = () => {
		setConfirmDelete(null);
	};

	// useEffect(() => {
	// 	if (id) {
	// 		setProjectName(useSelector((state) => state.project.projectName));
	// 	}
	// }, [id]);

	return (
		<div style={styles.subHeader}>
			<h1 style={styles.projectTitle}>
				<Link to={`/${user}/${id}`} style={styles.projectTitleLink}>
					{!projectName ? "Loading..." : projectName}
				</Link>
			</h1>
			<div style={styles.teamIcon} onClick={handleTeamIconClick}>
				<svg width="24" height="24" viewBox="0 0 24 24" fill="#2C3440">
					<path d="M12 12.75c1.63 0 3.07.39 4.24.9 1.08.48 1.76 1.56 1.76 2.73V18H6v-1.62c0-1.17.68-2.25 1.76-2.73 1.17-.51 2.61-.9 4.24-.9zM4 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm18 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-8-6c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z" />
				</svg>
			</div>

			{/* Team Members Modal */}
			{showModal && (
				<div style={styles.modalOverlay} onClick={closeModal}>
					<div style={styles.modal} onClick={(e) => e.stopPropagation()}>
						<div style={styles.modalHeader}>
							<h3 style={styles.modalTitle}>Team Members</h3>
							<button style={styles.closeButton} onClick={closeModal}>
								×
							</button>
						</div>
						<div style={styles.modalContent}>
							{loading ? (
								<div style={styles.loading}>Loading team members...</div>
							) : error ? (
								<div style={styles.error}>Error: {error}</div>
							) : teamMembers.length > 0 ? (
								<div style={styles.teamList}>
									{teamMembers.map((member, index) => (
										<div key={index} style={styles.teamMember}>
											<div style={styles.memberInfo}>
												<div style={styles.memberName}>{member.username}</div>
												<div style={styles.memberRole}>{member.role || "Team Member"}</div>
											</div>
											<button
												style={styles.deleteButton}
												onClick={() => handleDeleteClick(member.username)}
												disabled={loading}
												title="Remove team member"
											>
												<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
													<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
												</svg>
											</button>
										</div>
									))}
								</div>
							) : (
								<div style={styles.noMembers}>No team members found</div>
							)}
							<div style={styles.modalActions}>
								<button style={styles.addMemberButton} onClick={handleAddMemberClick}>
									Add Member
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Add Member Modal */}
			{showAddModal && (
				<div style={styles.modalOverlay} onClick={closeAddModal}>
					<div style={styles.addModal} onClick={(e) => e.stopPropagation()}>
						<div style={styles.modalHeader}>
							<h3 style={styles.modalTitle}>Add Team Member</h3>
							<button style={styles.closeButton} onClick={closeAddModal}>
								×
							</button>
						</div>
						<div style={styles.modalContent}>
							{error && <div style={styles.error}>Error: {error}</div>}
							<form onSubmit={handleAddMemberSubmit}>
								<div style={styles.inputGroup}>
									<label style={styles.label}>Username:</label>
									<input
										type="text"
										value={newUsername}
										onChange={(e) => setNewUsername(e.target.value)}
										placeholder="Enter username"
										style={styles.input}
										disabled={adding}
										autoFocus
									/>
								</div>
								<div style={styles.inputGroup}>
									<label style={styles.label}>Role:</label>
									<select
										value={selectedRoleId}
										onChange={(e) => setSelectedRoleId(parseInt(e.target.value))}
										style={styles.select}
										disabled={adding}
									>
										{roles.map((role) => (
											<option key={role.id} value={role.id}>
												{role.name} - {role.description}
											</option>
										))}
									</select>
								</div>
								<div style={styles.addModalActions}>
									<button type="button" onClick={closeAddModal} style={styles.cancelButton} disabled={adding}>
										Cancel
									</button>
									<button
										type="submit"
										disabled={!newUsername.trim() || adding}
										style={!newUsername.trim() || adding ? styles.buttonDisabled : styles.submitButton}
									>
										{adding ? "Adding..." : "Add Member"}
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			)}

			{/* Confirmation Modal */}
			{confirmDelete && (
				<div style={styles.modalOverlay} onClick={handleCancelDelete}>
					<div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
						<div style={styles.modalHeader}>
							<h3 style={styles.modalTitle}>Confirm Removal</h3>
						</div>
						<div style={styles.modalContent}>
							<p style={styles.confirmText}>
								Are you sure you want to remove <strong>{confirmDelete}</strong> from this project?
							</p>
							<div style={styles.confirmActions}>
								<button style={styles.cancelButton} onClick={handleCancelDelete}>
									Cancel
								</button>
								<button style={styles.confirmDeleteButton} onClick={handleConfirmDelete} disabled={loading}>
									{loading ? "Removing..." : "Remove"}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

const styles = {
	container: {
		backgroundColor: "#2C3440",
		color: "white",
		fontFamily: "san-serif",
	},
	navbar: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		padding: "0.5rem 2rem",
		height: "50px",
		borderBottom: "1px solid rgba(255,255,255,0.1)",
	},
	logo: {
		fontSize: "1.2rem",
		fontWeight: "bold",
		color: "white",
		textDecoration: "none",
	},
	userIcons: {
		display: "flex",
		gap: "0.5rem",
	},
	iconButton: {
		backgroundColor: "#4B9CD3",
		width: "32px",
		height: "32px",
		borderRadius: "50%",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		cursor: "pointer",
	},
	subHeader: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		padding: "1rem 2rem",
		backgroundColor: "white",
		color: "#2C3440",
		position: "relative",
		margin: "20px",
		borderRadius: "10px",
	},
	projectTitle: {
		fontSize: "1.5rem",
		fontWeight: "bold",
		margin: 0,
	},
	projectTitleLink: {
		color: "#2C3440",
		textDecoration: "none",
	},
	teamIcon: {
		cursor: "pointer",
		padding: "8px",
		borderRadius: "4px",
		transition: "background-color 0.2s ease",
	},
	modalOverlay: {
		position: "fixed",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
		zIndex: 1000,
	},
	modal: {
		backgroundColor: "white",
		borderRadius: "8px",
		width: "90%",
		maxWidth: "500px",
		maxHeight: "80vh",
		overflow: "hidden",
		boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
	},
	modalHeader: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		padding: "1rem 1.5rem",
		borderBottom: "1px solid #eee",
	},
	modalTitle: {
		margin: 0,
		fontSize: "1.2rem",
		color: "#333",
	},
	closeButton: {
		background: "none",
		border: "none",
		fontSize: "1.5rem",
		cursor: "pointer",
		color: "#666",
		padding: "0",
		width: "24px",
		height: "24px",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	modalContent: {
		padding: "1.5rem",
		maxHeight: "60vh",
		overflowY: "auto",
	},
	loading: {
		textAlign: "center",
		color: "#666",
		padding: "2rem",
	},
	error: {
		textAlign: "center",
		color: "#dc3545",
		padding: "2rem",
	},
	noMembers: {
		textAlign: "center",
		color: "#666",
		padding: "2rem",
	},
	teamList: {
		display: "flex",
		flexDirection: "column",
		gap: "1rem",
		marginBottom: "1.5rem",
	},
	teamMember: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		padding: "1rem",
		backgroundColor: "#f8f9fa",
		borderRadius: "8px",
		border: "1px solid #e9ecef",
	},
	memberInfo: {
		flex: 1,
	},
	memberName: {
		fontSize: "1rem",
		fontWeight: "500",
		color: "#333",
		marginBottom: "0.25rem",
	},
	memberRole: {
		fontSize: "0.875rem",
		color: "#666",
	},
	memberAvatar: {
		width: "40px",
		height: "40px",
		borderRadius: "50%",
		backgroundColor: "#4B9CD3",
		color: "white",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		fontSize: "1.2rem",
		fontWeight: "bold",
	},
	modalActions: {
		display: "flex",
		justifyContent: "flex-end",
		borderTop: "1px solid #eee",
		paddingTop: "1rem",
	},
	addMemberButton: {
		padding: "0.5rem 1rem",
		backgroundColor: "#4B9CD3",
		color: "white",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
		fontSize: "0.9rem",
	},
	addModal: {
		backgroundColor: "white",
		borderRadius: "8px",
		width: "90%",
		maxWidth: "400px",
		boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
	},
	inputGroup: {
		marginBottom: "1.5rem",
	},
	label: {
		display: "block",
		marginBottom: "0.5rem",
		fontSize: "0.9rem",
		fontWeight: "500",
		color: "#333",
	},
	input: {
		width: "100%",
		padding: "0.75rem",
		fontSize: "1rem",
		border: "1px solid #ddd",
		borderRadius: "4px",
		outline: "none",
		transition: "border-color 0.2s ease",
		boxSizing: "border-box",
	},
	select: {
		width: "100%",
		padding: "0.75rem",
		fontSize: "1rem",
		border: "1px solid #ddd",
		borderRadius: "4px",
		outline: "none",
		transition: "border-color 0.2s ease",
		boxSizing: "border-box",
		backgroundColor: "white",
	},
	addModalActions: {
		display: "flex",
		justifyContent: "flex-end",
		gap: "1rem",
	},
	cancelButton: {
		padding: "0.5rem 1rem",
		backgroundColor: "#f8f9fa",
		color: "#333",
		border: "1px solid #ddd",
		borderRadius: "4px",
		cursor: "pointer",
		fontSize: "0.9rem",
	},
	submitButton: {
		padding: "0.5rem 1rem",
		backgroundColor: "#4B9CD3",
		color: "white",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
		fontSize: "0.9rem",
	},
	buttonDisabled: {
		padding: "0.5rem 1rem",
		backgroundColor: "#ccc",
		color: "#666",
		border: "none",
		borderRadius: "4px",
		cursor: "not-allowed",
		fontSize: "0.9rem",
	},
	deleteButton: {
		backgroundColor: "transparent",
		border: "none",
		color: "#dc3545",
		cursor: "pointer",
		padding: "8px",
		borderRadius: "4px",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		transition: "background-color 0.2s ease",
		minWidth: "32px",
		height: "32px",
	},
	confirmModal: {
		backgroundColor: "white",
		borderRadius: "8px",
		width: "90%",
		maxWidth: "400px",
		boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
	},
	confirmText: {
		color: "#333",
		fontSize: "1rem",
		lineHeight: "1.5",
		margin: "0 0 1.5rem 0",
		textAlign: "center",
	},
	confirmActions: {
		display: "flex",
		justifyContent: "flex-end",
		gap: "1rem",
	},
	confirmDeleteButton: {
		padding: "0.5rem 1rem",
		backgroundColor: "#dc3545",
		color: "white",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
		fontSize: "0.9rem",
	},
};

export default ProjectHeader;
