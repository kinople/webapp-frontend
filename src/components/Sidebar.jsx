import React, { useState, useEffect } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
	PiHouseLine,
	PiScroll,
	PiStack,
	PiUsersThree,
	PiMapPinLine,
	PiCalendarDots,
	PiGear,
	PiUser,
	PiSignOut,
	PiCaretDown,
	PiArrowLeft,
	PiSidebarSimple,
	PiSliders,
	PiCurrencyCircleDollar,
} from "react-icons/pi";
import { fetchWithAuth, getApiUrl } from "../utils/api";
import { removeToken } from "../utils/auth";
import { toggleNavbar } from "../redux/reducers/uiSlice";
import { setCurrentOrganization } from "../redux/reducers/organizationSlice";
import logoIcon from "../assets/logo-icon.svg";
import "../css/Sidebar.css";

const Sidebar = () => {
	const { user, id } = useParams();
	const location = useLocation();
	const navigate = useNavigate();
	const dispatch = useDispatch();
	const navbarCollapsed = useSelector((state) => state.ui.navbarCollapsed);
	const projectName = useSelector((state) => state.project.projectName);
	const currentOrganization = useSelector((state) => state.organization.currentOrganization);

	const [userDetails, setUserDetails] = useState(null);
	const [loggingOut, setLoggingOut] = useState(false);

	// Check if we're on the settings page to show settings navigation
	const isOnSettingsPage = location.pathname === `/${user}/${id}/settings`;

	const mainNavItems = [
		{ label: "Dashboard", icon: PiHouseLine, path: `/${user}/${id}` },
		{ label: "Scripts", icon: PiScroll, path: `/${user}/${id}/script` },
		{ label: "Breakdown", icon: PiStack, path: `/${user}/${id}/script-breakdown` },
		{ label: "Cast List", icon: PiUsersThree, path: `/${user}/${id}/cast-list` },
		{ label: "Locations", icon: PiMapPinLine, path: `/${user}/${id}/locations` },
		{ label: "Scheduling", icon: PiCalendarDots, path: `/${user}/${id}/scheduling/1` },
	];

	useEffect(() => {
		if (user) {
			fetchUserDetails();
		}
	}, [user]);

	const fetchUserDetails = async () => {
		try {
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
			console.error("Error fetching user details:", err);
		}
	};

	const handleToggleSidebar = () => {
		dispatch(toggleNavbar());
	};

	const handleSettingsClick = () => {
		navigate(`/${user}/${id}/settings`, { state: { section: "general" } });
	};

	const handleSettingsSubItemClick = (section) => {
		navigate(`/${user}/${id}/settings`, { state: { section } });
	};

	const handleBackFromSettings = () => {
		navigate(`/${user}/${id}`);
	};

	const handleLogoClick = () => {
		navigate(`/${user}`);
	};

	const handleLogout = async () => {
		try {
			setLoggingOut(true);
			await fetchWithAuth(getApiUrl("/api/logout"), {
				method: "POST",
			});
			removeToken();
			navigate("/");
		} catch (error) {
			console.error("Logout error:", error);
			removeToken();
			navigate("/");
		} finally {
			setLoggingOut(false);
		}
	};

	const getWorkspaceBadgeLetter = () => {
		if (currentOrganization.name === "Personal") {
			return userDetails?.email?.charAt(0).toUpperCase() || user?.charAt(0).toUpperCase() || "P";
		}
		return currentOrganization.name?.charAt(0).toUpperCase() || "O";
	};

	const getWorkspaceName = () => {
		if (currentOrganization.name === "Personal") {
			if (userDetails?.email) {
				const username = userDetails.email.split("@")[0];
				return `${username}'s workspace`;
			}
			return user ? `${user}'s workspace` : "Personal workspace";
		}
		// Show organization name (truncate if too long)
		const orgName = currentOrganization.name;
		return orgName.length > 18 ? orgName.substring(0, 18) + "..." : orgName;
	};

	// Check if a nav item is active - special handling for scripts-related paths
	const isNavItemActive = (itemPath) => {
		const currentPath = location.pathname;

		// Dashboard
		if (itemPath === `/${user}/${id}` && currentPath === itemPath) return true;

		// Scripts
		if (itemPath === `/${user}/${id}/script` && (currentPath === itemPath || currentPath.startsWith(`${itemPath}/`))) {
			return true;
		}

		// Script Breakdown
		if (itemPath === `/${user}/${id}/script-breakdown` && (currentPath === itemPath || currentPath.startsWith(`${itemPath}/`))) {
			return true;
		}

		// Cast List
		if (itemPath === `/${user}/${id}/cast-list` && (currentPath === itemPath || currentPath.startsWith(`${itemPath}/`))) {
			return true;
		}

		// Locations
		if (itemPath === `/${user}/${id}/locations` && (currentPath === itemPath || currentPath.startsWith(`${itemPath}/`))) {
			return true;
		}

		// Scheduling (allow for scheduling, scheduling/1, scheduling/whatever)
		if (
			itemPath === `/${user}/${id}/scheduling/1` &&
			(currentPath === `/${user}/${id}/scheduling` || currentPath.startsWith(`/${user}/${id}/scheduling/`))
		) {
			return true;
		}

		return false;
	};

	// Check if a settings sub-item is active
	const isSettingsSubItemActive = (section) => {
		if (!isOnSettingsPage) return false;
		const currentSection = location.state?.section || "general";
		return currentSection === section;
	};

	return (
		<div className={`sidebar-container${navbarCollapsed ? " collapsed" : ""}`}>
			<nav className="sidebar-nav">
				{/* Header Section */}
				<div className="sidebar-header">
					<img src={logoIcon} alt="Kinople" className="sidebar-logo-icon" onClick={handleLogoClick} />
					{!navbarCollapsed && (
						<span className="sidebar-logo-text" onClick={handleLogoClick}>
							Kinople
						</span>
					)}
					<PiSidebarSimple className={`sidebar-toggle${navbarCollapsed ? " collapsed" : ""}`} onClick={handleToggleSidebar} />
				</div>

				{/* Project Name Button */}
				{!navbarCollapsed && (
					<div className="sidebar-project-wrapper">
						<div className="sidebar-project-button">
							<span className="sidebar-project-name">{projectName || "Project"}</span>
						</div>
					</div>
				)}

				{/* Workspace Selector */}
				{!navbarCollapsed && (
					<div className="sidebar-workspace-selector">
						<div className="sidebar-workspace-badge">
							<span className="sidebar-workspace-badge-text">{getWorkspaceBadgeLetter()}</span>
						</div>
						<div className="sidebar-workspace-name-wrapper">
							<span className="sidebar-workspace-name">{getWorkspaceName()}</span>
							<PiCaretDown className="sidebar-workspace-caret" />
						</div>
					</div>
				)}

				{/* Settings & Profile Menu */}
				{!navbarCollapsed && !isOnSettingsPage && (
					<div className="sidebar-menu-section">
						<div className="sidebar-menu-item" onClick={handleSettingsClick}>
							<PiGear className="sidebar-menu-icon" />
							<span className="sidebar-menu-text">Project Settings</span>
						</div>
						<Link to={`/${user}/settings`} className="sidebar-menu-item">
							<PiUser className="sidebar-menu-icon" />
							<span className="sidebar-menu-text">Profile</span>
						</Link>
					</div>
				)}

				{/* Main Navigation - Show settings options when on settings page */}
				<div className="sidebar-main-nav">
					{isOnSettingsPage ? (
						<>
							{/* Back button */}
							{!navbarCollapsed && (
								<div className="sidebar-back-button" onClick={handleBackFromSettings}>
									<PiArrowLeft className="sidebar-nav-icon" />
									<span className="sidebar-nav-text">Back to Project</span>
								</div>
							)}

							{/* Settings Navigation Items */}
							<div
								className={`sidebar-nav-item${isSettingsSubItemActive("general") ? " active" : ""}`}
								onClick={() => handleSettingsSubItemClick("general")}
							>
								<PiSliders className="sidebar-nav-icon" />
								{!navbarCollapsed && <span className="sidebar-nav-text">General</span>}
							</div>
							<div
								className={`sidebar-nav-item${isSettingsSubItemActive("members") ? " active" : ""}`}
								onClick={() => handleSettingsSubItemClick("members")}
							>
								<PiUsersThree className="sidebar-nav-icon" />
								{!navbarCollapsed && <span className="sidebar-nav-text">Project Members</span>}
							</div>
							<div
								className={`sidebar-nav-item${isSettingsSubItemActive("billing") ? " active" : ""}`}
								onClick={() => handleSettingsSubItemClick("billing")}
							>
								<PiCurrencyCircleDollar className="sidebar-nav-icon" />
								{!navbarCollapsed && <span className="sidebar-nav-text">Billing and Usage</span>}
							</div>
						</>
					) : (
						mainNavItems.map((item) => {
							const Icon = item.icon;
							const isActive = isNavItemActive(item.path);
							return (
								<Link key={item.label} to={item.path} className={`sidebar-nav-item${isActive ? " active" : ""}`}>
									<Icon className="sidebar-nav-icon" />
									{!navbarCollapsed && <span className="sidebar-nav-text">{item.label}</span>}
								</Link>
							);
						})
					)}
				</div>

				{/* Spacer */}
				<div className="sidebar-spacer"></div>

				{/* Log Out */}
				{!navbarCollapsed && (
					<div className="sidebar-logout" onClick={handleLogout}>
						<PiSignOut className="sidebar-logout-icon" />
						<span className="sidebar-logout-text">{loggingOut ? "Logging out..." : "Log Out"}</span>
					</div>
				)}
			</nav>
		</div>
	);
};

export default Sidebar;
