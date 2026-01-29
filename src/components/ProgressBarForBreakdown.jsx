import React, { useEffect, useState } from "react";

export default function ProgressBar({ progress, numScenes, breakdownComplete, onComplete, statusMessage }) {
	const [percent, setPercent] = useState(0);
	const [message, setMessage] = useState("Starting...");
	const [hasCalledComplete, setHasCalledComplete] = useState(false);

	// Update progress from prop (real-time from SSE)
	useEffect(() => {
		if (progress !== undefined && progress !== null) {
			setPercent(progress);
		}
	}, [progress]);

	// Update message based on status from parent or progress percentage
	useEffect(() => {
		if (statusMessage) {
			setMessage(statusMessage);
		} else if (percent <= 10) {
			setMessage("Uploading script...");
		} else if (percent <= 15) {
			setMessage("Reading script...");
		} else if (percent < 50) {
			setMessage("Identifying scenes...");
		} else if (percent < 95) {
			setMessage("Extracting elements...");
		} else if (percent < 100) {
			setMessage("Finalizing breakdown...");
		} else {
			setMessage("Complete!");
		}
	}, [percent, statusMessage]);

	// Handle when breakdown is complete
	useEffect(() => {
		if (breakdownComplete && percent >= 100 && !hasCalledComplete) {
			setMessage("Complete!");
			// Call the completion callback after a brief delay
			setTimeout(() => {
				if (onComplete && !hasCalledComplete) {
					setHasCalledComplete(true);
					onComplete();
				}
			}, 500);
		}
	}, [breakdownComplete, percent, onComplete, hasCalledComplete]);

	// Inline styles
	const container = {
		width: "100%",
		maxWidth: "600px",
		margin: "20px auto",
		fontFamily: "Arial, sans-serif",
	};

	const messageStyle = {
		marginBottom: "8px",
		fontSize: "14px",
		color: "#444",
	};

	const barBg = {
		width: "100%",
		height: "14px",
		background: "#ddd",
		borderRadius: "10px",
		overflow: "hidden",
		boxShadow: "inset 0 0 4px rgba(0,0,0,0.15)",
	};

	const barFill = {
		height: "100%",
		width: `${percent}%`,
		background: "linear-gradient(to right, #4b6cb7, #182848)",
		transition: "width 0.3s ease",
	};

	const metaRow = {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: "6px",
		fontSize: "12px",
		color: "#666",
	};

	const sceneText = {
		flex: 1,
	};

	const percentText = {
		marginLeft: "auto",
	};

	return (
		<div style={container}>
			<div style={messageStyle}>{message}</div>

			<div style={barBg}>
				<div style={barFill} />
			</div>

			<div style={metaRow}>
				<div style={sceneText}>{numScenes ? `Scenes: ${numScenes}` : ""}</div>
				<div style={percentText}>{parseInt(percent)}%</div>
			</div>
		</div>
	);
}
