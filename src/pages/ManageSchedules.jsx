import ProjectHeader from '../components/ProjectHeader'
import { useNavigate, useParams } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'

const formatScheduleData = (scheduleText) => {
    const lines = scheduleText.split('\n').filter(line => line.trim());
    const headers = lines[1].split('\t');
    const data = lines.slice(2).map(line => {
        const values = line.split('\t');
        return headers.reduce((obj, header, index) => {
            obj[header.trim()] = values[index] || '';
            return obj;
        }, {});
    });

    // Group scenes by date
    const groupedByDate = data.reduce((acc, scene) => {
        const date = scene['Date'];
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(scene);
        return acc;
    }, {});

    return groupedByDate;
};

const SceneRow = ({ scene }) => (
    <tr style={styles.sceneRow}>
        <td style={styles.sceneCell}>{scene['Scene Number']}</td>
        <td style={styles.sceneCell}>{`${scene['INT/EXT']}\n${scene['Day/Night']}`}</td>
        <td style={styles.locationCell}>
            <div style={styles.locationTitle}>{scene['Location']}</div>
            <div style={styles.synopsis}>{scene['Synopsis']}</div>
        </td>
        <td style={styles.castCell}>{scene['Cast ID']}</td>
        <td style={styles.pagesCell}>{scene['Pages']}</td>
        <td style={styles.notesCell}>{scene['Notes']}</td>
    </tr>
);

const DateGroup = ({ index, date, scenes }) => (
    <div style={styles.dateGroup}>
        <h4 style={styles.dateHeader}>Day {index + 1}: {date}</h4>
        <table style={styles.scenesTable}>
            <thead>
                <tr style={styles.tableHeader}>
                    <th style={styles.headerCell}>Scene No.</th>
                    <th style={styles.headerCell}>Int./Ext.<br/>Day/Night</th>
                    <th style={styles.headerCell}>Location<br/>Synopsis</th>
                    <th style={styles.headerCell}>Cast ID</th>
                    <th style={styles.headerCell}>Pages</th>
                    <th style={styles.headerCell}>Notes</th>
                </tr>
            </thead>
            <tbody>
                {scenes.map((scene, index) => (
                    <SceneRow key={index} scene={scene} />
                ))}
            </tbody>
        </table>
    </div>
);

