import React from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { PiCloudSun, PiMoon, PiSun, PiMapPin, PiFirstAid, PiList, PiUser, PiPhone, PiMegaphoneBold } from 'react-icons/pi';
import '../css/CallSheetPreview.css';

const CallSheetPreview = ({ data, project, logoTs, logo2Ts, crewList, showActions = true }) => {
    // Helper to format time
    const fmtTime = (time) => {
        if (!time) return '';
        if (typeof time === 'object') {
            const t = time.utcTime || time.localTime || time.time || time.dateTime || '';
            if (!t) return '';
            return fmtTime(t);
        }

        if (typeof time === 'string') {
            const trimmed = time.trim();
            if (['On Call', 'N/A', 'As Per HOD'].includes(trimmed)) return trimmed;
            if (trimmed === 'Crew Call') return fmtTime(data.crew_call);

            if (trimmed.includes('T')) {
                // ISO date string
                return new Date(trimmed).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            }
            if (trimmed.includes(':')) {
                const [h, m] = trimmed.split(':');
                return new Date(0, 0, 0, h, m).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            }
        }
        return time;
    };

    const parseTimeToMinutes = (value) => {
        if (!value) return null;
        const raw = typeof value === 'string' ? value : fmtTime(value);
        if (!raw) return null;
        const candidate = raw.split(/to|-/i)[0].trim();
        const match = candidate.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (!match) return null;
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const ampm = (match[3] || '').toUpperCase();
        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        return (hours * 60) + minutes;
    };

    // Helper to format date
    const fmtDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    };

    const limitWords = (text, maxWords) => {
        if (!text) return '';
        const words = text.split(/\s+/).filter(Boolean);
        if (words.length <= maxWords) return text;
        return words.slice(0, maxWords).join(' ');
    };

    const sumPages = (scenes) => {
        if (!scenes || scenes.length === 0) return '0';
        let totalEights = 0;
        scenes.forEach(s => {
            const val = String(s.pages || '0').trim();
            if (val.includes('/')) {
                const parts = val.split(' ');
                if (parts.length === 2) {
                    const whole = parseInt(parts[0]) || 0;
                    const [num, den] = parts[1].split('/');
                    totalEights += (whole * 8) + (parseInt(num) || 0);
                } else {
                    const [num, den] = parts[0].split('/');
                    totalEights += (parseInt(num) || 0);
                }
            } else {
                totalEights += Math.round((parseFloat(val) || 0) * 8);
            }
        });
        const whole = Math.floor(totalEights / 8);
        const rem = totalEights % 8;
        return rem > 0 ? `${whole > 0 ? whole + ' ' : ''}${rem}/8` : `${whole}`;
    };

    const chunkItems = (items, chunkSize) => {
        if (!items || items.length === 0) return [];
        const safeChunkSize = Math.max(1, chunkSize || 1);
        const chunks = [];
        for (let index = 0; index < items.length; index += safeChunkSize) {
            chunks.push(items.slice(index, index + safeChunkSize));
        }
        return chunks;
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=1000,height=800');
        const content = document.getElementById('call-sheet-preview').innerHTML;

        // Copy all styles from current document to ensure WYSIWYG
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map(node => node.outerHTML)
            .join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <base href="${window.location.origin}/">
                    <title>Call Sheet - Day ${data.day_number}</title>
                    ${styles}
                    <style>
                        body { 
                            margin: 0 !important; 
                            padding: 0 !important; 
                            background-color: white; 
                            -webkit-print-color-adjust: exact; 
                            print-color-adjust: exact;
                        }
                        /* Hide things that shouldn't print */
                        @media print {
                            .no-print, .csp-print-btn, .csp-actions { display: none !important; }
                            body { -webkit-print-color-adjust: exact; }
                            @page { margin: 0; size: auto; }
                        }
                    </style>
                </head>
                <body>
                    <div class="csp-container">
                        ${content}
                    </div>
                    <script>
                        // Wait for resources to load
                        window.onload = () => {
                            setTimeout(() => {
                                window.print();
                                // window.close(); // Optional: Close after print
                            }, 500); 
                        };
                        // Fallback trigger if onload already fired (e.g. about:blank context weirdness)
                        if (document.readyState === 'complete') {
                            setTimeout(() => { window.print(); }, 500);
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleDownloadPdf = async () => {
        const wrapper = document.getElementById('call-sheet-preview');
        if (!wrapper) return;

        wrapper.classList.add('csp-pdf-mode');

        const dayNumber = data?.day_number || 'call_sheet';
        const filename = `call_sheet_day_${dayNumber}.pdf`;

        try {
            // Wait for fonts and images
            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }

            const images = Array.from(wrapper.querySelectorAll('img'));
            await Promise.all(images.map((img) => new Promise((resolve) => {
                if (img.complete) return resolve();
                const onDone = () => resolve();
                img.addEventListener('load', onDone, { once: true });
                img.addEventListener('error', onDone, { once: true });
            })));

            await new Promise(requestAnimationFrame);

            const pageElements = Array.from(wrapper.querySelectorAll('.csp-page:not(.csp-measure-page)'))
                .filter(el => el.offsetHeight > 100);

            if (pageElements.length === 0) {
                return;
            }

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = 210;
            const pdfHeight = 297;

            // Capture each logical .csp-page as one physical A4 PDF page
            for (let i = 0; i < pageElements.length; i++) {
                const pageEl = pageElements[i];

                const canvas = await html2canvas(pageEl, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    logging: false,
                    width: pageEl.offsetWidth,
                    height: pageEl.offsetHeight,
                    windowWidth: pageEl.scrollWidth,
                    windowHeight: pageEl.scrollHeight
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.98);

                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            }

            pdf.save(filename);
        } catch (err) {
            console.error('PDF Generation Error:', err);
        } finally {
            wrapper.classList.remove('csp-pdf-mode');
        }
    };

    // --- HELPER RENDERS ---
    const getWeatherIcon = () => {
        if (!data.weather) return <PiCloudSun />;
        const desc = (data.weather.desc || '').toLowerCase();

        if (desc.includes('rain') || desc.includes('storm') || desc.includes('thunderstorm')) {
            return <PiCloudSun style={{ color: '#4a90e2' }} />; // Blue for rain
        } else if (desc.includes('cloud') || desc.includes('overcast')) {
            return <PiCloudSun />; // Cloud icon
        } else if (desc.includes('sunny') || desc.includes('clear') || desc.includes('sun')) {
            return <PiSun style={{ color: '#f5a623' }} />; // Orange for sun
        } else if (desc.includes('moon') || desc.includes('night')) {
            return <PiMoon />; // Moon for night
        }
        return <PiCloudSun />;
    };

    const renderWeather = () => {
        if (!data.weather) return null;
        const w = data.weather;
        const getWeatherNumber = (val) => {
            if (val === 0) return 0;
            if (!val) return null;
            if (typeof val === 'number') return val;
            if (typeof val === 'string') {
                const parsed = parseFloat(val);
                return Number.isNaN(parsed) ? null : parsed;
            }
            if (typeof val === 'object') {
                const candidates = [
                    val.value,
                    val.amount,
                    val.number,
                    val.degrees,
                    val.speed,
                    val.probability,
                    val.percent
                ];
                const picked = candidates.find(v => v !== undefined && v !== null);
                const parsed = typeof picked === 'number' ? picked : parseFloat(picked);
                return Number.isNaN(parsed) ? null : parsed;
            }
            return null;
        };
        const precipValue = getWeatherNumber(w.precip);
        const windValue = getWeatherNumber(w.wind);
        return (
            <div className="csp-weather-redesign">
                <div className="csp-weather-temps-row" style={{ gap: '12px' }}>
                    {/* Sunrise */}
                    <div className="csp-weather-temp-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                            <PiSun style={{ color: '#f5a623', fontSize: '20px' }} />
                            <span style={{ fontSize: '18px', fontWeight: '900', whiteSpace: 'nowrap' }}>
                                {w.sunrise ? fmtTime(w.sunrise) : '--:--'}
                            </span>
                        </div>
                        <div className="csp-weather-label" style={{ textAlign: 'center' }}>sunrise</div>
                    </div>

                    {/* Sunset */}
                    <div className="csp-weather-temp-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                            <PiMoon style={{ color: '#4a90e2', fontSize: '20px' }} />
                            <span style={{ fontSize: '18px', fontWeight: '900', whiteSpace: 'nowrap' }}>
                                {w.sunset ? fmtTime(w.sunset) : '--:--'}
                            </span>
                        </div>
                        <div className="csp-weather-label" style={{ textAlign: 'center' }}>sunset</div>
                    </div>
                </div>
                <div className="csp-weather-details">
                    {w.desc || 'Cloudy'}.
                    {precipValue !== null ? ` ${Math.round(precipValue)}% chance of rain.` : ''}
                    {windValue !== null ? ` Wind ${Math.round(windValue)}mph.` : ''}
                </div>
                <div className="csp-weather-sun-row" style={{
                    marginTop: '8px',
                    padding: '4px 10px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '15px',
                    width: '100%',
                    fontWeight: 'normal',
                    fontSize: '11px'
                }}>
                    <span><strong>Low:</strong> <span style={{ color: '#000' }}>{w.low || '--'}°F</span></span>
                    <div style={{ fontSize: '18px', display: 'flex', alignItems: 'center' }}>
                        {getWeatherIcon()}
                    </div>
                    <span><strong>High:</strong> <span style={{ color: '#000' }}>{w.high || '--'}°F</span></span>
                </div>
            </div>
        );
    };

    const renderBanner = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
            {data.walkie_channel && (
                <div className="csp-walkie-strip">
                    WALKIE CHANNEL NO. - {data.walkie_channel}
                </div>
            )}
            <div className="csp-banner-red">
                <div className="csp-banner-col">
                    <strong><PiFirstAid /> EMERGENCY</strong><br />
                    {data.location_details?.emergency?.name || '911'} : {data.location_details?.emergency?.phone || ''}
                </div>
                <div className="csp-banner-divider"></div>
                <div className="csp-banner-col">
                    <strong>🛡️ HARASSMENT & SAFETY</strong><br />
                    {data.location_details?.safety_hotline?.name || 'Safe set hotline'}: {data.location_details?.safety_hotline?.phone || 'N/A'}
                </div>
            </div>
        </div>
    );

    const renderHeader = () => (
        <div className="csp-ref-header">
            {/* Left: Prod Co, Title, Logo */}
            <div className="csp-ref-header-left">

                <div className="csp-ref-title">{project?.title || 'PROJECT TITLE'}</div>
                <div className="csp-logos-row">
                    <img
                        src={`/api/projects/${project?.id || data.project_id}/logo${logoTs ? `?t=${logoTs}` : ''}`}
                        alt="Logo"
                        className="csp-ref-logo"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <img
                        src={`/api/projects/${project?.id || data.project_id}/logo2${logo2Ts ? `?t=${logo2Ts}` : ''}`}
                        alt="Logo 2"
                        className="csp-ref-logo"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                </div>
            </div>

            {/* Center: Call Time Circle */}
            <div className="csp-ref-header-center">
                <div className="csp-ref-circle">
                    <div className="csp-ref-circle-label">Crew Call</div>
                    {(() => {
                        const timeStr = fmtTime(data.crew_call);
                        const match = timeStr && timeStr.match(/(\d+:\d+)\s?(AM|PM)/i);
                        if (match) {
                            return (
                                <>
                                    <div className="csp-ref-circle-time">{match[1]}</div>
                                    <div className="csp-ref-circle-ampm">{match[2].toUpperCase()}</div>
                                </>
                            );
                        }
                        return <div className="csp-ref-circle-time" style={{ fontSize: '16px' }}>{timeStr}</div>;
                    })()}
                </div>
            </div>

            {/* Right: Date info */}
            <div className="csp-ref-header-right">
                <div className="csp-ref-date">{fmtDate(data.date)}</div>
                {data.quote && (
                    <div className="csp-ref-header-quote">
                        "{data.quote}"
                    </div>
                )}
                <div className="csp-ref-day">Day {data.day_number}</div>
            </div>
        </div>
    );


    // --- PAGINATION ENGINE (DYNAMIC FLOW) ---
    const calculatePagination = () => {
        const pages = [];

        // Capacity in pixels (approximate for A4 at standard print DPI)
        // Usable content height after padding (5mm top + 15mm bottom ≈ 76px) and footer (~30px)
        // Total available: ~1016px per page
        // Page 1 usable area after the header block (~430px taken)
        const PAGE_1_CAPACITY = 570;
        const PAGE_N_CAPACITY = 980;

        const HEIGHTS = {
            SECTION_HEADER: 35,
            SCENE_ROW: 55,
            CAST_ROW: 30,
            REQ_CARD_GROUP: 100,
            ADVANCE_ROW: 55
        };

        let currentItems = [];
        let currentHeight = 0;
        let isFirstPage = true;

        const flushPage = () => {
            if (currentItems.length > 0) {
                pages.push({ items: [...currentItems], isFirst: isFirstPage });
                currentItems = [];
                currentHeight = 0;
                isFirstPage = false;
            }
        };

        const addItem = (item, height) => {
            const capacity = isFirstPage ? PAGE_1_CAPACITY : PAGE_N_CAPACITY;
            if (currentHeight + height > capacity && currentItems.length > 0) {
                flushPage();
            }
            currentItems.push(item);
            currentHeight += height;
        };

        // 1. Scenes
        const scenes = data.scenes || [];
        if (scenes.length > 0) {
            // Check if header + at least 2 scene rows fit, otherwise start new page
            const requiredSpace = HEIGHTS.SECTION_HEADER + (HEIGHTS.SCENE_ROW * 2);
            const capacity = isFirstPage ? PAGE_1_CAPACITY : PAGE_N_CAPACITY;
            if (currentHeight + requiredSpace > capacity && currentItems.length > 0) {
                flushPage();
            }

            addItem({ type: 'section-header', text: "TODAY'S SCHEDULE", icon: 'list' }, HEIGHTS.SECTION_HEADER);
            scenes.forEach((s, i) => {
                addItem({ type: 'scene-row', data: s }, HEIGHTS.SCENE_ROW);
            });
        }

        // 2. Cast
        const characters = data.characters || [];
        if (characters.length > 0) {
            // Check if header + at least 3 cast rows fit, otherwise start new page
            const requiredSpace = HEIGHTS.SECTION_HEADER + (HEIGHTS.CAST_ROW * 3);
            const capacity = isFirstPage ? PAGE_1_CAPACITY : PAGE_N_CAPACITY;
            if (currentHeight + requiredSpace > capacity && currentItems.length > 0) {
                flushPage();
            }

            addItem({ type: 'section-header', text: "CAST", icon: 'user' }, HEIGHTS.SECTION_HEADER);
            characters.slice().sort((a, b) => (parseInt(a.character_id) || 999) - (parseInt(b.character_id) || 999))
                .forEach(c => {
                    addItem({ type: 'cast-row', data: c }, HEIGHTS.CAST_ROW);
                });
        }

        // 3. Requirements
        const requirementItems = getRequirementsList(data);
        if (requirementItems.length > 0) {
            // Calculate total estimated height based on total lines of content
            const totalLines = requirementItems.reduce((sum, item) => sum + item.content.split('\n').length + 2, 0); // +2 for header and padding
            const estimatedReqHeight = Math.max(100, (totalLines * 12) / 4); // Divide by 4 columns
            const combinedHeight = HEIGHTS.SECTION_HEADER + estimatedReqHeight;

            // PREVENT ORPHANED HEADER: 
            // If combined doesn't fit, start a new page before adding the header
            const capacity = isFirstPage ? PAGE_1_CAPACITY : PAGE_N_CAPACITY;
            if (currentHeight + combinedHeight > capacity && currentItems.length > 0) {
                flushPage();
            }

            addItem({ type: 'section-header', text: "REQUIREMENTS" }, HEIGHTS.SECTION_HEADER);
            addItem({ type: 'req-block', data: requirementItems }, estimatedReqHeight);
        }

        // 4. Advance Schedule
        const advanceScenes = data.advanced_schedule || [];
        if (advanceScenes.length > 0) {
            // Check if header + at least 2 advance rows fit
            const requiredSpace = HEIGHTS.SECTION_HEADER + (HEIGHTS.ADVANCE_ROW * 2);
            const capacity = isFirstPage ? PAGE_1_CAPACITY : PAGE_N_CAPACITY;
            if (currentHeight + requiredSpace > capacity && currentItems.length > 0) {
                flushPage();
            }

            addItem({ type: 'section-header', text: "ADVANCE SCHEDULE", icon: 'list' }, HEIGHTS.SECTION_HEADER);
            advanceScenes.forEach(s => {
                addItem({ type: 'advance-row', data: s }, HEIGHTS.ADVANCE_ROW);
            });
        }

        flushPage();

        // Ensure at least one page exists (Initial Template)
        if (pages.length === 0) {
            pages.push({
                items: [{ type: 'section-header', text: "TODAY'S SCHEDULE", icon: 'list' }],
                isFirst: true
            });
        }

        return pages;
    };

    // --- PAGINATION LOGIC ---
    const renderPages = () => {
        const pages = [];
        const contentPages = calculatePagination();

        contentPages.forEach((page, pIdx) => {
            pages.push(
                <div className="csp-page" key={`content-page-${pIdx}`}>
                    <div className="csp-page-content">
                        {page.isFirst && (
                            <>
                                <div data-fixed-block="first">{renderHeader()}</div>
                                {/* Shift Start / End strip — compact horizontal bar above info grid */}
                                {(data.shift_start || data.shift_end) && (
                                    <div style={{
                                        display: 'flex', gap: '24px', justifyContent: 'center',
                                        alignItems: 'center', padding: '4px 12px',
                                        background: '#f5f5f5', borderBottom: '1.5px solid #000',
                                        fontSize: '10px', fontWeight: '700', textTransform: 'uppercase',
                                        letterSpacing: '0.5px', fontFamily: `'Outfit', sans-serif`
                                    }} data-fixed-block="first">
                                        {data.shift_start && <span>Shift Start: <span style={{ fontWeight: 400 }}>{fmtTime(data.shift_start)}</span></span>}
                                        {data.shift_start && data.shift_end && <span style={{ opacity: 0.3 }}>|</span>}
                                        {data.shift_end && <span>Shift End: <span style={{ fontWeight: 400 }}>{fmtTime(data.shift_end)}</span></span>}
                                    </div>
                                )}
                                <div className="csp-info-grid-3" data-fixed-block="first">
                                    <div className="csp-col-left">
                                        {renderKeyCrew(crewList)}
                                        {(data.location_details?.hospital?.name || data.location_details?.hospital?.loc) && (
                                            <div className="csp-hospital-ref-box">
                                                <div className="csp-hospital-icon-large"><PiFirstAid /></div>
                                                <div className="csp-hospital-info-col">
                                                    <div className="csp-hospital-ref-title">NEAREST HOSPITAL</div>
                                                    <div className="csp-hospital-name-large">{data.location_details.hospital.name}</div>
                                                    <div className="csp-hospital-details-row">{data.location_details.hospital.loc}</div>
                                                    {data.location_details?.emergency?.phone && (
                                                        <div className="csp-hospital-phone-row"><PiPhone /> {data.location_details.emergency.phone}</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="csp-col-center">
                                        <div className="csp-location-box">
                                            <div className="csp-location-title"><u>Set / Location</u></div>
                                            <div className="csp-location-address">{data.location_details?.set_name || 'Location Name'}</div>
                                            <div className="csp-location-details">
                                                {(() => {
                                                    const parts = (data.location_details?.address || '').split(',');
                                                    const line1 = parts[0]?.trim() || 'Address Line 1';
                                                    const line2 = parts.length > 1 ? parts.slice(1).join(',').trim() : (data.location_details?.city_state || '');
                                                    return <>{line1}<br />{line2}</>;
                                                })()}
                                            </div>
                                            {data.location_details?.latitude && data.location_details?.longitude ? (
                                                <a href={`https://www.google.com/maps/dir/?api=1&destination=${data.location_details.latitude},${data.location_details.longitude}`} target="_blank" rel="noopener noreferrer" className="csp-location-map-link" style={{ display: 'block', marginTop: '10px', textDecoration: 'none' }}>
                                                    <img src={`https://maps.googleapis.com/maps/api/staticmap?center=${data.location_details.latitude},${data.location_details.longitude}&zoom=15&size=200x120&markers=color:red%7C${data.location_details.latitude},${data.location_details.longitude}&key=AIzaSyBGLCFBaUHw6fGo2XbLIQXNIiLTlMjfITo`} alt="Map" style={{ width: '100%', borderRadius: '4px', border: '1px solid #ddd' }} />
                                                    <div style={{ fontSize: '8px', color: '#0066cc', marginTop: '4px', textAlign: 'center', fontWeight: 'bold' }}>📍 Click for directions</div>
                                                </a>
                                            ) : <div className="csp-pin-icon"><PiMapPin /></div>}
                                        </div>
                                    </div>
                                    <div className="csp-col-right">
                                        {(() => {
                                            const times = [
                                                { label: 'Crew Call', value: data.crew_call },
                                                { label: 'Shooting Call', value: data.shoot_call },
                                                { label: 'Breakfast', value: data.meals?.breakfast },
                                                { label: 'Lunch', value: data.meals?.lunch },
                                                { label: 'Est. Wrap', value: data.estimated_wrap },
                                                { label: 'Dinner', value: data.meals?.dinner },
                                                { label: 'Snacks', value: data.meals?.snacks }
                                            ].filter(t => t.value).sort((a, b) => (parseTimeToMinutes(a.value) || 0) - (parseTimeToMinutes(b.value) || 0));
                                            return times.map(t => (
                                                <div className="csp-time-row" key={t.label}>
                                                    <strong>{t.label}:</strong>
                                                    <span className="csp-time-value"><span className="csp-circle-dot">•</span> {fmtTime(t.value)}</span>
                                                </div>
                                            ));
                                        })()}
                                        {renderWeather()}
                                    </div>
                                </div>
                                <div className="csp-instructions-strip" data-fixed-block="first">
                                    {(Array.isArray(data.location_details?.instructions) ? data.location_details.instructions.filter(i => i.trim()).join(' | ') : (data.location_details?.instructions || 'DRINK WATER | NO FORCED CALLS OR VISITORS | WEAR CLOSE-TOED SHOES | NO PHOTOS | REPORT INJURIES | STAY HYDRATED')).toUpperCase()}
                                </div>
                                {data.attention && (
                                    <div className="csp-attention-ref-box" data-fixed-block="first">
                                        <div className="csp-attention-icon"><PiMegaphoneBold /></div>
                                        <div className="csp-attention-text"><strong>ATTENTION:</strong> {data.attention}</div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* RENDER BUCKET ITEMS */}
                        {(() => {
                            const blocks = [];
                            let currentBlock = null;

                            page.items.forEach(item => {
                                if (currentBlock && currentBlock.type === item.type &&
                                    (item.type === 'scene-row' || item.type === 'cast-row' || item.type === 'advance-row')) {
                                    currentBlock.data.push(item.data);
                                } else {
                                    currentBlock = {
                                        type: item.type,
                                        text: item.text,
                                        icon: item.icon,
                                        data: (item.type === 'scene-row' || item.type === 'cast-row' || item.type === 'advance-row') ? [item.data] : item.data
                                    };
                                    blocks.push(currentBlock);
                                }
                            });

                            return blocks.map((block, bIdx) => {
                                if (block.type === 'section-header') {
                                    const isRequirements = block.text === "REQUIREMENTS";
                                    return (
                                        <div key={bIdx} className={isRequirements ? "csp-section-header-clean" : "csp-section-header-bar"}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                                {block.icon === 'list' && <PiList />}
                                                {block.icon === 'user' && <PiUser />}
                                                {block.text}
                                                {block.text === "TODAY'S SCHEDULE" && page.isFirst && (
                                                    <span style={{ fontSize: '0.8em', fontWeight: 'normal', marginLeft: 'auto' }}>
                                                        TOTAL: {sumPages(data.scenes)} PGS
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }
                                if (block.type === 'scene-row' || block.type === 'advance-row') {
                                    return (
                                        <div key={bIdx} className="csp-section-no-border" style={{ marginTop: 0 }}>
                                            <table className="csp-table-redesign">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: '38px' }}>SCENE</th>
                                                        <th style={{ width: '35%' }}>SET/DESCRIPTION</th>
                                                        <th style={{ width: '45px' }}>CAST</th>
                                                        <th style={{ width: '55px' }}>D/N</th>
                                                        <th style={{ width: '38px' }}>PGS</th>
                                                        <th>REMARK</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {block.data.map((scene, sIdx) => (
                                                        <tr key={sIdx}>
                                                            <td className="csp-strong-center">{scene.scene_number}</td>
                                                            <td>
                                                                <strong>{scene.int_ext} {scene.location ? `- ${scene.location}` : ''}</strong>
                                                                <div style={{ fontSize: '0.8em', marginTop: '2px' }}>{scene.description}</div>
                                                            </td>
                                                            <td className="csp-center">{scene.cast_ids ? scene.cast_ids.split(',').map(s => s.trim()).filter(Boolean).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0)).join(', ') : ''}</td>
                                                            <td className="csp-center">
                                                                {scene.day_night === 'CONTINUOUS' ? 'CONT' : scene.day_night}
                                                            </td>
                                                            <td className="csp-center">{scene.pages}</td>
                                                            <td style={{ fontSize: '8.5px' }}>
                                                                <div style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                                                                    {limitWords(scene.remarks, 25)}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                }
                                if (block.type === 'cast-row') {
                                    return (
                                        <div key={bIdx} className="csp-section-no-border" style={{ marginTop: 0 }}>
                                            <table className="csp-table-redesign">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: '28px' }}>ID</th>
                                                        <th style={{ width: '75px' }}>CAST</th>
                                                        <th style={{ width: '110px' }}>CHARACTER</th>
                                                        <th style={{ width: '52px' }} className="csp-center">PICKUP</th>
                                                        <th style={{ width: '52px' }} className="csp-center">LOC</th>
                                                        <th style={{ width: '52px' }} className="csp-center">HMU</th>
                                                        <th style={{ width: '52px' }} className="csp-center">SET</th>
                                                        <th>REMARKS</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {block.data.map((char, cIdx) => (
                                                        <tr key={cIdx}>
                                                            <td className="csp-strong-center">{char.character_id || '-'}</td>
                                                            <td><strong>{char.cast_name}</strong></td>
                                                            <td>{char.character_name}</td>
                                                            <td className="csp-center">{fmtTime(char.pickup)}</td>
                                                            <td className="csp-center">{fmtTime(char.on_location)}</td>
                                                            <td className="csp-center">{fmtTime(char.hmu)}</td>
                                                            <td className="csp-center">{fmtTime(char.on_set)}</td>
                                                            <td style={{ fontSize: '8.5px' }}>
                                                                <div style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                                                                    {limitWords(char.remarks, 25)}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                }
                                if (block.type === 'req-block') {
                                    const reqs = block.data || [];
                                    const cols = [[], [], [], []];
                                    reqs.forEach((r, i) => cols[i % 4].push(r));

                                    return (
                                        <div key={bIdx} className="csp-req-flex-grid" style={{ marginBottom: '10px' }}>
                                            {cols.map((col, ci) => (
                                                <div key={ci} className="csp-req-flex-col">
                                                    {col.map((req, ridx) => (
                                                        <div key={ridx} className="csp-req-card-box">
                                                            <div className="csp-req-card-header">{req.label}</div>
                                                            <div className="csp-req-card-body">
                                                                {req.content.split('\n').map((line, li) => <div key={li}>{line}</div>)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }
                                return null;
                            });
                        })()}
                    </div>
                    <div className="csp-footer">MADE WITH <a href="https://kinople.com" style={{ color: '#e98800ff', textDecoration: 'none' }}   >KINOPLE</a></div>
                </div>
            );
        });

        // 5. Always Isolated Crew Page
        const hasCrewMembers = crewList && crewList.departments && crewList.departments.some(d => d.crew_members && d.crew_members.length > 0);
        if (hasCrewMembers) {
            pages.push(
                <div className="csp-page csp-page-crew" key="page-crew">
                    <div className="csp-page-content">
                        {renderHeader()}
                        <div className="csp-ref-crew-grid">
                            {crewList.departments.map(dept => (
                                <div key={dept.id} className="csp-ref-dept-box">
                                    <div className="csp-ref-dept-header">
                                        <span>{dept.name.toUpperCase()}</span>
                                    </div>
                                    <div className="csp-ref-dept-row" style={{ fontWeight: '800', fontSize: '10px', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '2px' }}>
                                        <div className="csp-ref-dept-col" style={{ width: '35%' }}>POSITION</div>
                                        <div className="csp-ref-dept-col" style={{ flex: 1 }}>NAME</div>
                                        <div className="csp-ref-dept-col" style={{ width: '80px', justifyContent: 'center' }}>RPT LOC</div>
                                    </div>
                                    <div className="csp-ref-dept-rows">
                                        {dept.crew_members.map(m => (
                                            <div key={m.id} className="csp-ref-dept-row">
                                                <div className="csp-ref-dept-col" style={{ width: '35%' }}><span className="csp-ref-role">{m.role}</span></div>
                                                <div className="csp-ref-dept-col" style={{ flex: 1 }}><span className="csp-ref-name">{m.name}</span></div>
                                                <div className="csp-ref-dept-col" style={{ width: '80px', justifyContent: 'center', fontWeight: 'normal' }}>
                                                    {(() => {
                                                        const val = data.crew_calls?.[m.id];
                                                        if (!val) return fmtTime(data.crew_call);
                                                        if (typeof val === 'object') {
                                                            const mode = val.mode || 'custom';
                                                            if (mode === 'crew_call') return fmtTime(data.crew_call);
                                                            if (mode === 'on_call') return 'On Call';
                                                            if (mode === 'na') return 'N/A';
                                                            if (mode === 'as_per_hod') return 'As per HOD';
                                                            // custom — format the stored time
                                                            return fmtTime(val.time) || fmtTime(data.crew_call);
                                                        }
                                                        // Legacy plain string
                                                        return fmtTime(val) || fmtTime(data.crew_call);
                                                    })()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="csp-ref-bottom-grid">
                            <div className="csp-ref-bottom-box">
                                <div className="csp-ref-bottom-header">CREW NOTES</div>
                                <div className="csp-ref-bottom-content">
                                    {(() => {
                                        const allNotes = [];
                                        if (crewList?.departments) {
                                            crewList.departments.forEach(dept => {
                                                if (data.department_notes?.[dept.id]) {
                                                    allNotes.push(
                                                        <div key={dept.id} style={{ marginBottom: '4px' }}>
                                                            {dept.name}: {data.department_notes[dept.id]}
                                                        </div>
                                                    );
                                                }
                                            });
                                        }
                                        return allNotes.length > 0 ? allNotes : 'No additional crew notes.';
                                    })()}
                                </div>
                            </div>
                            <div className="csp-ref-bottom-box">
                                <div className="csp-ref-bottom-header">USEFUL CONTACTS</div>
                                <div className="csp-ref-bottom-content">{renderUsefulContacts(crewList, data)}</div>
                            </div>
                        </div>
                        <div style={{ marginTop: '15px' }}>{renderBanner()}</div>
                    </div>
                    <div className="csp-footer">MADE WITH <a href="https://kinople.com" style={{ color: '#e98800ff' }}>KINOPLE</a></div>
                </div>
            );
        }

        return pages;
    };

    // --- SUB-RENDERERS ---
    const renderScenesTable = (scenes, title, totalPages) => {
        if (!scenes || scenes.length === 0) return null;
        return (
            <div className="csp-section-no-border">
                {title && (
                    <div className="csp-section-header-bar">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><PiList /> {title}</div>
                        {totalPages && <div style={{ fontSize: '0.8em', fontWeight: 'normal' }}>TOTAL: {totalPages} PGS</div>}
                    </div>
                )}
                <table className="csp-table-redesign">
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>SCENE</th>
                            <th style={{ width: '30%' }}>SET/DESCRIPTION</th>
                            <th style={{ width: '50px' }}>CAST</th>
                            <th style={{ width: '75px' }}>D/N</th>
                            <th style={{ width: '50px' }}>PGS</th>
                            <th>REMARK</th>
                        </tr>
                    </thead>
                    <tbody>
                        {scenes.map((scene, idx) => (
                            <tr key={idx}>
                                <td className="csp-strong-center">{scene.scene_number}</td>
                                <td>
                                    <strong>{scene.int_ext} {scene.location ? `- ${scene.location}` : ''}</strong>
                                    <div style={{ fontSize: '0.85em', marginTop: '2px' }}>{scene.description}</div>
                                </td>
                                <td className="csp-center">{scene.cast_ids ? scene.cast_ids.split(',').map(s => s.trim()).filter(Boolean).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0)).join(', ') : ''}</td>
                                <td className="csp-center">
                                    {scene.day_night === 'CONTINUOUS' ? 'CONT' : scene.day_night}
                                </td>
                                <td className="csp-center">{scene.pages}</td>
                                <td>
                                    <div style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap', fontSize: '8.5px' }}>
                                        {scene.remarks}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const getRequirementsList = (d) => {
        const layoutOrder = [
            { cat: 'Set Dressing', label: 'ART SETUP' },
            { cat: 'Main Props', label: 'MAIN PROPS' },
            { cat: 'Other Props', label: 'PROPS' },
            { cat: 'Action Props', label: 'ACTION PROPS' },
            { cat: 'Picture Vehicles', label: 'VEHICLES' },
            { cat: 'Animals', label: 'ANIMALS' },
            { cat: 'Extras', label: 'EXTRAS' },
            { cat: 'Wardrobe', label: 'WARDROBE' }
        ];
        const allReqs = (d?.daily_requirements || [])
            .filter(r => r.content && r.content.trim() !== '')
            .map(r => {
                const isStandard = layoutOrder.find(l => l.cat === r.category);
                return {
                    label: isStandard ? isStandard.label : r.category.toUpperCase(),
                    content: r.content,
                    sortIndex: isStandard ? layoutOrder.indexOf(isStandard) : 999
                };
            });
        allReqs.sort((a, b) => a.sortIndex - b.sortIndex);
        return allReqs;
    };

    const renderRequirements = (d) => {
        const items = getRequirementsList(d);
        if (!items || items.length === 0) return null;

        return (
            <>
                <div className="csp-section-header-bar">REQUIREMENTS</div>
                <div className="csp-req-card-grid">
                    {Array.isArray(items) && items.map((item, idx) => (
                        <div key={idx} className="csp-req-card-box">
                            <div className="csp-req-card-header">{item.label}</div>
                            <div className="csp-req-card-body">
                                {item.content.split('\n').map((line, i) => (
                                    <div key={i} style={{ minHeight: '1.2em' }}>{line}</div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </>
        );
    };


    const renderKeyCrew = (cl) => {
        if (!cl || !cl.departments) return null;

        let contacts = [];

        // 1. Check for manually selected Key Crew from crew_calls
        if (data.crew_calls) {
            // Find all crew IDs that have is_key = true
            const selectedIds = Object.keys(data.crew_calls).filter(id => {
                const val = data.crew_calls[id];
                return typeof val === 'object' && val !== null && val.is_key === true;
            });

            if (selectedIds.length > 0) {
                // Map IDs back to crew members for display
                cl.departments.forEach(dept => {
                    dept.crew_members.forEach(m => {
                        if (selectedIds.includes(String(m.id))) {
                            contacts.push({ role: m.role, name: m.name, phone: m.contact || m.phone });
                        }
                    });
                });
            }
        }

        // 2. Fallback: Auto-generated from Crew List if no manual selection
        if (contacts.length === 0) {
            const keyRoles = ['Producer', 'UPM', 'Unit Production Manager', '1st AD', 'First Assistant Director', 'Location Manager', 'Medic', 'Set Medic'];
            cl.departments.forEach(dept => {
                dept.crew_members.forEach(m => {
                    if (keyRoles.some(r => m.role.toLowerCase().includes(r.toLowerCase())) && m.contact) {
                        contacts.push({ role: m.role, name: m.name, phone: m.contact || m.phone });
                    }
                });
            });
        }

        const displayContacts = contacts.slice(0, 13);
        const medicContact = contacts.find(c => c.role.toLowerCase().includes('medic'));

        return (
            <div className="csp-key-crew-box">
                <div className="csp-key-crew-section">
                    {displayContacts.map((c, i) => (
                        <div key={i} className="csp-key-crew-row">
                            <span className="csp-key-crew-label">{c.role}</span>
                            <div className="csp-key-crew-dots"></div>
                            <span className="csp-key-crew-value">{c.name}</span>
                        </div>
                    ))}
                </div>

                {/* Medic Section */}
                {medicContact && (
                    <div className="csp-medic-row">
                        <span><PiFirstAid /> Set Medic</span>
                        <div className="csp-key-crew-dots"></div>
                        <span><PiPhone /> {medicContact.phone || '(+1) 365-186-446'}</span>
                    </div>
                )}


            </div>
        );
    };

    const renderUsefulContacts = (cl, d) => {
        // Favor manually entered contacts if present
        if (d.useful_contacts && d.useful_contacts.length > 0) {
            return d.useful_contacts.map((c, i) => (
                <div key={i} className="csp-contact-row">
                    <span className="csp-contact-role"><strong>{c.role}</strong> {c.name ? `(${c.name})` : ''}</span>
                    <span className="csp-contact-sep">|</span>
                    <span className="csp-contact-phone">{c.phone}</span>
                </div>
            ));
        }

        // If no useful contacts, return empty message
        return <div style={{ fontStyle: 'italic', color: '#666' }}>No useful contacts added</div>;
    };

    return (
        <div className="csp-wrapper">
            {showActions && (
                <div className="csp-actions">
                    <button onClick={handlePrint} className="csp-print-btn">Print / Save PDF</button>
                    <button onClick={handleDownloadPdf} className="csp-print-btn">Download PDF</button>
                </div>
            )}

            <div id="call-sheet-preview" style={{ margin: 0, padding: 0 }}>
                {renderPages()}
            </div>
        </div>
    );
};

export default CallSheetPreview;
