import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ProjectHeader from '../components/ProjectHeader';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const AddOptionModal = ({ onClose, onSubmit }) => {
    const [optionForm, setOptionForm] = useState({
        actorName: '',
        details: '',
    });
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [selectedDates, setSelectedDates] = useState([]);
    const [isFlexible, setIsFlexible] = useState(false);

    const formatDate = (date) => {
        if (!date) return '';
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const formattedDates = isFlexible ? "No constraint" : [
            ...selectedDates.map(date => formatDate(date)),
            ...(startDate && endDate ? [`${formatDate(startDate)} - ${formatDate(endDate)}`] : [])
        ].join(', ');

        const completeFormData = {
            ...optionForm,
            dates: formattedDates
        };

        await onSubmit(completeFormData);
    };

    const handleDateSelect = (date) => {
        if (!selectedDates.some(d => d.getTime() === date.getTime())) {
            setSelectedDates([...selectedDates, date]);
        }
    };

    const handleRemoveDate = (dateToRemove) => {
        setSelectedDates(selectedDates.filter(date => date.getTime() !== dateToRemove.getTime()));
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
                            style={{...styles.input, minHeight: '100px'}}
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.toggleContainer}>
                            <input
                                type="checkbox"
                                checked={isFlexible}
                                onChange={(e) => {
                                    setIsFlexible(e.target.checked);
                                    if (e.target.checked) {
                                        setSelectedDates([]);
                                        setStartDate(null);
                                        setEndDate(null);
                                    }
                                }}
                                style={styles.toggleInput}
                            />
                            <span style={styles.toggleLabel}>
                                Flexible Dates
                            </span>
                        </label>
                    </div>
                    {!isFlexible && (
                        <>
                            <div style={styles.formGroup}>
                                <label>Individual Dates:</label>
                                <DatePicker
                                    selected={null}
                                    onChange={handleDateSelect}
                                    dateFormat="MM/dd/yyyy"
                                    placeholderText="Click to select dates"
                                    style={styles.input}
                                    customInput={
                                        <input style={styles.input} />
                                    }
                                />
                                {selectedDates.length > 0 && (
                                    <div style={styles.selectedDates}>
                                        {selectedDates.map((date, index) => (
                                            <div key={index} style={styles.dateTag}>
                                                <span>{date.toLocaleDateString()}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveDate(date)}
                                                    style={styles.removeDate}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div style={styles.formGroup}>
                                <label>Date Range:</label>
                                <div style={styles.dateRangeContainer}>
                                    <DatePicker
                                        selected={startDate}
                                        onChange={(date) => setStartDate(date)}
                                        selectsStart
                                        startDate={startDate}
                                        endDate={endDate}
                                        dateFormat="MM/dd/yyyy"
                                        placeholderText="Start date"
                                        customInput={
                                            <input style={styles.dateRangeInput} />
                                        }
                                    />
                                    <span style={styles.dateRangeSeparator}>to</span>
                                    <DatePicker
                                        selected={endDate}
                                        onChange={(date) => setEndDate(date)}
                                        selectsEnd
                                        startDate={startDate}
                                        endDate={endDate}
                                        minDate={startDate}
                                        dateFormat="MM/dd/yyyy"
                                        placeholderText="End date"
                                        customInput={
                                            <input style={styles.dateRangeInput} />
                                        }
                                    />
                                </div>
                            </div>
                        </>
                    )}
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

const DateCalendarPopup = ({ dates, onClose }) => {
    console.log('Rendering calendar with dates:', dates); // For debugging

    const parseDates = (datesString) => {
        const individualDates = [];
        let dateRange = null;
        
        if (!datesString) return { individualDates, dateRange };

        const dateStrings = datesString.split(', ');
        dateStrings.forEach(dateStr => {
            if (dateStr.includes(' - ')) {
                const [start, end] = dateStr.split(' - ');
                dateRange = {
                    start: new Date(start),
                    end: new Date(end)
                };
            } else {
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                    individualDates.push(date);
                }
            }
        });

        return { individualDates, dateRange };
    };

    const { individualDates, dateRange } = parseDates(dates);

    return (
        <div style={styles.calendarOverlay} onClick={onClose}>
            <div style={styles.calendarContainer} onClick={e => e.stopPropagation()}>
                <div style={styles.calendarHeader}>
                    Selected Dates
                </div>
                <DatePicker
                    inline
                    readOnly
                    selected={null}
                    highlightDates={individualDates}
                    startDate={dateRange?.start}
                    endDate={dateRange?.end}
                    selectsRange={!!dateRange}
                    monthsShown={3}
                />
            </div>
        </div>
    );
};

const CastOptions = () => {
    const { id, castId } = useParams();
    const [characterData, setCharacterData] = useState(null);
    const [options, setOptions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddOptionModal, setShowAddOptionModal] = useState(false);
    const [calendarState, setCalendarState] = useState({ id: null, dates: null });
    const [lockedOption, setLockedOption] = useState(null);

    useEffect(() => {
        const fetchCastMember = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(`/api/${id}/cast-options/${castId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch cast member data');
                }
                const data = await response.json();
                
                // Parse the cast_list TSV (single line)
                const castFields = data.cast_list.split('\t').map(field => field.trim());
                const characterInfo = {
                    CastID: castFields[0] || '',
                    Name: castFields[1] || '',
                    NumberOfScenes: castFields[2] || '',
                };
                
                // Parse the cast_options TSV format
                const parsedOptions = data.cast_options.map(option => {
                    const [optionCastId, actorName, details, dates] = option.split('\t').map(field => field.trim());
                    return {
                        castId: optionCastId,
                        actorName,
                        details,
                        dates
                    };
                });
                
                setCharacterData(characterInfo);
                setOptions(parsedOptions);
            } catch (error) {
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCastMember();
    }, [id, castId]);

    const handleAddOption = async (formData) => {
        try {
            const response = await fetch(`/api/${id}/cast/${castId}/add-option`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Failed to add option');
            }

            // Refresh the cast member data
            const refreshResponse = await fetch(`/api/${id}/cast-options/${castId}`);
            if (!refreshResponse.ok) {
                throw new Error('Failed to refresh cast member data');
            }
            const data = await refreshResponse.json();
            const castFields = data.cast_list.split('\t').map(field => field.trim());
            const characterInfo = {
                CastID: castFields[0] || '',
                Name: castFields[1] || '',
                NumberOfScenes: castFields[2] || '',
            };
            
            // Parse the cast_options TSV format
            const parsedOptions = data.cast_options.map(option => {
                const [optionCastId, actorName, details, dates] = option.split('\t').map(field => field.trim());
                return {
                    castId: optionCastId,
                    actorName,
                    details,
                    dates
                };
            });
            
            setCharacterData(characterInfo);
            setOptions(parsedOptions);
            setShowAddOptionModal(false);
        } catch (error) {
            setError(error.message);
        }
    };

    const handleDeleteOption = async (actorName) => {
        try {
            const response = await fetch(`/api/${id}/cast/${castId}/remove-option`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ actor_name: actorName })
            });

            if (!response.ok) {
                throw new Error('Failed to delete option');
            }

            // Refresh the cast member data
            const refreshResponse = await fetch(`/api/${id}/cast-options/${castId}`);
            if (!refreshResponse.ok) {
                throw new Error('Failed to refresh cast member data');
            }
            const data = await refreshResponse.json();
            
            // Parse the cast_list TSV (single line)
            const castFields = data.cast_list.split('\t').map(field => field.trim());
            const characterInfo = {
                CastID: castFields[0] || '',
                Name: castFields[1] || '',
                NumberOfScenes: castFields[2] || '',
            };
            
            // Parse the cast_options TSV format
            const parsedOptions = data.cast_options.map(option => {
                const [optionCastId, actorName, details, dates] = option.split('\t').map(field => field.trim());
                return {
                    castId: optionCastId,
                    actorName,
                    details,
                    dates
                };
            });
            
            setCharacterData(characterInfo);
            setOptions(parsedOptions);
        } catch (error) {
            setError(error.message);
        }
    };
    
    return (
        <div style={styles.pageContainer}>
            <ProjectHeader />
            <div style={styles.header}>
                <div>
                    <h2 style={styles.pageTitle}>
                        {isLoading ? 'Loading...' : error ? 'Error' : `${characterData.Name} - Options`}
                    </h2>
                </div>
                <button onClick={() => setShowAddOptionModal(true)} style={styles.addButton}>
                    Add Option
                </button>
            </div>
            <div style={styles.content}>
                {isLoading ? (
                    <div style={styles.message}>Loading cast member details...</div>
                ) : error ? (
                    <div style={styles.errorMessage}>{error}</div>
                ) : !characterData ? (
                    <div style={styles.message}>No cast member found</div>
                ) : (
                    <div style={styles.optionsContainer}>
                        <div style={styles.characterInfo}>
                            <h3 style={styles.infoTitle}>Character Information</h3>
                            <div style={styles.infoGrid}>
                                {Object.entries(characterData).map(([key, value]) => (
                                    <div key={key} style={styles.infoRow}>
                                        <span style={styles.infoLabel}>{key}:</span>
                                        <span style={styles.infoValue}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div style={styles.optionsList}>
                            <h3 style={styles.infoTitle}>Character Options</h3>
                            <div style={styles.optionsTable}>
                                <div style={styles.tableHeader}>
                                    <div style={styles.headerCell} className="sno">S.No.</div>
                                    <div style={styles.headerCell} className="name">Actor Name</div>
                                    <div style={styles.headerCell} className="details">Details</div>
                                    <div style={styles.headerCell} className="dates">Dates</div>
                                    <div style={styles.headerCell} className="lock">Lock</div>
                                    <div style={styles.headerCell} className="actions">Actions</div>
                                </div>
                                {options.map((option, index) => (
                                    <div key={index} style={styles.tableRow}>
                                        <div style={styles.cell} className="sno">{index + 1}</div>
                                        <div style={styles.cell} className="name">{option.actorName}</div>
                                        <div style={styles.cell} className="details">{option.details}</div>
                                        <div style={styles.cell} className="dates">
                                            {option.dates.trim().toLowerCase() === "no constraint" ? (
                                                <span style={styles.flexibleText}>Flexible</span>
                                            ) : (
                                                <>
                                                    <button 
                                                        onClick={() => setCalendarState({ 
                                                            id: option.castId,
                                                            dates: option.dates
                                                        })}
                                                        style={styles.calendarButton}
                                                    >
                                                        📅
                                                    </button>
                                                    {calendarState.id === option.castId && (
                                                        <DateCalendarPopup 
                                                            dates={calendarState.dates}
                                                            onClose={() => setCalendarState({ id: null, dates: null })}
                                                        />
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        <div style={styles.cell} className="lock">
                                            <button
                                                onClick={() => {
                                                    setLockedOption(prev => prev === option.actorName ? null : option.actorName);
                                                }}
                                                style={{
                                                    ...styles.lockButton,
                                                    ...(lockedOption === option.actorName ? styles.lockedButton : {})
                                                }}
                                            >
                                                {lockedOption === option.actorName ? 'Locked' : 'Lock Actor'}
                                            </button>
                                        </div>
                                        <div style={styles.cell} className="actions">
                                            <button
                                                onClick={() => handleDeleteOption(option.actorName)}
                                                style={styles.deleteButton}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {showAddOptionModal && (
                <AddOptionModal 
                    onClose={() => setShowAddOptionModal(false)}
                    onSubmit={handleAddOption}
                />
            )}
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
    pageTitle: {
        fontSize: '1.1rem',
        fontWeight: 'normal',
        margin: '0.25rem 0 0 0',
        color: '#555',
    },
    content: {
        padding: '2rem',
        flexGrow: 1,
    },
    message: {
        textAlign: 'center',
        padding: '2rem',
        color: '#666',
        fontSize: '1rem',
    },
    errorMessage: {
        textAlign: 'center',
        padding: '2rem',
        color: '#dc3545',
        fontSize: '1rem',
    },
    optionsContainer: {
        maxWidth: '800px',
        margin: '0 auto',
        padding: '1rem',
    },
    addButton: {
        padding: '8px 16px',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9rem',
    },
    characterInfo: {
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '24px',
    },
    infoTitle: {
        fontSize: '1.1rem',
        marginBottom: '16px',
        color: '#333',
    },
    infoGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '16px',
    },
    infoRow: {
        display: 'flex',
        gap: '8px',
    },
    infoLabel: {
        fontWeight: '500',
        color: '#666',
    },
    infoValue: {
        color: '#333',
    },
    optionsList: {
        marginTop: '24px',
        backgroundColor: 'white',
        borderRadius: '4px',
        overflow: 'hidden',
    },
    optionsTable: {
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        overflow: 'hidden',
    },
    tableHeader: {
        display: 'grid',
        gridTemplateColumns: '80px 2fr 3fr 2fr 100px 100px',
        backgroundColor: '#f8f9fa',
        borderBottom: '2px solid #dee2e6',
        fontWeight: '500',
        '& .sno': { textAlign: 'center' },
        '& .lock': { textAlign: 'center' },
        '& .actions': { textAlign: 'center' },
    },
    headerCell: {
        padding: '12px 16px',
        color: '#495057',
        fontSize: '0.95em',
    },
    tableRow: {
        display: 'grid',
        gridTemplateColumns: '80px 2fr 3fr 2fr 100px 100px',
        borderBottom: '1px solid #dee2e6',
        '&:last-child': {
            borderBottom: 'none',
        },
        '&:hover': {
            backgroundColor: '#f8f9fa',
        },
        '& .sno': { textAlign: 'center' },
        '& .lock': { 
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
        },
        '& .actions': { 
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
        },
    },
    cell: {
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
    },
    deleteButton: {
        padding: '4px 12px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.8rem',
        '&:hover': {
            backgroundColor: '#c82333',
        },
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
    modalContent: {
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '8px',
        minWidth: '400px',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
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
    dateRangeContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    dateRangeInput: {
        padding: '8px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '14px',
        width: '120px',
    },
    dateRangeSeparator: {
        color: '#666',
    },
    selectedDates: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginTop: '8px',
    },
    dateTag: {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#e0e0e0',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '14px',
    },
    removeDate: {
        background: 'none',
        border: 'none',
        marginLeft: '4px',
        cursor: 'pointer',
        padding: '0 4px',
        fontSize: '16px',
        color: '#666',
    },
    formButtons: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
        marginTop: '20px',
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
    actorName: {
        fontSize: '1.1em',
        fontWeight: '500',
        marginBottom: '4px',
    },
    optionDetails: {
        color: '#666',
        fontSize: '0.9em',
        marginBottom: '4px',
    },
    optionDates: {
        color: '#888',
        fontSize: '0.9em',
        fontStyle: 'italic',
    },
    lockButton: {
        padding: '6px 12px',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9em',
        transition: 'all 0.2s',
        color: '#333',
        '&:hover': {
            backgroundColor: '#f0f0f0',
            borderColor: '#999',
        }
    },
    lockedButton: {
        backgroundColor: '#4CAF50',
        color: 'white',
        border: '1px solid #4CAF50',
        '&:hover': {
            backgroundColor: '#45a049',
            borderColor: '#45a049',
        }
    },
    calendarOverlay: {
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
    calendarContainer: {
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    },
    calendarButton: {
        background: 'none',
        border: 'none',
        padding: '4px 8px',
        cursor: 'pointer',
        color: '#0066cc',
        fontSize: '1.1rem',
        '&:hover': {
            opacity: 0.8,
        },
    },
    toggleContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
    },
    toggleInput: {
        cursor: 'pointer',
        width: '16px',
        height: '16px',
    },
    toggleLabel: {
        fontSize: '14px',
        color: '#333',
    },
    noConstraintMessage: {
        padding: '20px',
        textAlign: 'center',
        color: '#666',
        fontSize: '1rem',
        fontStyle: 'italic',
    },
    flexibleText: {
        color: '#666',
        fontStyle: 'italic',
        fontSize: '0.9rem',
    },
    calendarHeader: {
        padding: '0 0 15px 0',
        fontSize: '1rem',
        fontWeight: '500',
        color: '#333',
        textAlign: 'center',
        borderBottom: '1px solid #eee',
        marginBottom: '15px',
    },
};

export default CastOptions;