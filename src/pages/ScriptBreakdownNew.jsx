// src/pages/ScriptBreakdown.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import ProjectHeader from "../components/ProjectHeader";
import { getApiUrl } from "../utils/api";

/*
  ScriptBreakdown page - final variant:
  - Table view: props columns (Action Props, Other Props, Picture Vehicles, Animals, Extras, Wardrobe, Set Dressing)
    render as plain text in the table (no inline tag editors)
  - Scene editor view (opened when you click a row or press "Edit Breakdown") contains TagInput
    for those props fields — add/remove tags only inside the edit view (exactly like prior behavior)
  - Everything else (fetch/save, shadows, pdf preview) preserved
*/

/* ---------- parse TSV ---------- */
const parseTSV = (tsvText) => {
  try {
    const lines = tsvText.split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0].split("\t").map((h) => h.trim());
    return lines
      .slice(1)
      .filter((l) => l.trim() !== "")
      .map((line) => {
        const values = line.split("\t").map((v) => v.trim());
        return headers.reduce((obj, header, idx) => {
          obj[header] = values[idx] || "";
          return obj;
        }, {});
      });
  } catch (e) {
    console.error("Error parsing TSV", e);
    return [];
  }
};

/* ---------- TagInput (CSV in/out) used only inside scene editor ---------- */
function TagInput({ value = "", onChange }) {
  const [tags, setTags] = useState(() => {
    if (!value) return [];
    return value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  });
  const [input, setInput] = useState("");

  useEffect(() => {
    const newTags = (value || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setTags(newTags);
  }, [value]);

  const pushChange = (nextTags) => {
    setTags(nextTags);
    const csv = nextTags.join(", ");
    onChange && onChange(csv);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = input.trim();
      if (!val) return setInput("");
      if (!tags.includes(val)) pushChange([...tags, val]);
      setInput("");
    } else if (e.key === "Backspace" && input === "") {
      if (tags.length > 0) pushChange(tags.slice(0, -1));
    }
  };

  const removeTag = (idx) => {
    const next = tags.filter((_, i) => i !== idx);
    pushChange(next);
  };

  return (
    <div style={localUI.tagWrap}>
      {tags.map((t, i) => (
        <div key={i} style={localUI.tag}>
          <span style={{ marginRight: 8 }}>{t}</span>
          <button style={localUI.tagX} onClick={() => removeTag(i)} aria-label={`Remove ${t}`}>
            ×
          </button>
        </div>
      ))}
      <input
        value={input}
        placeholder="Add tag and press Enter"
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        style={localUI.tagInput}
      />
    </div>
  );
}

