import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ProjectHeader from '../components/ProjectHeader';
import { getApiUrl } from '../utils/api';

const ScriptBreakdown = () => {
    const { user, id } = useParams();
    const [scriptBreakdown, setScriptBreakdown] = useState([]);
    const [originalBreakdown, setOriginalBreakdown] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRetrieving, setIsRetrieving] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    
    const parseTSV = (tsvText) => {
      const lines = tsvText.split('\n');
      const headers = lines[0].split('\t').map(header => header.trim());
      const rows = lines.slice(1).filter(line => line.trim() !== '').map(line => {
          const values = line.split('\t').map(value => value.trim());
          return headers.reduce((obj, header, index) => {
              obj[header] = values[index] || '';
              return obj;
          }, {});
      });
      return rows;
    };

    const fetchBreakdown = async () => {
        try {
            setIsLoading(true);
            setError(null);
            setIsRetrieving(false);
            
            const response = await fetch(getApiUrl(`/api/${id}/fetch-breakdown`), {
                method: 'GET',
                mode: 'cors',
            });
            
            if (!response.ok) {
                if (response.status === 404 || response.status === 202 || response.status === 204) {
                    setIsRetrieving(true);
                    setIsLoading(false);
                    return;
                }
            }
            
            const data = await response.json();
            const parsedData = parseTSV(data.tsv_content);
            const dataWithPageEighths = addPageEighthsColumn(parsedData);
            setScriptBreakdown(dataWithPageEighths);
            setOriginalBreakdown(JSON.parse(JSON.stringify(dataWithPageEighths))); // Deep copy
            setHasChanges(false);
        } catch (error) {
            console.error('Error fetching breakdown:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCellChange = (rowIndex, columnKey, newValue) => {
        const updatedBreakdown = [...scriptBreakdown];
        updatedBreakdown[rowIndex][columnKey] = newValue;
        setScriptBreakdown(updatedBreakdown);
        
        // Check if there are changes
        const hasChanges = JSON.stringify(updatedBreakdown) !== JSON.stringify(originalBreakdown);
        setHasChanges(hasChanges);
    };

    const handlePageEighthsChange = (rowIndex, increment, position) => {
        const updatedBreakdown = [...scriptBreakdown];
        const currentValue = updatedBreakdown[rowIndex]['Page Eighths'] || '';
        
        // Parse current value - convert from total eighths to mixed fraction
        const totalEighths = parseInt(currentValue) || 0;
        let wholeValue = Math.floor(totalEighths / 8);
        let eighthsValue = totalEighths % 8;
        
        if (position === 'first') {
            if (increment) {
                wholeValue += 1;
            } else {
                wholeValue -= 1;
                if (wholeValue < 0) wholeValue = 0;
            }
        } else { // position === 'second'
            if (increment) {
                eighthsValue += 1;
                // If eighths reach 8, convert to whole number
                if (eighthsValue >= 8) {
                    wholeValue += 1;
                    eighthsValue = 0;
                }
            } else {
                eighthsValue -= 1;
                // If eighths go below 0, borrow from whole number
                if (eighthsValue < 0 && wholeValue > 0) {
                    wholeValue -= 1;
                    eighthsValue = 7;
                } else if (eighthsValue < 0) {
                    eighthsValue = 0;
                }
            }
        }
        
        // Convert back to total eighths for storage (x*8 + y)
        let newValue = '';
        if (wholeValue > 0 || eighthsValue > 0) {
            newValue = (wholeValue * 8 + eighthsValue).toString();
        }
        
        updatedBreakdown[rowIndex]['Page Eighths'] = newValue;
        setScriptBreakdown(updatedBreakdown);
        
        // Check if there are changes
        const hasChanges = JSON.stringify(updatedBreakdown) !== JSON.stringify(originalBreakdown);
        setHasChanges(hasChanges);
    };

    // Helper function to convert total eighths to mixed fraction display
    const parsePageEighths = (value) => {
        if (!value) return { whole: 0, eighths: 0 };
        const totalEighths = parseInt(value) || 0;
        return {
            whole: Math.floor(totalEighths / 8),
            eighths: totalEighths % 8
        };
    };

    // Add function to insert Page Eighths column after Time column
    const addPageEighthsColumn = (data) => {
        if (data.length === 0) return data;
        
        // Check if Page Eighths column already exists
        const firstRow = data[0];
        if (firstRow.hasOwnProperty('Page Eighths')) {
            return data;
        }
        
        // Find the Time column
        const timeColumnKey = Object.keys(firstRow).find(key => 
            key.toLowerCase().includes('time') || 
            key.toLowerCase() === 'time'
        );
        
        if (!timeColumnKey) {
            // If no Time column found, add Page Eighths at the end
            return data.map(row => ({
                ...row,
                'Page Eighths': ''
            }));
        }
        
        // Insert Page Eighths after Time column
        return data.map(row => {
            const entries = Object.entries(row);
            const timeIndex = entries.findIndex(([key]) => key === timeColumnKey);
            
            if (timeIndex === -1) {
                return { ...row, 'Page Eighths': '' };
            }
            
            const beforeTime = entries.slice(0, timeIndex + 1);
            const afterTime = entries.slice(timeIndex + 1);
            
            return Object.fromEntries([
                ...beforeTime,
                ['Page Eighths', ''],
                ...afterTime
            ]);
        });
    };

    const convertToTSV = (data) => {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const headerRow = headers.join('\t');
        const dataRows = data.map(row => 
            headers.map(header => row[header] || '').join('\t')
        );
        
        return [headerRow, ...dataRows].join('\n');
    };

    const saveChanges = async () => {
        try {
            setIsSaving(true);
            setError(null);
            
            const tsvContent = convertToTSV(scriptBreakdown);
            
            const response = await fetch(getApiUrl(`/api/${id}/update-breakdown`), { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tsv_content: tsvContent
                }),
                mode: 'cors',
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save changes');
            }
            
            // Update original breakdown to reflect saved state
            setOriginalBreakdown(JSON.parse(JSON.stringify(scriptBreakdown)));
            setHasChanges(false);
            setIsEditMode(false); // Exit edit mode after successful save
            
            // Show success message briefly
            setError('Changes saved successfully!');
            setTimeout(() => setError(null), 3000);
            
        } catch (error) {
            console.error('Error saving changes:', error);
            setError(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const discardChanges = () => {
        setScriptBreakdown(JSON.parse(JSON.stringify(originalBreakdown)));
        setHasChanges(false);
        setIsEditMode(false);
    };

    const toggleEditMode = () => {
        if (isEditMode && hasChanges) {
            // If exiting edit mode with unsaved changes, ask for confirmation
            if (window.confirm('You have unsaved changes. Do you want to discard them?')) {
                discardChanges();
            }
        } else {
            setIsEditMode(!isEditMode);
        }
    };

    // Add this function to auto-resize textarea
    const autoResizeTextarea = (textarea) => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.max(32, textarea.scrollHeight) + 'px';
    };

    // Update the getSceneCounts function
    const getSceneCounts = () => {
        if (scriptBreakdown.length === 0) return { total: 0, int: 0, ext: 0, intExt: 0 };
        
        // Look specifically for the "Int./Ext." column
        const intExtColumn = Object.keys(scriptBreakdown[0]).find(key => 
            key.toLowerCase().includes('int./ext.') || 
            key.toLowerCase().includes('int/ext') ||
            key.toLowerCase() === 'int./ext.' ||
            key.toLowerCase() === 'int/ext'
        );
        
        if (!intExtColumn) {
            // If no Int./Ext. column found, return just total
            return {
                total: scriptBreakdown.length,
                int: 0,
                ext: 0,
                intExt: 0
            };
        }
        
        let intCount = 0;
        let extCount = 0;
        let intExtCount = 0;
        
        scriptBreakdown.forEach(row => {
            const intExtValue = (row[intExtColumn] || '').toLowerCase().trim();
            
            if (intExtValue.includes('int/ext') || intExtValue.includes('int./ext.') || intExtValue.includes('i/e') || intExtValue.includes('e/i') || intExtValue.includes('ext./int') || intExtValue.includes('ext/int')) {
                intExtCount++;
            } else if (intExtValue.includes('int.') || intExtValue === 'int') {
                intCount++;
            } else if (intExtValue.includes('ext.') || intExtValue === 'ext') {
                extCount++;
            }
        });
        
        return {
            total: scriptBreakdown.length,
            int: intCount,
            ext: extCount,
            intExt: intExtCount
        };
    };

    // Simplified Excel export using CSV format (opens in Excel)
    const exportToExcel = () => {
        if (scriptBreakdown.length === 0) {
            alert('No data to export');
            return;
        }
        
        // Convert to CSV format (which Excel can open)
        const headers = Object.keys(scriptBreakdown[0]);
        const csvContent = [
            headers.join(','),
            ...scriptBreakdown.map(row => 
                headers.map(header => {
                    const value = row[header] || '';
                    // Escape commas and quotes in CSV
                    return value.includes(',') || value.includes('"') 
                        ? `"${value.replace(/"/g, '""')}"` 
                        : value;
                }).join(',')
            )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `script-breakdown-${id}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    useEffect(() => {
        fetchBreakdown();
    }, [id]);

    return (
        <div style={styles.pageContainer}>
            <ProjectHeader />
            <div style={styles.header}>
                <div>
                    <h2 style={styles.pageTitle}>Script Breakdown</h2>
                </div>
                <div style={styles.buttonGroup}>
                    {!isEditMode ? (
                        <>
                            <button 
                                onClick={exportToExcel}
                                style={styles.excelButton}
                                disabled={isLoading || isRetrieving || scriptBreakdown.length === 0}
                            >
                                Export to Excel
                            </button>
                            <button 
                                onClick={toggleEditMode}
                                style={styles.editButton}
                                disabled={isLoading || isRetrieving}
                            >
                                Edit
                            </button>
                        </>
                    ) : (
                        <>
                            <button 
                                onClick={discardChanges}
                                style={styles.discardButton}
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={saveChanges}
                                style={isSaving ? styles.buttonDisabled : styles.saveButton}
                                disabled={isSaving || !hasChanges}
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </>
                    )}
                </div>
            </div>
            <div style={styles.mainContent}>
                <div style={styles.contentArea}>
                    {isLoading ? (
                        <div style={styles.message}>Loading breakdown...</div>
                    ) : isRetrieving ? (
                        <div style={styles.retrievingMessage}>Retrieval in progress...</div>
                    ) : error && !error.includes('successfully') ? (
                        <div style={styles.errorMessage}>{error}</div>
                    ) : error && error.includes('successfully') ? (
                        <div style={styles.successMessage}>{error}</div>
                    ) : scriptBreakdown.length === 0 ? (
                        <div style={styles.message}>No breakdown data available</div>
                    ) : (
                        <>
                            <div style={styles.sceneCount}>
                                <span>Total Scenes: {getSceneCounts().total}</span>
                                <span>INT.: {getSceneCounts().int}</span>
                                <span>EXT.: {getSceneCounts().ext}</span>
                                <span>INT/EXT.: {getSceneCounts().intExt}</span>
                            </div>
                            <div style={styles.tableContainer}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            {Object.keys(scriptBreakdown[0]).map((header, index) => (
                                                <th key={index} style={styles.tableHeader}>
                                                    {header}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {scriptBreakdown.map((row, rowIndex) => (
                                            <tr key={rowIndex} style={styles.tableRow}>
                                                {Object.entries(row).map(([columnKey, cellValue], cellIndex) => (
                                                    <td key={cellIndex} style={styles.tableCell}>
                                                        {isEditMode ? (
                                                            columnKey === 'Page Eighths' ? (
                                                                <div style={styles.pageEighthsContainer}>
                                                                    <button
                                                                        onClick={() => handlePageEighthsChange(rowIndex, false, 'first')}
                                                                        style={styles.pageEighthsButton}
                                                                        type="button"
                                                                    >
                                                                        -
                                                                    </button>
                                                                    <span style={styles.pageEighthsValue}>
                                                                        {parsePageEighths(cellValue).whole}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => handlePageEighthsChange(rowIndex, true, 'first')}
                                                                        style={styles.pageEighthsButton}
                                                                        type="button"
                                                                    >
                                                                        +
                                                                    </button>
                                                                    
                                                                    <button
                                                                        onClick={() => handlePageEighthsChange(rowIndex, false, 'second')}
                                                                        style={styles.pageEighthsButton}
                                                                        type="button"
                                                                    >
                                                                        -
                                                                    </button>
                                                                    <span style={styles.pageEighthsValue}>
                                                                        {parsePageEighths(cellValue).eighths}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => handlePageEighthsChange(rowIndex, true, 'second')}
                                                                        style={styles.pageEighthsButton}
                                                                        type="button"
                                                                    >
                                                                        +
                                                                    </button>
                                                                    
                                                                    <span style={styles.pageEighthsSlash}>/8</span>
                                                                </div>
                                                            ) : cellValue && cellValue.length > 50 ? (
                                                                <textarea
                                                                    value={cellValue}
                                                                    onChange={(e) => {
                                                                        handleCellChange(rowIndex, columnKey, e.target.value);
                                                                        autoResizeTextarea(e.target);
                                                                    }}
                                                                    onInput={(e) => autoResizeTextarea(e.target)}
                                                                    style={styles.cellTextarea}
                                                                    rows={1}
                                                                />
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    value={cellValue}
                                                                    onChange={(e) => handleCellChange(rowIndex, columnKey, e.target.value)}
                                                                    style={styles.cellInput}
                                                                />
                                                            )
                                                        ) : (
                                                            <span style={styles.cellText}>
                                                                {columnKey === 'Page Eighths' && cellValue ? 
                                                                    `${parsePageEighths(cellValue).whole} ${parsePageEighths(cellValue).eighths}/8` : 
                                                                    cellValue
                                                                }
                                                            </span>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const styles = {
  pageContainer: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 'calc(100vh - 60px)',
    backgroundColor: '#fff',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    borderBottom: '1px solid #eee',
    backgroundColor: '#fff',
  },
  mainContent: {
    display: 'flex',
    flexGrow: 1,
    height: 'calc(100vh - 120px)', // Adjust based on your header height
  },
  sidebar: {
    width: '250px',
    borderRight: '1px solid #eee',
    backgroundColor: '#f8f9fa',
    padding: '1rem',
    overflowY: 'auto',
  },
  scriptList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  scriptButton: {
    padding: '0.75rem 1rem',
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '0.9rem',
    color: '#333',
    transition: 'all 0.2s ease',
    width: '100%',
    '&:hover': {
      backgroundColor: '#f0f0f0',
      borderColor: '#ccc',
    },
  },
  scriptButtonActive: {
    backgroundColor: '#e6f3ff',
    borderColor: '#1a73e8',
    color: '#1a73e8',
  },
  contentArea: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '1rem',
    height: '100%',
    width: '100%',
    overflowX: 'auto',
  },
  projectTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    margin: 0,
    color: '#000',
  },
  pageTitle: {
    fontSize: '1.1rem',
    fontWeight: 'normal',
    margin: '0.25rem 0 0 0',
    color: '#555',
  },
  button: {
    padding: '0.6rem 1.2rem',
    backgroundColor: '#e0e0e0',
    color: '#333',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    fontWeight: '500',
    minWidth: '150px',
    textAlign: 'center',
  },
  buttonDisabled: {
    padding: '0.6rem 1.2rem',
    backgroundColor: '#f5f5f5',
    color: '#aaa',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'not-allowed',
    minWidth: '150px',
    textAlign: 'center',
    fontWeight: '500',
  },
  placeholder: {
    fontSize: '1rem',
    color: '#aaa',
  },
  statusMessage: {
    fontSize: '0.9rem',
    color: '#333',
    marginBottom: '1rem',
  },
  pdfViewer: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  tableContainer: {
    width: '100%',
    overflowX: 'auto',
    padding: '1rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    tableLayout: 'auto', // Allow table to adjust column widths automatically
  },
  tableHeader: {
    backgroundColor: '#f8f9fa',
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#333',
    borderBottom: '2px solid #dee2e6',
    position: 'sticky',
    top: 0,
    maxWidth: '200px',
    minWidth: '100px',
  },
  tableRow: {
    borderBottom: '1px solid #dee2e6',
    '&:hover': {
      backgroundColor: '#f8f9fa',
    },
  },
  tableCell: {
    padding: '4px 8px',
    fontSize: '0.9rem',
    color: '#333',
    verticalAlign: 'top',
    maxWidth: '200px', // Set a reasonable max width
    minWidth: '100px', // Ensure minimum width
  },
  message: {
    fontSize: '1rem',
    color: '#666',
    textAlign: 'center',
    padding: '2rem',
  },
  errorMessage: {
    fontSize: '1rem',
    color: '#dc3545',
    textAlign: 'center',
    padding: '2rem',
  },
  retrievingMessage: {
    fontSize: '1rem',
    color: '#007bff',
    textAlign: 'center',
    padding: '2rem',
    fontWeight: '500',
  },
  buttonGroup: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  editButton: {
    padding: '0.6rem 1.2rem',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    fontWeight: '500',
    minWidth: '80px',
    textAlign: 'center',
  },
  saveButton: {
    padding: '0.6rem 1.2rem',
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    fontWeight: '500',
    minWidth: '120px',
    textAlign: 'center',
  },
  discardButton: {
    padding: '0.6rem 1.2rem',
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    fontWeight: '500',
    minWidth: '80px',
    textAlign: 'center',
  },
  cellInput: {
    width: '100%',
    border: '1px solid #ddd',
    borderRadius: '3px',
    background: '#fff',
    padding: '6px 8px',
    fontSize: '0.9rem',
    color: '#333',
    outline: 'none',
    minWidth: '100px',
    maxWidth: '300px', // Allow input to grow up to this width
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease',
    resize: 'none', // Prevent manual resizing
    wordWrap: 'break-word',
    whiteSpace: 'pre-wrap', // Preserve line breaks and wrap text
    overflow: 'hidden',
    // Auto-adjust height based on content
    minHeight: '32px',
    lineHeight: '1.4',
  },
  cellText: {
    display: 'block',
    padding: '6px 8px',
    fontSize: '0.9rem',
    color: '#333',
    minHeight: '20px',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap', // Allow text wrapping in view mode too
    lineHeight: '1.4',
  },
  successMessage: {
    fontSize: '1rem',
    color: '#28a745',
    textAlign: 'center',
    padding: '2rem',
    fontWeight: '500',
  },
  cellTextarea: {
    width: '100%',
    border: '1px solid #ddd',
    borderRadius: '3px',
    background: '#fff',
    padding: '6px 8px',
    fontSize: '0.9rem',
    color: '#333',
    outline: 'none',
    minWidth: '150px',
    maxWidth: '400px',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease',
    resize: 'vertical',
    wordWrap: 'break-word',
    whiteSpace: 'pre-wrap',
    overflow: 'hidden',
    minHeight: '32px',
    lineHeight: '1.4',
    fontFamily: 'inherit',
  },
  sceneCount: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: '2rem',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#333',
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #eee',
    marginBottom: '0.5rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px 4px 0 0',
  },
  excelButton: {
    padding: '0.6rem 1.2rem',
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    fontWeight: '500',
    minWidth: '130px',
    textAlign: 'center',
  },
  pageEighthsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    justifyContent: 'center',
    width: '100%',
  },
  pageEighthsButton: {
    width: '20px',
    height: '20px',
    border: '1px solid #007bff',
    borderRadius: '3px',
    backgroundColor: '#007bff',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease',
    padding: '0',
    outline: 'none',
  },
  pageEighthsValue: {
    minWidth: '20px',
    textAlign: 'center',
    fontSize: '0.9rem',
    color: '#333',
    fontWeight: '500',
  },
  pageEighthsSlash: {
    fontSize: '0.9rem',
    color: '#333',
    fontWeight: '500',
    marginLeft: '2px',
  },
};

export default ScriptBreakdown;