const ManageSchedules = () => {
    const navigate = useNavigate();
    const { user, id } = useParams();
    const [schedules, setSchedules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [scheduleDetails, setScheduleDetails] = useState(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [scheduleName, setScheduleName] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('');
    const [locations, setLocations] = useState([]);
    const [numScenesPerDay, setNumScenesPerDay] = useState('');
    const modalRef = useRef();

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

    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const response = await fetch(`/api/${id}/location-list`);
                if (!response.ok) {
                    throw new Error('Failed to fetch locations');
                }
                const data = await response.json();
                const locationLines = data.location_list.split('\n');
                const locationHeaders = locationLines[0].split('\t').map(header => header.trim());
                
                const parsedLocations = locationLines.slice(1)
                    .filter(line => line.trim() !== '')
                    .map(line => {
                        const values = line.split('\t');
                        return {
                            id: values[locationHeaders.indexOf('Location ID')],
                            name: values[locationHeaders.indexOf('Location Group Name')],
                        };
                    })
                    .filter(location => location.id && location.id.trim() !== 'None');

                setLocations(parsedLocations);
            } catch (error) {
                console.error('Error fetching locations:', error);
            }
        };

        fetchLocations();
    }, [id]);

    const handleCreateSchedule = () => {
        setShowModal(true);
    };

    const handleScheduleClick = async (name) => {
        try {
            setIsLoadingDetails(true);
            setSelectedSchedule(name);
            const response = await fetch(`/api/${id}/schedule/${name}`);
            if (!response.ok) {
                throw new Error('Failed to fetch schedule details');
            }
            const text = await response.text();
            setScheduleDetails(text);
        } catch (error) {
            console.error('Error fetching schedule details:', error);
            setError(error.message);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!numScenesPerDay || isNaN(numScenesPerDay) || numScenesPerDay <= 0) {
            setError('Please enter a valid number of scenes per day.');
            return;
        }
        try {
            const response = await fetch(`/api/${id}/schedule/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: scheduleName,
                    location: selectedLocation,
                    scenes_per_day: parseInt(numScenesPerDay),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create schedule');
            }

            setScheduleName('');
            setSelectedLocation('');
            setNumScenesPerDay('');
            setShowModal(false);

            const schedulesResponse = await fetch(`/api/${id}/schedules-list`);
            const data = await schedulesResponse.json();
            setSchedules(data);
        } catch (error) {
            console.error('Error creating schedule:', error);
            setError(error.message);
        }
    };

    const handleClickOutside = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            setShowModal(false);
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
                    onClick={handleCreateSchedule}
                    style={styles.createButton}
                >
                    Create Schedule
                </button>
            </div>
            <div style={styles.content}>
                <div style={styles.schedulesList}>
                    <div style={styles.sectionHeader}>SCHEDULES</div>
                    <div style={styles.list}>
                        {isLoading ? (
                            <div style={styles.message}>Loading schedules...</div>
                        ) : error ? (
                            <div style={styles.errorMessage}>{error}</div>
                        ) : schedules.length === 0 ? (
                            <div style={styles.message}>No schedules created yet</div>
                        ) : (
                            schedules.map((schedule) => (
                                <button
                                    key={schedule.name}
                                    style={styles.scheduleButton}
                                    onClick={() => handleScheduleClick(schedule.name)}
                                >
                                    <div style={styles.scheduleName}>
                                        {schedule.name.split('.')[0]}
                                    </div>
                                    <div style={styles.scheduleLocationId}>
                                        {schedule.location}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
                <div style={styles.centerSection}>
                    {isLoadingDetails ? (
                        <div style={styles.message}>Loading schedule details...</div>
                    ) : !selectedSchedule ? (
                        <p style={styles.centerText}>Select a schedule to view details</p>
                    ) : error ? (
                        <div style={styles.errorMessage}>{error}</div>
                    ) : scheduleDetails ? (
                        <div style={styles.scheduleDetails}>
                            <h3 style={styles.detailsHeader}>
                                {selectedSchedule.split('.')[0]}
                            </h3>
                            <div style={styles.detailsContent}>
                                {Object.entries(formatScheduleData(scheduleDetails)).map(([date, scenes], index) => (
                                    <DateGroup key={date} index={index} date={date} scenes={scenes} />
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
            
            {showModal && (
                <div style={styles.modalOverlay} onClick={handleClickOutside}>
                    <div style={styles.modal} ref={modalRef}>
                        <h3 style={styles.modalHeader}>Create New Schedule</h3>
                        <form onSubmit={handleSubmit} style={styles.form}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Schedule Name:</label>
                                <input
                                    type="text"
                                    value={scheduleName}
                                    onChange={(e) => setScheduleName(e.target.value)}
                                    style={styles.input}
                                    required
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Location:</label>
                                <select
                                    value={selectedLocation}
                                    onChange={(e) => setSelectedLocation(e.target.value)}
                                    style={styles.select}
                                    required
                                >
                                    <option value="">Select a location</option>
                                    {locations.map((location) => (
                                        <option key={location.id} value={location.name}>
                                            {location.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Number of Scenes Per Day:</label>
                                <input
                                    type="number"
                                    value={numScenesPerDay}
                                    onChange={(e) => setNumScenesPerDay(e.target.value)}
                                    style={styles.input}
                                    min="1"
                                    required
                                />
                            </div>
                            <div style={styles.buttonGroup}>
                                <button type="submit" style={styles.submitButton}>
                                    Create
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    style={styles.cancelButton}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

const tableStyles = {
    scheduleTable: {
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'monospace',
        fontSize: '0.9rem',
    },
    headerRow: {
        backgroundColor: '#f1f1f1',
        fontWeight: 'bold',
    },
    tableRow: {
        '&:nth-child(even)': {
            backgroundColor: '#f8f9fa',
        },
        '&:hover': {
            backgroundColor: '#f5f5f5',
        },
    },
    tableCell: {
        padding: '8px 12px',
        borderBottom: '1px solid #dee2e6',
        whiteSpace: 'nowrap',
    },
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
    createButton: {
        backgroundColor: '#4CAF50',
        color: 'white',
        padding: '8px 16px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: '500',
        '&:hover': {
            backgroundColor: '#45a049',
        }
    },
    content: {
        display: 'flex',
        flex: 1,
        margin: '20px',
        gap: '20px',
    },
    schedulesList: {
        width: '250px',
        border: '1px solid #ccc',
        backgroundColor: '#fff',
    },
    sectionHeader: {
        backgroundColor: '#ccc',
        padding: '10px',
        fontWeight: 'bold',
        borderBottom: '1px solid #999',
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
    },
    scheduleButton: {
        width: '100%',
        padding: '10px',
        backgroundColor: '#e0e0e0',
        border: 'none',
        borderBottom: '1px solid #fff',
        cursor: 'pointer',
        textAlign: 'left',
        display: 'block',
        '&:hover': {
            backgroundColor: '#d0d0d0',
        }
    },
    scheduleName: {
        fontWeight: 'bold',
        color: '#333',
    },
    scheduleLocationId: {
        fontSize: '0.8rem',
        color: '#666',
        marginTop: '4px',
    },
    scheduleDate: {
        fontSize: '0.8rem',
        color: '#666',
        marginTop: '4px',
    },
    centerSection: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '20px',
        backgroundColor: '#fff',
        minHeight: 'calc(100vh - 180px)',
    },
    centerText: {
        color: '#666',
        fontSize: '1rem',
    },
    message: {
        padding: '20px',
        textAlign: 'center',
        color: '#666',
    },
    errorMessage: {
        padding: '20px',
        textAlign: 'center',
        color: '#dc3545',
    },
    scheduleDetails: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    detailsHeader: {
        fontSize: '1.2rem',
        color: '#333',
        marginBottom: '20px',
        paddingBottom: '10px',
        borderBottom: '1px solid #eee',
    },
    detailsContent: {
        flex: 1,
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #dee2e6',
        overflowX: 'auto',
        maxHeight: 'calc(100vh - 250px)',
    },
    ...tableStyles,
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
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '20px',
        width: '400px',
        maxWidth: '90%',
    },
    modalHeader: {
        margin: '0 0 20px 0',
        color: '#333',
        fontSize: '1.2rem',
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
        fontSize: '0.9rem',
        color: '#555',
    },
    input: {
        padding: '8px 12px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '0.9rem',
    },
    select: {
        padding: '8px 12px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '0.9rem',
        backgroundColor: '#fff',
    },
    buttonGroup: {
        display: 'flex',
        gap: '10px',
        justifyContent: 'flex-end',
        marginTop: '10px',
    },
    submitButton: {
        backgroundColor: '#4CAF50',
        color: 'white',
        padding: '8px 16px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        '&:hover': {
            backgroundColor: '#45a049',
        },
    },
    cancelButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        padding: '8px 16px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        '&:hover': {
            backgroundColor: '#5a6268',
        },
    },
    dateGroup: {
        marginBottom: '30px',
    },
    dateHeader: {
        backgroundColor: '#f8f9fa',
        padding: '10px',
        margin: '0',
        borderBottom: '2px solid #dee2e6',
        fontSize: '1rem',
        fontWeight: '500',
    },
    scenesTable: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '5px',
    },
    tableHeader: {
        backgroundColor: '#f1f1f1',
    },
    headerCell: {
        padding: '8px',
        textAlign: 'left',
        borderBottom: '1px solid #dee2e6',
        fontSize: '0.9rem',
        fontWeight: '500',
    },
    sceneRow: {
        borderBottom: '1px solid #dee2e6',
        '&:hover': {
            backgroundColor: '#f8f9fa',
        },
    },
    sceneCell: {
        padding: '12px 8px',
        verticalAlign: 'top',
        fontSize: '0.9rem',
        whiteSpace: 'pre-line',
    },
    locationCell: {
        padding: '12px 8px',
        verticalAlign: 'top',
    },
    locationTitle: {
        fontWeight: '500',
        marginBottom: '4px',
    },
    synopsis: {
        fontSize: '0.9rem',
        color: '#666',
    },
    castCell: {
        padding: '12px 8px',
        verticalAlign: 'top',
        whiteSpace: 'nowrap',
    },
    pagesCell: {
        padding: '12px 8px',
        verticalAlign: 'top',
        textAlign: 'center',
    },
    notesCell: {
        padding: '12px 8px',
        verticalAlign: 'top',
        color: '#666',
        fontSize: '0.9rem',
    },
};

export default ManageSchedules