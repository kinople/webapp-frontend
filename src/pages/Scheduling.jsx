import React, { useState, useEffect } from 'react';
import ProjectHeader from '../components/ProjectHeader'
import { useNavigate, useParams } from 'react-router-dom'
import { getApiUrl } from '../utils/api';

const CreateScheduleModal = ({ onClose, onSubmit, projectId }) => {
    const [formData, setFormData] = useState({
        scheduleName: '',
        locationGroups: [],
        firstDate: '',
        lastDate: ''
    });
    const [locations, setLocations] = useState([]);
    const [loadingLocations, setLoadingLocations] = useState(true);

    useEffect(() => {
        const fetchLocations = async () => {
            try {
                setLoadingLocations(true);
                const response = await fetch(getApiUrl(`/api/${projectId}/locations`));
                if (!response.ok) {
                    throw new Error('Failed to fetch locations');
                }
                const data = await response.json();
                setLocations(data.locations || []);
            } catch (error) {
                console.error('Error fetching locations:', error);
                setLocations([]);
            } finally {
                setLoadingLocations(false);
            }
        };

        fetchLocations();
    }, [projectId]);

    const handleLocationChange = (locationId, isChecked) => {
        setFormData(prev => ({
            ...prev,
            locationGroups: isChecked 
                ? [...prev.locationGroups, locationId]
                : prev.locationGroups.filter(id => id !== locationId)
        }));
    };

    const getSelectedLocationNames = () => {
        return formData.locationGroups.map(id => {
            const location = locations.find(loc => loc.location_id === id);
            return location ? location.location : '';
        }).filter(name => name);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Schedule Name</label>
                        <input
                            type="text"
                            value={formData.scheduleName}
                            onChange={(e) => setFormData(prev => ({ ...prev, scheduleName: e.target.value }))}
                            style={styles.input}
                            required
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Location Groups</label>
                        {loadingLocations ? (
                            <div style={styles.loadingText}>Loading locations...</div>
                        ) : (
                            <div style={styles.locationsList}>
                                {locations.map((locationItem, index) => (
                                    <div key={index} style={styles.locationItem}>
                                        <input
                                            type="checkbox"
                                            id={`location-${index}`}
                                            checked={formData.locationGroups.includes(locationItem.location_id)}
                                            onChange={(e) => handleLocationChange(locationItem.location_id, e.target.checked)}
                                            style={styles.checkbox}
                                        />
                                        <label 
                                            htmlFor={`location-${index}`}
                                            style={styles.locationLabel}
                                        >
                                            {locationItem.location}
                                        </label>
                                    </div>
                                ))}
                                {locations.length === 0 && (
                                    <div style={styles.noLocations}>No locations available</div>
                                )}
                            </div>
                        )}
                        {formData.locationGroups.length > 0 && (
                            <div style={styles.selectedLocations}>
                                Selected: {getSelectedLocationNames().join(', ')}
                            </div>
                        )}
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>First date of shoot</label>
                        <input
                            type="date"
                            value={formData.firstDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, firstDate: e.target.value }))}
                            style={styles.dateInput}
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Last date of shoot</label>
                        <input
                            type="date"
                            value={formData.lastDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, lastDate: e.target.value }))}
                            style={styles.dateInput}
                        />
                    </div>

                    <div style={styles.buttonGroup}>
                        <button 
                            type="button" 
                            onClick={onClose}
                            style={styles.cancelButton}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            style={styles.addButton}
                            disabled={loadingLocations}
                        >
                            Add
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Scheduling = () => {
    const navigate = useNavigate();
    const { user, id } = useParams();
    const [schedules, setSchedules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        const fetchSchedules = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(getApiUrl(`/api/${id}/schedules`));
                if (!response.ok) {
                    throw new Error('Failed to fetch schedules');
                }
                const data = await response.json();
                
                // Handle the new API response structure
                if (data.schedules && Array.isArray(data.schedules)) {
                    setSchedules(data.schedules);
                } else if (data.message === 'No schedules found for this project') {
                    setSchedules([]);
                } else {
                    // Fallback for unexpected response format
                    setSchedules([]);
                }
            } catch (error) {
                console.error('Error fetching schedules:', error);
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSchedules();
    }, [id]);

    const handleCreateSchedule = async (formData) => {
        try {
            const response = await fetch(getApiUrl(`/api/${id}/create-schedule`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.scheduleName,
                    locationGroups: formData.locationGroups,
                    firstDate: formData.firstDate,
                    lastDate: formData.lastDate
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create schedule');
            }

            const newSchedule = await response.json();
            setSchedules(prev => [...prev, newSchedule]);
            setShowCreateModal(false);
        } catch (error) {
            console.error('Error creating schedule:', error);
            setError(error.message);
        }
    };

    const handleScheduleClick = (schedule) => {
        navigate(`/${user}/${id}/scheduling/${schedule.id}`);
    };

    const handleDeleteSchedule = async (e, scheduleId) => {
        e.stopPropagation(); // Prevent card click when clicking delete
        
        if (!confirm('Are you sure you want to delete this schedule? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(getApiUrl(`/api/${id}/schedule/${scheduleId}`), {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete schedule');
            }

            // Remove the schedule from the local state
            setSchedules(prev => prev.filter(schedule => schedule.id !== scheduleId));
        } catch (error) {
            console.error('Error deleting schedule:', error);
            setError(error.message);
        }
    };

    return (
        <div style={styles.pageContainer}>
            <ProjectHeader />
            <div style={styles.header}>
                <div>
                    <h2 style={styles.pageTitle}>Scheduling</h2>
                </div>
                <button 
                    style={styles.createButton}
                    onClick={() => setShowCreateModal(true)}
                    disabled={isLoading}
                >
                    Create Schedule
                </button>
            </div>
            <div style={styles.content}>
                {isLoading ? (
                    <div style={styles.message}>Loading schedules...</div>
                ) : error ? (
                    <div style={styles.errorMessage}>Error: {error}</div>
                ) : schedules.length === 0 ? (
                    <div style={styles.message}>
                        No schedules found. Click "Create Schedule" to get started.
                    </div>
                ) : (
                    <div style={styles.schedulesGrid}>
                        {schedules.map((schedule) => (
                            <div 
                                key={schedule.id} 
                                style={styles.scheduleCard}
                                onClick={() => handleScheduleClick(schedule)}
                            >
                                <div style={styles.scheduleHeader}>
                                    <h3 style={styles.scheduleName}>{schedule.name}</h3>
                                    <div style={styles.scheduleStatus}>{schedule.status}</div>
                                    <button
                                        style={styles.deleteButton}
                                        onClick={(e) => handleDeleteSchedule(e, schedule.id)}
                                        title="Delete Schedule"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div style={styles.scheduleContent}>
                                    <div style={styles.scheduleInfo}>
                                        <div style={styles.infoRow}>
                                            <span style={styles.infoLabel}>Locations:</span>
                                            <span style={styles.infoValue}>
                                                {Array.isArray(schedule.locations) && schedule.locations.length > 0
                                                    ? schedule.locations.length === 1 
                                                        ? schedule.locations[0]
                                                        : `${schedule.locations.length} locations`
                                                    : 'Not set'
                                                }
                                            </span>
                                        </div>
                                        <div style={styles.infoRow}>
                                            <span style={styles.infoLabel}>Characters:</span>
                                            <span style={styles.infoValue}>
                                                {Array.isArray(schedule.characters) && schedule.characters.length > 0
                                                    ? `${schedule.characters.length} characters`
                                                    : 'Not set'
                                                }
                                            </span>
                                        </div>
                                        <div style={styles.infoRow}>
                                            <span style={styles.infoLabel}>Duration:</span>
                                            <span style={styles.infoValue}>
                                                {schedule.first_date && schedule.last_date
                                                    ? `${schedule.first_date} to ${schedule.last_date}`
                                                    : 'Not set'
                                                }
                                            </span>
                                        </div>
                                        <div style={styles.infoRow}>
                                            <span style={styles.infoLabel}>Created:</span>
                                            <span style={styles.infoValue}>
                                                {new Date(schedule.created_at).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showCreateModal && (
                <CreateScheduleModal
                    onClose={() => setShowCreateModal(false)}
                    onSubmit={handleCreateSchedule}
                    projectId={id}
                />
            )}
        </div>
    )
}

const styles = {
    pageContainer: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
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
    createButton: {
        padding: '8px 16px',
        backgroundColor: '#e0e0e0',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        '&:disabled': {
            opacity: 0.6,
            cursor: 'not-allowed',
        }
    },
    content: {
        flex: 1,
        padding: '2rem',
    },
    schedulesGrid: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
    },
    scheduleCard: {
        width: '280px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        padding: '0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
        }
    },
    scheduleHeader: {
        backgroundColor: '#e0e0e0',
        padding: '12px 16px',
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px',
        textAlign: 'center',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    scheduleName: {
        margin: 0,
        fontSize: '16px',
        fontWeight: '500',
        color: '#333',
    },
    scheduleStatus: {
        fontSize: '12px',
        color: '#666',
        textTransform: 'capitalize',
        fontWeight: '400',
    },
    scheduleContent: {
        padding: '16px',
    },
    scheduleInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    infoRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        fontSize: '13px',
        lineHeight: '1.3',
    },
    infoLabel: {
        fontWeight: '500',
        color: '#555',
        minWidth: '70px',
    },
    infoValue: {
        color: '#333',
        textAlign: 'right',
        maxWidth: '65%',
        wordBreak: 'break-word',
        fontSize: '12px',
    },
    message: {
        textAlign: 'center',
        padding: '2rem',
        color: '#666',
        fontSize: '1.1rem',
    },
    errorMessage: {
        textAlign: 'center',
        padding: '2rem',
        color: '#dc3545',
        fontSize: '1.1rem',
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
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        width: '400px',
        maxWidth: '90vw',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        fontSize: '14px',
        fontWeight: '500',
        color: '#333',
    },
    input: {
        padding: '8px 12px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '14px',
        outline: 'none',
        '&:focus': {
            borderColor: '#007bff',
        }
    },
    dateInput: {
        padding: '8px 12px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '14px',
        outline: 'none',
        backgroundColor: 'white',
        cursor: 'pointer',
        '&:focus': {
            borderColor: '#007bff',
        }
    },
    buttonGroup: {
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end',
        marginTop: '8px',
    },
    cancelButton: {
        padding: '8px 16px',
        backgroundColor: '#e0e0e0',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
    },
    addButton: {
        padding: '8px 16px',
        backgroundColor: '#e0e0e0',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
    },
    locationsList: {
        maxHeight: '150px',
        overflowY: 'auto',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '8px',
        backgroundColor: '#fff',
    },
    locationItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 0',
        borderBottom: '1px solid #eee',
    },
    checkbox: {
        margin: '0',
        cursor: 'pointer',
    },
    locationLabel: {
        fontSize: '14px',
        cursor: 'pointer',
        flex: 1,
        color: '#333',
    },
    selectedLocations: {
        fontSize: '12px',
        color: '#666',
        marginTop: '8px',
        padding: '4px 8px',
        backgroundColor: '#f8f9fa',
        borderRadius: '3px',
        border: '1px solid #e9ecef',
    },
    noLocations: {
        fontSize: '14px',
        color: '#999',
        textAlign: 'center',
        padding: '12px',
        fontStyle: 'italic',
    },
    loadingText: {
        padding: '8px 12px',
        color: '#666',
        fontSize: '14px',
        fontStyle: 'italic',
    },
    deleteButton: {
        position: 'absolute',
        top: '8px',
        right: '8px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#dc3545',
        padding: '4px',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.2s',
        '&:hover': {
            backgroundColor: 'rgba(220, 53, 69, 0.1)',
        }
    },
};

export default Scheduling