import React, { useState, useEffect } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import {
	FaChevronLeft,
	FaHome,
	FaFileAlt,
	FaLayerGroup,
	FaUsers,
	FaMapMarkerAlt,
	FaCalendarAlt,
	FaClipboardList,
	FaChartBar,
	FaCog,
	FaSignOutAlt,
} from "react-icons/fa";
import { fetchWithAuth, getApiUrl } from "../utils/api";
import { use } from "react";

const Sidebar = () => {
	const { user, id } = useParams();
	const location = useLocation();
	const navigate = useNavigate();
	const [IsInSettings, setIsInSettings] = useState(false);
	const [UserDetails, setUserDetails] = useState("");
	const mainNavItems = [
		["Dashboard", <FaHome />, `/${user}/${id}`],
		["Scripts", <FaFileAlt />, `/${user}/${id}/script`],
		["Breakdown", <FaLayerGroup />, `/${user}/${id}/script-breakdown`],
		["Cast List", <FaUsers />, `/${user}/${id}/cast-list`],
		["Locations", <FaMapMarkerAlt />, `/${user}/${id}/locations`],
		["Scheduling", <FaCalendarAlt />, `/${user}/${id}/scheduling`],
		["Call Sheets", <FaClipboardList />, `/${user}/${id}/call-sheets`],
		["Daily Reports", <FaChartBar />, `/${user}/${id}/dpr`],
	];

	const bottomNavItems = [
		["Settings", <FaCog />, `/${user}/${id}/settings`],
		["Logout", <FaSignOutAlt />, `/`],
	];

	const settingsNavItems = [
		["General", <FaCog />, `general`],
		["Project Members", <FaUsers />, `members`],
		["Billing and Usage", <FaClipboardList />, `billing`],
	];

	const handleKinopleClick = () => {
		// Navigate back to user's home workspace
		navigate(`/${user}`);
	};

	const handleSettingClick = () => {
		setIsInSettings(!IsInSettings);
	};

	useEffect(() => {
		if (user) {
			fetchUserDetails();
		}
	}, [user]);

	useEffect(() => {
		if (location.pathname.split("/").includes("settings")) {
			setIsInSettings(true);
		} else {
			setIsInSettings(false);
		}
		//setIsInSettings()
	}, [location.pathname]);

	const fetchUserDetails = async () => {
		try {
			//setError(null);
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
			//console.log("user data :::::::::::::::::::::;", data);
			setUserDetails(data);
		} catch (err) {
			//setError(err.message);
			console.error("Error fetching user details:", err);
		} finally {
			//setLoading(false);
		}
	};
	return (
		<>
			<style>{`

			.workspaceLabel {
        font-size: 15px;
        color: #FFFFFF;
        font-weight: 500;
    }
    .workspaceActive {
        background-color: #4B9CD3;
        padding: 1rem;
        color: white;
    }
        .sidebar {
          height: 100vh;
          width: 240px;
          background-color: #2C3440;
          box-shadow: 2px 0 8px rgba(0,0,0,0.1);
          border-left: none;
          font-family: 'Inter', sans-serif;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 100;
          display: flex;
          flex-direction: column;
        }

        .sidebar-header {
          padding: 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .sidebar-logo {
          font-size: 1.5rem;
          font-weight: bold;
          color: white;
          text-decoration: none;
          cursor: pointer;
        }

        .sidebar-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding-top: 24px;
        }

        .nav-list {
          list-style: none;
          padding: 0 16px;
          margin: 0;
        }

        .nav-item {
          margin-bottom: 12px;
        }

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
        }

        .nav-link:hover {
          background-color: #4B9CD3;
          color: white;
        }

        .nav-link.active {
          background-color: #4B9CD3;
          color: white;
        }

        .icon-wrapper {
          margin-right: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nav-bottom {
          margin-top: auto;
          padding-bottom: 24px;
        }
      `}</style>

			<div className="sidebar">
				{/* Header Section with Kinople logo */}
				<div className="sidebar-header">
					<div className="sidebar-logo" onClick={handleKinopleClick}>
						Kinople
					</div>
				</div>

				<div className="workspaceActive">
					<div className="workspaceLabel">
						{UserDetails?.email ? `${UserDetails.email}'s Workspace` : user ? `${user}'s Workspace` : "User's Workspace"}
					</div>
				</div>

				{/* Main Content */}
				<div className="sidebar-content">
					{IsInSettings ? (
						<ul className="nav-list">
							{settingsNavItems.map(([label, Icon, path], idx) => {
								const isActive = (location.state?.section || "general") === path;
								return (
									<li className="nav-item" key={idx}>
										<Link
											to={`/${user}/${id}/settings`}
											state={{ section: path }}
											className={`nav-link${isActive ? " active" : ""}`}
										>
											<span className="icon-wrapper">{Icon}</span>
											{label}
										</Link>
									</li>
								);
							})}
						</ul>
					) : (
						<ul className="nav-list">
							{mainNavItems.map(([label, Icon, path], idx) => {
								const isActive = location.pathname === path;
								return (
									<li className="nav-item" key={idx}>
										<Link to={path} className={`nav-link${isActive ? " active" : ""}`}>
											<span className="icon-wrapper">{Icon}</span>
											{label}
										</Link>
									</li>
								);
							})}
						</ul>
					)}

					<ul className="nav-list nav-bottom">
						<li className="nav-item">
							<Link
								onClick={handleSettingClick}
								to={!IsInSettings ? `/${user}/${id}/settings` : `/${user}/${id}`}
								className={`nav-link${location.pathname === `/${user}/${id}/settings` ? " active" : ""}`}
							>
								<span className="icon-wrapper">{IsInSettings ? <FaChevronLeft /> : <FaCog />}</span>
								Settings
							</Link>
						</li>

						<li className="nav-item">
							<Link to={`/`} className={`nav-link${location.pathname === `/` ? " active" : ""}`}>
								<span className="icon-wrapper">{<FaSignOutAlt />}</span>
								Logout
							</Link>
						</li>
					</ul>
				</div>
			</div>
		</>
	);
};

export default Sidebar;
