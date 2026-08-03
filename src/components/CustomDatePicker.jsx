import React, { useRef } from "react";

/**
 * CustomDatePicker — displays dates in dd/mm/yyyy format while
 * keeping the native browser calendar popup.
 *
 * Props:
 *   value       — current value in YYYY-MM-DD (same as native input)
 *   onChange     — receives (e) where e.target.value is YYYY-MM-DD
 *   className   — optional class for the visible text input
 *   placeholder — optional placeholder (default "dd/mm/yyyy")
 *   min / max   — optional min/max in YYYY-MM-DD
 *   disabled    — optional
 *   label       — optional
 */
const CustomDatePicker = ({
	value,
	onChange,
	className = "",
	placeholder = "dd/mm/yyyy",
	min,
	max,
	disabled,
	label,
	...rest
}) => {
	const hiddenRef = useRef(null);

	// Convert YYYY-MM-DD → DD/MM/YYYY for display
	const formatForDisplay = (isoDate) => {
		if (!isoDate) return "";
		const parts = isoDate.split("-");
		if (parts.length !== 3) return isoDate;
		return `${parts[2]}/${parts[1]}/${parts[0]}`;
	};

	const handleClick = () => {
		if (hiddenRef.current && !disabled) {
			hiddenRef.current.showPicker?.();
			hiddenRef.current.focus();
		}
	};

	return (
		<div className="custom-datepicker-wrapper" style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
			{/* Visible text input showing dd/mm/yyyy */}
			<input
				type="text"
				readOnly
				value={formatForDisplay(value)}
				placeholder={placeholder}
				className={className}
				onClick={handleClick}
				disabled={disabled}
				style={{ cursor: disabled ? "not-allowed" : "pointer", width: "120px" }}
				{...rest}
			/>
			{/* Hidden native date input for the calendar popup */}
			<input
				ref={hiddenRef}
				type="date"
				value={value || ""}
				min={min}
				max={max}
				onChange={onChange}
				disabled={disabled}
				tabIndex={-1}
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: "100%",
					height: "100%",
					opacity: 0,
					pointerEvents: "none",
				}}
			/>
		</div>
	);
};

export default CustomDatePicker;
