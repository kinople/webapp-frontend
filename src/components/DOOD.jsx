import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { format } from "date-fns";

const styles = {
	container: { marginTop: "20px", padding: "10px 20px", maxWidth: "1400px", margin: "0 auto" },
	header: {
		textAlign: "center",
		marginBottom: "30px",
		color: "#1e293b",
	},
	title: {
		fontSize: "2rem",
		fontWeight: "700",
		marginBottom: "8px",
		color: "#0f172a",
	},
	subtitle: {
		fontSize: "0.95rem",
		color: "#64748b",
	},
	toggleContainer: {
		display: "flex",
		justifyContent: "center",
		marginBottom: "30px",
		gap: "12px",
	},
	toggleBtn: (active) => ({
		padding: "10px 24px",
		borderRadius: "8px",
		border: active ? "2px solid #2563eb" : "2px solid #e2e8f0",
		backgroundColor: active ? "#2563eb" : "#fff",
		color: active ? "#fff" : "#475569",
		cursor: "pointer",
		fontWeight: "600",
		fontSize: "15px",
		transition: "all 0.2s",
		boxShadow: active ? "0 4px 12px rgba(37,99,235,0.2)" : "0 1px 3px rgba(0,0,0,0.05)",
	}),
	elementGrid: {
		display: "grid",
		gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
		gap: "24px",
		marginBottom: "40px",
	},
	card: {
		border: "2px solid #e2e8f0",
		borderRadius: "16px",
		padding: "18px",
		backgroundColor: "#fff",
		boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
		transition: "all 0.2s",
	},
	cardHeader: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: "12px",
		height: "70px",
	},
	name: {
		fontWeight: "700",
		fontSize: "1.1rem",
		color: "#0f172a",
	},
	flexCheckboxContainer: {
		display: "flex",
		alignItems: "center",
		gap: "6px",
		fontSize: "13px",
		color: "#64748b",
		cursor: "pointer",
	},
	checkbox: {
		width: "16px",
		height: "16px",
		cursor: "pointer",
	},
	tableContainer: {
		marginTop: "40px",
		borderRadius: "12px",
		overflow: "hidden",
		boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
		border: "2px solid #e2e8f0",
	},
	table: {
		width: "100%",
		borderCollapse: "collapse",
		fontSize: "20px",
		tableLayout: "fixed",
	},
	th: {
		backgroundColor: "#f8fafc",
		padding: "14px 16px",
		textAlign: "left",
		borderBottom: "2px solid #e2e8f0",
		fontWeight: "700",
		color: "#0f172a",
		fontSize: "15px",
	},
	thName: {
		width: "25%",
	},
	thDates: {
		width: "75%",
	},
	td: {
		padding: "12px 16px",
		borderBottom: "1px solid #f1f5f9",
		verticalAlign: "middle",
	},
	tdName: {
		fontWeight: "600",
		color: "#334155",
	},
	flexibleBadge: {
		display: "inline-block",
		padding: "4px 12px",
		borderRadius: "12px",
		backgroundColor: "#dbeafe",
		color: "#1e40af",
		fontSize: "13px",
		fontWeight: "600",
	},
	saveBtn: {
		marginTop: "24px",
		padding: "12px 32px",
		borderRadius: "8px",
		cursor: "pointer",
		backgroundColor: "#2563eb",
		color: "#fff",
		border: "none",
		fontWeight: "600",
		fontSize: "15px",
		transition: "all 0.2s",
		boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
		display: "block",
		margin: "24px auto 0",
	},
};

