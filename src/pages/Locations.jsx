import React, { useState, useEffect } from 'react';
import ProjectHeader from '../components/ProjectHeader';
import { useParams } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const parseDatesString = (datesString) => {
    if (!datesString) return { individualDates: [], dateRange: null };
    
    const dates = datesString.split(', ').reduce((acc, date) => {
        if (date.includes(' - ')) {
            // This is a date range
            const [start, end] = date.split(' - ');
            acc.dateRange = {
                start: new Date(start),
                end: new Date(end)
            };
        } else {
            // This is an individual date
            acc.individualDates.push(new Date(date));
        }
        return acc;
    }, { individualDates: [], dateRange: null });

    return dates;
};

const getDateRange = (start, end) => {
    if (!start || !end) return [];
    
    const dates = [];
    let currentDate = new Date(start);
    
    while (currentDate <= end) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
};

const AddOptionModal = ({ onClose, onSubmit, optionForm, setOptionForm }) => {
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [selectedDates, setSelectedDates] = useState([]);
    const [isFlexible, setIsFlexible] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Format dates based on whether dates are flexible
        let formattedDates = "No Constraint";
        if (!isFlexible) {
            const dates = [
                ...selectedDates.map(date => date.toLocaleDateString()),
                ...(startDate && endDate ? [`${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`] : [])
            ];
            if (dates.length > 0) {
                formattedDates = dates.join(', ');
            }
        }

        // Create the complete form data
        const completeFormData = {
            locationName: optionForm.locationName,
            address: optionForm.address,
            dates: formattedDates
        };

        // Call onSubmit with the complete form data
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
                <h3>Add Location Option</h3>
                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.formGroup}>
                        <label>Location Name:</label>
                        <input
                            type="text"
                            value={optionForm.locationName}
                            onChange={(e) => setOptionForm(prev => ({
                                ...prev,
                                locationName: e.target.value
                            }))}
                            style={styles.input}
                            required
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label>Address:</label>
                        <input
                            type="text"
                            value={optionForm.address}
                            onChange={(e) => setOptionForm(prev => ({
                                ...prev,
                                address: e.target.value
                            }))}
                            style={styles.input}
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <div style={styles.dateToggleContainer}>
                            <label style={styles.dateToggleLabel}>
                                <input
                                    type="checkbox"
                                    checked={isFlexible}
                                    onChange={(e) => setIsFlexible(e.target.checked)}
                                    style={styles.dateToggleCheckbox}
                                />
                                Flexible Dates
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
                                            style={styles.input}
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
                                            style={styles.input}
                                            customInput={
                                                <input style={styles.dateRangeInput} />
                                            }
                                        />
                                    </div>
                                </div>
                            </>
                        )}
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

