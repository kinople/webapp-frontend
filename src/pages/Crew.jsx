import React, { useState } from 'react';
import ProjectHeader from "../components/ProjectHeader";

const Crew = () => {
    const [departments, setDepartments] = useState([
        {
            id: 1,
            name: 'Department 1',
            positions: []
        },
        {
            id: 2,
            name: 'Department 2',
            positions: []
        },
        {
            id: 3,
            name: 'Department 3',
            positions: []
        },
        {
            id: 4,
            name: 'Department 4',
            positions: []
        }
    ]);

    const addPosition = (departmentId) => {
        setDepartments(departments.map(dept => {
            if (dept.id === departmentId) {
                return {
                    ...dept,
                    positions: [...dept.positions, { position: '', name: '' }]
                };
            }
            return dept;
        }));
    };

    return (
        <div style={styles.pageContainer}>
            <ProjectHeader />
            <div style={styles.content}>
                <h2 style={styles.title}>Call Sheets</h2>
                
                <button style={styles.createDeptButton}>
                    Create Department
                </button>

                <div style={styles.departmentsContainer}>
                    {departments.map(dept => (
                        <div key={dept.id} style={styles.department}>
                            <div style={styles.departmentHeader}>
                                <span>{dept.name}</span>
                                <button style={styles.deleteButton}>×</button>
                            </div>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.tableHeader}>Position</th>
                                        <th style={styles.tableHeader}>Name</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dept.positions.map((pos, index) => (
                                        <tr key={index}>
                                            <td style={styles.tableCell}>
                                                <input 
                                                    type="text" 
                                                    style={styles.input}
                                                    value={pos.position}
                                                    onChange={(e) => {/* Handle change */}}
                                                />
                                            </td>
                                            <td style={styles.tableCell}>
                                                <input 
                                                    type="text" 
                                                    style={styles.input}
                                                    value={pos.name}
                                                    onChange={(e) => {/* Handle change */}}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button 
                                style={styles.addButton}
                                onClick={() => addPosition(dept.id)}
                            >
                                +
                            </button>
                        </div>
                    ))}
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
        padding: '20px 40px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
    },
    title: {
        fontSize: '1.1rem',
        fontWeight: 'normal',
        color: '#555',
        marginBottom: '40px',
    },
    createDeptButton: {
        alignSelf: 'flex-end',
        padding: '8px 16px',
        backgroundColor: '#e0e0e0',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        marginBottom: '20px',
    },
    departmentsContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '30px',
        padding: '20px 0',
    },
    department: {
        border: '1px solid #ccc',
        borderRadius: '4px',
        overflow: 'hidden',
        width: '100%',
        backgroundColor: '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    },
    departmentHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px',
        backgroundColor: '#f5f5f5',
        borderBottom: '1px solid #ccc',
    },
    deleteButton: {
        background: 'none',
        border: 'none',
        fontSize: '20px',
        cursor: 'pointer',
        padding: '0 5px',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    tableHeader: {
        padding: '10px',
        textAlign: 'left',
        borderBottom: '1px solid #ccc',
        backgroundColor: '#fff',
    },
    tableCell: {
        padding: '5px',
        borderBottom: '1px solid #eee',
    },
    input: {
        width: '100%',
        padding: '5px',
        border: '1px solid transparent',
        '&:focus': {
            border: '1px solid #ccc',
            outline: 'none',
        },
    },
    addButton: {
        width: '100%',
        padding: '8px',
        border: 'none',
        backgroundColor: '#f5f5f5',
        cursor: 'pointer',
        borderTop: '1px solid #ccc',
        '&:hover': {
            backgroundColor: '#e0e0e0',
        },
    },
};

export default Crew;    