import React from "react";

export default function ProgressBarForBreakdown({ progress, message }) {
    const percent = progress || 0; // Use prop, default to 0
    
    // Use custom message if provided, otherwise determine from progress
    let displayMessage = message;
    if (!displayMessage) {
        if (percent < 15) displayMessage = "Uploading script...";
        else if (percent < 30) displayMessage = "Parsing PDF...";
        else if (percent < 50) displayMessage = "Extracting scenes...";
        else if (percent < 75) displayMessage = "Generating breakdown...";
        else if (percent < 95) displayMessage = "Processing elements...";
        else if (percent < 100) displayMessage = "Finalizing...";
        else displayMessage = "Breakdown completed!";
    }

    // Inline styles (unchanged)
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
        transition: "width 0.15s ease-out",
    };

    const percentText = {
        marginTop: "6px",
        fontSize: "12px",
        color: "#666",
    };

    return (
        <div style={container}>
            <div style={messageStyle}>{displayMessage}</div>
            <div style={barBg}>
                <div style={barFill} />
            </div>
            <div style={percentText}>{parseInt(percent)}%</div>
        </div>
    );
}