const Locations = () => {
    const { id } = useParams();
    const [locationGroups, setLocationGroups] = useState([]);
    const [ungroupedScenes, setUngroupedScenes] = useState({
        scenes: {
            total: '',
            int: false,
            ext: false,
            intExt: false
        },
        sceneList: []
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [breakdownData, setBreakdownData] = useState(null);
    const [showAddOptionModal, setShowAddOptionModal] = useState(false);
    const [selectedLocationId, setSelectedLocationId] = useState(null);
    const [optionForm, setOptionForm] = useState({
        locationName: '',
        address: '',
        dates: ''
    });
    const [expandedOptions, setExpandedOptions] = useState(new Set());
    const [expandedScenes, setExpandedScenes] = useState(new Set());
    const [showDates, setShowDates] = useState(new Set());
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [datePickerOpen, setDatePickerOpen] = useState({ groupId: null, optionIndex: null });
    const [editConfirmation, setEditConfirmation] = useState({ groupId: null, optionIndex: null });
    const [removingOptions, setRemovingOptions] = useState(false);
    const [selectedOptionsToRemove, setSelectedOptionsToRemove] = useState(new Set());
    const [lockedOptions, setLockedOptions] = useState(new Map());

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (datePickerOpen.groupId !== null && 
                !event.target.closest('.date-picker-container') && 
                !event.target.closest('.calendar-button')) {
                setDatePickerOpen({ groupId: null, optionIndex: null });
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [datePickerOpen]);

    const parseTSV = (tsvText) => {
        const lines = tsvText.split('\n');
        const headers = lines[0].split('\t').map(header => header.trim());
        
        // First pass: collect all data
        const groupedData = lines.slice(1)
            .filter(line => line.trim() !== '')
            .reduce((groups, line) => {
                const values = line.split('\t').map(value => value.trim());
                const rowData = headers.reduce((obj, header, index) => {
                    obj[header] = values[index] || '';
                    return obj;
                }, {});

                const groupId = rowData['Location ID'];
                if (!groups[groupId]) {
                    groups[groupId] = {
                        id: groupId,
                        name: rowData['Location Group Name'],
                        scenes: {
                            total: rowData['Number of Scenes'] || '',
                            int: rowData['INT'] === 'True' || rowData['INT'] === '1' || rowData['INT'] === 'TRUE',
                            ext: rowData['EXT'] === 'True' || rowData['EXT'] === '1' || rowData['EXT'] === 'TRUE',
                        },
                        options: [], // Will be populated from location_options
                        scenesList: rowData['Scene Numbers'] ? rowData['Scene Numbers'].split(',').map(scene => scene.trim()) : [],
                        locked: rowData.Locked === 'true'
                    };
                }

                return groups;
            }, {});

        return groupedData;
    };

    const parseLocationOptions = (tsvText) => {
        const lines = tsvText.split('\n');
        const headers = lines[0].split('\t').map(header => header.trim());
        
        return lines.slice(1)
            .filter(line => line.trim() !== '')
            .reduce((options, line) => {
                const values = line.split('\t').map(value => value.trim());
                const rowData = headers.reduce((obj, header, index) => {
                    obj[header] = values[index] || '';
                    return obj;
                }, {});

                const locationId = rowData['Location ID'];
                if (locationId === 'None') {
                    if (!options['ungrouped']) {
                        options['ungrouped'] = [];
                    }
                    options['ungrouped'].push({
                        name: rowData['Location Name'] || '',
                        address: rowData['Address'] || '',
                        dates: rowData['Dates'] || '',
                        media: ''
                    });
                    return options;
                }

                if (!options[locationId]) {
                    options[locationId] = [];
                }

                options[locationId].push({
                    name: rowData['Location Name'] || '',
                    address: rowData['Address'] || '',
                    dates: rowData['Dates'] || '',
                    media: ''
                });

                return options;
            }, {});
    };

    const parseBreakdownTSV = (tsvText) => {
        const lines = tsvText.split('\n');
        const headers = lines[0].split('\t').map(header => header.trim());
        
        return lines.slice(1)
            .filter(line => line.trim() !== '')
            .map(line => {
                const values = line.split('\t').map(value => value.trim());
                return headers.reduce((obj, header, index) => {
                    obj[header] = values[index] || '';
                    return obj;
                }, {});
            });
    };

    const addLocationOption = async (locationId, formData) => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/${id}/location/${locationId}/add-option`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    location_id: locationId,
                    ...formData // Spread the formData which includes locationName, address, and dates
                })
            });

            if (!response.ok) {
                throw new Error('Failed to add location option');
            }

            // Reset form and close modal
            setOptionForm({
                locationName: '',
                address: '',
                dates: ''
            });
            setShowAddOptionModal(false);

            // Refresh the locations data
            const refreshResponse = await fetch(`/api/${id}/location-list`);
            if (!refreshResponse.ok) {
                throw new Error('Failed to refresh locations');
            }
            const jsonData = await refreshResponse.json();
            
            // Parse the location list TSV
            const locationGroupsData = parseTSV(jsonData.location_list);
            
            // Parse the location options TSV and merge with location groups
            const optionsData = parseLocationOptions(jsonData.location_options);
            
            // Parse the breakdown TSV
            const breakdownScenes = parseBreakdownTSV(jsonData.breakdown);
            
            // Merge options with location groups
            const mergedLocationGroups = Object.values(locationGroupsData).map(group => ({
                ...group,
                options: optionsData[group.id] || []
            }));

            // Calculate ungrouped scenes
            const ungrouped = {
                scenes: {
                    total: 0,
                    int: false,
                    ext: false,
                    intExt: false
                },
                sceneList: []
            };

            // Filter out single-scene locations and add them to ungrouped
            const finalLocationGroups = mergedLocationGroups.filter(group => {
                const numScenes = parseInt(group.scenes.total) || 0;
                if (numScenes === 1) {
                    ungrouped.sceneList.push(...group.scenesList);
                    ungrouped.scenes.total += 1;
                    ungrouped.scenes.int = ungrouped.scenes.int || group.scenes.int;
                    ungrouped.scenes.ext = ungrouped.scenes.ext || group.scenes.ext;
                    return false;
                }
                return true;
            });
            
            // Set all groups to expanded options by default
            const defaultExpandedOptions = new Set(finalLocationGroups.map(group => group.id));
            
            setBreakdownData(breakdownScenes);
            setLocationGroups(finalLocationGroups);
            setUngroupedScenes(ungrouped);
            setExpandedOptions(defaultExpandedOptions);
        } catch (error) {
            console.error('Error adding location option:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveOptions = async (groupId) => {
        try {
            const response = await fetch(`/api/${id}/location/${groupId}/remove-options`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    location_names: Array.from(selectedOptionsToRemove)
                })
            });

            if (!response.ok) {
                throw new Error('Failed to remove options');
            }

            // Reset states and refresh data
            setRemovingOptions(false);
            setSelectedOptionsToRemove(new Set());
            
            // Refresh the locations data (reuse your existing fetch logic)
            const refreshResponse = await fetch(`/api/${id}/location-list`);
            if (!refreshResponse.ok) {
                throw new Error('Failed to refresh locations');
            }
            const jsonData = await refreshResponse.json();
            
            // Parse the location list TSV
            const locationGroupsData = parseTSV(jsonData.location_list);
            
            // Parse the location options TSV and merge with location groups
            const optionsData = parseLocationOptions(jsonData.location_options);
            
            // Parse the breakdown TSV
            const breakdownScenes = parseBreakdownTSV(jsonData.breakdown);
            
            // Merge options with location groups
            const mergedLocationGroups = Object.values(locationGroupsData).map(group => ({
                ...group,
                options: optionsData[group.id] || []
            }));

            // Calculate ungrouped scenes
            const ungrouped = {
                scenes: {
                    total: 0,
                    int: false,
                    ext: false,
                    intExt: false
                },
                sceneList: []
            };

            // Filter out single-scene locations and add them to ungrouped
            const finalLocationGroups = mergedLocationGroups.filter(group => {
                const numScenes = parseInt(group.scenes.total) || 0;
                if (numScenes === 1) {
                    ungrouped.sceneList.push(...group.scenesList);
                    ungrouped.scenes.total += 1;
                    ungrouped.scenes.int = ungrouped.scenes.int || group.scenes.int;
                    ungrouped.scenes.ext = ungrouped.scenes.ext || group.scenes.ext;
                    return false;
                }
                return true;
            });
            
            // Set all groups to expanded options by default
            const defaultExpandedOptions = new Set(finalLocationGroups.map(group => group.id));
            
            setBreakdownData(breakdownScenes);
            setLocationGroups(finalLocationGroups);
            setUngroupedScenes(ungrouped);
            setExpandedOptions(defaultExpandedOptions);
        } catch (error) {
            console.error('Error removing options:', error);
            setError(error.message);
        }
    };

    useEffect(() => {
        const fetchLocations = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const response = await fetch(`/api/${id}/location-list`);
                if (!response.ok) {
                    throw new Error('Failed to fetch locations');
                }
                const jsonData = await response.json();
                
                // Parse the location list TSV
                const locationGroupsData = parseTSV(jsonData.location_list);
                
                // Parse the location options TSV and merge with location groups
                const optionsData = parseLocationOptions(jsonData.location_options);
                
                // Parse the breakdown TSV
                const breakdownScenes = parseBreakdownTSV(jsonData.breakdown);
                
                // Merge options with location groups
                const mergedLocationGroups = Object.values(locationGroupsData)
                    .filter(group => group.id !== 'None') // Filter out ungrouped locations
                    .map(group => ({
                        ...group,
                        options: optionsData[group.id] || []
                    }));

                // Calculate ungrouped scenes from the original TSV data
                const lines = jsonData.location_list.split('\n');
                const headers = lines[0].split('\t').map(header => header.trim());
                
                const ungroupedData = lines.slice(1)
                    .filter(line => {
                        const values = line.split('\t');
                        const rowData = headers.reduce((obj, header, index) => {
                            obj[header] = values[index] || '';
                            return obj;
                        }, {});
                        return rowData['Location ID'] === 'None';
                    })
                    .reduce((acc, line) => {
                        const values = line.split('\t');
                        const rowData = headers.reduce((obj, header, index) => {
                            obj[header] = values[index] || '';
                            return obj;
                        }, {});

                        // Add scenes to the list
                        if (rowData['Scene Numbers']) {
                            acc.sceneList.push(...rowData['Scene Numbers'].split(',').map(scene => scene.trim()));
                        }
                        
                        // Update scene types
                        acc.scenes.int = acc.scenes.int || rowData['INT'] === 'True' || rowData['INT'] === '1' || rowData['INT'] === 'TRUE';
                        acc.scenes.ext = acc.scenes.ext || rowData['EXT'] === 'True' || rowData['EXT'] === '1' || rowData['EXT'] === 'TRUE';
                        
                        return acc;
                    }, {
                        scenes: {
                            total: 0,
                            int: false,
                            ext: false,
                            intExt: false
                        },
                        sceneList: []
                    });

                // Update the total count
                ungroupedData.scenes.total = ungroupedData.sceneList.length;
                
                setBreakdownData(breakdownScenes);
                setLocationGroups(mergedLocationGroups);
                setUngroupedScenes(ungroupedData);
                setExpandedOptions(new Set(mergedLocationGroups.map(group => group.id)));
            } catch (error) {
                console.error('Error fetching locations:', error);
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLocations();
    }, [id]);

    return (
        <div style={styles.pageContainer}>
            <ProjectHeader />
            <div style={styles.mainContent}>
                <div style={styles.contentArea}>
                    {isLoading ? (
                        <div style={styles.message}>Loading locations...</div>
                    ) : error ? (
                        <div style={styles.errorMessage}>{error}</div>
                    ) : (
                        <>
                            <div style={styles.actionButtons}>
                                <button style={styles.button}>Add Location Group</button>
                                <button style={styles.button}>Remove Location Group</button>
                            </div>

                            {locationGroups.map((group) => (
                                <div key={group.id} style={styles.locationGroupContainer}>
                                    <div style={styles.leftPanel}>
                                        <div style={styles.groupHeader}>
                                            <span style={styles.groupNumber}>{group.id}</span>
                                            <span style={styles.groupName}>{group.name}</span>
                                        </div>
                                        
                                        <div style={styles.sceneStats}>
                                            <div style={styles.sceneCount}>
                                                No. of Scenes <input type="text" value={group.scenes.total} readOnly style={styles.numberInput} />
                                            </div>
                                            <div style={styles.checkboxGroup}>
                                                <label>
                                                    Int. <input 
                                                        type="checkbox" 
                                                        checked={group.scenes.int} 
                                                        readOnly 
                                                        style={styles.checkbox}
                                                    />
                                                </label>
                                                <label>
                                                    Ext. <input 
                                                        type="checkbox" 
                                                        checked={group.scenes.ext} 
                                                        readOnly 
                                                        style={styles.checkbox}
                                                    />
                                                </label>
                                            </div>
                                        </div>

                                        <div style={styles.viewButtons}>
                                            <button 
                                                style={{
                                                    ...styles.viewButton,
                                                    ...(expandedOptions.has(group.id) ? styles.activeViewButton : {})
                                                }}
                                                onClick={() => {
                                                    setExpandedOptions(prev => new Set(prev).add(group.id));
                                                    setExpandedScenes(prev => {
                                                        const next = new Set(prev);
                                                        next.delete(group.id);
                                                        return next;
                                                    });
                                                }}
                                            >
                                                View Options
                                            </button>
                                            <button 
                                                style={{
                                                    ...styles.viewButton,
                                                    ...(expandedScenes.has(group.id) ? styles.activeViewButton : {})
                                                }}
                                                onClick={() => {
                                                    setExpandedScenes(prev => new Set(prev).add(group.id));
                                                    setExpandedOptions(prev => {
                                                        const next = new Set(prev);
                                                        next.delete(group.id);
                                                        return next;
                                                    });
                                                }}
                                            >
                                                View Scenes
                                            </button>
                                        </div>
                                    </div>

                                    <div style={styles.rightPanel}>
                                        {!expandedScenes.has(group.id) ? (
                                            // Show locations table
                                            <>
                                                {expandedOptions.has(group.id) && (
                                                    <div style={styles.optionButtons}>
                                                        <button 
                                                            style={styles.button}
                                                            onClick={() => {
                                                                setSelectedLocationId(group.id);
                                                                setShowAddOptionModal(true);
                                                            }}
                                                        >
                                                            Add Option
                                                        </button>
                                                        <button 
                                                            style={styles.button}
                                                            onClick={() => setRemovingOptions(!removingOptions)}
                                                        >
                                                            Remove Option
                                                        </button>
                                                    </div>
                                                )}
                                                <table style={styles.table}>
                                                    <thead>
                                                        <tr>
                                                            <th style={{ width: '80px' }}>S.No.</th>
                                                            <th style={{ width: '25%' }}>Location Name</th>
                                                            <th style={{ width: '80px' }}>Media</th>
                                                            <th style={{ width: '30%' }}>Address</th>
                                                            <th style={{ width: '80px' }}>GMap Pin</th>
                                                            <th style={{ width: '80px' }}>Dates</th>
                                                            <th>Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {group.options.map((option, optionIndex) => (
                                                            <React.Fragment key={`option-${optionIndex}`}>
                                                                <tr style={optionIndex === 0 ? styles.tableRow : styles.optionRow}>
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        {removingOptions && (
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={selectedOptionsToRemove.has(option.name)}
                                                                                onChange={(e) => {
                                                                                    setSelectedOptionsToRemove(prev => {
                                                                                        const next = new Set(prev);
                                                                                        if (e.target.checked) {
                                                                                            next.add(option.name);
                                                                                        } else {
                                                                                            next.delete(option.name);
                                                                                        }
                                                                                        return next;
                                                                                    });
                                                                                }}
                                                                                style={styles.checkbox}
                                                                            />
                                                                        )}
                                                                        {optionIndex + 1}
                                                                    </td>
                                                                    <td style = {{textAlign: 'center'}}>{option.name}</td>
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        {/* {option.media && ( */}
                                                                            <button style={styles.iconButton} title="View Media">🔗</button>
                                                                        {/* )} */}
                                                                    </td>
                                                                    <td style = {{textAlign: 'center'}}>{option.address}</td>
                                                                    <td style={{ textAlign: 'center' }}>                                                                      
                                                                        {option.address && (
                                                                            <a 
                                                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(option.address)}`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                style={{
                                                                                    ...styles.iconButton,
                                                                                    textDecoration: 'none',
                                                                                    display: 'inline-block'
                                                                                }}
                                                                                title="Open in Google Maps"
                                                                            >
                                                                                📍
                                                                            </a>
                                                                        )}
                                                                    </td>
                                                                    <td style={{ textAlign: 'center', position: 'relative' }}>
                                                                        {option.dates.trim().toLowerCase() === "no constraint" ? (
                                                                            <span style={styles.flexibleText}>Flexible</span>
                                                                        ) : (
                                                                            <>
                                                                                <button 
                                                                                    className="calendar-button"
                                                                                    style={styles.iconButton}
                                                                                    title="Select dates"
                                                                                    onClick={(e) => {
                                                                                        const rect = e.target.getBoundingClientRect();
                                                                                        setDatePickerOpen(prev => {
                                                                                            if (prev.groupId === group.id && prev.optionIndex === optionIndex) {
                                                                                                return { groupId: null, optionIndex: null };
                                                                                            }
                                                                                            return {
                                                                                                groupId: group.id,
                                                                                                optionIndex: optionIndex,
                                                                                                position: {
                                                                                                    left: rect.left,
                                                                                                    top: rect.top
                                                                                                }
                                                                                            };
                                                                                        });
                                                                                    }}
                                                                                >
                                                                                    📅
                                                                                </button>
                                                                                {datePickerOpen.groupId === group.id && 
                                                                                 datePickerOpen.optionIndex === optionIndex && (
                                                                                    <div 
                                                                                        className="date-picker-container" 
                                                                                        style={{
                                                                                            ...styles.datePickerContainer,
                                                                                            left: datePickerOpen.position?.left,
                                                                                            top: datePickerOpen.position?.top
                                                                                        }}
                                                                                    >
                                                                                        <div style={styles.datePickerSection}>
                                                                                            <div style={styles.dateDisplay}>
                                                                                                <DatePicker
                                                                                                    selected={null}
                                                                                                    onChange={() => {}}
                                                                                                    highlightDates={[
                                                                                                        ...(parseDatesString(option.dates).individualDates || []),
                                                                                                        ...getDateRange(
                                                                                                            parseDatesString(option.dates).dateRange?.start,
                                                                                                            parseDatesString(option.dates).dateRange?.end
                                                                                                        )
                                                                                                    ]}
                                                                                                    dateFormat="MM/dd/yyyy"
                                                                                                    inline
                                                                                                    readOnly={true}
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                    </td>
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        <button 
                                                                            onClick={() => {
                                                                                setLockedOptions(prev => {
                                                                                    const next = new Map(prev);
                                                                                    if (prev.get(group.id) === option.name) {
                                                                                        // If this option is already locked, unlock it
                                                                                        next.delete(group.id);
                                                                                    } else {
                                                                                        // Lock this option (and unlock any other option in this group)
                                                                                        next.set(group.id, option.name);
                                                                                    }
                                                                                    return next;
                                                                                });
                                                                            }}
                                                                            style={{
                                                                                ...styles.lockButton,
                                                                                ...(lockedOptions.get(group.id) === option.name ? styles.lockedButton : {})
                                                                            }}
                                                                        >
                                                                            {lockedOptions.get(group.id) === option.name ? 'Locked' : 'Lock Location'}
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                                {showDates.has(`${group.id}-${optionIndex}`) && (
                                                                    <tr style={styles.datesRow}>
                                                                        <td colSpan={7} style={styles.datesCell}>
                                                                            {option.dates || 'No dates specified'}
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </React.Fragment>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                {removingOptions && selectedOptionsToRemove.size > 0 && (
                                                    <div style={styles.removeButtonContainer}>
                                                        <button
                                                            style={{...styles.button, backgroundColor: '#dc3545', color: 'white'}}
                                                            onClick={() => handleRemoveOptions(group.id)}
                                                        >
                                                            Remove Selected Options
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            // Show scenes table
                                            <table style={styles.table}>
                                                <thead>
                                                    <tr>
                                                        <th>Scene No.</th>
                                                        <th>Int./Ext.</th>
                                                        <th>Location</th>
                                                        <th>Time</th>
                                                        <th>Synopsis</th>
                                                        <th>Characters</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {group.scenesList.map((sceneNumber, index) => {
                                                        const sceneData = breakdownData?.find(scene => scene['Scene Number'] === sceneNumber) || {};
                                                        return (
                                                            <tr key={index} style={styles.tableRow}>
                                                                <td>{sceneNumber}</td>
                                                                <td>{sceneData['Int./Ext.'] || '-'}</td>
                                                                <td>{sceneData['Location'] || '-'}</td>
                                                                <td>{sceneData['Time'] || '-'}</td>
                                                                <td>{sceneData['Synopsis'] || '-'}</td>
                                                                <td>{sceneData['Characters'] || '-'}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            ))}

                            <div style={styles.ungroupedContainer}>
                                <div style={styles.leftPanel}>
                                    <h3 style={styles.ungroupedTitle}>Ungrouped Scenes</h3>
                                    <div style={styles.sceneStats}>
                                        <div style={styles.sceneCount}>
                                            No. of Scenes <input type="text" value={ungroupedScenes.scenes.total} readOnly style={styles.numberInput} />
                                        </div>
                                        <div style={styles.checkboxGroup}>
                                            <label>
                                                Int. <input type="checkbox" checked={ungroupedScenes.scenes.int} readOnly />
                                            </label>
                                            <label>
                                                Ext. <input type="checkbox" checked={ungroupedScenes.scenes.ext} readOnly />
                                            </label>
                                            <label>
                                                Int./Ext. <input type="checkbox" checked={ungroupedScenes.scenes.intExt} readOnly />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div style={styles.rightPanel}>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>Scene No.</th>
                                                <th>Int./Ext.</th>
                                                <th>Location</th>
                                                <th>Time</th>
                                                <th>Synopsis</th>
                                                <th>Characters</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {ungroupedScenes.sceneList.map((sceneNumber, index) => {
                                                const sceneData = breakdownData?.find(scene => scene['Scene Number'] === sceneNumber) || {};
                                                return (
                                                    <tr key={index} style={styles.tableRow}>
                                                        <td>{sceneNumber}</td>
                                                        <td>{sceneData['Int./Ext.'] || '-'}</td>
                                                        <td>{sceneData['Location'] || '-'}</td>
                                                        <td>{sceneData['Time'] || '-'}</td>
                                                        <td>{sceneData['Synopsis'] || '-'}</td>
                                                        <td>{sceneData['Characters'] || '-'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
            
            {showAddOptionModal && (
                <AddOptionModal 
                    onClose={() => {
                        setShowAddOptionModal(false);
                        setSelectedLocationId(null);
                        setOptionForm({
                            locationName: '',
                            address: '',
                            dates: ''
                        });
                    }}
                    onSubmit={async (formData) => {
                        try {
                            await addLocationOption(selectedLocationId, formData);
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
    locationGroupContainer: {
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
    groupHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    groupNumber: {
        backgroundColor: '#fff',
        borderRadius: '50%',
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    groupName: {
        fontWeight: 'bold',
    },
    sceneStats: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    checkboxGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
    },
    numberInput: {
        width: '40px',
        textAlign: 'center',
    },
    viewButtons: {
        display: 'flex',
        gap: '10px',
    },
    viewButton: {
        padding: '8px 16px',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        borderRadius: '20px',
        cursor: 'pointer',
        flex: 1,
        transition: 'all 0.3s ease',
    },
    activeViewButton: {
        backgroundColor: 'rgb(72, 77, 72)',
        color: '#fff',
        border: '1px solid rgb(72, 77, 72)',
    },
    optionButtons: {
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        border: '1px solid #e0e0e0',
        backgroundColor: '#fff',
        '& th': {
            position: 'sticky',
            top: 0,
            backgroundColor: '#f8f8f8',
            zIndex: 1,
            borderBottom: '2px solid #ddd',
            padding: '12px 16px',
            textAlign: 'left',
            fontWeight: 'bold',
            color: '#333',
        },
        '& td': {
            padding: '12px 16px',
            textAlign: 'left',
            borderBottom: '1px solid #e0e0e0',
            verticalAlign: 'middle',
        }
    },
    tableRow: {
        backgroundColor: '#fff',
        '&:hover': {
            backgroundColor: '#f5f5f5',
        }
    },
    optionRow: {
        backgroundColor: '#fafafa',
        '& td': {
            color: '#666',
            fontSize: '0.95em',
            paddingLeft: '32px', // Indent secondary options
        },
        '&:hover': {
            backgroundColor: '#f5f5f5',
        }
    },
    datesRow: {
        backgroundColor: '#f8f8f8',
        borderBottom: '1px solid #e0e0e0',
    },
    datesCell: {
        padding: '8px 32px',
        color: '#666',
        fontSize: '0.9em',
        fontStyle: 'italic',
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
    lockButton: {
        padding: '6px 12px',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9em',
        transition: 'all 0.2s',
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
    ungroupedContainer: {
        display: 'flex',
        border: '1px solid #ccc',
        borderRadius: '4px',
        overflow: 'hidden',
    },
    ungroupedTitle: {
        margin: 0,
        fontWeight: 'bold',
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
    checkbox: {
        cursor: 'default',
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
        minWidth: '300px',
        maxWidth: '500px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
    },
    scenesList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxHeight: '400px',
        overflowY: 'auto',
        padding: '10px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
    },
    sceneItem: {
        padding: '8px',
        backgroundColor: '#fff',
        borderRadius: '4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    },
    closeButton: {
        padding: '8px 16px',
        backgroundColor: '#e0e0e0',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        alignSelf: 'flex-end',
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
    select: {
        padding: '4px 8px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        backgroundColor: '#fff',
        fontSize: '14px',
        width: '100%',
        maxWidth: '200px'
    },
    datePickerContainer: {
        position: 'fixed',
        zIndex: 5000,
        backgroundColor: 'white',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        borderRadius: '4px',
        padding: '8px',
        minWidth: '300px',
        transform: 'translateX(-50%)',
        bottom: 'calc(100% - 200px)',
    },
    datePickerSection: {
        display: 'flex',
        justifyContent: 'center',
    },
    dateDisplay: {
        backgroundColor: '#fff',
        borderRadius: '4px',
        '& .react-datepicker': {
            border: 'none',
            boxShadow: 'none',
        },
        '& .react-datepicker__day--highlighted': {
            backgroundColor: '#4CAF50',
            color: 'white',
        },
        '& .react-datepicker__day--keyboard-selected': {
            backgroundColor: 'transparent',
            color: 'inherit',
        },
        '& .react-datepicker__day:hover': {
            backgroundColor: 'transparent',
            cursor: 'default',
        }
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
        '&:hover': {
            color: '#dc3545',
        }
    },
    removeButtonContainer: {
        display: 'flex',
        justifyContent: 'center',
        padding: '16px',
        borderTop: '1px solid #e0e0e0',
    },
    flexibleText: {
        fontStyle: 'italic',
        color: '#666',
    },
    dateToggleContainer: {
        marginBottom: '15px',
    },
    dateToggleLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
    },
    dateToggleCheckbox: {
        cursor: 'pointer',
    },
};

export default Locations;
