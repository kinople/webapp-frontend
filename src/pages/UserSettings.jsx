import React, { useState, useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getApiUrl, fetchWithAuth } from "../utils/api";
import "../css/UserSettings.css";

const UserSettings = () => {
	const { user } = useParams();
	const location = useLocation();
	const [projects, setProjects] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [currentSection, setCurrentSection] = useState("profile");
	const [userData, setUserData] = useState(null);

	useEffect(() => {
		if (location.state?.section) {
			setCurrentSection(location.state.section);
		}
	}, [location.state]);

	useEffect(() => {
		const fetchProjects = async () => {
			try {
				setLoading(true);
				const response = await fetchWithAuth(getApiUrl(`/api/projects/${user}`), { method: "GET" });

				if (!response.ok) throw new Error("Failed to fetch projects");

				const data = await response.json();

				if (data) {
					setProjects(data);
				}
			} catch (err) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		};

		fetchProjects();
	}, [user]);

	useEffect(() => {
		const fetchUserData = async () => {
			try {
				setLoading(true);
				const response = await fetchWithAuth(getApiUrl(`/api/user/${user}`), {
					method: "GET",
					credentials: "include",
					headers: {
						"Content-Type": "application/json",
					},
				});

				if (!response.ok) throw new Error("Failed to fetch user data");
				const data = await response.json();

				if (data) {
					setUserData(data);
				} else {
					throw new Error(data.message);
				}
			} catch (err) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		};

		fetchUserData();
	}, [user]);

	const renderProfileContent = () => {
		return (
			<>
				<div className="user-settings-card">
					<div className="user-settings-card-header">
						<div className="user-settings-card-header-left">
							<h3 className="user-settings-card-title">Profile</h3>
							<p className="user-settings-card-subtitle">Manage your personal information.</p>
						</div>
					</div>
					<div className="user-settings-form-group">
						<label className="user-settings-label">Email</label>
						<input type="text" value={userData?.email || ""} readOnly className="user-settings-input" />
					</div>
					<button className="user-settings-btn user-settings-btn-primary">Update Profile</button>
				</div>
				<div className="user-settings-card">
					<div className="user-settings-card-header">
						<div className="user-settings-card-header-left">
							<h3 className="user-settings-card-title">Active Projects</h3>
							<p className="user-settings-card-subtitle">{projects.length} active projects</p>
						</div>
					</div>
					<table className="user-settings-table">
						<thead className="user-settings-thead">
							<tr className="user-settings-header-row">
								<th className="user-settings-header-cell">Project Name</th>
								<th className="user-settings-header-cell">Type</th>
								<th className="user-settings-header-cell">Created</th>
							</tr>
						</thead>
						<tbody>
							{projects.length === 0 ? (
								<tr>
									<td colSpan="3" className="user-settings-empty-row">
										No projects found
									</td>
								</tr>
							) : (
								projects.map((p, idx) => (
									<tr key={idx} className="user-settings-data-row">
										<td className="user-settings-data-cell">{p.projectName}</td>
										<td className="user-settings-data-cell">{p.projectType}</td>
										<td className="user-settings-data-cell">{new Date(p.createTime).toLocaleDateString()}</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</>
		);
	};

	const renderInvitationsContent = () => (
		<div className="user-settings-card">
			<div className="user-settings-card-header">
				<div className="user-settings-card-header-left">
					<h3 className="user-settings-card-title">Invitations</h3>
					<p className="user-settings-card-subtitle">Manage your pending invitations.</p>
				</div>
			</div>
			<table className="user-settings-table">
				<thead className="user-settings-thead">
					<tr className="user-settings-header-row">
						<th className="user-settings-header-cell">Organization</th>
						<th className="user-settings-header-cell">Invited</th>
						<th className="user-settings-header-cell">Role</th>
						<th className="user-settings-header-cell">Actions</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td colSpan="4" className="user-settings-empty-row">
							No pending invites
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	);

	const renderBillingContent = () => (
		<div className="user-settings-card">
			<div className="user-settings-card-header">
				<div className="user-settings-card-header-left">
					<h3 className="user-settings-card-title">Billing</h3>
					<p className="user-settings-card-subtitle">Manage your subscription and view invoices.</p>
				</div>
			</div>
			<div className="user-settings-billing-info">
				<p>
					You are currently on the
					<span className="user-settings-billing-plan">Free Plan</span>
				</p>
			</div>
			<button className="user-settings-btn user-settings-btn-secondary">Upgrade Plan</button>
		</div>
	);

	if (loading) return <div className="user-settings-loading">Loading projects...</div>;
	if (error) return <div className="user-settings-error">Error: {error}</div>;

	return (
		<div className="user-settings-page">
			<div className="user-settings-header">
				<h1 className="user-settings-title">User Settings</h1>
				<p className="user-settings-subtitle">Manage your account settings.</p>
			</div>

			{currentSection === "profile" && renderProfileContent()}
			{currentSection === "invitations" && renderInvitationsContent()}
			{currentSection === "billing" && renderBillingContent()}
		</div>
	);
};

export default UserSettings;
