import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setProjectName } from "../redux/actions/projectActions";
import { getApiUrl, fetchWithAuth } from "../utils/api";
import "../css/ProjectDashboard.css";

const ProjectDashboard = () => {
	const { user, id } = useParams();
	const [metrics, setMetrics] = useState(null);
	const [loading, setLoading] = useState(true);
	const dispatch = useDispatch();

	useEffect(() => {
		const fetchProjectData = async () => {
			try {
				setLoading(true);

				const projectNameApiUrl = getApiUrl(`/api/project-name/${id}`);
				const projectNameRes = await fetchWithAuth(projectNameApiUrl);
				const projectNameData = await projectNameRes.json();
				if (projectNameRes.ok) {
					dispatch(setProjectName(projectNameData.projectName));
				} else {
					console.error("Error fetching project name:", projectNameData.message);
				}

				const metricsApiUrl = getApiUrl(`/api/projects/${id}/metrics/${user}`);
				const metricsRes = await fetchWithAuth(metricsApiUrl);
				const metricsData = await metricsRes.json();
				if (metricsRes.ok) {
					setMetrics(metricsData);
				} else {
					console.error("Error fetching metrics:", metricsData.message);
				}
			} catch (err) {
				console.error("Error fetching project data:", err);
			} finally {
				setLoading(false);
			}
		};

		fetchProjectData();
	}, [user, id, dispatch]);

	if (loading) {
		return (
			<div className="proj-dash-loading">
				<div className="proj-dash-spinner"></div>
				<p className="proj-dash-loading-text">Loading dashboard...</p>
			</div>
		);
	}

	// Calculate percentages for progress bars
	const castLockedPercent = metrics?.cast?.total > 0 ? Math.round((metrics.cast.locked / metrics.cast.total) * 100) : 0;

	const locationsLockedPercent = metrics?.locations?.total > 0 ? Math.round((metrics.locations.locked / metrics.locations.total) * 100) : 0;

	const totalScheduleScenes = (metrics?.schedules?.scheduled_scenes || 0) + (metrics?.schedules?.unscheduled_scenes || 0);
	const scenesScheduledPercent = totalScheduleScenes > 0 ? Math.round((metrics.schedules.scheduled_scenes / totalScheduleScenes) * 100) : 0;

	// Check if no scripts are available
	const hasNoScripts = !metrics?.scripts?.total || metrics.scripts.total === 0;

	return (
		<div className="proj-dash-page">
			{/* Header */}
			<div className="proj-dash-header">
				<h1 className="proj-dash-title">Project Dashboard</h1>
				<p className="proj-dash-subtitle">Overview of your project's progress and key metrics</p>
			</div>

			{/* No Scripts Message */}
			{hasNoScripts && (
				<div className="proj-dash-card proj-dash-empty-state">
					<div className="proj-dash-empty-icon">
						<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
							<polyline points="14 2 14 8 20 8" />
							<line x1="12" y1="18" x2="12" y2="12" />
							<line x1="9" y1="15" x2="15" y2="15" />
						</svg>
					</div>
					<h3 className="proj-dash-empty-title">No Scripts Uploaded</h3>
					<p className="proj-dash-empty-text">
						Get started by uploading a script to your project. Once uploaded, you can generate breakdowns, manage cast and locations, and
						create shooting schedules.
					</p>
				</div>
			)}

			{/* Top Stats Grid */}
			<div className="proj-dash-stats-grid">
				{/* Scripts Card */}
				<div className="proj-dash-stat-card">
					<div className="proj-dash-stat-header">
						<div className="proj-dash-stat-icon scripts">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
								<polyline points="14 2 14 8 20 8" />
								<line x1="16" y1="13" x2="8" y2="13" />
								<line x1="16" y1="17" x2="8" y2="17" />
								<polyline points="10 9 9 9 8 9" />
							</svg>
						</div>
						<span className="proj-dash-stat-title">Scripts</span>
					</div>
					<div className="proj-dash-stat-value">{metrics?.scripts?.total || 0}</div>
					<div className="proj-dash-stat-subtitle">{metrics?.scripts?.latest ? `Latest: ${metrics.scripts.latest}` : "No scripts uploaded"}</div>
				</div>

				{/* Scenes Card */}
				<div className="proj-dash-stat-card">
					<div className="proj-dash-stat-header">
						<div className="proj-dash-stat-icon scenes">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
								<line x1="7" y1="2" x2="7" y2="22" />
								<line x1="17" y1="2" x2="17" y2="22" />
								<line x1="2" y1="12" x2="22" y2="12" />
								<line x1="2" y1="7" x2="7" y2="7" />
								<line x1="2" y1="17" x2="7" y2="17" />
								<line x1="17" y1="17" x2="22" y2="17" />
								<line x1="17" y1="7" x2="22" y2="7" />
							</svg>
						</div>
						<span className="proj-dash-stat-title">Total Scenes</span>
					</div>
					<div className="proj-dash-stat-value">{metrics?.scenes?.total || 0}</div>
					<div className="proj-dash-stat-subtitle">From script breakdown</div>
				</div>

				{/* Shoot Days Card */}
				<div className="proj-dash-stat-card">
					<div className="proj-dash-stat-header">
						<div className="proj-dash-stat-icon shoot-days">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
								<line x1="16" y1="2" x2="16" y2="6" />
								<line x1="8" y1="2" x2="8" y2="6" />
								<line x1="3" y1="10" x2="21" y2="10" />
							</svg>
						</div>
						<span className="proj-dash-stat-title">Shoot Days</span>
					</div>
					<div className="proj-dash-stat-value">{metrics?.schedules?.shoot_days || 0}</div>
					<div className="proj-dash-stat-subtitle">Total filming days</div>
				</div>

				{/* Schedules Card */}
				<div className="proj-dash-stat-card">
					<div className="proj-dash-stat-header">
						<div className="proj-dash-stat-icon schedule">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<circle cx="12" cy="12" r="10" />
								<polyline points="12 6 12 12 16 14" />
							</svg>
						</div>
						<span className="proj-dash-stat-title">Scene Scheduling</span>
					</div>
					<div className="proj-dash-stat-value">{scenesScheduledPercent}%</div>
					<div className="proj-dash-stat-details">
						<div className="proj-dash-detail-item">
							<span className="proj-dash-detail-label">Scheduled</span>
							<span className="proj-dash-detail-value scheduled">{metrics?.schedules?.scheduled_scenes || 0}</span>
						</div>
						<div className="proj-dash-detail-item">
							<span className="proj-dash-detail-label">Unscheduled</span>
							<span className="proj-dash-detail-value unscheduled">{metrics?.schedules?.unscheduled_scenes || 0}</span>
						</div>
					</div>
				</div>
			</div>

			{/* Cards Grid */}
			<div className="proj-dash-cards-grid">
				{/* Cast Progress Card */}
				<div className="proj-dash-card">
					<div className="proj-dash-card-header">
						<div>
							<h3 className="proj-dash-card-title">Cast List</h3>
							<p className="proj-dash-card-subtitle">Character casting progress</p>
						</div>
						<span className={`proj-dash-badge ${castLockedPercent === 100 ? "success" : castLockedPercent >= 50 ? "warning" : "info"}`}>
							{castLockedPercent}% Locked
						</span>
					</div>

					<div className="proj-dash-summary-list">
						<div className="proj-dash-summary-item">
							<span className="proj-dash-summary-label">
								<span className="proj-dash-summary-icon" style={{ background: "#f5f3ff", color: "#8b5cf6" }}>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
										<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
										<circle cx="12" cy="7" r="4" />
									</svg>
								</span>
								Total Characters
							</span>
							<span className="proj-dash-summary-value">{metrics?.cast?.total || 0}</span>
						</div>
						<div className="proj-dash-summary-item">
							<span className="proj-dash-summary-label">
								<span className="proj-dash-summary-icon" style={{ background: "#ecfdf5", color: "#10b981" }}>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
										<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
										<path d="M7 11V7a5 5 0 0 1 10 0v4" />
									</svg>
								</span>
								Locked
							</span>
							<span className="proj-dash-summary-value" style={{ color: "#10b981" }}>
								{metrics?.cast?.locked || 0}
							</span>
						</div>
						<div className="proj-dash-summary-item">
							<span className="proj-dash-summary-label">
								<span className="proj-dash-summary-icon" style={{ background: "#fffbeb", color: "#f59e0b" }}>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
										<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
										<path d="M7 11V7a5 5 0 0 1 9.9-1" />
									</svg>
								</span>
								Unlocked
							</span>
							<span className="proj-dash-summary-value" style={{ color: "#f59e0b" }}>
								{metrics?.cast?.unlocked || 0}
							</span>
						</div>
						{/* <div className="proj-dash-summary-item">
							<span className="proj-dash-summary-label">
								<span className="proj-dash-summary-icon" style={{ background: "#eff6ff", color: "#3b82f6" }}>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
										<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
										<circle cx="9" cy="7" r="4" />
										<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
										<path d="M16 3.13a4 4 0 0 1 0 7.75" />
									</svg>
								</span>
								Total Options Added
							</span>
							<span className="proj-dash-summary-value">{metrics?.cast?.total_options || 0}</span>
						</div> */}
					</div>

					<div className="proj-dash-progress-container">
						<div className="proj-dash-progress-header">
							<span className="proj-dash-progress-label">Casting Progress</span>
							<span className="proj-dash-progress-value">
								{metrics?.cast?.locked || 0} / {metrics?.cast?.total || 0}
							</span>
						</div>
						<div className="proj-dash-progress-bar">
							<div className="proj-dash-progress-fill cast" style={{ width: `${castLockedPercent}%` }}></div>
						</div>
					</div>
				</div>

				{/* Locations Progress Card */}
				<div className="proj-dash-card">
					<div className="proj-dash-card-header">
						<div>
							<h3 className="proj-dash-card-title">Location List</h3>
							<p className="proj-dash-card-subtitle">Location scouting progress</p>
						</div>
						<span
							className={`proj-dash-badge ${locationsLockedPercent === 100 ? "success" : locationsLockedPercent >= 50 ? "warning" : "info"}`}
						>
							{locationsLockedPercent}% Locked
						</span>
					</div>

					<div className="proj-dash-summary-list">
						<div className="proj-dash-summary-item">
							<span className="proj-dash-summary-label">
								<span className="proj-dash-summary-icon" style={{ background: "#ecfdf5", color: "#10b981" }}>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
										<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
										<circle cx="12" cy="10" r="3" />
									</svg>
								</span>
								Total Locations
							</span>
							<span className="proj-dash-summary-value">{metrics?.locations?.total || 0}</span>
						</div>
						<div className="proj-dash-summary-item">
							<span className="proj-dash-summary-label">
								<span className="proj-dash-summary-icon" style={{ background: "#ecfdf5", color: "#10b981" }}>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
										<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
										<path d="M7 11V7a5 5 0 0 1 10 0v4" />
									</svg>
								</span>
								Locked
							</span>
							<span className="proj-dash-summary-value" style={{ color: "#10b981" }}>
								{metrics?.locations?.locked || 0}
							</span>
						</div>
						<div className="proj-dash-summary-item">
							<span className="proj-dash-summary-label">
								<span className="proj-dash-summary-icon" style={{ background: "#fffbeb", color: "#f59e0b" }}>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
										<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
										<path d="M7 11V7a5 5 0 0 1 9.9-1" />
									</svg>
								</span>
								Unlocked
							</span>
							<span className="proj-dash-summary-value" style={{ color: "#f59e0b" }}>
								{metrics?.locations?.unlocked || 0}
							</span>
						</div>
						{/* <div className="proj-dash-summary-item">
							<span className="proj-dash-summary-label">
								<span className="proj-dash-summary-icon" style={{ background: "#eff6ff", color: "#3b82f6" }}>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
										<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
										<circle cx="12" cy="10" r="3" />
									</svg>
								</span>
								Total Options Added
							</span>
							<span className="proj-dash-summary-value">{metrics?.locations?.total_options || 0}</span>
						</div> */}
					</div>

					<div className="proj-dash-progress-container">
						<div className="proj-dash-progress-header">
							<span className="proj-dash-progress-label">Location Progress</span>
							<span className="proj-dash-progress-value">
								{metrics?.locations?.locked || 0} / {metrics?.locations?.total || 0}
							</span>
						</div>
						<div className="proj-dash-progress-bar">
							<div className="proj-dash-progress-fill locations" style={{ width: `${locationsLockedPercent}%` }}></div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ProjectDashboard;
