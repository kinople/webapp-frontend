import React, { useState, useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getApiUrl, fetchWithAuth } from "../utils/api";

const UserSettings = () => {
	const { user } = useParams();
	const location = useLocation();
	const [userData, setUserData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [currentSection, setCurrentSection] = useState("profile");

	useEffect(() => {
		if (location.state?.section) {
			setCurrentSection(location.state.section);
		}
	}, [location.state]);

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
	};

	if (!userData) return <div style={{ paddingLeft: "270px", paddingTop: "2rem" }}>User not found</div>;

	const renderProfileContent = () => (
		<div style={styles.card}>
			<div style={styles.cardHeader}>
				<h3 style={styles.cardTitle}>Profile</h3>
				<p style={styles.cardSubtitle}>Manage your personal information.</p>
			</div>
			<div>
				<div style={{ marginBottom: "16px" }}>
					<label style={styles.label}>Email</label>
					<input type="text" value={userData.email || ""} readOnly style={styles.input} />
				</div>
				<button style={styles.button}>Update Profile</button>
			</div>
		</div>
	);

	const renderInvitationsContent = () => (
		<div style={styles.card}>
			<div style={styles.cardHeader}>
				<h3 style={styles.cardTitle}>Invitations</h3>
				<p style={styles.cardSubtitle}>Manage your pending invitations.</p>
			</div>
			<table style={styles.table}>
				<thead style={styles.tableHead}>
					<tr>
						<th style={styles.tableHeaderCell}>Organization</th>
						<th style={styles.tableHeaderCell}>Invited</th>
						<th style={styles.tableHeaderCell}>Role</th>
						<th style={styles.tableHeaderCell}>Actions</th>
					</tr>
				</thead>
				<tbody>
					{/* Placeholder for pending invites */}
					<tr>
						<td colSpan="4" style={{ ...styles.tableCell, textAlign: "center" }}>
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
				<p>You are currently on the Free Plan.</p>
				<button style={{ ...styles.button, backgroundColor: "#6b7280" }}>Upgrade Plan</button>
			</div>
		</div>
	);

	if (loading) return <div style={{ paddingLeft: "270px", paddingTop: "2rem" }}>Loading user data...</div>;
	if (error) return <div style={{ paddingLeft: "270px", paddingTop: "2rem", color: "red" }}>Error: {error}</div>;
	if (!userData) {
		// console.log("user data : ::::::::::::::::::::::::::::::::::::::::::::::::; ",userData);
		return <div style={{ paddingLeft: "270px", paddingTop: "2rem" }}>User not found</div>;
	}

	return (
		<div style={styles.page}>
			<div style={styles.header}>
				<h1 style={styles.title}>User Settings</h1>
				<p style={styles.subtitle}>Manage your account settings.</p>
			</div>

			{currentSection === "profile" && renderProfileContent()}
			{currentSection === "invitations" && renderInvitationsContent()}
			{currentSection === "billing" && renderBillingContent()}
		</div>
	);
};

export default UserSettings;
