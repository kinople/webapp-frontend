
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import html2pdf from 'html2pdf.js';
import { useNavigate, useParams } from 'react-router-dom';
import ProjectHeader from '../components/ProjectHeader';
import {
    PiCalendar, PiClock, PiMapPin, PiFirstAid, PiUser, PiNote,
    PiList, PiPlus, PiTrash, PiFloppyDisk, PiCaretRight, PiEye, PiEyeSlash, PiArrowLeft, PiUsersThree, PiDotsSixVertical
} from 'react-icons/pi';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import CallSheetPreview from '../components/CallSheetPreview';
import TimePicker from '../components/TimePicker';
import InlineLocationMap from '../components/InlineLocationMap';
import '../css/ManageShootDays.css';
import { getApiUrl } from '../utils/api';
import { getToken } from '../utils/auth';
import useGoogleMapsLoader from '../hooks/useGoogleMapsLoader';

const libraries = ['places'];

const SortableRow = ({ children, ...props }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: props['data-row-key'] });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        position: 'relative',
        zIndex: isDragging ? 10 : 1,
        backgroundColor: isDragging ? '#fafafa' : undefined,
        boxShadow: isDragging ? '0 5px 15px rgba(0,0,0,0.1)' : undefined,
    };

    return (
        <tr ref={setNodeRef} style={style} {...attributes}>
            {React.Children.map(children, child => {
                if (React.isValidElement(child) && child.key === 'drag-handle') {
                    // console.log('Attaching listeners to handle for:', props['data-row-key']);
                    return React.cloneElement(child, { ...listeners });
                }
                return child;
            })}
        </tr>
    );
};


