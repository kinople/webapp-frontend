// src/components/ProjectLayout.js
import React from "react";
import { Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import Sidebar from "./Sidebar";

const ProjectLayout = () => {
	const sidebarCollapsed = useSelector((state) => state.ui.navbarCollapsed);

	return (
		<div>
			<Sidebar />
			<div
				style={{
					marginLeft: sidebarCollapsed ? "60px" : "238px",
					transition: "margin-left 0.3s ease",
				}}
			>
				<Outlet />
			</div>
		</div>
	);
};

export default ProjectLayout;
