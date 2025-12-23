import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { getApiUrl, fetchWithAuth } from "../utils/api";
import { PiUsers, PiFolder, PiMonitorPlay, PiCalendarBlank, PiCaretDown, PiCaretUp, PiCaretLeft, PiCaretRight } from "react-icons/pi";
import "../css/Home.css";

const Home = () => {
	const [currentProjects, setCurrentProjects] = useState([]);
	const { user } = useParams();
	const navigate = useNavigate();
	const location = useLocation();
	const navbarCollapsed = useSelector((state) => state.ui.navbarCollapsed);

	// Get organization info from Redux store
	const currentOrganization = useSelector((state) => state.organization.currentOrganization);
	const organizationId = currentOrganization.id;
	const organizationName = currentOrganization.name;

	// Get refreshKey from navigation state (for triggering re-fetch after project creation)
	const refreshKey = location.state?.refreshKey || null;

	// Pagination state (dummy)
	const [resultsPerPage, setResultsPerPage] = useState(16);
	const [currentPage, setCurrentPage] = useState(1);

	useEffect(() => {
		if (!user) return;
		(async () => {
			try {
				// Build URL with organization parameter if available
				let url = getApiUrl(`/api/projects/${user}`);
				if (organizationId) {
					url += `?organizationId=${organizationId}`;
				}

				const res = await fetchWithAuth(url, {
					method: "GET",
				});
				if (!res.ok) throw new Error("Failed to fetch");
				const data = await res.json();
				setCurrentProjects(data);
			} catch {
				setCurrentProjects([]);
			}
		})();
	}, [user, organizationId, refreshKey]);

	// Use real projects if available, otherwise show demo
	const displayProjects = currentProjects;

	const totalResults = displayProjects.length;
	const totalPages = Math.ceil(totalResults / resultsPerPage) || 1;

	return (
		<div className={`home-page${navbarCollapsed ? " navbar-collapsed" : ""}`}>
			<div className="home-main-content">
				{/* Header Section */}
				<div className="home-header">
					<h1 className="home-title">Projects</h1>
					<button className="home-sort-btn">
						<PiCalendarBlank className="home-sort-icon" />
						<span className="home-sort-text">Sort by</span>
						<PiCaretDown className="home-sort-caret" />
					</button>
				</div>

				{/* Projects Grid */}
				<div className="home-projects-container">
					<div className="home-projects-grid">
						{displayProjects.length === 0 && <div className="home-empty">No projects found</div>}
						{displayProjects.map((project) => (
							<Link key={project.id} to={`/${user}/${project.id}`} className="home-project-card">
								<div className="home-card-content">
									<div className="home-card-info">
										<h3 className="home-card-title">{project.projectName || project.name}</h3>
										<p className="home-card-type">Type: {project.type || project.projectType || "Film"}</p>
									</div>
									<div className="home-card-stats">
										<div className="home-stat-item">
											<PiUsers className="home-stat-icon" />
											<span className="home-stat-text">{project.members || 2} members</span>
										</div>
										<div className="home-stat-item">
											<PiFolder className="home-stat-icon" />
											<span className="home-stat-text">{project.scripts || 2} Scripts</span>
										</div>
										{(project.type === "Episodic" || project.projectType === "Episodic") && (
											<div className="home-stat-item">
												<PiMonitorPlay className="home-stat-icon" />
												<span className="home-stat-text">{project.episodes || 12} Episodes</span>
											</div>
										)}
									</div>
								</div>
							</Link>
						))}
					</div>
				</div>

				{/* Footer / Pagination Section */}
				<div className="home-footer">
					<div className="home-footer-divider"></div>
					<div className="home-footer-content">
						{/* Left side - Results per page */}
						<div className="home-footer-left">
							<div className="home-results-selector">
								<span className="home-results-count">{resultsPerPage}</span>
								<PiCaretUp className="home-results-caret" />
							</div>
							<span className="home-results-text">Results: 1 - {Math.min(resultsPerPage, totalResults)}</span>
						</div>

						{/* Right side - Pagination */}
						<div className="home-footer-right">
							<button className="home-page-btn home-page-btn-disabled">
								<PiCaretLeft className="home-page-icon" />
								<span>Previous</span>
							</button>

							<div className="home-page-numbers">
								<div className="home-page-number active">1</div>
								<span className="home-page-number-text">2</span>
								<span className="home-page-number-text">3</span>
								<span className="home-page-number-text">4</span>
								<span className="home-page-number-text">...</span>
								<span className="home-page-number-text">8</span>
							</div>

							<button className="home-page-btn">
								<span>Next</span>
								<PiCaretRight className="home-page-icon" />
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Home;
