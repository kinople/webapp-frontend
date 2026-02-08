import React, { useState, useEffect, useCallback } from 'react';
import ProjectHeader from '../components/ProjectHeader';
import { useParams } from 'react-router-dom';
import { getApiUrl } from '../utils/api';

/*
  CastList (updated layout)
  - Left grey panel with index badge, character name
  - Shows: No. of scenes, INT/EXT counts, Location Group IDs (badges)
  - "View Options" and "View Scenes" buttons (prominent) in left panel
  - Right panel shows options table (S.No, Location Name, Media, Address, GMap Pin, Dates, Lock Location)
  - Scenes table shows columns: Scene No, Int./Ext., Location, Time, Synopsis, Characters
  - Add Option modal unchanged
*/

const AddActorOptionModal = ({ onClose, onSubmit, optionForm, setOptionForm }) => {
  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit(optionForm);
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <h3 style={styles.modalTitle}>Add Actor Option</h3>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Artist Name:</label>
            <input
              type="text"
              value={optionForm.actorName}
              onChange={(e) => setOptionForm((p) => ({ ...p, actorName: e.target.value }))}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Media (links):</label>
            <input
              type="text"
              value={optionForm.media}
              onChange={(e) => setOptionForm((p) => ({ ...p, media: e.target.value }))}
              style={styles.input}
              placeholder="Comma separated links (optional)"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Contact Details:</label>
            <textarea
              value={optionForm.contact}
              onChange={(e) => setOptionForm((p) => ({ ...p, contact: e.target.value }))}
              style={{ ...styles.input, minHeight: '60px' }}
              placeholder="Phone / email / other contact info"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Dates / Availability:</label>
            <input
              type="text"
              value={optionForm.dates}
              onChange={(e) => setOptionForm((p) => ({ ...p, dates: e.target.value }))}
              style={styles.input}
              placeholder="e.g. 2025-08-01 to 2025-08-10"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Details:</label>
            <textarea
              value={optionForm.details}
              onChange={(e) => setOptionForm((p) => ({ ...p, details: e.target.value }))}
              style={{ ...styles.input, minHeight: '60px' }}
              placeholder="Short description / role notes"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Notes:</label>
            <textarea
              value={optionForm.notes}
              onChange={(e) => setOptionForm((p) => ({ ...p, notes: e.target.value }))}
              style={{ ...styles.input, minHeight: '60px' }}
            />
          </div>

          <div style={styles.formButtons}>
            <button type="submit" style={styles.submitButton}>Add Option</button>
            <button type="button" onClick={onClose} style={styles.cancelButton}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* Helpers to analyze scenes and render scene summary */
function analyzeScenes(scenes) {
  const result = { total: 0, intCount: 0, extCount: 0, locationGroupIds: new Set() };
  if (!Array.isArray(scenes)) return result;

  scenes.forEach((s) => {
    result.total++;
    if (typeof s === 'string') {
      const low = s.toLowerCase();
      if (low.includes('int')) result.intCount++;
      if (low.includes('ext')) result.extCount++;
    } else if (s && typeof s === 'object') {
      const intExt =
        (s['INT/EXT'] || s['INT_EXT'] || s.int_ext || s.intext || s.int || s['Int/Ext'] || s.intExt || '')
          .toString()
          .toLowerCase();
      if (intExt.includes('int')) result.intCount++;
      if (intExt.includes('ext')) result.extCount++;

      const possibleLg =
        s['Location Group ID'] || s['Location Group'] || s.location_group_id || s.locationGroupId || s.location_group || s.location_id || s.locationId;
      if (possibleLg !== undefined && possibleLg !== null && String(possibleLg).trim() !== '') {
        if (Array.isArray(possibleLg)) possibleLg.forEach((v) => v && result.locationGroupIds.add(String(v)));
        else result.locationGroupIds.add(String(possibleLg));
      }
    }
  });

  return result;
}

function findFirstField(obj = {}, candidates = []) {
  for (const k of candidates) {
    if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') return obj[k];
  }
  return undefined;
}

function renderSceneSummary(scene) {
  if (!scene) return null;
  if (typeof scene === 'string') return <div style={{ whiteSpace: 'pre-wrap' }}>{scene}</div>;
  if (typeof scene === 'object') {
    const entries = Object.entries(scene).slice(0, 5);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {entries.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 8 }}>
            <strong style={{ minWidth: 110, color: '#334155' }}>{k}:</strong>
            <div style={{ color: '#0f1724', wordBreak: 'break-word' }}>{String(v)}</div>
          </div>
        ))}
      </div>
    );
  }
  return <div>{String(scene)}</div>;
}

