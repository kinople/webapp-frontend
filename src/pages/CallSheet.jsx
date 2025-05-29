import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ProjectHeader from '../components/ProjectHeader'
import { getApiUrl } from '../utils/api';

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

const CallSheetForm = ({ dayData, dayNumber, totalDays, scheduleName, groupedData }) => {
    const { user, id } = useParams();
    const [shootTimings, setShootTimings] = useState({
        shiftStart: '8:00 AM',
        shiftEnd: '8:00 PM',
        shootCall: '8:00 AM',
        crewCall: '7:00 AM'
    });
    const [isGenerating, setIsGenerating] = useState(false);

    const handleTimingChange = (field, value) => {
        setShootTimings(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Get the next day's scenes
    const getNextDayScenes = () => {
        const dates = Object.keys(groupedData);
        const currentDateIndex = dates.findIndex(date => groupedData[date] === dayData);
        if (currentDateIndex < dates.length - 1) {
            return groupedData[dates[currentDateIndex + 1]];
        }
        return [];
    };

    const nextDayScenes = getNextDayScenes();

    const handleGenerateCallSheet = async () => {
        try {
            setIsGenerating(true);
            const response = await fetch(getApiUrl(`/api/${id}/call-sheet/${scheduleName}`), {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error('Failed to generate call sheet');
            }

            // Get the filename from the Content-Disposition header, or use a default name
            const contentDisposition = response.headers.get('Content-Disposition');
            const filenameMatch = contentDisposition && contentDisposition.match(/filename="(.+)"/);
            const filename = filenameMatch ? filenameMatch[1] : `${scheduleName}_call_sheet.pdf`;

            // Convert the response to a blob
            const blob = await response.blob();
            
            // Create a URL for the blob
            const url = window.URL.createObjectURL(blob);
            
            // Create a temporary link element and trigger the download
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            
            // Clean up
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Error generating call sheet:', error);
            // You could add an error notification here
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div style={styles.callSheetForm}>
            <div style={styles.formHeader}>
                <div style={styles.logoSection}>
                    <div style={styles.uploadBox}>
                        Upload Logo
                    </div>
                </div>
                <div style={styles.crewCallSection}>
                    <div style={styles.crewCallTime}>
                        <div style={styles.crewCallCircle}>
                            <div>Crew Call</div>
                            <input
                                type="text"
                                value={shootTimings.crewCall}
                                onChange={(e) => handleTimingChange('crewCall', e.target.value)}
                                style={styles.crewCallInput}
                            />
                        </div>
                    </div>
                    <div style={styles.dateInfo}>
                        <div>Monday, 21st April, 2025</div>
                        <div>{scheduleName} (Day {dayNumber} of {totalDays})</div>
                    </div>
                </div>
            </div>

            <div style={styles.generateButtonContainer}>
                <button 
                    style={{
                        ...styles.generateButton,
                        ...(isGenerating && styles.generateButtonDisabled)
                    }} 
                    onClick={handleGenerateCallSheet}
                    disabled={isGenerating}
                >
                    {isGenerating ? 'Generating...' : 'Generate Call Sheet'}
                </button>
            </div>

            <table style={styles.infoTable}>
                <tbody>
                    <tr>
                        <td style={styles.infoCell}>
                            <table style={styles.crewTable}>
                                <thead>
                                    <tr>
                                        <th style={styles.crewTableHeader}>Position</th>
                                        <th style={styles.crewTableHeader}>Name</th>
                                        <th style={styles.crewTableHeader}>
                                            <div style={styles.timingInputsContainer}>
                                                <div style={styles.timingRow}>
                                                    <label>Shift Start:</label>
                                                    <input
                                                        type="text"
                                                        value={shootTimings.shiftStart}
                                                        onChange={(e) => handleTimingChange('shiftStart', e.target.value)}
                                                        style={styles.timeInput}
                                                    />
                                                </div>
                                                <div style={styles.timingRow}>
                                                    <label>Shift End:</label>
                                                    <input
                                                        type="text"
                                                        value={shootTimings.shiftEnd}
                                                        onChange={(e) => handleTimingChange('shiftEnd', e.target.value)}
                                                        style={styles.timeInput}
                                                    />
                                                </div>
                                                <div style={styles.timingRow}>
                                                    <label>Shoot Call:</label>
                                                    <input
                                                        type="text"
                                                        value={shootTimings.shootCall}
                                                        onChange={(e) => handleTimingChange('shootCall', e.target.value)}
                                                        style={styles.timeInput}
                                                    />
                                                </div>
                                                <div style={styles.locationInfo}>
                                                    <div>Location: Location 1</div>
                                                    <div>Address: Address 1</div>
                                                    <div>Directions:</div>
                                                </div>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                </tbody>
                            </table>
                        </td>
                        <td style={styles.weatherCell}>
                            <div>Weather:</div>
                            <div>Sunrise:</div>
                            <div>Sunset:</div>
                            <div>Breakfast:</div>
                            <div>Lunch:</div>
                            <div>Snacks:</div>
                            <div>Estimated Wrap:</div>
                        </td>
                    </tr>
                </tbody>
            </table>

            <div style={styles.sectionTitle}>Shooting Schedule</div>
            <table style={styles.scheduleTable}>
                <thead>
                    <tr>
                        <th>Scene No.</th>
                        <th>Int./Ext.<br/>Day/Night</th>
                        <th>Location<br/>Synopsis</th>
                        <th>Cast ID</th>
                        <th>Pages</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
                    {dayData.map((scene, index) => (
                        <tr key={index}>
                            <td>{scene['Scene Number']}</td>
                            <td>{scene['INT/EXT']}<br/>{scene['Day/Night']}</td>
                            <td>
                                {scene['Location']}<br/>
                                <span style={styles.synopsis}>{scene['Synopsis']}</span>
                            </td>
                            <td>{scene['Cast ID']}</td>
                            <td>{scene['Pages']}</td>
                            <td>{scene['Notes']}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div style={styles.sectionTitle}>Cast</div>
            <table style={styles.castTable}>
                <thead>
                    <tr>
                        <th>Cast ID</th>
                        <th>Character</th>
                        <th>Cast</th>
                        <th>Pick-up time</th>
                        <th>On Location</th>
                        <th>HMU + Wardrobe</th>
                        <th>On Set</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>1</td><td>Sehmat</td><td>Alia Bhatt</td><td></td><td></td><td></td><td></td><td></td>
                    </tr>
                    <tr>
                        <td>6</td><td>Iqbal</td><td>Vicky Kaushal</td><td></td><td></td><td></td><td></td><td></td>
                    </tr>
                    <tr>
                        <td>4</td><td>Syed</td><td>C3</td><td></td><td></td><td></td><td></td><td></td>
                    </tr>
                    <tr>
                        <td>5</td><td>Munira</td><td>C4</td><td></td><td></td><td></td><td></td><td></td>
                    </tr>
                    <tr>
                        <td>10</td><td>Abdul</td><td>C5</td><td></td><td></td><td></td><td></td><td></td>
                    </tr>
                    <tr>
                        <td>12</td><td>Mehboob</td><td>C6</td><td></td><td></td><td></td><td></td><td></td>
                    </tr>
                    <tr>
                        <td>34</td><td>Salma</td><td>C7</td><td></td><td></td><td></td><td></td><td></td>
                    </tr>
                </tbody>
            </table>

            <div style={styles.sectionTitle}>Requirements</div>
            <table style={styles.requirementsTable}>
                <thead>
                    <tr>
                        <th>Action Props</th>
                        <th>Other Props</th>
                        <th>Picture Vehicles</th>
                        <th>Wardrobe</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Quran, gift-wrapped parcel, envelope, sliding partition door, water glass, serving tray</td>
                        <td>Biryani, Music Player, Bed, Couch, Chairs, Desk, Cutlery, Dinnerware, Glassware, Tablecloth, Cutlery</td>
                        <td>Syed's Car</td>
                        <td>Ghoonghat, Embroidered Salwar Kurta, Kurta Pyjama</td>
                    </tr>
                </tbody>
            </table>

            <table style={styles.extrasTable}>
                <thead>
                    <tr>
                        <th>Extras</th>
                        <th>Set Dressing</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <div style={styles.extrasContent}>
                                Household Staff
                            </div>
                        </td>
                        <td>
                            Living Room Furnishings,<br/>
                            Decorative elements for<br/>
                            Syed's House including<br/>
                            Table & Chairs
                        </td>
                    </tr>
                </tbody>
            </table>

            <div style={styles.sectionTitle}>Crew Call Times</div>
            <div style={styles.crewCallContainer}>
                <table style={styles.crewCallTable}>
                    <thead>
                        <tr>
                            <th colSpan="3">Department 1</th>
                            <th colSpan="3">Department 2</th>
                        </tr>
                        <tr>
                            <th>Position</th>
                            <th>Name</th>
                            <th>Call Time</th>
                            <th>Position</th>
                            <th>Name</th>
                            <th>Call Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td></td><td></td><td></td>
                            <td></td><td></td><td></td>
                        </tr>
                        <tr>
                            <td></td><td></td><td></td>
                            <td></td><td></td><td></td>
                        </tr>
                    </tbody>
                </table>

                <table style={styles.crewCallTable}>
                    <thead>
                        <tr>
                            <th colSpan="3">Department 3</th>
                            <th colSpan="3">Department 4</th>
                        </tr>
                        <tr>
                            <th>Position</th>
                            <th>Name</th>
                            <th>Call Time</th>
                            <th>Position</th>
                            <th>Name</th>
                            <th>Call Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td></td><td></td><td></td>
                            <td></td><td></td><td></td>
                        </tr>
                        <tr>
                            <td></td><td></td><td></td>
                            <td></td><td></td><td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div style={styles.sectionTitle}>Advanced Shooting Schedule</div>
            <table style={styles.scheduleTable}>
                <thead>
                    <tr>
                        <th>Scene No.</th>
                        <th>Int./Ext.<br/>Day/Night</th>
                        <th>Location<br/>Synopsis</th>
                        <th>Cast ID</th>
                        <th>Pages</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
                    {nextDayScenes.map((scene, index) => (
                        <tr key={index}>
                            <td>{scene['Scene Number']}</td>
                            <td>{scene['INT/EXT']}<br/>{scene['Day/Night']}</td>
                            <td>
                                {scene['Location']}<br/>
                                <span style={styles.synopsis}>{scene['Synopsis']}</span>
                            </td>
                            <td>{scene['Cast ID']}</td>
                            <td>{scene['Pages']}</td>
                            <td>{scene['Notes']}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const CallSheet = () => {
    const { id, scheduleName } = useParams();
    const [scheduleData, setScheduleData] = useState(null);
    const [groupedData, setGroupedData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null);

    useEffect(() => {
        const fetchScheduleData = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(getApiUrl(`/api/${id}/schedule/${scheduleName}.schedule.tsv`));
                if (!response.ok) {
                    throw new Error('Failed to fetch schedule data');
                }
                const data = await response.text();
                setScheduleData(data);
                const grouped = formatScheduleData(data);
                setGroupedData(grouped);
            } catch (error) {
                console.error('Error fetching schedule data:', error);
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchScheduleData();
    }, [id, scheduleName]);

    return (
        <div style={styles.pageContainer}>
            <ProjectHeader />
            <div style={styles.content}>
                <h2 style={styles.title}>Call Sheets</h2>
                <div style={styles.mainContent}>
                    <div style={styles.sidebar}>
                        {isLoading ? (
                            <div style={styles.message}>Loading...</div>
                        ) : error ? (
                            <div style={styles.errorMessage}>{error}</div>
                        ) : (
                            Object.entries(groupedData).map(([date, scenes], index) => (
                                <button 
                                    key={date}
                                    style={styles.dayButton}
                                    onClick={() => setSelectedDay(date)}
                                >
                                    Day {index + 1} - {date}
                                </button>
                            ))
                        )}
                    </div>
                    <div style={styles.centerContent}>
                        {!selectedDay ? (
                            <div style={styles.message}>Click on a shoot day to view call sheet</div>
                        ) : (
                            <CallSheetForm 
                                dayData={groupedData[selectedDay]}
                                dayNumber={Object.keys(groupedData).indexOf(selectedDay) + 1}
                                totalDays={Object.keys(groupedData).length}
                                scheduleName={scheduleName}
                                groupedData={groupedData}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

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
    mainContent: {
        display: 'flex',
        flex: 1,
        gap: '20px',
    },
    sidebar: {
        width: '200px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    dayButton: {
        padding: '15px',
        textAlign: 'left',
        backgroundColor: '#e0e0e0',
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.9rem',
        '&:hover': {
            backgroundColor: '#d0d0d0',
        },
    },
    centerContent: {
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        display: 'flex',
        justifyContent: 'center',
    },
    message: {
        color: '#666',
        fontSize: '1rem',
        textAlign: 'center',
        padding: '20px',
    },
    errorMessage: {
        color: '#dc3545',
        fontSize: '1rem',
        textAlign: 'center',
        padding: '20px',
    },
    callSheetForm: {
        width: '795px',
        minHeight: '1123px',
        backgroundColor: '#fff',
        padding: '40px',
        border: '1px solid #ddd',
        boxShadow: '0 0 10px rgba(0,0,0,0.1)',
        margin: '20px auto',
    },
    formHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '20px',
        padding: '20px 0',
        borderBottom: '1px solid #ddd',
    },
    logoSection: {
        width: '150px',
    },
    uploadBox: {
        border: '1px solid #000',
        padding: '15px',
        textAlign: 'center',
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    crewCallSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '40px',
    },
    crewCallCircle: {
        border: '2px solid #0066cc',
        borderRadius: '50%',
        width: '120px',
        height: '120px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '10px',
    },
    crewCallInput: {
        width: '70px',
        textAlign: 'center',
        fontSize: '24px',
        fontWeight: 'bold',
        border: 'none',
        backgroundColor: 'transparent',
        marginTop: '5px',
        marginBottom: '5px',
        '&:focus': {
            outline: 'none',
            backgroundColor: '#f0f0f0',
        },
    },
    time: {
        fontSize: '24px',
        fontWeight: 'bold',
    },
    dateInfo: {
        textAlign: 'right',
    },
    sectionTitle: {
        backgroundColor: '#f5f5f5',
        padding: '10px',
        fontWeight: 'bold',
        marginTop: '20px',
        marginBottom: '10px',
    },
    infoTable: {
        width: '100%',
        borderCollapse: 'collapse',
        border: '1px solid #ddd',
        marginBottom: '20px',
        tableLayout: 'fixed',
    },
    scheduleTable: {
        width: '100%',
        borderCollapse: 'collapse',
        border: '2px solid #000',
        marginBottom: '20px',
        tableLayout: 'fixed',
        '& th, & td': {
            border: '2px solid #000',
            padding: '8px',
            overflow: 'hidden',
            wordWrap: 'break-word',
            verticalAlign: 'top',
            fontSize: '0.9rem',
        },
        '& th': {
            backgroundColor: '#f5f5f5',
            fontWeight: 'bold',
            textAlign: 'left',
            borderBottom: '2px solid #000',
        },
        '& tr': {
            borderBottom: '2px solid #000',
        },
        '& th:nth-child(1), & td:nth-child(1)': {
            width: '4%',
            textAlign: 'center',
        },
        '& th:nth-child(2), & td:nth-child(2)': {
            width: '8%',
        },
        '& th:nth-child(3), & td:nth-child(3)': {
            width: '65%',
        },
        '& th:nth-child(4), & td:nth-child(4)': {
            width: '10%',
        },
        '& th:nth-child(5), & td:nth-child(5)': {
            width: '5%',
            textAlign: 'center',
        },
        '& th:nth-child(6), & td:nth-child(6)': {
            width: '8%',
        },
    },
    castTable: {
        width: '100%',
        borderCollapse: 'collapse',
        border: '1px solid #ddd',
        marginBottom: '20px',
        tableLayout: 'fixed',
        '& th, & td': {
            border: '1px solid #ddd',
            padding: '8px',
            overflow: 'hidden',
            wordWrap: 'break-word',
        },
    },
    requirementsTable: {
        width: '100%',
        borderCollapse: 'collapse',
        border: '1px solid #ddd',
        marginBottom: '20px',
        tableLayout: 'fixed',
        '& th, & td': {
            border: '1px solid #ddd',
            padding: '8px',
            overflow: 'hidden',
            wordWrap: 'break-word',
        },
    },
    synopsis: {
        fontSize: '0.85em',
        color: '#666',
        display: 'block',
        marginTop: '4px',
        fontStyle: 'italic',
    },
    infoCell: {
        width: '75%',
        verticalAlign: 'top',
        padding: '10px',
    },
    weatherCell: {
        width: '25%',
        verticalAlign: 'top',
        padding: '10px',
        textAlign: 'left',
        '& div': {
            marginBottom: '8px',
        },
    },
    crewTable: {
        width: '100%',
        borderCollapse: 'collapse',
        border: '2px solid #000',
    },
    crewTableHeader: {
        border: '2px solid #000',
        padding: '12px',
        backgroundColor: '#f5f5f5',
        textAlign: 'left',
        verticalAlign: 'top',
    },
    crewTableCell: {
        border: '2px solid #000',
        padding: '12px',
        height: '100px', // Give some height to empty cells
    },
    timingInputsContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    timingRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    timeInput: {
        padding: '6px 10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        width: '100px',
        fontSize: '0.9rem',
    },
    locationInfo: {
        marginTop: '16px',
        borderTop: '1px solid #ccc',
        paddingTop: '16px',
        '& div': {
            marginBottom: '8px',
        },
    },
    extrasTable: {
        width: '100%',
        borderCollapse: 'collapse',
        border: '2px solid #000',
        marginTop: '20px',
        marginBottom: '20px',
        '& th, & td': {
            border: '2px solid #000',
            padding: '12px',
            verticalAlign: 'top',
        },
        '& th': {
            backgroundColor: '#f5f5f5',
            fontWeight: 'bold',
            textAlign: 'center',
        },
        '& td': {
            minHeight: '100px',
        },
    },
    extrasContent: {
        minHeight: '80px',
    },
    crewCallContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    crewCallTable: {
        width: '100%',
        borderCollapse: 'collapse',
        border: '2px solid #000',
        marginBottom: '20px',
        '& th, & td': {
            border: '2px solid #000',
            padding: '8px',
            textAlign: 'left',
        },
        '& th': {
            backgroundColor: '#f5f5f5',
            fontWeight: 'bold',
        },
        '& thead tr:first-child th': {
            textAlign: 'center',
            borderBottom: '2px solid #000',
        },
        '& td': {
            minHeight: '30px',
        },
    },
    generateButtonContainer: {
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '20px',
    },
    generateButton: {
        backgroundColor: '#0066cc',
        color: 'white',
        padding: '10px 20px',
        border: 'none',
        borderRadius: '4px',
        fontSize: '1rem',
        cursor: 'pointer',
        fontWeight: '500',
        transition: 'background-color 0.2s',
        '&:hover': {
            backgroundColor: '#0052a3',
        },
        '&:active': {
            backgroundColor: '#004080',
        },
    },
    generateButtonDisabled: {
        backgroundColor: '#cccccc',
        cursor: 'not-allowed',
        '&:hover': {
            backgroundColor: '#cccccc',
        },
    },
};

export default CallSheet;   