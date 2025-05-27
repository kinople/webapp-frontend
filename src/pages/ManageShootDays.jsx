import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ProjectHeader from '../components/ProjectHeader';

const ManageShootDays = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [schedules, setSchedules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSchedules = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(`/api/${id}/schedules-list`);
                if (!response.ok) {
                    throw new Error('Failed to fetch schedules');
                }
                const data = await response.json();
                setSchedules(data);
            } catch (error) {
                console.error('Error fetching schedules:', error);
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSchedules();
    }, [id]);

    const handleScheduleClick = async (scheduleName) => {
        try {
            const response = await fetch(`/api/${id}/schedule/${scheduleName}`);
            if (!response.ok) {
                throw new Error('Failed to fetch schedule data');
            }
            
            // Get the schedule data as text (TSV)
            const scheduleData = await response.text();
            
            // After getting the data, navigate to the call sheets page
            navigate(`/${id}/call-sheets/${scheduleName.replace('.schedule.tsv', '')}`, {
                state: { scheduleData } // Pass the schedule data to the next page
            });
        } catch (error) {
            console.error('Error fetching schedule data:', error);
            setError(error.message);
        }
    };

    return (
        <div style={styles.pageContainer}>
            <ProjectHeader />
            <div style={styles.content}>
                <h2 style={styles.title}>Call Sheets</h2>
                {isLoading ? (
                    <div style={styles.message}>Loading schedules...</div>
                ) : error ? (
                    <div style={styles.errorMessage}>{error}</div>
                ) : schedules.length === 0 ? (
                    <div style={styles.message}>No schedules available</div>
                ) : (
                    <div style={styles.schedulesContainer}>
                        {schedules.map((schedule, index) => (
                            <div 
                                key={index} 
                                style={styles.scheduleBox}
                                onClick={() => handleScheduleClick(schedule.name)}
                            >
                                <div style={styles.scheduleTitle}>
                                    {schedule.name.split('.')[0]}
                                </div>
                                <div style={styles.row}>
                                    <div style={styles.label}>Locations</div>
                                    <div style={styles.buttons}>
                                        <button 
                                            style={styles.numberButton}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            SYED HOUSE
                                        </button>
                                    </div>
                                </div>
                                <div style={styles.row}>
                                    <div style={styles.label}>Cast</div>
                                    <div style={styles.buttons}>
                                        <button 
                                            style={styles.numberButton}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            Alia Bhatt
                                        </button>
                                        <button 
                                            style={styles.numberButton}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            Vicky Kaushal
                                        </button>
                                        <button 
                                            style={styles.numberButton}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            Others
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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
    content: {
        display: 'flex',
        flexDirection: 'column',
        padding: '20px',
    },
    title: {
        fontSize: '1.1rem',
        fontWeight: 'normal',
        color: '#555',
        marginBottom: '40px',
    },
    schedulesContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '20px',
    },
    message: {
        textAlign: 'center',
        color: '#666',
        padding: '20px',
    },
    errorMessage: {
        textAlign: 'center',
        color: '#dc3545',
        padding: '20px',
    },
    scheduleBox: {
        width: 'fit-content',
        minWidth: '250px',
        backgroundColor: '#e0e0e0',
        padding: '15px 25px',
        cursor: 'pointer',
        '&:hover': {
            backgroundColor: '#d0d0d0',
        },
    },
    scheduleTitle: {
        textAlign: 'center',
        fontWeight: '500',
        marginBottom: '15px',
        fontSize: '1.1rem',
    },
    row: {
        display: 'flex',
        alignItems: 'flex-start',
        marginBottom: '10px',
        gap: '15px',
    },
    label: {
        width: '80px',
        fontWeight: '500',
        fontSize: '0.95rem',
    },
    buttons: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
    },
    numberButton: {
        minWidth: '24px',
        height: '24px',
        padding: '2px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        border: '1px solid #999',
        fontSize: '0.9rem',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        outline: 'none',
        '&:hover': {
            backgroundColor: '#f0f0f0',
        },
    },
};

export default ManageShootDays;