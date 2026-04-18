import React, { useState, useRef, useEffect, useCallback } from 'react';
import '../css/TimePicker.css';

/* ─── helpers ──────────────────────────────────────────── */
function parse24(val) {
    if (!val || !val.includes(':')) return { h: 12, m: 0, ap: 'AM' };
    const trimmed = String(val).trim();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
    if (!match) return { h: 12, m: 0, ap: 'AM' };
    const hRaw = parseInt(match[1], 10) || 0;
    const m = parseInt(match[2], 10) || 0;
    const meridian = match[3] ? match[3].toUpperCase() : null;

    if (meridian) {
        let h = hRaw;
        if (h === 0) h = 12;
        if (h > 12) h = h % 12 || 12;
        return { h, m, ap: meridian };
    }

    let h = hRaw;
    const ap = h < 12 ? 'AM' : 'PM';
    if (h === 0) h = 12; else if (h > 12) h -= 12;
    return { h, m, ap };
}
function to24(h, m, ap) {
    let hh = h % 12;
    if (ap === 'PM') hh += 12;
    return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function pad(n) { return String(n).padStart(2, '0'); }
function fmtDisplay(val) {
    const { h, m, ap } = parse24(val);
    return `${pad(h)}:${pad(m)} ${ap}`;
}

function fmtDisplayParts(h, m, ap) {
    return `${pad(h)}:${pad(m)} ${ap}`;
}
function polar(cx, cy, r, angleDeg) {
    const rad = (angleDeg - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/* ─── clock constants ───────────────────────────────────── */
const CX = 115, CY = 115, R_OUTER = 95, R_NUM = 77;
const HOUR_NUMS = Array.from({ length: 12 }, (_, i) => i + 1);
const MIN_LABELS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const MIN_TICKS = Array.from({ length: 60 }, (_, i) => i);

/* ─── ClockFace ─────────────────────────────────────────── */
function ClockFace({ mode, hour, minute, onHourChange, onMinuteChange, onModeSwitch, onLiveHourChange, onLiveMinuteChange }) {
    const svgRef = useRef(null);
    const dragging = useRef(false);
    const [hoverVal, setHoverVal] = useState(null); // hovering over which value

    /* live angle while dragging */
    const [liveAngle, setLiveAngle] = useState(null);

    /* committed angle from state */
    const committedAngle = mode === 'hour' ? (hour % 12) * 30 : minute * 6;
    const displayAngle = liveAngle !== null ? liveAngle : committedAngle;
    const handTip = polar(CX, CY, R_NUM, displayAngle);

    /* get angle from pointer event */
    const getAngle = useCallback((e) => {
        const rect = svgRef.current.getBoundingClientRect();
        const dx = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left - CX;
        const dy = (e.clientY ?? e.touches?.[0]?.clientY) - rect.top - CY;
        let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        if (deg < 0) deg += 360;
        return deg;
    }, []);

    /* snap angle to nearest value */
    const snapFromAngle = useCallback((deg) => {
        if (mode === 'hour') {
            return { val: Math.round(deg / 30) % 12 || 12, angle: (Math.round(deg / 30) % 12 || 12) * 30 };
        } else {
            const m = Math.round(deg / 6) % 60;
            return { val: m, angle: m * 6 };
        }
    }, [mode]);

    /* pointer handlers */
    const onPointerDown = useCallback((e) => {
        e.preventDefault();
        dragging.current = true;
        svgRef.current.setPointerCapture(e.pointerId);
        const deg = getAngle(e);
        const { angle } = snapFromAngle(deg);
        setLiveAngle(angle);
    }, [getAngle, snapFromAngle]);

    const onPointerMove = useCallback((e) => {
        if (!dragging.current) return;
        const deg = getAngle(e);
        const { val, angle } = snapFromAngle(deg);
        setLiveAngle(angle);
        if (mode === 'hour') {
            onLiveHourChange?.(val);
        } else {
            onLiveMinuteChange?.(val);
        }
    }, [getAngle, snapFromAngle]);

    const onPointerUp = useCallback((e) => {
        if (!dragging.current) return;
        dragging.current = false;
        const deg = getAngle(e);
        const { val } = snapFromAngle(deg);
        setLiveAngle(null);
        if (mode === 'hour') {
            onLiveHourChange?.(val);
            onHourChange(val);
            setTimeout(onModeSwitch, 200);
        } else {
            onLiveMinuteChange?.(val);
            onMinuteChange(val);
        }
    }, [getAngle, snapFromAngle, mode, onHourChange, onMinuteChange, onModeSwitch, onLiveHourChange, onLiveMinuteChange]);

    /* clean up pointer capture on unmount */
    useEffect(() => () => { dragging.current = false; }, []);

    return (
        <svg
            ref={svgRef}
            width={CX * 2}
            height={CY * 2}
            className="tp-clock-svg"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={() => { if (!dragging.current) setHoverVal(null); }}
            style={{ touchAction: 'none' }}
        >
            {/* outer ring */}
            <circle cx={CX} cy={CY} r={R_OUTER + 10} fill="#fff5f3" />
            <circle cx={CX} cy={CY} r={R_OUTER + 5} fill="#fff" />

            {/* minute tick marks */}
            {mode === 'minute' && MIN_TICKS.map(t => {
                const isMajor = t % 5 === 0;
                const p1 = polar(CX, CY, R_OUTER - 3, t * 6);
                const p2 = polar(CX, CY, R_OUTER + 2, t * 6);
                return (
                    <line key={t}
                        x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                        stroke={isMajor ? '#ffbcb3' : '#ffdad5'}
                        strokeWidth={isMajor ? 2 : 1}
                    />
                );
            })}

            {/* ── hand line (CSS transition makes it silky) ── */}
            <line
                className="tp-hand-line"
                x1={CX} y1={CY}
                x2={handTip.x} y2={handTip.y}
                stroke="#ff6454"
                strokeWidth={2.5}
                strokeLinecap="round"
                style={liveAngle === null
                    ? { transition: 'x2 0.18s cubic-bezier(.4,0,.2,1), y2 0.18s cubic-bezier(.4,0,.2,1)' }
                    : {}
                }
            />

            {/* center dot */}
            <circle cx={CX} cy={CY} r={5} fill="#ff6454" />

            {/* tip circle */}
            <circle
                className="tp-hand-tip"
                cx={handTip.x} cy={handTip.y} r={16}
                fill="#ff6454"
                style={liveAngle === null
                    ? { transition: 'cx 0.18s cubic-bezier(.4,0,.2,1), cy 0.18s cubic-bezier(.4,0,.2,1)' }
                    : {}
                }
            />

            {/* numbers */}
            {mode === 'hour'
                ? HOUR_NUMS.map(n => {
                    const pos = polar(CX, CY, R_NUM, n * 30);
                    const active = n === (hour % 12 || 12);
                    const hover = hoverVal === n;
                    return (
                        <g key={n}
                            onPointerEnter={() => setHoverVal(n)}
                            onPointerLeave={() => setHoverVal(null)}
                            style={{ cursor: 'pointer' }}
                        >
                            {hover && !active && (
                                <circle cx={pos.x} cy={pos.y} r={16} fill="#fff0ee" />
                            )}
                            <text
                                x={pos.x} y={pos.y}
                                textAnchor="middle" dominantBaseline="central"
                                fontSize={14} fontWeight={active || hover ? 700 : 500}
                                fill={active ? '#fff' : hover ? '#c0392b' : '#374151'}
                                style={{ userSelect: 'none', pointerEvents: 'none' }}
                            >{n}</text>
                        </g>
                    );
                })
                : MIN_LABELS.map(n => {
                    const pos = polar(CX, CY, R_NUM, n * 6);
                    const active = n === minute;
                    const hover = hoverVal === n;
                    return (
                        <g key={n}
                            onPointerEnter={() => setHoverVal(n)}
                            onPointerLeave={() => setHoverVal(null)}
                            style={{ cursor: 'pointer' }}
                        >
                            {hover && !active && (
                                <circle cx={pos.x} cy={pos.y} r={14} fill="#fff0ee" />
                            )}
                            <text
                                x={pos.x} y={pos.y}
                                textAnchor="middle" dominantBaseline="central"
                                fontSize={12} fontWeight={active || hover ? 700 : 500}
                                fill={active ? '#fff' : hover ? '#c0392b' : '#374151'}
                                style={{ userSelect: 'none', pointerEvents: 'none' }}
                            >{pad(n)}</text>
                        </g>
                    );
                })
            }
        </svg>
    );
}

/* ─── TimePicker ────────────────────────────────────────── */
export default function TimePicker({ value, onChange, className = '', placeholder = '--:-- --', disabled = false }) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState('hour');
    const [hour, setHour] = useState(12);
    const [min, setMin] = useState(0);
    const [ap, setAp] = useState('AM');
    const [liveHour, setLiveHour] = useState(null);
    const [liveMinute, setLiveMinute] = useState(null);
    const [closing, setClosing] = useState(false);  // for exit animation
    const wrapRef = useRef(null);
    const lastApRef = useRef('AM');

    const openPicker = () => {
        if (disabled) return;
        const p = parse24(value);
        const nextAp = value ? p.ap : lastApRef.current;
        setHour(p.h); setMin(p.m); setAp(nextAp);
        lastApRef.current = nextAp;
        setLiveHour(null); setLiveMinute(null);
        setMode('hour');
        setClosing(false);
        setOpen(true);
    };

    const closePicker = () => {
        setClosing(true);
        setTimeout(() => { setOpen(false); setClosing(false); setLiveHour(null); setLiveMinute(null); }, 160);
    };

    const handleOk = () => {
        onChange(to24(hour, min, ap));
        closePicker();
    };

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) closePicker();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div className={`tp-wrapper${disabled ? ' tp-wrapper--disabled' : ''}${open ? ' tp-wrapper--open' : ''}${className ? ' ' + className : ''}`} ref={wrapRef}>
            {/* trigger */}
            <div className="tp-trigger" onClick={openPicker}>
                <span className={`tp-trigger-text${!value ? ' tp-trigger-placeholder' : ''}`}>
                    {(liveHour !== null || liveMinute !== null)
                        ? fmtDisplayParts(liveHour ?? hour, liveMinute ?? min, ap)
                        : (value ? fmtDisplay(value) : placeholder)}
                </span>
                <span className="tp-clock-icon">🕐</span>
            </div>

            {/* popover */}
            {open && (
                <div className={`tp-popover tp-analog-popover${closing ? ' tp-popover--out' : ''}`}>
                    {/* header */}
                    <div className="tp-analog-header">
                        <span
                            className={`tp-analog-seg${mode === 'hour' ? ' tp-analog-seg--active' : ''}`}
                            onClick={() => setMode('hour')}
                        >{pad(liveHour ?? hour)}</span>
                        <span className="tp-analog-colon">:</span>
                        <span
                            className={`tp-analog-seg${mode === 'minute' ? ' tp-analog-seg--active' : ''}`}
                            onClick={() => setMode('minute')}
                        >{pad(liveMinute ?? min)}</span>
                        <div className="tp-ampm-toggle">
                            <button
                                type="button"
                                className={`tp-ampm-btn${ap === 'AM' ? ' tp-ampm-btn--active' : ''}`}
                                onClick={() => { setAp('AM'); lastApRef.current = 'AM'; }}
                            >AM</button>
                            <button
                                type="button"
                                className={`tp-ampm-btn${ap === 'PM' ? ' tp-ampm-btn--active' : ''}`}
                                onClick={() => { setAp('PM'); lastApRef.current = 'PM'; }}
                            >PM</button>
                        </div>
                    </div>

                    {/* mode label */}
                    <div className="tp-mode-label">{mode === 'hour' ? 'Select hour' : 'Select minute'}</div>

                    {/* clock */}
                    <div className="tp-clock-wrap">
                        <ClockFace
                            mode={mode}
                            hour={hour}
                            minute={min}
                            onHourChange={setHour}
                            onMinuteChange={setMin}
                            onModeSwitch={() => setMode('minute')}
                            onLiveHourChange={setLiveHour}
                            onLiveMinuteChange={setLiveMinute}
                        />
                    </div>

                    {/* actions */}
                    <div className="tp-actions">
                        <button type="button" className="tp-btn tp-btn--cancel" onClick={closePicker}>CANCEL</button>
                        <button type="button" className="tp-btn tp-btn--ok" onClick={handleOk}>OK</button>
                    </div>
                </div>
            )}
        </div>
    );
}
