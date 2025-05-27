import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ProjectHeader from '../components/ProjectHeader';

const CallSheetHome = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    return (
        <div style={styles.pageContainer}>
            <ProjectHeader />
            <div style={styles.content}>
                <h2 style={styles.title}>Call Sheets</h2>
                <div style={styles.buttonContainer}>
                    <button 
                        style={styles.button}
                        onClick={() => navigate(`/${id}/crew`)}
                    >
                        Crew List
                    </button>
                    <button 
                        style={styles.button}
                        onClick={() => navigate(`/${id}/manage-shoot-days`)}
                    >
                        Manage Shoot Days
                    </button>
                </div>
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
    buttonContainer: {
        display: 'flex',
        justifyContent: 'center',
        gap: '40px',
        marginTop: '20px',
    },
    button: {
        backgroundColor: '#e0e0e0',
        border: 'none',
        padding: '15px 30px',
        fontSize: '1rem',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        '&:hover': {
            backgroundColor: '#d0d0d0',
        },
    },
};

export default CallSheetHome;