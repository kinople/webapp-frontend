import React, { useEffect, useState } from "react";

export default function ProgressBar({ numScenes, isUploading, breakdownComplete, onComplete }) {
	const [percent, setPercent] = useState(0);
	const [message, setMessage] = useState("Uploading script...");
	const [hasCalledComplete, setHasCalledComplete] = useState(false);

	// Calculate total time based on number of scenes (3 seconds per scene)
	// Default to 60 seconds if numScenes is not provided
	const TOTAL_MS = numScenes ? numScenes * 4000 : 60000;
	const START_PERCENT = 20; // Start from 20% after upload
	const TARGET = (numScenes + 8250)/90 > 100 ? 99 : (numScenes + 8250)/90;

	useEffect(() => {
		// If still uploading or numScenes not available yet, show 20% after upload completes
		if (isUploading || !numScenes) {
			setMessage("Uploading script...");
			// Show 0% while uploading, 20% once upload is done but before breakdown starts
			setPercent(isUploading ? 0 : START_PERCENT);
			return;
		}

		// Once upload is complete and we have numScenes, start the progress from 20%
		const start = Date.now();
		setMessage("Starting breakdown...");

		const interval = setInterval(() => {
			const elapsed = Date.now() - start;
			const t = Math.min(1, elapsed / TOTAL_MS);
			// Progress from START_PERCENT to TARGET
			const next = Math.round((START_PERCENT + (TARGET - START_PERCENT) * t) * 100) / 100;
			setPercent(next);
		}, 200);

		return () => clearInterval(interval);
	}, [isUploading, numScenes, TOTAL_MS, START_PERCENT, TARGET]);

	// Handle when breakdown is complete - animate to 100%
	useEffect(() => {
		if (breakdownComplete && !hasCalledComplete) {
			setMessage("Finalizing breakdown...");
			
			// Animate to 100% over 1 second
			const currentPercent = percent;
			const remainingPercent = 100 - currentPercent;
			const animationDuration = 1000; // 1 second
			const steps = 50;
			const stepDuration = animationDuration / steps;
			const percentPerStep = remainingPercent / steps;
			
			let step = 0;
			const interval = setInterval(() => {
				step++;
				const newPercent = Math.min(100, currentPercent + (percentPerStep * step));
				setPercent(newPercent);
				
				if (newPercent >= 100) {
					clearInterval(interval);
					setMessage("Complete!");
					// Call the completion callback after a brief delay
					setTimeout(() => {
						if (onComplete && !hasCalledComplete) {
							setHasCalledComplete(true);
							onComplete();
						}
					}, 300);
				}
			}, stepDuration);
			
			return () => clearInterval(interval);
		}
	}, [breakdownComplete, percent, onComplete, hasCalledComplete]);

	useEffect(() => {
		// Don't update message if we're still uploading or waiting for numScenes
		if (isUploading || !numScenes) {
			setMessage("Uploading script...");
			return;
		}

		// Don't update message if breakdown is complete
		if (breakdownComplete) {
			return;
		}

		// Update message based on progress (starting from 20%)
		if (percent <= 20) setMessage("Reading Script");
		else if (percent < 50) setMessage("Identifying Scenes ...");
		else setMessage("Extracting Elements ...");
	}, [percent, isUploading, numScenes, breakdownComplete]);

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
