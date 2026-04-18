import React, { useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { PiCloudSun, PiMoon, PiSun, PiMapPin, PiFirstAid, PiList, PiUser, PiPhone, PiMegaphoneBold } from 'react-icons/pi';
import '../css/CallSheetPreview.css';

const CallSheetPreview = ({
    data,
    project,
    logoTs,
    logo2Ts,
    crewList,
    showActions = true,
    activePreviewTarget = null,
    previewPulseKey = 0
}) => {
    const previewRootRef = useRef(null);
    const pendingFocusRef = useRef({ target: null, pulseKey: 0 });
    const mapDirectionsUrl = data.location_details?.latitude && data.location_details?.longitude
        ? `https://www.google.com/maps/dir/?api=1&destination=${data.location_details.latitude},${data.location_details.longitude}`
        : '';

    const getPreviewTargetProps = (target, className = '') => ({
        'data-preview-target': target,
        className: `csp-preview-target${activePreviewTarget === target ? ' is-active' : ''}${className ? ` ${className}` : ''}`,
    });

    const handleOpenMapInNewTab = (event) => {
        if (!mapDirectionsUrl) return;
        event.preventDefault();
        window.open(mapDirectionsUrl, '_blank', 'noopener,noreferrer');
    };

    useEffect(() => {
        if (!activePreviewTarget || !previewPulseKey || !previewRootRef.current) return;

        pendingFocusRef.current = { target: activePreviewTarget, pulseKey: previewPulseKey };

        let frameId = null;
        let attempts = 0;
        const maxAttempts = 12;

        const alignTargetIntoView = () => {
            if (!previewRootRef.current) return;
            const latest = pendingFocusRef.current;
            if (latest.target !== activePreviewTarget || latest.pulseKey !== previewPulseKey) return;

            const target = previewRootRef.current.querySelector(`[data-preview-target="${activePreviewTarget}"]`);
            const scrollContainer = previewRootRef.current.closest('.msd-right-column');

            if (!scrollContainer) return;

            if (!target) {
                attempts += 1;
                if (attempts < maxAttempts) {
                    frameId = window.requestAnimationFrame(alignTargetIntoView);
                }
                return;
            }

            const targetRect = target.getBoundingClientRect();
            const containerRect = scrollContainer.getBoundingClientRect();
            const padding = 36;
            const isCrewPageTarget =
                activePreviewTarget === 'crew-page' ||
                activePreviewTarget === 'key-crew-box' ||
                activePreviewTarget.startsWith('crew-call:') ||
                activePreviewTarget.startsWith('crew-note:');
            const isRequirementsTarget =
                activePreviewTarget === 'requirements' ||
                activePreviewTarget.startsWith('requirement-card:');
            const isSafetyHotlineTarget =
                activePreviewTarget === 'safety-hotline' ||
                activePreviewTarget === 'safety-hotline-name' ||
                activePreviewTarget === 'safety-hotline-phone';

            if (isCrewPageTarget) {
                const pageNode = target.closest('.csp-page');
                if (pageNode) {
                    const pageRect = pageNode.getBoundingClientRect();
                    const currentScrollTop = scrollContainer.scrollTop;
                    const pageTopWithinContainer = (pageRect.top - containerRect.top) + currentScrollTop;
                    const pageBottomWithinContainer = (pageRect.bottom - containerRect.top) + currentScrollTop;
                    const fullyVisible =
                        pageRect.top >= containerRect.top + 12 &&
                        pageRect.bottom <= containerRect.bottom - 12;

                    if (!fullyVisible) {
                        const maxScrollTop = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
                        const desiredScrollTop = Math.min(
                            maxScrollTop,
                            Math.max(0, pageTopWithinContainer - 16)
                        );

                        scrollContainer.scrollTo({
                            top: desiredScrollTop,
                            behavior: 'smooth',
                        });

                        attempts += 1;
                        if (attempts < maxAttempts) {
                            frameId = window.requestAnimationFrame(alignTargetIntoView);
                        }
                        return;
                    }

                    const targetFullyVisibleWithinPage =
                        targetRect.top >= containerRect.top + padding &&
                        targetRect.bottom <= containerRect.bottom - padding;

                    if (targetFullyVisibleWithinPage) return;

                    const desiredTargetScrollTop = Math.min(
                        Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight),
                        Math.max(
                            0,
                            pageTopWithinContainer - 16 + Math.max(0, targetRect.top - pageRect.top) - 24
                        )
                    );

                    scrollContainer.scrollTo({
                        top: desiredTargetScrollTop,
                        behavior: 'smooth',
                    });
                    return;
                }
            }

            if (isRequirementsTarget) {
                const requirementsNode =
                    target.closest('[data-preview-target="requirements"]') ||
                    previewRootRef.current.querySelector('[data-preview-target="requirements"]');

                if (requirementsNode) {
                    const requirementsRect = requirementsNode.getBoundingClientRect();
                    const currentScrollTop = scrollContainer.scrollTop;
                    const requirementsTopWithinContainer =
                        (requirementsRect.top - containerRect.top) + currentScrollTop;
                    const requirementsBottomWithinContainer =
                        (requirementsRect.bottom - containerRect.top) + currentScrollTop;
                    const fullyVisible =
                        requirementsRect.top >= containerRect.top + 12 &&
                        requirementsRect.bottom <= containerRect.bottom - 12;

                    if (!fullyVisible) {
                        const maxScrollTop = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
                        const desiredScrollTop = Math.min(
                            maxScrollTop,
                            Math.max(0, requirementsTopWithinContainer - 16)
                        );

                        scrollContainer.scrollTo({
                            top: desiredScrollTop,
                            behavior: 'smooth',
                        });

                        attempts += 1;
                        if (attempts < maxAttempts) {
                            frameId = window.requestAnimationFrame(alignTargetIntoView);
                        }
                        return;
                    }

                    const targetFullyVisibleWithinSection =
                        targetRect.top >= containerRect.top + padding &&
                        targetRect.bottom <= containerRect.bottom - padding;

                    if (targetFullyVisibleWithinSection) return;

                    const desiredTargetScrollTop = Math.min(
                        Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight),
                        Math.max(
                            0,
                            requirementsTopWithinContainer - 16 + Math.max(0, targetRect.top - requirementsRect.top) - 24
                        )
                    );

                    scrollContainer.scrollTo({
                        top: desiredTargetScrollTop,
                        behavior: 'smooth',
                    });
                    return;
                }
            }

            if (isSafetyHotlineTarget) {
                const hotlineNode =
                    target.closest('[data-preview-target="safety-hotline"]') ||
                    previewRootRef.current.querySelector('[data-preview-target="safety-hotline"]');

                if (hotlineNode) {
                    const pageNode = hotlineNode.closest('.csp-page');
                    const currentScrollTop = scrollContainer.scrollTop;

                    if (pageNode) {
                        const pageRect = pageNode.getBoundingClientRect();
                        const pageTopWithinContainer = (pageRect.top - containerRect.top) + currentScrollTop;
                        const pageFullyVisible =
                            pageRect.top >= containerRect.top + 12 &&
                            pageRect.bottom <= containerRect.bottom - 12;

                        if (!pageFullyVisible) {
                            const maxScrollTop = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
                            scrollContainer.scrollTo({
                                top: Math.min(maxScrollTop, Math.max(0, pageTopWithinContainer - 16)),
                                behavior: 'smooth',
                            });

                            attempts += 1;
                            if (attempts < maxAttempts) {
                                frameId = window.requestAnimationFrame(alignTargetIntoView);
                            }
                            return;
                        }
                    }

                    const hotlineRect = hotlineNode.getBoundingClientRect();
                    const hotlineTopWithinContainer = (hotlineRect.top - containerRect.top) + currentScrollTop;
                    const hotlineBottomWithinContainer = (hotlineRect.bottom - containerRect.top) + currentScrollTop;
                    const hotlineFullyVisible =
                        hotlineRect.top >= containerRect.top + 12 &&
                        hotlineRect.bottom <= containerRect.bottom - 12;

                    if (!hotlineFullyVisible) {
                        const maxScrollTop = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
                        const desiredScrollTop = hotlineRect.top < containerRect.top + 12
                            ? Math.max(0, hotlineTopWithinContainer - 16)
                            : Math.max(0, hotlineBottomWithinContainer - scrollContainer.clientHeight + 16);

                        scrollContainer.scrollTo({
                            top: Math.min(maxScrollTop, desiredScrollTop),
                            behavior: 'smooth',
                        });
                        return;
                    }
                }
            }

            const isVisible =
                targetRect.top >= containerRect.top + padding &&
                targetRect.bottom <= containerRect.bottom - padding;

            if (isVisible) return;

            const currentScrollTop = scrollContainer.scrollTop;
            const targetTopWithinContainer = (targetRect.top - containerRect.top) + currentScrollTop;
            const targetBottomWithinContainer = (targetRect.bottom - containerRect.top) + currentScrollTop;
            const targetHeight = Math.max(targetRect.height, target.offsetHeight, 1);
            const desiredTop = Math.max(
                0,
                targetTopWithinContainer - ((scrollContainer.clientHeight - Math.min(targetHeight, scrollContainer.clientHeight)) * 0.35)
            );
            const desiredBottom = Math.max(0, targetBottomWithinContainer - scrollContainer.clientHeight + padding);
            const nextScrollTop = targetRect.top < containerRect.top + padding
                ? desiredTop
                : desiredBottom;

            scrollContainer.scrollTo({
                top: nextScrollTop,
                behavior: 'smooth',
            });
        };

        alignTargetIntoView();

        return () => {
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
        };
    }, [activePreviewTarget, previewPulseKey]);
    const formatSceneDisplay = (scene) => {
        const sceneNumber = String(scene?.scene_number ?? '').trim();
        if (!sceneNumber) return '';
        return sceneNumber;
    };

    const hasEpisodeColumn = (scenes = []) => {
        return Array.isArray(scenes) && scenes.some((scene) => String(scene?.episode_number ?? '').trim() !== '');
    };

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

    const limitChars = (text, maxChars) => {
        if (!text) return '';
        if (text.length <= maxChars) return text;
        return text.slice(0, maxChars);
    };

    const buildCharacterPreviewKey = (character, fallbackIndex = 0) => {
        const rawId = String(character?.character_id || '').trim();
        if (rawId) return `id:${rawId}`;

        const rawName = String(character?.character_name || '').trim().toLowerCase();
        if (rawName) return `name:${rawName.replace(/\s+/g, '-')}`;

        return `row:${fallbackIndex}`;
    };

    const buildScenePreviewKey = (scene, fallbackIndex = 0) => {
        const rawScene = String(scene?.scene_number || '').trim();
        if (rawScene) return `scene:${rawScene.replace(/\s+/g, '-')}`;
        return `row:${fallbackIndex}`;
    };

    const buildRequirementPreviewKey = (requirement, fallbackIndex = 0) => {
        const rawCategory = String(requirement?.category || requirement?.label || '').trim().toLowerCase();
        if (rawCategory) return rawCategory.replace(/\s+/g, '-');
        return `req-${fallbackIndex}`;
    };

    const buildContactPreviewKey = (contact, fallbackIndex = 0) => {
        if (contact?.id) return String(contact.id);
        const rawRole = String(contact?.role || '').trim().toLowerCase();
        if (rawRole) return rawRole.replace(/\s+/g, '-');
        return `contact-${fallbackIndex}`;
    };

    const buildCrewStateKey = (crew, deptId = '', fallbackIndex = 0) => {
        const rawCrewId = crew?.id;
        if (rawCrewId !== undefined && rawCrewId !== null && String(rawCrewId).trim() !== '') {
            return `id:${String(rawCrewId).trim()}`;
        }

        const namePart = String(crew?.name || '').trim().toLowerCase().replace(/\s+/g, '-');
        const rolePart = String(crew?.role || '').trim().toLowerCase().replace(/\s+/g, '-');
        return `temp:${String(deptId || 'dept').trim() || 'dept'}:${fallbackIndex}:${namePart || 'crew'}:${rolePart || 'role'}`;
    };

    const formatPhoneDisplay = (raw) => {
        if (!raw) return '';
        const trimmed = String(raw).trim();
        if (!trimmed) return '';
        const hasPlus = trimmed.startsWith('+');
        const digits = trimmed.replace(/\D/g, '');
        if (!digits) return trimmed;

        const groupDigits = (d) => {
            if (d.length <= 3) return d;
            if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
            if (d.length <= 10) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
            return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 10)} ${d.slice(10)}`;
        };

        const formatNational10 = (d) => {
            if (d.length !== 10) return null;
            return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
        };

        if (hasPlus) {
            if (digits.length > 10) {
                const country = digits.slice(0, digits.length - 10);
                const national = digits.slice(-10);
                return `+${country} ${formatNational10(national) || groupDigits(national)}`.trim();
            }
            return `+${groupDigits(digits)}`.trim();
        }

        return formatNational10(digits) || groupDigits(digits);
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
            <div {...getPreviewTargetProps('safety-hotline', 'csp-banner-red')}>
                <div className="csp-banner-col">
                    <strong>🛡️ HARASSMENT & SAFETY</strong><br />
                    <span {...getPreviewTargetProps('safety-hotline-name')}>
                        {data.location_details?.safety_hotline?.name || 'Safe set hotline'}
                    </span>
                    :{' '}
                    <span {...getPreviewTargetProps('safety-hotline-phone')}>
                        {data.location_details?.safety_hotline?.phone || 'N/A'}
                    </span>
                </div>
            </div>
        </div>
    );

    const renderHeader = () => (
        <div {...getPreviewTargetProps('header-summary', 'csp-ref-header')}>
            {/* Left: Prod Co, Title, Logo */}
            <div className="csp-ref-header-left">

                <div className="csp-ref-title">{project?.title || 'PROJECT TITLE'}</div>
                <div className="csp-logos-row">
                    <div className="csp-ref-logo-slot">
                        <img
                            src={`/api/projects/${project?.id || data.project_id}/logo${logoTs ? `?t=${logoTs}` : ''}`}
                            alt="Logo"
                            className="csp-ref-logo"
                            onError={(e) => { e.target.style.display = 'none'; }}
                            onLoad={(e) => { e.target.style.display = 'block'; }}
                        />
                    </div>
                    <div className="csp-ref-logo-slot">
                        <img
                            src={`/api/projects/${project?.id || data.project_id}/logo2${logo2Ts ? `?t=${logo2Ts}` : ''}`}
                            alt="Logo 2"
                            className="csp-ref-logo"
                            onError={(e) => { e.target.style.display = 'none'; }}
                            onLoad={(e) => { e.target.style.display = 'block'; }}
                        />
                    </div>
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
                    <div {...getPreviewTargetProps('quote', 'csp-ref-header-quote')}>
                        "{data.quote}"
                    </div>
                )}
                <div className="csp-ref-day">Day {data.day_number}</div>
            </div>
        </div>
    );


    const PAGE_1_CAPACITY = 570;
    const PAGE_N_CAPACITY = 980;
    const HEIGHTS = {
        SECTION_HEADER: 35,
        TABLE_HEADER: 32,
        SCENE_ROW: 55,
        CAST_ROW: 30,
        REQ_CARD_GROUP: 100,
        ADVANCE_ROW: 55,
        CREW_HEADER: 32,
        CREW_DEPT_BASE: 46,
        CREW_DEPT_ROW: 19,
        CREW_GRID_GAP: 6,
        CREW_BOTTOM_GRID: 20,
        BOTTOM_BOX_HEADER: 24,
        BOTTOM_BOX_MIN: 34,
        BOTTOM_BOX_LINE: 14,
        BANNER: 56,
        WALKIE_STRIP: 20
    };

    const estimateTextLines = (value, charsPerLine = 48) => {
        if (!value) return 0;
        return String(value)
            .split('\n')
            .reduce((total, line) => {
                const trimmed = line.trim();
                if (!trimmed) return total + 1;
                return total + Math.max(1, Math.ceil(trimmed.length / charsPerLine));
            }, 0);
    };

    const getCrewDepartmentMembers = (dept) => dept?.crew_members || dept?.crew || [];

    const getCrewDepartmentEstimatedHeight = (memberCount = 0) => {
        return HEIGHTS.CREW_DEPT_BASE + (memberCount * HEIGHTS.CREW_DEPT_ROW) + HEIGHTS.CREW_GRID_GAP;
    };

    const buildCrewPageLayouts = (departments = [], gridCapacity = PAGE_N_CAPACITY) => {
        if (!departments.length) return [];

        const pages = [];
        let pageIndex = 0;
        let currentColumn = 0;
        let columns = [[], []];
        let remainingHeights = [gridCapacity, gridCapacity];
        let columnHeights = [0, 0];

        const pushPage = () => {
            pages.push({
                pageIndex,
                columns,
                columnHeights: [...columnHeights]
            });
            pageIndex += 1;
            currentColumn = 0;
            columns = [[], []];
            remainingHeights = [gridCapacity, gridCapacity];
            columnHeights = [0, 0];
        };

        departments.forEach((dept) => {
            const members = getCrewDepartmentMembers(dept);
            let startIndex = 0;
            let chunkIndex = 0;

            if (members.length === 0) {
                while (remainingHeights[currentColumn] < getCrewDepartmentEstimatedHeight(0)) {
                    if (currentColumn === 0) {
                        currentColumn = 1;
                    } else {
                        pushPage();
                    }
                }

                columns[currentColumn].push({
                    dept,
                    members: [],
                    chunkIndex,
                    isContinuation: false
                });
                const chunkHeight = getCrewDepartmentEstimatedHeight(0);
                remainingHeights[currentColumn] -= chunkHeight;
                columnHeights[currentColumn] += chunkHeight;
                return;
            }

            while (startIndex < members.length) {
                const availableHeight = remainingHeights[currentColumn];
                const maxRowsForColumn = Math.floor((availableHeight - HEIGHTS.CREW_DEPT_BASE - HEIGHTS.CREW_GRID_GAP) / HEIGHTS.CREW_DEPT_ROW);

                if (maxRowsForColumn <= 0) {
                    if (currentColumn === 0) {
                        currentColumn = 1;
                    } else {
                        pushPage();
                    }
                    continue;
                }

                const takeCount = Math.min(members.length - startIndex, maxRowsForColumn);
                const chunkMembers = members.slice(startIndex, startIndex + takeCount);
                const chunkHeight = getCrewDepartmentEstimatedHeight(chunkMembers.length);

                columns[currentColumn].push({
                    dept,
                    members: chunkMembers,
                    chunkIndex,
                    isContinuation: startIndex > 0
                });
                remainingHeights[currentColumn] -= chunkHeight;
                columnHeights[currentColumn] += chunkHeight;
                startIndex += takeCount;
                chunkIndex += 1;

                if (startIndex < members.length) {
                    if (currentColumn === 0) {
                        currentColumn = 1;
                    } else {
                        pushPage();
                    }
                }
            }
        });

        if (columns[0].length > 0 || columns[1].length > 0) {
            pushPage();
        }

        return pages;
    };

    const estimateCrewBottomHeight = (cl, d) => {
        const noteLines = Math.max(
            2,
            (Array.isArray(cl?.departments) ? cl.departments : []).reduce((total, dept) => {
                const note = d?.department_notes?.[dept.id];
                if (!note) return total;
                return total + estimateTextLines(`${dept.name}: ${note}`, 52);
            }, 0)
        );

        const usefulContactLines = Array.isArray(d?.useful_contacts) && d.useful_contacts.length > 0
            ? d.useful_contacts.reduce((total, contact) => {
                const label = `${contact?.role || ''} ${contact?.name ? `(${contact.name})` : ''} ${contact?.phone || ''}`.trim();
                return total + Math.max(1, estimateTextLines(label, 42));
            }, 0)
            : 2;

        const notesHeight = HEIGHTS.BOTTOM_BOX_HEADER + Math.max(HEIGHTS.BOTTOM_BOX_MIN, noteLines * HEIGHTS.BOTTOM_BOX_LINE);
        const contactsHeight = HEIGHTS.BOTTOM_BOX_HEADER + Math.max(HEIGHTS.BOTTOM_BOX_MIN, usefulContactLines * HEIGHTS.BOTTOM_BOX_LINE);

        return HEIGHTS.CREW_BOTTOM_GRID + Math.max(notesHeight, contactsHeight);
    };

    const estimateCrewPageUsedHeight = (gridHeight, cl, d) => {
        const baseHeight =
            HEIGHTS.CREW_HEADER +
            gridHeight +
            estimateCrewBottomHeight(cl, d) +
            HEIGHTS.BANNER;

        return baseHeight + (d?.walkie_channel ? HEIGHTS.WALKIE_STRIP : 0);
    };

    const splitAdvanceScenesForEnding = (advanceScenes, remainingHeight = 0) => {
        const scenes = Array.isArray(advanceScenes) ? advanceScenes : [];
        if (scenes.length === 0) {
            return { inlineScenes: [], overflowChunks: [] };
        }

        const headerFootprint = HEIGHTS.SECTION_HEADER + HEIGHTS.TABLE_HEADER;
        const safeRemainingHeight = Math.max(0, remainingHeight);
        const maxInlineRows = safeRemainingHeight >= (headerFootprint + HEIGHTS.ADVANCE_ROW)
            ? Math.max(0, Math.floor((safeRemainingHeight - headerFootprint) / HEIGHTS.ADVANCE_ROW))
            : 0;

        const inlineCount = Math.min(scenes.length, maxInlineRows);
        const inlineScenes = scenes.slice(0, inlineCount);
        const overflowScenes = scenes.slice(inlineCount);
        const rowsPerOverflowPage = Math.max(
            1,
            Math.floor((PAGE_N_CAPACITY - headerFootprint) / HEIGHTS.ADVANCE_ROW)
        );

        return {
            inlineScenes,
            overflowChunks: chunkItems(overflowScenes, rowsPerOverflowPage)
        };
    };

    const renderAdvanceScheduleSection = (scenes, options = {}) => {
        if (!Array.isArray(scenes) || scenes.length === 0) return null;

        const {
            target = null,
            title = 'ADVANCE SCHEDULE'
        } = options;
        const showEpisodeColumn = hasEpisodeColumn(scenes);

        return (
            <div style={{ marginTop: '15px' }}>
                <div
                    {...(target
                        ? getPreviewTargetProps(target, 'csp-section-header-bar')
                        : { className: 'csp-section-header-bar' })}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <PiList />
                        {title}
                    </div>
                </div>
                <div className="csp-section-no-border" style={{ marginTop: 0 }}>
                    <table className="csp-table-redesign">
                        <thead>
                            <tr>
                                {showEpisodeColumn && <th style={{ width: '32px' }}>EP</th>}
                                <th style={{ width: '38px' }}>SCENE</th>
                                <th style={{ width: '35%' }}>SET/DESCRIPTION</th>
                                <th style={{ width: '45px' }}>CAST</th>
                                <th style={{ width: '55px' }}>D/N</th>
                                <th style={{ width: '38px' }}>PGS</th>
                                <th>REMARK</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scenes.map((scene, sIdx) => {
                                const previewKey = buildScenePreviewKey(scene, sIdx);
                                return (
                                    <tr key={`${previewKey}-${sIdx}`}>
                                        {showEpisodeColumn && <td className="csp-center">{scene.episode_number || '-'}</td>}
                                        <td {...getPreviewTargetProps(`scene-cell:advance:${previewKey}:scene_number`, 'csp-strong-center')}>{formatSceneDisplay(scene)}</td>
                                        <td {...getPreviewTargetProps(`scene-cell:advance:${previewKey}:location`)}>
                                            <strong>{scene.int_ext} {scene.location ? `- ${scene.location}` : ''}</strong>
                                            <div {...getPreviewTargetProps(`scene-cell:advance:${previewKey}:description`)} style={{ fontSize: '0.8em', marginTop: '2px' }}>{scene.description}</div>
                                        </td>
                                        <td {...getPreviewTargetProps(`scene-cell:advance:${previewKey}:cast_ids`, 'csp-center')}>{scene.cast_ids ? scene.cast_ids.split(',').map(s => s.trim()).filter(Boolean).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0)).join(', ') : ''}</td>
                                        <td {...getPreviewTargetProps(`scene-cell:advance:${previewKey}:day_night`, 'csp-center')}>
                                            {scene.day_night === 'CONTINUOUS' ? 'CONT' : scene.day_night}
                                        </td>
                                        <td {...getPreviewTargetProps(`scene-cell:advance:${previewKey}:pages`, 'csp-center')}>{scene.pages}</td>
                                        <td {...getPreviewTargetProps(`scene-cell:advance:${previewKey}:remarks`)} style={{ fontSize: '8.5px' }}>
                                            <div style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                                                {limitChars(scene.remarks, 150)}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderCrewDepartmentBox = (chunk, chunkRenderIndex) => (
        <div key={`${chunk.dept.id}-${chunk.chunkIndex}-${chunkRenderIndex}`} className="csp-ref-dept-box">
            <div className="csp-ref-dept-header">
                <span>
                    {chunk.dept.name.toUpperCase()}
                    {chunk.isContinuation ? ' (CONT.)' : ''}
                </span>
            </div>
            <div className="csp-ref-dept-row" style={{ fontWeight: '800', fontSize: '10px', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '2px' }}>
                <div className="csp-ref-dept-col" style={{ width: '35%' }}>POSITION</div>
                <div className="csp-ref-dept-col" style={{ flex: 1 }}>NAME</div>
                <div className="csp-ref-dept-col" style={{ width: '80px', justifyContent: 'center' }}>RPT LOC</div>
            </div>
            <div className="csp-ref-dept-rows">
                {chunk.members.map((m, memberIdx) => {
                    const globalMemberIndex = getCrewDepartmentMembers(chunk.dept).findIndex((candidate) => candidate === m);
                    const resolvedMemberIndex = globalMemberIndex >= 0 ? globalMemberIndex : memberIdx;
                    const crewKey = buildCrewStateKey(m, chunk.dept.id, resolvedMemberIndex);
                    const displayValue = getCrewCallDisplayValue(m, chunk.dept.id, resolvedMemberIndex);
                    return (
                        <div key={crewKey} className="csp-ref-dept-row">
                            <div className="csp-ref-dept-col" style={{ width: '35%' }}><span className="csp-ref-role">{m.role}</span></div>
                            <div className="csp-ref-dept-col" style={{ flex: 1 }}><span className="csp-ref-name">{m.name}</span></div>
                            <div {...getPreviewTargetProps(`crew-call:${crewKey}`, 'csp-ref-dept-col')} style={{ width: '80px', justifyContent: 'center', fontWeight: 'normal' }}>
                                {displayValue}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // --- PAGINATION ENGINE (DYNAMIC FLOW) ---
    const calculatePagination = () => {
        const pages = [];

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
        const advanceScenes = data.advanced_schedule || [];

        contentPages.forEach((page, pIdx) => {
            pages.push(
                <div className="csp-page" key={`content-page-${pIdx}`}>
                    <div className="csp-page-content">
                        {page.isFirst && (
                            <>
                                <div data-fixed-block="first">{renderHeader()}</div>
                                {/* Shift Start / End strip — compact horizontal bar above info grid */}
                                {(data.shift_start || data.shift_end) && (
                                    <div
                                        {...getPreviewTargetProps('shift-strip')}
                                        style={{
                                        display: 'flex', gap: '24px', justifyContent: 'center',
                                        alignItems: 'center', padding: '4px 12px',
                                        background: '#f5f5f5', borderBottom: '1.5px solid #000',
                                        fontSize: '10px', fontWeight: '700', textTransform: 'uppercase',
                                        letterSpacing: '0.5px', fontFamily: `'Outfit', sans-serif`
                                        }}
                                        data-fixed-block="first"
                                    >
                                        {data.shift_start && <span {...getPreviewTargetProps('shift-start')}>Shift Start: <span style={{ fontWeight: 400 }}>{fmtTime(data.shift_start)}</span></span>}
                                        {data.shift_start && data.shift_end && <span style={{ opacity: 0.3 }}>|</span>}
                                        {data.shift_end && <span {...getPreviewTargetProps('shift-end')}>Shift End: <span style={{ fontWeight: 400 }}>{fmtTime(data.shift_end)}</span></span>}
                                    </div>
                                )}
                                <div className="csp-info-grid-3" data-fixed-block="first">
                                    <div {...getPreviewTargetProps('hospital-panel', 'csp-col-left')}>
                                        {renderKeyCrew(crewList)}
                                        {(data.location_details?.hospital?.name || data.location_details?.hospital?.loc) && (
                                            <div className="csp-hospital-ref-box">
                                                <div className="csp-hospital-icon-large"><PiFirstAid /></div>
                                                <div className="csp-hospital-info-col">
                                                    <div className="csp-hospital-ref-title">NEAREST HOSPITAL</div>
                                                    <div {...getPreviewTargetProps('hospital-name', 'csp-hospital-name-large')}>{data.location_details.hospital.name}</div>
                                                    <div {...getPreviewTargetProps('hospital-location', 'csp-hospital-details-row')}>{data.location_details.hospital.loc}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div {...getPreviewTargetProps('location-panel', 'csp-col-center')}>
                                        <div className="csp-location-box">
                                            <div className="csp-location-title"><u>Set / Location</u></div>
                                            <div {...getPreviewTargetProps('location-set-name', 'csp-location-address')}>{data.location_details?.set_name || 'Location Name'}</div>
                                            <div {...getPreviewTargetProps('location-address', 'csp-location-details')}>
                                                {(() => {
                                                    const parts = (data.location_details?.address || '').split(',');
                                                    const line1 = parts[0]?.trim() || 'Address Line 1';
                                                    const line2 = parts.length > 1 ? parts.slice(1).join(',').trim() : (data.location_details?.city_state || '');
                                                    return <>{line1}<br />{line2}</>;
                                                })()}
                                            </div>
                                            {data.location_details?.contact_phone && (
                                                <div {...getPreviewTargetProps('location-contact-phone', 'csp-location-contact')}>
                                                    <strong>Contact Phone:</strong> {formatPhoneDisplay(data.location_details.contact_phone)}
                                                </div>
                                            )}
                                            {data.location_details?.latitude && data.location_details?.longitude ? (
                                                <a href={mapDirectionsUrl} target="_blank" rel="noopener noreferrer" onClick={handleOpenMapInNewTab} className="csp-location-map-link" style={{ display: 'block', marginTop: '10px', textDecoration: 'none' }}>
                                                    <img src={`https://maps.googleapis.com/maps/api/staticmap?center=${data.location_details.latitude},${data.location_details.longitude}&zoom=15&size=200x120&markers=color:red%7C${data.location_details.latitude},${data.location_details.longitude}&key=AIzaSyBGLCFBaUHw6fGo2XbLIQXNIiLTlMjfITo`} alt="Map" style={{ width: '100%', borderRadius: '4px', border: '1px solid #ddd' }} />
                                                    <div style={{ fontSize: '8px', color: '#0066cc', marginTop: '4px', textAlign: 'center', fontWeight: 'bold' }}>📍 Click for directions</div>
                                                </a>
                                            ) : <div className="csp-pin-icon"><PiMapPin /></div>}
                                        </div>
                                    </div>
                                    <div {...getPreviewTargetProps('time-weather', 'csp-col-right')}>
                                        {(() => {
                                            const times = [
                                                { label: 'Crew Call', value: data.crew_call, target: 'time-crew-call' },
                                                { label: 'Shooting Call', value: data.shoot_call, target: 'time-shooting-call' },
                                                { label: 'Breakfast', value: data.meals?.breakfast, target: 'time-breakfast' },
                                                { label: 'Lunch', value: data.meals?.lunch, target: 'time-lunch' },
                                                { label: 'Est. Wrap', value: data.estimated_wrap, target: 'time-est-wrap' },
                                                { label: 'Dinner', value: data.meals?.dinner, target: 'time-dinner' },
                                                { label: 'Snacks', value: data.meals?.snacks, target: 'time-snacks' }
                                            ].filter(t => t.value).sort((a, b) => (parseTimeToMinutes(a.value) || 0) - (parseTimeToMinutes(b.value) || 0));
                                            return times.map(t => (
                                                <div {...getPreviewTargetProps(t.target, 'csp-time-row')} key={t.label}>
                                                    <strong>{t.label}:</strong>
                                                    <span className="csp-time-value"><span className="csp-circle-dot">•</span> {fmtTime(t.value)}</span>
                                                </div>
                                            ));
                                        })()}
                                        {renderWeather()}
                                    </div>
                                </div>
                                <div {...getPreviewTargetProps('instructions-strip', 'csp-instructions-strip')} data-fixed-block="first">
                                    {(Array.isArray(data.location_details?.instructions) ? data.location_details.instructions.filter(i => i.trim()).join(' | ') : (data.location_details?.instructions || 'DRINK WATER | NO FORCED CALLS OR VISITORS | WEAR CLOSE-TOED SHOES | NO PHOTOS | REPORT INJURIES | STAY HYDRATED')).toUpperCase()}
                                </div>
                                {data.attention && (
                                    <div {...getPreviewTargetProps('attention-block', 'csp-attention-ref-box')} data-fixed-block="first">
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
                                    const blockTarget =
                                        block.text === "TODAY'S SCHEDULE" ? 'today-schedule'
                                            : block.text === "CAST" ? 'cast'
                                                : block.text === "REQUIREMENTS" ? 'requirements'
                                                    : block.text === "ADVANCE SCHEDULE" ? 'advance-schedule'
                                                        : null;
                                    return (
                                        <div
                                            key={bIdx}
                                            {...(blockTarget ? getPreviewTargetProps(blockTarget, isRequirements ? "csp-section-header-clean" : "csp-section-header-bar") : { className: isRequirements ? "csp-section-header-clean" : "csp-section-header-bar" })}
                                        >
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
                                    const showEpisodeColumn = hasEpisodeColumn(block.data);
                                    return (
                                        <div key={bIdx} className="csp-section-no-border" style={{ marginTop: 0 }}>
                                            <table className="csp-table-redesign">
                                                <thead>
                                                    <tr>
                                                        {showEpisodeColumn && <th style={{ width: '32px' }}>EP</th>}
                                                        <th style={{ width: '38px' }}>SCENE</th>
                                                        <th style={{ width: '35%' }}>SET/DESCRIPTION</th>
                                                        <th style={{ width: '45px' }}>CAST</th>
                                                        <th style={{ width: '55px' }}>D/N</th>
                                                        <th style={{ width: '38px' }}>PGS</th>
                                                        <th>REMARK</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {block.data.map((scene, sIdx) => {
                                                        const previewKey = buildScenePreviewKey(scene, sIdx);
                                                        const scheduleType = block.type === 'advance-row' ? 'advance' : 'main';
                                                        return (
                                                        <tr key={sIdx}>
                                                            {showEpisodeColumn && <td className="csp-center">{scene.episode_number || '-'}</td>}
                                                            <td {...getPreviewTargetProps(`scene-cell:${scheduleType}:${previewKey}:scene_number`, 'csp-strong-center')}>{formatSceneDisplay(scene)}</td>
                                                            <td {...getPreviewTargetProps(`scene-cell:${scheduleType}:${previewKey}:location`)}>
                                                                <strong>{scene.int_ext} {scene.location ? `- ${scene.location}` : ''}</strong>
                                                                <div {...getPreviewTargetProps(`scene-cell:${scheduleType}:${previewKey}:description`)} style={{ fontSize: '0.8em', marginTop: '2px' }}>{scene.description}</div>
                                                            </td>
                                                            <td {...getPreviewTargetProps(`scene-cell:${scheduleType}:${previewKey}:cast_ids`, 'csp-center')}>{scene.cast_ids ? scene.cast_ids.split(',').map(s => s.trim()).filter(Boolean).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0)).join(', ') : ''}</td>
                                                            <td {...getPreviewTargetProps(`scene-cell:${scheduleType}:${previewKey}:day_night`, 'csp-center')}>
                                                                {scene.day_night === 'CONTINUOUS' ? 'CONT' : scene.day_night}
                                                            </td>
                                                            <td {...getPreviewTargetProps(`scene-cell:${scheduleType}:${previewKey}:pages`, 'csp-center')}>{scene.pages}</td>
                                                            <td {...getPreviewTargetProps(`scene-cell:${scheduleType}:${previewKey}:remarks`)} style={{ fontSize: '8.5px' }}>
                                                                <div style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                                                                    {limitChars(scene.remarks, 150)}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        );
                                                    })}
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
                                                    {block.data.map((char, cIdx) => {
                                                        const previewKey = buildCharacterPreviewKey(char, cIdx);
                                                        return (
                                                        <tr key={cIdx}>
                                                            <td className="csp-strong-center">{char.character_id || '-'}</td>
                                                            <td {...getPreviewTargetProps(`cast-cell:${previewKey}:cast_name`)}><strong>{char.cast_name}</strong></td>
                                                            <td {...getPreviewTargetProps(`cast-cell:${previewKey}:character_name`)}>{char.character_name}</td>
                                                            <td {...getPreviewTargetProps(`cast-cell:${previewKey}:pickup`, 'csp-center')}>{fmtTime(char.pickup)}</td>
                                                            <td {...getPreviewTargetProps(`cast-cell:${previewKey}:on_location`, 'csp-center')}>{fmtTime(char.on_location)}</td>
                                                            <td {...getPreviewTargetProps(`cast-cell:${previewKey}:hmu`, 'csp-center')}>{fmtTime(char.hmu)}</td>
                                                            <td {...getPreviewTargetProps(`cast-cell:${previewKey}:on_set`, 'csp-center')}>{fmtTime(char.on_set)}</td>
                                                            <td {...getPreviewTargetProps(`cast-cell:${previewKey}:remarks`)} style={{ fontSize: '8.5px' }}>
                                                                <div style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                                                                    {limitChars(char.remarks, 150)}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        );
                                                    })}
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
                                                        <div key={ridx} {...getPreviewTargetProps(`requirement-card:${buildRequirementPreviewKey(req, ridx)}`, 'csp-req-card-box')}>
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
        const hasCrewMembers = crewList && crewList.departments && crewList.departments.some(
            (d) => (d.crew_members || d.crew || []).length > 0
        );
        if (hasCrewMembers) {
            const crewDepartments = Array.isArray(crewList?.departments) ? crewList.departments : [];
            const crewBottomHeight = estimateCrewBottomHeight(crewList, data) + HEIGHTS.BANNER + (data?.walkie_channel ? HEIGHTS.WALKIE_STRIP : 0);
            const crewGridCapacity = Math.max(HEIGHTS.CREW_DEPT_BASE + HEIGHTS.CREW_DEPT_ROW, PAGE_N_CAPACITY - HEIGHTS.CREW_HEADER);
            const crewPageLayouts = buildCrewPageLayouts(crewDepartments, crewGridCapacity);
            const totalCrewWithCallTime = (crewList?.departments || []).reduce((count, dept) => {
                const deptCrew = dept.crew_members || dept.crew || [];
                return count + deptCrew.filter((member, memberIdx) => {
                    const displayValue = getCrewCallDisplayValue(member, dept.id, memberIdx);
                    return displayValue && displayValue !== 'N/A';
                }).length;
            }, 0);
            const lastCrewPageLayout = crewPageLayouts[crewPageLayouts.length - 1] || { columnHeights: [0, 0] };
            const lastCrewGridHeight = Math.max(...(lastCrewPageLayout.columnHeights || [0, 0]));
            const lastCrewPageFreeHeight = Math.max(0, PAGE_N_CAPACITY - HEIGHTS.CREW_HEADER - lastCrewGridHeight);
            const bottomFitsOnLastCrewPage = lastCrewPageFreeHeight >= crewBottomHeight;
            const advanceSpaceOnBottomPage = bottomFitsOnLastCrewPage
                ? Math.max(0, lastCrewPageFreeHeight - crewBottomHeight)
                : Math.max(0, PAGE_N_CAPACITY - estimateCrewPageUsedHeight(0, crewList, data));

            const { inlineScenes, overflowChunks } = splitAdvanceScenesForEnding(
                advanceScenes,
                advanceSpaceOnBottomPage
            );

            crewPageLayouts.forEach((layout, layoutIdx) => {
                const isLastCrewPage = layoutIdx === crewPageLayouts.length - 1;
                pages.push(
                    renderCrewPageFrame({
                        pageKey: `page-crew-${layoutIdx}`,
                        crewColumns: layout.columns,
                        totalCrewWithCallTime,
                        showBottomSections: isLastCrewPage && bottomFitsOnLastCrewPage,
                        inlineAdvanceScenes: isLastCrewPage && bottomFitsOnLastCrewPage ? inlineScenes : []
                    })
                );
            });

            if (!bottomFitsOnLastCrewPage) {
                pages.push(
                    renderCrewPageFrame({
                        pageKey: 'page-crew-summary',
                        crewColumns: [[], []],
                        totalCrewWithCallTime,
                        showBottomSections: true,
                        inlineAdvanceScenes: inlineScenes
                    })
                );
            }

            overflowChunks.forEach((chunk, chunkIdx) => {
                pages.push(
                    <div className="csp-page" key={`page-advance-${chunkIdx}`}>
                        <div className="csp-page-content">
                            {renderAdvanceScheduleSection(chunk, {
                                target: inlineScenes.length === 0 && chunkIdx === 0 ? 'advance-schedule' : null,
                                title: 'ADVANCE SCHEDULE'
                            })}
                        </div>
                        <div className="csp-footer">MADE WITH <a href="https://kinople.com" style={{ color: '#e98800ff', textDecoration: 'none' }}>KINOPLE</a></div>
                    </div>
                );
            });
        } else if (advanceScenes.length > 0) {
            const { overflowChunks } = splitAdvanceScenesForEnding(advanceScenes, 0);
            overflowChunks.forEach((chunk, chunkIdx) => {
                pages.push(
                    <div className="csp-page" key={`page-advance-only-${chunkIdx}`}>
                        <div className="csp-page-content">
                            {renderAdvanceScheduleSection(chunk, {
                                target: chunkIdx === 0 ? 'advance-schedule' : null,
                                title: 'ADVANCE SCHEDULE'
                            })}
                        </div>
                        <div className="csp-footer">MADE WITH <a href="https://kinople.com" style={{ color: '#e98800ff', textDecoration: 'none' }}>KINOPLE</a></div>
                    </div>
                );
            });
        }

        return pages;
    };

    // --- SUB-RENDERERS ---
    const renderScenesTable = (scenes, title, totalPages) => {
        if (!scenes || scenes.length === 0) return null;
        const showEpisodeColumn = hasEpisodeColumn(scenes);
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
                            {showEpisodeColumn && <th style={{ width: '32px' }}>EP</th>}
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
                                {showEpisodeColumn && <td className="csp-center">{scene.episode_number || '-'}</td>}
                                <td className="csp-strong-center">{formatSceneDisplay(scene)}</td>
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

    const renderCrewPageFrame = ({
        pageKey,
        crewColumns,
        totalCrewWithCallTime,
        showBottomSections = false,
        inlineAdvanceScenes = []
    }) => {
        const hasCrewChunks = Array.isArray(crewColumns) && crewColumns.some((column) => Array.isArray(column) && column.length > 0);

        return (
        <div className="csp-page csp-page-crew" key={pageKey}>
            <div className="csp-page-content">
                <div className="csp-section-header-bar" style={{ marginBottom: '10px', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <PiUser /> Crew Time
                    </div>
                    <div style={{ fontSize: '0.82em', fontWeight: '600' }}>
                        Total Crew: {totalCrewWithCallTime}
                    </div>
                </div>
                {hasCrewChunks && (
                    <div {...getPreviewTargetProps('crew-page', 'csp-ref-crew-grid')}>
                        {crewColumns.map((columnDepartments, columnIdx) => (
                            <div className="csp-ref-crew-column" key={`crew-column-${pageKey}-${columnIdx}`}>
                                {columnDepartments.map((chunk, chunkIdx) => renderCrewDepartmentBox(chunk, chunkIdx))}
                            </div>
                        ))}
                    </div>
                )}
                {showBottomSections && (
                    <>
                        <div className="csp-ref-bottom-grid">
                            <div {...getPreviewTargetProps('crew-notes', 'csp-ref-bottom-box')}>
                                <div className="csp-ref-bottom-header">CREW NOTES</div>
                                <div className="csp-ref-bottom-content">
                                    {(() => {
                                        const allNotes = [];
                                        if (crewList?.departments) {
                                            crewList.departments.forEach(dept => {
                                                if (data.department_notes?.[dept.id]) {
                                                    allNotes.push(
                                                        <div key={dept.id} {...getPreviewTargetProps(`crew-note:${dept.id}`)} style={{ marginBottom: '4px' }}>
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
                            <div {...getPreviewTargetProps('useful-contacts', 'csp-ref-bottom-box')}>
                                <div className="csp-ref-bottom-header">USEFUL CONTACTS</div>
                                <div className="csp-ref-bottom-content">{renderUsefulContacts(crewList, data)}</div>
                            </div>
                        </div>
                        <div style={{ marginTop: '15px' }}>{renderBanner()}</div>
                        {renderAdvanceScheduleSection(inlineAdvanceScenes, { target: 'advance-schedule' })}
                    </>
                )}
            </div>
            <div className="csp-footer">MADE WITH <a href="https://kinople.com" style={{ color: '#e98800ff' }}>KINOPLE</a></div>
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
                    id: r.id,
                    category: r.category,
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
                    (dept.crew_members || dept.crew || []).forEach((m, memberIdx) => {
                        const crewKey = buildCrewStateKey(m, dept.id, memberIdx);
                        if (selectedIds.includes(crewKey) || selectedIds.includes(String(m.id))) {
                            contacts.push({ id: crewKey, role: m.role, name: m.name, phone: m.contact || m.phone });
                        }
                    });
                });
            }
        }

        // 2. Fallback: Auto-generated from Crew List if no manual selection
        if (contacts.length === 0) {
            const keyRoles = ['Producer', 'UPM', 'Unit Production Manager', '1st AD', 'First Assistant Director', 'Location Manager', 'Medic', 'Set Medic'];
            cl.departments.forEach(dept => {
                (dept.crew_members || dept.crew || []).forEach(m => {
                    if (keyRoles.some(r => m.role.toLowerCase().includes(r.toLowerCase())) && m.contact) {
                        contacts.push({ id: String(m.id), role: m.role, name: m.name, phone: m.contact || m.phone });
                    }
                });
            });
        }

        const displayContacts = contacts.slice(0, 13);
        const medicContact = contacts.find(c => c.role.toLowerCase().includes('medic'));

        return (
            <div {...getPreviewTargetProps('key-crew-box', 'csp-key-crew-box')}>
                <div className="csp-key-crew-section">
                    {displayContacts.map((c, i) => (
                        <div key={c.id || i} className="csp-key-crew-row">
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

    const getCrewCallDisplayValue = (crew, deptId = '', memberIdx = 0) => {
        const crewKey = buildCrewStateKey(crew, deptId, memberIdx);
        const val = data.crew_calls?.[crewKey] ?? data.crew_calls?.[crew.id];
        if (!val) return fmtTime(data.crew_call);

        if (typeof val === 'object') {
            const mode = val.mode || 'custom';
            if (mode === 'crew_call') return fmtTime(data.crew_call);
            if (mode === 'on_call') return 'On Call';
            if (mode === 'na') return 'N/A';
            if (mode === 'as_per_hod') return 'As per HOD';
            return fmtTime(val.time) || fmtTime(data.crew_call);
        }

        return fmtTime(val) || fmtTime(data.crew_call);
    };

    const renderUsefulContacts = (cl, d) => {
        // Favor manually entered contacts if present
        if (d.useful_contacts && d.useful_contacts.length > 0) {
            return d.useful_contacts.map((c, i) => (
                <div key={i} {...getPreviewTargetProps(`useful-contact:${buildContactPreviewKey(c, i)}`, 'csp-contact-row')}>
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

            <div id="call-sheet-preview" ref={previewRootRef} style={{ margin: 0, padding: 0 }}>
                {renderPages()}
            </div>
        </div>
    );
};

export default CallSheetPreview;
