import ProjectHeader from '../components/ProjectHeader'
import { useNavigate, useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getApiUrl } from '../utils/api';

const ManageSchedules = () => {
    const navigate = useNavigate();
    const { user, id, scheduleId } = useParams();
    const [selectedElement, setSelectedElement] = useState('');
    const [maxScenes, setMaxScenes] = useState('');
    const [scheduleData, setScheduleData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false); // Add saving state
    const [selectedDates, setSelectedDates] = useState([]);
    const [originalDates, setOriginalDates] = useState([]); // Track original dates for comparison
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const [dateRangeStart, setDateRangeStart] = useState('');
    const [dateRangeEnd, setDateRangeEnd] = useState('');
    const [datePickerMode, setDatePickerMode] = useState('single'); // 'single' or 'range'

    useEffect(() => {
        const fetchScheduleData = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(getApiUrl(`/api/${id}/schedule/${scheduleId}`));
                if (!response.ok) {
                    throw new Error('Failed to fetch schedule data');
                }
                const data = await response.json();
                
                setScheduleData(data);
                
                // Set default selected element to first location if available
                if (data.locations && data.locations.length > 0) {
                    setSelectedElement(`location-${data.locations[0]}`);
                }
            } catch (error) {
                console.error('Error fetching schedule data:', error);
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchScheduleData();
    }, [id, scheduleId]);

    // Parse date ranges from the API response format
    const parseDateRanges = (dateArray) => {
        const dates = [];
        dateArray.forEach(dateItem => {
            if (dateItem.includes('-') && dateItem.split('-').length > 3) {
                // This is a date range (e.g., "2025-07-05-2025-07-07")
                const parts = dateItem.split('-');
                const startDate = `${parts[0]}-${parts[1]}-${parts[2]}`;
                const endDate = `${parts[3]}-${parts[4]}-${parts[5]}`;
                
                const current = new Date(startDate);
                const end = new Date(endDate);
                
                while (current <= end) {
                    dates.push(current.toISOString().split('T')[0]);
                    current.setDate(current.getDate() + 1);
                }
            } else {
                // Single date
                dates.push(dateItem);
            }
        });
        return dates;
    };

    // Get existing dates for the selected element
    const getExistingDates = () => {
        if (!selectedElement || !scheduleData?.dates) return [];
        
        const [type, name] = selectedElement.split('::');
        const datesSection = type === 'location' ? 'locations' : 'characters';
        const elementData = scheduleData.dates[datesSection]?.[name];
        
        if (elementData?.dates) {
            return parseDateRanges(elementData.dates);
        }
        
        return [];
    };

    // Check if dates have changed
    const hasChanges = () => {
        if (selectedDates.length !== originalDates.length) return true;
        
        const sortedSelected = [...selectedDates].sort();
        const sortedOriginal = [...originalDates].sort();
        
        return !sortedSelected.every((date, index) => date === sortedOriginal[index]);
    };

    // Reset selected dates when element changes and load existing dates
    const handleElementChange = (value) => {
        console.log('Element Changed:', value);
        setSelectedElement(value);
        setDateRangeStart('');
        setDateRangeEnd('');
        
        // Load existing dates for the selected element
        if (value && scheduleData?.dates) {
            const [type, name] = value.split('::');
            const datesSection = type === 'location' ? 'locations' : 'characters';
            const elementData = scheduleData.dates[datesSection]?.[name];
            console.log('Element Data:', elementData);
            
            if (elementData?.dates) {
                console.log('Found dates for:', name, elementData.dates);
                const existingDates = parseDateRanges(elementData.dates);
                setSelectedDates(existingDates);
                setOriginalDates(existingDates); // Set original dates for comparison
            } else {
                setSelectedDates([]);
                setOriginalDates([]);
            }
        } else {
            setSelectedDates([]);
            setOriginalDates([]);
        }
    };

    // Update the useEffect to load dates when schedule data changes
    useEffect(() => {
        if (selectedElement && scheduleData?.dates) {
            const existingDates = getExistingDates();
            setSelectedDates(existingDates);
            setOriginalDates(existingDates); // Set original dates for comparison
        }
    }, [scheduleData, selectedElement]);

    // Reload given dates section data
    const reloadGivenDatesData = async () => {
        if (!selectedElement) return;
        
        try {
            const response = await fetch(getApiUrl(`/api/${id}/schedule/${scheduleId}`));
            if (!response.ok) {
                throw new Error('Failed to reload schedule data');
            }
            const data = await response.json();
            
            // Update only the dates section of schedule data
            setScheduleData(prev => ({
                ...prev,
                dates: data.dates
            }));
            
            // Reload dates for current element
            const [type, name] = selectedElement.split('-');
            const elementDates = data.dates[type === 'location' ? 'locations' : 'characters'];
            
            if (elementDates && elementDates[name] && elementDates[name].dates) {
                const refreshedDates = parseDateRanges(elementDates[name].dates);
                setSelectedDates(refreshedDates);
                setOriginalDates(refreshedDates); // Update original dates after reload
            } else {
                setSelectedDates([]);
                setOriginalDates([]);
            }
            
        } catch (error) {
            console.error('Error reloading given dates data:', error);
        }
    };

    // Create dropdown options from schedule data
    const getElementOptions = () => {
        if (!scheduleData) return [];
        
        const options = [];
        
        // Add locations
        if (scheduleData.locations && Array.isArray(scheduleData.locations)) {
            scheduleData.locations.forEach(location => {
                // Use location name as the value since we have it in the dates data
                options.push({
                    value: `location::${location}`,
                    label: `📍 ${location}`,
                    type: 'location'
                });

            });
        }
        
        // Add characters
        if (scheduleData.characters && Array.isArray(scheduleData.characters)) {
            scheduleData.characters.forEach(character => {
                // Use character name as the value since we have it in the dates data
                options.push({
                    value: `character::${character}`,
                    label: `👤 ${character}`,
                    type: 'character'
                });

            });
        }
        
        return options;
    };

    const getSelectedElementName = () => {
        if (!selectedElement) return 'Select Element';
        
        const options = getElementOptions();
        const selected = options.find(opt => opt.value === selectedElement);
        return selected ? selected.label : 'Select Element';
    };

    const handleGenerateSchedule = async () => {
        if (!maxScenes || isNaN(maxScenes) || maxScenes <= 0) {
            alert('Please enter a valid number of scenes per day');
            return;
        }

        try {
            setIsGenerating(true);
            const response = await fetch(getApiUrl(`/api/${id}/generate-schedule/${scheduleId}`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    max_scenes_per_day: parseInt(maxScenes)
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate schedule');
            }

            const result = await response.json();
            console.log('Schedule generated successfully:', result);
            
            // Add a small delay before refreshing to ensure backend processing is complete
            setTimeout(async () => {
                try {
                    // Refresh the schedule data to get the generated schedule
                    const refreshResponse = await fetch(getApiUrl(`/api/${id}/schedule/${scheduleId}`));
                    if (refreshResponse.ok) {
                        const refreshedData = await refreshResponse.json();
                        setScheduleData(refreshedData);
                        alert('Schedule generated successfully!');
                    } else {
                        throw new Error('Failed to refresh schedule data');
                    }
                } catch (refreshError) {
                    console.error('Error refreshing schedule:', refreshError);
                    // Don't show error to user since schedule was generated successfully
                }
            }, 1000); // 1 second delay
            
        } catch (error) {
            console.error('Error generating schedule:', error);
            alert('Failed to generate schedule: ' + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSingleDateChange = (e) => {
        const selectedDate = e.target.value;
        if (selectedDate) {
            setSelectedDates(prev => {
                if (prev.includes(selectedDate)) {
                    // Remove date if already selected
                    return prev.filter(d => d !== selectedDate);
                } else {
                    // Add date if not selected
                    return [...prev, selectedDate].sort();
                }
            });
        }
    };

    const handleRangeStartChange = (e) => {
        setDateRangeStart(e.target.value);
    };

    const handleRangeEndChange = (e) => {
        setDateRangeEnd(e.target.value);
    };

    const addDateRange = () => {
        if (!dateRangeStart || !dateRangeEnd) {
            alert('Please select both start and end dates for the range');
            return;
        }

        if (dateRangeStart > dateRangeEnd) {
            alert('Start date must be before end date');
            return;
        }

        // Generate all dates in the range
        const rangeDates = [];
        const currentDate = new Date(dateRangeStart);
        const endDate = new Date(dateRangeEnd);

        while (currentDate <= endDate) {
            rangeDates.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Add range dates to selected dates (avoiding duplicates)
        setSelectedDates(prev => {
            const newDates = [...prev];
            rangeDates.forEach(date => {
                if (!newDates.includes(date)) {
                    newDates.push(date);
                }
            });
            return newDates.sort();
        });

        // Clear range inputs
        setDateRangeStart('');
        setDateRangeEnd('');
    };

    const removeDate = (dateToRemove) => {
        setSelectedDates(prev => prev.filter(d => d !== dateToRemove));
    };

    const clearAllDates = () => {
        setSelectedDates([]);
        // Don't reset originalDates here - keep them for comparison
        // This way, clearing dates when there were original dates will show as a change
    };

    const formatDisplayDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    // Generate calendar days for display
    const generateCalendarDays = () => {
        if (!scheduleData?.first_date || !scheduleData?.last_date) return [];
        
        const startDate = new Date(scheduleData.first_date);
        const endDate = new Date(scheduleData.last_date);
        
        // Get the first Sunday of the week containing the start date
        const firstSunday = new Date(startDate);
        firstSunday.setDate(startDate.getDate() - startDate.getDay());
        
        // Get the last Saturday of the week containing the end date
        const lastSaturday = new Date(endDate);
        lastSaturday.setDate(endDate.getDate() + (6 - endDate.getDay()));
        
        const days = [];
        const currentDate = new Date(firstSunday);
        
        while (currentDate <= lastSaturday) {
            days.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return days;
    };

    // Determine if a date is part of a range
    const isDateInRange = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        if (!selectedDates.includes(dateStr)) return false;
        
        const sortedDates = [...selectedDates].sort();
        const dateIndex = sortedDates.indexOf(dateStr);
        
        // Check if this date is part of a consecutive sequence
        const hasConsecutiveBefore = dateIndex > 0 && 
            new Date(sortedDates[dateIndex - 1]).getTime() === date.getTime() - 24 * 60 * 60 * 1000;
        const hasConsecutiveAfter = dateIndex < sortedDates.length - 1 && 
            new Date(sortedDates[dateIndex + 1]).getTime() === date.getTime() + 24 * 60 * 60 * 1000;
        
        return hasConsecutiveBefore || hasConsecutiveAfter;
    };

    // Get the month and year for calendar header
    const getCalendarMonthYear = () => {
        if (!scheduleData?.first_date || !scheduleData?.last_date) return '';
        
        const startDate = new Date(scheduleData.first_date);
        const endDate = new Date(scheduleData.last_date);
        
        const startMonth = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const endMonth = endDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        return startMonth === endMonth ? startMonth : `${startMonth} - ${endMonth}`;
    };

    // Handle calendar date click
    const handleCalendarDateClick = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        const scheduleStart = new Date(scheduleData.first_date);
        const scheduleEnd = new Date(scheduleData.last_date);
        
        // Only allow selection of dates within the schedule range
        if (date < scheduleStart || date > scheduleEnd) return;
        
        setSelectedDates(prev => {
            if (prev.includes(dateStr)) {
                return prev.filter(d => d !== dateStr);
            } else {
                return [...prev, dateStr].sort();
            }
        });
    };

    const saveDates = async () => {
        if (!selectedElement) {
            alert('Please select an element');
            return;
        }

        try {
            setIsSaving(true); // Set saving state to true
            const [type, name] = selectedElement.split('::');
            const datesSection = type === 'location' ? 'locations' : 'characters';
            
            console.log('Schedule Data:', scheduleData);
            console.log('Selected Type:', type);
            console.log('Selected Name:', name);
            console.log('Dates Section:', scheduleData.dates?.[datesSection]);
            
            const elementData = scheduleData.dates?.[datesSection]?.[name];
            console.log('Element Data:', elementData);
            
            if (!elementData || !elementData.id) {
                throw new Error(`Could not find data for ${type} "${name}"`);
            }
            
            const elementId = elementData.id;
            console.log('Element ID:', elementId);
            
            const response = await fetch(getApiUrl(`/api/${id}/schedule/${scheduleId}/dates`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    element_type: type,
                    element_name: name,
                    element_id: elementId,
                    dates: selectedDates // Array of date strings (can be empty)
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save dates');
            }

            const result = await response.json();
            console.log('Dates saved successfully:', result);
            
            // Reload the given dates section
            await reloadGivenDatesData();
            
            alert('Dates saved successfully!');
            
        } catch (error) {
            console.error('Error saving dates:', error);
            alert('Failed to save dates: ' + error.message);
        } finally {
            setIsSaving(false); // Reset saving state
        }
    };

    // Get scheduled dates for the selected element
    const getScheduledDates = () => {
        if (!selectedElement || !scheduleData?.schedule?.actor_schedule) return [];
        
        const [type, name] = selectedElement.split('-');
        
        if (type === 'character') {
            const actorSchedule = scheduleData.schedule.actor_schedule[name];
            return actorSchedule ? actorSchedule.dates || [] : [];
        } else if (type === 'location') {
            // For locations, get all dates where this location is used
            const scheduledDates = [];
            const scheduleByDay = scheduleData.schedule.schedule_by_day;
            
            if (scheduleByDay) {
                Object.values(scheduleByDay).forEach(daySchedule => {
                    const hasLocation = daySchedule.scenes?.some(scene => 
                        scene.location_name === name
                    );
                    if (hasLocation) {
                        scheduledDates.push(daySchedule.date);
                    }
                });
            }
            
            return scheduledDates;
        }
        
        return [];
    };

    // Generate calendar for scheduled dates
    const generateScheduledCalendar = () => {
        const scheduledDates = getScheduledDates();
        if (scheduledDates.length === 0) return null;
        
        return (
            <div style={styles.scheduledCalendarContainer}>
                <div style={styles.calendarHeader}>
                    Scheduled Dates ({scheduledDates.length})
                </div>
                <div style={styles.calendarGrid}>
                    <div style={styles.calendarDaysHeader}>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} style={styles.calendarDayHeader}>
                                {day}
                            </div>
                        ))}
                    </div>
                    <div style={styles.calendarDaysGrid}>
                        {generateCalendarDays().map((date, index) => {
                            const dateStr = date.toISOString().split('T')[0];
                            const isScheduled = scheduledDates.includes(dateStr);
                            const isWithinSchedule = date >= new Date(scheduleData.first_date) && 
                                                   date <= new Date(scheduleData.last_date);
                            const isOtherMonth = date.getMonth() !== new Date(scheduleData.first_date).getMonth() && 
                                               date.getMonth() !== new Date(scheduleData.last_date).getMonth();
                            
                            return (
                                <div
                                    key={index}
                                    style={{
                                        ...styles.calendarDay,
                                        ...(isScheduled ? styles.calendarDayScheduled : {}),
                                        ...(isOtherMonth ? styles.calendarDayOtherMonth : {}),
                                        ...(!isWithinSchedule ? styles.calendarDayDisabled : {}),
                                        cursor: 'default' // Remove pointer cursor for scheduled dates
                                    }}
                                >
                                    {date.getDate()}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    // Format schedule for display
    const formatScheduleForDisplay = (schedule) => {
        if (typeof schedule === 'string') return schedule;
        
        if (schedule?.schedule_by_day) {
            let formattedSchedule = '';
            Object.values(schedule.schedule_by_day).forEach(day => {
                formattedSchedule += `Date: ${day.date}\n`;
                formattedSchedule += `Scenes:\n`;
                day.scenes?.forEach(scene => {
                    formattedSchedule += `  Scene ${scene.scene_number} at ${scene.location_name}\n`;
                    formattedSchedule += `  Characters: ${scene.character_names.join(', ')}\n\n`;
                });
                formattedSchedule += '\n';
            });
            return formattedSchedule;
        }
        
        return JSON.stringify(schedule, null, 2);
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;

        try {
            setIsSendingMessage(true);
            
            // Add user message to chat
            const userMessage = {
                type: 'user',
                content: chatInput,
                timestamp: new Date().toISOString()
            };
            setChatMessages(prev => [...prev, userMessage]);
            
            // Clear input
            setChatInput('');

            // Send message to backend
            const response = await fetch(getApiUrl(`/api/${id}/generate-schedule/${scheduleId}/extra-constraints`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: chatInput
                })
            });

            if (!response.ok) {
                throw new Error('Failed to process message');
            }

            const result = await response.json();
            
            // Add assistant response to chat
            const assistantMessage = {
                type: 'assistant',
                content: result.message,
                constraints: result.extra_constraints,
                timestamp: new Date().toISOString()
            };
            setChatMessages(prev => [...prev, assistantMessage]);

            // Always refresh schedule data after a message response
            const refreshResponse = await fetch(getApiUrl(`/api/${id}/schedule/${scheduleId}`));
            if (refreshResponse.ok) {
                const refreshedData = await refreshResponse.json();
                console.log('Refreshed Schedule Data:', refreshedData);
                setScheduleData(refreshedData);
            } else {
                console.error('Failed to refresh schedule data');
            }

        } catch (error) {
            console.error('Error sending message:', error);
            // Add error message to chat
            const errorMessage = {
                type: 'error',
                content: `Error: ${error.message}`,
                timestamp: new Date().toISOString()
            };
            setChatMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsSendingMessage(false);
        }
    };

    return (
        <div style={styles.pageContainer}>
            <ProjectHeader />
            <div style={styles.header}>
                <div>
                    <h2 style={styles.pageTitle}>Scheduling</h2>
                </div>
                <div style={styles.headerRight}>
                    <div style={styles.dateInfo}>
                        <div>Estd. Start Date: {scheduleData?.first_date || 'Not set'}</div>
                        <div>Estd. End Date: {scheduleData?.last_date || 'Not set'}</div>
                    </div>
                </div>
            </div>
            <div style={styles.content}>
                <div style={styles.leftPanel}>
                    <div style={styles.elementSelector}>
                        <div style={styles.selectorHeader}>
                            <span>&lt;</span>
                            <select 
                                value={selectedElement}
                                onChange={(e) => handleElementChange(e.target.value)}
                                style={styles.elementDropdown}
                            >
                                <option value="">Select Element</option>
                                {getElementOptions().map((option, index) => (
                                    <option key={index} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <span>&gt;</span>
                        </div>
                    </div>
                    
                    <div style={styles.givenDates}>
                        <div style={styles.sectionTitle}>Given Dates</div>
                        {selectedElement ? (
                            <div style={styles.datePickerContainer}>
                                {selectedDates.length === 0 && !isSaving && (
                                    <div style={styles.existingDatesInfo}>
                                        <span style={styles.existingDatesLabel}>
                                            {`No dates selected for ${getSelectedElementName()}`}
                                        </span>
                                    </div>
                                )}
                                
                                <div style={styles.modeSelector}>
                                    <label style={styles.modeLabel}>
                                        <input
                                            type="radio"
                                            value="single"
                                            checked={datePickerMode === 'single'}
                                            onChange={(e) => setDatePickerMode(e.target.value)}
                                            style={styles.radioInput}
                                        />
                                        Single Dates
                                    </label>
                                    <label style={styles.modeLabel}>
                                        <input
                                            type="radio"
                                            value="range"
                                            checked={datePickerMode === 'range'}
                                            onChange={(e) => setDatePickerMode(e.target.value)}
                                            style={styles.radioInput}
                                        />
                                        Date Range
                                    </label>
                                </div>

                                {datePickerMode === 'single' ? (
                                    <input
                                        type="date"
                                        min={scheduleData?.first_date}
                                        max={scheduleData?.last_date}
                                        onChange={handleSingleDateChange}
                                        style={styles.datePicker}
                                    />
                                ) : (
                                    <div style={styles.dateRangeContainer}>
                                        <div style={styles.dateRangeInputs}>
                                            <input
                                                type="date"
                                                value={dateRangeStart}
                                                min={scheduleData?.first_date}
                                                max={scheduleData?.last_date}
                                                onChange={handleRangeStartChange}
                                                style={styles.dateRangeInput}
                                                placeholder="Start Date"
                                            />
                                            <span style={styles.dateRangeSeparator}>to</span>
                                            <input
                                                type="date"
                                                value={dateRangeEnd}
                                                min={dateRangeStart || scheduleData?.first_date}
                                                max={scheduleData?.last_date}
                                                onChange={handleRangeEndChange}
                                                style={styles.dateRangeInput}
                                                placeholder="End Date"
                                            />
                                        </div>
                                        <button
                                            onClick={addDateRange}
                                            style={styles.addRangeButton}
                                            disabled={!dateRangeStart || !dateRangeEnd}
                                        >
                                            Add Range
                                        </button>
                                    </div>
                                )}

                                {(selectedDates.length > 0 || hasChanges()) && (
                                    <div style={styles.selectedDatesList}>
                                        <div style={styles.selectedDatesHeader}>
                                            <span>Selected Dates ({selectedDates.length}):</span>
                                            <div style={styles.dateActions}>
                                                {hasChanges() && (
                                                    <button
                                                        onClick={saveDates}
                                                        style={styles.saveDatesButton}
                                                        title="Save dates"
                                                        disabled={isSaving}
                                                    >
                                                        {isSaving ? 'Saving...' : 'Save Dates'}
                                                    </button>
                                                )}
                                                {selectedDates.length > 0 && (
                                                    <button
                                                        onClick={clearAllDates}
                                                        style={styles.clearAllButton}
                                                        title="Clear all dates"
                                                    >
                                                        Clear All
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {selectedDates.length > 0 && (
                                            <div style={styles.calendarContainer}>
                                                <div style={styles.calendarHeader}>
                                                    {getCalendarMonthYear()}
                                                </div>
                                                <div style={styles.calendarGrid}>
                                                    <div style={styles.calendarDaysHeader}>
                                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                                            <div key={day} style={styles.calendarDayHeader}>
                                                                {day}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div style={styles.calendarDaysGrid}>
                                                        {generateCalendarDays().map((date, index) => {
                                                            const dateStr = date.toISOString().split('T')[0];
                                                            const isSelected = selectedDates.includes(dateStr);
                                                            const isInRange = isDateInRange(date);
                                                            const isWithinSchedule = date >= new Date(scheduleData.first_date) && 
                                                                                    date <= new Date(scheduleData.last_date);
                                                            const isOtherMonth = date.getMonth() !== new Date(scheduleData.first_date).getMonth() && 
                                                                                date.getMonth() !== new Date(scheduleData.last_date).getMonth();
                                                            
                                                            return (
                                                                <div
                                                                    key={index}
                                                                    style={{
                                                                        ...styles.calendarDay,
                                                                        ...(isSelected && isInRange ? styles.calendarDayRangeSelected : {}),
                                                                        ...(isSelected && !isInRange ? styles.calendarDaySingleSelected : {}),
                                                                        ...(isOtherMonth ? styles.calendarDayOtherMonth : {}),
                                                                        ...(!isWithinSchedule ? styles.calendarDayDisabled : {})
                                                                    }}
                                                                    onClick={() => handleCalendarDateClick(date)}
                                                                >
                                                                    {date.getDate()}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={styles.calendarPlaceholder}>
                                Select an element to choose dates
                            </div>
                        )}
                    </div>

                    <div style={styles.scheduledDates}>
                        <div style={styles.sectionTitle}>Scheduled Dates</div>
                        {selectedElement && scheduleData?.schedule ? (
                            generateScheduledCalendar() || (
                                <div style={styles.datesPlaceholder}>
                                    No scheduled dates for {getSelectedElementName()}
                                </div>
                            )
                        ) : (
                            <div style={styles.datesPlaceholder}>
                                {selectedElement 
                                    ? 'Generate schedule to see scheduled dates'
                                    : 'Select an element to see scheduled dates'
                                }
                            </div>
                        )}
                    </div>
                </div>

                <div style={styles.centerPanel}>
                    <div style={styles.scheduleHeader}>Rough Schedule</div>
                    <div style={styles.maxPagesSection}>
                        <label style={styles.maxPagesLabel}>
                            Max. number of scenes per day - 
                        </label>
                        <input 
                            type="number"
                            value={maxScenes}
                            onChange={(e) => setMaxScenes(e.target.value)}
                            style={styles.pageInput}
                            placeholder="5"
                            min="1"
                        />
                        <button 
                            style={styles.generateButton}
                            onClick={handleGenerateSchedule}
                            disabled={isGenerating}
                        >
                            {isGenerating ? 'GENERATING...' : 'GENERATE'}
                        </button>
                    </div>
                    {scheduleData?.schedule ? (
                        <div style={styles.scheduleContent}>
                            <pre style={styles.scheduleDisplay}>
                                {formatScheduleForDisplay(scheduleData.schedule)}
                            </pre>
                        </div>
                    ) : (
                        <div style={styles.emptyScheduleSection}>
                            <div style={styles.emptyScheduleMessage}>
                                Generate rough schedule
                            </div>
                        </div>
                    )}
                </div>

                <div style={styles.rightPanel}>
                    <div style={styles.scheduleHeader}>Scheduling Assistant</div>
                    <div style={styles.chatContainer}>
                        <div style={styles.chatMessages}>
                            <div style={styles.welcomeMessage}>
                                Hello! I'm Kino, your scheduling assistant. I can help you with:
                                <ul style={styles.assistantList}>
                                    <li>Understanding the current schedule</li>
                                    <li>Suggesting optimal shooting dates</li>
                                    <li>Adding scheduling constraints</li>
                                </ul>
                                How can I assist you today?
                            </div>
                            {chatMessages.map((message, index) => (
                                <div 
                                    key={index} 
                                    style={{
                                        ...styles.messageContainer,
                                        ...(message.type === 'user' ? styles.userMessage : {}),
                                        ...(message.type === 'assistant' ? styles.assistantMessage : {}),
                                        ...(message.type === 'error' ? styles.errorMessage : {})
                                    }}
                                >
                                    <div style={styles.messageContent}>
                                        {message.content}
                                    </div>
                                    {message.constraints && (
                                        <div style={styles.constraintsContainer}>
                                            <div style={styles.constraintsHeader}>Added Constraints:</div>
                                            <pre style={styles.constraints}>
                                                {JSON.stringify(message.constraints, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                    <div style={styles.messageTimestamp}>
                                        {new Date(message.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={styles.chatInputContainer}>
                            <input 
                                type="text" 
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Type your message here..."
                                style={styles.chatInput}
                                disabled={isSendingMessage}
                            />
                            <button 
                                style={{
                                    ...styles.sendButton,
                                    ...(isSendingMessage ? styles.sendButtonDisabled : {})
                                }}
                                onClick={handleSendMessage}
                                disabled={isSendingMessage}
                            >
                                {isSendingMessage ? 'Sending...' : 'Send'}
                            </button>
                        </div>
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
        minHeight: '100vh',
        backgroundColor: '#fff',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
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
    headerRight: {
        textAlign: 'right',
    },
    dateInfo: {
        fontSize: '0.9rem',
        color: '#555',
        lineHeight: '1.4',
    },
    content: {
        display: 'flex',
        flex: 1,
        minHeight: 'calc(100vh - 120px)',
    },
    leftPanel: {
        width: '280px',
        borderRight: '1px solid #ccc',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
    },
    elementSelector: {
        padding: '15px',
        borderBottom: '1px solid #ccc',
        textAlign: 'center',
    },
    selectorHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        fontSize: '0.9rem',
    },
    elementDropdown: {
        padding: '4px 8px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '0.9rem',
        backgroundColor: '#fff',
        cursor: 'pointer',
        minWidth: '140px',
        textAlign: 'center',
    },
    elementName: {
        fontWeight: '500',
    },
    givenDates: {
        padding: '15px',
        borderBottom: '1px solid #ccc',
        flex: 1,
    },
    scheduledDates: {
        padding: '15px',
        flex: 1,
    },
    sectionTitle: {
        fontSize: '0.9rem',
        fontWeight: '500',
        marginBottom: '10px',
        textAlign: 'center',
    },
    dateColumns: {
        display: 'flex',
        marginBottom: '15px',
    },
    columnHeader: {
        flex: 1,
        textAlign: 'center',
        fontSize: '0.9rem',
        fontWeight: '500',
        paddingBottom: '5px',
        borderBottom: '1px solid #ccc',
    },
    datePickerContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    modeSelector: {
        display: 'flex',
        gap: '12px',
        marginBottom: '10px',
    },
    modeLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.8rem',
        color: '#333',
        cursor: 'pointer',
    },
    radioInput: {
        margin: '0',
        cursor: 'pointer',
    },
    datePicker: {
        padding: '8px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '0.9rem',
        backgroundColor: '#fff',
        cursor: 'pointer',
        width: '100%',
    },
    dateRangeContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    dateRangeInputs: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        flexWrap: 'wrap',
    },
    dateRangeInput: {
        padding: '6px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '0.75rem',
        backgroundColor: '#fff',
        cursor: 'pointer',
        minWidth: '100px',
        flex: 1,
    },
    dateRangeSeparator: {
        fontSize: '0.8rem',
        color: '#666',
        fontWeight: '500',
    },
    addRangeButton: {
        padding: '6px 12px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '0.8rem',
        cursor: 'pointer',
        alignSelf: 'flex-start',
        '&:disabled': {
            backgroundColor: '#ccc',
            cursor: 'not-allowed',
        }
    },
    selectedDatesList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    selectedDatesHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.8rem',
        fontWeight: '500',
        color: '#333',
        marginBottom: '8px',
    },
    dateActions: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
    },
    saveDatesButton: {
        background: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.7rem',
        fontWeight: '500',
        padding: '4px 8px',
        transition: 'background-color 0.2s',
        '&:hover': {
            backgroundColor: '#218838',
        },
        '&:disabled': {
            backgroundColor: '#ccc',
            cursor: 'not-allowed',
        }
    },
    clearAllButton: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.7rem',
        color: '#dc3545',
        textDecoration: 'underline',
        padding: '2px 4px',
    },
    selectedDatesContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        maxHeight: '150px',
        overflowY: 'auto',
    },
    selectedDateItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 8px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        border: '1px solid #e9ecef',
    },
    selectedDateText: {
        fontSize: '0.8rem',
        color: '#333',
    },
    removeDateButton: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#dc3545',
        padding: '2px 6px',
        borderRadius: '3px',
        transition: 'background-color 0.2s',
        '&:hover': {
            backgroundColor: 'rgba(220, 53, 69, 0.1)',
        }
    },
    calendarPlaceholder: {
        fontSize: '0.8rem',
        color: '#999',
        textAlign: 'center',
        padding: '20px 5px',
        fontStyle: 'italic',
    },
    datesPlaceholder: {
        fontSize: '0.8rem',
        color: '#999',
        textAlign: 'center',
        padding: '20px 5px',
        fontStyle: 'italic',
    },
    centerPanel: {
        width: '50%',
        borderRight: '1px solid #ccc',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
    },
    rightPanel: {
        flex: 1,
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
    },
    chatContainer: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '15px',
    },
    chatMessages: {
        flex: 1,
        overflowY: 'auto',
        marginBottom: '15px',
    },
    welcomeMessage: {
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '0.9rem',
        color: '#333',
        lineHeight: '1.4',
    },
    assistantList: {
        marginTop: '10px',
        paddingLeft: '20px',
        fontSize: '0.85rem',
        color: '#555',
    },
    chatInputContainer: {
        display: 'flex',
        gap: '10px',
        padding: '10px',
        borderTop: '1px solid #eee',
    },
    chatInput: {
        flex: 1,
        padding: '8px 12px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '0.9rem',
        '&:focus': {
            outline: 'none',
            borderColor: '#007bff',
        }
    },
    sendButton: {
        padding: '8px 16px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '0.9rem',
        cursor: 'pointer',
        '&:hover': {
            backgroundColor: '#0056b3',
        }
    },
    scheduleHeader: {
        padding: '15px',
        textAlign: 'center',
        fontSize: '1rem',
        fontWeight: '500',
        borderBottom: '1px solid #ccc',
        backgroundColor: '#f8f9fa',
    },
    maxPagesSection: {
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
    },
    maxPagesLabel: {
        fontSize: '0.9rem',
        color: '#333',
    },
    pageInput: {
        width: '40px',
        padding: '4px 6px',
        border: '1px solid #ccc',
        borderRadius: '3px',
        fontSize: '0.9rem',
        textAlign: 'center',
    },
    generateButton: {
        padding: '6px 12px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
        fontSize: '0.8rem',
        cursor: 'pointer',
        fontWeight: '500',
    },
    emptyScheduleSection: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        padding: '40px 20px',
    },
    emptyScheduleMessage: {
        fontSize: '1.1rem',
        color: '#666',
        marginBottom: '30px',
        textAlign: 'center',
    },
    scheduleContent: {
        flex: 1,
        padding: '20px',
        overflow: 'auto',
    },
    scheduleDisplay: {
        fontSize: '0.9rem',
        lineHeight: '1.4',
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
    },
    existingDatesInfo: {
        marginBottom: '10px',
        padding: '8px',
        backgroundColor: '#e8f4f8',
        borderRadius: '4px',
        border: '1px solid #bee5eb',
    },
    existingDatesLabel: {
        fontSize: '0.75rem',
        color: '#0c5460',
        fontWeight: '500',
    },
    calendarContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    calendarHeader: {
        textAlign: 'center',
        fontSize: '0.9rem',
        fontWeight: '500',
        color: '#333',
        padding: '8px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
    },
    calendarGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    calendarDaysHeader: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '2px',
    },
    calendarDayHeader: {
        textAlign: 'center',
        fontSize: '0.7rem',
        fontWeight: '500',
        color: '#666',
        padding: '4px',
    },
    calendarDaysGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '2px',
    },
    calendarDay: {
        textAlign: 'center',
        fontSize: '0.7rem',
        padding: '6px 4px',
        borderRadius: '3px',
        cursor: 'pointer',
        border: '1px solid #e9ecef',
        backgroundColor: '#fff',
        transition: 'all 0.2s',
        '&:hover': {
            backgroundColor: '#f8f9fa',
        }
    },
    calendarDaySingleSelected: {
        backgroundColor: '#28a745',
        color: 'white',
        border: '1px solid #28a745',
        '&:hover': {
            backgroundColor: '#218838',
        }
    },
    calendarDayRangeSelected: {
        backgroundColor: '#007bff',
        color: 'white',
        border: '1px solid #007bff',
        '&:hover': {
            backgroundColor: '#0056b3',
        }
    },
    calendarDayOtherMonth: {
        color: '#ccc',
        backgroundColor: '#f8f9fa',
    },
    calendarDayDisabled: {
        backgroundColor: '#f8f9fa',
        color: '#ccc',
        cursor: 'not-allowed',
        '&:hover': {
            backgroundColor: '#f8f9fa',
        }
    },
    calendarDayScheduled: {
        backgroundColor: '#ffc107',
        color: '#212529',
        border: '1px solid #ffc107',
        fontWeight: '500',
    },
    scheduledCalendarContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    messageContainer: {
        padding: '12px',
        marginBottom: '12px',
        borderRadius: '8px',
        maxWidth: '85%',
    },
    userMessage: {
        backgroundColor: '#007bff',
        color: 'white',
        marginLeft: 'auto',
    },
    assistantMessage: {
        backgroundColor: '#f8f9fa',
        color: '#333',
        marginRight: 'auto',
        border: '1px solid #dee2e6',
    },
    errorMessage: {
        backgroundColor: '#dc3545',
        color: 'white',
        marginRight: 'auto',
    },
    messageContent: {
        fontSize: '0.9rem',
        lineHeight: '1.4',
        marginBottom: '4px',
    },
    messageTimestamp: {
        fontSize: '0.7rem',
        opacity: 0.8,
        marginTop: '4px',
    },
    constraintsContainer: {
        marginTop: '8px',
        padding: '8px',
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        borderRadius: '4px',
    },
    constraintsHeader: {
        fontSize: '0.8rem',
        fontWeight: '500',
        marginBottom: '4px',
    },
    constraints: {
        fontSize: '0.8rem',
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
    },
    sendButtonDisabled: {
        backgroundColor: '#ccc',
        cursor: 'not-allowed',
        '&:hover': {
            backgroundColor: '#ccc',
        }
    },
};

export default ManageSchedules