const DOODSchedule = ({ scheduleData }) => {
	const [activeType, setActiveType] = useState("characters");

	const elements = Object.values(scheduleData["dates"][activeType]);
	console.log(scheduleData);
	// Separate availability state for each type
	const [availability, setAvailability] = useState({
		characters: Object.fromEntries(Object.values(scheduleData["dates"]["characters"]).map((el) => [el.name, el.dates])),
		locations: Object.fromEntries(Object.values(scheduleData["dates"]["locations"]).map((el) => [el.name, el.dates])),
	});

	// Flexible dates state (default: all true)
	const [flexibleDates, setFlexibleDates] = useState({
		characters: Object.fromEntries(Object.values(scheduleData["dates"]["characters"]).map((el) => [el.name, el.dates.length === 0 ? true : false])),
		locations: Object.fromEntries(Object.values(scheduleData["dates"]["locations"]).map((el) => [el.name, el.dates.length === 0 ? true : false])),
	});

	// Handle flexible dates toggle
	const handleFlexibleToggle = (type, elementName) => {
		setAvailability((prev) => ({
			...prev,
			[type]: {
				...prev[type],
				[elementName]: [],
			},
		}));
		setFlexibleDates((prev) => ({
			...prev,
			[type]: {
				...prev[type],
				[elementName]: !prev[type][elementName],
			},
		}));
	};

	// Handle click on calendar day
	const handleDateClick = (type, elementName, date) => {
		// Don't allow date selection if flexible is checked
		if (flexibleDates[type][elementName]) return;

		const dateStr = format(date, "yyyy-MM-dd");
		setAvailability((prev) => {
			const already = prev[type][elementName].includes(dateStr);
			return {
				...prev,
				[type]: {
					...prev[type],
					[elementName]: already ? prev[type][elementName].filter((d) => d !== dateStr) : [...prev[type][elementName], dateStr],
				},
			};
		});
	};

	const tileClassName = (type, elementName, date) => {
		const dateStr = format(date, "yyyy-MM-dd");
		if (availability[type][elementName].includes(dateStr)) return "selected-date";
		return null;
	};

	const handleSave = () => {
		console.log("Saved Availability:", { availability, flexibleDates });
	};

	return (
		<div style={styles.container}>
			{/* 🔹 Header */}
			<div style={styles.header}>
				<h1 style={styles.title}>Schedule Availability</h1>
				<p style={styles.subtitle}>Manage character and location availability dates</p>
			</div>

			{/* 🔹 Type Toggle */}
			<div style={styles.toggleContainer}>
				<button style={styles.toggleBtn(activeType === "characters")} onClick={() => setActiveType("characters")}>
					Characters
				</button>
				<button style={styles.toggleBtn(activeType === "locations")} onClick={() => setActiveType("locations")}>
					Locations
				</button>
			</div>

			{/* 🔹 Calendar Cards */}
			<div style={styles.elementGrid}>
				{elements.map((el) => (
					<div key={el.id} style={styles.card}>
						<div style={styles.cardHeader}>
							<div style={styles.name}>{el.name}</div>
							<label style={styles.flexCheckboxContainer}>
								<input
									type="checkbox"
									style={styles.checkbox}
									checked={flexibleDates[activeType][el.name]}
									onChange={() => handleFlexibleToggle(activeType, el.name)}
								/>
								<span>Flexible</span>
							</label>
						</div>
						<Calendar
							minDetail="month"
							next2Label={null}
							prev2Label={null}
							onClickDay={(date) => handleDateClick(activeType, el.name, date)}
							tileClassName={({ date }) => tileClassName(activeType, el.name, date)}
							tileDisabled={() => flexibleDates[activeType][el.name]}
							className="clean-calendar"
						/>
					</div>
				))}
			</div>

			{/* 🔹 Summary Table */}
			<div style={styles.tableContainer}>
				<table style={styles.table}>
					<thead>
						<tr>
							<th style={{ ...styles.th, ...styles.thName }}>{activeType === "characters" ? "Character" : "Location"}</th>
							<th style={{ ...styles.th, ...styles.thDates }}>Selected Dates</th>
						</tr>
					</thead>
					<tbody>
						{elements.map((el) => (
							<tr key={el.id}>
								<td style={{ ...styles.td, ...styles.tdName }}>{el.name}</td>
								<td style={styles.td}>
									{flexibleDates[activeType][el.name] ? (
										<span style={styles.flexibleBadge}>✓ Available All Dates</span>
									) : availability[activeType][el.name].length > 0 ? (
										availability[activeType][el.name]
											.sort()
											.map((d) => format(new Date(d), "dd MMM yyyy"))
											.join("      ,      ")
									) : (
										<span style={{ color: "#94a3b8" }}>No dates selected</span>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<button
				style={styles.saveBtn}
				onClick={handleSave}
				onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
				onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
			>
				Save Availability
			</button>

			{/* 🔹 Calendar Styling */}
			<style>
				{`
		.clean-calendar {
			width: 100%;
			font-size: 12px;
		}
		.clean-calendar .react-calendar__tile {
			padding: 5px 0;
			height: 28px;
			transition: all 0.2s;
		}
		.clean-calendar .react-calendar__tile:enabled:hover {
			background: #f1f5f9;
			border-radius: 6px;
		}
		.clean-calendar .react-calendar__tile--now {
			background: transparent !important;
			color: inherit !important;
		}
		.clean-calendar .selected-date {
			background: #86efac !important;
			border-radius: 6px !important;
			color: #064e3b !important;
			font-weight: 700;
		}
		.clean-calendar .react-calendar__tile:disabled {
			background: #f8fafc;
			color: #cbd5e1;
			cursor: not-allowed;
		}
		.clean-calendar .react-calendar__navigation button {
			font-size: 13px;
			padding: 4px 8px;
			font-weight: 600;
			color: #475569;
		}
		.clean-calendar .react-calendar__navigation button:enabled:hover {
			background: #f1f5f9;
			border-radius: 6px;
		}
		.clean-calendar .react-calendar__navigation {
			margin-bottom: 6px;
		}
		.clean-calendar .react-calendar__month-view__weekdays {
			font-weight: 600;
			color: #64748b;
			font-size: 11px;
		}
	`}
			</style>
		</div>
	);
};

export default DOODSchedule;
