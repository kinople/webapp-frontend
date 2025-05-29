import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { getApiUrl } from '../utils/api';

const Home = () => {
    
    const previousProjects = [];

    const [currentProjects, setCurrentProjects] = useState([]);

    const { user, id } = useParams();

    const navigate = useNavigate();

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await fetch(getApiUrl(`/api/projects/${user}`), {
                    method: 'GET',
                    credentials: 'include',
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch projects');
                }
                const data = await response.json(); 
                setCurrentProjects(data);
            } catch (error) {
                console.error('Error fetching projects:', error);
                setCurrentProjects([]);
            }
        };
        
        if (user) {
            fetchProjects();
        }
    }, [user]);

    return (
        <div style={styles.container}>
            <button 
                style={styles.startButton}
                onClick={() => navigate(`/${user}/create-project`)}
            >
                Start New Project
            </button>

            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Current Projects</h2>
                <div style={styles.underline}></div>
                {currentProjects.length > 0 ? (
                    <div style={styles.projectList}>
                        {currentProjects.map(project => (
                            <Link 
                                key={project.id} 
                                to={`/${user}/${project.id}`}
                                style={styles.projectLink}
                            >
                                {project.projectName}
                            </Link>
                        ))}
                    </div>
                ) : (
                    <p style={styles.description}>
                        Projects that you are a part of and created by you, which are in progress will be shown here
                    </p>
                )}
            </div>

            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Previous Projects</h2>
                <div style={styles.underline}></div>
                {previousProjects.length > 0 ? (
                    <div style={styles.projectList}>
                        {previousProjects.map(project => (
                            <Link 
                                key={project.id} 
                                to={`/project/${project.id}`}
                                style={styles.projectLink}
                            >
                                {project.name}
                            </Link>
                        ))}
                    </div>
                ) : (
                    <p style={styles.description}>
                        Projects that you were a part of and created by you, which have been completed will be shown here
                    </p>
                )}
            </div>
        </div>
    );
};

const styles = {
    container: {
        padding: '20px',
        maxWidth: '800px',
        margin: '0 auto',
        position: 'relative',
    },
    userIcon: {
        position: 'absolute',
        top: '20px',
        right: '20px',
    },
    circle: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '#000',
    },
    startButton: {
        display: 'block',
        margin: '40px auto',
        padding: '8px 20px',
        backgroundColor: '#e0e0e0',
        border: 'none',
        cursor: 'pointer',
        fontSize: '16px',
    },
    section: {
        marginBottom: '60px',
    },
    sectionTitle: {
        fontSize: '16px',
        fontWeight: 'normal',
        margin: '0',
        paddingBottom: '8px',
    },
    underline: {
        borderBottom: '1px solid #000',
        marginBottom: '20px',
    },
    description: {
        color: '#666',
        fontSize: '14px',
        margin: '20px 0',
    },
    projectList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        marginTop: '20px',
    },
    projectLink: {
        padding: '8px 12px',
        backgroundColor: 'transparent',
        border: '1px solid #ddd',
        borderRadius: '4px',
        textDecoration: 'none',
        color: '#333',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
        display: 'block',
        width: 'fit-content',
    },
};

export default Home;