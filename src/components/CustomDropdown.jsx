import React, { useState, useRef, useEffect } from 'react';
import '../css/CustomDropdown.css';

const CustomDropdown = ({ value, onChange, options, className, style, placeholder = "Select...", disabled = false }) => {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef(null);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const selectedOption = options.find((opt) => opt.value == value) || options[0];

	return (
		<div ref={dropdownRef} className={`custom-dropdown-container ${className || ""} ${disabled ? "disabled" : ""}`} style={style}>
			<button
				type="button"
				className={`custom-dropdown-btn ${isOpen ? "open" : ""}`}
				onClick={() => !disabled && setIsOpen(!isOpen)}
				disabled={disabled}
			>
				<span className="custom-dropdown-label">{selectedOption ? selectedOption.label : placeholder}</span>
				<span className={`custom-dropdown-icon ${isOpen ? "open" : ""}`}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
				</span>
			</button>
			<div className={`custom-dropdown-menu-wrapper ${isOpen ? "open" : ""}`}>
				<div className="custom-dropdown-menu">
					{options.map((opt) => (
						<div
							key={opt.value}
							className={`custom-dropdown-item ${value == opt.value ? "selected" : ""}`}
							onClick={() => {
								onChange({ target: { value: opt.value } });
								setIsOpen(false);
							}}
						>
							{opt.label}
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default CustomDropdown;
