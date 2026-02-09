import React, { useEffect, useState } from "react";

export default function ProgressBar() {
	const [percent, setPercent] = useState(0);
	const [message, setMessage] = useState("Starting...");

	const TOTAL_MS = 360000; // 6 minutes
	const TARGET = 95;

	useEffect(() => {
		const start = Date.now();

		const interval = setInterval(() => {
			const elapsed = Date.now() - start;
			const t = Math.min(1, elapsed / TOTAL_MS);
			const next = Math.round(TARGET * t * 100) / 100;
			setPercent(next);
		}, 200);

		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		if (percent < 20) setMessage("Reading Script");
		else if (percent < 50) setMessage("Identifying Scenes ...");
		else setMessage("Extracting Elements ...");
	}, [percent]);

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

	const percentText = {
		marginTop: "6px",
		fontSize: "12px",
		color: "#666",
	};

	return (
		<div style={container}>
			<div style={messageStyle}>{message}</div>

			<div style={barBg}>
				<div style={barFill} />
			</div>

			<div style={percentText}>{parseInt(percent)}%</div>
		</div>
	);
}