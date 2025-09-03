import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getApiUrl } from "../utils/api";
import { removeToken } from "../utils/auth";
import { fetchWithAuth } from "../utils/api";

const Navbar = () => {
	// Add CSS styles similar to Sidebar
	React.useEffect(() => {
		const style = document.createElement("style");
		style.textContent = `
      .nav-link {
        display: flex;
        align-items: center;
        padding: 10px 12px;
        border-radius: 8px;
        color: #FFFFFF;
        text-decoration: none;
        font-size: 15px;
        font-weight: 500;
        transition: background-color 0.2s ease-in-out;
        cursor: pointer;
        font-family: 'Inter', sans-serif;
      }

      .nav-link:hover {
        background-color: #4B9CD3;
        color: white;
      }

      .nav-link.active {
        background-color: #4B9CD3;
        color: white;
      }

      .nav-item {
        margin-bottom: 12px;
        list-style: none;
      }

      .nav-list {
        list-style: none;
        padding: 0 16px;
        margin: 0;
      }

      .nav-bottom {
        margin-top: auto;
        padding-bottom: 24px;
      }

      .icon-wrapper {
        margin-right: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .nav-link > div {
        display: flex;
        flex-direction: column;
      }
    `;
		document.head.appendChild(style);
		return () => document.head.removeChild(style);
	}, []);

	const location = useLocation();
	const navigate = useNavigate();

	// Extract user and id from pathname since useParams won't work here
	const getRouteParams = () => {
		const pathParts = location.pathname.split("/").filter((part) => part);
		return {
			user: pathParts[0] || null,
			id: pathParts[1] || null,
		};
	};

	const { user, id } = getRouteParams();
	const [showModal, setShowModal] = useState(false);
	const [userDetails, setUserDetails] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [loggingOut, setLoggingOut] = useState(false);

	// New state for organization dropdown
	const [showOrgDropdown, setShowOrgDropdown] = useState(false);
	const [organizations, setOrganizations] = useState([]);
	const [orgLoading, setOrgLoading] = useState(false);
	const [currentOrg, setCurrentOrg] = useState("Personal");

	// Add state for organization menu dropdown
	const [showOrgMenu, setShowOrgMenu] = useState(false);

	// Add state to track if we're in settings view
	const [isInSettings, setIsInSettings] = useState(false);
	const [isInOrgSetting, setisInOrgSetting] = useState(false);
	const [isInPersonalSetting, setisInPersonalSetting] = useState(false);
	const [isInProjectSetting, setIsInProjectSetting] = useState(false);

	// Add state for selected settings section
	const [selectedSettingsSection, setSelectedSettingsSection] = useState("general");

	// Add state for user dropdown
	const [showUserDropdown, setShowUserDropdown] = useState(false);

	// Add useEffect to detect if we're on an organization settings page
	useEffect(() => {
		const pathParts = location.pathname.split("/").filter((part) => part);
		const isOrgSettingsPath = pathParts.length >= 3 && pathParts[1] === "organizations" && pathParts[2];
		setIsInSettings(isOrgSettingsPath);

		// If we're on an organization settings page, set the current org
		if (isOrgSettingsPath && organizations.length > 0) {
			const orgId = pathParts[2];
			const org = organizations.find((o) => o.organization_id.toString() === orgId);
			if (org && currentOrg !== org.organizationname) {
				setCurrentOrg(org.organizationname);
			}
		}
	}, [location.pathname, organizations]);

	// Add useEffect to fetch user details on component mount
	useEffect(() => {
		if (user) {
			fetchUserDetails();
		}
	}, [user]);

	// Also load organizations when component mounts
	useEffect(() => {
		if (user && organizations.length === 0) {
			fetchOrganizations();
		}
	}, [user]);

	const fetchUserDetails = async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await fetchWithAuth(getApiUrl(`/api/user/${user}`), {
				method: "GET",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				throw new Error("Failed to fetch user details");
			}

			const data = await response.json();
			setUserDetails(data);
		} catch (err) {
			setError(err.message);
			console.error("Error fetching user details:", err);
		} finally {
			setLoading(false);
		}
	};

	// New function to fetch organizations
	const fetchOrganizations = async () => {
		try {
			setOrgLoading(true);
			const response = await fetchWithAuth(getApiUrl(`/api/${user}/organizations`), {
				method: "GET",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				throw new Error("Failed to fetch organizations");
			}

			const data = await response.json();
			if (data.status === "success") {
				setOrganizations(data.organizations);
			}
		} catch (err) {
			console.error("Error fetching organizations:", err);
			setOrganizations([]);
		} finally {
			setOrgLoading(false);
		}
	};

	const handleOrgDropdownClick = async () => {
		setShowOrgDropdown(!showOrgDropdown);
		if (!showOrgDropdown && organizations.length === 0) {
			await fetchOrganizations();
		}
	};

	const handleOrgSelect = (orgName, orgId = null) => {
		setCurrentOrg(orgName);
		setShowOrgDropdown(false);
		// Navigate to home page when organization is changed, passing org info
		navigate(`/${user}`, {
			state: {
				organizationId: orgId,
				organizationName: orgName,
			},
		});
	};

	const handleOrgMenuClick = () => {
		setShowOrgMenu(!showOrgMenu);
	};

	const handleCreateOrg = () => {
		setShowOrgMenu(false);
		// Navigate to create organization page
		navigate(`/${user}/create-organization`);
	};

	const handleLogout = async () => {
		try {
			setLoggingOut(true);

			// Optional: Call logout endpoint to invalidate token on server
			await fetchWithAuth(getApiUrl("/api/logout"), {
				method: "POST",
			});

			// Remove token from localStorage
			removeToken();

			// Close modal and redirect
			closeModal();
			navigate("/");
		} catch (error) {
			console.error("Logout error:", error);
			// Even if server call fails, remove token locally
			removeToken();
			closeModal();
			navigate("/");
		} finally {
			setLoggingOut(false);
		}
	};

	const handleUserIconClick = async () => {
		setShowModal(true);
		await fetchUserDetails();
	};

	const handleSettingsClick = () => {
		setIsInSettings(true);
		if (currentOrg === "Personal") {
			// Navigate to user settings page instead of showing modal

			setisInPersonalSetting(true);
			navigate(`/${user}/settings`);
		} else {
			// Navigate to specific organization settings page
			const orgId = organizations.find((org) => org.organizationname === currentOrg)?.organization_id;
			setisInOrgSetting(true);
			if (orgId) {
				//setisInOrgSetting(true);
				setIsInSettings(true);
				navigate(`/${user}/organizations/${orgId}`);
			}
		}
	};

	const handleBackFromSettings = () => {
		setIsInSettings(false);
		// Navigate back to organization home
		const orgId = organizations.find((org) => org.organizationname === currentOrg)?.organization_id;
		navigate(`/${user}`, {
			state: {
				organizationId: orgId,
				organizationName: currentOrg,
			},
		});
	};

	const closeModal = () => {
		setShowModal(false);
		setUserDetails(null);
		setError(null);
	};

	const handleUserDropdownClick = () => {
		setShowUserDropdown(!showUserDropdown);
	};

	return (
		<div style={styles.container}>
			<nav style={styles.sidebar}>
				{/* Logo/Header Section - Always show Kinople */}
				<div style={styles.logoSection}>
					<div
						style={{ ...styles.logo, cursor: "pointer" }}
						onClick={() => {
							if (isInSettings) {
								handleBackFromSettings();
							} else {
								const orgId =
									currentOrg === "Personal"
										? null
										: organizations.find((org) => org.organizationname === currentOrg)?.organization_id;
								navigate(`/${user}`, {
									state: {
										organizationId: orgId,
										organizationName: currentOrg,
									},
								});
							}
						}}
					>
						Kinople
					</div>
				</div>

				{/* Workspace/Organization/Settings Section */}
				<div style={styles.workspaceSection}>
					{isInSettings ? (
						// Show Settings header with back arrow
						<div
							style={{
								...styles.orgHeader,
								...styles.workspaceActive,
								cursor: "pointer",
							}}
							onClick={handleBackFromSettings}
						>
							<div style={styles.backButton} title="Back to organization">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="white">
									<path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
								</svg>
							</div>
							<div style={styles.orgTitle}>Settings</div>
						</div>
					) : currentOrg === "Personal" ? (
						// Show user workspace when Personal is selected
						<div
							style={{
								...styles.workspaceActive,
								cursor: "pointer",
							}}
							onClick={() => handleOrgSelect("Personal", null)}
						>
							<div style={styles.workspaceLabel}>
								{userDetails?.email ? `${userDetails.email}'s Workspace` : user ? `${user}'s Workspace` : "User's Workspace"}
							</div>
						</div>
					) : (
						// Show organization header with back arrow when org is selected
						<div
							style={{
								...styles.orgHeader,
								...styles.workspaceActive,
								cursor: "pointer",
							}}
							onClick={() => {
								const orgId = organizations.find((org) => org.organizationname === currentOrg)?.organization_id;
								handleOrgSelect("Personal", null);
								navigate(`/${user}`, {
									state: {
										organizationId: orgId,
										organizationName: currentOrg,
									},
								});
							}}
						>
							<div
								style={styles.backButton}
								onClick={(e) => {
									e.stopPropagation();
									handleOrgSelect("Personal", null);
								}}
								title="Back to workspace"
							>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="white">
									<path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
								</svg>
							</div>
							<div style={styles.orgTitle}>{currentOrg}</div>
						</div>
					)}
				</div>

				{/* Middle Section - Flexible space */}
				<div style={styles.middleSection}>
					{isInSettings ? (
						isInPersonalSetting ? (
							<h1>IN personal</h1>
						) : isInOrgSetting ? (
							<h1>in org </h1>
						) : (
							<ul className="nav-list">
								<li className="nav-item">
									<div
										className={`nav-link${selectedSettingsSection === "general" ? " active" : ""}`}
										onClick={() => {
											setSelectedSettingsSection("general");
											const orgId = organizations.find((org) => org.organizationname === currentOrg)?.organization_id;
											if (orgId) {
												navigate(`/${user}/organizations/${orgId}`, {
													state: { section: "general" },
												});
											}
										}}
									>
										General
									</div>
								</li>
								<li className="nav-item">
									<div
										className={`nav-link${selectedSettingsSection === "members" ? " active" : ""}`}
										onClick={() => {
											setSelectedSettingsSection("members");
											const orgId = organizations.find((org) => org.organizationname === currentOrg)?.organization_id;
											if (orgId) {
												navigate(`/${user}/organizations/${orgId}`, {
													state: { section: "members" },
												});
											}
										}}
									>
										Org Members
									</div>
								</li>
								<li className="nav-item">
									<div
										className={`nav-link${selectedSettingsSection === "billing" ? " active" : ""}`}
										onClick={() => {
											setSelectedSettingsSection("billing");
											const orgId = organizations.find((org) => org.organizationname === currentOrg)?.organization_id;
											if (orgId) {
												navigate(`/${user}/organizations/${orgId}`, {
													state: { section: "billing" },
												});
											}
										}}
									>
										Billing & Usage
									</div>
								</li>
							</ul>
						)
					) : (
						// Show Organizations Section when Personal is selected
						<div style={styles.organizationsContent}>
							<div style={styles.sectionHeader}>
								<span>Organizations</span>
								<div style={styles.orgMenuContainer}>
									<div style={styles.threeDots} onClick={handleOrgMenuClick} title="Organization options">
										<svg width="16" height="16" viewBox="0 0 24 24" fill="white">
											<circle cx="5" cy="12" r="2" />
											<circle cx="12" cy="12" r="2" />
											<circle cx="19" cy="12" r="2" />
										</svg>
									</div>

									{/* Dropdown menu */}
									{showOrgMenu && (
										<div style={styles.orgMenuDropdown}>
											<div style={styles.orgMenuItem} onClick={handleCreateOrg}>
												Create Org
											</div>
										</div>
									)}
								</div>
							</div>

							{/* Organization List */}
							<ul className="nav-list">
								{organizations.length > 0 ? (
									organizations.map((org) => (
										<li className="nav-item" key={org.organization_id}>
											<div className="nav-link" onClick={() => handleOrgSelect(org.organizationname, org.organization_id)}>
												{org.organizationname}
											</div>
										</li>
									))
								) : (
									<div style={styles.emptyOrgs}>No organizations yet</div>
								)}
							</ul>
						</div>
					) }
				</div>

				{/* Settings Section at Bottom - Always visible */}
				<div style={styles.settingsSection}>
					<ul className="nav-list nav-bottom">
						<li className="nav-item">
							<div className="nav-link" onClick={handleSettingsClick}>
								<span className="icon-wrapper">
									<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
										<path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
									</svg>
								</span>
								Settings
							</div>
						</li>

						{/* User Info Display with Dropdown */}
						<li className="nav-item">
							<div className="nav-link" onClick={handleUserDropdownClick}>
								<div>
									<div style={styles.userLabel}>User Name</div>
									<div style={styles.userEmailDisplay}>
										{loading ? "Loading..." : error ? "Error loading user" : userDetails?.email || user || "Email ID"}
									</div>
								</div>
							</div>

							{/* User Dropdown */}
							{showUserDropdown && (
								<ul className="nav-list" style={{ marginTop: "4px" }}>
									<li className="nav-item">
										<div className="nav-link" onClick={handleLogout}>
											{loggingOut ? "Logging out..." : "Logout"}
										</div>
									</li>
								</ul>
							)}
						</li>
					</ul>
				</div>
			</nav>

			{/* Keep the existing modal */}
			{showModal && (
				<div style={styles.modalOverlay} onClick={closeModal}>
					<div style={styles.modal} onClick={(e) => e.stopPropagation()}>
						<div style={styles.modalHeader}>
							<h3 style={styles.modalTitle}>User Details</h3>
							<button style={styles.closeButton} onClick={closeModal}>
								×
							</button>
						</div>
						<div style={styles.modalContent}>
							{loading ? (
								<div style={styles.loading}>Loading user details...</div>
							) : error ? (
								<div style={styles.error}>Error: {error}</div>
							) : userDetails ? (
								<div style={styles.userInfoModal}>
									<p>
										<strong>Username:</strong> {userDetails.email || user}
									</p>
								</div>
							) : (
								<div style={styles.userInfoModal}>
									<p>
										<strong>Username:</strong> {user}
									</p>
									<p>Loading user details...</p>
								</div>
							)}
							<div style={styles.modalActions}>
								<button style={loggingOut ? styles.buttonDisabled : styles.logoutButton} onClick={handleLogout} disabled={loggingOut}>
									{loggingOut ? "Logging out..." : "Logout"}
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
		height: "100vh",
		width: "240px",
		backgroundColor: "#2C3440",
		boxShadow: "2px 0 8px rgba(0,0,0,0.1)",
		borderLeft: "none",
		fontFamily: "'Inter', sans-serif",
		position: "fixed",
		top: 0,
		left: 0,
		zIndex: 100,
		display: "flex",
		flexDirection: "column",
	},
	sidebar: {
		width: "100%",
		height: "100%",
		display: "flex",
		flexDirection: "column",
	},
	logoSection: {
		padding: "1rem",
		borderBottom: "1px solid rgba(255,255,255,0.1)",
	},
	logo: {
		fontSize: "1.5rem",
		fontWeight: "bold",
		color: "white",
		textDecoration: "none",
		cursor: "pointer",
	},
	workspaceSection: {
		borderBottom: "1px solid rgba(255,255,255,0.1)",
		transition: "background-color 0.2s ease-in-out",
	},
	workspaceActive: {
		backgroundColor: "#4B9CD3",
		padding: "1rem",
		color: "white",
	},
	workspaceLabel: {
		fontSize: "15px",
		color: "#FFFFFF",
		fontWeight: "500",
	},

	// Add the missing middleSection style with flex: 1
	middleSection: {
		flex: 1,
		overflow: "auto",
		paddingTop: "24px",
	},
	organizationsContent: {
		padding: "0 16px",
	},
	sectionHeader: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: "12px",
		fontSize: "13px",
		fontWeight: "600",
		color: "rgba(255,255,255,0.7)",
		textTransform: "uppercase",
		letterSpacing: "0.5px",
	},
	userIconSmall: {
		width: "20px",
		height: "20px",
		borderRadius: "50%",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	orgList: {
		display: "flex",
		flexDirection: "column",
		gap: "12px",
		listStyle: "none",
		padding: 0,
		margin: 0,
	},
	orgItem: {
		padding: "10px 12px",
		borderRadius: "8px",
		cursor: "pointer",
		fontSize: "15px",
		fontWeight: "500",
		color: "#FFFFFF",
		transition: "background-color 0.2s ease-in-out",
		textDecoration: "none",
		display: "flex",
		alignItems: "center",
		"&:hover": {
			backgroundColor: "#4B9CD3",
			color: "white",
		},
	},
	orgItemActive: {
		backgroundColor: "#4B9CD3",
		color: "white",
	},
	settingsSection: {
		marginTop: "auto",
		paddingBottom: "24px",
		borderTop: "1px solid rgba(255,255,255,0.1)",
	},
	settingsButton: {
		display: "flex",
		alignItems: "center",
		gap: "12px",
		padding: "10px 12px",
		borderRadius: "8px",
		cursor: "pointer",
		fontSize: "15px",
		fontWeight: "500",
		color: "#FFFFFF",
		transition: "background-color 0.2s ease-in-out",
		marginBottom: "12px",
		"&:hover": {
			backgroundColor: "#4B9CD3",
			color: "white",
		},
	},

	// Update userInfo to be clickable
	userInfoContainer: {
		position: "relative",
	},
	userInfo: {
		padding: "10px 12px",
		cursor: "pointer",
		borderRadius: "8px",
		transition: "background-color 0.2s ease-in-out",
		"&:hover": {
			backgroundColor: "#4B9CD3",
			color: "white",
		},
	},
	userLabel: {
		fontSize: "12px",
		color: "rgba(255,255,255,0.7)",
		fontWeight: "400",
		marginBottom: "2px",
	},
	userEmailDisplay: {
		fontSize: "14px",
		color: "#FFFFFF",
		fontWeight: "500",
	},

	// Keep existing modal styles
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
		zIndex: 1001,
	},
	modal: {
		backgroundColor: "white",
		borderRadius: "8px",
		width: "90%",
		maxWidth: "400px",
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
	},
	loading: {
		textAlign: "center",
		color: "#666",
		padding: "1rem",
	},
	error: {
		textAlign: "center",
		color: "#dc3545",
		padding: "1rem",
	},
	userInfoModal: {
		marginBottom: "1.5rem",
		color: "#333",
	},
	modalActions: {
		display: "flex",
		gap: "1rem",
		justifyContent: "flex-end",
	},
	logoutButton: {
		padding: "0.5rem 1rem",
		backgroundColor: "#dc3545",
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
	emptyOrgs: {
		padding: "1rem",
		color: "rgba(255,255,255,0.6)",
		fontSize: "0.85rem",
		fontStyle: "italic",
		textAlign: "center",
	},
	orgMenuContainer: {
		position: "relative",
	},
	threeDots: {
		width: "20px",
		height: "20px",
		borderRadius: "4px",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		cursor: "pointer",
		transition: "background-color 0.2s",
		"&:hover": {
			backgroundColor: "rgba(255,255,255,0.1)",
		},
	},
	orgMenuDropdown: {
		position: "absolute",
		top: "100%",
		right: 0,
		backgroundColor: "white",
		border: "1px solid #ddd",
		borderRadius: "4px",
		boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
		zIndex: 1000,
		marginTop: "4px",
		minWidth: "120px",
	},
	orgMenuItem: {
		padding: "0.75rem 1rem",
		color: "#333",
		cursor: "pointer",
		fontSize: "0.9rem",
		transition: "background-color 0.2s",
		"&:hover": {
			backgroundColor: "#f5f5f5",
		},
	},

	// Organization header styles
	orgHeader: {
		display: "flex",
		alignItems: "center",
		gap: "0.5rem",
	},
	backButton: {
		width: "24px",
		height: "24px",
		borderRadius: "4px",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		cursor: "pointer",
		transition: "background-color 0.2s",
	},
	orgTitle: {
		fontSize: "0.9rem",
		fontWeight: "500",
		color: "rgba(255,255,255,0.8)",
		flex: 1,
	},

	// Add new styles for settings menu
	settingsMenu: {
		padding: "1rem",
	},
	settingsMenuItem: {
		padding: "0.75rem 1rem",
		borderRadius: "8px",
		cursor: "pointer",
		fontSize: "0.9rem",
		marginBottom: "0.25rem",
		transition: "background-color 0.2s",
		border: "2px solid transparent",
	},
	settingsMenuItemActive: {
		backgroundColor: "rgba(75, 156, 211, 0.2)",
		border: "2px solid #4B9CD3",
		color: "#4B9CD3",
		fontWeight: "600",
	},

	// Add dropdown styles
	userDropdown: {
		position: "absolute",
		bottom: "100%",
		left: 0,
		right: 0,
		backgroundColor: "#2C3440",
		border: "1px solid rgba(255,255,255,0.1)",
		borderRadius: "8px",
		boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
		zIndex: 1000,
		marginBottom: "4px",
	},
	userDropdownItem: {
		padding: "10px 12px",
		color: "#FFFFFF",
		cursor: "pointer",
		fontSize: "15px",
		fontWeight: "500",
		transition: "background-color 0.2s ease-in-out",
		borderRadius: "8px",
		"&:hover": {
			backgroundColor: "#4B9CD3",
			color: "white",
		},
	},
};

export default Navbar;
