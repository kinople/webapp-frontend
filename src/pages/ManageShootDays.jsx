
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import { useNavigate, useParams } from 'react-router-dom';
import ProjectHeader from '../components/ProjectHeader';
import {
    PiCalendar, PiClock, PiMapPin, PiFirstAid, PiUser, PiNote,
    PiList, PiPlus, PiTrash, PiFloppyDisk, PiCaretRight, PiEye, PiEyeSlash, PiArrowLeft, PiUsersThree, PiDotsSixVertical, PiMegaphoneBold
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
import LogoEditorModal from '../components/LogoEditorModal';
import TimePicker from '../components/TimePicker';
import InlineLocationMap from '../components/InlineLocationMap';
import '../css/ManageShootDays.css';
import { fetchWithAuth, getApiUrl } from '../utils/api';
import { getToken } from '../utils/auth';
import useGoogleMapsLoader from '../hooks/useGoogleMapsLoader';

const libraries = ['places'];

const sanitizePhoneInput = (value) => {
    if (!value) return '';
    const cleaned = value.replace(/[^0-9+\-() ]+/g, '');
    return cleaned.replace(/\s+/g, ' ').trim();
};

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
    const { user, id, dayId } = useParams();

    // Data State
    const [shootDays, setShootDays] = useState([]);
    const [selectedDayId, setSelectedDayId] = useState(null);
    const [crewList, setCrewList] = useState(null);
    const [castList, setCastList] = useState(null);
    const [project, setProject] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState(null);
    const [saveError, setSaveError] = useState('');
    const [projectLogoTs, setProjectLogoTs] = useState(Date.now());
    const [projectLogo2Ts, setProjectLogo2Ts] = useState(Date.now());
    const [logoEditorState, setLogoEditorState] = useState({ isOpen: false, file: null, slot: 'logo' });
    const [viewMode, setViewMode] = useState(dayId ? 'editor' : 'dashboard'); // 'dashboard' | 'editor'
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
    const [deptBulkSettings, setDeptBulkSettings] = useState({});
    const [previewFocus, setPreviewFocus] = useState({ target: null, pulseKey: 0, source: '' });
    const previewIntentRef = useRef(null);
    const previewFocusDebounceRef = useRef(null);
    const previewFocusClearRef = useRef(null);
    const suppressAddressAutocompleteRef = useRef(false);
    const isAddressInputActiveRef = useRef(false);
    const addressSuggestionSessionRef = useRef(0);
    const latestAddressQueryRef = useRef('');
    const autoSaveTimeoutRef = useRef(null);
    const lastSavedSnapshotRef = useRef('');


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
            safety_hotline: { name: '', phone: '' },
            instructions: ['']
        },

        meals: { breakfast: '', lunch: '', dinner: '', snacks: '' },
        weather: { temp: '', high: '', low: '', desc: '', sunrise: '', sunset: '' },
        useful_contacts: [],
        scenes: [],
        characters: [],
        requirements: '',
        daily_requirements: [], // Added for card layout editor
        department_notes: {},
        crew_calls: {}, // { crew_id: time }
        crew_call_bulk: {},
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

    const buildCharacterPreviewKey = (character, fallbackCastId = '') => {
        const rawId = String(character?.character_id || fallbackCastId || '').trim();
        if (rawId) return `id:${rawId}`;

        const rawName = String(character?.character_name || '').trim().toLowerCase();
        if (rawName) return `name:${rawName.replace(/\s+/g, '-')}`;

        return 'row:unknown';
    };

    const buildScenePreviewKey = (scene, fallbackIndex = 0) => {
        const rawScene = String(scene?.scene_number || '').trim();
        if (rawScene) return `scene:${rawScene.replace(/\s+/g, '-')}`;
        return `row:${fallbackIndex}`;
    };

    const formatSceneSetDescription = useCallback((scene) => {
        const intExt = String(scene?.int_ext || '').trim();
        const location = String(scene?.location || '').trim();
        const description = String(scene?.description || '').trim();

        const summaryParts = [intExt, location].filter(Boolean);

        return {
            summary: summaryParts.length > 1 ? `${summaryParts[0]} - ${summaryParts[1]}` : (summaryParts[0] || ''),
            description
        };
    }, []);

    const hasEpisodeColumn = useCallback((scenes = []) => {
        return Array.isArray(scenes) && scenes.some((scene) => String(scene?.episode_number ?? '').trim() !== '');
    }, []);

    const isEpisodicProject = String(project?.projectType || '').trim().toLowerCase() === 'episodic';

    const getEpisodeOptions = useCallback(() => {
        const seen = new Set();
        const options = [];

        breakdownScenes.forEach((scene) => {
            const episodeNumber = String(scene?.episode_number || '').trim();
            if (!episodeNumber || seen.has(episodeNumber)) return;
            seen.add(episodeNumber);
            options.push(episodeNumber);
        });

        return options.sort((a, b) => {
            const aNum = Number(a);
            const bNum = Number(b);
            const aIsNum = !Number.isNaN(aNum);
            const bIsNum = !Number.isNaN(bNum);
            if (aIsNum && bIsNum) return aNum - bNum;
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });
    }, [breakdownScenes]);

    const getSceneOptionsForEpisode = useCallback((episodeNumber = '') => {
        const targetEpisode = String(episodeNumber || '').trim();
        const seen = new Set();
        const options = [];

        breakdownScenes.forEach((scene) => {
            const sceneNumber = String(scene?.scene_number || '').trim();
            if (!sceneNumber) return;
            const sceneEpisodeNumber = String(scene?.episode_number || '').trim();

            if (isEpisodicProject && !targetEpisode) return;
            if (isEpisodicProject && sceneEpisodeNumber !== targetEpisode) return;
            if (seen.has(sceneNumber)) return;

            seen.add(sceneNumber);
            options.push(sceneNumber);
        });

        return options.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }, [breakdownScenes, isEpisodicProject]);

    const buildRequirementPreviewKey = (requirement, fallbackIndex = 0) => {
        const rawCategory = String(requirement?.category || '').trim().toLowerCase();
        if (rawCategory) return rawCategory.replace(/\s+/g, '-');
        return `req-${fallbackIndex}`;
    };

    const buildContactPreviewKey = (contact, fallbackIndex = 0) => {
        if (contact?.id) return String(contact.id);
        const rawRole = String(contact?.role || '').trim().toLowerCase();
        if (rawRole) return rawRole.replace(/\s+/g, '-');
        return `contact-${fallbackIndex}`;
    };

    const serializeSaveSnapshot = useCallback((data) => JSON.stringify(data ?? {}), []);

    const buildCrewStateKey = useCallback((crew, deptId = '', fallbackIndex = 0) => {
        const rawCrewId = crew?.id;
        if (rawCrewId !== undefined && rawCrewId !== null && String(rawCrewId).trim() !== '') {
            return `id:${String(rawCrewId).trim()}`;
        }

        const namePart = String(crew?.name || '').trim().toLowerCase().replace(/\s+/g, '-');
        const rolePart = String(crew?.role || '').trim().toLowerCase().replace(/\s+/g, '-');
        return `temp:${String(deptId || 'dept').trim() || 'dept'}:${fallbackIndex}:${namePart || 'crew'}:${rolePart || 'role'}`;
    }, []);

    const formatDateDMY = useCallback((isoDate) => {
        if (!isoDate || typeof isoDate !== 'string') return '';
        const parts = isoDate.split('-');
        if (parts.length !== 3) return '';
        const [year, month, day] = parts;
        if (!year || !month || !day) return '';
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }, []);

    const parseDateDMY = useCallback((value) => {
        if (!value || typeof value !== 'string') return null;
        const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!match) return null;
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const year = match[3];
        const iso = `${year}-${month}-${day}`;
        const test = new Date(`${iso}T00:00:00Z`);
        if (Number.isNaN(test.getTime())) return null;
        const testDay = String(test.getUTCDate()).padStart(2, '0');
        const testMonth = String(test.getUTCMonth() + 1).padStart(2, '0');
        const testYear = String(test.getUTCFullYear());
        if (testDay !== day || testMonth !== month || testYear !== year) return null;
        return iso;
    }, []);

    // State for Schedules
    const [schedules, setSchedules] = useState([]);
    const [isImporting, setIsImporting] = useState(false);

    // Create Day Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createData, setCreateData] = useState({ date: '', day_number: '', importFromSchedule: false });
    const [scheduleHasDate, setScheduleHasDate] = useState(false);
    const [createWarning, setCreateWarning] = useState('');
    const [shootDateDisplay, setShootDateDisplay] = useState('');
    const isEditingShootDate = useRef(false);

    const emitPreviewFocus = useCallback((intent, delay = 0) => {
        if (!showPreview || !intent?.target) return;

        clearTimeout(previewFocusDebounceRef.current);
        clearTimeout(previewFocusClearRef.current);

        const applyFocus = () => {
            setPreviewFocus((prev) => {
                const nextPulseKey = prev.pulseKey + 1;

                previewFocusClearRef.current = setTimeout(() => {
                    setPreviewFocus((current) => (
                        current.target === intent.target
                            ? { ...current, target: null, source: '' }
                            : current
                    ));
                }, 1800);

                return {
                    target: intent.target,
                    pulseKey: nextPulseKey,
                    source: intent.source,
                };
            });
        };

        if (delay > 0) {
            previewFocusDebounceRef.current = setTimeout(applyFocus, delay);
        } else {
            applyFocus();
        }
    }, [showPreview]);

    const setPreviewIntentFromElement = useCallback((element) => {
        if (!element?.closest) return;
        const targetNode = element.closest('[data-preview-target]');
        if (!targetNode) return;

        previewIntentRef.current = {
            target: targetNode.dataset.previewTarget,
            mode: targetNode.dataset.previewFocusMode || 'instant',
            source: targetNode.dataset.previewSource || targetNode.dataset.previewTarget,
        };
    }, []);

    const capturePreviewIntent = useCallback((event) => {
        setPreviewIntentFromElement(event.target);
        const intent = previewIntentRef.current;
        if (!intent?.target) return;
        emitPreviewFocus(intent, intent.mode === 'debounced' ? 180 : 0);
    }, [emitPreviewFocus, setPreviewIntentFromElement]);

    useEffect(() => {
        if (!showPreview) return undefined;
        const intent = previewIntentRef.current;
        if (!intent?.target) return undefined;

        emitPreviewFocus(intent, intent.mode === 'debounced' ? 250 : 0);

        return () => {
            clearTimeout(previewFocusDebounceRef.current);
        };
    }, [emitPreviewFocus, formData, showPreview]);

    useEffect(() => () => {
        clearTimeout(previewFocusDebounceRef.current);
        clearTimeout(previewFocusClearRef.current);
        clearTimeout(autoSaveTimeoutRef.current);
    }, []);

    useEffect(() => {
        latestAddressQueryRef.current = formData.location_details?.address || '';
    }, [formData.location_details?.address]);

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

    const findBreakdownScene = (sceneNumber, episodeNumber = '') => {
        const sceneNum = String(sceneNumber || '').trim();
        const epNum = String(episodeNumber || '').trim();
        if (!sceneNum) return null;

        const exact = breakdownScenes.find((scene) => {
            const currentSceneNumber = String(scene.scene_number || '').trim();
            const currentEpisodeNumber = String(scene.episode_number || '').trim();
            return currentSceneNumber === sceneNum && epNum && currentEpisodeNumber === epNum;
        });
        if (exact) return exact;

        return breakdownScenes.find((scene) => String(scene.scene_number || '').trim() === sceneNum) || null;
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
                    const highVal = getNumberValue(daily.maxTemperature?.degrees);
                    const lowVal = getNumberValue(daily.minTemperature?.degrees);
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

    const resetAddressAutocomplete = useCallback(() => {
        addressSuggestionSessionRef.current += 1;
        isAddressInputActiveRef.current = false;
        suppressAddressAutocompleteRef.current = false;
        setSuggestions([]);
        setShowSuggestions(false);
    }, []);

    const clearPendingAutoSave = useCallback(() => {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
    }, []);

    useEffect(() => {
        const fetchSuggestions = async () => {
            const query = formData.location_details?.address;
            const sessionId = addressSuggestionSessionRef.current;
            if (suppressAddressAutocompleteRef.current) {
                suppressAddressAutocompleteRef.current = false;
                setSuggestions([]);
                setShowSuggestions(false);
                return;
            }

            if (!isAddressInputActiveRef.current || !query || query.length < 3 || !isLoaded || !window.google) {
                setSuggestions([]);
                return;
            }

            try {
                const service = new window.google.maps.places.AutocompleteService();
                service.getPlacePredictions({ input: query }, (predictions, status) => {
                    if (
                        addressSuggestionSessionRef.current !== sessionId ||
                        !isAddressInputActiveRef.current ||
                        latestAddressQueryRef.current !== query
                    ) {
                        return;
                    }

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

    useEffect(() => {
        if (!selectedDayId || viewMode !== 'editor') {
            setHasUnsavedChanges(false);
            return;
        }

        const currentSnapshot = serializeSaveSnapshot(formData);
        const isDirty = lastSavedSnapshotRef.current !== currentSnapshot;
        setHasUnsavedChanges(isDirty);
        if (isDirty) {
            setSaveError('');
        }
    }, [formData, selectedDayId, serializeSaveSnapshot, viewMode]);

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
                suppressAddressAutocompleteRef.current = true;
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
                        suppressAddressAutocompleteRef.current = true;
                        fetchWeatherForCoords(lat, lng, formData.date);
                    } else {
                        setFormData(prev => ({
                            ...prev,
                            location_details: {
                                ...prev.location_details,
                                address: prediction.description
                            }
                        }));
                        suppressAddressAutocompleteRef.current = true;
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
                suppressAddressAutocompleteRef.current = true;
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
                    suppressAddressAutocompleteRef.current = true;
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
                    suppressAddressAutocompleteRef.current = true;
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
                suppressAddressAutocompleteRef.current = true;
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
            suppressAddressAutocompleteRef.current = true;
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
            const token = getToken();

            const pDays = fetchWithAuth(getApiUrl(`/api/projects/${id}/shoot-days`)).then(async res => {
                if (!res.ok) throw new Error("Failed to fetch shoot days");
                const days = await res.json();
                setShootDays(days);
                return days;
            });

            const pProj = fetchWithAuth(getApiUrl(`/api/project-name/${id}`), {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(async res => {
                if (res.ok) return await res.json();
                return null;
            }).catch(e => {
                console.error("Failed to fetch project info", e);
                return null;
            });

            const pCrew = fetch(getApiUrl(`/api/projects/${id}/crewlist`)).then(async res => {
                if (res.ok) {
                    const crewData = await res.json();
                    setCrewList(crewData);
                }
            }).catch(e => console.error("Failed to fetch crew", e));

            const pCast = fetch(getApiUrl(`/api/${id}/cast-list`)).then(async res => {
                if (res.ok) {
                    const castData = await res.json();
                    setCastList(castData.cast_list || []);
                }
            }).catch(e => console.error("Failed to fetch cast", e));

            const pScripts = fetch(getApiUrl(`/api/${id}/script-list`)).then(async res => {
                if (res.ok) {
                    const scripts = await res.json();
                    if (scripts.length > 0) {
                        const latestScript = scripts.sort((a, b) => (b.version || 0) - (a.version || 0))[0];
                        if (latestScript && latestScript.id) {
                            const bdRes = await fetch(getApiUrl(`/api/fetch-breakdown?project_id=${id}`));
                            if (bdRes.ok) {
                                const bdData = await bdRes.json();
                                if (bdData.scene_breakdowns) {
                                    setBreakdownScenes(bdData.scene_breakdowns);
                                }
                            }
                        }
                    }
                }
            }).catch(e => console.error("Failed to fetch scripts", e));

            const pSched = fetch(getApiUrl(`/api/${id}/schedules`)).then(async res => {
                if (res.ok) {
                    const schedData = await res.json();
                    setSchedules(schedData.schedules || []);
                }
            }).catch(e => console.error("Failed to fetch schedules", e));

            const [daysResult, projResult] = await Promise.all([
                pDays, pProj, pCrew, pCast, pScripts, pSched
            ]);

            if (projResult) {
                setProject({
                    title: projResult.projectName || projResult.name || `Project ${id}`,
                    projectType: projResult.projectType || '',
                    productionCompany: 'Production Company',
                    totalDays: daysResult ? daysResult.length : 0
                });
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

    const handleDaySelect = useCallback((day, options = {}) => {
        const { syncRoute = true, replace = false } = options;
        clearPendingAutoSave();
        resetAddressAutocomplete();
        setViewMode('editor');
        setSelectedDayId(day.id);
        // Load day data with fresh default structure (no merging with previous day)
        const freshDefaults = {
            set_name: '', address: '',
            contact_name: '', contact_phone: '',
            latitude: null, longitude: null,
            hospital: { name: '', loc: '' },
            safety_hotline: { name: '', phone: '' },
            instructions: ['']
        };

        const freshMeals = {
            breakfast: '', lunch: '', dinner: '', snacks: ''
        };

        const nextFormData = {
            ...formData,
            ...day,
            meals: { ...freshMeals, ...(day.meals || {}) },
            location_details: {
                ...freshDefaults,
                ...(day.location_details || {}),
                hospital: { name: '', loc: '', ...(day.location_details?.hospital || {}) },
                safety_hotline: { name: '', phone: '', ...(day.location_details?.safety_hotline || {}) },
                instructions: Array.isArray(day.location_details?.instructions)
                    ? day.location_details.instructions
                    : (day.location_details?.instructions ? [day.location_details.instructions] : [''])
            },
            scenes: ensureIds(day.scenes),
            characters: day.characters || [],
            department_notes: day.department_notes || {},
            crew_calls: day.crew_calls || {},
            crew_call_bulk: day.crew_call_bulk || {},
            advanced_schedule: ensureIds(day.advanced_schedule)
        };

        lastSavedSnapshotRef.current = serializeSaveSnapshot(nextFormData);
        setHasUnsavedChanges(false);
        setSaveError('');
        setLastSavedAt(null);
        setFormData(nextFormData);
        setDeptBulkSettings(day.crew_call_bulk || {});
        if (syncRoute) {
            navigate(`/${user}/${id}/call-sheets/day/${day.id}`, { replace });
        }
    }, [clearPendingAutoSave, formData, id, navigate, resetAddressAutocomplete, serializeSaveSnapshot, user]);

    useEffect(() => {
        if (isLoading) return;

        if (!dayId) {
            if (viewMode !== 'dashboard' || selectedDayId !== null) {
                clearPendingAutoSave();
                resetAddressAutocomplete();
                setViewMode('dashboard');
                setSelectedDayId(null);
                setHasUnsavedChanges(false);
                setSaveError('');
                setLastSavedAt(null);
            }
            return;
        }

        const targetDay = shootDays.find((day) => String(day.id) === String(dayId));
        if (!targetDay) {
            navigate(`/${user}/${id}/call-sheets`, { replace: true });
            return;
        }

        if (selectedDayId !== targetDay.id || viewMode !== 'editor') {
            handleDaySelect(targetDay, { syncRoute: false, replace: true });
        }
    }, [
        clearPendingAutoSave,
        dayId,
        handleDaySelect,
        id,
        isLoading,
        navigate,
        resetAddressAutocomplete,
        selectedDayId,
        shootDays,
        user,
        viewMode
    ]);

    const handleCreateDay = async () => {
        try {
            const res = await fetch(getApiUrl(`/api/projects/${id}/shoot-days`), {
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

    const persistShootDay = useCallback(async (payload, { showSuccessAlert = false, autoSave = false } = {}) => {
        if (!selectedDayId) return false;

        if (autoSave) {
            setIsAutoSaving(true);
        } else {
            setIsSaving(true);
        }

        try {
            const res = await fetch(getApiUrl(`/api/shoot-days/${selectedDayId}?project_id=${id}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
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
            setShootDays(prev => prev.map(d => d.id === processedUpdated.id ? processedUpdated : d));
            lastSavedSnapshotRef.current = serializeSaveSnapshot(payload);
            setHasUnsavedChanges(false);
            setSaveError('');
            setLastSavedAt(Date.now());
            if (!autoSave) {
                resetAddressAutocomplete();
            }
            if (showSuccessAlert) {
                alert("Shoot Day Saved Successfully!");
            }
            return true;
        } catch (err) {
            setSaveError(autoSave ? 'Auto-save failed' : err.message);
            if (!autoSave) {
                alert("Error saving: " + err.message);
            }
            return false;
        } finally {
            if (autoSave) {
                setIsAutoSaving(false);
            } else {
                setIsSaving(false);
            }
        }
    }, [id, resetAddressAutocomplete, selectedDayId, serializeSaveSnapshot]);

    useEffect(() => {
        if (!selectedDayId || viewMode !== 'editor' || !hasUnsavedChanges || isSaving || isAutoSaving) {
            clearPendingAutoSave();
            return undefined;
        }

        autoSaveTimeoutRef.current = setTimeout(() => {
            persistShootDay(formData, { autoSave: true });
        }, 1200);

        return () => clearPendingAutoSave();
    }, [clearPendingAutoSave, formData, hasUnsavedChanges, isAutoSaving, isSaving, persistShootDay, selectedDayId, viewMode]);

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
            // Hide the browser PDF toolbar so the page preview can use more of the modal.
            setPdfPreviewUrl(url + '#toolbar=0&navpanes=0&scrollbar=0&zoom=page-fit&pagemode=none');
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

    const getSceneIdentity = (sceneNumber, episodeNumber = '') => ({
        sceneNumber: String(sceneNumber || '').trim(),
        episodeNumber: String(episodeNumber || '').trim()
    });

    const resolveScheduleSceneNumber = (schedScene) => {
        let sceneNum = schedScene?.scene_number;

        if (!sceneNum && schedScene?.scene_id !== undefined && schedScene?.scene_id !== null) {
            const breakdownByIndex = breakdownScenes[schedScene.scene_id];
            if (breakdownByIndex) {
                sceneNum = breakdownByIndex.scene_number;
            } else {
                sceneNum = String(schedScene.scene_id);
            }
        }

        if (!sceneNum) sceneNum = String(schedScene?.scene_id || '');
        return String(sceneNum || '').trim();
    };

    const mapBreakdownCastIds = (breakdown) => {
        if (!breakdown?.characters) return '';

        const charArray = Array.isArray(breakdown.characters) ? breakdown.characters : String(breakdown.characters).split(',');
        const castIds = charArray.map(name => {
            if (!name) return '';
            const cleanName = String(name).trim().toLowerCase();
            const found = castList?.find(c => c.character && String(c.character).trim().toLowerCase() === cleanName);
            return found && found.cast_id ? found.cast_id : String(name).trim();
        }).filter(id => id !== '')
            .sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0));

        return castIds.join(', ');
    };

    const buildImportedScene = (schedScene) => {
        const sceneNum = resolveScheduleSceneNumber(schedScene);
        if (!sceneNum) return null;

        const breakdown = findBreakdownScene(sceneNum, schedScene?.episode_number || '');

        return {
            scene_number: sceneNum,
            episode_number: schedScene?.episode_number || breakdown?.episode_number || '',
            int_ext: breakdown?.int_ext || breakdown?.ie || '',
            day_night: breakdown?.time || breakdown?.day_night || '',
            description: breakdown?.synopsis || breakdown?.description || '',
            location: breakdown?.set || breakdown?.location || '',
            pages: breakdown?.page_eighths || '',
            cast_ids: mapBreakdownCastIds(breakdown)
        };
    };

    const buildSceneFromBreakdown = (sceneNumber, episodeNumber = '', existingScene = {}) => {
        const breakdown = findBreakdownScene(sceneNumber, episodeNumber);
        const resolvedSceneNumber = String(sceneNumber || breakdown?.scene_number || '').trim();
        if (!resolvedSceneNumber) {
            return {
                ...existingScene,
                scene_number: ''
            };
        }

        return {
            ...existingScene,
            scene_number: resolvedSceneNumber,
            episode_number: episodeNumber || breakdown?.episode_number || existingScene?.episode_number || '',
            int_ext: breakdown?.int_ext || breakdown?.ie || existingScene?.int_ext || '',
            day_night: breakdown?.time || breakdown?.day_night || existingScene?.day_night || '',
            description: breakdown?.synopsis || breakdown?.description || existingScene?.description || '',
            location: breakdown?.set || breakdown?.location || existingScene?.location || '',
            pages: breakdown?.page_eighths || existingScene?.pages || '',
            cast_ids: mapBreakdownCastIds(breakdown) || existingScene?.cast_ids || '',
            remarks: existingScene?.remarks || ''
        };
    };

    const findExistingSceneIndex = (existingScenes, importedScene) => {
        const importedIdentity = getSceneIdentity(importedScene?.scene_number, importedScene?.episode_number);
        if (!importedIdentity.sceneNumber) return -1;

        const exactIndex = existingScenes.findIndex(scene => {
            const currentIdentity = getSceneIdentity(scene?.scene_number, scene?.episode_number);
            return currentIdentity.sceneNumber === importedIdentity.sceneNumber &&
                importedIdentity.episodeNumber &&
                currentIdentity.episodeNumber === importedIdentity.episodeNumber;
        });

        if (exactIndex !== -1) return exactIndex;

        return existingScenes.findIndex(scene => {
            const currentIdentity = getSceneIdentity(scene?.scene_number, scene?.episode_number);
            return currentIdentity.sceneNumber === importedIdentity.sceneNumber;
        });
    };

    const mergeImportedScenesIntoDay = (existingScenes, existingCharacters, scheduleScenes) => {
        const mergedScenes = [...(existingScenes || [])];
        let mergedCharacters = [...(existingCharacters || [])];
        let refreshedCount = 0;
        let addedCount = 0;

        (scheduleScenes || []).forEach(schedScene => {
            const importedScene = buildImportedScene(schedScene);
            if (!importedScene) return;

            const existingIndex = findExistingSceneIndex(mergedScenes, importedScene);

            if (existingIndex !== -1) {
                const existingScene = mergedScenes[existingIndex];
                mergedScenes[existingIndex] = {
                    ...existingScene,
                    ...importedScene,
                    _id: existingScene._id || crypto.randomUUID(),
                    remarks: existingScene?.remarks ?? ''
                };
                refreshedCount += 1;
            } else {
                mergedScenes.push({
                    _id: crypto.randomUUID(),
                    ...importedScene
                });
                addedCount += 1;
            }

            mergedCharacters = addCharactersForScene(
                importedScene.scene_number,
                mergedCharacters,
                importedScene.episode_number
            );
        });

        return {
            scenes: mergedScenes,
            characters: mergedCharacters,
            refreshedCount,
            addedCount
        };
    };

    const hasExactBreakdownSceneMatch = (sceneNumber, episodeNumber = '') => {
        const identity = getSceneIdentity(sceneNumber, episodeNumber);
        if (!identity.sceneNumber) return false;
        return !!findBreakdownScene(identity.sceneNumber, identity.episodeNumber);
    };

    const hasDuplicateSceneNumberInList = (list = [], indexToSkip, sceneNumber) => {
        const normalizedSceneNumber = String(sceneNumber || '').trim().toLowerCase();
        if (!normalizedSceneNumber) return false;

        return list.some((scene, idx) => (
            idx !== indexToSkip &&
            String(scene?.scene_number || '').trim().toLowerCase() === normalizedSceneNumber
        ));
    };

    const hasSceneNumberInList = (list = [], sceneNumber) => {
        const normalizedSceneNumber = String(sceneNumber || '').trim().toLowerCase();
        if (!normalizedSceneNumber) return false;

        return list.some(scene => String(scene?.scene_number || '').trim().toLowerCase() === normalizedSceneNumber);
    };

    const handleManualSceneSelection = (listKey, index, selectedSceneNumber, { finalize = false } = {}) => {
        const normalizedSceneNumber = String(selectedSceneNumber || '').trim();

        setFormData(prev => {
            const targetList = [...(prev[listKey] || [])];
            const existingScene = targetList[index] || { _id: crypto.randomUUID() };
            const hasDuplicate = hasDuplicateSceneNumberInList(targetList, index, normalizedSceneNumber);
            const otherListKey = listKey === 'scenes' ? 'advanced_schedule' : 'scenes';
            const otherList = [...(prev[otherListKey] || [])];

            if (hasDuplicate) {
                if (finalize && normalizedSceneNumber) {
                    alert(`Scene ${normalizedSceneNumber} is already added in this list.`);
                }

                targetList[index] = {
                    ...existingScene,
                    scene_number: finalize ? '' : normalizedSceneNumber,
                    _isSelectingSceneNumber: true
                };

                return {
                    ...prev,
                    [listKey]: targetList
                };
            }

            if (finalize && normalizedSceneNumber && listKey === 'advanced_schedule' && hasSceneNumberInList(otherList, normalizedSceneNumber)) {
                alert(`Scene ${normalizedSceneNumber} is already in Shooting Schedule. You cannot add it to Advance Shooting Schedule.`);
                targetList[index] = {
                    ...existingScene,
                    scene_number: '',
                    _isSelectingSceneNumber: true
                };

                return {
                    ...prev,
                    [listKey]: targetList
                };
            }

            const hasBreakdownMatch = hasExactBreakdownSceneMatch(normalizedSceneNumber, existingScene?.episode_number || '');

            targetList[index] = hasBreakdownMatch
                ? buildSceneFromBreakdown(
                    normalizedSceneNumber,
                    existingScene?.episode_number || '',
                    existingScene
                )
                : {
                    ...existingScene,
                    scene_number: normalizedSceneNumber,
                    _isSelectingSceneNumber: existingScene?._isSelectingSceneNumber ?? true
                };

            if (finalize && normalizedSceneNumber) {
                targetList[index] = {
                    ...targetList[index],
                    _isSelectingSceneNumber: false
                };
            }

            const nextState = {
                ...prev,
                [listKey]: targetList
            };

            if (finalize && normalizedSceneNumber && listKey === 'scenes' && otherList.length > 0) {
                nextState[otherListKey] = otherList.filter(scene =>
                    String(scene?.scene_number || '').trim().toLowerCase() !== normalizedSceneNumber.toLowerCase()
                );
            }

            if (normalizedSceneNumber && hasBreakdownMatch) {
                nextState.characters = addCharactersForScene(
                    normalizedSceneNumber,
                    prev.characters,
                    targetList[index]?.episode_number || ''
                );
            }

            return nextState;
        });
    };

    const handleSceneEpisodeSelection = (listKey, index, selectedEpisodeNumber) => {
        const normalizedEpisodeNumber = String(selectedEpisodeNumber || '').trim();

        setFormData(prev => {
            const targetList = [...(prev[listKey] || [])];
            const existingScene = targetList[index] || { _id: crypto.randomUUID() };

            targetList[index] = {
                ...existingScene,
                episode_number: normalizedEpisodeNumber,
                scene_number: '',
                int_ext: '',
                day_night: '',
                description: '',
                location: '',
                pages: '',
                cast_ids: '',
                _isSelectingSceneNumber: true
            };

            return {
                ...prev,
                [listKey]: targetList
            };
        });
    };

    const addCharactersForScene = (sceneNumber, currentCharacters, episodeNumber = '') => {
        const scene = findBreakdownScene(sceneNumber, episodeNumber) || breakdownScenes.find(s => s.id === sceneNumber);
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

    const isCharacterPresentInScheduledScenes = (character, scenes = [], advanceSchedule = []) => {
        const normalizedName = String(character?.character_name || '').trim().toLowerCase();
        const resolvedCharacterId = String(character?.character_id || getCastId(character?.character_name) || '').trim();
        const normalizedCharacterId = resolvedCharacterId && resolvedCharacterId !== '-' ? resolvedCharacterId.toLowerCase() : '';

        if (!normalizedName && !normalizedCharacterId) return false;

        return [...scenes, ...advanceSchedule].some(scene => {
            if (!scene?.cast_ids) return false;

            return String(scene.cast_ids)
                .split(',')
                .map(castIdentity => castIdentity.trim().toLowerCase())
                .filter(Boolean)
                .some(castIdentity => castIdentity === normalizedName || (normalizedCharacterId && castIdentity === normalizedCharacterId));
        });
    };

    const handleRemoveCharacter = (characterIndex) => {
        const characterToRemove = formData.characters?.[characterIndex];
        if (!characterToRemove) return;

        const isReferencedInScenes = isCharacterPresentInScheduledScenes(
            characterToRemove,
            formData.scenes || [],
            formData.advanced_schedule || []
        );

        if (isReferencedInScenes) {
            const shouldProceed = window.confirm("he's there in the scenes, still wanna proceed?");
            if (!shouldProceed) return;
        }

        setFormData(prev => ({
            ...prev,
            characters: prev.characters.filter((_, i) => i !== characterIndex)
        }));
    };

    const getScheduledScenesForDate = async (targetDate) => {
        if (!targetDate) return [];

        for (const sched of schedules) {
            const res = await fetch(getApiUrl(`/api/${id}/schedule/${sched.id}`));
            if (!res.ok) continue;

            const fullSched = await res.json();
            const scheduleByDay = fullSched.schedule?.schedule_by_day;
            if (!scheduleByDay) continue;

            const matchedDay = Object.values(scheduleByDay).find(daySched => daySched.date === targetDate);
            if (matchedDay?.scenes?.length) {
                return matchedDay.scenes;
            }
        }

        return [];
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
            const foundScenes = await getScheduledScenesForDate(formData.date);

            if (foundScenes.length === 0) {
                alert("No scenes found in any schedule for this date.");
                return;
            }

            const {
                scenes: updatedScenes,
                characters: updatedCharacters,
                refreshedCount,
                addedCount
            } = mergeImportedScenesIntoDay(formData.scenes, formData.characters, foundScenes);

            setFormData(prev => ({
                ...prev,
                scenes: updatedScenes,
                characters: updatedCharacters
            }));

            alert(`Imported ${foundScenes.length} schedule scenes. Added ${addedCount} new scene(s) and refreshed ${refreshedCount} existing scene(s).`);

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
                const res = await fetch(getApiUrl(`/api/${id}/schedule/${sched.id}`));
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

    useEffect(() => {
        if (!isEditingShootDate.current) {
            setShootDateDisplay(formatDateDMY(formData.date || ''));
        }
    }, [formData.date, formatDateDMY]);

    // ... (renderGeneralInfo update)
    const checkCharLimit = (text, limit) => {
        const chars = text ? text.length : 0;
        return chars <= limit;
    };

    const renderGeneralInfo = () => (
        <div className="msd-section">
            <div className="msd-section-header"><PiCalendar /> General Information</div>
            <div className="msd-grid-2">
                <div className="msd-label msd-label--static-row">
                    <span>Shoot Date</span>
                    <div className="msd-static-value">{shootDateDisplay || '-'}</div>
                </div>
                <div className="msd-label msd-label--static-row">
                    <span>Shoot Day #</span>
                    <div className="msd-static-value">{formData.day_number || '-'}</div>
                </div>

                <div className="msd-label msd-label--time" data-preview-target="shift-start"><span>Shift Start</span><TimePicker value={formData.shift_start || ''} onChange={v => setFormData({ ...formData, shift_start: v })} /></div>
                <div className="msd-label msd-label--time" data-preview-target="shift-end"><span>Shift End</span><TimePicker value={formData.shift_end || ''} onChange={v => setFormData({ ...formData, shift_end: v })} /></div>
                <div className="msd-label msd-label--time" data-preview-target="time-crew-call"><span>Crew Call</span><TimePicker value={formData.crew_call || ''} onChange={v => setFormData({ ...formData, crew_call: v })} /></div>
                <div className="msd-label msd-label--time" data-preview-target="time-shooting-call"><span>Shoot Call</span><TimePicker value={formData.shoot_call || ''} onChange={v => setFormData({ ...formData, shoot_call: v })} /></div>
                <div className="msd-label msd-label--time" data-preview-target="time-est-wrap"><span>Est. Wrap</span><TimePicker value={formData.estimated_wrap || ''} onChange={v => setFormData({ ...formData, estimated_wrap: v })} /></div>
            </div>

            <div className="msd-grid-3" style={{ marginTop: 10 }}>
                Quote of the Day <span style={{ fontSize: '0.8em', color: '#666' }}>(Max 26 chars)</span>
                <div style={{ position: 'relative' }} data-preview-target="quote" data-preview-focus-mode="debounced">
                    <textarea
                        className="msd-input msd-input-wrap"
                        rows={2}
                        value={formData.quote || ''}
                        onChange={e => {
                            if (checkCharLimit(e.target.value, 26)) {
                                setFormData({ ...formData, quote: e.target.value });
                            }
                        }}
                    ></textarea>
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#999' }}>
                        {(formData.quote?.length || 0)}/26
                    </span>
                </div>
            </div>
        </div>
    );

    const renderMeals = () => (
        <div className="msd-section" data-preview-target="time-weather">
            <div className="msd-section-header"><PiClock /> Meals</div>
            <div className="msd-grid-4">
                <div className="msd-label msd-label--time" data-preview-target="time-breakfast"><span>Breakfast</span><TimePicker value={formData.meals.breakfast || ''} onChange={v => setFormData({ ...formData, meals: { ...formData.meals, breakfast: v } })} /></div>
                <div className="msd-label msd-label--time" data-preview-target="time-lunch"><span>Lunch</span><TimePicker value={formData.meals.lunch || ''} onChange={v => setFormData({ ...formData, meals: { ...formData.meals, lunch: v } })} /></div>
                <div className="msd-label msd-label--time" data-preview-target="time-snacks"><span>Snacks</span><TimePicker value={formData.meals.snacks || ''} onChange={v => setFormData({ ...formData, meals: { ...formData.meals, snacks: v } })} /></div>
                <div className="msd-label msd-label--time" data-preview-target="time-dinner"><span>Dinner</span><TimePicker value={formData.meals.dinner || ''} onChange={v => setFormData({ ...formData, meals: { ...formData.meals, dinner: v } })} /></div>
            </div>
        </div>
    );

    const getInstructionLines = () => (
        Array.isArray(formData.location_details.instructions)
            ? formData.location_details.instructions
            : [formData.location_details.instructions || '']
    );

    const renderLocation = () => (
        <div className="msd-section" data-preview-target="location-panel" data-preview-focus-mode="debounced">
            <div className="msd-section-header"><PiMapPin /> Location</div>
            <label className="msd-label" data-preview-target="location-set-name" data-preview-focus-mode="debounced">Set Name <input type="text" className="msd-input" value={formData.location_details.set_name || ''} onChange={e => setFormData({ ...formData, location_details: { ...formData.location_details, set_name: e.target.value } })} /></label>
            <label className="msd-label" data-preview-target="location-address" data-preview-focus-mode="debounced">Address / Pin
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                    <input
                        type="text"
                        className="msd-input"
                        value={formData.location_details.address || ''}
                        onChange={e => {
                            isAddressInputActiveRef.current = true;
                            setFormData({ ...formData, location_details: { ...formData.location_details, address: e.target.value } });
                            setShowSuggestions(true);
                        }}
                        onFocus={() => {
                            isAddressInputActiveRef.current = true;
                            setShowSuggestions(true);
                        }}
                        onBlur={() => {
                            window.setTimeout(() => {
                                isAddressInputActiveRef.current = false;
                                setShowSuggestions(false);
                            }, 200);
                        }}
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
                <label className="msd-label" data-preview-target="location-contact-phone" data-preview-focus-mode="debounced">Contact Phone <input type="tel" className="msd-input" value={formData.location_details.contact_phone || ''} onChange={e => setFormData(p => updateNested(p, 'location_details.contact_phone', sanitizePhoneInput(e.target.value)))} /></label>
            </div>

            <div className="msd-sub-header"><PiFirstAid /> Nearest Hospital</div>
            <div className="msd-grid-2">
                <label className="msd-label" data-preview-target="hospital-name" data-preview-focus-mode="debounced">Name <input type="text" className="msd-input" value={formData.location_details.hospital.name || ''} onChange={e => setFormData(p => updateNested(p, 'location_details.hospital.name', e.target.value))} /></label>
                <label className="msd-label" data-preview-target="hospital-location" data-preview-focus-mode="debounced">Location <input type="text" className="msd-input" value={formData.location_details.hospital.loc || ''} onChange={e => setFormData(p => updateNested(p, 'location_details.hospital.loc', e.target.value))} /></label>
            </div>

        </div>
    );

    const renderGeneralInstructionsSection = () => (
        <div className="msd-section" data-preview-target="instructions-strip" data-preview-focus-mode="debounced">
            <div className="msd-section-header"><PiList /> General Instructions</div>
            <label className="msd-label">
                General Instructions <span style={{ fontSize: '0.8em', color: '#666' }}>(Max 180 chars total)</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {getInstructionLines().map((instruction, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <textarea
                                className="msd-input msd-input-wrap"
                                rows={2}
                                value={instruction}
                                onChange={e => {
                                    const newInstructions = [...getInstructionLines()];
                                    const oldVal = newInstructions[idx];
                                    newInstructions[idx] = e.target.value;

                                    const totalChars = newInstructions.join(' ').length;
                                    const currentChars = oldVal.length;
                                    const newChars = e.target.value.length;

                                    if (totalChars <= 180 || newChars < currentChars) {
                                        setFormData(p => updateNested(p, 'location_details.instructions', newInstructions));
                                    }
                                }}
                                placeholder={`Instruction line ${idx + 1}`}
                            ></textarea>
                            <button
                                onClick={() => {
                                    const newInstructions = [...getInstructionLines()];
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
                            const newInstructions = [...getInstructionLines()];
                            newInstructions.push('');
                            setFormData(p => updateNested(p, 'location_details.instructions', newInstructions));
                        }}
                        className="msd-import-btn"
                        style={{ width: 'fit-content', marginTop: '5px', fontSize: '12px' }}
                    >
                        <PiPlus /> Add Line
                    </button>
                    <span style={{ fontSize: '11px', color: '#999', alignSelf: 'flex-end' }}>
                        {getInstructionLines().join(' ').length}/180 chars
                    </span>
                </div>
            </label>
        </div>
    );

    const renderAttentionSection = () => (
        <div className="msd-section" data-preview-target="attention-block" data-preview-focus-mode="debounced">
            <div className="msd-section-header"><PiMegaphoneBold /> Attention</div>
            <label className="msd-label">
                Attention <span style={{ fontSize: '0.8em', color: '#666' }}>(Max 180 chars)</span>
                <div style={{ position: 'relative' }}>
                    <textarea
                        className="msd-input msd-input-wrap"
                        rows={2}
                        value={formData.attention || ''}
                        onChange={e => {
                            if (checkCharLimit(e.target.value, 180)) {
                                setFormData({ ...formData, attention: e.target.value });
                            }
                        }}
                        placeholder="Important Notice..."
                    ></textarea>
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#999' }}>
                        {(formData.attention?.length || 0)}/180
                    </span>
                </div>
            </label>
        </div>
    );

    const renderSafetyHotlineSection = () => (
        <div className="msd-section" data-preview-target="safety-hotline" data-preview-focus-mode="debounced">
            <div className="msd-section-header">🛡️ Safety Hotline</div>
            <div className="msd-grid-2">
                <label className="msd-label" data-preview-target="safety-hotline-name" data-preview-focus-mode="debounced">Name <input type="text" className="msd-input" value={formData.location_details.safety_hotline.name || ''} onChange={e => setFormData(p => updateNested(p, 'location_details.safety_hotline.name', e.target.value))} placeholder="e.g., Safe Set Hotline" /></label>
                <label className="msd-label" data-preview-target="safety-hotline-phone" data-preview-focus-mode="debounced">Phone <input type="text" className="msd-input" value={formData.location_details.safety_hotline.phone || ''} onChange={e => setFormData(p => updateNested(p, 'location_details.safety_hotline.phone', e.target.value))} placeholder="e.g., (555) 123-4567" /></label>
            </div>
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
        <div className="msd-section" data-preview-target="useful-contacts" data-preview-focus-mode="debounced">
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
                {(formData.useful_contacts || []).map((contact, idx) => {
                    const previewKey = buildContactPreviewKey(contact, idx);
                    return (
                    <div key={contact.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 30px', gap: '8px', alignItems: 'center' }}>
                        <input
                            type="text"
                            className="msd-input"
                            data-preview-target={`useful-contact:${previewKey}`}
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
                            data-preview-target={`useful-contact:${previewKey}`}
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
                            data-preview-target={`useful-contact:${previewKey}`}
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
                    );
                })}
            </div>
        </div>
    );


    const renderScenes = () => (


        <div className="msd-section" data-preview-target="today-schedule" data-preview-focus-mode="debounced">
            <div className="msd-section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><PiList /> Shooting Schedule (Scenes)</div>
            </div>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(e, 'main')}
            >
                {(() => {
                    const showEpisodeColumn = isEpisodicProject || hasEpisodeColumn(formData.scenes || []);
                    const episodeOptions = getEpisodeOptions();
                    return (
                <table className="msd-table">
                    <thead>
                        <tr>
                            <th style={{ width: '30px' }}></th>
                            {showEpisodeColumn && <th style={{ width: '50px', textAlign: 'center' }}>EP</th>}
                            <th style={{ width: '50px', textAlign: 'center' }}>Scene</th>
                            <th style={{ width: '42%' }}>Sets and Description</th>
                            <th style={{ width: '70px', textAlign: 'center' }}>Cast ID</th>
                            <th style={{ width: '70px', textAlign: 'center' }}>Day/Night</th>
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
                            {formData.scenes.map((scene, idx) => {
                                const previewKey = buildScenePreviewKey(scene, idx);
                                const isSceneNumberEditable = scene._isSelectingSceneNumber || !scene.scene_number;
                                const { summary, description } = formatSceneSetDescription(scene);
                                const sceneOptions = getSceneOptionsForEpisode(scene.episode_number || '');
                                return (
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
                                    {showEpisodeColumn && (
                                        <td
                                            style={{ textAlign: 'center', verticalAlign: 'middle' }}
                                            data-preview-target={`scene-cell:main:${previewKey}:episode_number`}
                                        >
                                            {isSceneNumberEditable ? (
                                                <select
                                                    className="msd-td-input-center"
                                                    value={scene.episode_number || ''}
                                                    onChange={e => handleSceneEpisodeSelection('scenes', idx, e.target.value)}
                                                >
                                                    <option value="">EP</option>
                                                    {episodeOptions.map((episodeNumber) => (
                                                        <option key={episodeNumber} value={episodeNumber}>{episodeNumber}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="msd-td-display msd-td-display-center">{scene.episode_number || '-'}</div>
                                            )}
                                        </td>
                                    )}
                                    <td
                                        data-preview-target={`scene-cell:main:${previewKey}:scene_number`}
                                        style={{ textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle', whiteSpace: 'nowrap' }}
                                    >
                                        {isSceneNumberEditable && showEpisodeColumn ? (
                                            <select
                                                className="msd-td-input-center"
                                                value={scene.scene_number || ''}
                                                onChange={e => handleManualSceneSelection('scenes', idx, e.target.value, { finalize: true })}
                                                disabled={!String(scene.episode_number || '').trim()}
                                            >
                                                <option value="">{String(scene.episode_number || '').trim() ? 'Select Scene' : 'Select EP first'}</option>
                                                {sceneOptions.map((sceneNumber) => (
                                                    <option key={`${scene.episode_number || 'ep'}-${sceneNumber}`} value={sceneNumber}>{sceneNumber}</option>
                                                ))}
                                            </select>
                                        ) : isSceneNumberEditable ? (
                                            <input
                                                type="text"
                                                list="available-scenes-list"
                                                className="msd-td-input-center"
                                                value={scene.scene_number || ''}
                                                placeholder="Scene"
                                                onChange={e => handleManualSceneSelection('scenes', idx, e.target.value)}
                                                onBlur={e => handleManualSceneSelection('scenes', idx, e.target.value, { finalize: true })}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        e.currentTarget.blur();
                                                    }
                                                }}
                                            />
                                        ) : (
                                            scene.scene_number || '-'
                                        )}
                                    </td>
                                    <td className="msd-scene-setdesc-cell">
                                        <div
                                            className="msd-scene-setdesc-summary"
                                            data-preview-target={`scene-cell:main:${previewKey}:location`}
                                        >
                                            {summary || '-'}
                                        </div>
                                        <div
                                            className="msd-scene-setdesc-description"
                                            data-preview-target={`scene-cell:main:${previewKey}:description`}
                                        >
                                            {description || '-'}
                                        </div>
                                    </td>
                                    <td
                                        className="msd-td-display msd-td-display-center"
                                        data-preview-target={`scene-cell:main:${previewKey}:cast_ids`}
                                    >
                                        {scene.cast_ids ? scene.cast_ids.split(',').map(s => s.trim()).filter(Boolean).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0)).join(', ') : '-'}
                                    </td>
                                    <td
                                        className="msd-td-display msd-td-display-center"
                                        data-preview-target={`scene-cell:main:${previewKey}:day_night`}
                                    >
                                        {scene.day_night || '-'}
                                    </td>
                                    <td
                                        className="msd-td-display msd-td-display-center"
                                        data-preview-target={`scene-cell:main:${previewKey}:pages`}
                                    >
                                        {scene.pages || '-'}
                                    </td>
                                    <td data-preview-target={`scene-cell:main:${previewKey}:remarks`}><textarea className="msd-td-textarea" value={scene.remarks || ''} onChange={e => { const newScenes = [...formData.scenes]; newScenes[idx].remarks = e.target.value; setFormData({ ...formData, scenes: newScenes }); }} /></td>
                                    <td style={{ textAlign: 'center' }}><button onClick={() => {
                                        const removedScene = formData.scenes[idx];
                                        const updatedScenes = formData.scenes.filter((_, i) => i !== idx);
                                        const updatedAdvance = formData.advanced_schedule || [];
                                        const updatedCharacters = pruneCharactersAfterRemoval(removedScene.cast_ids, updatedScenes, updatedAdvance, formData.characters);
                                        setFormData(p => ({ ...p, scenes: updatedScenes, characters: updatedCharacters }));
                                    }}><PiTrash /></button></td>
                                </SortableRow>
                                );
                            })}
                        </SortableContext>
                    </tbody>
                </table>
                    );
                })()}
            </DndContext>
            {!isEpisodicProject && (
                <datalist id="available-scenes-list">
                    {breakdownScenes.map((scene, idx) => {
                        const sceneNumber = String(scene.scene_number || '').trim();
                        if (!sceneNumber) return null;
                        const episodeNumber = String(scene.episode_number || '').trim();
                        const optionKey = `${sceneNumber}-${episodeNumber || idx}`;
                        const optionLabel = episodeNumber ? `${sceneNumber} (Ep ${episodeNumber})` : sceneNumber;
                        return <option key={optionKey} value={sceneNumber} label={optionLabel} />;
                    })}
                </datalist>
            )}
            <button className="msd-add-button" onClick={() => setFormData(p => ({ ...p, scenes: [...p.scenes, { _id: crypto.randomUUID(), episode_number: '', scene_number: '', _isSelectingSceneNumber: true }] }))}><PiPlus /> Add Scene</button>
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

        const parseRequirementItems = (content) => {
            if (!content) return [];
            return content
                .split(/[\n,]/)
                .map(item => item.trim())
                .filter(item => item);
        };

        const mergeRequirementItems = (existingItems, incomingItems) => {
            const seen = new Set(existingItems.map(item => item.trim().toLowerCase()).filter(Boolean));
            const merged = [...existingItems];

            incomingItems.forEach(item => {
                const normalizedItem = item.trim().toLowerCase();
                if (!normalizedItem || seen.has(normalizedItem)) return;
                seen.add(normalizedItem);
                merged.push(item);
            });

            return merged;
        };

        let newReqs = [...(formData.daily_requirements || [])];

        categoriesToCheck.forEach(cat => {
            const items = new Set();

            // Iterate over current scenes to find breakdown matches
            formData.scenes.forEach(scene => {
                const match = findBreakdownScene(scene.scene_number, scene.episode_number || '');
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
                const incomingItems = Array.from(items);
                const existingIdx = newReqs.findIndex(r => r.category === cat.name);

                if (existingIdx >= 0) {
                    const existingItems = parseRequirementItems(newReqs[existingIdx].content);
                    const mergedItems = mergeRequirementItems(existingItems, incomingItems);
                    newReqs[existingIdx].content = mergedItems.join('\n');
                    newReqs[existingIdx].isAuto = true;
                } else {
                    newReqs.push({
                        id: crypto.randomUUID(),
                        category: cat.name,
                        content: incomingItems.join('\n'),
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
            <div className="msd-section" data-preview-target="requirements" data-preview-focus-mode="debounced">
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
                        const previewKey = buildRequirementPreviewKey(req, idx);
                        const items = parseItems(req.content);
                        return (
                            <div key={req.id || `req-${idx}`} className="msd-req-card" data-preview-target={`requirement-card:${previewKey}`} data-preview-focus-mode="debounced">
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
        <div className="msd-section" data-preview-target="advance-schedule" data-preview-focus-mode="debounced">
            <div className="msd-section-header" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><PiList /> Advance Shooting Schedule (Scenes)</div>
            </div>
            {/* Reusing scene-numbers datalist */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(e, 'advance')}
            >
                {(() => {
                    const showEpisodeColumn = isEpisodicProject || hasEpisodeColumn(formData.advanced_schedule || []);
                    const episodeOptions = getEpisodeOptions();
                    return (
                <table className="msd-table">
                    <thead>
                        <tr>
                            <th style={{ width: '30px' }}></th>
                            {showEpisodeColumn && <th style={{ width: '50px', textAlign: 'center' }}>EP</th>}
                            <th style={{ width: '50px', textAlign: 'center' }}>Scene</th>
                            <th style={{ width: '42%' }}>Sets and Description</th>
                            <th style={{ width: '70px', textAlign: 'center' }}>Cast ID</th>
                            <th style={{ width: '70px', textAlign: 'center' }}>Day/Night</th>
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
                            {(formData.advanced_schedule || []).map((scene, idx) => {
                                const previewKey = buildScenePreviewKey(scene, idx);
                                const isSceneNumberEditable = scene._isSelectingSceneNumber || !scene.scene_number;
                                const { summary, description } = formatSceneSetDescription(scene);
                                const sceneOptions = getSceneOptionsForEpisode(scene.episode_number || '');
                                return (
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
                                    {showEpisodeColumn && (
                                        <td
                                            style={{ textAlign: 'center', verticalAlign: 'middle' }}
                                            data-preview-target={`scene-cell:advance:${previewKey}:episode_number`}
                                        >
                                            {isSceneNumberEditable ? (
                                                <select
                                                    className="msd-td-input-center"
                                                    value={scene.episode_number || ''}
                                                    onChange={e => handleSceneEpisodeSelection('advanced_schedule', idx, e.target.value)}
                                                >
                                                    <option value="">EP</option>
                                                    {episodeOptions.map((episodeNumber) => (
                                                        <option key={episodeNumber} value={episodeNumber}>{episodeNumber}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="msd-td-display msd-td-display-center">{scene.episode_number || '-'}</div>
                                            )}
                                        </td>
                                    )}
                                    <td
                                        data-preview-target={`scene-cell:advance:${previewKey}:scene_number`}
                                        style={{ textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle', whiteSpace: 'nowrap' }}
                                    >
                                        {isSceneNumberEditable && showEpisodeColumn ? (
                                            <select
                                                className="msd-td-input-center"
                                                value={scene.scene_number || ''}
                                                onChange={e => handleManualSceneSelection('advanced_schedule', idx, e.target.value, { finalize: true })}
                                                disabled={!String(scene.episode_number || '').trim()}
                                            >
                                                <option value="">{String(scene.episode_number || '').trim() ? 'Select Scene' : 'Select EP first'}</option>
                                                {sceneOptions.map((sceneNumber) => (
                                                    <option key={`${scene.episode_number || 'ep'}-${sceneNumber}`} value={sceneNumber}>{sceneNumber}</option>
                                                ))}
                                            </select>
                                        ) : isSceneNumberEditable ? (
                                            <input
                                                type="text"
                                                list="available-scenes-list"
                                                className="msd-td-input-center"
                                                value={scene.scene_number || ''}
                                                placeholder="Scene"
                                                onChange={e => handleManualSceneSelection('advanced_schedule', idx, e.target.value)}
                                                onBlur={e => handleManualSceneSelection('advanced_schedule', idx, e.target.value, { finalize: true })}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        e.currentTarget.blur();
                                                    }
                                                }}
                                            />
                                        ) : (
                                            scene.scene_number || '-'
                                        )}
                                    </td>
                                    <td className="msd-scene-setdesc-cell">
                                        <div
                                            className="msd-scene-setdesc-summary"
                                            data-preview-target={`scene-cell:advance:${previewKey}:location`}
                                        >
                                            {summary || '-'}
                                        </div>
                                        <div
                                            className="msd-scene-setdesc-description"
                                            data-preview-target={`scene-cell:advance:${previewKey}:description`}
                                        >
                                            {description || '-'}
                                        </div>
                                    </td>
                                    <td
                                        className="msd-td-display msd-td-display-center"
                                        data-preview-target={`scene-cell:advance:${previewKey}:cast_ids`}
                                    >
                                        {scene.cast_ids ? scene.cast_ids.split(',').map(s => s.trim()).filter(Boolean).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0)).join(', ') : '-'}
                                    </td>
                                    <td
                                        className="msd-td-display msd-td-display-center"
                                        data-preview-target={`scene-cell:advance:${previewKey}:day_night`}
                                    >
                                        {scene.day_night || '-'}
                                    </td>
                                    <td
                                        className="msd-td-display msd-td-display-center"
                                        data-preview-target={`scene-cell:advance:${previewKey}:pages`}
                                    >
                                        {scene.pages || '-'}
                                    </td>
                                    <td data-preview-target={`scene-cell:advance:${previewKey}:remarks`}><textarea className="msd-td-textarea" value={scene.remarks || ''} onChange={e => { const newAdv = [...(formData.advanced_schedule || [])]; newAdv[idx].remarks = e.target.value; setFormData({ ...formData, advanced_schedule: newAdv }); }} /></td>
                                    <td style={{ textAlign: 'center' }}><button onClick={() => {
                                        const removedScene = formData.advanced_schedule[idx];
                                        const updatedAdvance = formData.advanced_schedule.filter((_, i) => i !== idx);
                                        const updatedScenes = formData.scenes || [];
                                        const updatedCharacters = pruneCharactersAfterRemoval(removedScene.cast_ids, updatedScenes, updatedAdvance, formData.characters);
                                        setFormData(p => ({ ...p, advanced_schedule: updatedAdvance, characters: updatedCharacters }));
                                    }}><PiTrash /></button></td>
                                </SortableRow>
                                );
                            })}
                        </SortableContext>
                    </tbody>
                </table>
                    );
                })()}
            </DndContext>
            <button className="msd-add-button" onClick={() => setFormData(p => ({ ...p, advanced_schedule: [...(p.advanced_schedule || []), { _id: crypto.randomUUID(), episode_number: '', scene_number: '', _isSelectingSceneNumber: true }] }))}><PiPlus /> Add Advance Scene</button>
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
            <div className="msd-section" data-preview-target="cast" data-preview-focus-mode="debounced">
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

                                const previewKey = buildCharacterPreviewKey(char, getCastId(char.character_name));

                                return (
                                    <tr key={originalIdx}>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{getCastId(char.character_name)}</td>
                                        <td data-preview-target={`cast-cell:${previewKey}:character_name`}><input type="text" list="available-characters-list" className="msd-td-input" value={char.character_name || ''} placeholder="Character" onChange={e => {
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
                                        <td style={{ position: 'relative' }} data-preview-target={`cast-cell:${previewKey}:cast_name`}>
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
                                        <td data-preview-target={`cast-cell:${previewKey}:pickup`}><TimePicker className="tp-compact msd-cast-timepicker" value={char.pickup || ''} onChange={v => { const newData = [...formData.characters]; newData[originalIdx].pickup = v; setFormData({ ...formData, characters: newData }); }} /></td>
                                        <td data-preview-target={`cast-cell:${previewKey}:on_location`}><TimePicker className="tp-compact msd-cast-timepicker" value={char.on_location || ''} onChange={v => { const newData = [...formData.characters]; newData[originalIdx].on_location = v; setFormData({ ...formData, characters: newData }); }} /></td>
                                        <td data-preview-target={`cast-cell:${previewKey}:hmu`}>
                                            <TimePicker
                                                className="tp-compact msd-cast-timepicker"
                                                value={char.hmu || ''}
                                                onChange={v => {
                                                    const newData = [...formData.characters];
                                                    newData[originalIdx].hmu = v;
                                                    newData[originalIdx].wardrobe = v;
                                                    setFormData({ ...formData, characters: newData });
                                                }}
                                            />
                                        </td>
                                        <td data-preview-target={`cast-cell:${previewKey}:on_set`}><TimePicker className="tp-compact msd-cast-timepicker" value={char.on_set || ''} onChange={v => { const newData = [...formData.characters]; newData[originalIdx].on_set = v; setFormData({ ...formData, characters: newData }); }} /></td>
                                        <td data-preview-target={`cast-cell:${previewKey}:remarks`}><input type="text" className="msd-td-input" value={char.remarks || ''} onChange={e => { const newData = [...formData.characters]; newData[originalIdx].remarks = e.target.value; setFormData({ ...formData, characters: newData }); }} /></td>
                                        <td><button onClick={() => handleRemoveCharacter(originalIdx)}><PiTrash /></button></td>
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
        { value: 'crew_call', label: 'Crew Call' },
        { value: 'on_call', label: 'On Call' },
        { value: 'na', label: 'N/A' },
        { value: 'as_per_hod', label: 'As per HOD' },
        { value: 'custom', label: 'Custom' },
    ];

    const renderCrewCalls = () => {
        const formatTimeDisplay = (val) => {
            if (!val || !val.includes(':')) return '';
            const [hStr, mStr] = val.split(':');
            let h = parseInt(hStr, 10);
            const m = parseInt(mStr, 10) || 0;
            if (Number.isNaN(h)) return val;
            const ap = h >= 12 ? 'PM' : 'AM';
            h = h % 12;
            if (h === 0) h = 12;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`;
        };

        const getLegacyCrewKey = (crew) => {
            const rawCrewId = crew?.id;
            if (rawCrewId === undefined || rawCrewId === null) return null;
            const trimmed = String(rawCrewId).trim();
            return trimmed ? trimmed : null;
        };

        const getCrewEntry = (crewKey, legacyCrewKey = null) => {
            const currentEntry = formData.crew_calls?.[crewKey];
            if (currentEntry !== undefined) return currentEntry;
            if (legacyCrewKey && legacyCrewKey !== crewKey) {
                return formData.crew_calls?.[legacyCrewKey];
            }
            return undefined;
        };

        // Helper to safely get time string
        const getCrewTime = (crewKey, legacyCrewKey = null) => {
            const val = getCrewEntry(crewKey, legacyCrewKey);
            if (!val) return '';
            return typeof val === 'object' ? (val.time || '') : val;
        };

        // Helper to get call mode (default to 'crew_call' for empty, but 'custom' for legacy plain-string values)
        const getCrewMode = (crewKey, legacyCrewKey = null) => {
            const val = getCrewEntry(crewKey, legacyCrewKey);
            if (!val) return 'crew_call';
            return typeof val === 'object' ? (val.mode || 'crew_call') : 'custom';
        };

        // Helper to check if crew member is marked as key
        const isKey = (crewKey, legacyCrewKey = null) => {
            const val = getCrewEntry(crewKey, legacyCrewKey);
            return typeof val === 'object' && val.is_key === true;
        };

        const visibleCrew = (crewList?.departments || []).flatMap((dept) =>
            (dept.crew_members || dept.crew || []).map((crew, crewIdx) => ({
                crewKey: buildCrewStateKey(crew, dept.id, crewIdx),
                legacyCrewKey: getLegacyCrewKey(crew),
            }))
        );

        const selectedCount = visibleCrew.filter(({ crewKey, legacyCrewKey }) => isKey(crewKey, legacyCrewKey)).length;

        const applyDeptCallTime = (dept, setting) => {
            const nextMode = setting?.mode || 'crew_call';
            const nextTime = nextMode === 'custom' ? (setting?.time || '') : '';

            setFormData(p => {
                const crewEntries = { ...(p.crew_calls || {}) };
                (dept.crew_members || dept.crew || []).forEach((crew, crewIdx) => {
                    const crewKey = buildCrewStateKey(crew, dept.id, crewIdx);
                    const legacyCrewKey = getLegacyCrewKey(crew);
                    const existing = crewEntries[crewKey] ?? (legacyCrewKey && legacyCrewKey !== crewKey ? crewEntries[legacyCrewKey] : undefined);
                    const isKey = typeof existing === 'object' && existing.is_key === true;
                    crewEntries[crewKey] = { mode: nextMode, time: nextTime, ...(isKey ? { is_key: true } : {}) };
                    if (legacyCrewKey && legacyCrewKey !== crewKey) {
                        delete crewEntries[legacyCrewKey];
                    }
                });
                return { ...p, crew_calls: crewEntries };
            });
        };

        const handleDeptBulkToggle = (dept, enabled) => {
            setDeptBulkSettings(prevAll => {
                const prev = prevAll[dept.id];
                let nextSetting = prev ? { ...prev, enabled } : { enabled, mode: 'crew_call', time: '' };

                if (enabled) {
                    const crewListForDept = dept.crew_members || dept.crew || [];
                    if (!prev && crewListForDept.length > 0) {
                        const firstCrew = crewListForDept[0];
                        const firstCrewKey = buildCrewStateKey(firstCrew, dept.id, 0);
                        const firstLegacyCrewKey = getLegacyCrewKey(firstCrew);
                        const mode = getCrewMode(firstCrewKey, firstLegacyCrewKey);
                        const time = mode === 'custom' ? getCrewTime(firstCrewKey, firstLegacyCrewKey) : '';
                        nextSetting = { ...nextSetting, mode, time };
                    }
                    applyDeptCallTime(dept, nextSetting);
                }

                const nextAll = { ...prevAll, [dept.id]: nextSetting };
                setFormData(p => ({ ...p, crew_call_bulk: nextAll }));
                return nextAll;
            });
        };

        const updateDeptBulkSetting = (dept, patch) => {
            setDeptBulkSettings(prevAll => {
                const prev = prevAll[dept.id] || { enabled: false, mode: 'crew_call', time: '' };
                const nextSetting = { ...prev, ...patch };
                const nextAll = { ...prevAll, [dept.id]: nextSetting };
                if (nextSetting.enabled) {
                    applyDeptCallTime(dept, nextSetting);
                }
                setFormData(p => ({ ...p, crew_call_bulk: nextAll }));
                return nextAll;
            });
        };

        const getModeLabel = (modeValue) => {
            const match = CALL_MODES.find(m => m.value === modeValue);
            return match ? match.label : 'Crew Call';
        };

        return (
            <div className="msd-section" data-preview-target="crew-page" data-preview-focus-mode="debounced">
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
                                <div className="msd-dept-header">
                                    <h4 className="msd-dept-name">{dept.name}</h4>
                                </div>
                                <div className="msd-dept-bulk-row">
                                    <div className="msd-dept-bulk-inline">
                                        <label className="msd-dept-bulk-label">
                                            <input
                                                type="checkbox"
                                                checked={!!deptBulkSettings[dept.id]?.enabled}
                                                onChange={e => handleDeptBulkToggle(dept, e.target.checked)}
                                            />
                                            Same for all
                                        </label>
                                        <div className="msd-dept-bulk-stack">
                                            <select
                                                className="msd-calltime-select"
                                                value={(deptBulkSettings[dept.id]?.mode) || 'crew_call'}
                                                onChange={e => updateDeptBulkSetting(dept, { mode: e.target.value })}
                                                title="Applies to all crew in this department"
                                            >
                                                {CALL_MODES.map(m => (
                                                    <option key={m.value} value={m.value}>{m.label}</option>
                                                ))}
                                            </select>
                                            {(deptBulkSettings[dept.id]?.mode || 'crew_call') === 'custom' && (
                                                <TimePicker
                                                    className="tp-compact"
                                                    value={deptBulkSettings[dept.id]?.time || ''}
                                                    onChange={v => updateDeptBulkSetting(dept, { mode: 'custom', time: v })}
                                                    title="Applies to all crew in this department"
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <table className="msd-mini-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '32%' }}>Role</th>
                                            <th>Name</th>
                                            <th style={{ width: '140px', textAlign: 'center' }}>Call Time</th>
                                            <th style={{ width: '34px', textAlign: 'center' }}>Key</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(dept.crew_members || dept.crew || []).map((crew, crewIdx) => {
                                            const crewKey = buildCrewStateKey(crew, dept.id, crewIdx);
                                            const legacyCrewKey = getLegacyCrewKey(crew);
                                            const time = getCrewTime(crewKey, legacyCrewKey);
                                            const mode = getCrewMode(crewKey, legacyCrewKey);
                                            const keySelected = isKey(crewKey, legacyCrewKey);
                                            const deptBulkEnabled = !!deptBulkSettings[dept.id]?.enabled;

                                            const updateCrewCall = (newMode, newTime) => {
                                                const entry = { mode: newMode, time: newTime, ...(keySelected ? { is_key: true } : {}) };
                                                setFormData(p => ({
                                                    ...p,
                                                    crew_calls: (() => {
                                                        const nextCrewCalls = { ...(p.crew_calls || {}), [crewKey]: entry };
                                                        if (legacyCrewKey && legacyCrewKey !== crewKey) {
                                                            delete nextCrewCalls[legacyCrewKey];
                                                        }
                                                        return nextCrewCalls;
                                                    })()
                                                }));
                                            };

                                            const setKeySelection = (isChecked) => {
                                                if (isChecked && !keySelected && selectedCount >= 13) {
                                                    alert("You can only select up to 13 Key Crew members for the preview.");
                                                    return;
                                                }

                                                const entry = { mode, time, ...(isChecked ? { is_key: true } : {}) };
                                                setFormData(p => ({
                                                    ...p,
                                                    crew_calls: (() => {
                                                        const nextCrewCalls = { ...(p.crew_calls || {}), [crewKey]: entry };
                                                        if (legacyCrewKey && legacyCrewKey !== crewKey) {
                                                            delete nextCrewCalls[legacyCrewKey];
                                                        }
                                                        return nextCrewCalls;
                                                    })()
                                                }));
                                                previewIntentRef.current = {
                                                    target: 'key-crew-box',
                                                    mode: 'instant',
                                                    source: 'key-crew-box',
                                                };
                                            };

                                            return (
                                                <tr key={crewKey}>
                                                    <td className="msd-role-col">{crew.role}</td>
                                                    <td>{crew.name}</td>
                                                    <td style={{ width: '140px' }} data-preview-target={`crew-call:${crewKey}`}>
                                                        {deptBulkEnabled ? (
                                                            <div className="msd-calltime-locked">
                                                                {(deptBulkSettings[dept.id]?.mode || 'crew_call') === 'custom'
                                                                    ? (deptBulkSettings[dept.id]?.time ? formatTimeDisplay(deptBulkSettings[dept.id]?.time) : '--:--')
                                                                    : getModeLabel(deptBulkSettings[dept.id]?.mode || 'crew_call')}
                                                            </div>
                                                        ) : (
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
                                                        )}
                                                    </td>
                                                    <td style={{ width: '34px', textAlign: 'center' }} data-preview-target="key-crew-box">
                                                        <input
                                                            type="checkbox"
                                                            checked={keySelected}
                                                            readOnly
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                setKeySelection(!keySelected);
                                                            }}
                                                            onKeyDown={e => {
                                                                if (e.key === ' ' || e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setKeySelection(!keySelected);
                                                                }
                                                            }}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                <div style={{ marginTop: 10 }}>
                                    <label className="msd-label" data-preview-target={`crew-note:${dept.id}`} data-preview-focus-mode="debounced">Department Notes:
                                        <textarea
                                            className="msd-textarea"
                                            style={{ minHeight: '60px', marginTop: '5px' }}
                                            value={formData.department_notes[dept.id] || ''}
                                            onChange={e => setFormData(p => ({
                                                ...p,
                                                department_notes: { ...p.department_notes, [dept.id]: e.target.value }
                                            }))}
                                            placeholder={`Department notes for ${dept.name}`}
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
    const uploadLogoBlob = async (blob, slot = 'logo') => {
        const formData = new FormData();
        formData.append('file', new File([blob], `${slot}.png`, { type: 'image/png' }));
        const token = getToken();
        const endpoint = slot === 'logo2' ? 'logo2' : 'logo';

        try {
            const res = await fetch(getApiUrl(`/api/projects/${id}/${endpoint}`), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
                credentials: 'include'
            });
            if (res.ok) {
                if (slot === 'logo2') {
                    setProjectLogo2Ts(Date.now());
                    alert("Logo 2 uploaded successfully!");
                } else {
                    setProjectLogoTs(Date.now());
                    alert("Logo 1 uploaded successfully!");
                }
            } else {
                const errorText = await res.text();
                throw new Error(errorText || "Failed to upload");
            }
        } catch (err) {
            console.error(err);
            alert(slot === 'logo2' ? "Error uploading logo 2" : "Error uploading logo");
        }
    };

    const handleLogoFileSelect = (event, slot = 'logo') => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        setLogoEditorState({
            isOpen: true,
            file,
            slot
        });
    };

    const closeLogoEditor = () => {
        setLogoEditorState({ isOpen: false, file: null, slot: 'logo' });
    };

    const handleConfirmLogoEdit = async (blob) => {
        await uploadLogoBlob(blob, logoEditorState.slot);
        closeLogoEditor();
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

    const handleCreateDateChange = (date) => {
        setCreateData(prev => ({ ...prev, date }));
        checkScheduleDate(date);
    };

    const confirmCreateDay = async () => {
        setIsLoading(true);
        try {
            // 1. Create the Day
            const res = await fetch(getApiUrl(`/api/projects/${id}/shoot-days`), {
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
                const foundScenes = await getScheduledScenesForDate(createData.date);

                if (foundScenes.length > 0) {
                    const { scenes: updatedScenes, characters: updatedCharacters } = mergeImportedScenesIntoDay([], [], foundScenes);

                    // Update the new day object
                    newDay.scenes = updatedScenes;
                    newDay.characters = updatedCharacters;

                    // Save immediately
                    await fetch(getApiUrl(`/api/shoot-days/${newDay.id}?project_id=${id}`), {
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

    const handleDeleteDay = useCallback(async (e, dayId) => {
        e.stopPropagation(); // Prevent selecting the day
        if (!window.confirm("Are you sure you want to delete this shoot day? This cannot be undone.")) return;

        try {
            const res = await fetch(getApiUrl(`/api/shoot-days/${dayId}?project_id=${id}`), { method: 'DELETE' });
            if (res.ok) {
                clearPendingAutoSave();
                setShootDays(prev => prev.filter(d => d.id !== dayId));
                if (selectedDayId === dayId) {
                    resetAddressAutocomplete();
                    setSelectedDayId(null);
                    setHasUnsavedChanges(false);
                    setSaveError('');
                    setLastSavedAt(null);
                    // Reset necessary form data if needed
                }
            } else {
                alert("Failed to delete shoot day");
            }
        } catch (err) {
            console.error(err);
            alert("Error deleting shoot day");
        }
    }, [clearPendingAutoSave, id, resetAddressAutocomplete, selectedDayId]);

    // --- Dashboard Render Logic ---
    const handleBackToDashboard = () => {
        clearPendingAutoSave();
        resetAddressAutocomplete();
        navigate(`/${user}/${id}/call-sheets`);
    };

    const saveStatusText = useMemo(() => {
        if (saveError) return saveError;
        if (isSaving || isAutoSaving) return 'Saving...';
        if (hasUnsavedChanges) return 'Unsaved changes';
        if (lastSavedAt) return 'Saved';
        return '';
    }, [hasUnsavedChanges, isAutoSaving, isSaving, lastSavedAt, saveError]);

    const saveStatusClassName = useMemo(() => {
        if (saveError) return 'msd-save-status is-error';
        if (isSaving || isAutoSaving) return 'msd-save-status is-saving';
        if (lastSavedAt) return 'msd-save-status is-saved';
        return 'msd-save-status';
    }, [isAutoSaving, isSaving, lastSavedAt, saveError]);

    const isResolvingRequestedDay = Boolean(dayId) && (
        isLoading ||
        selectedDayId === null ||
        String(selectedDayId) !== String(dayId)
    );

    const renderDashboard = () => (
        <div className="msd-dashboard-container">
            {/* Header */}
            <div className="msd-dashboard-header">
                <h1 className="msd-dashboard-title">Call Sheets</h1>
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
                                        onLoad={(e) => { e.target.style.display = 'block'; }}
                                        onError={(e) => e.target.style.display = 'none'}
                                    />
                                </div>
                                <label className="msd-upload-btn msd-upload-btn-small">
                                    + Edit & Upload Logo 1
                                    <input type="file" style={{ display: 'none' }} onChange={(event) => handleLogoFileSelect(event, 'logo')} accept="image/*" />
                                </label>
                            </div>
                            <div className="msd-logo-slot">
                                <div className="msd-logo-slot-label">Logo 2</div>
                                <div className="msd-logo-preview-container">
                                    <img
                                        src={`/api/projects/${id}/logo2?t=${projectLogo2Ts}`}
                                        alt="Production Logo 2"
                                        className="msd-logo-preview"
                                        onLoad={(e) => { e.target.style.display = 'block'; }}
                                        onError={(e) => e.target.style.display = 'none'}
                                    />
                                </div>
                                <label className="msd-upload-btn msd-upload-btn-small">
                                    + Edit & Upload Logo 2
                                    <input type="file" style={{ display: 'none' }} onChange={(event) => handleLogoFileSelect(event, 'logo2')} accept="image/*" />
                                </label>
                            </div>
                        </div>
                        <div className="msd-logo-guidance">
                            Upload any logo shape, then crop and fit it into a fixed frame before saving. Final output is normalized for the call sheet.
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
                                <div className="msd-card-date">
                                    {day.date
                                        ? new Date(day.date).toLocaleDateString("en-GB", {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                        })
                                        : "No Date"}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className={`msd-page-container ${viewMode === 'editor' ? 'msd-editor-active' : ''}`}>
            {/* <ProjectHeader /> */}
            {viewMode === 'dashboard' ? renderDashboard() : (
                <div className="msd-main-container">
                    {/* Editor View - No Sidebar */}
                    <div className="msd-form-container msd-editor-form-container">
                        {/* Editor Header / Nav */}
                        <div className="msd-editor-nav">
                            <div className="msd-editor-nav-left">
                                <button onClick={handleBackToDashboard} className="msd-back-btn" title="Back to Call Sheets">
                                    <PiArrowLeft size={18} /> Back
                                </button>
                                <div className="msd-nav-divider"></div>
                                <h2 className="msd-editor-title">
                                    {isResolvingRequestedDay ? 'Loading Call Sheet...' : `Call Sheet - Day ${formData.day_number || '?'}`}
                                </h2>
                            </div>
                            <div className="msd-editor-actions">
                                <div className={saveStatusClassName} aria-live="polite">
                                    <span className="msd-save-status-icon" aria-hidden="true">
                                        {(isSaving || isAutoSaving) ? '' : saveError ? '!' : lastSavedAt ? '✓' : ''}
                                    </span>
                                    <span>{saveStatusText || ' '}</span>
                                </div>
                                <button
                                    className={`msd-preview-toggle-btn ${showPreview ? 'active' : ''}`}
                                    onClick={handleSaveAndPreview}
                                >
                                    <PiEye /> Preview and Export
                                </button>
                            </div>
                        </div>

                        {/* Editor Content Area */}
                        <div className="msd-editor-content">
                            {isResolvingRequestedDay ? (
                                <div className="msd-empty-state">
                                    <p>Loading call sheet...</p>
                                </div>
                            ) : selectedDayId ? (
                                <div className="msd-split-view-container">

                                    {/* Left Column - Editor Form */}
                                    <div
                                        className="msd-left-column"
                                        onFocusCapture={capturePreviewIntent}
                                        onChangeCapture={capturePreviewIntent}
                                        onClickCapture={capturePreviewIntent}
                                    >
                                        {renderGeneralInfo()}
                                        {renderLocation()}
                                        {renderMeals()}
                                        {renderGeneralInstructionsSection()}
                                        {renderAttentionSection()}
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
                                        {renderRequirementsSection()}
                                        {renderCrewCalls()}
                                        {renderUsefulContactsSection()}
                                        {renderSafetyHotlineSection()}
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
                                                    <CallSheetPreview
                                                        data={formData}
                                                        project={project}
                                                        logoTs={projectLogoTs}
                                                        logo2Ts={projectLogo2Ts}
                                                        crewList={crewList}
                                                        showActions={false}
                                                        activePreviewTarget={previewFocus.target}
                                                        previewPulseKey={previewFocus.pulseKey}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                </div>
                            ) : (
                                <div className="msd-empty-state">
                                    <p>Select or create a shoot day to start editing this call sheet.</p>
                                    <button onClick={handleBackToDashboard}>Back to Call Sheets</button>
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
                        <h3>Create New Call Sheet Day</h3>
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
                                    value={createData.date || ''}
                                    onChange={e => handleCreateDateChange(e.target.value)}
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

            <LogoEditorModal
                isOpen={logoEditorState.isOpen}
                file={logoEditorState.file}
                slotLabel={logoEditorState.slot === 'logo2' ? 'Logo 2' : 'Logo 1'}
                onCancel={closeLogoEditor}
                onConfirm={handleConfirmLogoEdit}
            />
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
