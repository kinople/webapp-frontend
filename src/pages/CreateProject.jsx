import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getApiUrl } from '../utils/api';

const CreateProject = () => {
    const [form, setForm] = useState({
        projectName: '',
        projectType: 'Feature Film' // default value
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { user } = useParams();

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch(getApiUrl(`/api/create-project/${user}`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(form),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to create project');
            }

            const data = await response.json();
            // Navigate to the new project's dashboard
            navigate(`/${user}`);
        } catch (err) {
            setError(err.message || 'Failed to create project. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Create New Project</h2>
            <form onSubmit={handleSubmit} style={styles.form}>
                {error && <div style={styles.error}>{error}</div>}
                
                <div style={styles.inputGroup}>
                    <label htmlFor="projectName" style={styles.label}>
                        Project Name
                    </label>
                    <input
                        id="projectName"
                        name="projectName"
                        type="text"
                        value={form.projectName}
                        onChange={handleChange}
                        required
                        style={styles.input}
                        placeholder="Enter project name"
                    />
                </div>

                <div style={styles.inputGroup}>
                    <label htmlFor="projectType" style={styles.label}>
                        Project Type
                    </label>
                    <select
                        id="projectType"
                        name="projectType"
                        value={form.projectType}
                        onChange={handleChange}
                        required
                        style={styles.select}
                    >
                        <option value="Feature Film">Feature Film</option>
                        <option value="Short Film">Short Film</option>
                        <option value="Documentary">Documentary</option>
                        <option value="Web Series">Web Series</option>
                        <option value="TV Show">TV Show</option>
                        <option value="Commercial">Commercial</option>
                        <option value="Music Video">Music Video</option>
                    </select>
                </div>

                <div style={styles.buttonContainer}>
                    <button
                        type="button"
                        onClick={() => navigate(`/${user}`)}
                        style={styles.cancelButton}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        style={styles.submitButton}
                    >
                        {isLoading ? 'Creating...' : 'Create Project'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const styles = {
    container: {
        maxWidth: '600px',
        margin: '40px auto',
        padding: '20px',
    },
    title: {
        fontSize: '24px',
        marginBottom: '30px',
        textAlign: 'center',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        fontSize: '16px',
        color: '#333',
    },
    input: {
        padding: '10px',
        fontSize: '16px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        width: '100%',
    },
    select: {
        padding: '10px',
        fontSize: '16px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        width: '100%',
        backgroundColor: 'white',
    },
    buttonContainer: {
        display: 'flex',
        gap: '10px',
        justifyContent: 'flex-end',
        marginTop: '20px',
    },
    submitButton: {
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px',
        ':disabled': {
            backgroundColor: '#ccc',
            cursor: 'not-allowed',
        },
    },
    cancelButton: {
        padding: '10px 20px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px',
    },
    error: {
        color: '#dc3545',
        padding: '10px',
        borderRadius: '4px',
        marginBottom: '10px',
        textAlign: 'center',
    },
};

export default CreateProject; 