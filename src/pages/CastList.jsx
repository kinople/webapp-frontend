import React, { useState, useEffect } from 'react';
import ProjectHeader from '../components/ProjectHeader';
import { useParams } from 'react-router-dom';

const CastList = () => {
    const { user, id } = useParams();
    const [castList, setCastList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showScenesModal, setShowScenesModal] = useState(false);
    const [selectedCharacterScenes, setSelectedCharacterScenes] = useState('');
    const [selectedCharacter, setSelectedCharacter] = useState(null);

    const parseTSV = (tsvText) => {
        const lines = tsvText.split('\n');
        const headers = lines[0].split('\t').map(header => header.trim());
        const rows = lines.slice(1)
            .filter(line => line.trim() !== '')
            .map(line => {
                const values = line.split('\t').map(value => value.trim());
                return headers.reduce((obj, header, index) => {
                    obj[header] = values[index] || '';
                    return obj;
                }, {});
            });
        return rows;
    };

    useEffect(() => {
        const fetchCastList = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(`/api/${id}/cast-list`);
                if (!response.ok) {
                    throw new Error('Failed to fetch cast list');
                }
                const tsvText = await response.text();
                const parsedData = parseTSV(tsvText);
                setCastList(parsedData);
            } catch (error) {
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCastList();
    }, [id]);

    const handleScenesClick = (character, scenes, scenesList) => {
        setSelectedCharacter(character);
        setSelectedCharacterScenes(scenesList);
        setShowScenesModal(true);
    };

    return (
        <div style={styles.pageContainer}>
            <ProjectHeader />
            <div style={styles.header}>
                <div>
                    <h2 style={styles.pageTitle}>Cast List</h2>
                </div>
            </div>
            <div style={styles.content}>
                {isLoading ? (
                    <div style={styles.message}>Loading cast list...</div>
                ) : error ? (
                    <div style={styles.errorMessage}>{error}</div>
                ) : castList.length === 0 ? (
                    <div style={styles.message}>No cast members found</div>
                ) : (
                    <>
                        <div style={styles.tableContainer}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        {Object.keys(castList[0])
                                            .filter(header => header !== 'Scene Numbers')
                                            .slice(0, -1)
                                            .map((header, index) => (
                                                <th key={index} style={styles.tableHeader}>
                                                    {header}
                                                </th>
                                            ))}
                                        <th style={styles.tableHeader}>Options</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {castList.map((member, rowIndex) => (
                                        <tr key={rowIndex} style={styles.tableRow}>
                                            {Object.entries(member)
                                                .filter(([key]) => key !== 'Scene Numbers')
                                                .slice(0, -1)
                                                .map(([key, value], cellIndex) => (
                                                    <td key={cellIndex} style={styles.tableCell}>
                                                        {key === 'Number of Scenes' ? (
                                                            <button
                                                                onClick={() => handleScenesClick(
                                                                    member.Character,
                                                                    value,
                                                                    member[Object.keys(member)[Object.keys(member).length - 2]]
                                                                )}
                                                                style={styles.scenesButton}
                                                            >
                                                                {value}
                                                            </button>
                                                        ) : (
                                                            value
                                                        )}
                                                    </td>
                                                ))}
                                            <td style={styles.tableCell}>
                                                <a
                                                    href={`/${id}/cast/${member['Cast ID']}/options`}
                                                    style={styles.optionsLink}
                                                >
                                                    View Options
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Scenes Modal */}
                        {showScenesModal && (
                            <div style={styles.modalOverlay}>
                                <div style={styles.modal}>
                                    <div style={styles.modalHeader}>
                                        <h3 style={styles.modalTitle}>
                                            Scenes for {selectedCharacter}
                                        </h3>
                                        <button 
                                            onClick={() => setShowScenesModal(false)}
                                            style={styles.closeButton}
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <div style={styles.sceneListContainer}>
                                        <div style={styles.sceneContent}>
                                            {selectedCharacterScenes}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
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
        padding: '1rem 2rem',
        flexGrow: 1,
    },
    tableContainer: {
        width: '100%',
        overflowX: 'auto',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '1rem',
    },
    tableHeader: {
        padding: '12px 16px',
        textAlign: 'left',
        borderBottom: '2px solid #eee',
        fontWeight: '600',
    },
    tableRow: {
        borderBottom: '1px solid #eee',
    },
    tableCell: {
        padding: '12px 16px',
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
    optionsLink: {
        color: '#007bff',
        textDecoration: 'none',
        cursor: 'pointer',
        '&:hover': {
            textDecoration: 'underline',
        },
    },
    scenesButton: {
        background: 'none',
        border: 'none',
        color: '#007bff',
        cursor: 'pointer',
        padding: '0',
        textDecoration: 'underline',
        fontSize: 'inherit',
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
    modal: {
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
    },
    modalTitle: {
        margin: 0,
        fontSize: '1.2rem',
        color: '#333',
    },
    closeButton: {
        background: 'none',
        border: 'none',
        fontSize: '1.5rem',
        cursor: 'pointer',
        color: '#666',
        padding: '4px 8px',
    },
    sceneListContainer: {
        overflowY: 'auto',
        maxHeight: 'calc(80vh - 100px)',
    },
    sceneContent: {
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        color: '#333',
        fontSize: '0.9rem',
        whiteSpace: 'pre-wrap',
        fontFamily: 'monospace',
    },
};

export default CastList;