const ManageShootDays = () => {
    const navigate = useNavigate();
    const { user, id } = useParams();

    // Data State
    const [shootDays, setShootDays] = useState([]);
    const [selectedDayId, setSelectedDayId] = useState(null);
    const [crewList, setCrewList] = useState(null);
    const [castList, setCastList] = useState(null);
    const [project, setProject] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [projectLogoTs, setProjectLogoTs] = useState(Date.now());
    const [projectLogo2Ts, setProjectLogo2Ts] = useState(Date.now());
    const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' | 'editor'
    const [showPreview, setShowPreview] = useState(true);
    const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
    const [isPdfGenerating, setIsPdfGenerating] = useState(false);
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [previewWidth, setPreviewWidth] = useState(480);
    const [isResizing, setIsResizing] = useState(false);
    const { isLoaded } = useGoogleMapsLoader({
        id: 'google-map-script',
        apiKey: "AIzaSyBGLCFBaUHw6fGo2XbLIQXNIiLTlMjfITo",
        libraries
    });

    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [openCastDropdown, setOpenCastDropdown] = useState(null);
    const [error, setError] = useState(null);


    // Form State
    const [formData, setFormData] = useState({
        date: '',
        day_number: '',
        shift_start: '',
        shift_end: '',
        crew_call: '',
        shoot_call: '',
        estimated_wrap: '',
        quote: '',

        location_details: {
            set_name: '', address: '',
            contact_name: '', contact_phone: '',
            latitude: null, longitude: null,
            hospital: { name: '', loc: '' },
            emergency: { name: '', phone: '' },
            instructions: ['']
        },

        weather: { temp: '', high: '', low: '', desc: '', sunrise: '', sunset: '' },
        useful_contacts: [],
        scenes: [],
        characters: [],
        requirements: '',
        daily_requirements: [], // Added for card layout editor
        department_notes: {},
        crew_calls: {}, // { crew_id: time }
        advanced_schedule: []
    });

    // Script Breakdown State
    const [breakdownScenes, setBreakdownScenes] = useState([]);

    // Helper to ensure IDs (used in multiple places)
    const ensureIds = (scenes) => (scenes || []).map(s => ({ ...s, _id: s._id || crypto.randomUUID() }));

    // Helper to get nested value safely
    const updateNested = (obj, path, value) => {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const lastObj = keys.reduce((o, k) => o[k] = o[k] || {}, obj);
        lastObj[lastKey] = value;
        return { ...obj };
    };

    // State for Schedules
    const [schedules, setSchedules] = useState([]);
    const [isImporting, setIsImporting] = useState(false);

    // Create Day Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createData, setCreateData] = useState({ date: '', day_number: '', importFromSchedule: false });
    const [scheduleHasDate, setScheduleHasDate] = useState(false);
    const [createWarning, setCreateWarning] = useState('');

    // Weather Fetching Logic
    const getWeatherDesc = (code) => {
        const codes = {
            0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
            45: 'Fog', 48: 'Depositing Rime Fog',
            51: 'Light Drizzle', 53: 'Moderate Drizzle', 55: 'Dense Drizzle',
            61: 'Slight Rain', 63: 'Moderate Rain', 65: 'Heavy Rain',
            71: 'Slight Snow', 73: 'Moderate Snow', 75: 'Heavy Snow',
            95: 'Thunderstorm'
        };
        return codes[code] || 'Cloudy';
    };

    const getTimeValue = (val) => {
        if (!val) return '';
        if (typeof val === 'string') return val;
        if (typeof val === 'object') return val.utcTime || val.localTime || val.time || val.dateTime || '';
        return '';
    };

    const getNumberValue = (val) => {
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

    const fetchWeatherForCoords = async (latitude, longitude, dateOverride) => {
        if (!latitude || !longitude) return;

        try {
            const dateStr = dateOverride || formData.date || new Date().toISOString().split('T')[0];
            const res = await fetch(getApiUrl(`/api/weather?lat=${latitude}&lon=${longitude}&date=${dateStr}`), {
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            if (res.ok) {
                const w = await res.json();
                if (w.currentConditions) {
                    const daily = w.dailyForecast?.[0] || {};
                    const sunriseVal = getTimeValue(
                        daily.sunEvents?.sunriseTime ||
                        daily.sunriseTime ||
                        daily.sunrise ||
                        w.currentConditions?.sunriseTime ||
                        w.currentConditions?.sunrise
                    );
                    const sunsetVal = getTimeValue(
                        daily.sunEvents?.sunsetTime ||
                        daily.sunsetTime ||
                        daily.sunset ||
                        w.currentConditions?.sunsetTime ||
                        w.currentConditions?.sunset
                    );
                    const tempVal = getNumberValue(w.currentConditions.temperature?.degrees) ?? 0;
                    const highVal = getNumberValue(daily.maxTemperature?.degrees ?? prev.weather.high);
                    const lowVal = getNumberValue(daily.minTemperature?.degrees ?? prev.weather.low);
                    const feelsLikeVal = getNumberValue(w.currentConditions.feelsLikeTemperature?.degrees);
                    const precipVal = getNumberValue(w.currentConditions.precipitation?.probability);
                    const windVal = getNumberValue(w.currentConditions.wind?.speed);

                    setFormData(prev => ({
                        ...prev,
                        weather: {
                            temp: Math.round(tempVal),
                            high: highVal === null ? prev.weather.high : Math.round(highVal),
                            low: lowVal === null ? prev.weather.low : Math.round(lowVal),
                            desc: w.currentConditions.weatherCondition?.description?.text || 'Cloudy',
                            sunrise: sunriseVal || prev.weather.sunrise,
                            sunset: sunsetVal || prev.weather.sunset,
                            feelsLike: feelsLikeVal === null ? prev.weather.feelsLike : Math.round(feelsLikeVal),
                            precip: precipVal === null ? prev.weather.precip : Math.round(precipVal),
                            wind: windVal === null ? prev.weather.wind : Math.round(windVal)
                        }
                    }));
                }
            }
        } catch (e) {
            console.error("Weather Error:", e);
        }
    };

    // Resize Handler
    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;

            const container = document.querySelector('.msd-split-view-container');
            if (!container) return;

            const containerRect = container.getBoundingClientRect();
            const newWidth = containerRect.right - e.clientX;

            // Constrain width between 300px and 800px
            const constrainedWidth = Math.max(300, Math.min(800, newWidth));
            setPreviewWidth(constrainedWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing]);

    useEffect(() => {
        if (formData.location_details?.latitude && formData.location_details?.longitude) {
            fetchWeatherForCoords(formData.location_details.latitude, formData.location_details.longitude);
        }
    }, [formData.date, formData.location_details?.latitude, formData.location_details?.longitude]);

    // Load Initial Data
    useEffect(() => {
        loadData();
    }, [id]);

    // Close cast dropdown on outside click
    useEffect(() => {
        if (!openCastDropdown) return;
        const handler = (e) => {
            if (!e.target.closest('.msd-cast-dropdown-wrapper')) {
                setOpenCastDropdown(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [openCastDropdown]);

    // Autocomplete Logic

    useEffect(() => {
        const fetchSuggestions = async () => {
            const query = formData.location_details?.address;
            if (!query || query.length < 3 || !isLoaded || !window.google) {
                setSuggestions([]);
                return;
            }

            try {
                const service = new window.google.maps.places.AutocompleteService();
                service.getPlacePredictions({ input: query }, (predictions, status) => {
                    if (status === 'OK' && predictions) {
                        setSuggestions(predictions);
                        setShowSuggestions(true);
                    } else {
                        setSuggestions([]);
                    }
                });
            } catch (e) {
                console.error("Autocomplete Error:", e);
            }
        };

        const timeoutId = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(timeoutId);
    }, [formData.location_details?.address, isLoaded]);

    const handleSuggestionClick = useCallback((prediction) => {
        if (!isLoaded || !window.google) return;
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ placeId: prediction.place_id }, (results, status) => {
            if (status === 'OK' && results[0]) {
                const place = results[0];
                const { geometry, formatted_address } = place;
                const lat = geometry.location.lat();
                const lng = geometry.location.lng();

                // Split formatted address for the preview
                const parts = formatted_address.split(',');
                const street = parts[0].trim();
                const rest = parts.slice(1).join(',').trim();

                setFormData(prev => ({
                    ...prev,
                    location_details: {
                        ...prev.location_details,
                        address: formatted_address,
                        city_state: rest || street,
                        latitude: lat,
                        longitude: lng
                    }
                }));
                fetchWeatherForCoords(lat, lng, formData.date);
                setSuggestions([]);
                setShowSuggestions(false);
            } else {
                const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
                placesService.getDetails({ placeId: prediction.place_id, fields: ['geometry', 'formatted_address'] }, (place, placeStatus) => {
                    if (placeStatus === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
                        const lat = place.geometry.location.lat();
                        const lng = place.geometry.location.lng();
                        const formattedAddress = place.formatted_address || prediction.description;
                        const parts = formattedAddress.split(',');
                        const street = parts[0].trim();
                        const rest = parts.slice(1).join(',').trim();
                        setFormData(prev => ({
                            ...prev,
                            location_details: {
                                ...prev.location_details,
                                address: formattedAddress,
                                city_state: rest || street,
                                latitude: lat,
                                longitude: lng
                            }
                        }));
                        fetchWeatherForCoords(lat, lng, formData.date);
                    } else {
                        setFormData(prev => ({
                            ...prev,
                            location_details: {
                                ...prev.location_details,
                                address: prediction.description
                            }
                        }));
                    }
                    setSuggestions([]);
                    setShowSuggestions(false);
                });
            }
        });
    }, [isLoaded]);

    const handleAddressSearch = useCallback(() => {
        if (!isLoaded || !window.google) {
            setShowSuggestions(false);
            return;
        }

        const query = formData.location_details?.address;
        if (!query) return;

        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: query }, (results, status) => {
            if (status === 'OK' && results[0]) {
                const place = results[0];
                const { geometry, formatted_address } = place;
                const lat = geometry.location.lat();
                const lng = geometry.location.lng();

                const parts = formatted_address.split(',');
                const street = parts[0].trim();
                const rest = parts.slice(1).join(',').trim();

                setFormData(prev => ({
                    ...prev,
                    location_details: {
                        ...prev.location_details,
                        address: formatted_address,
                        city_state: rest || street,
                        latitude: lat,
                        longitude: lng
                    }
                }));
                fetchWeatherForCoords(lat, lng, formData.date);
            } else {
                console.warn("Geocode was not successful: " + status);
            }
        });
        setShowSuggestions(false);
    }, [isLoaded, formData.location_details?.address]);

    const reverseGeocode = useCallback(async (lat, lng) => {
        try {
            const apiKey = "AIzaSyBGLCFBaUHw6fGo2XbLIQXNIiLTlMjfITo";
            const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&key=${apiKey}`);
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'OK' && data.results.length > 0) {
                    const result = data.results[0];
                    const formatted_address = result.formatted_address;

                    // Split formatted address: first part is street, rest is city/state
                    const parts = formatted_address.split(',');
                    const street = parts[0].trim();
                    const rest = parts.slice(1).join(',').trim();

                    setFormData(prev => ({
                        ...prev,
                        location_details: {
                            ...prev.location_details,
                            address: formatted_address,
                            city_state: rest || street,
                            latitude: lat,
                            longitude: lng
                        }
                    }));
                } else {
                    console.warn("Reverse geocode returned no results:", data.status, data.error_message);
                    setFormData(prev => ({
                        ...prev,
                        location_details: {
                            ...prev.location_details,
                            address: prev.location_details.address || "Address not found",
                            latitude: lat,
                            longitude: lng
                        }
                    }));
                }
            } else {
                console.warn("Reverse geocode request failed:", res.status);
                setFormData(prev => ({
                    ...prev,
                    location_details: {
                        ...prev.location_details,
                        address: prev.location_details.address || "Address not found",
                        latitude: lat,
                        longitude: lng
                    }
                }));
            }
        } catch (e) {
            console.error("Reverse Geocode Error:", e);
            setFormData(prev => ({
                ...prev,
                location_details: {
                    ...prev.location_details,
                    address: prev.location_details.address || "Address not found",
                    latitude: lat,
                    longitude: lng
                }
            }));
        }
    }, []);

    const handleLocationChange = useCallback((lat, lng) => {
        setFormData(prev => ({
            ...prev,
            location_details: {
                ...prev.location_details,
                latitude: lat,
                longitude: lng,
                address: 'Resolving address...'
            }
        }));
        reverseGeocode(lat, lng);
        fetchWeatherForCoords(lat, lng, formData.date);
    }, [reverseGeocode]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Fetch Shoot Days
            const daysres = await fetch(`/api/projects/${id}/shoot-days`);
            if (!daysres.ok) throw new Error("Failed to fetch shoot days");
            const days = await daysres.json();
            setShootDays(days);

            // Fetch Project Details
            try {
                const token = getToken();
                const projRes = await fetch(`/api/project-name/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (projRes.ok) {
                    const projData = await projRes.json();
                    setProject({
                        title: projData.projectName || projData.name || `Project ${id}`,
                        productionCompany: 'Production Company', // Placeholder as API might not have this yet
                        totalDays: days.length
                    });
                }
            } catch (e) {
                console.error("Failed to fetch project info", e);
            }

            // Fetch Crew List (Source of Truth)
            const crewRes = await fetch(`/api/projects/${id}/crewlists`);
            if (crewRes.ok) {
                const lists = await crewRes.json();
                // Use the latest crew list for now
                if (lists.length > 0) setCrewList(lists[lists.length - 1]);
            }

            // Fetch Cast List
            const castRes = await fetch(`/api/${id}/cast-list`);
            if (castRes.ok) {
                const castData = await castRes.json();
                setCastList(castData.cast_list || []);
            }

            // Fetch Scripts & Breakdown
            const scriptsRes = await fetch(`/api/${id}/script-list`);
            if (scriptsRes.ok) {
                const scripts = await scriptsRes.json();
                if (scripts.length > 0) {
                    // Get latest script (first in list usually, but sort to be safe)
                    const latestScript = scripts.sort((a, b) => (b.version || 0) - (a.version || 0))[0];
                    if (latestScript && latestScript.id) {
                        const bdRes = await fetch(`/api/fetch-breakdown?project_id=${id}`);
                        if (bdRes.ok) {
                            const bdData = await bdRes.json();
                            if (bdData.scene_breakdowns) {
                                setBreakdownScenes(bdData.scene_breakdowns);
                            }
                        }
                    }
                }
            }

            // Fetch Schedules
            try {
                const schedRes = await fetch(`/api/${id}/schedules`);
                if (schedRes.ok) {
                    const schedData = await schedRes.json();
                    setSchedules(schedData.schedules || []);
                }
            } catch (e) {
                console.error("Failed to fetch schedules", e);
            }

            // if (days.length > 0 && !selectedDayId) {
            //     handleDaySelect(days[0]);
            // }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDaySelect = (day) => {
        setViewMode('editor');
        setSelectedDayId(day.id);
        // Merge fetched data with default structure to ensure all fields exist
        setFormData(prev => ({
            ...prev,
            ...day,
            meals: { ...prev.meals, ...(day.meals || {}) },
            location_details: {
                ...prev.location_details,
                ...(day.location_details || {}),
                hospital: { ...prev.location_details.hospital, ...(day.location_details?.hospital || {}) },
                emergency: { ...prev.location_details.emergency, ...(day.location_details?.emergency || {}) },
                instructions: Array.isArray(day.location_details?.instructions)
                    ? day.location_details.instructions
                    : (day.location_details?.instructions ? [day.location_details.instructions] : [''])
            },
            scenes: ensureIds(day.scenes),
            characters: day.characters || [],
            department_notes: day.department_notes || {},
            crew_calls: day.crew_calls || {},
            advanced_schedule: ensureIds(day.advanced_schedule)
        }));
    };

    const handleCreateDay = async () => {
        try {
            const res = await fetch(`/api/projects/${id}/shoot-days`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    day_number: shootDays.length + 1,
                    project_id: id
                }) // backend handles defaults
            });
            if (res.ok) {
                const newDay = await res.json();
                // Ensure newDay has _id for scenes/advanced_schedule before adding to state and selecting
                const processedNewDay = {
                    ...newDay,
                    scenes: ensureIds(newDay.scenes),
                    advanced_schedule: ensureIds(newDay.advanced_schedule)
                };
                setShootDays([...shootDays, processedNewDay]);
                handleDaySelect(processedNewDay);
            }
        } catch (err) {
            alert("Failed to create new shoot day");
        }
    };

    const handleSave = async () => {
        if (!selectedDayId) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/shoot-days/${selectedDayId}?project_id=${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (!res.ok) throw new Error("Failed to save");

            // Update local list in case details changed (like day number or date)
            const updated = await res.json();
            // Ensure updated day also has _ids
            const processedUpdated = {
                ...updated,
                scenes: ensureIds(updated.scenes),
                advanced_schedule: ensureIds(updated.advanced_schedule)
            };
            setShootDays(shootDays.map(d => d.id === processedUpdated.id ? processedUpdated : d));
            alert("Shoot Day Saved Successfully!");
        } catch (err) {
            alert("Error saving: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAndPreview = async () => {
        if (!showPreview) {
            setShowPreview(true);
        }
        setIsPdfGenerating(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 120));
            const wrapper = document.getElementById('call-sheet-preview');
            if (!wrapper) return;

            wrapper.classList.add('csp-pdf-mode');
            document.querySelector('.csp-wrapper')?.classList.add('csp-pdf-mode');

            const pageElements = Array.from(wrapper.querySelectorAll('.csp-page:not(.csp-measure-page)'))
                .filter(el => el.offsetHeight > 100);

            if (pageElements.length === 0) {
                return;
            }
            const options = {
                margin: 0,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'] },
            };

            const blob = await html2pdf().from(wrapper).set(options).toPdf().get('pdf').then((pdf) => pdf.output('blob'));
            if (!blob) return;

            if (pdfPreviewUrl) {
                URL.revokeObjectURL(pdfPreviewUrl);
            }
            const url = URL.createObjectURL(blob);
            // toolbar=1, scrollbar=1, navpanes=0 typical settings for a cleaner viewer
            setPdfPreviewUrl(url + '#toolbar=1&navpanes=0&scrollbar=1');
            setIsPdfPreviewOpen(true);
        } catch (err) {
            console.error('Error generating PDF preview:', err);
        } finally {
            setIsPdfGenerating(false);
            const wrapper = document.getElementById('call-sheet-preview');
            if (wrapper) wrapper.classList.remove('csp-pdf-mode');
            document.querySelector('.csp-wrapper')?.classList.remove('csp-pdf-mode');
        }
    };

    const handleClosePdfPreview = () => {
        setIsPdfPreviewOpen(false);
    };

    const handleDownloadPdf = () => {
        if (!pdfPreviewUrl) return;
        const dayNumber = formData?.day_number || 'call_sheet';
        const filename = `call_sheet_day_${dayNumber}.pdf`;
        const link = document.createElement('a');
        link.href = pdfPreviewUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        return () => {
            if (pdfPreviewUrl) {
                URL.revokeObjectURL(pdfPreviewUrl);
            }
        };
    }, [pdfPreviewUrl]);

    // --- Import Scenes & Auto-Add Characters Logic ---

    const addCharactersForScene = (sceneNumber, currentCharacters) => {
        const scene = breakdownScenes.find(s =>
            s.scene_number === sceneNumber ||
            s.scene_number?.toString() === sceneNumber ||
            s.id === sceneNumber
        );
        if (!scene || !scene.characters) return currentCharacters;

        let newCharacters = [...currentCharacters];

        const charArray = Array.isArray(scene.characters) ? scene.characters : String(scene.characters).split(',');
        charArray.forEach(charName => {
            if (!charName) return;
            const cleanName = String(charName).trim();
            // Check if character already exists in the list
            const exists = newCharacters.some(c => c.character_name && String(c.character_name).trim().toLowerCase() === cleanName.toLowerCase());
            if (!exists) {
                // Find in cast list
                const castMember = castList.find(c => c.character && String(c.character).trim().toLowerCase() === cleanName.toLowerCase());
                newCharacters.push({
                    character_name: cleanName,
                    cast_name: castMember ? (castMember.actor || castMember.cast_options?.['1']?.actor_name || '') : '',
                    character_id: castMember ? castMember.cast_id : null, // Store Cast ID for preview
                    pickup: '',
                    on_location: '',
                    hmu: '',
                    wardrobe: '',
                    on_set: '',
                    remarks: ''
                });
            }
        });

        // Sort by Cast ID
        newCharacters.sort((a, b) => {
            // Get IDs from current object or lookup
            const idA = parseInt(a.character_id) || 9999;
            const idB = parseInt(b.character_id) || 9999;
            return idA - idB;
        });

        return newCharacters;
    };

    const pruneCharactersAfterRemoval = (removedSceneCastIds, updatedScenes, updatedAdvanceSchedule, currentCharacters) => {
        if (!removedSceneCastIds) return currentCharacters;

        const activeCastIdentities = new Set();
        [...updatedScenes, ...updatedAdvanceSchedule].forEach(s => {
            if (s.cast_ids) {
                s.cast_ids.split(',').forEach(id => {
                    const clean = id.trim().toLowerCase();
                    if (clean) activeCastIdentities.add(clean);
                });
            }
        });

        const removedCast = removedSceneCastIds.split(',').map(id => id.trim().toLowerCase()).filter(id => id);

        return currentCharacters.filter(char => {
            const name = char.character_name?.toLowerCase().trim();
            const rawId = (char.character_id || getCastId(char.character_name))?.toString().trim();
            const id = (rawId && rawId !== '-') ? rawId.toLowerCase() : null;

            if (!name && !id) return false;

            const isInRemainingScenes = [...updatedScenes, ...updatedAdvanceSchedule].some(s => {
                if (!s.cast_ids) return false;
                return s.cast_ids.split(',').some(cid => {
                    const clean = cid.trim().toLowerCase();
                    return clean === name || (id && clean === id);
                });
            });

            return isInRemainingScenes;
        });
    };


    const handleImportSchedule = async () => {
        if (!formData.date && !formData.day_number) {
            alert("Please set a Date or Day Number first to match with the schedule.");
            return;
        }

        // Find a schedule that has days
        // We will look through all schedules and try to find a matching date

        setIsImporting(true);
        try {
            let foundScenes = [];

            // Iterate through available schedules to find matching date
            for (const sched of schedules) {
                // Fetch full schedule details
                const res = await fetch(`/api/${id}/schedule/${sched.id}`);
                if (res.ok) {
                    const fullSched = await res.json();
                    const scheduleByDay = fullSched.schedule?.schedule_by_day;

                    if (scheduleByDay) {
                        // Check each day in the schedule
                        Object.values(scheduleByDay).forEach(daySched => {
                            // Match by Date
                            if (daySched.date === formData.date) {
                                foundScenes = daySched.scenes || [];
                            }
                            // Fallback: Match by Day Number (if date is missing in formData)
                            // Note: scheduleByDay keys are usually '1', '2' etc.
                        });
                    }
                }
                if (foundScenes.length > 0) break; // Stop if found
            }

            if (foundScenes.length === 0) {
                alert("No scenes found in any schedule for this date.");
                setIsImporting(false);
                return;
            }

            // Process found scenes
            let updatedScenes = [...formData.scenes];
            let updatedCharacters = [...formData.characters];

            foundScenes.forEach(schedScene => {
                // Fix off-by-one: Check if scene_number exists, otherwise use scene_id + 1 if it looks like an index
                let sceneNum = schedScene.scene_number;
                if (!sceneNum && (schedScene.scene_id !== undefined && schedScene.scene_id !== null)) {
                    // If we only have scene_id, it might be an index.
                    // However, usually scene_number is the string "1", "1A", etc.
                    // If scene_id is an integer, it might be the index.
                    // Let's try to find the match in breakdown first using scene_id as index if valid
                    const breakdownByIndex = breakdownScenes[schedScene.scene_id];
                    if (breakdownByIndex) {
                        sceneNum = breakdownByIndex.scene_number;
                    } else {
                        sceneNum = String(schedScene.scene_id);
                    }
                }

                // Final fallback if still empty
                if (!sceneNum) sceneNum = String(schedScene.scene_id || '');

                // Check if scene already exists
                if (!updatedScenes.some(s => s.scene_number === sceneNum)) {
                    // Get details from breakdown
                    const breakdown = breakdownScenes.find(s => s.scene_number === sceneNum || s.scene_number?.toString() === sceneNum);

                    // Map Cast Names to IDs
                    let castIdsStr = '';
                    if (breakdown?.characters) {
                        const charArray = Array.isArray(breakdown.characters) ? breakdown.characters : String(breakdown.characters).split(',');
                        const castIds = charArray.map(name => {
                            if (!name) return '';
                            const cleanName = String(name).trim().toLowerCase();
                            const found = castList?.find(c => c.character && String(c.character).trim().toLowerCase() === cleanName);
                            return found && found.cast_id ? found.cast_id : String(name).trim();
                        }).filter(id => id !== '')
                            .sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
                        castIdsStr = castIds.join(', ');
                    }

                    updatedScenes.push({
                        _id: crypto.randomUUID(), // Add _id for new scenes
                        scene_number: sceneNum,
                        int_ext: breakdown?.int_ext || breakdown?.ie || '',
                        day_night: breakdown?.time || breakdown?.day_night || '',
                        description: breakdown?.synopsis || breakdown?.description || '',
                        // Map Set/Location from breakdown to Location field
                        location: breakdown?.set || breakdown?.location || '',
                        // set: breakdown?.set || breakdown?.location || '', // No longer using set
                        pages: breakdown?.page_eighths || '',
                        cast_ids: castIdsStr
                    });

                    // Auto-add characters
                    updatedCharacters = addCharactersForScene(sceneNum, updatedCharacters);
                }
            });

            setFormData(prev => ({
                ...prev,
                scenes: updatedScenes,
                characters: updatedCharacters
            }));

            alert(`Imported ${foundScenes.length} scenes and updated character list.`);

        } catch (e) {
            console.error(e);
            alert("Error importing schedule");
        } finally {
            setIsImporting(false);
        }
    };


    // --- Consolidated Schedule Check Logic ---
    const [formDateHasSchedule, setFormDateHasSchedule] = useState(false);

    // Check if a date exists in schedule (reusable)
    const checkDateInSchedule = async (dateToCheck) => {
        if (!dateToCheck) return false;
        let hasDate = false;
        for (const sched of schedules) {
            try {
                // Optimization: if we already fetched detailed schedule, use it?
                // For now, fetch to be safe/simple.
                const res = await fetch(`/api/${id}/schedule/${sched.id}`);
                if (res.ok) {
                    const fullSched = await res.json();
                    const scheduleByDay = fullSched.schedule?.schedule_by_day;
                    if (scheduleByDay) {
                        if (Object.values(scheduleByDay).some(d => d.date === dateToCheck)) {
                            hasDate = true;
                            break;
                        }
                    }
                }
            } catch (e) { console.error(e); }
        }
        return hasDate;
    };

    // Effect to check form date
    useEffect(() => {
        const verifyDate = async () => {
            const has = await checkDateInSchedule(formData.date);
            setFormDateHasSchedule(has);
        };
        verifyDate();
    }, [formData.date, schedules]);



    // ... (renderGeneralInfo update)
    const checkWordLimit = (text, limit) => {
        const words = text ? text.trim().split(/\s+/) : [];
        return words.length <= limit;
    };

    const renderGeneralInfo = () => (
        <div className="msd-section">
            <div className="msd-section-header"><PiCalendar /> General Information</div>
            <div className="msd-grid-2">
                <label className="msd-label">Shoot Date <input type="date" className="msd-input" value={formData.date || ''} onChange={e => setFormData({ ...formData, date: e.target.value })} /></label>
                <label className="msd-label">Shoot Day # <input type="number" className="msd-input" value={formData.day_number || ''} onChange={e => setFormData({ ...formData, day_number: parseInt(e.target.value) })} /></label>

                <label className="msd-label">Shift Start <TimePicker value={formData.shift_start || ''} onChange={v => setFormData({ ...formData, shift_start: v })} /></label>
                <label className="msd-label">Shift End <TimePicker value={formData.shift_end || ''} onChange={v => setFormData({ ...formData, shift_end: v })} /></label>
                <label className="msd-label">Crew Call <TimePicker value={formData.crew_call || ''} onChange={v => setFormData({ ...formData, crew_call: v })} /></label>
                <label className="msd-label">Shoot Call <TimePicker value={formData.shoot_call || ''} onChange={v => setFormData({ ...formData, shoot_call: v })} /></label>
                <label className="msd-label">Est. Wrap <TimePicker value={formData.estimated_wrap || ''} onChange={v => setFormData({ ...formData, estimated_wrap: v })} /></label>
            </div>

            <div className="msd-grid-3" style={{ marginTop: 10 }}>
                Quote of the Day <span style={{ fontSize: '0.8em', color: '#666' }}>(Max 20 words)</span>
                <div style={{ position: 'relative' }}>
                    <input
                        type="text"
                        className="msd-input"
                        value={formData.quote || ''}
                        onChange={e => {
                            if (checkWordLimit(e.target.value, 20)) {
                                setFormData({ ...formData, quote: e.target.value });
                            }
                        }}
                    />
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#999' }}>
                        {(formData.quote?.trim().split(/\s+/).filter(w => w).length || 0)}/20
                    </span>
                </div>
            </div>
        </div>
    );

    const renderMeals = () => (
        <div className="msd-section">
            <div className="msd-section-header"><PiClock /> Meals</div>
            <div className="msd-grid-4">
                <label className="msd-label">Breakfast <TimePicker value={formData.meals.breakfast || ''} onChange={v => setFormData({ ...formData, meals: { ...formData.meals, breakfast: v } })} /></label>
                <label className="msd-label">Lunch <TimePicker value={formData.meals.lunch || ''} onChange={v => setFormData({ ...formData, meals: { ...formData.meals, lunch: v } })} /></label>
                <label className="msd-label">Snacks <TimePicker value={formData.meals.snacks || ''} onChange={v => setFormData({ ...formData, meals: { ...formData.meals, snacks: v } })} /></label>
                <label className="msd-label">Dinner <TimePicker value={formData.meals.dinner || ''} onChange={v => setFormData({ ...formData, meals: { ...formData.meals, dinner: v } })} /></label>
            </div>
        </div>
    );

    const renderLocation = () => (
        <div className="msd-section">
            <div className="msd-section-header"><PiMapPin /> Location & Safety</div>
            <label className="msd-label">Set Name <input type="text" className="msd-input" value={formData.location_details.set_name || ''} onChange={e => setFormData({ ...formData, location_details: { ...formData.location_details, set_name: e.target.value } })} /></label>
            <label className="msd-label">Address / Pin
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                    <input
                        type="text"
                        className="msd-input"
                        value={formData.location_details.address || ''}
                        onChange={e => {
                            setFormData({ ...formData, location_details: { ...formData.location_details, address: e.target.value } });
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddressSearch();
                                setShowSuggestions(false);
                            }
                        }}
                        placeholder="Start typing address..."
                        autoComplete="off"
                    />
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="msd-autocomplete-dropdown">
                            {suggestions.map((place, idx) => (
                                <div
                                    key={idx}
                                    className="msd-autocomplete-item"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleSuggestionClick(place);
                                    }}
                                >
                                    {place.description}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </label>

            {/* Inline Map */}
            <div style={{ marginTop: '10px', height: '250px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e6ed' }}>
                <InlineLocationMap
                    lat={formData.location_details?.latitude}
                    lng={formData.location_details?.longitude}
                    onLocationChange={handleLocationChange}
                />
            </div>

            <div style={{ marginTop: '10px' }}>
                <label className="msd-label">Contact Phone <input type="text" className="msd-input" value={formData.location_details.contact_phone || ''} onChange={e => setFormData(p => updateNested(p, 'location_details.contact_phone', e.target.value))} /></label>
            </div>

            <div className="msd-sub-header"><PiFirstAid /> Nearest Hospital</div>
            <div className="msd-grid-2">
                <label className="msd-label">Name <input type="text" className="msd-input" value={formData.location_details.hospital.name || ''} onChange={e => setFormData(p => updateNested(p, 'location_details.hospital.name', e.target.value))} /></label>
                <label className="msd-label">Location <input type="text" className="msd-input" value={formData.location_details.hospital.loc || ''} onChange={e => setFormData(p => updateNested(p, 'location_details.hospital.loc', e.target.value))} /></label>
            </div>

            <div className="msd-sub-header">Emergency Contact</div>
            <div className="msd-grid-2">
                <label className="msd-label">Name <input type="text" className="msd-input" value={formData.location_details.emergency.name || ''} onChange={e => setFormData(p => updateNested(p, 'location_details.emergency.name', e.target.value))} /></label>
                <label className="msd-label">Phone <input type="text" className="msd-input" value={formData.location_details.emergency.phone || ''} onChange={e => setFormData(p => updateNested(p, 'location_details.emergency.phone', e.target.value))} /></label>
            </div>

            <label className="msd-label">
                General Instructions <span style={{ fontSize: '0.8em', color: '#666' }}>(Max 60 words total)</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(Array.isArray(formData.location_details.instructions) ? formData.location_details.instructions : [formData.location_details.instructions || '']).map((instruction, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                type="text"
                                className="msd-input"
                                value={instruction}
                                onChange={e => {
                                    const newInstructions = [...(Array.isArray(formData.location_details.instructions) ? formData.location_details.instructions : [formData.location_details.instructions || ''])];
                                    const oldVal = newInstructions[idx];
                                    newInstructions[idx] = e.target.value;

                                    // Check total word limit
                                    const totalWords = newInstructions.join(' ').trim().split(/\s+/).filter(w => w.length > 0).length;
                                    const currentWords = oldVal.trim().split(/\s+/).filter(w => w.length > 0).length;
                                    const newWords = e.target.value.trim().split(/\s+/).filter(w => w.length > 0).length;

                                    if (totalWords <= 60 || newWords < currentWords) {
                                        setFormData(p => updateNested(p, 'location_details.instructions', newInstructions));
                                    }
                                }}
                                placeholder={`Instruction line ${idx + 1}`}
                            />
                            <button
                                onClick={() => {
                                    const newInstructions = [...(Array.isArray(formData.location_details.instructions) ? formData.location_details.instructions : [formData.location_details.instructions || ''])];
                                    newInstructions.splice(idx, 1);
                                    setFormData(p => updateNested(p, 'location_details.instructions', newInstructions));
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}
                                title="Remove Line"
                            >
                                <PiTrash />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => {
                            const newInstructions = [...(Array.isArray(formData.location_details.instructions) ? formData.location_details.instructions : [formData.location_details.instructions || ''])];
                            newInstructions.push('');
                            setFormData(p => updateNested(p, 'location_details.instructions', newInstructions));
                        }}
                        className="msd-import-btn"
                        style={{ width: 'fit-content', marginTop: '5px', fontSize: '12px' }}
                    >
                        <PiPlus /> Add Line
                    </button>
                    <span style={{ fontSize: '11px', color: '#999', alignSelf: 'flex-end' }}>
                        {(Array.isArray(formData.location_details.instructions) ? formData.location_details.instructions : [formData.location_details.instructions || '']).join(' ').trim().split(/\s+/).filter(w => w).length}/60 words
                    </span>
                </div>
            </label>

            <label className="msd-label" style={{ marginTop: '10px' }}>
                Attention <span style={{ fontSize: '0.8em', color: '#666' }}>(Max 30 words)</span>
                <div style={{ position: 'relative' }}>
                    <input
                        type="text"
                        className="msd-input"
                        value={formData.attention || ''}
                        onChange={e => {
                            if (checkWordLimit(e.target.value, 30)) {
                                setFormData({ ...formData, attention: e.target.value });
                            }
                        }}
                        placeholder="Important Notice..."
                    />
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#999' }}>
                        {(formData.attention?.trim().split(/\s+/).filter(w => w).length || 0)}/30
                    </span>
                </div>
            </label>
        </div>
    );

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event, listType) => {
        const { active, over } = event;
        // console.log('DragEnd:', { activeId: active.id, overId: over?.id, listType });

        if (over && active.id !== over.id) {
            setFormData((prev) => {
                const list = listType === 'main' ? prev.scenes : prev.advanced_schedule;
                const oldIndex = list.findIndex((item) => item._id === active.id);
                const newIndex = list.findIndex((item) => item._id === over.id);

                // console.log('Indices:', { oldIndex, newIndex });

                if (oldIndex !== -1 && newIndex !== -1) {
                    const newList = arrayMove(list, oldIndex, newIndex);
                    // console.log('Reordered List:', newList.map(i => i._id));

                    return listType === 'main'
                        ? { ...prev, scenes: newList }
                        : { ...prev, advanced_schedule: newList };
                }
                return prev;
            });
        }
    };

    const renderUsefulContactsSection = () => (
        <div className="msd-section">
            <div className="msd-section-header" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><PiUsersThree /> Useful Contacts (Call Sheet Preview)</div>
                <button
                    onClick={() => setFormData(p => ({
                        ...p,
                        useful_contacts: [...(p.useful_contacts || []), { id: crypto.randomUUID(), role: '', name: '', phone: '' }]
                    }))}
                    className="msd-import-btn"
                >
                    <PiPlus /> Add Contact
                </button>
            </div>
            {(!formData.useful_contacts || formData.useful_contacts.length === 0) && (
                <div style={{ padding: '10px', color: '#666', fontStyle: 'italic', fontSize: '0.9em' }}>
                    No contacts added. Preview will show auto-generated Crew/Office list.
                </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: formData.useful_contacts?.length > 0 ? '10px' : '0' }}>
                {(formData.useful_contacts || []).map((contact, idx) => (
                    <div key={contact.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 30px', gap: '8px', alignItems: 'center' }}>
                        <input
                            type="text"
                            className="msd-input"
                            placeholder="Role (e.g. Producer)"
                            value={contact.role}
                            onChange={e => {
                                const newContacts = [...formData.useful_contacts];
                                newContacts[idx].role = e.target.value;
                                setFormData({ ...formData, useful_contacts: newContacts });
                            }}
                        />
                        <input
                            type="text"
                            className="msd-input"
                            placeholder="Name"
                            value={contact.name}
                            onChange={e => {
                                const newContacts = [...formData.useful_contacts];
                                newContacts[idx].name = e.target.value;
                                setFormData({ ...formData, useful_contacts: newContacts });
                            }}
                        />
                        <input
                            type="text"
                            className="msd-input"
                            placeholder="Phone"
                            value={contact.phone}
                            onChange={e => {
                                const newContacts = [...formData.useful_contacts];
                                newContacts[idx].phone = e.target.value;
                                setFormData({ ...formData, useful_contacts: newContacts });
                            }}
                        />
                        <button
                            onClick={() => {
                                const newContacts = formData.useful_contacts.filter((_, i) => i !== idx);
                                setFormData({ ...formData, useful_contacts: newContacts });
                            }}
                            className="msd-card-delete-btn msd-contact-delete-btn"
                            style={{ padding: '8px', height: '38px', opacity: 1 }}
                        >
                            <PiTrash />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );


    const renderScenes = () => (


        <div className="msd-section">
            <div className="msd-section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><PiList /> Shooting Schedule (Scenes)</div>
            </div>
            <datalist id="scene-numbers">
                {breakdownScenes.map(s => (
                    <option key={s.id || s.scene_number} value={s.scene_number} />
                ))}
            </datalist>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(e, 'main')}
            >
                <table className="msd-table">
                    <thead>
                        <tr>
                            <th style={{ width: '30px' }}></th>
                            <th style={{ width: '50px', textAlign: 'center' }}>Scene</th>
                            <th style={{ width: '60px' }}>Int/Ext</th>
                            <th style={{ width: '30%' }}>Location / Set</th>
                            <th style={{ width: '25%' }}>Desc</th>
                            <th style={{ width: '70px', textAlign: 'center' }}>Day/Night</th>
                            <th style={{ width: '70px', textAlign: 'center' }}>Cast ID</th>
                            <th style={{ width: '60px', textAlign: 'center' }}>Pages</th>
                            <th style={{ width: '15%' }}>Remarks</th>
                            <th style={{ width: '50px', textAlign: 'center' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <SortableContext
                            items={(formData.scenes || []).map(s => s._id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {formData.scenes.map((scene, idx) => (
                                <SortableRow key={scene._id} data-row-key={scene._id}>
                                    <td key="drag-handle" style={{ textAlign: 'center', cursor: 'grab', verticalAlign: 'middle', padding: '0 4px' }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                            width: '28px', height: '28px', borderRadius: '6px',
                                            background: '#f0f1f3',
                                            color: '#4b5563', fontSize: '18px',
                                            border: '1.5px solid #d1d5db',
                                            transition: 'background 0.15s'
                                        }} title="Drag to reorder">
                                            <PiDotsSixVertical />
                                        </span>
                                    </td>
                                    <td>
                                        <input
                                            list="scene-numbers"
                                            type="text"
                                            className="msd-td-input"
                                            value={scene.scene_number || ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                const newScenes = [...formData.scenes];
                                                newScenes[idx].scene_number = val;

                                                // Duplicate Check (Same Schedule)
                                                if (formData.scenes.some((s, i) => i !== idx && s.scene_number === val)) {
                                                    alert(`Scene ${val} is already in the Main Shooting Schedule!`);
                                                    newScenes[idx].scene_number = ''; // Clear duplicate
                                                    setFormData({ ...formData, scenes: newScenes });
                                                    return;
                                                }

                                                // Overlap Check (Main vs Advance)
                                                let filteredAdvance = formData.advanced_schedule || [];
                                                if (filteredAdvance.some(s => s.scene_number === val)) {
                                                    filteredAdvance = filteredAdvance.filter(s => s.scene_number !== val);
                                                }

                                                // Auto-fill logic
                                                const match = breakdownScenes.find(s => s.scene_number === val || s.scene_number?.toString() === val);
                                                if (match) {
                                                    newScenes[idx].int_ext = match.int_ext || match.ie || '';
                                                    // Map Breakdown Location/Set to Scene Location
                                                    newScenes[idx].location = match.set || match.location || '';
                                                    // newScenes[idx].set = ...; // No longer using 'set' field
                                                    newScenes[idx].day_night = match.time || match.day_night || '';
                                                    newScenes[idx].description = match.synopsis || match.description || '';
                                                    newScenes[idx].pages = match.page_eighths || '';
                                                    if (match.characters) {
                                                        // Map character names to Cast IDs
                                                        const charArray = Array.isArray(match.characters) ? match.characters : String(match.characters).split(',');
                                                        const ids = charArray.map(name => {
                                                            if (!name) return '';
                                                            const cleanName = String(name).trim().toLowerCase();
                                                            const found = castList?.find(c => c.character && String(c.character).trim().toLowerCase() === cleanName);
                                                            return found && found.cast_id ? found.cast_id : String(name).trim();
                                                        }).filter(id => id !== '')
                                                            .sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
                                                        newScenes[idx].cast_ids = ids.join(', ');
                                                    }
                                                }

                                                let newFormData = { ...formData, scenes: newScenes, advanced_schedule: filteredAdvance };

                                                // Auto-add characters to list if match found
                                                if (match && val) {
                                                    newFormData.characters = addCharactersForScene(val, newFormData.characters);
                                                }

                                                setFormData(newFormData);
                                            }}
                                            placeholder="No."
                                        />
                                    </td>
                                    <td><input type="text" className="msd-td-input" value={scene.int_ext || ''} onChange={e => { const newScenes = [...formData.scenes]; newScenes[idx].int_ext = e.target.value; setFormData({ ...formData, scenes: newScenes }); }} /></td>
                                    <td><textarea className="msd-td-textarea" value={scene.location || ''} onChange={e => { const newScenes = [...formData.scenes]; newScenes[idx].location = e.target.value; setFormData({ ...formData, scenes: newScenes }); }} /></td>
                                    <td><textarea className="msd-td-textarea" value={scene.description || ''} onChange={e => { const newScenes = [...formData.scenes]; newScenes[idx].description = e.target.value; setFormData({ ...formData, scenes: newScenes }); }} /></td>
                                    <td><input type="text" className="msd-td-input-center" value={scene.day_night || ''} onChange={e => { const newScenes = [...formData.scenes]; newScenes[idx].day_night = e.target.value; setFormData({ ...formData, scenes: newScenes }); }} /></td>
                                    <td><textarea className="msd-td-textarea-center" value={scene.cast_ids ? scene.cast_ids.split(',').map(s => s.trim()).filter(Boolean).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0)).join(', ') : ''} onChange={e => {
                                        const val = e.target.value;
                                        const newScenes = [...formData.scenes];
                                        newScenes[idx].cast_ids = val;
                                        const updatedCharacters = pruneCharactersAfterRemoval(null, newScenes, formData.advanced_schedule || [], formData.characters);
                                        setFormData({ ...formData, scenes: newScenes, characters: updatedCharacters });
                                    }} /></td>
                                    <td><textarea className="msd-td-textarea-center" value={scene.pages || ''} onChange={e => { const newScenes = [...formData.scenes]; newScenes[idx].pages = e.target.value; setFormData({ ...formData, scenes: newScenes }); }} /></td>
                                    <td><textarea className="msd-td-textarea" value={scene.remarks || ''} onChange={e => { const newScenes = [...formData.scenes]; newScenes[idx].remarks = e.target.value; setFormData({ ...formData, scenes: newScenes }); }} /></td>
                                    <td style={{ textAlign: 'center' }}><button onClick={() => {
                                        const removedScene = formData.scenes[idx];
                                        const updatedScenes = formData.scenes.filter((_, i) => i !== idx);
                                        const updatedAdvance = formData.advanced_schedule || [];
                                        const updatedCharacters = pruneCharactersAfterRemoval(removedScene.cast_ids, updatedScenes, updatedAdvance, formData.characters);
                                        setFormData(p => ({ ...p, scenes: updatedScenes, characters: updatedCharacters }));
                                    }}><PiTrash /></button></td>
                                </SortableRow>
                            ))}
                        </SortableContext>
                    </tbody>
                </table>
            </DndContext>
            <button className="msd-add-button" onClick={() => setFormData(p => ({ ...p, scenes: [...p.scenes, { _id: crypto.randomUUID() }] }))}><PiPlus /> Add Scene</button>
        </div>
    );

    // --- Requirements Logic ---
    const updateRequirementsFromScenes = () => {
        // Categories to aggregate from breakdown
        const categoriesToCheck = [
            { name: 'Action Props', keys: ['action_props'] },
            { name: 'Other Props', keys: ['other_props'] },
            { name: 'Picture Vehicles', keys: ['picture_vehicles'] },
            { name: 'Animals', keys: ['animals'] },
            { name: 'Extras', keys: ['extras'] },
            { name: 'Wardrobe', keys: ['wardrobe'] },
            { name: 'Set Dressing', keys: ['set_dressing'] }
        ];

        let newReqs = [...(formData.daily_requirements || [])];

        categoriesToCheck.forEach(cat => {
            const items = new Set();

            // Iterate over current scenes to find breakdown matches
            formData.scenes.forEach(scene => {
                const match = breakdownScenes.find(b => b.scene_number === scene.scene_number || b.scene_number?.toString() === scene.scene_number);
                if (match) {
                    cat.keys.forEach(key => {
                        if (match[key]) {
                            // Split by comma if string, or use as is
                            const val = match[key];
                            if (typeof val === 'string') {
                                val.split(',').forEach(v => {
                                    const clean = v.trim();
                                    if (clean) items.add(clean);
                                });
                            } else if (Array.isArray(val)) {
                                val.forEach(v => {
                                    if (typeof v === 'string' && v.trim()) items.add(v.trim());
                                });
                            }
                        }
                    });
                }
            });

            if (items.size > 0) {
                // Join with Newline for clearer list view
                const content = Array.from(items).join('\n');
                const existingIdx = newReqs.findIndex(r => r.category === cat.name);

                if (existingIdx >= 0) {
                    newReqs[existingIdx].content = content;
                    newReqs[existingIdx].isAuto = true;
                } else {
                    newReqs.push({
                        id: crypto.randomUUID(),
                        category: cat.name,
                        content: content,
                        isAuto: true
                    });
                }
            }
        });

        setFormData({ ...formData, daily_requirements: newReqs });
        alert("Requirements synced from scheduled scenes!");
    };

    const renderRequirementsSection = () => {
        // Helper to parse content into array (handles newlines AND commas)
        const parseItems = (content) => {
            if (!content) return [];
            return content.split(/[\n,]/).map(i => i.trim()).filter(i => i);
        };

        // Helper to add an item to a specific category
        const addItemToCategory = (catIdx, text) => {
            if (!text.trim()) return;
            const newReqs = [...(formData.daily_requirements || [])];
            const currentContent = parseItems(newReqs[catIdx].content);
            currentContent.push(text.trim());
            newReqs[catIdx].content = currentContent.join('\n');
            setFormData({ ...formData, daily_requirements: newReqs });
        };

        // Helper to remove an item from a specific category
        const removeItemFromCategory = (catIdx, itemIdx) => {
            const newReqs = [...(formData.daily_requirements || [])];
            const currentContent = parseItems(newReqs[catIdx].content);
            currentContent.splice(itemIdx, 1);
            newReqs[catIdx].content = currentContent.join('\n');
            setFormData({ ...formData, daily_requirements: newReqs });
        };

        return (
            <div className="msd-section">
                <div className="msd-section-header" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><PiList /> Daily Requirements</div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={updateRequirementsFromScenes} className="msd-import-btn" title="Sync from Breakdown">
                            Sync from Scenes
                        </button>
                        <button onClick={() => setFormData(p => ({
                            ...p,
                            daily_requirements: [...(p.daily_requirements || []), { id: crypto.randomUUID(), category: 'New Category', content: '' }]
                        }))} className="msd-import-btn">
                            <PiPlus /> Add Category
                        </button>
                    </div>
                </div>

                <div className="msd-req-grid">
                    {(formData.daily_requirements || []).length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#888', padding: '40px', background: '#f8f9fa', borderRadius: '8px' }}>
                            No requirements categories. Click 'Sync from Scenes' to populate standard ones, or 'Add Category'.
                        </div>
                    )}

                    {(formData.daily_requirements || []).map((req, idx) => {
                        const items = parseItems(req.content);
                        return (
                            <div key={req.id || `req-${idx}`} className="msd-req-card">
                                <div className="msd-req-card-header">
                                    <input
                                        type="text"
                                        className="msd-req-header-input"
                                        value={req.category || ''}
                                        onChange={e => {
                                            const newReqs = [...(formData.daily_requirements || [])];
                                            newReqs[idx].category = e.target.value;
                                            setFormData({ ...formData, daily_requirements: newReqs });
                                        }}
                                        placeholder="Category Name"
                                    />
                                    <button
                                        onClick={() => setFormData(p => ({
                                            ...p,
                                            daily_requirements: p.daily_requirements.filter((_, i) => i !== idx)
                                        }))}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}
                                        title="Delete Category"
                                    >
                                        <PiTrash size={16} />
                                    </button>
                                </div>
                                <div className="msd-req-card-body">
                                    {items.length === 0 && <div style={{ color: '#ccc', fontStyle: 'italic', fontSize: '13px' }}>No items yet.</div>}
                                    {Array.isArray(items) && items.map((item, iIdx) => (
                                        <div key={iIdx} className="msd-req-item">
                                            <span className="msd-req-item-text">{item}</span>
                                            <span className="msd-req-item-delete" onClick={() => removeItemFromCategory(idx, iIdx)}>
                                                &times;
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="msd-req-card-footer">
                                    <input
                                        type="text"
                                        className="msd-req-add-input"
                                        placeholder="Add item..."
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addItemToCategory(idx, e.target.value);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    <button
                                        className="msd-req-add-btn"
                                        onClick={(e) => {
                                            const input = e.currentTarget.previousElementSibling;
                                            addItemToCategory(idx, input.value);
                                            input.value = '';
                                        }}
                                    >
                                        <PiPlus size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderAdvanceScenes = () => (
        <div className="msd-section">
            <div className="msd-section-header" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><PiList /> Advance Shooting Schedule (Scenes)</div>
            </div>
            {/* Reusing scene-numbers datalist */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(e, 'advance')}
            >
                <table className="msd-table">
                    <thead>
                        <tr>
                            <th style={{ width: '30px' }}></th>
                            <th style={{ width: '50px', textAlign: 'center' }}>Scene</th>
                            <th style={{ width: '60px' }}>Int/Ext</th>
                            <th style={{ width: '30%' }}>Location / Set</th>
                            <th style={{ width: '25%' }}>Desc</th>
                            <th style={{ width: '70px', textAlign: 'center' }}>Day/Night</th>
                            <th style={{ width: '70px', textAlign: 'center' }}>Cast ID</th>
                            <th style={{ width: '60px', textAlign: 'center' }}>Pages</th>
                            <th style={{ width: '15%' }}>Remarks</th>
                            <th style={{ width: '50px', textAlign: 'center' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <SortableContext
                            items={(formData.advanced_schedule || []).map(s => s._id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {(formData.advanced_schedule || []).map((scene, idx) => (
                                <SortableRow key={scene._id} data-row-key={scene._id}>
                                    <td key="drag-handle" style={{ textAlign: 'center', cursor: 'grab', verticalAlign: 'middle', padding: '0 4px' }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                            width: '28px', height: '28px', borderRadius: '6px',
                                            background: '#f0f1f3',
                                            color: '#4b5563', fontSize: '18px',
                                            border: '1.5px solid #d1d5db',
                                            transition: 'background 0.15s'
                                        }} title="Drag to reorder">
                                            <PiDotsSixVertical />
                                        </span>
                                    </td>
                                    <td>
                                        <input
                                            list="scene-numbers"
                                            type="text"
                                            className="msd-td-input"
                                            value={scene.scene_number || ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                const newAdv = [...(formData.advanced_schedule || [])];
                                                newAdv[idx] = { ...newAdv[idx], scene_number: val };

                                                // Duplicate Check (Same Schedule)
                                                if (formData.advanced_schedule?.some((s, i) => i !== idx && s.scene_number === val)) {
                                                    alert(`Scene ${val} is already in the Advance Schedule!`);
                                                    newAdv[idx].scene_number = ''; // Clear duplicate
                                                    setFormData({ ...formData, advanced_schedule: newAdv });
                                                    return;
                                                }

                                                // Overlap Check (Advance vs Main)
                                                // Overlap Check (Advance vs Main)
                                                if (formData.scenes.some(s => s.scene_number === val)) {
                                                    alert(`Scene ${val} is already in the Main Shooting Schedule!`);
                                                    newAdv[idx].scene_number = ''; // Prevent overlap
                                                    setFormData({ ...formData, advanced_schedule: newAdv });
                                                    return;
                                                }

                                                // Auto-fill logic
                                                const match = breakdownScenes.find(s => s.scene_number === val || s.scene_number?.toString() === val);
                                                if (match) {
                                                    newAdv[idx].int_ext = match.int_ext || match.ie || '';
                                                    // Map Breakdown Location/Set to Scene Location (Fix)
                                                    newAdv[idx].location = match.set || match.location || '';
                                                    // newAdv[idx].set = ...;
                                                    newAdv[idx].day_night = match.time || match.day_night || '';
                                                    newAdv[idx].description = match.synopsis || match.description || '';
                                                    newAdv[idx].pages = match.page_eighths || '';
                                                    if (match.characters) {
                                                        const charArray = Array.isArray(match.characters) ? match.characters : String(match.characters).split(',');
                                                        const ids = charArray.map(name => {
                                                            if (!name) return '';
                                                            const cleanName = String(name).trim().toLowerCase();
                                                            const found = castList?.find(c => c.character && String(c.character).trim().toLowerCase() === cleanName);
                                                            return found && found.cast_id ? found.cast_id : String(name).trim();
                                                        }).filter(id => id !== '')
                                                            .sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
                                                        newAdv[idx].cast_ids = ids.join(', ');
                                                    }
                                                }

                                                let newFormData = { ...formData, advanced_schedule: newAdv };

                                                // Auto-add characters to MAIN LIST (optional, but typical for call sheet)
                                                if (match && val) {
                                                    newFormData.characters = addCharactersForScene(val, newFormData.characters);
                                                }

                                                setFormData(newFormData);
                                            }}
                                            placeholder="No."
                                        />
                                    </td>
                                    <td><input type="text" className="msd-td-input" value={scene.int_ext || ''} onChange={e => { const newAdv = [...(formData.advanced_schedule || [])]; newAdv[idx].int_ext = e.target.value; setFormData({ ...formData, advanced_schedule: newAdv }); }} /></td>
                                    <td><textarea className="msd-td-textarea" value={scene.location || ''} onChange={e => { const newAdv = [...(formData.advanced_schedule || [])]; newAdv[idx].location = e.target.value; setFormData({ ...formData, advanced_schedule: newAdv }); }} /></td>
                                    <td><textarea className="msd-td-textarea" value={scene.description || ''} onChange={e => { const newAdv = [...(formData.advanced_schedule || [])]; newAdv[idx].description = e.target.value; setFormData({ ...formData, advanced_schedule: newAdv }); }} /></td>
                                    <td><input type="text" className="msd-td-input-center" value={scene.day_night || ''} onChange={e => { const newAdv = [...(formData.advanced_schedule || [])]; newAdv[idx].day_night = e.target.value; setFormData({ ...formData, advanced_schedule: newAdv }); }} /></td>
                                    <td><textarea className="msd-td-textarea-center" value={scene.cast_ids ? scene.cast_ids.split(',').map(s => s.trim()).filter(Boolean).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0)).join(', ') : ''} onChange={e => {
                                        const val = e.target.value;
                                        const newAdv = [...(formData.advanced_schedule || [])];
                                        newAdv[idx].cast_ids = val;
                                        const updatedCharacters = pruneCharactersAfterRemoval(null, formData.scenes || [], newAdv, formData.characters);
                                        setFormData({ ...formData, advanced_schedule: newAdv, characters: updatedCharacters });
                                    }} /></td>
                                    <td><textarea className="msd-td-textarea-center" value={scene.pages || ''} onChange={e => { const newAdv = [...(formData.advanced_schedule || [])]; newAdv[idx].pages = e.target.value; setFormData({ ...formData, advanced_schedule: newAdv }); }} /></td>
                                    <td><textarea className="msd-td-textarea" value={scene.remarks || ''} onChange={e => { const newAdv = [...(formData.advanced_schedule || [])]; newAdv[idx].remarks = e.target.value; setFormData({ ...formData, advanced_schedule: newAdv }); }} /></td>
                                    <td style={{ textAlign: 'center' }}><button onClick={() => {
                                        const removedScene = formData.advanced_schedule[idx];
                                        const updatedAdvance = formData.advanced_schedule.filter((_, i) => i !== idx);
                                        const updatedScenes = formData.scenes || [];
                                        const updatedCharacters = pruneCharactersAfterRemoval(removedScene.cast_ids, updatedScenes, updatedAdvance, formData.characters);
                                        setFormData(p => ({ ...p, advanced_schedule: updatedAdvance, characters: updatedCharacters }));
                                    }}><PiTrash /></button></td>
                                </SortableRow>
                            ))}
                        </SortableContext>
                    </tbody>
                </table>
            </DndContext>
            <button className="msd-add-button" onClick={() => setFormData(p => ({ ...p, advanced_schedule: [...(p.advanced_schedule || []), { _id: crypto.randomUUID() }] }))}><PiPlus /> Add Advance Scene</button>
        </div>
    );

    const getCastId = (charName) => {
        if (!castList || !charName) return '-';
        const cleanName = String(charName).trim().toLowerCase();
        const castMember = castList.find(c => c.character && String(c.character).trim().toLowerCase() === cleanName);
        return castMember ? castMember.cast_id : '-';
    };

    const renderCharacters = () => {
        return (
            <div className="msd-section">
                <div className="msd-section-header"><PiUser /> Characters & Cast</div>

                {/* Datalist for Available Characters */}
                <datalist id="available-characters-list">
                    {castList && castList
                        .filter(c => !formData.characters.some(existing => existing.character_name?.toLowerCase() === c.character?.toLowerCase()))
                        .map((c, i) => (
                            <option key={i} value={c.character} />
                        ))
                    }
                </datalist>

                <table className="msd-table">
                    <thead>
                        <tr>
                            <th>Cast ID</th><th>Character</th><th>Cast</th><th>Pickup</th><th>On Location</th><th>HMU/WARDROBE</th><th>On Set</th><th>Remarks</th><th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {formData.characters
                            .map((char, originalIdx) => ({ char, originalIdx, castId: getCastId(char.character_name) }))
                            .sort((a, b) => {
                                const idA = parseInt(a.castId) || 9999;
                                const idB = parseInt(b.castId) || 9999;
                                return idA - idB;
                            })
                            .map(({ char, originalIdx }) => {
                                const charInCastList = castList?.find(c => c.character?.toLowerCase() === char.character_name?.toLowerCase());
                                const castOptions = charInCastList?.cast_options ? Object.entries(charInCastList.cast_options) : [];
                                const lockedOptionId = charInCastList?.locked;

                                return (
                                    <tr key={originalIdx}>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{getCastId(char.character_name)}</td>
                                        <td><input type="text" list="available-characters-list" className="msd-td-input" value={char.character_name || ''} placeholder="Character" onChange={e => {
                                            const newData = [...formData.characters];
                                            const val = e.target.value;
                                            newData[originalIdx].character_name = val;

                                            // Auto-update Cast ID and Name if found
                                            const found = castList?.find(c => c.character?.toLowerCase() === val.toLowerCase());
                                            if (found) {
                                                newData[originalIdx].character_id = found.cast_id;

                                                // Priority: Locked Option > Actor/Cast Name field > empty
                                                const lockedId = String(found.locked);
                                                if (lockedId !== "-1" && found.cast_options?.[lockedId]) {
                                                    newData[originalIdx].cast_name = found.cast_options[lockedId].actor_name || found.cast_options[lockedId].name || "";
                                                } else {
                                                    newData[originalIdx].cast_name = found.actor || found.cast_name || "";
                                                }
                                            }

                                            setFormData({ ...formData, characters: newData });
                                        }} /></td>
                                        <td style={{ position: 'relative' }}>
                                            {(() => {
                                                // Sort: locked option first, rest below
                                                const lockedEntry = castOptions.find(([optId]) => String(lockedOptionId) === String(optId));
                                                const otherEntries = castOptions.filter(([optId]) => String(lockedOptionId) !== String(optId));
                                                const sortedOptions = lockedEntry ? [lockedEntry, ...otherEntries] : otherEntries;
                                                const dropdownId = `cast-dropdown-${originalIdx}`;
                                                const isOpen = openCastDropdown === dropdownId;

                                                return (
                                                    <div className="msd-cast-dropdown-wrapper">
                                                        <input
                                                            type="text"
                                                            className="msd-td-input"
                                                            value={char.cast_name || ''}
                                                            placeholder="Cast Name"
                                                            readOnly={sortedOptions.length > 0}
                                                            onClick={() => sortedOptions.length > 0 && setOpenCastDropdown(isOpen ? null : dropdownId)}
                                                            onChange={e => {
                                                                if (sortedOptions.length === 0) {
                                                                    const newData = [...formData.characters];
                                                                    newData[originalIdx].cast_name = e.target.value;
                                                                    setFormData({ ...formData, characters: newData });
                                                                }
                                                            }}
                                                            style={{ cursor: sortedOptions.length > 0 ? 'pointer' : 'text', paddingRight: sortedOptions.length > 0 ? '22px' : undefined }}
                                                        />
                                                        {sortedOptions.length > 0 && (
                                                            <span
                                                                className="msd-cast-dropdown-arrow"
                                                                onClick={() => setOpenCastDropdown(isOpen ? null : dropdownId)}
                                                            >▾</span>
                                                        )}
                                                        {isOpen && (
                                                            <ul className="msd-cast-dropdown-list">
                                                                {sortedOptions.map(([optId, opt]) => {
                                                                    const isLocked = String(lockedOptionId) === String(optId);
                                                                    const actorName = opt.actor_name || opt.name || "";
                                                                    return (
                                                                        <li
                                                                            key={optId}
                                                                            className={`msd-cast-dropdown-item${isLocked ? ' msd-cast-locked' : ''}`}
                                                                            onClick={() => {
                                                                                const newData = [...formData.characters];
                                                                                newData[originalIdx].cast_name = actorName;
                                                                                setFormData({ ...formData, characters: newData });
                                                                                setOpenCastDropdown(null);
                                                                            }}
                                                                        >
                                                                            {isLocked && <span className="msd-lock-icon">🔒</span>}
                                                                            {actorName}
                                                                            {isLocked && <span className="msd-locked-badge">Locked</span>}
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ul>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td><TimePicker className="tp-compact" value={char.pickup || ''} onChange={v => { const newData = [...formData.characters]; newData[originalIdx].pickup = v; setFormData({ ...formData, characters: newData }); }} /></td>
                                        <td><TimePicker className="tp-compact" value={char.on_location || ''} onChange={v => { const newData = [...formData.characters]; newData[originalIdx].on_location = v; setFormData({ ...formData, characters: newData }); }} /></td>
                                        <td>
                                            <TimePicker
                                                className="tp-compact"
                                                value={char.hmu || ''}
                                                onChange={v => {
                                                    const newData = [...formData.characters];
                                                    newData[originalIdx].hmu = v;
                                                    newData[originalIdx].wardrobe = v;
                                                    setFormData({ ...formData, characters: newData });
                                                }}
                                            />
                                        </td>
                                        <td><TimePicker className="tp-compact" value={char.on_set || ''} onChange={v => { const newData = [...formData.characters]; newData[originalIdx].on_set = v; setFormData({ ...formData, characters: newData }); }} /></td>
                                        <td><input type="text" className="msd-td-input" value={char.remarks || ''} onChange={e => { const newData = [...formData.characters]; newData[originalIdx].remarks = e.target.value; setFormData({ ...formData, characters: newData }); }} /></td>
                                        <td><button onClick={() => setFormData(p => ({ ...p, characters: p.characters.filter((_, i) => i !== originalIdx) }))}><PiTrash /></button></td>
                                    </tr>
                                );
                            })}
                    </tbody>
                </table>
                <button className="msd-add-button" onClick={() => setFormData(p => ({ ...p, characters: [...p.characters, {}] }))}><PiPlus /> Add Character</button>
            </div>
        );
    };

    const CALL_MODES = [
        { value: 'custom', label: 'Custom' },
        { value: 'crew_call', label: 'Crew Call' },
        { value: 'on_call', label: 'On Call' },
        { value: 'na', label: 'N/A' },
        { value: 'as_per_hod', label: 'As per HOD' },
    ];

    const renderCrewCalls = () => {
        // Helper to safely get time string
        const getCrewTime = (crewId) => {
            const val = formData.crew_calls[crewId];
            if (!val) return '';
            return typeof val === 'object' ? (val.time || '') : val;
        };

        // Helper to get call mode (default to 'custom' for legacy plain-string values)
        const getCrewMode = (crewId) => {
            const val = formData.crew_calls[crewId];
            if (!val) return 'custom';
            return typeof val === 'object' ? (val.mode || 'custom') : 'custom';
        };

        // Helper to check if crew member is marked as key
        const isKey = (crewId) => {
            const val = formData.crew_calls[crewId];
            return typeof val === 'object' && val.is_key === true;
        };

        // Count selected key crew members
        const selectedCount = Object.values(formData.crew_calls || {}).filter(v => typeof v === 'object' && v.is_key).length;

        return (
            <div className="msd-section">
                <div className="msd-section-header">
                    <PiUser /> Crew Call Times (Linked to Crew List)
                    <span style={{ marginLeft: '16px', fontSize: '0.82em', fontWeight: 'normal', color: '#6b7280' }}>
                        Key Crew on Preview: {selectedCount} / 13
                    </span>
                    <span style={{ marginLeft: '12px', fontSize: '0.78em', fontWeight: 'normal', color: '#6b7280', background: '#f0f4ff', border: '1px solid #c7d4f0', borderRadius: '6px', padding: '2px 8px', whiteSpace: 'nowrap' }}>
                        Select <strong>Key</strong> to display crew on top-left of the call sheet
                    </span>
                </div>
                {!crewList || !Array.isArray(crewList.departments) ? (
                    <div>No Crew List found or invalid format. Please check the Crew List section.</div>
                ) : (
                    <div className="msd-dept-grid">
                        {crewList.departments.map(dept => (
                            <div key={dept.id} className="msd-dept-box">
                                <h4 className="msd-dept-name">{dept.name}</h4>
                                <table className="msd-mini-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '35%' }}>Role</th>
                                            <th>Name</th>
                                            <th style={{ width: '180px', textAlign: 'center' }}>Call Time</th>
                                            <th style={{ width: '50px', textAlign: 'center' }}>Key</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(dept.crew_members || dept.crew || []).map(crew => {
                                            const time = getCrewTime(crew.id);
                                            const mode = getCrewMode(crew.id);
                                            const keySelected = isKey(crew.id);

                                            const updateCrewCall = (newMode, newTime) => {
                                                const entry = { mode: newMode, time: newTime, ...(keySelected ? { is_key: true } : {}) };
                                                setFormData(p => ({
                                                    ...p,
                                                    crew_calls: { ...p.crew_calls, [crew.id]: entry }
                                                }));
                                            };

                                            return (
                                                <tr key={crew.id}>
                                                    <td className="msd-role-col">{crew.role}</td>
                                                    <td>{crew.name}</td>
                                                    <td style={{ width: '180px' }}>
                                                        <div className="msd-calltime-cell">
                                                            <select
                                                                className="msd-calltime-select"
                                                                value={mode}
                                                                onChange={e => updateCrewCall(e.target.value, time)}
                                                            >
                                                                {CALL_MODES.map(m => (
                                                                    <option key={m.value} value={m.value}>{m.label}</option>
                                                                ))}
                                                            </select>
                                                            {mode === 'custom' && (
                                                                <TimePicker
                                                                    className="tp-compact"
                                                                    value={time}
                                                                    onChange={v => updateCrewCall('custom', v)}
                                                                />
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={keySelected}
                                                            onChange={e => {
                                                                const isChecked = e.target.checked;
                                                                if (isChecked && selectedCount >= 13) {
                                                                    alert("You can only select up to 13 Key Crew members for the preview.");
                                                                    return;
                                                                }
                                                                const entry = { mode, time, ...(isChecked ? { is_key: true } : {}) };
                                                                setFormData(p => ({
                                                                    ...p,
                                                                    crew_calls: { ...p.crew_calls, [crew.id]: entry }
                                                                }));
                                                            }}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                <div style={{ marginTop: 10 }}>
                                    <label className="msd-label">Notes:
                                        <textarea
                                            className="msd-textarea"
                                            style={{ minHeight: '60px', marginTop: '5px' }}
                                            value={formData.department_notes[dept.id] || ''}
                                            onChange={e => setFormData(p => ({
                                                ...p,
                                                department_notes: { ...p.department_notes, [dept.id]: e.target.value }
                                            }))}
                                            placeholder={`Notes for ${dept.name}`}
                                        />
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };



    // --- Upload Logo Logic ---
    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        const token = getToken();

        try {
            const res = await fetch(getApiUrl(`/api/projects/${id}/logo`), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
                credentials: 'include'
            });
            if (res.ok) {
                setProjectLogoTs(Date.now());
                alert("Logo 1 uploaded successfully!");
            } else {
                const errorText = await res.text();
                throw new Error(errorText || "Failed to upload");
            }
        } catch (err) {
            console.error(err);
            alert("Error uploading logo");
        }
    };

    const handleLogo2Upload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        const token = getToken();

        try {
            const res = await fetch(getApiUrl(`/api/projects/${id}/logo2`), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
                credentials: 'include'
            });
            if (res.ok) {
                setProjectLogo2Ts(Date.now());
                alert("Logo 2 uploaded successfully!");
            } else {
                const errorText = await res.text();
                throw new Error(errorText || "Failed to upload");
            }
        } catch (err) {
            console.error(err);
            alert("Error uploading logo 2");
        }
    };



    const handleCreateDayClick = () => {
        setCreateData({
            date: '',
            day_number: shootDays.length + 1,
            importFromSchedule: false
        });
        setScheduleHasDate(false);
        setCreateWarning('');
        setShowCreateModal(true);
    };

    const checkScheduleDate = async (date) => {
        const has = await checkDateInSchedule(date);

        setScheduleHasDate(has);
        if (!has && date) {
            setCreateWarning('No schedule found for this date.');
            setCreateData(prev => ({ ...prev, importFromSchedule: false }));
        } else {
            setCreateWarning('');
        }
    };

    const handleCreateDateChange = (e) => {
        const date = e.target.value;
        setCreateData({ ...createData, date });
        checkScheduleDate(date);
    };

    const confirmCreateDay = async () => {
        setIsLoading(true);
        try {
            // 1. Create the Day
            const res = await fetch(`/api/projects/${id}/shoot-days`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    day_number: parseInt(createData.day_number),
                    project_id: id,
                    date: createData.date
                })
            });

            if (!res.ok) throw new Error("Failed to create shoot day");

            const newDay = await res.json();

            // 2. Import if checked
            if (createData.importFromSchedule && scheduleHasDate) {
                // Reuse import logic but targeting the new day
                // We need to execute the import logic on the NEW day data
                // and then SAVE it.

                let foundScenes = [];
                let foundChars = [];

                // Fetch/Find schedule again (or optimize)
                for (const sched of schedules) {
                    const resSched = await fetch(`/api/${id}/schedule/${sched.id}`);
                    if (resSched.ok) {
                        const fullSched = await resSched.json();
                        const scheduleByDay = fullSched.schedule?.schedule_by_day;
                        if (scheduleByDay) {
                            Object.values(scheduleByDay).forEach(daySched => {
                                if (daySched.date === createData.date) {
                                    foundScenes = daySched.scenes || [];
                                }
                            });
                        }
                    }
                    if (foundScenes.length > 0) break;
                }

                if (foundScenes.length > 0) {
                    // Process scenes
                    let updatedScenes = [];
                    let updatedCharacters = []; // Start fresh for new day or merge? New day is empty.

                    foundScenes.forEach(schedScene => {
                        const sceneNum = schedScene.scene_id || schedScene.scene_number;
                        if (!updatedScenes.some(s => s.scene_number === sceneNum)) {
                            const breakdown = breakdownScenes.find(s => s.scene_number === sceneNum || s.scene_number?.toString() === sceneNum);

                            let castIdsStr = '';
                            if (breakdown?.characters) {
                                const charArray = Array.isArray(breakdown.characters) ? breakdown.characters : String(breakdown.characters).split(',');
                                const mappedIds = charArray.map(name => {
                                    if (!name) return '';
                                    const cleanName = String(name).trim().toLowerCase();
                                    const found = castList?.find(c => c.character && String(c.character).trim().toLowerCase() === cleanName);
                                    return found && found.cast_id ? found.cast_id : String(name).trim();
                                }).filter(id => id !== '');
                                castIdsStr = mappedIds.join(', ');
                            }

                            updatedScenes.push({
                                scene_number: sceneNum,
                                int_ext: breakdown?.int_ext || breakdown?.ie || '',
                                description: breakdown?.synopsis || breakdown?.description || '',
                                location: breakdown?.set || breakdown?.location || '',
                                pages: breakdown?.page_eighths || '',
                                cast_ids: castIdsStr
                            });
                            updatedCharacters = addCharactersForScene(sceneNum, updatedCharacters);
                        }
                    });

                    // Update the new day object
                    newDay.scenes = updatedScenes;
                    newDay.characters = updatedCharacters;

                    // Save immediately
                    await fetch(`/api/shoot-days/${newDay.id}?project_id=${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newDay)
                    });
                }
            }

            // Finish
            setShootDays([...shootDays, newDay]);
            handleDaySelect(newDay); // This sets formData
            setShowCreateModal(false);

        } catch (err) {
            alert("Error creating day: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteDay = async (e, dayId) => {
        e.stopPropagation(); // Prevent selecting the day
        if (!window.confirm("Are you sure you want to delete this shoot day? This cannot be undone.")) return;

        try {
            const res = await fetch(`/api/shoot-days/${dayId}?project_id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setShootDays(prev => prev.filter(d => d.id !== dayId));
                if (selectedDayId === dayId) {
                    setSelectedDayId(null);
                    // Reset necessary form data if needed
                }
            } else {
                alert("Failed to delete shoot day");
            }
        } catch (err) {
            console.error(err);
            alert("Error deleting shoot day");
        }
    };

    // --- Dashboard Render Logic ---
    const handleBackToDashboard = () => {
        setViewMode('dashboard');
        setSelectedDayId(null);
    };

    const renderDashboard = () => (
        <div className="msd-dashboard-container">
            {/* Header */}
            <div className="msd-dashboard-header">
                <h1 className="msd-dashboard-title">Manage Shoot Days</h1>
                <button
                    onClick={() => navigate(`/${user}/${id}/crew-list`)}
                    className="msd-neutral-action-btn"
                >
                    <PiUsersThree size={20} /> Crew List
                </button>
            </div>

            {/* Presets Section */}
            <div className="msd-dashboard-section">
                <h2 className="msd-dashboard-subtitle">Project Assets</h2>
                <div className="msd-presets-grid">
                    {/* Logo Card */}
                    <div className="msd-preset-card">
                        <div className="msd-preset-header">
                            <span>Production Company Logos (Max 2)</span>
                        </div>
                        <div className="msd-logos-side-by-side">
                            <div className="msd-logo-slot">
                                <div className="msd-logo-slot-label">Logo 1</div>
                                <div className="msd-logo-preview-container">
                                    <img
                                        src={`/api/projects/${id}/logo?t=${projectLogoTs}`}
                                        alt="Production Logo 1"
                                        className="msd-logo-preview"
                                        onError={(e) => e.target.style.display = 'none'}
                                    />
                                </div>
                                <label className="msd-upload-btn msd-upload-btn-small">
                                    + Upload Logo 1
                                    <input type="file" style={{ display: 'none' }} onChange={handleLogoUpload} accept="image/*" />
                                </label>
                            </div>
                            <div className="msd-logo-slot">
                                <div className="msd-logo-slot-label">Logo 2</div>
                                <div className="msd-logo-preview-container">
                                    <img
                                        src={`/api/projects/${id}/logo2?t=${projectLogo2Ts}`}
                                        alt="Production Logo 2"
                                        className="msd-logo-preview"
                                        onError={(e) => e.target.style.display = 'none'}
                                    />
                                </div>
                                <label className="msd-upload-btn msd-upload-btn-small">
                                    + Upload Logo 2
                                    <input type="file" style={{ display: 'none' }} onChange={handleLogo2Upload} accept="image/*" />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Shoot Days Grid */}
            <div className="msd-dashboard-section">
                <h2 className="msd-dashboard-subtitle">Call Sheets</h2>
                <div className="msd-day-cards-grid">
                    {/* Add New Day Card */}
                    <div className="msd-day-card add-card" onClick={() => setShowCreateModal(true)}>
                        <div className="msd-add-day-card-content">
                            <PiPlus size={32} />
                            <span className="msd-add-day-label">Add Day</span>
                        </div>
                    </div>

                    {/* Render Days */}
                    {shootDays.map(day => (
                        <div key={day.id} className="msd-day-card" onClick={() => handleDaySelect(day)}>
                            <div className="msd-day-card-header">
                                <span className="msd-day-number">Day {day.day_number}</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteDay(e, day.id); }}
                                    className="msd-card-delete-btn"
                                    title="Delete"
                                >
                                    <PiTrash />
                                </button>
                            </div>
                            <div className="msd-day-card-body">
                                <div className="msd-card-date">{day.date ? new Date(day.date).toLocaleDateString() : 'No Date'}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="msd-page-container">
            {/* <ProjectHeader /> */}
            {viewMode === 'dashboard' ? renderDashboard() : (
                <div className="msd-main-container">
                    {/* Editor View - No Sidebar */}
                    <div className="msd-form-container msd-editor-form-container">
                        {/* Editor Header / Nav */}
                        <div className="msd-editor-nav">
                            <div className="msd-editor-nav-left">
                                <button onClick={handleBackToDashboard} className="msd-back-btn" title="Back to Dashboard">
                                    <PiArrowLeft size={18} /> Back
                                </button>
                                <div className="msd-nav-divider"></div>
                                <h2 className="msd-editor-title">Manage Call Sheet - Day {formData.day_number || '?'}</h2>
                            </div>
                            <div className="msd-editor-actions">
                                <button
                                    className={`msd-preview-toggle-btn ${showPreview ? 'active' : ''}`}
                                    onClick={handleSaveAndPreview}
                                >
                                    <PiEye /> Preview and Export
                                </button>
                                <button onClick={handleSave} disabled={isSaving} className="msd-save-btn">
                                    {isSaving ? 'Saving...' : <><PiFloppyDisk /> Save Shoot Day</>}
                                </button>
                            </div>
                        </div>

                        {/* Editor Content Area */}
                        <div className="msd-editor-content">
                            {selectedDayId ? (
                                <div className="msd-split-view-container">

                                    {/* Left Column - Editor Form */}
                                    <div className="msd-left-column">
                                        {renderGeneralInfo()}
                                        {renderMeals()}
                                        {renderLocation()}
                                        <div className="msd-import-wrap" style={{ display: 'flex', gap: '10px' }}>
                                            <button
                                                onClick={handleImportSchedule}
                                                disabled={isImporting}
                                                className="msd-import-btn"
                                            >
                                                <PiList /> {isImporting ? 'Importing...' : 'Import from Schedule'}
                                            </button>
                                        </div>

                                        {renderScenes()}
                                        {renderCharacters()}
                                        {renderCrewCalls()}
                                        {renderUsefulContactsSection()}
                                        {renderRequirementsSection()}
                                        {renderAdvanceScenes()}
                                    </div>

                                    {/* Right Column - Call Sheet Preview */}
                                    {showPreview && (
                                        <>
                                            <div
                                                className="msd-resize-handle"
                                                onMouseDown={handleMouseDown}
                                                title="Drag to resize preview"
                                            >
                                                <div className="msd-resize-handle-line"></div>
                                            </div>
                                            <div className="msd-right-column" style={{ width: `${previewWidth}px`, minWidth: `${previewWidth}px` }}>
                                                <div
                                                    className="msd-preview-scaler"
                                                    style={{
                                                        transform: `scale(${(previewWidth - 40) / 793})`,
                                                        transformOrigin: 'top left',
                                                        width: '210mm',
                                                        marginBottom: '-50%'
                                                    }}
                                                >
                                                    <CallSheetPreview data={formData} project={project} logoTs={projectLogoTs} logo2Ts={projectLogo2Ts} crewList={crewList} showActions={false} />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                </div>
                            ) : (
                                <div className="msd-empty-state">
                                    <p>Select or Create a Shoot Day to start editing</p>
                                    <button onClick={handleBackToDashboard}>Back to Dashboard</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Day Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal-content msd-create-modal">
                        <h3>Create New Shoot Day</h3>
                        <div className="msd-create-form">
                            <label>
                                Day Number:
                                <input
                                    type="number"
                                    className="msd-input"
                                    value={createData.day_number}
                                    onChange={e => setCreateData({ ...createData, day_number: e.target.value })}
                                />
                            </label>
                            <label>
                                Shoot Date:
                                <input
                                    type="date"
                                    className="msd-input"
                                    value={createData.date}
                                    onChange={handleCreateDateChange}
                                />
                            </label>
                            {createWarning && <div className="msd-create-warning">{createWarning}</div>}

                            <label className={`msd-import-checkbox ${scheduleHasDate ? '' : 'disabled'}`}>
                                <input
                                    type="checkbox"
                                    checked={createData.importFromSchedule}
                                    onChange={e => setCreateData({ ...createData, importFromSchedule: e.target.checked })}
                                    disabled={!scheduleHasDate}
                                />
                                Import data from Schedule
                            </label>

                            <div className="msd-create-actions">
                                <button onClick={() => setShowCreateModal(false)} className="msd-modal-cancel-btn">Cancel</button>
                                <button onClick={confirmCreateDay} className="msd-modal-create-btn">Create</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isPdfPreviewOpen && (
                <div className="msd-pdf-modal-overlay">
                    <div className="msd-pdf-modal">
                        <div className="msd-pdf-modal-header">
                            <h3>Call Sheet PDF Preview</h3>
                            <button className="msd-pdf-close" onClick={handleClosePdfPreview} aria-label="Close Preview">&times;</button>
                        </div>
                        <div className="msd-pdf-modal-body">
                            {pdfPreviewUrl ? (
                                <iframe
                                    title="Call Sheet PDF"
                                    src={pdfPreviewUrl}
                                    className="msd-pdf-frame"
                                />
                            ) : (
                                <div className="msd-pdf-loading">Preparing preview...</div>
                            )}
                        </div>
                        <div className="msd-pdf-modal-actions">
                            <button className="msd-save-pdf-btn" onClick={handleDownloadPdf} disabled={!pdfPreviewUrl}>
                                <PiFloppyDisk /> Download
                            </button>
                            <button className="msd-preview-toggle-btn" onClick={handleClosePdfPreview}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ManageShootDays Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 20, color: 'red' }}>
                    <h2>Something went wrong in ManageShootDays.</h2>
                    <pre>{this.state.error?.toString()}</pre>
                    <button onClick={() => window.location.reload()}>Reload Page</button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default function ManageShootDaysWithBoundary() {
    return (
        <ErrorBoundary>
            <ManageShootDays />
        </ErrorBoundary>
    );
}
