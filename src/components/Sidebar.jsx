import React from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import {
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
} from 'react-icons/fa';

const Sidebar = () => {
  const { user, id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const mainNavItems = [
    ['Dashboard', <FaHome />, `/${user}/${id}`],
    ['Scripts', <FaFileAlt />, `/${user}/${id}/script`],
    ['Breakdown', <FaLayerGroup />, `/${user}/${id}/script-breakdown`],
    ['Cast List', <FaUsers />, `/${user}/${id}/cast-list`],
    ['Locations', <FaMapMarkerAlt />, `/${user}/${id}/locations`],
    ['Scheduling', <FaCalendarAlt />, `/${user}/${id}/scheduling`],
    ['Call Sheets', <FaClipboardList />, `/${user}/${id}/call-sheets`],
    ['Daily Reports', <FaChartBar />, `/${user}/${id}/dpr`],
  ];

  const bottomNavItems = [
    ['Settings', <FaCog />, `/${user}/${id}/settings`],
    ['Logout', <FaSignOutAlt />, `/`],
  ];

  const handleKinopleClick = () => {
    // Navigate back to user's home workspace
    navigate(`/${user}`);
  };

  return (
    <>
      <style>{`
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

        {/* Main Content */}
        <div className="sidebar-content">
          <ul className="nav-list">
            {mainNavItems.map(([label, Icon, path], idx) => {
              const isActive = location.pathname === path;
              return (
                <li className="nav-item" key={idx}>
                  <Link to={path} className={`nav-link${isActive ? ' active' : ''}`}>
                    <span className="icon-wrapper">{Icon}</span>
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <ul className="nav-list nav-bottom">
            {bottomNavItems.map(([label, Icon, path], idx) => {
              const isActive = location.pathname === path;
              return (
                <li className="nav-item" key={`bottom-${idx}`}>
                  <Link to={path} className={`nav-link${isActive ? ' active' : ''}`}>
                    <span className="icon-wrapper">{Icon}</span>
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
