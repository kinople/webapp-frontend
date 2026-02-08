import React, { useState, useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getApiUrl, fetchWithAuth } from "../utils/api";
import "../css/OrganizationDashboard.css";

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

	const renderGeneralContent = () => {
		const activeProjects = organization.projects?.filter((p) => !p.deletetime) || [];
		const archivedProjects = organization.projects?.filter((p) => p.deletetime) || [];

		return (
			<div className="org-card org-card-flex">
				<div className="org-card-header">
					<h3 className="org-card-title">General Settings</h3>
					<p className="org-card-subtitle">View your organization's details.</p>
				</div>
				<div className="org-input-wrapper">
					<label className="org-label">Organization Name</label>
					<input type="text" value={organization.organizationname || ""} readOnly className="org-input" />
				</div>

				<div className="org-card-header">
					<h3 className="org-card-title">Active Projects</h3>
					<p className="org-card-subtitle">{activeProjects.length} active projects</p>
				</div>
				<table className="org-table">
					<thead className="org-table-head">
						<tr>
							<th className="org-table-header-cell">Project Name</th>
							<th className="org-table-header-cell">Type</th>
							<th className="org-table-header-cell">Created</th>
						</tr>
					</thead>
					<tbody>
						{activeProjects.map((p, idx) => (
							<tr key={idx} className="org-table-row">
								<td className="org-table-cell">{p.projectname}</td>
								<td className="org-table-cell">{p.projecttype}</td>
								<td className="org-table-cell">{new Date(p.createtime).toLocaleDateString()}</td>
							</tr>
						))}
					</tbody>
				</table>

				<div className="org-card-header org-card-header-mt">
					<h3 className="org-card-title">Archived Projects</h3>
					<p className="org-card-subtitle">{archivedProjects.length} archived projects</p>
				</div>
				<table className="org-table">
					<thead className="org-table-head">
						<tr>
							<th className="org-table-header-cell">Project Name</th>
							<th className="org-table-header-cell">Type</th>
							<th className="org-table-header-cell">Archived On</th>
						</tr>
					</thead>
					<tbody>
						{archivedProjects.map((p, idx) => (
							<tr key={idx} className="org-table-row">
								<td className="org-table-cell">{p.projectname}</td>
								<td className="org-table-cell">{p.projecttype}</td>
								<td className="org-table-cell">{new Date(p.deletetime).toLocaleDateString()}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	};

	const renderMembersContent = () => (
		<>
			<div className="org-card">
				<div className="org-card-header org-card-header-flex">
					<div>
						<h3 className="org-card-title">Active Members</h3>
						<p className="org-card-subtitle">{organization.members?.length || 0} active members</p>
					</div>
					<button onClick={handleAddMemberClick} className="org-button">
						+ Invite Member
					</button>
				</div>
				<table className="org-table">
					<thead className="org-table-head">
						<tr>
							<th className="org-table-header-cell">User</th>
							<th className="org-table-header-cell">Joined</th>
							<th className="org-table-header-cell">Role</th>
							<th className="org-table-header-cell">Projects</th>
						</tr>
					</thead>
					<tbody>
						{organization.members?.map((m, idx) => (
							<tr key={idx} className="org-table-row">
								<td className="org-table-cell">{m.username}</td>
								<td className="org-table-cell">{new Date(m.createtime).toLocaleDateString()}</td>
								<td className="org-table-cell">{m.role_name === "Owner" ? "Admin" : m.role_name}</td>
								<td className="org-table-cell">{m.projects || 0}</td>
							</tr>
						))}
					</tbody>
				</table>
				<div className="org-card-header org-card-header-flex org-card-header-mt">
					<div>
						<h3 className="org-card-title">Pending Invites</h3>
						<p className="org-card-subtitle">0 pending invites</p>
					</div>
				</div>
				<table className="org-table">
					<thead className="org-table-head">
						<tr>
							<th className="org-table-header-cell">User</th>
							<th className="org-table-header-cell">Invited</th>
							<th className="org-table-header-cell">Role</th>
						</tr>
					</thead>
					<tbody>
						{/* Placeholder for pending invites */}
						<tr>
							<td colSpan="3" className="org-table-cell org-table-cell-center">
								No pending invites
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<button className="org-leave-button">Leave Organisation</button>
		</>
	);

	const renderBillingContent = () => (
		<div className="org-card">
			<div className="org-card-header">
				<h3 className="org-card-title">Billing</h3>
				<p className="org-card-subtitle">Manage your subscription and view invoices.</p>
			</div>
			<div>
				<p>Active Projects: {organization.projects?.length || 0}</p>
				<table className="org-table">
					<thead className="org-table-head">
						<tr>
							<th className="org-table-header-cell">Project Name</th>
							<th className="org-table-header-cell">Type</th>
							<th className="org-table-header-cell">Plan</th>
							<th className="org-table-header-cell">Date of Purchase</th>
							<th className="org-table-header-cell">Date of Expiry</th>
						</tr>
					</thead>
					<tbody>
						{organization.projects?.map((p, idx) => (
							<tr key={idx} className="org-table-row">
								<td className="org-table-cell">{p.projectname}</td>
								<td className="org-table-cell">{p.projecttype}</td>
								<td className="org-table-cell">-</td>
								<td className="org-table-cell">{new Date(p.createtime).toLocaleDateString()}</td>
								<td className="org-table-cell">-</td>
							</tr>
						))}
					</tbody>
				</table>
				<p>No enterprise plan opted for this organization</p>
				<button className="org-button org-button-gray">Contact Support</button>
			</div>
		</div>
	);

	if (loading) return <div className="org-loading">Loading organization...</div>;
	if (error) return <div className="org-error">Error: {error}</div>;
	if (!organization) return <div className="org-loading">Organization not found</div>;

	return (
		<div className="org-page">
			<div className="org-header">
				<h1 className="org-title">{organization.organizationname}</h1>
				<p className="org-subtitle">Manage your organization settings and members.</p>
			</div>

			{currentSection === "general" && renderGeneralContent()}
			{currentSection === "members" && renderMembersContent()}
			{currentSection === "billing" && renderBillingContent()}

			{showAddMemberModal && (
				<div className="org-modal-overlay">
					<div className="org-modal">
						<div className="org-modal-header">
							<h3 className="org-modal-title">Invite New Member</h3>
							<button onClick={handleCloseModal} className="org-close-button">
								&times;
							</button>
						</div>
						<form onSubmit={handleAddMemberSubmit}>
							<div className="org-modal-body">
								<div className="org-input-wrapper-modal">
									<label className="org-label">Username or Email</label>
									<input
										type="text"
										name="username"
										value={memberFormData.username}
										onChange={handleMemberInputChange}
										required
										className="org-input"
										placeholder="Enter username or email"
									/>
								</div>
								<div>
									<label className="org-label">Role</label>
									<select name="role_id" value={memberFormData.role_id} onChange={handleMemberInputChange} className="org-input">
										<option value={1}>Admin</option>
										<option value={2}>Member</option>
									</select>
								</div>
							</div>
							<div className="org-modal-footer">
								<button type="button" onClick={handleCloseModal} className="org-cancel-button">
									Cancel
								</button>
								<button type="submit" disabled={addMemberLoading} className="org-button">
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