const CastListNew = () => {
  const { user, id } = useParams();
  const [castData, setCastData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showScenesModal, setShowScenesModal] = useState(false);
  const [selectedCharacterScenes, setSelectedCharacterScenes] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [expandedOptions, setExpandedOptions] = useState(new Set());
  const [expandedScenes, setExpandedScenes] = useState(new Set());
  const [showAddOptionModal, setShowAddOptionModal] = useState(false);
  const [selectedCharacterIndex, setSelectedCharacterIndex] = useState(null);
  const [optionForm, setOptionForm] = useState({ actorName: '', media: '', contact: '', dates: '', details: '', notes: '' });
  const [selectedOptions, setSelectedOptions] = useState(new Set());
  const [lockedOptions, setLockedOptions] = useState(new Set());

  useEffect(() => {
    const fetchCastList = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(getApiUrl(`/api/${id}/cast-list`));
        if (!res.ok) throw new Error('Failed to fetch cast list');
        const data = await res.json();
        setCastData(data);
        if (Array.isArray(data?.cast_list)) setExpandedOptions(new Set(data.cast_list.map((_, i) => i)));
      } catch (e) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCastList();
  }, [id]);

  const handleScenesClick = (character, scenes) => {
    setSelectedCharacter(character);
    setSelectedCharacterScenes(scenes || []);
    setShowScenesModal(true);
  };

  const addActorOption = async (idx, form) => {
    setIsLoading(true);
    try {
      const member = castData.cast_list[idx];
      const res = await fetch(getApiUrl(`/api/${id}/cast/add-option`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character: member.character,
          cast_id: member.cast_id,
          actorName: form.actorName,
          media: form.media,
          contact: form.contact,
          dates: form.dates,
          details: form.details,
          notes: form.notes,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => null);
        throw new Error(text || 'Failed to add actor option');
      }
      const refreshed = await (await fetch(getApiUrl(`/api/${id}/cast-list`))).json();
      setCastData(refreshed);
      setShowAddOptionModal(false);
      setOptionForm({ actorName: '', media: '', contact: '', dates: '', details: '', notes: '' });
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const removeActorOption = async (idx, optId) => {
    setIsLoading(true);
    try {
      const member = castData.cast_list[idx];
      await fetch(getApiUrl(`/api/${id}/cast/${member.cast_id}/options/${optId}`), { method: 'DELETE' });
      const refreshed = await (await fetch(getApiUrl(`/api/${id}/cast-list`))).json();
      setCastData(refreshed);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLockOption = useCallback((idx, optId) => {
    const key = `${idx}-${optId}`;
    setLockedOptions((prev) => {
      const next = new Set(prev);
      Array.from(prev).forEach((k) => { if (k.startsWith(`${idx}-`)) next.delete(k); });
      if (!prev.has(key)) next.add(key);
      return next;
    });
  }, []);

  /* helpers to extract option fields with fallbacks */
  const getOptionField = (opt, keys) => {
    if (!opt) return '-';
    const val = findFirstField(opt, keys);
    if (val === undefined || val === null || String(val).trim() === '') return '-';
    // if it's an array, join it
    if (Array.isArray(val)) return val.join(', ');
    return String(val);
  };

  const getSceneField = (s, keys) => {
    if (!s) return '-';
    if (typeof s === 'string') return s;
    const val = findFirstField(s, keys);
    if (val === undefined || val === null || String(val).trim() === '') return '-';
    if (Array.isArray(val)) return val.join(', ');
    return String(val);
  };

  return (
    <div style={styles.page}>
      <ProjectHeader />

      <div style={styles.contentArea}>
        {isLoading ? (
          <div style={styles.message}>Loading cast list…</div>
        ) : error ? (
          <div style={styles.errorMessage}>{error}</div>
        ) : !castData || !(Array.isArray(castData.cast_list) && castData.cast_list.length) ? (
          <div style={styles.message}>No cast members found</div>
        ) : (
          <>
            <div style={styles.scriptInfo}>
              <h2 style={styles.heading}>Cast List – {castData.project_name}</h2>
              <p style={styles.subheading}>Total Characters: {castData.total_characters ?? castData.cast_list.length}</p>
            </div>

            {castData.cast_list.map((member, idx) => {
              const sceneAnalysis = analyzeScenes(member.scenes || []);
              const lgArray = Array.from(sceneAnalysis.locationGroupIds);

              return (
                <div key={idx} style={styles.card}>
                  {/* Left grey framed panel */}
                  <div style={styles.leftPanel}>
                    <div style={styles.leftTop}>
                      <div style={styles.indexBadge}>{idx + 1}</div>
                      <div style={styles.leftTitle}>{member.character}</div>
                    </div>

                    <div style={styles.leftSection}>
                      <div style={{ fontSize: 13, color: '#374151', marginBottom: 6 }}>No. of scenes</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={styles.countBox}>{sceneAnalysis.total}</div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <div style={styles.smallCount}>
                            <div style={styles.smallLabel}>Int.</div>
                            <div style={styles.smallNumber}>{sceneAnalysis.intCount}</div>
                          </div>
                          <div style={styles.smallCount}>
                            <div style={styles.smallLabel}>Ext.</div>
                            <div style={styles.smallNumber}>{sceneAnalysis.extCount}</div>
                          </div>
                          <div style={styles.smallCount}>
                            <div style={styles.smallLabel}>Int./Ext.</div>
                            <div style={styles.smallNumber}>{Math.max(0, sceneAnalysis.total - (sceneAnalysis.intCount + sceneAnalysis.extCount))}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={styles.leftSection}>
                      <div style={{ fontSize: 13, color: '#374151', marginBottom: 6 }}>Location Groups</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {lgArray.length ? lgArray.map((g, i) => (
                          <div key={i} style={styles.lgBadge}>{g}</div>
                        )) : <div style={{ color: '#6b7280' }}>—</div>}
                      </div>
                    </div>

                    <div style={styles.viewButtons}>
                      <button
                        style={{ ...styles.viewBtn, ...(expandedOptions.has(idx) ? styles.viewBtnActive : {}) }}
                        onClick={() => {
                          setExpandedOptions((p) => {
                            const n = new Set(p);
                            if (n.has(idx)) n.delete(idx);
                            else n.add(idx);
                            return n;
                          });
                          setExpandedScenes((p) => { const n = new Set(p); n.delete(idx); return n; });
                        }}
                      >
                        View Options
                      </button>

                      <button
                        style={{ ...styles.viewBtn, ...(expandedScenes.has(idx) ? styles.viewBtnActive : {}) }}
                        onClick={() => {
                          setExpandedScenes((p) => {
                            const n = new Set(p);
                            if (n.has(idx)) n.delete(idx);
                            else n.add(idx);
                            return n;
                          });
                          setExpandedOptions((p) => { const n = new Set(p); n.delete(idx); return n; });
                        }}
                      >
                        View Scenes
                      </button>
                    </div>
                  </div>

                  {/* Right panel */}
                  <div style={styles.rightPanel}>
                    {!expandedScenes.has(idx) ? (
                      <>
                        {/* Option controls */}
                        {expandedOptions.has(idx) && (
                          <div style={styles.optionButtons}>
                            <button style={styles.newBtn} onClick={() => { setSelectedCharacterIndex(idx); setShowAddOptionModal(true); setOptionForm({ actorName: '', media: '', contact: '', dates: '', details: '', notes: '' }); }}>
                              + Add Option
                            </button>

                            <button style={styles.removeBtn} onClick={() => {
                              const toRemove = Array.from(selectedOptions).filter((k) => k.startsWith(`${idx}-`)).map((k) => k.split('-')[1]);
                              toRemove.forEach((optId) => removeActorOption(idx, optId));
                              setSelectedOptions(new Set());
                            }}>
                              – Remove Selected
                            </button>
                          </div>
                        )}

                        {/* Updated Options Table */}
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.th}>S.No</th>
                              <th style={styles.th}>Location Name</th>
                              <th style={styles.th}>Media</th>
                              <th style={styles.th}>Address</th>
                              <th style={styles.th}>GMap Pin</th>
                              <th style={styles.th}>Dates</th>
                              <th style={styles.th}>Lock Location</th>
                            </tr>
                          </thead>
                          <tbody>
                            {member.cast_options && Object.keys(member.cast_options).length > 0 ? (
                              Object.entries(member.cast_options).map(([optId, opt], i) => {
                                const key = `${idx}-${optId}`;
                                const locked = lockedOptions.has(key);
                                const otherLocked = Array.from(lockedOptions).some((k) => k.startsWith(`${idx}-`) && k !== key);

                                const locationName = getOptionField(opt, ['locationName', 'location', 'location_name', 'name', 'Location Name', 'place']);
                                const media = getOptionField(opt, ['media', 'media_links', 'links', 'photos', 'mediaLink', 'mediaLinks', 'actorName']);
                                const address = getOptionField(opt, ['address', 'addr', 'locationAddress', 'location_address', 'Address']);
                                const gmap = getOptionField(opt, ['gmap', 'gmap_pin', 'gmapPin', 'gmap_link', 'google_map', 'google_map_link']);
                                const dates = getOptionField(opt, ['dates', 'availability', 'date_range', 'available']);

                                return (
                                  <tr key={optId} style={styles.tr}>
                                    <td style={styles.td}>{i + 1}</td>
                                    <td style={styles.td}>{locationName}</td>
                                    <td style={styles.td}>{media}</td>
                                    <td style={styles.td}>{address}</td>
                                    <td style={styles.td}>{gmap}</td>
                                    <td style={styles.td}>{dates}</td>
                                    <td style={styles.td}>
                                      <button
                                        style={{ ...styles.lockBtn, ...(locked ? styles.lockedBtn : {}), opacity: otherLocked && !locked ? 0.5 : 1 }}
                                        onClick={() => toggleLockOption(idx, optId)}
                                        disabled={otherLocked && !locked}
                                      >
                                        {locked ? '🔒 Lock' : '🔓 Lock'}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={7} style={styles.emptyRow}>No options added</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </>
                    ) : (
                      // Scenes listing - updated table columns
                      <div>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.th}>Scene No</th>
                              <th style={styles.th}>Int./Ext.</th>
                              <th style={styles.th}>Location</th>
                              <th style={styles.th}>Time</th>
                              <th style={styles.th}>Synopsis</th>
                              <th style={styles.th}>Characters</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(member.scenes || []).length ? (
                              (member.scenes || []).map((s, i) => {
                                const sceneNo = getSceneField(s, ['scene_no', 'scene', 'Scene No', 'sceneNumber', 'scenery', 'no']);
                                const intExt = getSceneField(s, ['INT/EXT', 'INT_EXT', 'int_ext', 'intext', 'int', 'ext', 'intExt']);
                                const location = getSceneField(s, ['location', 'Location', 'location_name', 'Location Name', 'place']);
                                const time = getSceneField(s, ['time', 'Time', 'day_time', 'daytime', 'time_of_day']);
                                const synopsis = getSceneField(s, ['synopsis', 'description', 'Synopsis', 'desc', 'scene_description']);
                                const characters = getSceneField(s, ['characters', 'casts', 'Characters', 'role', 'people']);

                                return (
                                  <tr key={i} style={styles.tr}>
                                    <td style={styles.td}>{sceneNo === '-' ? i + 1 : sceneNo}</td>
                                    <td style={styles.td}>{intExt}</td>
                                    <td style={styles.td}>{location}</td>
                                    <td style={styles.td}>{time}</td>
                                    <td style={styles.td}>{synopsis}</td>
                                    <td style={styles.td}>{characters}</td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr><td colSpan={6} style={styles.emptyRow}>No scenes listed</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Scenes Modal */}
      {showScenesModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Scenes for {selectedCharacter}</h3>
            <div style={{ maxHeight: '50vh', overflowY: 'auto', marginBottom: 12 }}>
              {(selectedCharacterScenes || []).length === 0 ? (
                <div style={styles.emptyRow}>No scenes</div>
              ) : (
                selectedCharacterScenes.map((s, i) => (
                  <div key={i} style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px dashed rgba(0,0,0,0.06)' }}>
                    {renderSceneSummary(s)}
                  </div>
                ))
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={styles.cancelButton} onClick={() => setShowScenesModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Option Modal */}
      {showAddOptionModal && (
        <AddActorOptionModal
          onClose={() => setShowAddOptionModal(false)}
          onSubmit={(form) => addActorOption(selectedCharacterIndex, form)}
          optionForm={optionForm}
          setOptionForm={setOptionForm}
        />
      )}
    </div>
  );
};

/* -------------------- styles -------------------- */
const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa, #c3cfe2)',
    fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    padding: '2rem',
    color: '#0f1724',
  },
  contentArea: { display: 'flex', flexDirection: 'column', gap: '2rem' },
  heading: { fontSize: '2rem', color: '#2C3440', margin: 0 },
  subheading: { fontSize: '1.2rem', color: '#2C3440', margin: 0 },

  scriptInfo: {
    textAlign: 'center',
    padding: '1rem',
    backgroundColor: 'rgba(255,255,255,0.6)',
    backdropFilter: 'blur(8px)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.8)',
    boxShadow: '0 8px 16px rgba(0,0,0,0.05)',
  },

  card: {
    display: 'flex',
    borderRadius: '12px',
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.6)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(230,230,230,0.9)',
    boxShadow: '0 8px 16px rgba(0,0,0,0.05)',
  },

  /* left grey framed panel */
  leftPanel: {
    width: '300px',
    padding: '1rem',
    background: '#f3f4f6',
    borderRight: '1px solid rgba(0,0,0,0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  leftTop: { display: 'flex', alignItems: 'center', gap: 12 },
  indexBadge: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    color: '#111827',
    boxShadow: '0 2px 6px rgba(2,6,23,0.06)',
  },
  leftTitle: { fontSize: 16, fontWeight: 700, color: '#0f1724' },

  leftSection: { display: 'flex', flexDirection: 'column' },
  countBox: {
    minWidth: 52,
    padding: '8px 10px',
    borderRadius: 8,
    background: '#fff',
    border: '1px solid #e6edf3',
    fontWeight: 700,
    textAlign: 'center',
    color: '#0f1724',
  },
  smallCount: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    alignItems: 'center',
    minWidth: 56,
  },
  smallLabel: { fontSize: 12, color: '#6b7280' },
  smallNumber: { fontWeight: 700, color: '#111827' },

  lgBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 10px',
    borderRadius: 999,
    background: '#fff',
    border: '1px solid #e6edf3',
    fontSize: 13,
    color: '#0f1724',
  },

  viewButtons: { display: 'flex', gap: 8, marginTop: 6 },
  viewBtn: {
    flex: 1,
    padding: '0.6rem',
    borderRadius: 8,
    border: '1px solid #e6edf3',
    background: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  viewBtnActive: {
    background: 'linear-gradient(135deg, #6c5ce7, #00b894)',
    color: '#fff',
    border: 'none',
  },

  /* right panel */
  rightPanel: { flex: 1, padding: '1rem' },

  optionButtons: { display: 'flex', gap: '0.5rem', marginBottom: '1rem' },
  newBtn: {
    padding: '0.6rem 1.0rem',
    background: 'linear-gradient(135deg, #6c5ce7, #00b894)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  removeBtn: {
    padding: '0.6rem 1.0rem',
    background: '#f3f4f6',
    border: '1px solid #e6e9ef',
    borderRadius: '6px',
    cursor: 'pointer',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  th: {
    textAlign: 'left',
    padding: '0.75rem',
    background: 'rgba(0,0,0,0.03)',
    fontSize: 13,
    color: '#334155',
  },
  tr: { borderBottom: '1px solid rgba(0,0,0,0.06)' },
  td: { padding: '0.75rem', verticalAlign: 'top', fontSize: 14 },
  emptyRow: { textAlign: 'center', color: '#666', padding: '1rem' },

  lockBtn: {
    padding: '0.35rem 0.7rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    background: '#fff',
  },
  lockedBtn: { background: 'linear-gradient(135deg, #6c5ce7, #00b894)', color: '#fff', border: 'none' },

  message: { textAlign: 'center', padding: '2rem', color: '#666' },
  errorMessage: { textAlign: 'center', padding: '2rem', color: '#dc3545' },

  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1000, padding: 16,
  },
  modalContent: {
    background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(6px)',
    borderRadius: '12px', padding: '1.25rem', width: '100%', maxWidth: '760px',
    boxShadow: '0 10px 30px rgba(2,6,23,0.12)',
  },
  modalTitle: { margin: 0, marginBottom: '0.75rem', color: '#2C3440', fontSize: 18 },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  label: { fontWeight: '600', color: '#2C3440', fontSize: 13 },
  input: { padding: '0.6rem', borderRadius: '8px', border: '1px solid #e6edf3', fontSize: '0.95rem', background: '#fff' },
  formButtons: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: 6 },
  submitButton: { padding: '0.6rem 1.0rem', background: 'linear-gradient(135deg, #6c5ce7, #00b894)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  cancelButton: { padding: '0.55rem 0.9rem', background: '#f3f4f6', border: '1px solid #e6e9ef', borderRadius: '8px', cursor: 'pointer' },
};

export default CastListNew;