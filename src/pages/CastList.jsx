import React, { useState, useEffect, useCallback } from 'react';
import ProjectHeader from '../components/ProjectHeader';
import { useParams } from 'react-router-dom';
import { getApiUrl } from '../utils/api';

const AddActorOptionModal = ({ onClose, onSubmit, optionForm, setOptionForm }) => {
    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSubmit(optionForm);
    };

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <h3>Add Actor Option</h3>
                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.formGroup}>
                        <label>Actor Name:</label>
                        <input
                            type="text"
                            value={optionForm.actorName}
                            onChange={(e) => setOptionForm(prev => ({
                                ...prev,
                                actorName: e.target.value
                            }))}
                            style={styles.input}
                            required
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label>Details:</label>
                        <textarea
                            value={optionForm.details}
                            onChange={(e) => setOptionForm(prev => ({
                                ...prev,
                                details: e.target.value
                            }))}
                            style={{...styles.input, minHeight: '60px'}}
                            placeholder=""
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label>Notes:</label>
                        <textarea
                            value={optionForm.notes}
                            onChange={(e) => setOptionForm(prev => ({
                                ...prev,
                                notes: e.target.value
                            }))}
                            style={{...styles.input, minHeight: '60px'}}
                            placeholder=""
                        />
                    </div>
                    <div style={styles.formButtons}>
                        <button type="submit" style={styles.submitButton}>
                            Add Option
                        </button>
                        <button 
                            type="button" 
                            onClick={onClose}
                            style={styles.cancelButton}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CastList = () => {
    const { user, id } = useParams();
    const [castData, setCastData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showScenesModal, setShowScenesModal] = useState(false);
    const [selectedCharacterScenes, setSelectedCharacterScenes] = useState([]);
    const [selectedCharacter, setSelectedCharacter] = useState(null);
    const [expandedOptions, setExpandedOptions] = useState(new Set());
    const [expandedScenes, setExpandedScenes] = useState(new Set());
    // Remove breakdownData state
    const [showAddOptionModal, setShowAddOptionModal] = useState(false);
    const [selectedCharacterIndex, setSelectedCharacterIndex] = useState(null);
    const [optionForm, setOptionForm] = useState({
        actorName: '',
        details: '',
        notes: ''
    });
    const [selectedOptions, setSelectedOptions] = useState(new Set());
    const [isSelectingMode, setIsSelectingMode] = useState(new Set());
    const [lockedOptions, setLockedOptions] = useState(new Set()); // Track locked options

    useEffect(() => {
        const fetchCastList = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(getApiUrl(`/api/${id}/cast-list`));
                if (!response.ok) {
                    throw new Error('Failed to fetch cast list');
                }
                const jsonData = await response.json();
                setCastData(jsonData);
                
                // Set all characters to show options by default
                const defaultExpandedOptions = new Set(jsonData.cast_list?.map((_, index) => index) || []);
                setExpandedOptions(defaultExpandedOptions);
                // Make sure scenes are not expanded by default
                setExpandedScenes(new Set());
            } catch (error) {
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCastList();
    }, [id]);

    // Remove the parseSceneBreakdowns function since it's no longer needed

    const handleScenesClick = (character, scenes) => {
        setSelectedCharacter(character);
        setSelectedCharacterScenes(scenes);
        setShowScenesModal(true);
    };

    const addActorOption = async (characterIndex, formData) => {
        try {
            setIsLoading(true);
            const character = castData.cast_list[characterIndex];
            const response = await fetch(getApiUrl(`/api/${id}/cast/add-option`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    character: character.character,
                    cast_id: character.cast_id,
                    ...formData
                })
            });

            if (!response.ok) {
                throw new Error('Failed to add actor option');
            }

            // Reset form and close modal
            setOptionForm({
                actorName: '',
                details: '',
                notes: ''
            });
            setShowAddOptionModal(false);

            // Refresh the cast list data
            const refreshResponse = await fetch(getApiUrl(`/api/${id}/cast-list`));
            if (!refreshResponse.ok) {
                throw new Error('Failed to refresh cast list');
            }
            const jsonData = await refreshResponse.json();
            setCastData(jsonData);
            
            // Maintain the expanded state
            setExpandedOptions(prev => new Set(prev));
            
        } catch (error) {
            console.error('Error adding actor option:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const removeActorOption = async (characterIndex, optionId) => {
        try {
            setIsLoading(true);
            const character = castData.cast_list[characterIndex];
            const response = await fetch(getApiUrl(`/api/${id}/cast/${character.cast_id}/options/${optionId}`), {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to remove actor option');
            }

            // Refresh the cast list data
            const refreshResponse = await fetch(getApiUrl(`/api/${id}/cast-list`));
            if (!refreshResponse.ok) {
                throw new Error('Failed to refresh cast list');
            }
            const jsonData = await refreshResponse.json();
            setCastData(jsonData);
            
            // Maintain the expanded state
            setExpandedOptions(prev => new Set(prev));
            
        } catch (error) {
            console.error('Error removing actor option:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Add the toggle lock function
    const toggleLockOption = useCallback(async (castIndex, optionId) => {
        try {
            const key = `${castIndex}-${optionId}`;
            const isCurrentlyLocked = lockedOptions.has(key);
            
            if (isCurrentlyLocked) {
                // Unlock this option
                setLockedOptions(prev => {
                    const next = new Set(prev);
                    next.delete(key);
                    return next;
                });
            } else {
                // Lock this option (and unlock any other locked option for this cast member)
                setLockedOptions(prev => {
                    const next = new Set(prev);
                    // Remove any existing locks for this cast member
                    Array.from(prev).forEach(lockedKey => {
                        if (lockedKey.startsWith(`${castIndex}-`)) {
                            next.delete(lockedKey);
                        }
                    });
                    // Add the new lock
                    next.add(key);
                    return next;
                });
            }

            // Here you would typically make an API call to update the lock status
            // await fetch(getApiUrl(`/api/${id}/cast/${member.cast_id}/options/${optionId}/lock`), {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ locked: !isCurrentlyLocked })
            // });

        } catch (error) {
            console.error('Error toggling lock:', error);
        }
    }, [lockedOptions]);

    return (
        <div style={styles.pageContainer}>
            <ProjectHeader />
            <div style={styles.mainContent}>
                <div style={styles.contentArea}>
                    {isLoading ? (
                        <div style={styles.message}>Loading cast list...</div>
                    ) : error ? (
                        <div style={styles.errorMessage}>{error}</div>
                    ) : !castData || castData.cast_list.length === 0 ? (
                        <div style={styles.message}>No cast members found</div>
                    ) : (
                        <>
                            <div style={styles.scriptInfo}>
                                <h2>Cast List - {castData.project_name}</h2>
                                <p>Total Characters: {castData.total_characters}</p>
                            </div>

                            {castData.cast_list.map((member, index) => (
                                <div key={index} style={styles.castMemberContainer}>
                                    <div style={styles.leftPanel}>
                                        <div style={styles.memberHeader}>
                                            <span style={styles.memberNumber}>{index + 1}</span>
                                            <span style={styles.memberName}>{member.character}</span>
                                        </div>
                                        
                                        <div style={styles.memberStats}>
                                            <div style={styles.sceneCount}>
                                                No. of Scenes 
                                                <button
                                                    onClick={() => handleScenesClick(member.character, member.scenes)}
                                                    style={styles.scenesButton}
                                                >
                                                    {member.scene_count}
                                                </button>
                                            </div>
                                            <div style={styles.memberInfo}>
                                                <div>Category: -</div>
                                                <div>Gender: {member.gender || '-'}</div>
                                                <div>Age: {member.age || '-'}</div>
                                            </div>
                                        </div>

                                        <div style={styles.viewButtons}>
                                            <button 
                                                style={{
                                                    ...styles.viewButton,
                                                    ...(expandedOptions.has(index) ? styles.activeViewButton : styles.inactiveViewButton)
                                                }}
                                                onClick={() => {
                                                    setExpandedOptions(prev => new Set(prev).add(index));
                                                    setExpandedScenes(prev => {
                                                        const next = new Set(prev);
                                                        next.delete(index);
                                                        return next;
                                                    });
                                                }}
                                            >
                                                View Options
                                            </button>
                                            <button 
                                                style={{
                                                    ...styles.viewButton,
                                                    ...(expandedScenes.has(index) ? styles.activeViewButton : styles.inactiveViewButton)
                                                }}
                                                onClick={() => {
                                                    setExpandedScenes(prev => new Set(prev).add(index));
                                                    setExpandedOptions(prev => {
                                                        const next = new Set(prev);
                                                        next.delete(index);
                                                        return next;
                                                    });
                                                }}
                                            >
                                                View Scenes
                                            </button>
                                        </div>
                                    </div>

                                    <div style={styles.rightPanel}>
                                        {!expandedScenes.has(index) ? (
                                            // Show character options table
                                            <>
                                                {expandedOptions.has(index) && (
                                                    <div style={styles.optionButtons}>
                                                        <button 
                                                            style={styles.button}
                                                            onClick={() => {
                                                                setSelectedCharacterIndex(index);
                                                                setShowAddOptionModal(true);
                                                            }}
                                                        >
                                                            Add Option
                                                        </button>
                                                        
                                                        <button 
                                                            style={{
                                                                ...styles.button,
                                                                backgroundColor: isSelectingMode.has(index) ? '#6c757d' : '#e0e0e0',
                                                                color: isSelectingMode.has(index) ? 'white' : 'black'
                                                            }}
                                                            onClick={() => {
                                                                if (!isSelectingMode.has(index)) {
                                                                    // Enter selection mode
                                                                    setIsSelectingMode(prev => new Set(prev).add(index));
                                                                } else {
                                                                    // In selection mode - remove selected options
                                                                    const selectedForCharacter = Array.from(selectedOptions)
                                                                        .filter(key => key.startsWith(`${index}-`))
                                                                        .map(key => key.split('-')[1]);
                                                                    
                                                                    if (selectedForCharacter.length === 0) {
                                                                        alert('Please select options to remove');
                                                                        return;
                                                                    }

                                                                    if (confirm(`Are you sure you want to remove ${selectedForCharacter.length} selected option(s)?`)) {
                                                                        selectedForCharacter.forEach(optionId => {
                                                                            removeActorOption(index, optionId);
                                                                        });
                                                                        // Clear selections and exit selecting mode
                                                                        setSelectedOptions(prev => {
                                                                            const next = new Set(prev);
                                                                            selectedForCharacter.forEach(optionId => {
                                                                                next.delete(`${index}-${optionId}`);
                                                                            });
                                                                            return next;
                                                                        });
                                                                        setIsSelectingMode(prev => {
                                                                            const next = new Set(prev);
                                                                            next.delete(index);
                                                                            return next;
                                                                        });
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            {!isSelectingMode.has(index) 
                                                                ? 'Remove Option' 
                                                                : `Remove Selected (${Array.from(selectedOptions).filter(key => key.startsWith(`${index}-`)).length})`
                                                            }
                                                        </button>
                                                        
                                                        {isSelectingMode.has(index) && (
                                                            <button 
                                                                style={styles.button}
                                                                onClick={() => {
                                                                    // Clear selections for this character and exit selecting mode
                                                                    setSelectedOptions(prev => {
                                                                        const next = new Set();
                                                                        prev.forEach(key => {
                                                                            if (!key.startsWith(`${index}-`)) {
                                                                                next.add(key);
                                                                            }
                                                                        });
                                                                        return next;
                                                                    });
                                                                    setIsSelectingMode(prev => {
                                                                        const next = new Set(prev);
                                                                        next.delete(index);
                                                                        return next;
                                                                    });
                                                                }}
                                                            >
                                                                Cancel
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                <table style={styles.table}>
                                                    <thead>
                                                        <tr>
                                                            {isSelectingMode.has(index) && <th>Select</th>}
                                                            <th>Actor Name</th>
                                                            <th>Details</th>
                                                            <th>Notes</th>
                                                            <th>Lock</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {member.cast_options && Object.keys(member.cast_options).length > 0 ? (
                                                            Object.entries(member.cast_options).map(([optionId, option], optionIndex) => {
                                                                const optionKey = `${index}-${optionId}`;
                                                                const isLocked = lockedOptions.has(optionKey);
                                                                const hasAnyLocked = Array.from(lockedOptions).some(key => key.startsWith(`${index}-`));
                                                                
                                                                return (
                                                                    <tr key={optionIndex} style={styles.tableRow}>
                                                                        {isSelectingMode.has(index) && (
                                                                            <td>
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={selectedOptions.has(optionKey)}
                                                                                    onChange={(e) => {
                                                                                        setSelectedOptions(prev => {
                                                                                            const next = new Set(prev);
                                                                                            if (e.target.checked) {
                                                                                                next.add(optionKey);
                                                                                            } else {
                                                                                                next.delete(optionKey);
                                                                                            }
                                                                                            return next;
                                                                                        });
                                                                                    }}
                                                                                />
                                                                            </td>
                                                                        )}
                                                                        <td>{option.actorName || option.actor_name || '-'}</td>
                                                                        <td>{option.details || '-'}</td>
                                                                        <td>{option.notes || '-'}</td>
                                                                        <td>
                                                                            <button
                                                                                onClick={() => toggleLockOption(index, optionId)}
                                                                                style={{
                                                                                    ...styles.lockButton,
                                                                                    ...(isLocked ? styles.lockedButton : {}),
                                                                                    opacity: (!isLocked && hasAnyLocked) ? 0.5 : 1,
                                                                                    cursor: (!isLocked && hasAnyLocked) ? 'not-allowed' : 'pointer'
                                                                                }}
                                                                                disabled={!isLocked && hasAnyLocked}
                                                                                title={isLocked ? 'Click to unlock' : hasAnyLocked ? 'Another option is locked' : 'Click to lock'}
                                                                            >
                                                                                {isLocked ? 'Locked' : 'Lock'}
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                        ) : (
                                                            <tr style={styles.tableRow}>
                                                                <td colSpan={isSelectingMode.has(index) ? "5" : "5"} style={{ textAlign: 'center', fontStyle: 'italic', color: '#666' }}>
                                                                    No actor options added yet
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </>
                                        ) : (
                                            // Show scenes table - simplified without breakdown data
                                            <table style={styles.table}>
                                                <thead>
                                                    <tr>
                                                        <th>Scene No.</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {member.scenes.map((sceneNumber, sceneIndex) => (
                                                        <tr key={sceneIndex} style={styles.tableRow}>
                                                            <td>{sceneNumber}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>

            {/* Scenes Modal */}
            {showScenesModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>
                                Scenes for {selectedCharacter}
                            </h3>
                            <button 
                                onClick={() => setShowScenesModal(false)}
                                style={styles.closeButton}
                            >
                                ×
                            </button>
                        </div>
                        <div style={styles.sceneListContainer}>
                            <div style={styles.sceneContent}>
                                {selectedCharacterScenes.length > 0 ? (
                                    <div>
                                        <strong>Scene Numbers:</strong>
                                        <br />
                                        {selectedCharacterScenes.join(', ')}
                                    </div>
                                ) : (
                                    'No scenes available'
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Option Modal */}
            {showAddOptionModal && (
                <AddActorOptionModal 
                    onClose={() => {
                        setShowAddOptionModal(false);
                        setSelectedCharacterIndex(null);
                        setOptionForm({
                            actorName: '',
                            details: '',
                            notes: ''
                        });
                    }}
                    onSubmit={async (formData) => {
                        try {
                            await addActorOption(selectedCharacterIndex, formData);
                        } catch (error) {
                            console.error('Error submitting form:', error);
                            setError(error.message);
                        }
                    }}
                    optionForm={optionForm}
                    setOptionForm={setOptionForm}
                />
            )}
        </div>
    );
};

const styles = {
    pageContainer: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#fff',
    },
    mainContent: {
        padding: '20px',
    },
    contentArea: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    actionButtons: {
        display: 'flex',
        gap: '10px',
        justifyContent: 'center',
        marginBottom: '20px',
    },
    button: {
        padding: '8px 16px',
        backgroundColor: '#e0e0e0',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    castMemberContainer: {
        display: 'flex',
        border: '1px solid #ccc',
        borderRadius: '4px',
        overflow: 'hidden',
        minHeight: 'fit-content',
        maxHeight: '400px',
    },
    leftPanel: {
        width: '250px',
        backgroundColor: '#f0f0f0',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        overflow: 'auto',
        minHeight: 'fit-content',
    },
    rightPanel: {
        flex: 1,
        padding: '20px',
        backgroundColor: '#fff',
        overflow: 'auto',
        minHeight: 'fit-content',
    },
    memberHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    memberNumber: {
        backgroundColor: '#fff',
        borderRadius: '50%',
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
    },
    memberName: {
        fontWeight: 'bold',
    },
    memberStats: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    sceneCount: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        alignItems: 'flex-start',
    },
    memberInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        fontSize: '0.9em',
        color: '#666',
    },
    viewButtons: {
        display: 'flex',
        gap: '10px',
    },
    viewButton: {
        padding: '8px 16px',
        borderRadius: '20px',
        cursor: 'pointer',
        flex: 1,
        textAlign: 'center',
        textDecoration: 'none',
        transition: 'all 0.3s ease',
        border: '1px solid #ccc',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        border: '1px solid #e0e0e0',
        backgroundColor: '#fff',
    },
    tableRow: {
        backgroundColor: '#fff',
        '&:hover': {
            backgroundColor: '#f5f5f5',
        }
    },
    message: {
        textAlign: 'center',
        padding: '2rem',
        color: '#666',
    },
    errorMessage: {
        textAlign: 'center',
        padding: '2rem',
        color: '#dc3545',
    },
    scenesButton: {
        padding: '4px 8px',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        minWidth: '40px',
        textAlign: 'center',
    },
    iconButton: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '16px',
        padding: '4px 8px',
        borderRadius: '4px',
        transition: 'background-color 0.2s',
        '&:hover': {
            backgroundColor: '#f0f0f0',
        }
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modal: {
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
    },
    modalTitle: {
        margin: 0,
        fontSize: '1.2rem',
        color: '#333',
    },
    closeButton: {
        background: 'none',
        border: 'none',
        fontSize: '1.5rem',
        cursor: 'pointer',
        color: '#666',
        padding: '4px 8px',
    },
    sceneListContainer: {
        overflowY: 'auto',
        maxHeight: 'calc(80vh - 100px)',
    },
    sceneContent: {
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        color: '#333',
        fontSize: '0.9rem',
        whiteSpace: 'pre-wrap',
        fontFamily: 'monospace',
    },
    scriptInfo: {
        textAlign: 'center',
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        border: '1px solid #e0e0e0',
    },
    optionsLink: {
        color: '#007bff',
        textDecoration: 'none',
        fontSize: '0.9em',
        '&:hover': {
            textDecoration: 'underline',
        },
    },
    activeViewButton: {
        backgroundColor: 'rgb(72, 77, 72)',
        color: '#fff',
        border: '1px solid rgb(72, 77, 72)',
    },
    inactiveViewButton: {
        backgroundColor: '#fff',
        color: '#333',
        border: '1px solid #ccc',
    },
    optionButtons: {
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
    },
    input: {
        padding: '8px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '14px',
    },
    formButtons: {
        display: 'flex',
        gap: '10px',
        justifyContent: 'flex-end',
        marginTop: '10px',
    },
    submitButton: {
        padding: '8px 16px',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    cancelButton: {
        padding: '8px 16px',
        backgroundColor: '#e0e0e0',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '8px',
        minWidth: '400px',
        maxWidth: '500px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
    },
    removeButton: {
        padding: '4px 8px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px',
        '&:hover': {
            backgroundColor: '#c82333',
        }
    },
    lockButton: {
        padding: '6px 12px',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9em',
        transition: 'all 0.2s',
    },
    lockedButton: {
        backgroundColor: '#4CAF50',
        color: 'white',
        border: '1px solid #4CAF50',
    },
};

export default CastList;