import React, { useState, useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getApiUrl, fetchWithAuth } from "../utils/api";

const OrganizationDashboard = () => {
	const { user, organizationid } = useParams();
	const location = useLocation();
	const [organization, setOrganization] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [showAddMemberModal, setShowAddMemberModal] = useState(false);
	const [addMemberLoading, setAddMemberLoading] = useState(false);
	const [currentSection, setCurrentSection] = useState("general");
	const [memberFormData, setMemberFormData] = useState({ username: "", role_id: 1 });

	useEffect(() => {
		if (location.state?.section) {
			setCurrentSection(location.state.section);
		}
	}, [location.state]);

	useEffect(() => {
		const fetchOrganization = async () => {
			try {
				setLoading(true);
				const response = await fetchWithAuth(getApiUrl(`/api/${user}/organizations/${organizationid}`), { method: "GET" });

				if (!response.ok) throw new Error("Failed to fetch organization");
				const data = await response.json();

				if (data.status === "success") {
					setOrganization(data.organization);
				} else {
					throw new Error(data.message);
				}
			} catch (err) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		};

		if (organizationid) fetchOrganization();
	}, [user, organizationid]);

	const handleMemberInputChange = (e) => {
		const { name, value } = e.target;
		setMemberFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleAddMemberClick = () => {
		setShowAddMemberModal(true);
		setMemberFormData({ username: "", role_id: 1 });
	};

	const handleCloseModal = () => {
		setShowAddMemberModal(false);
		setMemberFormData({ username: "", role_id: 1 });
		setError(null);
	};

	const handleAddMemberSubmit = async (e) => {
		e.preventDefault();
		if (!memberFormData.username.trim()) {
			setError("Username is required");
			return;
		}
		try {
			setAddMemberLoading(true);
			setError(null);

			const response = await fetchWithAuth(getApiUrl(`/api/${user}/organizations/${organizationid}/members`), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: memberFormData.username,
					role_id: parseInt(memberFormData.role_id),
				}),
			});

			if (!response.ok) throw new Error("Failed to add member");
			const data = await response.json();

			if (data.status === "success") {
				const refreshResponse = await fetchWithAuth(getApiUrl(`/api/${user}/organizations/${organizationid}`), { method: "GET" });
				if (refreshResponse.ok) {
					const refreshData = await refreshResponse.json();
					if (refreshData.status === "success") setOrganization(refreshData.organization);
				}
				handleCloseModal();
			} else {
				throw new Error(data.message || "Failed to add member");
			}
		} catch (err) {
			alert("couldn't add member!");
		} finally {
			setAddMemberLoading(false);
		}
	};

	const styles = {
		page: {
			background: "linear-gradient(135deg, #f5f7fa, #c3cfe2)",
			minHeight: "100vh",
			padding: "32px",
			paddingLeft: `calc(270px + 32px)`,
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

	const renderGeneralContent = () => {
		const activeProjects = organization.projects?.filter((p) => !p.deletetime) || [];
		const archivedProjects = organization.projects?.filter((p) => p.deletetime) || [];

		return (
			<div style={{ ...styles.card, display: "flex", justifyContent: "space-between", flexDirection: "column" }}>
				<div style={styles.cardHeader}>
					<h3 style={styles.cardTitle}>General Settings</h3>
					<p style={styles.cardSubtitle}>View your organization's details.</p>
				</div>
				<div style={{ marginBottom: "24px", width: "90%" }}>
					<label style={styles.label}>Organization Name</label>
					<input type="text" value={organization.organizationname || ""} readOnly style={styles.input} />
				</div>

				<div style={styles.cardHeader}>
					<h3 style={styles.cardTitle}>Active Projects</h3>
					<p style={styles.cardSubtitle}>{activeProjects.length} active projects</p>
				</div>
				<table style={styles.table}>
					<thead style={styles.tableHead}>
						<tr>
							<th style={styles.tableHeaderCell}>Project Name</th>
							<th style={styles.tableHeaderCell}>Type</th>
							<th style={styles.tableHeaderCell}>Created</th>
						</tr>
					</thead>
					<tbody>
						{activeProjects.map((p, idx) => (
							<tr key={idx} style={styles.tableRow}>
								<td style={styles.tableCell}>{p.projectname}</td>
								<td style={styles.tableCell}>{p.projecttype}</td>
								<td style={styles.tableCell}>{new Date(p.createtime).toLocaleDateString()}</td>
							</tr>
						))}
					</tbody>
				</table>

				<div style={{ ...styles.cardHeader, marginTop: "24px" }}>
					<h3 style={styles.cardTitle}>Archived Projects</h3>
					<p style={styles.cardSubtitle}>{archivedProjects.length} archived projects</p>
				</div>
				<table style={styles.table}>
					<thead style={styles.tableHead}>
						<tr>
							<th style={styles.tableHeaderCell}>Project Name</th>
							<th style={styles.tableHeaderCell}>Type</th>
							<th style={styles.tableHeaderCell}>Archived On</th>
						</tr>
					</thead>
					<tbody>
						{archivedProjects.map((p, idx) => (
							<tr key={idx} style={styles.tableRow}>
								<td style={styles.tableCell}>{p.projectname}</td>
								<td style={styles.tableCell}>{p.projecttype}</td>
								<td style={styles.tableCell}>{new Date(p.deletetime).toLocaleDateString()}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	};

	const renderMembersContent = () => (
		<div style={styles.card}>
			<div style={{ ...styles.cardHeader, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<div>
					<h3 style={styles.cardTitle}>Active Members</h3>
					<p style={styles.cardSubtitle}>{organization.members?.length || 0} active members</p>
				</div>
				<button onClick={handleAddMemberClick} style={styles.button}>
					+ Invite Member
				</button>
			</div>
			<table style={styles.table}>
				<thead style={styles.tableHead}>
					<tr>
						<th style={styles.tableHeaderCell}>User</th>
						<th style={styles.tableHeaderCell}>Joined</th>
						<th style={styles.tableHeaderCell}>Role</th>
						<th style={styles.tableHeaderCell}>Projects</th>
						<th style={styles.tableHeaderCell}></th>
					</tr>
				</thead>
				<tbody>
					<tr style={styles.tableRow}>
						<td style={styles.tableCell}>Sujith Kumar</td>
						<td style={styles.tableCell}>{"23 / 4 / 2003"}</td>
						<td style={styles.tableCell}>{"Admin"}</td>
						<td style={styles.tableCell}>{1}</td>
						<td style={styles.tableCell}>
							<button style={{ backgroundColor: "#818181ff", color: "white", padding: "5px", borderRadius: "3px" }}>
								Leave Organisation
							</button>
						</td>
					</tr>
					<tr style={styles.tableRow}>
						<td style={styles.tableCell}>Prathamesh</td>
						<td style={styles.tableCell}>{"23 / 4 / 2003"}</td>
						<td style={styles.tableCell}>{"Member"}</td>
						<td style={styles.tableCell}>{1}</td>
						<td style={styles.tableCell}>
							<button style={{ backgroundColor: "#cc3939ff", color: "white", padding: "5px", borderRadius: "3px" }}>
								Leave Organisation
							</button>
						</td>
					</tr>
					{organization.members?.map((m, idx) => (
						<tr key={idx} style={styles.tableRow}>
							<td style={styles.tableCell}>{m.username}</td>
							<td style={styles.tableCell}>{new Date(m.createtime).toLocaleDateString()}</td>
							<td style={styles.tableCell}>{m.role_name === "Owner" ? "Admin" : m.role_name}</td>
							<td style={styles.tableCell}>{m.projects || 0}</td>
							<td></td>
						</tr>
					))}
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
	);

	const renderBillingContent = () => (
		<div style={styles.card}>
			<div style={styles.cardHeader}>
				<h3 style={styles.cardTitle}>Billing</h3>
				<p style={styles.cardSubtitle}>Manage your subscription and view invoices.</p>
			</div>
			<div>
				<p>Active Projects: {organization.projects?.length || 0}</p>
				<table style={styles.table}>
					<thead style={styles.tableHead}>
						<tr>
							<th style={styles.tableHeaderCell}>Project Name</th>
							<th style={styles.tableHeaderCell}>Type</th>
							<th style={styles.tableHeaderCell}>Plan</th>
							<th style={styles.tableHeaderCell}>Date of Purchase</th>
							<th style={styles.tableHeaderCell}>Date of Expiry</th>
						</tr>
					</thead>
					<tbody>
						{organization.projects?.map((p, idx) => (
							<tr key={idx} style={styles.tableRow}>
								<td style={styles.tableCell}>{p.projectname}</td>
								<td style={styles.tableCell}>{p.projecttype}</td>
								<td style={styles.tableCell}>-</td>
								<td style={styles.tableCell}>{new Date(p.createtime).toLocaleDateString()}</td>
								<td style={styles.tableCell}>-</td>
							</tr>
						))}
					</tbody>
				</table>
				<p>No enterprise plan opted for this organization</p>
				<button style={{ ...styles.button, backgroundColor: "#6b7280" }}>Contact Support</button>
			</div>
		</div>
	);

	if (loading) return <div style={{ paddingLeft: "270px", paddingTop: "2rem" }}>Loading organization...</div>;
	if (error) return <div style={{ paddingLeft: "270px", paddingTop: "2rem", color: "red" }}>Error: {error}</div>;
	if (!organization) return <div style={{ paddingLeft: "270px", paddingTop: "2rem" }}>Organization not found</div>;

	return (
		<div style={styles.page}>
			<div style={styles.header}>
				<h1 style={styles.title}>{organization.organizationname}</h1>
				<p style={styles.subtitle}>Manage your organization settings and members.</p>
			</div>

			{currentSection === "general" && renderGeneralContent()}
			{currentSection === "members" && renderMembersContent()}
			{currentSection === "billing" && renderBillingContent()}

			{showAddMemberModal && (
				<div style={styles.modalOverlay}>
					<div style={styles.modal}>
						<div style={styles.modalHeader}>
							<h3 style={styles.modalTitle}>Invite New Member</h3>
							<button onClick={handleCloseModal} style={styles.closeButton}>
								&times;
							</button>
						</div>
						<form onSubmit={handleAddMemberSubmit}>
							<div style={styles.modalBody}>
								<div style={{ marginBottom: "16px" }}>
									<label style={styles.label}>Username or Email</label>
									<input
										type="text"
										name="username"
										value={memberFormData.username}
										onChange={handleMemberInputChange}
										required
										style={styles.input}
										placeholder="Enter username or email"
									/>
								</div>
								<div>
									<label style={styles.label}>Role</label>
									<select name="role_id" value={memberFormData.role_id} onChange={handleMemberInputChange} style={styles.input}>
										<option value={1}>Admin</option>
										<option value={2}>Member</option>
										<option value={3}>Viewer</option>
									</select>
								</div>
							</div>
							<div style={styles.modalFooter}>
								<button type="button" onClick={handleCloseModal} style={styles.cancelButton}>
									Cancel
								</button>
								<button type="submit" disabled={addMemberLoading} style={styles.button}>
									{addMemberLoading ? "Inviting..." : "Send Invite"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

export default OrganizationDashboard;
