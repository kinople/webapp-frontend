// src/components/ProjectLayout.js
import React, { useEffect } from "react";
import { Outlet, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import Sidebar from "./Sidebar";
import { getApiUrl, fetchWithAuth } from "../utils/api";
import { setProjectName } from "../redux/actions/projectActions";

const ProjectLayout = () => {
	const { id } = useParams();
	const dispatch = useDispatch();
	const sidebarCollapsed = useSelector((state) => state.ui.navbarCollapsed);
	const projectName = useSelector((state) => state.project.projectName);

	useEffect(() => {
		const fetchProjectName = async () => {
			if (!projectName && id) {
				try {
					const projectNameApiUrl = getApiUrl(`/api/project-name/${id}`);
					const projectNameRes = await fetchWithAuth(projectNameApiUrl);
					const projectNameData = await projectNameRes.json();
					if (projectNameRes.ok) {
						dispatch(setProjectName(projectNameData.projectName));
					}
				} catch (err) {
					console.error("Error fetching project name:", err);
				}
			}
		};

		fetchProjectName();
	}, [id, projectName, dispatch]);

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
