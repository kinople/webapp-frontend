import React, { useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import "../css/ManageSchedules.css";

const DroppableTimelineNode = ({ day, onPointerEnter, onClick, topPercentage }) => {
	const { setNodeRef, isOver } = useDroppable({
		id: `timeline-nav-${day.id}`,
	});

	const isUnscheduled = day.id === "unscheduled";
	const dateParts = day.date ? day.date.split("-") : [];
	const formattedDate = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : day.date;

	useEffect(() => {
		if (isOver) {
			onPointerEnter(day.id);
		}
	}, [day.id, isOver, onPointerEnter]);

	return (
		<div
			ref={setNodeRef}
			id={`timeline-node-${day.id}`}
			className={`sched-timeline-node ${isOver ? "sched-timeline-node-over" : ""} ${isUnscheduled ? "sched-timeline-node-unscheduled" : ""}`}
			onClick={() => onClick(day.id)}
			title={formattedDate}
			style={{
				position: topPercentage !== undefined ? "absolute" : "relative",
				top: topPercentage !== undefined ? `calc(${topPercentage}% - 9px)` : undefined, // Center it vertically (-9px since height is 18px total)
				left: topPercentage !== undefined ? "0" : undefined,
				transform: isOver ? "scale(1.5)" : undefined,
				backgroundColor: isOver ? (isUnscheduled ? "#d97706" : "#ff6758") : (isUnscheduled ? "#f59e0b" : undefined),
			}}
		>
			<div className="sched-timeline-tooltip">{formattedDate}</div>
		</div>
	);
};

export default function CustomTimelineScrollbar({ scrollRef, days, isEditing, isDraggingScene = false }) {
	const [thumbHeight, setThumbHeight] = useState(0);
	const [thumbTop, setThumbTop] = useState(0);
	const [nodePositions, setNodePositions] = useState({});
	const [isDraggingThumb, setIsDraggingThumb] = useState(false);
	const startYRef = useRef(0);
	const startScrollTopRef = useRef(0);
	const frameRef = useRef(null);

	const updateScrollAndPositions = React.useCallback(() => {
		if (scrollRef.current) {
			const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
			if (scrollHeight <= clientHeight) {
				setThumbHeight((prev) => (prev === 0 ? prev : 0));
				return;
			}
			const scrollRatio = clientHeight / scrollHeight;
			const newThumbHeight = Math.max(clientHeight * scrollRatio, 40); // min height 40px
			setThumbHeight((prev) => (Math.abs(prev - newThumbHeight) < 0.5 ? prev : newThumbHeight));
			
			const maxScrollTop = scrollHeight - clientHeight;
			const maxThumbTop = clientHeight - newThumbHeight;
			const newThumbTop = maxScrollTop > 0 ? (scrollTop / maxScrollTop) * maxThumbTop : 0;
			setThumbTop((prev) => (Math.abs(prev - newThumbTop) < 0.5 ? prev : newThumbTop));

			// Calculate node positions
			if (days && days.length > 0) {
				const positions = {};
				days.forEach((day) => {
					const el = document.getElementById(`day-column-${day.id}`);
					if (el) {
						const percentage = (el.offsetTop / scrollHeight) * 100;
						positions[day.id] = percentage;
					}
				});
				// Only update state if we successfully found elements
				if (Object.keys(positions).length > 0) {
					setNodePositions((prev) => {
						const prevKeys = Object.keys(prev);
						const nextKeys = Object.keys(positions);
						if (prevKeys.length === nextKeys.length && nextKeys.every((key) => Math.abs((prev[key] ?? -1) - positions[key]) < 0.5)) {
							return prev;
						}
						return positions;
					});
				}
			}
		}
	}, [scrollRef, days]);

	useEffect(() => {
		updateScrollAndPositions();
		window.addEventListener("resize", updateScrollAndPositions);
		
		let observer;
		if (scrollRef.current) {
			// Watch structural changes only; attribute flips during drag can create update loops.
			observer = new MutationObserver(() => {
				if (frameRef.current) {
					cancelAnimationFrame(frameRef.current);
				}
				frameRef.current = requestAnimationFrame(() => {
					updateScrollAndPositions();
					frameRef.current = null;
				});
			});
			observer.observe(scrollRef.current, { childList: true, subtree: true });
		}
		
		return () => {
			window.removeEventListener("resize", updateScrollAndPositions);
			if (observer) observer.disconnect();
			if (frameRef.current) {
				cancelAnimationFrame(frameRef.current);
				frameRef.current = null;
			}
		};
	}, [updateScrollAndPositions]);

	useEffect(() => {
		const el = scrollRef.current;
		if (el) {
			el.addEventListener("scroll", updateScrollAndPositions);
			return () => el.removeEventListener("scroll", updateScrollAndPositions);
		}
	}, [scrollRef, updateScrollAndPositions]);

	const handleThumbMouseDown = (e) => {
		e.preventDefault();
		setIsDraggingThumb(true);
		startYRef.current = e.clientY;
		startScrollTopRef.current = scrollRef.current.scrollTop;
	};

	useEffect(() => {
		const handleMouseMove = (e) => {
			if (!isDraggingThumb || !scrollRef.current) return;
			const deltaY = e.clientY - startYRef.current;
			const { scrollHeight, clientHeight } = scrollRef.current;
			const maxScrollTop = scrollHeight - clientHeight;
			const maxThumbTop = clientHeight - thumbHeight;
			
			if (maxThumbTop > 0) {
				const scrollDelta = (deltaY / maxThumbTop) * maxScrollTop;
				scrollRef.current.scrollTop = startScrollTopRef.current + scrollDelta;
			}
		};

		const handleMouseUp = () => {
			setIsDraggingThumb(false);
		};

		if (isDraggingThumb) {
			window.addEventListener("mousemove", handleMouseMove);
			window.addEventListener("mouseup", handleMouseUp);
		}
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isDraggingThumb, scrollRef, thumbHeight]);

	const scrollToDay = (dayId) => {
		const element = document.getElementById(`day-column-${dayId}`);
		if (element && scrollRef.current) {
			scrollRef.current.scrollTo({
				top: element.offsetTop - 16,
				behavior: isDraggingScene ? "auto" : "smooth"
			});
		}
	};

	const handlePointerEnter = (dayId) => {
		if (!isDraggingScene) return;
		scrollToDay(dayId);
	};

	const handleNodeClick = (dayId) => {
		scrollToDay(dayId);
	};

	if (thumbHeight === 0 || !days || days.length === 0) return null;

	return (
		<div className="sched-custom-scrollbar-track">
			<div 
				className="sched-custom-scrollbar-thumb"
				style={{ height: thumbHeight, top: thumbTop }}
				onMouseDown={handleThumbMouseDown}
			/>
			<div className="sched-timeline-nav">
				{days.map((day) => (
					<DroppableTimelineNode
						key={day.id}
						day={day}
						onPointerEnter={handlePointerEnter}
						onClick={handleNodeClick}
						topPercentage={nodePositions[day.id]}
					/>
				))}
			</div>
		</div>
	);
}
