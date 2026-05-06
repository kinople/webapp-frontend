import React from "react";
import { PiFileArrowUp } from "react-icons/pi";
import { useNavigate, useParams } from "react-router-dom";
import "../css/EmptyState.css";

const EmptyState = ({
	title = "No Data Available",
	subtitle = "Upload a script to view breakdowns.",
	actionLabel = "Go to Scripts",
	icon: Icon = PiFileArrowUp,
	onAction,
	className = "",
	cardClassName = "",
}) => {
	const navigate = useNavigate();
	const { user, id } = useParams();

	const handleAction = () => {
		if (onAction) {
			onAction();
		} else if (user && id) {
			// Default action: Navigate to Scripts page
			navigate(`/${user}/${id}/script`);
		}
	};

	return (
		<div className={`empty-state-wrapper ${className}`.trim()}>
			<div className={`empty-state-card ${cardClassName}`.trim()}>
				<div className="empty-state-icon-container">
					<Icon />
				</div>
				<div className="empty-state-content">
					<h2 className="empty-state-title">{title}</h2>
					<p className="empty-state-subtitle">{subtitle}</p>
					{actionLabel && (
						<button className="empty-state-button" onClick={handleAction}>
							{actionLabel}
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

export default EmptyState;