/* ---------- Main component ---------- */
const ScriptBreakdownNew = () => {
  const { user, id } = useParams();
  const [scriptBreakdown, setScriptBreakdown] = useState([]);
  const [allScripts, setAllScripts] = useState([]);
  const [selectedScript, setSelectedScript] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // 'table' = normal table view; 'scene' = scene editor & pdf preview
  const [viewMode, setViewMode] = useState("table");
  const [editingSceneIndex, setEditingSceneIndex] = useState(0);
  const [editingScene, setEditingScene] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [hasBreakdown, setHasBreakdown] = useState(false);
  const [filterText, setFilterText] = useState("");

  // scrolling shadows
  const tableWrapRef = useRef(null);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);

  const updateShadows = () => {
    const el = tableWrapRef.current;
    if (!el) return;
    setShowLeftShadow(el.scrollLeft > 8);
    setShowRightShadow(el.scrollWidth - el.clientWidth - el.scrollLeft > 8);
  };

  useEffect(() => {
    const el = tableWrapRef.current;
    if (!el) return;
    updateShadows();
    const onScroll = () => requestAnimationFrame(updateShadows);
    el.addEventListener("scroll", onScroll);
    window.addEventListener("resize", updateShadows);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateShadows);
    };
  }, [tableWrapRef.current]);

  /* ---------- fetchers ---------- */
  const fetchBreakdown = async (scriptId) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(getApiUrl(`/api/fetch-breakdown?script_id=${scriptId}`), { method: "GET" });
      if (!res.ok) {
        if (res.status === 404) {
          setHasBreakdown(false);
          setError("No breakdown available. Please generate a breakdown first by uploading and processing a script.");
        } else {
          throw new Error(`Failed to fetch breakdown: ${res.status}`);
        }
        return;
      }
      const data = await res.json();
      if (data.tsv_content) {
        const parsed = parseTSV(data.tsv_content);
        setScriptBreakdown(parsed);
        setHasBreakdown(true);
      } else {
        setError("No breakdown data found");
        setHasBreakdown(false);
      }
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to fetch breakdown");
      setHasBreakdown(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllScripts = async () => {
    try {
      const res = await fetch(getApiUrl(`/api/${id}/script-list`), { method: "GET" });
      if (res.ok) {
        const scripts = await res.json();
        const sorted = (scripts || []).sort((a, b) => (b.version || 0) - (a.version || 0));
        setAllScripts(sorted);
        if (sorted.length > 0) {
          handleScriptSelect(sorted[0]); // This will set the selected script and fetch its breakdown
        }
      } else {
        console.error("Failed to fetch scripts");
      }
    } catch (e) {
      console.error("Error fetching scripts", e);
    }
  };

  const loadPdfPreview = async (scriptName) => {
    try {
      const response = await fetch(getApiUrl(`/api/${id}/script-file/${scriptName}`), { method: "GET" });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url + "#view=FitH");
      }
    } catch (e) {
      console.error("Error loading PDF", e);
    }
  };

  const handleScriptSelect = (script) => {
    setSelectedScript(script);
    if (script?.id) {
      fetchBreakdown(script.id);
    }
  };

  useEffect(() => {
    fetchAllScripts();
    // Initial breakdown will be fetched after scripts are loaded and first script is selected
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ---------- open the scene editor (either from button or row click) ---------- */
  const openSceneEditorAt = (index) => {
    if (!scriptBreakdown || scriptBreakdown.length === 0) return;
    const idx = Math.max(0, Math.min(index, scriptBreakdown.length - 1));
    setEditingSceneIndex(idx);
    setEditingScene({ ...scriptBreakdown[idx] });
    setViewMode("scene");
    if (selectedScript) loadPdfPreview(selectedScript.name);
    // scroll to top so editor is visible
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStartSceneEditor = () => openSceneEditorAt(0);

  const handlePreviousScene = () => {
    if (editingSceneIndex > 0) openSceneEditorAt(editingSceneIndex - 1);
  };
  const handleNextScene = () => {
    if (editingSceneIndex < scriptBreakdown.length - 1) openSceneEditorAt(editingSceneIndex + 1);
  };

  const isLatestScript = () => {
    if (!selectedScript || allScripts.length === 0) return false;
    const latest = allScripts.reduce((a, b) => (b.version > (a.version || 0) ? b : a), allScripts[0]);
    return selectedScript.name === latest.name && selectedScript.version === latest.version;
  };

  const handleSaveSceneChanges = async () => {
    if (!editingScene) return;
    try {
      const updated = [...scriptBreakdown];
      updated[editingSceneIndex] = editingScene;
      const headers = Object.keys(updated[0] || {});
      const tsvContent = [headers.join("\t"), ...updated.map((row) => headers.map((h) => row[h] || "").join("\t"))].join("\n");

      const response = await fetch(getApiUrl(`/api/${id}/update-breakdown`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tsv_content: tsvContent }),
      });

      if (!response.ok) throw new Error("Failed to save changes");
      setScriptBreakdown(updated);
      alert("Changes saved successfully!");
      setViewMode("table");
      setEditingScene(null);
    } catch (e) {
      console.error(e);
      alert("Failed to save changes. Try again.");
    }
  };

  /* ---------- props columns: explicit list ---------- */
  const propsHeaderNames = useMemo(() => {
    return new Set([
      "action props",
      "other props",
      "picture vehicles",
      "animals",
      "extras",
      "extra",
      "wardrobe",
      "set dressing",
      "set dressings",
      "set-dressing",
      "set-dressings",
    ]);
  }, []);

  const propsKeys = useMemo(() => {
    if (!scriptBreakdown || scriptBreakdown.length === 0) return [];
    return Object.keys(scriptBreakdown[0]).filter((k) => {
      if (!k) return false;
      const lower = k.trim().toLowerCase();
      if (propsHeaderNames.has(lower)) return true;
      if (/prop/i.test(k)) return true;
      return false;
    });
  }, [scriptBreakdown, propsHeaderNames]);

  /* ---------- updateTableCell helper (used by scene editor only) ---------- */
  const updateTableCell = (row, header, newValue) => {
    const idx = scriptBreakdown.indexOf(row);
    if (idx === -1) {
      // fallback match by Scene Number/Scene No.
      const sceneKeys = ["Scene Number", "Scene No.", "Scene No", "Scene"];
      for (const sk of sceneKeys) {
        if (sk in row) {
          const sceneVal = row[sk];
          const fallbackIdx = scriptBreakdown.findIndex((r) => r[sk] === sceneVal);
          if (fallbackIdx !== -1) {
            setScriptBreakdown((prev) => prev.map((r, i) => (i === fallbackIdx ? { ...r, [header]: newValue } : r)));
            return;
          }
        }
      }
      return;
    }
    setScriptBreakdown((prev) => prev.map((r, i) => (i === idx ? { ...r, [header]: newValue } : r)));
  };

  /* ---------- Scene editor render (props fields use TagInput) ---------- */
  const renderSceneEditor = () => {
    if (!editingScene) return null;
    return (
      <div style={styles.sceneEditor}>
        <div style={styles.sceneHeader}>
          <div style={styles.sceneNavigation}>
            <button
              style={{
                ...styles.navBtn,
                opacity: editingSceneIndex === 0 ? 0.5 : 1,
                cursor: editingSceneIndex === 0 ? "not-allowed" : "pointer",
              }}
              onClick={handlePreviousScene}
              disabled={editingSceneIndex === 0}
            >
              ‹ Previous
            </button>
            <h3 style={styles.sceneTitle}>
              Scene {editingScene["Scene Number"] || editingSceneIndex + 1}
              <span style={styles.sceneCounter}>
                ({editingSceneIndex + 1} of {scriptBreakdown.length})
              </span>
            </h3>
            <button
              style={{
                ...styles.navBtn,
                opacity: editingSceneIndex === scriptBreakdown.length - 1 ? 0.5 : 1,
                cursor: editingSceneIndex === scriptBreakdown.length - 1 ? "not-allowed" : "pointer",
              }}
              onClick={handleNextScene}
              disabled={editingSceneIndex === scriptBreakdown.length - 1}
            >
              Next ›
            </button>
          </div>

          <button
            style={styles.closeBtn}
            onClick={() => {
              setViewMode("table");
              setEditingScene(null);
            }}
          >
            ✕
          </button>
        </div>

        <div style={styles.sceneContent}>
          {Object.entries(editingScene).map(([key, value]) => {
            const isProps = propsKeys.includes(key);
            return (
              <div key={key} style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>{key}:</label>
                {isProps ? (
                  <TagInput
                    value={value || ""}
                    onChange={(csv) => {
                      setEditingScene((prev) => ({ ...prev, [key]: csv }));
                    }}
                  />
                ) : (
                  <textarea
                    style={styles.fieldInput}
                    value={value || ""}
                    onChange={(e) => {
                      setEditingScene({ ...editingScene, [key]: e.target.value });
                    }}
                    rows={key === "Synopsis" || key.toLowerCase().includes("synopsis") ? 4 : 2}
                  />
                )}
              </div>
            );
          })}

          <div style={styles.sceneActions}>
            <button style={styles.saveBtn} onClick={handleSaveSceneChanges}>
              Save Changes
            </button>
            <button
              style={styles.cancelBtn}
              onClick={() => {
                setEditingScene(null);
                setViewMode("table");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ---------- Table render:
       - Table cells show plain text; props columns are plain CSV strings in table
       - Clicking a row opens the scene editor (where TagInput is available)
  */
  const renderTableContent = () => {
    if (scriptBreakdown.length === 0) return null;
    const headers = Object.keys(scriptBreakdown[0] || {});

    const filtered = scriptBreakdown.filter((row) => {
      if (!filterText) return true;
      const q = filterText.toLowerCase();
      return Object.values(row).some((v) => String(v || "").toLowerCase().includes(q));
    });

    return (
      <>
        <div style={styles.tableToolbar}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              placeholder="Search scenes (Scene No., Location, Synopsis...)"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              style={styles.searchInput}
            />
            <div style={{ color: "#6b7280", fontSize: 13 }}>{filtered.length} rows</div>
          </div>
          <div style={{ color: "#6b7280", fontSize: 13 }}>Tip: Click a row to edit a scene (props editable inside editor)</div>
        </div>

        <div style={styles.tableContainer} ref={tableWrapRef}>
          {showLeftShadow && <div style={styles.leftShadow} />}
          {showRightShadow && <div style={styles.rightShadow} />}

          <table style={styles.table}>
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} style={styles.tableHeader}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  style={styles.tableRowClickable}
                  onClick={() => {
                    // open scene editor when row clicked
                    const idx = scriptBreakdown.indexOf(row);
                    openSceneEditorAt(idx === -1 ? rIdx : idx);
                  }}
                >
                  {headers.map((header, cIdx) => {
                    const cellValue = row[header] ?? "";
                    return (
                      <td key={cIdx} style={styles.tableCell}>
                        {cellValue}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <div style={styles.pageContainer}>
      <ProjectHeader />

      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h2 style={styles.pageTitle}>Script Breakdown</h2>
          {allScripts.length > 0 && (
            <select
              style={styles.scriptDropdown}
              value={selectedScript?.name || ""}
              onChange={(e) => {
                const script = allScripts.find((s) => s.name === e.target.value);
                if (script) handleScriptSelect(script);
              }}
            >
              {allScripts.map((script) => (
                <option key={script.name} value={script.name}>
                  {script.name} (Version {script.version})
                  {script.version === Math.max(...allScripts.map((s) => s.version)) ? " - Latest" : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={styles.headerRight}>
          {hasBreakdown && isLatestScript() && (
            <button
              style={styles.editBtn}
              onClick={() => {
                handleStartSceneEditor();
              }}
            >
              Edit Breakdown
            </button>
          )}
        </div>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.contentWrapper}>
          {viewMode === "scene" ? (
            <div style={styles.editLayout}>
              <div style={styles.leftPane}>{renderSceneEditor()}</div>
              <div style={styles.rightPane}>
                <div style={styles.pdfHeader}>
                  <h3 style={styles.pdfTitle}>Script Preview</h3>
                </div>
                {pdfUrl ? (
                  <iframe src={pdfUrl} style={styles.pdfViewer} title="Script PDF Preview" />
                ) : (
                  <div style={styles.pdfPlaceholder}>
                    <div style={styles.message}>Loading PDF preview...</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={styles.contentArea}>
              {isLoading ? (
                <div style={styles.loadingContainer}>
                  <div style={styles.spinner} />
                  <div style={styles.message}>Loading breakdown...</div>
                </div>
              ) : error ? (
                <div style={styles.errorContainer}>
                  <div style={styles.errorMessage}>⚠️ {error}</div>
                  {!hasBreakdown && allScripts.length > 0 && (
                    <div style={styles.actionHint}>
                      <p>To generate a breakdown:</p>
                      <ol>
                        <li>Go to Scripts page</li>
                        <li>Upload a script if you haven't already</li>
                        <li>Click "Generate Breakdown" on your script</li>
                        <li>Return here to view the breakdown</li>
                      </ol>
                    </div>
                  )}
                </div>
              ) : scriptBreakdown.length === 0 ? (
                <div style={styles.emptyContainer}>
                  <div style={styles.message}>No breakdown data available</div>
                </div>
              ) : (
                renderTableContent()
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* -------- styles -------- */
const styles = {
  pageContainer: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f5f7fa, #c3cfe2)",
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
    color: "#0f1724",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 1.5rem",
    background: "rgba(255,255,255,0.9)",
    borderBottom: "1px solid rgba(230,230,230,0.9)",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  headerRight: { display: "flex", gap: 8, alignItems: "center" },
  pageTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: "#172023",
  },
  scriptDropdown: {
    padding: "0.45rem 0.75rem",
    border: "1px solid #e6edf3",
    borderRadius: 8,
    background: "#fff",
    fontSize: 13,
    minWidth: 220,
  },
  editBtn: {
    padding: "0.5rem 0.9rem",
    background: "linear-gradient(135deg,#6c5ce7,#00b894)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13,
  },

  mainContent: { display: "flex", flexGrow: 1, minHeight: "calc(100vh - 80px)" },
  contentWrapper: { flexGrow: 1, display: "flex", flexDirection: "column", padding: 16 },
  contentArea: { flexGrow: 1, paddingTop: 8 },
  loadingContainer: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12 },
  spinner: { width: 40, height: 40, border: "4px solid rgba(108,92,231,0.15)", borderTop: "4px solid #6c5ce7", borderRadius: "50%", animation: "spin 1s linear infinite" },
  message: { fontSize: 15, color: "#555" },
  errorContainer: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12 },
  errorMessage: { fontSize: 15, color: "#b91c1c", padding: 12, background: "rgba(220,53,69,0.06)", borderRadius: 8 },
  actionHint: { marginTop: 8, background: "rgba(108,92,231,0.06)", padding: 12, borderRadius: 8 },
  emptyContainer: { height: "60vh", display: "flex", alignItems: "center", justifyContent: "center" },

  /* Editor layout */
  editLayout: { display: "flex", height: "calc(100vh - 160px)" },
  leftPane: { width: "50%", padding: 16, overflowY: "auto" },
  rightPane: { width: "50%", display: "flex", flexDirection: "column", borderLeft: "1px solid #eef2f7" },
  pdfHeader: { padding: 8, borderBottom: "1px solid #eef2f7" },
  pdfTitle: { margin: 0, fontSize: 14, fontWeight: 600 },
  pdfViewer: { width: "100%", height: "100%", border: "none", flexGrow: 1 },
  pdfPlaceholder: { flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center" },

  sceneEditor: { background: "#fff", borderRadius: 8, padding: 16, boxShadow: "0 6px 18px rgba(8,15,35,0.06)" },
  sceneHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sceneNavigation: { display: "flex", alignItems: "center", gap: 12 },
  navBtn: {
    padding: "0.4rem 0.8rem",
    background: "rgba(108,92,231,0.06)",
    border: "1px solid rgba(108,92,231,0.12)",
    borderRadius: 8,
    color: "#6c5ce7",
    cursor: "pointer",
  },
  sceneTitle: { margin: 0, fontSize: 16, fontWeight: 700 },
  sceneCounter: { display: "block", fontSize: 12, fontWeight: 500, color: "#6b7280" },
  closeBtn: { borderRadius: 999, width: 34, height: 34, border: "1px solid rgba(220,53,69,0.14)", background: "rgba(220,53,69,0.06)", color: "#dc3545", cursor: "pointer" },

  sceneContent: { display: "flex", flexDirection: "column", gap: 12 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: 600, color: "#0f1724" },
  fieldInput: {
    padding: "0.6rem",
    borderRadius: 8,
    border: "1px solid #e6edf3",
    fontSize: 14,
    minHeight: 44,
    resize: "vertical",
  },
  sceneActions: { display: "flex", gap: 10, marginTop: 12 },
  saveBtn: { padding: "0.6rem 1.0rem", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#00b894,#6c5ce7)", color: "#fff", cursor: "pointer" },
  cancelBtn: { padding: "0.6rem 1.0rem", borderRadius: 8, border: "1px solid rgba(220,53,69,0.16)", background: "#fff", color: "#dc3545", cursor: "pointer" },

  /* Table area & improvements */
  tableToolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  searchInput: { padding: "0.5rem 0.75rem", borderRadius: 8, border: "1px solid #e6edf3", width: 420 },

  tableContainer: {
    position: "relative",
    background: "rgba(255,255,255,0.98)",
    borderRadius: 10,
    padding: 12,
    overflowX: "auto",
    overflowY: "auto",
    maxHeight: "70vh",
    maxWidth: "165vh",
    boxShadow: "0 6px 22px rgba(12,18,34,0.04)",
    border: "1px solid rgba(230,230,230,0.9)",
  },

  leftShadow: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 24,
    pointerEvents: "none",
    background: "linear-gradient(90deg, rgba(0,0,0,0.06), rgba(0,0,0,0))",
    borderRadius: "10px 0 0 10px",
  },
  rightShadow: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 24,
    pointerEvents: "none",
    background: "linear-gradient(270deg, rgba(0,0,0,0.06), rgba(0,0,0,0))",
    borderRadius: "0 10px 10px 0",
  },

  table: { width: "100%", borderCollapse: "collapse", minWidth: 800 },
  tableHeader: {
    position: "sticky",
    top: 0,
    background: "linear-gradient(135deg, rgba(108,92,231,0.04), rgba(0,184,148,0.02))",
    padding: "12px 14px",
    textAlign: "left",
    fontWeight: 700,
    fontSize: 13,
    borderBottom: "1px solid rgba(236,240,241,0.8)",
    color: "#0f1724",
  },
  tableRowClickable: {
    cursor: "pointer",
    transition: "background-color 150ms ease",
    borderBottom: "1px solid rgba(240,240,240,0.9)",
  },
  tableCell: {
    padding: "12px 14px",
    fontSize: 14,
    color: "#1f2937",
    verticalAlign: "top",
  },

  cellText: { marginBottom: 8, color: "#1f2937", fontSize: 14 },
  inlineInput: {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #e6edf3",
    fontSize: 13,
    background: "#fbfdff",
  },

  // tiny responsiveness
  "@media small": { tableContainer: { padding: 8 } },
};

/* local UI for TagInput used in scene editor */
const localUI = {
  tagWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    padding: 8,
    borderRadius: 8,
    border: "1px solid #e6edf3",
    minHeight: 44,
    background: "#fff",
  },
  tag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 8px",
    background: "linear-gradient(180deg,#f3f6f8,#fff)",
    borderRadius: 999,
    border: "1px solid #e6edf3",
    fontSize: 13,
  },
  tagX: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "#6b7280",
    fontWeight: 700,
  },
  tagInput: {
    border: "none",
    outline: "none",
    minWidth: 140,
    padding: "6px 4px",
    fontSize: 14,
    background: "transparent",
  },
};

/* inject spinner keyframes (only once) */
(function injectKeyframes() {
  try {
    const rule = `@keyframes spin { 0% { transform: rotate(0deg) } 100% { transform: rotate(360deg) } }`;
    const s = document.createElement("style");
    s.appendChild(document.createTextNode(rule));
    document.head.appendChild(s);
  } catch (e) {
    // ignore
  }
})();

export default ScriptBreakdownNew;
