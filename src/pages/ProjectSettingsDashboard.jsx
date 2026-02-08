import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { getApiUrl, fetchWithAuth } from "../utils/api";

const ProjectSettingsDashboard = () => {
	const { user, id: projectid } = useParams();
	const location = useLocation();
	const projectName = useSelector((state) => state.project.projectName);

	const [currentSection, setCurrentSection] = useState("general");
	const [showInviteMemberModal, setShowInviteMemberModal] = useState(false);
	const [inviteMemberLoading, setInviteMemberLoading] = useState(false);
	const [inviteMemberFormData, setInviteMemberFormData] = useState({ username: "", role_id: 1 });
	const [project, setProject] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

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
		// This is a frontend-only implementation, no API call will be made.
		console.log("Invite Member Form Submitted:", inviteMemberFormData);
		alert("Invite functionality is frontend-only for now.");
		handleCloseInviteModal();
	};

	const styles = {
		page: {
			background: "linear-gradient(135deg, #f5f7fa, #c3cfe2)",
			minHeight: "100vh",
			padding: "32px",
			fontFamily: "sans-serif",
		},
		header: {
			marginBottom: "32px",
		},
		title: {
			fontSize: "28px",
			fontWeight: "bold",
			color: "#1f2937",
			marginBottom: "8px",
		},
		subtitle: {
			fontSize: "16px",
			color: "#6b7280",
		},
		card: {
			backgroundColor: "#ffffff",
			borderRadius: "12px",
			boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
			padding: "24px",
			marginBottom: "24px",
		},
		cardHeader: {
			borderBottom: "1px solid #e5e7eb",
			paddingBottom: "16px",
			marginBottom: "16px",
		},
		cardTitle: {
			fontSize: "20px",
			fontWeight: "600",
			color: "#1f2937",
		},
		cardSubtitle: {
			fontSize: "14px",
			color: "#6b7280",
			marginTop: "4px",
		},
		label: {
			display: "block",
			fontSize: "14px",
			fontWeight: "500",
			color: "#374151",
			marginBottom: "8px",
		},
		input: {
			width: "100%",
			padding: "10px 12px",
			borderRadius: "8px",
			border: "1px solid #d1d5db",
			backgroundColor: "#f9fafb",
			color: "#1f2937",
			fontSize: "14px",
		},
		button: {
			backgroundColor: "#4B9CD3",
			color: "#ffffff",
			padding: "10px 16px",
			borderRadius: "8px",
			border: "none",
			fontSize: "14px",
			fontWeight: "600",
			cursor: "pointer",
			transition: "background-color 0.3s",
		},
		table: {
			width: "100%",
			borderCollapse: "collapse",
		},
		tableHead: {
			backgroundColor: "#f9fafb",
		},
		tableHeaderCell: {
			padding: "12px 16px",
			textAlign: "left",
			fontSize: "12px",
			fontWeight: "600",
			color: "#6b7280",
			textTransform: "uppercase",
			borderBottom: "1px solid #e5e7eb",
		},
		tableRow: {
			borderBottom: "1px solid #e5e7eb",
		},
		tableCell: {
			padding: "16px",
			fontSize: "14px",
			color: "#374151",
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
			backgroundColor: "#ffffff",
			borderRadius: "12px",
			boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
			width: "100%",
			maxWidth: "500px",
			padding: "24px",
		},
		modalHeader: {
			display: "flex",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: "16px",
		},
		modalTitle: {
			fontSize: "20px",
			fontWeight: "600",
			color: "#1f2937",
		},
		closeButton: {
			backgroundColor: "transparent",
			border: "none",
			color: "#6b7280",
			fontSize: "24px",
			cursor: "pointer",
		},
		modalBody: {
			paddingTop: "16px",
		},
		modalFooter: {
			display: "flex",
			justifyContent: "flex-end",
			gap: "12px",
			marginTop: "24px",
		},
		cancelButton: {
			backgroundColor: "#e5e7eb",
			color: "#374151",
			padding: "10px 16px",
			borderRadius: "8px",
			border: "none",
			fontSize: "14px",
			fontWeight: "600",
			cursor: "pointer",
		},
	};

	const renderGeneralContent = () => (
		<div style={styles.card}>
			<div style={styles.cardHeader}>
				<h3 style={styles.cardTitle}>General Settings</h3>
				<p style={styles.cardSubtitle}>View your project's details.</p>
			</div>
			<div style={{ width: "90%" }}>
				<label style={styles.label}>Project Name</label>
				<input type="text" value={projectName || ""} readOnly style={styles.input} />
			</div>
			<div style={{ marginTop: "24px" }}>
				<h4 style={{ ...styles.cardTitle, fontSize: "18px", marginBottom: "16px" }}>Deleted Drafts</h4>
				<ul style={{ listStyle: "none", padding: 0 }}>
					<li
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							padding: "12px 0",
							borderBottom: "1px solid #e5e7eb",
						}}
					>
						<div>
							<p style={{ margin: 0, fontWeight: "500", color: "#1f2937" }}>My First Script - Draft v1</p>
							<p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>Deleted on: 2025-08-23</p>
						</div>
						<button
							style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #d1d5db", background: "#ffffff", cursor: "pointer" }}
						>
							Restore
						</button>
					</li>
					<li
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							padding: "12px 0",
							borderBottom: "1px solid #e5e7eb",
						}}
					>
						<div>
							<p style={{ margin: 0, fontWeight: "500", color: "#1f2937" }}>Scene 4 - Alternate Ending</p>
							<p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>Deleted on: 2025-08-22</p>
						</div>
						<button
							style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #d1d5db", background: "#ffffff", cursor: "pointer" }}
						>
							Restore
						</button>
					</li>
				</ul>
			</div>
		</div>
	);

	const renderProjectMembersContent = () => (
		<>
			<div style={styles.card}>
				<div style={{ ...styles.cardHeader, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<div>
						<h3 style={styles.cardTitle}>Active Members</h3>
						<p style={styles.cardSubtitle}>0 active members</p>
					</div>
					<button onClick={handleOpenInviteModal} style={styles.button}>
						+ Invite Member
					</button>
				</div>
				<table style={styles.table}>
					<thead style={styles.tableHead}>
						<tr>
							<th style={styles.tableHeaderCell}>User</th>
							<th style={styles.tableHeaderCell}>Role</th>
							<th style={styles.tableHeaderCell}>Joined</th>
						</tr>
					</thead>
					<tbody>
						{/* Placeholder for project members */}
						<tr>
							<td colSpan="3" style={{ ...styles.tableCell, textAlign: "center" }}>
								No members yet.
							</td>
						</tr>
					</tbody>
				</table>
				<div style={{ ...styles.cardHeader, display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px" }}>
					<div>
						<h3 style={styles.cardTitle}>Pending Invites</h3>
						<p style={styles.cardSubtitle}>0 pending invites</p>
					</div>
				</div>
				<table style={styles.table}>
					<thead style={styles.tableHead}>
						<tr>
							<th style={styles.tableHeaderCell}>User</th>
							<th style={styles.tableHeaderCell}>Invited</th>
							<th style={styles.tableHeaderCell}>Role</th>
						</tr>
					</thead>
					<tbody>
						{/* Placeholder for pending invites */}
						<tr>
							<td colSpan="3" style={{ ...styles.tableCell, textAlign: "center" }}>
								No pending invites
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<button
				style={{
					backgroundColor: "#4B9CD3",
					color: "white",
					padding: "15px",
					borderRadius: "5px",
					border: "None",
					marginLeft: "45%",
					//height: "50px",
					marginTop: "50px",
				}}
			>
				<b>Leave Project</b>
			</button>
		</>
	);

	const renderBillingAndUsageContent = () => (
		<div style={styles.card}>
			<div style={styles.cardHeader}>
				<h3 style={styles.cardTitle}>Billing and Usage</h3>
				<p style={styles.cardSubtitle}>Manage your subscription and view usage.</p>
			</div>
			<p>Billing and usage content goes here.</p>
		</div>
	);

	return (
		<div style={styles.page}>
			<div style={styles.header}>
				<h1 style={styles.title}>{projectName}</h1>
				<p style={styles.subtitle}>Manage your project settings and members.</p>
			</div>

			{currentSection === "general" && renderGeneralContent()}
			{currentSection === "members" && renderProjectMembersContent()}
			{currentSection === "billing" && renderBillingAndUsageContent()}

			{showInviteMemberModal && (
				<div style={styles.modalOverlay}>
					<div style={styles.modal}>
						<div style={styles.modalHeader}>
							<h3 style={styles.modalTitle}>Invite New Member</h3>
							<button onClick={handleCloseInviteModal} style={styles.closeButton}>
								&times;
							</button>
						</div>
						<form onSubmit={handleInviteMemberSubmit}>
							<div style={styles.modalBody}>
								<div style={{ marginBottom: "16px" }}>
									<label style={styles.label}>Username or Email</label>
									<input
										type="text"
										name="username"
										value={inviteMemberFormData.username}
										onChange={handleInviteMemberInputChange}
										required
										style={styles.input}
										placeholder="Enter username or email"
									/>
								</div>
								<div>
									<label style={styles.label}>Role</label>
									<select
										name="role_id"
										value={inviteMemberFormData.role_id}
										onChange={handleInviteMemberInputChange}
										style={styles.input}
									>
										<option value={1}>Owner</option>
										<option value={2}>Editor</option>
										<option value={3}>Viewer</option>
									</select>
								</div>
							</div>
							<div style={styles.modalFooter}>
								<button type="button" onClick={handleCloseInviteModal} style={styles.cancelButton}>
									Cancel
								</button>
								<button type="submit" disabled={inviteMemberLoading} style={styles.button}>
									{inviteMemberLoading ? "Inviting..." : "Send Invite"}
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
