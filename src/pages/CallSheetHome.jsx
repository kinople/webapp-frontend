import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PiPlus, PiTrash, PiUsersThree } from 'react-icons/pi';
import LogoEditorModal from '../components/LogoEditorModal';
import '../css/ManageShootDays.css';
import { fetchWithAuth, getApiUrl } from '../utils/api';
import { getToken } from '../utils/auth';
import EmptyState from '../components/EmptyState';

const CallSheetHome = () => {
    const navigate = useNavigate();
    const { user, id } = useParams();

    const [shootDays, setShootDays] = useState([]);
    const [projectLogoTs, setProjectLogoTs] = useState(Date.now());
    const [projectLogo2Ts, setProjectLogo2Ts] = useState(Date.now());
    const [logoEditorState, setLogoEditorState] = useState({ isOpen: false, file: null, slot: 'logo' });
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createData, setCreateData] = useState({ date: '', day_number: '', importFromSchedule: false });
    const [scheduleHasDate, setScheduleHasDate] = useState(false);
    const [createWarning, setCreateWarning] = useState('');
    const [schedules, setSchedules] = useState([]);
    const [castList, setCastList] = useState([]);
    const [breakdownScenes, setBreakdownScenes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const addCharactersForScene = useCallback((sceneNumber, currentCharacters, episodeNumber = '', sceneId = '') => {
        const normalizedSceneId = String(sceneId || '').trim();
        const normalizedSceneNumber = String(sceneNumber || '').trim();
        const normalizedEpisodeNumber = String(episodeNumber || '').trim();

        const scene = breakdownScenes.find((item) => {
            const itemId = String(item?.id || '').trim();
            const itemSceneNumber = String(item?.scene_number || '').trim();
            const itemEpisodeNumber = String(item?.episode_number || '').trim();

            if (normalizedSceneId && itemId === normalizedSceneId) return true;
            if (!normalizedSceneNumber) return false;

            if (normalizedEpisodeNumber) {
                return itemSceneNumber === normalizedSceneNumber && itemEpisodeNumber === normalizedEpisodeNumber;
            }

            return itemSceneNumber === normalizedSceneNumber;
        });
        if (!scene?.characters) return currentCharacters;

        const nextCharacters = [...currentCharacters];
        const charArray = Array.isArray(scene.characters) ? scene.characters : String(scene.characters).split(',');

        charArray.forEach((charName) => {
            if (!charName) return;
            const cleanName = String(charName).trim();
            const exists = nextCharacters.some(
                (character) => character.character_name && String(character.character_name).trim().toLowerCase() === cleanName.toLowerCase()
            );
            if (exists) return;

            const castMember = castList.find(
                (member) => member.character && String(member.character).trim().toLowerCase() === cleanName.toLowerCase()
            );

            nextCharacters.push({
                character_name: cleanName,
                cast_name: castMember ? (castMember.actor || castMember.cast_options?.['1']?.actor_name || '') : '',
                character_id: castMember ? castMember.cast_id : null,
                pickup: '',
                on_location: '',
                hmu: '',
                wardrobe: '',
                on_set: '',
                remarks: ''
            });
        });

        nextCharacters.sort((a, b) => (parseInt(a.character_id, 10) || 9999) - (parseInt(b.character_id, 10) || 9999));
        return nextCharacters;
    }, [breakdownScenes, castList]);

    const findBreakdownScene = useCallback((sceneNumber, episodeNumber = '', sceneId = '') => {
        const sceneIdValue = String(sceneId || '').trim();
        const sceneNum = String(sceneNumber || '').trim();
        const epNum = String(episodeNumber || '').trim();
        if (!sceneNum && !sceneIdValue) return null;

        if (sceneIdValue) {
            const byId = breakdownScenes.find((scene) => String(scene.id || '').trim() === sceneIdValue);
            if (byId) return byId;
        }

        if (!sceneNum) return null;

        const exact = breakdownScenes.find((scene) => {
            const currentSceneNumber = String(scene.scene_number || '').trim();
            const currentEpisodeNumber = String(scene.episode_number || '').trim();
            return currentSceneNumber === sceneNum && epNum && currentEpisodeNumber === epNum;
        });
        if (exact) return exact;

        return breakdownScenes.find((scene) => String(scene.scene_number || '').trim() === sceneNum) || null;
    }, [breakdownScenes]);

    const computeRequirementsFromScenes = useCallback((scenesToProcess, existingReqs = []) => {
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
                .filter(Boolean);
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

        const newReqs = [...(existingReqs || [])];

        categoriesToCheck.forEach(cat => {
            const items = new Set();

            (scenesToProcess || []).forEach(scene => {
                const match = findBreakdownScene(scene.scene_number, scene.episode_number || '');
                if (!match) return;

                cat.keys.forEach(key => {
                    const val = match[key];
                    if (!val) return;

                    if (typeof val === 'string') {
                        val.split(',').forEach(v => {
                            const clean = v.trim();
                            if (clean) items.add(clean);
                        });
                        return;
                    }

                    if (Array.isArray(val)) {
                        val.forEach(v => {
                            if (typeof v === 'string' && v.trim()) items.add(v.trim());
                        });
                    }
                });
            });

            if (items.size === 0) return;

            const incomingItems = Array.from(items);
            const existingIdx = newReqs.findIndex(r => r.category === cat.name);

            if (existingIdx >= 0) {
                const existingItems = parseRequirementItems(newReqs[existingIdx].content);
                const mergedItems = mergeRequirementItems(existingItems, incomingItems);
                newReqs[existingIdx].content = mergedItems.join('\n');
                newReqs[existingIdx].isAuto = true;
                return;
            }

            newReqs.push({
                id: crypto.randomUUID(),
                category: cat.name,
                content: incomingItems.join('\n'),
                isAuto: true
            });
        });

        return newReqs;
    }, [findBreakdownScene]);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const pDays = fetchWithAuth(getApiUrl(`/api/projects/${id}/shoot-days`)).then(async (res) => {
                if (!res.ok) throw new Error('Failed to fetch shoot days');
                return res.json();
            });

            const pSched = fetch(getApiUrl(`/api/${id}/schedules`)).then(async (res) => {
                if (!res.ok) return [];
                const schedData = await res.json();
                return schedData.schedules || [];
            }).catch(() => []);

            const pCast = fetch(getApiUrl(`/api/${id}/cast-list`)).then(async (res) => {
                if (!res.ok) return [];
                const castData = await res.json();
                return castData.cast_list || [];
            }).catch(() => []);

            const pScripts = fetch(getApiUrl(`/api/${id}/script-list`)).then(async (res) => {
                if (!res.ok) return [];
                const scripts = await res.json();
                if (scripts.length === 0) return [];
                const bdRes = await fetch(getApiUrl(`/api/fetch-breakdown?project_id=${id}`));
                if (!bdRes.ok) return [];
                const bdData = await bdRes.json();
                return bdData.scene_breakdowns || [];
            }).catch(() => []);

            const [days, nextSchedules, nextCast, nextBreakdownScenes] = await Promise.all([pDays, pSched, pCast, pScripts]);
            setShootDays(days);
            setSchedules(nextSchedules);
            setCastList(nextCast);
            setBreakdownScenes(nextBreakdownScenes);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const checkDateInSchedule = useCallback(async (dateToCheck) => {
        if (!dateToCheck) return false;
        for (const sched of schedules) {
            try {
                const res = await fetch(getApiUrl(`/api/${id}/schedule/${sched.id}`));
                if (!res.ok) continue;
                const fullSched = await res.json();
                const scheduleByDay = fullSched.schedule?.schedule_by_day;
                if (scheduleByDay && Object.values(scheduleByDay).some((day) => day.date === dateToCheck)) {
                    return true;
                }
            } catch (err) {
                console.error(err);
            }
        }
        return false;
    }, [id, schedules]);

    const checkScheduleDate = useCallback(async (date) => {
        const has = await checkDateInSchedule(date);
        setScheduleHasDate(has);
        if (!has && date) {
            setCreateWarning('No schedule found for this date.');
            setCreateData((prev) => ({ ...prev, importFromSchedule: false }));
        } else {
            setCreateWarning('');
        }
    }, [checkDateInSchedule]);

    const handleCreateDateChange = useCallback((date) => {
        setCreateData((prev) => ({ ...prev, date }));
        checkScheduleDate(date);
    }, [checkScheduleDate]);

    const handleCreateDayClick = useCallback(() => {
        setCreateData({
            date: '',
            day_number: shootDays.length + 1,
            importFromSchedule: false
        });
        setScheduleHasDate(false);
        setCreateWarning('');
        setShowCreateModal(true);
    }, [shootDays.length]);

    const uploadLogoBlob = useCallback(async (blob, slot = 'logo') => {
        const formData = new FormData();
        formData.append('file', new File([blob], `${slot}.png`, { type: 'image/png' }));

        const token = getToken();
        const endpoint = slot === 'logo2' ? 'logo2' : 'logo';

        try {
            const res = await fetch(getApiUrl(`/api/projects/${id}/${endpoint}`), {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData,
                credentials: 'include'
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || 'Failed to upload');
            }

            if (slot === 'logo2') {
                setProjectLogo2Ts(Date.now());
            } else {
                setProjectLogoTs(Date.now());
            }
        } catch (err) {
            console.error(err);
            alert(slot === 'logo2' ? 'Error uploading logo 2' : 'Error uploading logo');
        }
    }, [id]);

    const handleLogoFileSelect = useCallback((event, slot = 'logo') => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        setLogoEditorState({
            isOpen: true,
            file,
            slot
        });
    }, []);

    const closeLogoEditor = useCallback(() => {
        setLogoEditorState({ isOpen: false, file: null, slot: 'logo' });
    }, []);

    const handleConfirmLogoEdit = useCallback(async (blob) => {
        await uploadLogoBlob(blob, logoEditorState.slot);
        closeLogoEditor();
    }, [closeLogoEditor, logoEditorState.slot, uploadLogoBlob]);

    const confirmCreateDay = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(getApiUrl(`/api/projects/${id}/shoot-days`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    day_number: parseInt(createData.day_number, 10),
                    project_id: id,
                    date: createData.date
                })
            });

            if (!res.ok) throw new Error('Failed to create shoot day');

            const newDay = await res.json();

            if (createData.importFromSchedule && scheduleHasDate) {
                let foundScenes = [];

                for (const sched of schedules) {
                    const resSched = await fetch(getApiUrl(`/api/${id}/schedule/${sched.id}`));
                    if (!resSched.ok) continue;
                    const fullSched = await resSched.json();
                    const scheduleByDay = fullSched.schedule?.schedule_by_day;
                    if (!scheduleByDay) continue;

                    Object.values(scheduleByDay).forEach((daySched) => {
                        if (daySched.date === createData.date) {
                            foundScenes = daySched.scenes || [];
                        }
                    });

                    if (foundScenes.length > 0) break;
                }

                if (foundScenes.length > 0) {
                    let updatedScenes = [];
                    let updatedCharacters = [];

                    foundScenes.forEach((schedScene) => {
                        const scheduleSceneId = String(schedScene?.scene_id || '').trim();
                        const scheduleSceneNumber = String(schedScene?.scene_number || '').trim();
                        const scheduleEpisode = String(schedScene?.episode_number || '').trim();

                        const breakdown = findBreakdownScene(scheduleSceneNumber, scheduleEpisode, scheduleSceneId);
                        const resolvedSceneNumber = String(
                            breakdown?.scene_number || scheduleSceneNumber || scheduleSceneId
                        ).trim();
                        const resolvedEpisodeNumber = scheduleEpisode || String(breakdown?.episode_number || '').trim();

                        const exists = updatedScenes.some((scene) => {
                            const currentNumber = String(scene?.scene_number || '').trim();
                            const currentEpisode = String(scene?.episode_number || '').trim();
                            if (resolvedEpisodeNumber) {
                                return currentNumber === resolvedSceneNumber && currentEpisode === resolvedEpisodeNumber;
                            }
                            return currentNumber === resolvedSceneNumber;
                        });
                        if (exists) return;

                        let castIdsStr = '';

                        if (breakdown?.characters) {
                            const charArray = Array.isArray(breakdown.characters) ? breakdown.characters : String(breakdown.characters).split(',');
                            const mappedIds = charArray.map((name) => {
                                if (!name) return '';
                                const cleanName = String(name).trim().toLowerCase();
                                const found = castList.find(
                                    (member) => member.character && String(member.character).trim().toLowerCase() === cleanName
                                );
                                return found && found.cast_id ? found.cast_id : String(name).trim();
                            }).filter((value) => value !== '');
                            castIdsStr = mappedIds.join(', ');
                        }

                        updatedScenes.push({
                            scene_number: resolvedSceneNumber,
                            episode_number: resolvedEpisodeNumber,
                            int_ext: breakdown?.int_ext || breakdown?.ie || '',
                            day_night: breakdown?.time || breakdown?.day_night || '',
                            description: breakdown?.synopsis || breakdown?.description || '',
                            location: breakdown?.set || breakdown?.location || '',
                            pages: breakdown?.page_eighths || '',
                            cast_ids: castIdsStr
                        });

                        updatedCharacters = addCharactersForScene(
                            resolvedSceneNumber,
                            updatedCharacters,
                            resolvedEpisodeNumber,
                            scheduleSceneId
                        );
                    });

                    const updatedReqs = computeRequirementsFromScenes(updatedScenes, []);

                    newDay.scenes = updatedScenes;
                    newDay.characters = updatedCharacters;
                    newDay.daily_requirements = updatedReqs;

                    const updateRes = await fetch(getApiUrl(`/api/shoot-days/${newDay.id}?project_id=${id}`), {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newDay)
                    });

                    if (!updateRes.ok) {
                        throw new Error('Failed to import schedule data into shoot day');
                    }
                }
            }

            setShootDays((prev) => [...prev, newDay]);
            setShowCreateModal(false);
            navigate(`/${user}/${id}/call-sheets/day/${newDay.id}`);
        } catch (err) {
            alert(`Error creating day: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [addCharactersForScene, castList, computeRequirementsFromScenes, createData, findBreakdownScene, id, navigate, scheduleHasDate, schedules, user]);

    const handleDeleteDay = useCallback(async (event, dayId) => {
        event.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this shoot day? This cannot be undone.')) return;

        try {
            const res = await fetch(getApiUrl(`/api/shoot-days/${dayId}?project_id=${id}`), { method: 'DELETE' });
            if (!res.ok) {
                alert('Failed to delete shoot day');
                return;
            }

            setShootDays((prev) => prev.filter((day) => day.id !== dayId));
        } catch (err) {
            console.error(err);
            alert('Error deleting shoot day');
        }
    }, [id]);

    return (
        <div className="msd-page-container">
            <div className="msd-dashboard-container">
                <div className="msd-dashboard-header">
                    <h1 className="msd-dashboard-title">Call Sheets</h1>
                    <button
                        onClick={() => navigate(`/${user}/${id}/crew-list`)}
                        className="msd-neutral-action-btn"
                    >
                        <PiUsersThree size={20} /> Crew List
                    </button>
                </div>

                <div className="msd-dashboard-section">
                    <h2 className="msd-dashboard-subtitle">Project Assets</h2>
                    <div className="msd-presets-grid">
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
                                            onLoad={(event) => { event.target.style.display = 'block'; }}
                                            onError={(event) => { event.target.style.display = 'none'; }}
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
                                            onLoad={(event) => { event.target.style.display = 'block'; }}
                                            onError={(event) => { event.target.style.display = 'none'; }}
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

                <div className="msd-dashboard-section">
                    <h2 className="msd-dashboard-subtitle">Call Sheets</h2>
                    {isLoading ? (
                        <div className="msd-empty-state">
                            <p>Loading call sheets...</p>
                        </div>
                    ) : breakdownScenes.length === 0 && shootDays.length === 0 ? (
                        <EmptyState 
                            title="No Data Available" 
                            subtitle="Upload a script to create call sheets." 
                            className="msd-call-sheet-empty-wrapper"
                            cardClassName="msd-call-sheet-empty-card"
                        />
                    ) : (
                        <div className="msd-day-cards-grid">
                            <div className="msd-day-card add-card" onClick={handleCreateDayClick}>
                                <div className="msd-add-day-card-content">
                                    <PiPlus size={32} />
                                    <span className="msd-add-day-label">Add Day</span>
                                </div>
                            </div>

                            {shootDays.map((day) => (
                                <div key={day.id} className="msd-day-card" onClick={() => navigate(`/${user}/${id}/call-sheets/day/${day.id}`)}>
                                    <div className="msd-day-card-header">
                                        <span className="msd-day-number">Day {day.day_number}</span>
                                        <button
                                            onClick={(event) => { handleDeleteDay(event, day.id); }}
                                            className="msd-card-delete-btn"
                                            title="Delete"
                                        >
                                            <PiTrash />
                                        </button>
                                    </div>
                                    <div className="msd-day-card-body">
                                        <div className="msd-card-date">
                                            {day.date
                                                ? new Date(day.date).toLocaleDateString('en-GB', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                })
                                                : 'No Date'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

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
                                    onChange={(event) => setCreateData((prev) => ({ ...prev, day_number: event.target.value }))}
                                />
                            </label>
                            <label>
                                Shoot Date:
                                <input
                                    type="date"
                                    className="msd-input"
                                    value={createData.date || ''}
                                    onChange={(event) => handleCreateDateChange(event.target.value)}
                                />
                            </label>
                            {createWarning && <div className="msd-create-warning">{createWarning}</div>}

                            <label className={`msd-import-checkbox ${scheduleHasDate ? '' : 'disabled'}`}>
                                <input
                                    type="checkbox"
                                    checked={createData.importFromSchedule}
                                    onChange={(event) => setCreateData((prev) => ({ ...prev, importFromSchedule: event.target.checked }))}
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

export default CallSheetHome;
