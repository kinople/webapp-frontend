import ProjectHeader from '../components/ProjectHeader'
import { useNavigate, useParams } from 'react-router-dom'

const Scheduling = () => {
    const navigate = useNavigate();
    const { user, id } = useParams();

    return (
        <div style={styles.pageContainer}>
            <ProjectHeader />
            <div style={styles.header}>
                <div>
                    <h2 style={styles.pageTitle}>Scheduling</h2>
                </div>
            </div>
            <div style={styles.content}>
                <div style={styles.buttonContainer}>
                    <button 
                        style={styles.button}
                        onClick={() => navigate(`/${user}/${id}/manage-dates`)}
                    >
                        Manage Dates
                    </button>
                    <button 
                        style={styles.button}
                        onClick={() => navigate(`/${user}/${id}/manage-schedules`)}
                    >
                        Manage Schedules
                    </button>
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
    content: {
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
    },
    buttonContainer: {
        display: 'flex',
        gap: '2rem',
        justifyContent: 'center',
    },
    button: {
        padding: '1rem 2rem',
        fontSize: '1rem',
        backgroundColor: '#e0e0e0',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        '&:hover': {
            backgroundColor: '#d0d0d0',
        }
    },
};

export default Scheduling