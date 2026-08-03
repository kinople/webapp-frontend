import React, { useState } from 'react';
import '../css/Chatbot.css';
import CustomDatePicker from './CustomDatePicker';

export default function ScheduleSettingsForm({ defaultValues, onSubmit }) {
    const [formData, setFormData] = useState({
        generation_mode: defaultValues?.generation_mode || 'scenes',
        max_scenes_per_day: defaultValues?.max_scenes_per_day || '',
        start_date: defaultValues?.start_date || '',
        last_date: defaultValues?.last_date || ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Construct the hidden message for the LLM
        const constraintsList = [];
        if (formData.generation_mode) constraintsList.push(`Generation mode: ${formData.generation_mode}`);
        if (formData.max_scenes_per_day) constraintsList.push(`Max scenes per day: ${formData.max_scenes_per_day}`);
        if (formData.start_date) constraintsList.push(`Start date: ${formData.start_date}`);
        if (formData.last_date) constraintsList.push(`Last date: ${formData.last_date}`);

        const hiddenMessage = `Yes, regenerate the schedule with these exact settings:\n${constraintsList.join('\n')}\nKeep all other extra optimization constraints empty.`;
        
        onSubmit(hiddenMessage);
    };

    return (
        <div className="schedule-settings-card">
            <h4>Schedule Generation Settings</h4>
            <p className="settings-desc">Please confirm or adjust the parameters before regenerating the schedule.</p>
            
            <form onSubmit={handleSubmit} className="settings-form">
                <div className="form-group">
                    <label>Generation Mode</label>
                    <select 
                        name="generation_mode" 
                        value={formData.generation_mode} 
                        onChange={handleChange}
                        className="settings-input"
                    >
                        <option value="scenes">Max Scenes</option>
                        <option value="page_eights">Max Page Eighths</option>
                        <option value="hours">Max Hours</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Limit per Day</label>
                    <input 
                        type="number" 
                        name="max_scenes_per_day" 
                        value={formData.max_scenes_per_day} 
                        onChange={handleChange}
                        placeholder="e.g., 7"
                        className="settings-input"
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Start Date</label>
                        <CustomDatePicker 
                            value={formData.start_date} 
                            onChange={(e) => handleChange({ target: { name: 'start_date', value: e.target.value } })}
                            className="settings-input"
                        />
                    </div>
                    <div className="form-group">
                        <label>End Date</label>
                        <CustomDatePicker 
                            value={formData.last_date} 
                            onChange={(e) => handleChange({ target: { name: 'last_date', value: e.target.value } })}
                            className="settings-input"
                        />
                    </div>
                </div>

                <button type="submit" className="settings-submit-btn">
                    Regenerate Schedule
                </button>
            </form>
        </div>
    );
}
