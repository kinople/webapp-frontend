import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getApiUrl } from "../utils/api";
import { removeToken } from "../utils/auth";
import { fetchWithAuth } from "../utils/api";
import { toggleNavbar } from "../redux/reducers/uiSlice";
import { setCurrentOrganization, setOrganizations as setOrganizationsAction } from "../redux/reducers/organizationSlice";
import { PiGear, PiUsersThree, PiSignOut, PiCaretDown, PiSidebarSimple, PiPlus, PiUser, PiX } from "react-icons/pi";
import logoIcon from "../assets/logo-icon.svg";
import "../css/Navbar.css";

const Navbar = () => {
	const location = useLocation();
	const navigate = useNavigate();
	const dispatch = useDispatch();
	const navbarCollapsed = useSelector((state) => state.ui.navbarCollapsed);

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
	
	// Get current organization from Redux
	const currentOrganization = useSelector((state) => state.organization.currentOrganization);
	const currentOrg = currentOrganization.name;

	// Get the current user's role in the current organization (1=Owner, 2=Member, 3=Viewer)
	const getCurrentUserOrgRole = () => {
		if (!currentOrganization.id || organizations.length === 0) return null;
		const org = organizations.find(o => o.organization_id === currentOrganization.id);
		return org?.user_role_id || null;
	};
	const currentUserOrgRole = getCurrentUserOrgRole();

	// Add state for organization menu dropdown

	// Add state to track if we're in settings view
	const [isInSettings, setIsInSettings] = useState(false);
	const [isInOrgSetting, setIsInOrgSetting] = useState(false);
	const [isInPersonalSetting, setIsInPersonalSetting] = useState(false);
	const [isInProjectSetting, setIsInProjectSetting] = useState(false);

	// Add state for selected settings section
	const [selectedSettingsSection, setSelectedSettingsSection] = useState("general");

	// Add state for user dropdown
	const [showUserDropdown, setShowUserDropdown] = useState(false);

	// Add state for New Project modal
	const [showNewProjectModal, setShowNewProjectModal] = useState(false);
	const [newProjectForm, setNewProjectForm] = useState({
		projectName: "",
		projectType: "",
	});
	const [addAllMembers, setAddAllMembers] = useState(false);
	// Team members - starts empty, populated from org members or user search
	const [teamMembers, setTeamMembers] = useState([]);
	const [creatingProject, setCreatingProject] = useState(false);
	const [createProjectError, setCreateProjectError] = useState("");

	// State for New Organization modal
	const [showNewOrgModal, setShowNewOrgModal] = useState(false);
	const [newOrgName, setNewOrgName] = useState("");
	// Organization members - starts empty, populated from user search
	const [orgMembers, setOrgMembers] = useState([]);
	const [creatingOrg, setCreatingOrg] = useState(false);
	const [createOrgError, setCreateOrgError] = useState("");

	// State for Add Member popup (shared between project and org modals)
	const [showAddMemberPopup, setShowAddMemberPopup] = useState(false);
	const [addMemberContext, setAddMemberContext] = useState(null); // 'project' or 'org'
	const [memberSearchQuery, setMemberSearchQuery] = useState("");
	const [memberSearchResults, setMemberSearchResults] = useState([]);
	const [memberSearchLoading, setMemberSearchLoading] = useState(false);
	const [selectedMemberRole, setSelectedMemberRole] = useState(2); // Default to Member role

	// Add useEffect to detect if we're on a settings page
	useEffect(() => {
		const pathParts = location.pathname.split("/").filter((part) => part);
		const isOrgSettingsPath = pathParts.length >= 3 && pathParts[1] === "organizations" && pathParts[2];
		const isPersonalSettingsPath = pathParts.length >= 2 && pathParts[1] === "settings";

		setIsInOrgSetting(isOrgSettingsPath);

		setIsInPersonalSetting(isPersonalSettingsPath);
		setIsInSettings(isOrgSettingsPath || isPersonalSettingsPath);

		if (isOrgSettingsPath && organizations.length > 0) {
			const orgId = pathParts[2];
			const org = organizations.find((o) => o.organization_id.toString() === orgId);
			if (org && currentOrg !== org.organizationname) {
				dispatch(setCurrentOrganization({ id: org.organization_id, name: org.organizationname }));
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
		if (user) {
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
			console.log("userDetails: ", data);
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
		// Update Redux store with selected organization
		dispatch(setCurrentOrganization({ id: orgId, name: orgName }));
		setShowOrgDropdown(false);
		// Navigate to home page when organization is changed
		navigate(`/${user}`);
	};

	const handleCreateOrg = () => {
		// Show the new organization modal
		setShowNewOrgModal(true);
		setShowOrgDropdown(false);
	};

	const handleCloseNewOrgModal = () => {
		setShowNewOrgModal(false);
		setNewOrgName("");
		setOrgMembers([]);
		setCreateOrgError("");
	};

	const handleRemoveOrgMember = (id) => {
		setOrgMembers(orgMembers.filter((member) => member.id !== id));
	};

	const handleAddOrgMember = () => {
		setAddMemberContext('org');
		setShowAddMemberPopup(true);
		setMemberSearchQuery("");
		setMemberSearchResults([]);
		setSelectedMemberRole(2);
	};

	// Search for users by email
	const searchUsers = async (query) => {
		if (!query || query.length < 2) {
			setMemberSearchResults([]);
			return;
		}

		setMemberSearchLoading(true);
		try {
			const response = await fetchWithAuth(getApiUrl(`/api/${user}/users/search?q=${encodeURIComponent(query)}`), {
				method: "GET",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (response.ok) {
				const data = await response.json();
				if (data.status === "success") {
					// Filter out users already in the member list and the current user
					const existingIds = addMemberContext === 'project' 
						? teamMembers.map(m => m.id)
						: orgMembers.map(m => m.id);
					const filteredUsers = data.users.filter(u => 
						!existingIds.includes(u.user_id) && 
						u.username !== user && 
						u.email !== user
					);
					setMemberSearchResults(filteredUsers);
				}
			}
		} catch (err) {
			console.error("Error searching users:", err);
		} finally {
			setMemberSearchLoading(false);
		}
	};

	// Handle search input change with debounce
	const handleMemberSearchChange = (e) => {
		const query = e.target.value;
		setMemberSearchQuery(query);
		// Simple debounce - search after typing stops
		clearTimeout(window.memberSearchTimeout);
		window.memberSearchTimeout = setTimeout(() => {
			searchUsers(query);
		}, 300);
	};

	// Add selected user to member list
	const handleSelectMember = (selectedUser) => {
		const newMember = {
			id: selectedUser.user_id,
			email: selectedUser.email || selectedUser.username,
			role: selectedMemberRole === 1 ? "Owner" : selectedMemberRole === 2 ? "Member" : "Viewer",
			role_id: selectedMemberRole
		};

		if (addMemberContext === 'project') {
			setTeamMembers([...teamMembers, newMember]);
		} else {
			setOrgMembers([...orgMembers, newMember]);
		}

		// Close popup and reset
		setShowAddMemberPopup(false);
		setMemberSearchQuery("");
		setMemberSearchResults([]);
	};

	const handleCloseAddMemberPopup = () => {
		setShowAddMemberPopup(false);
		setMemberSearchQuery("");
		setMemberSearchResults([]);
		setAddMemberContext(null);
	};

	const handleCreateOrganization = async () => {
		// Validate form
		if (!newOrgName.trim()) {
			setCreateOrgError("Please enter an organization name");
			return;
		}

		setCreatingOrg(true);
		setCreateOrgError("");

		try {
			// Prepare data according to backend expectations
			const requestData = {
				organizationname: newOrgName.trim(),
				organizationdetails: {
					description: "",
				},
			};

			const response = await fetchWithAuth(getApiUrl(`/api/${user}/organizations`), {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestData),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Failed to create organization");
			}

			const data = await response.json();

			if (data.status === "success") {
				const newOrgId = data.organization.organization_id;

				// Add selected members to the newly created organization
				if (orgMembers.length > 0) {
					for (const member of orgMembers) {
						try {
							await fetchWithAuth(getApiUrl(`/api/${user}/organizations/${newOrgId}/members`), {
								method: "POST",
								credentials: "include",
								headers: {
									"Content-Type": "application/json",
								},
								body: JSON.stringify({
									username: member.email,
									role_id: member.role_id || 2
								}),
							});
						} catch (memberErr) {
							console.error(`Failed to add member ${member.email}:`, memberErr);
							// Continue adding other members even if one fails
						}
					}
				}

				// Success - close modal, refresh organizations, and navigate
				handleCloseNewOrgModal();
				await fetchOrganizations();
				// Set the newly created organization as current
				if (data.organization) {
					dispatch(setCurrentOrganization({ 
						id: data.organization.organization_id, 
						name: data.organization.organizationname 
					}));
				}
				navigate(`/${user}`, {
					state: {
						create_org: "success",
						refreshKey: Date.now(),
					},
				});
			} else {
				throw new Error(data.message || "Failed to create organization");
			}
		} catch (err) {
			setCreateOrgError(err.message || "Failed to create organization. Please try again.");
		} finally {
			setCreatingOrg(false);
		}
	};

	const handleNewProject = async () => {
		// Show the new project modal
		setShowNewProjectModal(true);
		setTeamMembers([]); // Reset members
		
		// If in an organization context, fetch organization members
		if (currentOrganization.id) {
			try {
				const response = await fetchWithAuth(getApiUrl(`/api/${user}/organizations/${currentOrganization.id}`), {
					method: "GET",
					credentials: "include",
					headers: {
						"Content-Type": "application/json",
					},
				});

				if (response.ok) {
					const data = await response.json();
					if (data.status === "success" && data.organization.members) {
						// Convert org members to team members format
						const members = data.organization.members.map(m => ({
							id: m.user_id,
							email: m.username,
							role: m.role_name || "Member",
							role_id: m.role_id || 2
						}));
						setTeamMembers(members);
						setAddAllMembers(true); // Auto-check "Add all members" since we loaded org members
					}
				}
			} catch (err) {
				console.error("Error fetching organization members:", err);
			}
		}
	};

	const handleCloseNewProjectModal = () => {
		setShowNewProjectModal(false);
		setNewProjectForm({ projectName: "", projectType: "" });
		setAddAllMembers(false);
		setTeamMembers([]);
		setCreateProjectError("");
	};

	const handleNewProjectFormChange = (e) => {
		setNewProjectForm({
			...newProjectForm,
			[e.target.name]: e.target.value,
		});
	};

	const handleRemoveTeamMember = (id) => {
		setTeamMembers(teamMembers.filter((member) => member.id !== id));
	};

	const handleAddMember = () => {
		setAddMemberContext('project');
		setShowAddMemberPopup(true);
		setMemberSearchQuery("");
		setMemberSearchResults([]);
		setSelectedMemberRole(2);
	};

	const handleCreateProject = async () => {
		// Validate form
		if (!newProjectForm.projectName.trim()) {
			setCreateProjectError("Please enter a project name");
			return;
		}
		if (!newProjectForm.projectType) {
			setCreateProjectError("Please select a project type");
			return;
		}

		setCreatingProject(true);
		setCreateProjectError("");

		try {
			// Get the current organization ID from Redux
			const organizationId = currentOrganization.id;

			// Prepare the request body with members
			const requestBody = {
				projectName: newProjectForm.projectName,
				projectType: newProjectForm.projectType,
				...(organizationId && { organizationId }),
				members: teamMembers.map(m => ({
					id: m.id,
					role_id: m.role_id || 2
				})),
			};

			const response = await fetch(getApiUrl(`/api/create-project/${user}`), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || "Failed to create project");
			}

			// Success - close modal and navigate to home
			handleCloseNewProjectModal();
			navigate(`/${user}`, {
				state: {
					refreshKey: Date.now(), // Force re-fetch of projects
				},
			});
		} catch (err) {
			setCreateProjectError(err.message || "Failed to create project. Please try again.");
		} finally {
			setCreatingProject(false);
		}
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
		if (currentOrg === "Personal") {
			navigate(`/${user}/settings`);
		} else {
			const orgId = organizations.find((org) => org.organizationname === currentOrg)?.organization_id;
			if (orgId) {
				navigate(`/${user}/organizations/${orgId}`);
			}
		}
	};

	const handleOrganizationClick = () => {
		// Navigate to organization management
		navigate(`/${user}/organizations`);
	};

	const handleBackFromSettings = () => {
		setIsInSettings(false);
		// Navigate back to home - organization is already in Redux
		navigate(`/${user}`);
	};

	const closeModal = () => {
		setShowModal(false);
		setUserDetails(null);
		setError(null);
	};

	const handleUserDropdownClick = () => {
		setShowUserDropdown(!showUserDropdown);
	};

	useEffect(() => {
		const create_org = location.state?.create_org || "";
		if (create_org === "success") {
			fetchOrganizations();
			// Reset the state to avoid re-fetching on subsequent re-renders
			navigate(location.pathname, { replace: true });
		}
	}, [location.state]);

	// Get the first letter of current organization for badge
	const getOrgBadgeLetter = () => {
		if (currentOrg === "Personal") {
			return userDetails?.email?.charAt(0).toUpperCase() || user?.charAt(0).toUpperCase() || "P";
		}
		return currentOrg.charAt(0).toUpperCase();
	};

	const handleToggleNavbar = () => {
		dispatch(toggleNavbar());
	};

	return (
		<div className={`navbar-container${navbarCollapsed ? " collapsed" : ""}`}>
			<nav className="navbar-sidebar">
				{/* Header Section */}
				<div className="navbar-header">
					<img
						src={logoIcon}
						alt="Kinople"
						className="navbar-logo-icon"
						onClick={() => {
							if (isInSettings) {
								handleBackFromSettings();
							} else {
								navigate(`/${user}`);
							}
						}}
						style={{ cursor: "pointer" }}
					/>
					{!navbarCollapsed && (
						<span
							className="navbar-logo-text"
							onClick={() => {
								if (isInSettings) {
									handleBackFromSettings();
								} else {
									navigate(`/${user}`);
								}
							}}
						>
							Kinople
						</span>
					)}
					<PiSidebarSimple className={`navbar-sidebar-toggle${navbarCollapsed ? " collapsed" : ""}`} onClick={handleToggleNavbar} />
				</div>

				{/* New Project Button */}
				{!navbarCollapsed && (
					<div className="navbar-new-project-wrapper">
						<div className="navbar-new-project-button" onClick={handleNewProject}>
							<PiPlus className="navbar-new-project-icon" />
							<span className="navbar-new-project-text">New Project</span>
						</div>
					</div>
				)}

				{/* Organization Selector */}
				{!navbarCollapsed && (
					<div className="navbar-org-selector-container">
						<div className="navbar-org-selector" onClick={handleOrgDropdownClick}>
							<div className="navbar-org-badge">
								<span className="navbar-org-badge-text">{getOrgBadgeLetter()}</span>
							</div>
							<div className="navbar-org-name-wrapper">
								<span className="navbar-org-name">{currentOrg === "Personal" ? "Personal workspace" : ((currentOrg.length > 15) ? currentOrg.substring(0, 15) + "..." : currentOrg)}</span>
								<PiCaretDown className="navbar-org-caret" />
							</div>
						</div>

						{/* Organization Dropdown */}
						{showOrgDropdown && (
							<div className="navbar-org-dropdown">
								{/* Personal Workspace */}
								<div className="navbar-org-dropdown-item" onClick={() => handleOrgSelect("Personal", null)}>
									<div className="navbar-org-dropdown-badge">
										<span className="navbar-org-dropdown-badge-text">
											{userDetails?.email?.charAt(0).toUpperCase() || user?.charAt(0).toUpperCase() || "P"}
										</span>
									</div>
									<span className="navbar-org-dropdown-name">{"Personal workspace"}</span>
								</div>
								{/* Organizations */}
								{organizations.map((org) => (
									<div
										key={org.organization_id}
										className="navbar-org-dropdown-item"
										onClick={() => handleOrgSelect(org.organizationname, org.organization_id)}
									>
										<div className="navbar-org-dropdown-badge">
											<span className="navbar-org-dropdown-badge-text">{org.organizationname.charAt(0).toUpperCase()}</span>
										</div>
										<span className="navbar-org-dropdown-name">{org.organizationname}</span>
									</div>
								))}
								{/* New Organization */}
								<div className="navbar-org-dropdown-new" onClick={handleCreateOrg}>
									<PiPlus className="navbar-org-dropdown-new-icon" />
									<span className="navbar-org-dropdown-new-text">New Organization</span>
								</div>
							</div>
						)}
					</div>
				)}

				{/* Menu Section */}
				{!navbarCollapsed &&
					(isInSettings ? (
						// Settings Menu
						<div className="navbar-menu-section">
							{isInPersonalSetting ? (
								<>
									<div
										className={`navbar-settings-menu-item${selectedSettingsSection === "profile" ? " active" : ""}`}
										onClick={() => {
											setSelectedSettingsSection("profile");
											navigate(`/${user}/settings`, {
												state: { section: "profile" },
											});
										}}
									>
										Profile
									</div>
									<div
										className={`navbar-settings-menu-item${selectedSettingsSection === "invitations" ? " active" : ""}`}
										onClick={() => {
											setSelectedSettingsSection("invitations");
											navigate(`/${user}/settings`, {
												state: { section: "invitations" },
											});
										}}
									>
										Invitations
									</div>
									<div
										className={`navbar-settings-menu-item${selectedSettingsSection === "billing" ? " active" : ""}`}
										onClick={() => {
											setSelectedSettingsSection("billing");
											navigate(`/${user}/settings`, {
												state: { section: "billing" },
											});
										}}
									>
										Billing & Usage
									</div>
								</>
							) : isInOrgSetting ? (
								<>
									<div
										className={`navbar-settings-menu-item${selectedSettingsSection === "general" ? " active" : ""}`}
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
									<div
										className={`navbar-settings-menu-item${selectedSettingsSection === "members" ? " active" : ""}`}
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
									<div
										className={`navbar-settings-menu-item${selectedSettingsSection === "billing" ? " active" : ""}`}
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
								</>
							) : null}
						</div>
					) : (
						// Regular Menu
						<div className="navbar-menu-section">
							<div className="navbar-menu-item" onClick={handleSettingsClick}>
								<PiGear className="navbar-menu-icon" />
								<span className="navbar-menu-text">Settings</span>
							</div>
							{currentOrg === "Personal" && (
							<Link to={`/${user}/settings`} className="navbar-menu-item" style={{ textDecoration: 'none' }}>
								<PiUser className="navbar-menu-icon" />
								<span className="navbar-menu-text">Profile</span>
							</Link>
						)}
						</div>
					))}

				{/* Spacer */}
				<div className="navbar-spacer"></div>

				{/* Log Out */}
				{!navbarCollapsed && (
					<div className="navbar-logout" onClick={handleLogout}>
						<PiSignOut className="navbar-logout-icon" />
						<span className="navbar-logout-text">{loggingOut ? "Logging out..." : "Log Out"}</span>
					</div>
				)}
			</nav>

			{/* Keep the existing modal */}
			{showModal && (
				<div className="navbar-modal-overlay" onClick={closeModal}>
					<div className="navbar-modal" onClick={(e) => e.stopPropagation()}>
						<div className="navbar-modal-header">
							<h3 className="navbar-modal-title">User Details</h3>
							<button className="navbar-close-button" onClick={closeModal}>
								×
							</button>
						</div>
						<div className="navbar-modal-content">
							{loading ? (
								<div className="navbar-loading">Loading user details...</div>
							) : error ? (
								<div className="navbar-error">Error: {error}</div>
							) : userDetails ? (
								<div className="navbar-user-info-modal">
									<p>
										<strong>Username:</strong> {userDetails.email || user}
									</p>
								</div>
							) : (
								<div className="navbar-user-info-modal">
									<p>
										<strong>Username:</strong> {user}
									</p>
									<p>Loading user details...</p>
								</div>
							)}
							<div className="navbar-modal-actions">
								<button
									className={loggingOut ? "navbar-button-disabled" : "navbar-logout-button"}
									onClick={handleLogout}
									disabled={loggingOut}
								>
									{loggingOut ? "Logging out..." : "Logout"}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* New Project Modal */}
			{showNewProjectModal && (
				<div className="navbar-modal-overlay" onClick={handleCloseNewProjectModal}>
					<div className="new-project-modal" onClick={(e) => e.stopPropagation()}>
						<div className="new-project-content">
							{/* Title */}
							<div className="new-project-title-section">
								<h2 className="new-project-title">New Project</h2>
							</div>

							{/* Form Fields */}
							<div className="new-project-form">
								{/* Name Input */}
								<div className="new-project-field">
									<label className="new-project-label">Name of the project</label>
									<input
										type="text"
										name="projectName"
										value={newProjectForm.projectName}
										onChange={handleNewProjectFormChange}
										placeholder="Name your project..."
										className="new-project-input"
									/>
								</div>

								{/* Type Dropdown */}
								<div className="new-project-field">
									<label className="new-project-label">Type of project</label>
									<div className="new-project-select-wrapper">
										<select
											name="projectType"
											value={newProjectForm.projectType}
											onChange={handleNewProjectFormChange}
											className="new-project-select"
										>
											<option value="" disabled>
												Select type of project
											</option>
											<option value="Film">Film</option>
											<option value="Episodic">Episodic</option>
										</select>
									</div>
								</div>
							</div>

							{/* Add Team Members Section */}
							<div className="new-project-team-section">
								<div className="new-project-team-header">
									<span className="new-project-label">Add team members</span>
									<button className="new-project-add-member-btn" onClick={handleAddMember}>
										<PiPlus className="new-project-add-member-icon" />
										<span>Add Member</span>
									</button>
								</div>

								{/* Members Box */}
								<div className="new-project-members-box">
									<p className="new-project-members-title">Members</p>

									{/* Add All Checkbox - Only show when in organization context */}
									{currentOrganization.id && (
										<div className="new-project-add-all" onClick={() => setAddAllMembers(!addAllMembers)}>
											<div className={`new-project-checkbox ${addAllMembers ? "checked" : ""}`}>
												{addAllMembers && <span>✓</span>}
											</div>
											<span className="new-project-add-all-text">Add all member from organization</span>
										</div>
									)}

									{/* Team Members List */}
									{teamMembers.length === 0 ? (
										<p className="new-project-no-members">
											No members added yet. Click "Add Member" to invite users.
										</p>
									) : (
										teamMembers.map((member) => (
											<div key={member.id} className="new-project-member-row">
												<div className="new-project-member-icon-box">
													<PiUser className="new-project-member-icon" />
												</div>
												<div className="new-project-member-email-box">
													<span className="new-project-member-email">{member.email}</span>
												</div>
												<div className="new-project-member-roles">
													<span className="new-project-member-roles-text">{member.role}</span>
													<PiCaretDown className="new-project-member-roles-caret" />
												</div>
												<PiX className="new-project-member-remove" onClick={() => handleRemoveTeamMember(member.id)} />
											</div>
										))
									)}
								</div>
							</div>

							{/* Error Message */}
							{createProjectError && <div className="new-project-error">{createProjectError}</div>}

							{/* Action Buttons */}
							<div className="new-project-actions">
								<button className="new-project-cancel-btn" onClick={handleCloseNewProjectModal} disabled={creatingProject}>
									Cancel
								</button>
								<button
									className={`new-project-create-btn ${creatingProject ? "disabled" : ""}`}
									onClick={handleCreateProject}
									disabled={creatingProject}
								>
									{creatingProject ? "Creating..." : "Create"}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* New Organization Modal */}
			{showNewOrgModal && (
				<div className="navbar-modal-overlay" onClick={handleCloseNewOrgModal}>
					<div className="new-org-modal" onClick={(e) => e.stopPropagation()}>
						<div className="new-org-content">
							{/* Title */}
							<div className="new-org-title-section">
								<h2 className="new-org-title">New Organization</h2>
							</div>

							{/* Form Fields */}
							<div className="new-org-form">
								{/* Name Input */}
								<div className="new-org-field">
									<label className="new-org-label">Name of the organization</label>
									<input
										type="text"
										value={newOrgName}
										onChange={(e) => setNewOrgName(e.target.value)}
										placeholder="Name your organization..."
										className="new-org-input"
									/>
								</div>
							</div>

							{/* Add Organization Members Section */}
							<div className="new-org-members-section">
								<div className="new-org-members-header">
									<span className="new-org-label">Add organization members</span>
									<button className="new-org-add-member-btn" onClick={handleAddOrgMember}>
										<PiPlus className="new-org-add-member-icon" />
										<span>Add Member</span>
									</button>
								</div>

								{/* Members Box */}
								<div className="new-org-members-box">
									<p className="new-org-members-title">Members</p>

									{/* Organization Members List */}
									{orgMembers.length === 0 ? (
										<p className="new-org-no-members">No members added yet. Click "Add Member" to invite users.</p>
									) : (
										orgMembers.map((member) => (
											<div key={member.id} className="new-org-member-row">
												<div className="new-org-member-icon-box">
													<PiUser className="new-org-member-icon" />
												</div>
												<div className="new-org-member-email-box">
													<span className="new-org-member-email">{member.email}</span>
												</div>
												<div className="new-org-member-roles">
													<span className="new-org-member-roles-text">{member.role}</span>
													<PiCaretDown className="new-org-member-roles-caret" />
												</div>
												<PiX className="new-org-member-remove" onClick={() => handleRemoveOrgMember(member.id)} />
											</div>
										))
									)}
								</div>
							</div>

							{/* Error Message */}
							{createOrgError && <div className="new-org-error">{createOrgError}</div>}

							{/* Action Buttons */}
							<div className="new-org-actions">
								<button className="new-org-cancel-btn" onClick={handleCloseNewOrgModal} disabled={creatingOrg}>
									Cancel
								</button>
								<button
									className={`new-org-create-btn ${creatingOrg ? "disabled" : ""}`}
									onClick={handleCreateOrganization}
									disabled={creatingOrg}
								>
									{creatingOrg ? "Creating..." : "Create"}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Add Member Popup */}
			{showAddMemberPopup && (
				<div className="navbar-modal-overlay" onClick={handleCloseAddMemberPopup}>
					<div className="add-member-popup" onClick={(e) => e.stopPropagation()}>
						<div className="add-member-popup-header">
							<h3 className="add-member-popup-title">Add Member</h3>
							<PiX className="add-member-popup-close" onClick={handleCloseAddMemberPopup} />
						</div>
						
						<div className="add-member-popup-content">
							{/* Search Input */}
							<div className="add-member-search-field">
								<label className="add-member-search-label">Search by email</label>
								<input
									type="text"
									value={memberSearchQuery}
									onChange={handleMemberSearchChange}
									placeholder="Enter email address..."
									className="add-member-search-input"
									autoFocus
								/>
							</div>

							{/* Role Selector */}
							<div className="add-member-role-field">
								<label className="add-member-role-label">Role</label>
								<select
									value={selectedMemberRole}
									onChange={(e) => setSelectedMemberRole(parseInt(e.target.value))}
									className="add-member-role-select"
								>
									<option value={1}>Owner</option>
									<option value={2}>Member</option>
									<option value={3}>Viewer</option>
								</select>
							</div>

							{/* Search Results */}
							<div className="add-member-results">
								{memberSearchLoading ? (
									<div className="add-member-loading">Searching...</div>
								) : memberSearchResults.length > 0 ? (
									memberSearchResults.map((searchUser) => (
										<div 
											key={searchUser.user_id} 
											className="add-member-result-item"
											onClick={() => handleSelectMember(searchUser)}
										>
											<div className="add-member-result-icon">
												<PiUser />
											</div>
											<div className="add-member-result-info">
												<span className="add-member-result-email">{searchUser.email || searchUser.username}</span>
											</div>
										</div>
									))
								) : memberSearchQuery.length >= 2 ? (
									<div className="add-member-no-results">No users found with that email</div>
								) : memberSearchQuery.length > 0 ? (
									<div className="add-member-hint">Type at least 2 characters to search</div>
								) : (
									<div className="add-member-hint">Start typing to search for users</div>
								)}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default Navbar;
