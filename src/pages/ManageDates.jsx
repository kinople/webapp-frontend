import ProjectHeader from '../components/ProjectHeader'
import { useNavigate, useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"

const ManageDates = () => {
    const navigate = useNavigate();
    const { user, id } = useParams();
    const [locationGroups, setLocationGroups] = useState([]);
    const [locationOptions, setLocationOptions] = useState({});
    const [breakdownData, setBreakdownData] = useState([]);
    const [castList, setCastList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [selectedCast, setSelectedCast] = useState(null);
    const [castOptions, setCastOptions] = useState({});
    const [editingOption, setEditingOption] = useState(null);
    const [selectedDates, setSelectedDates] = useState({ highlights: [], ranges: [] });
    const [datePickerMode, setDatePickerMode] = useState('range'); // 'range' or 'individual'

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                // Fetch locations data
                const locationsResponse = await fetch(`/api/${id}/location-list`);
                if (!locationsResponse.ok) {
                    throw new Error('Failed to fetch locations');
                }
                const locationsData = await locationsResponse.json();

                // Fetch cast data
                const castResponse = await fetch(`/api/${id}/cast-list-complete`);
                if (!castResponse.ok) {
                    throw new Error('Failed to fetch cast list');
                }
                const castData = await castResponse.json();

                // Parse locations data (existing code)
                const locationLines = locationsData.location_list.split('\n');
                const locationHeaders = locationLines[0].split('\t').map(header => header.trim());
                
                const locations = locationLines.slice(1)
                    .filter(line => line.trim() !== '')
                    .map(line => {
                        const values = line.split('\t');
                        return {
                            id: values[locationHeaders.indexOf('Location ID')],
                            name: values[locationHeaders.indexOf('Location Group Name')],
                            locationName: values[locationHeaders.indexOf('LocationName')],
                            numScenes: parseInt(values[locationHeaders.indexOf('Number of Scenes')]) || 0,
                            locked: values[locationHeaders.indexOf('Locked')]
                        };
                    })
                    .filter(location => location.numScenes > 1);

                // Parse the location options TSV
                const optionsLines = locationsData.location_options.split('\n');
                const optionsHeaders = optionsLines[0].split('\t').map(header => header.trim());
                
                const locationOpts = optionsLines.slice(1)
                    .filter(line => line.trim() !== '')
                    .reduce((acc, line) => {
                        const values = line.split('\t');
                        const locationId = values[optionsHeaders.indexOf('Location ID')];
                        if (!acc[locationId]) {
                            acc[locationId] = [];
                        }
                        acc[locationId].push({
                            name: values[optionsHeaders.indexOf('Name')],
                            address: values[optionsHeaders.indexOf('Address')],
                            dates: values[optionsHeaders.indexOf('Dates')]
                        });
                        return acc;
                    }, {});

                // Parse the breakdown TSV
                const breakdownLines = locationsData.breakdown.split('\n');
                const breakdownHeaders = breakdownLines[0].split('\t').map(header => header.trim());
                
                const breakdown = breakdownLines.slice(1)
                    .filter(line => line.trim() !== '')
                    .map(line => {
                        const values = line.split('\t');
                        return breakdownHeaders.reduce((obj, header, index) => {
                            obj[header] = values[index] || '';
                            return obj;
                        }, {});
                    });

                // Parse cast list TSV
                const castLines = castData.cast_list.split('\n');
                const castHeaders = castLines[0].split('\t').map(header => header.trim());
                
                const parsedCastList = castLines.slice(1)
                    .filter(line => line.trim() !== '')
                    .map(line => {
                        const values = line.split('\t');
                        return {
                            castId: values[castHeaders.indexOf('Cast ID')],
                            characterName: values[castHeaders.indexOf('Character')],
                            locked: values[castHeaders.indexOf('Locked')],
                            numScenes: parseInt(values[castHeaders.indexOf('Number of Scenes')]) || 0
                        };
                    })
                    .filter(cast => cast.numScenes > 0);

                // Parse cast options TSV
                const castOptionLines = castData.cast_options.split('\n');
                const castOptionHeaders = castOptionLines[0].split('\t').map(header => header.trim());
                
                const castOpts = castOptionLines.slice(1)
                    .filter(line => line.trim() !== '')
                    .reduce((acc, line) => {
                        const values = line.split('\t');
                        const castId = values[castOptionHeaders.indexOf('Cast ID')];
                        if (!acc[castId]) {
                            acc[castId] = [];
                        }
                        acc[castId].push({
                            actorName: values[castOptionHeaders.indexOf('Actor Name')],
                            details: values[castOptionHeaders.indexOf('Details')],
                            dates: values[castOptionHeaders.indexOf('Dates')]
                        });
                        return acc;
                    }, {});

                setCastOptions(castOpts);

                // Set all states
                setLocationGroups(locations);
                setLocationOptions(locationOpts);
                setBreakdownData(breakdown);
                setCastList(parsedCastList);
            } catch (error) {
                console.error('Error fetching data:', error);
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleCastClick = (cast) => {
        setSelectedCast(cast);
        setSelectedLocation(null); // Clear selected location when viewing cast
    };

    const parseDates = (datesString) => {
        if (!datesString) return { highlights: [], ranges: [] };

        const highlights = [];
        const ranges = [];

        datesString.split(', ').forEach(dateStr => {
            if (dateStr.includes(' - ')) {
                // Handle date ranges
                const [start, end] = dateStr.split(' - ');
                ranges.push({
                    start: new Date(start),
                    end: new Date(end)
                });
            } else {
                // Handle individual dates
                highlights.push(new Date(dateStr));
            }
        });

        return { highlights, ranges };
    };

    const handleUpdateDates = async (option, type) => {
        try {
            const endpoint = type === 'location' 
                ? `/api/${id}/location/${selectedLocation.id}/update-dates`
                : `/api/${id}/cast/${selectedCast.castId}/update-dates`;

            const formattedDates = [
                ...selectedDates.highlights.map(date => date.toLocaleDateString()),
                ...(selectedDates.ranges[0] ? 
                    [`${selectedDates.ranges[0].start.toLocaleDateString()} - ${selectedDates.ranges[0].end.toLocaleDateString()}`] 
                    : []
                )
            ].join(', ');

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    option_name: type === 'location' ? option.name : option.actorName,
                    dates: formattedDates
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update dates');
            }

            // Refresh data and reset editing state
            await fetchData();
            setEditingOption(null);
            setSelectedDates({ highlights: [], ranges: [] });
        } catch (error) {
            console.error('Error updating dates:', error);
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
            </div>
            <div style={styles.content}>
                <div style={styles.castSection}>
                    <div style={styles.sectionHeader}>CAST</div>
                    <div style={styles.castList}>
                        {isLoading ? (
                            <div style={styles.message}>Loading cast...</div>
                        ) : error ? (
                            <div style={styles.errorMessage}>{error}</div>
                        ) : (
                            castList.map((cast) => (
                                <button
                                    key={cast.castId}
                                    style={styles.castButton}
                                    onClick={() => handleCastClick(cast)}
                                >
                                    <div style={styles.castName}>
                                        {cast.locked !== 'False' ? cast.locked : 'TBD'}
                                    </div>
                                    <div style={styles.characterName}>
                                        {cast.characterName}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <div style={styles.centerSection}>
                    {selectedLocation ? (
                        <div style={styles.datesContainer}>
                            <h3 style={styles.datesHeader}>
                                {selectedLocation.name} - Dates
                            </h3>
                            <div style={styles.calendarsGrid}>
                                {locationOptions[selectedLocation.id]?.map((option, index) => {
                                    if (option.dates.trim().toLowerCase() === "no constraint") {
                                        return (
                                            <div key={index} style={styles.calendarItem}>
                                                <div style={styles.optionHeader}>
                                                    <div style={styles.optionName}>{option.name}</div>
                                                </div>
                                                <div style={styles.optionAddress}>{option.address}</div>
                                                <div style={styles.flexibleDates}>Flexible</div>
                                            </div>
                                        );
                                    }

                                    const { highlights, ranges } = parseDates(option.dates);
                                    
                                    return (
                                        <div key={index} style={styles.calendarItem}>
                                            <div style={styles.optionHeader}>
                                                <div style={styles.optionName}>{option.name}</div>
                                            </div>
                                            <div style={styles.optionAddress}>{option.address}</div>
                                            <div style={styles.calendar}>
                                                <DatePicker
                                                    selected={null}
                                                    inline
                                                    monthsShown={3}
                                                    highlightDates={highlights}
                                                    startDate={ranges[0]?.start}
                                                    endDate={ranges[0]?.end}
                                                    selectsRange={false}
                                                    readOnly={true}
                                                    calendarContainer={({ className, children }) => (
                                                        <div style={styles.calendarContainer} className={className}>
                                                            {children}
                                                        </div>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    );
                                }) || (
                                    <div style={styles.message}>No options available for this location</div>
                                )}
                            </div>
                        </div>
                    ) : selectedCast ? (
                        <div style={styles.datesContainer}>
                            <h3 style={styles.datesHeader}>
                                {selectedCast.characterName} - Dates
                            </h3>
                            <div style={styles.calendarsGrid}>
                                {castOptions[selectedCast.castId]?.map((option, index) => {
                                    if (option.dates.trim().toLowerCase() === "no constraint") {
                                        return (
                                            <div key={index} style={styles.calendarItem}>
                                                <div style={styles.optionHeader}>
                                                    <div style={styles.optionName}>{option.actorName}</div>
                                                </div>
                                                <div style={styles.optionDetails}>{option.details}</div>
                                                <div style={styles.flexibleDates}>Flexible</div>
                                            </div>
                                        );
                                    }

                                    const { highlights, ranges } = parseDates(option.dates);
                                    
                                    return (
                                        <div key={index} style={styles.calendarItem}>
                                            <div style={styles.optionHeader}>
                                                <div style={styles.optionName}>{option.actorName}</div>
                                            </div>
                                            <div style={styles.optionDetails}>{option.details}</div>
                                            <div style={styles.calendar}>
                                                <DatePicker
                                                    selected={null}
                                                    inline
                                                    monthsShown={3}
                                                    highlightDates={highlights}
                                                    startDate={ranges[0]?.start}
                                                    endDate={ranges[0]?.end}
                                                    selectsRange={false}
                                                    readOnly={true}
                                                    calendarContainer={({ className, children }) => (
                                                        <div style={styles.calendarContainer} className={className}>
                                                            {children}
                                                        </div>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    );
                                }) || (
                                    <div style={styles.message}>No options available for this character</div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p style={styles.centerText}>Select an item to view their dates.</p>
                    )}
                </div>

                <div style={styles.locationsSection}>
                    <div style={styles.sectionHeader}>LOCATIONS</div>
                    <div style={styles.locationsList}>
                        {isLoading ? (
                            <div style={styles.message}>Loading locations...</div>
                        ) : error ? (
                            <div style={styles.errorMessage}>{error}</div>
                        ) : (
                            locationGroups.map((location) => (
                                <button
                                    key={location.id}
                                    style={styles.locationButton}
                                    onClick={() => {
                                        setSelectedLocation(location);
                                    }}
                                >
                                    <div style={styles.locationName}>
                                        {location.locked !== 'False' ? location.locked : 'TBD'}
                                    </div>
                                    <div style={styles.locationGroup}>{location.name}</div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

const updatedStyles = {
    centerSection: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        padding: '0 20px',
    },
    centerText: {
        color: '#666',
        fontSize: '1rem',
        marginTop: '20px',
    },
    datesContainer: {
        width: '100%',
        padding: '0',
    },
    datesHeader: {
        fontSize: '1.2rem',
        color: '#333',
        marginBottom: '20px',
        paddingBottom: '10px',
        borderBottom: '1px solid #eee',
        marginTop: '0',
    },
    datesList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
    },
    content: {
        display: 'flex',
        flex: 1,
        margin: '20px',
        gap: '20px',
        alignItems: 'flex-start',
    },
};

const calendarStyles = {
    calendarsGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '20px',
        maxHeight: 'calc(100vh - 200px)',
        overflowY: 'auto',
        padding: '10px',
    },
    calendarItem: {
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid #dee2e6',
    },
    calendar: {
        marginTop: '15px',
        '& .react-datepicker': {
            width: '100%',
            border: 'none',
        },
        '& .react-datepicker__month-container': {
            float: 'none',
            width: '100%',
        },
        '& .react-datepicker__day--highlighted': {
            backgroundColor: '#4CAF50',
            color: 'white',
            borderRadius: '50%',
            '&:hover': {
                backgroundColor: '#45a049',
            },
        },
        '& .react-datepicker__day--in-selecting-range, .react-datepicker__day--in-range': {
            backgroundColor: '#4CAF50',
            color: 'white',
            '&:hover': {
                backgroundColor: '#45a049',
            },
        },
    },
    calendarContainer: {
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
    },
    optionName: {
        fontSize: '1.1rem',
        fontWeight: '500',
        color: '#333',
        marginBottom: '5px',
    },
    optionAddress: {
        fontSize: '0.9rem',
        color: '#666',
        marginBottom: '15px',
    },
};

const additionalStyles = {
    optionDetails: {
        fontSize: '0.9rem',
        color: '#666',
        marginBottom: '8px',
        fontStyle: 'italic',
    },
    flexibleDates: {
        fontSize: '1.1rem',
        color: '#666',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        marginTop: '15px'
    },
    optionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '5px',
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
        gap: '5px',
        backgroundColor: '#e0e0e0',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.9rem',
    },
    removeDate: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0 4px',
        fontSize: '1.1rem',
        color: '#666',
        '&:hover': {
            color: '#dc3545',
        }
    },
    editButton: {
        padding: '4px 8px',
        backgroundColor: '#e0e0e0',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        '&:hover': {
            backgroundColor: '#d0d0d0',
        }
    },
    editActions: {
        display: 'flex',
        justifyContent: 'center',
        marginTop: '15px',
        gap: '10px'
    },
    submitButton: {
        padding: '8px 16px',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        '&:hover': {
            backgroundColor: '#45a049',
        }
    },
    editModeControls: {
        marginBottom: '15px',
    },
    modeToggle: {
        display: 'flex',
        gap: '10px',
        marginBottom: '10px',
        justifyContent: 'center',
    },
    modeButton: {
        padding: '8px 16px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        transition: 'background-color 0.2s',
        '&:hover': {
            opacity: 0.9,
        }
    },
    selectedDatesDisplay: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginTop: '10px',
        padding: '10px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
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
    sectionHeader: {
        backgroundColor: '#ccc',
        padding: '10px',
        fontWeight: 'bold',
        borderBottom: '1px solid #999',
    },
    castSection: {
        width: '250px',
        border: '1px solid #ccc',
    },
    locationsSection: {
        width: '250px',
        border: '1px solid #ccc',
    },
    castList: {
        display: 'flex',
        flexDirection: 'column',
    },
    locationsList: {
        display: 'flex',
        flexDirection: 'column',
    },
    castButton: {
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
    locationButton: {
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
    castName: {
        fontWeight: 'bold',
        color: '#333',
    },
    characterName: {
        fontSize: '0.9rem',
        color: '#555',
    },
    locationName: {
        fontWeight: 'bold',
    },
    locationGroup: {
        fontSize: '0.9rem',
        color: '#555',
    },
    dateItem: {
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        border: '1px solid #dee2e6',
    },
    ...updatedStyles,
    ...calendarStyles,
    ...additionalStyles,
};

export default ManageDates