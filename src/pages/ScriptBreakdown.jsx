import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ProjectHeader from '../components/ProjectHeader';
const ScriptBreakdown = () => {
    const { id } = useParams();
    const [scriptBreakdown, setScriptBreakdown] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const parseTSV = (tsvText) => {
      const lines = tsvText.split('\n');
      const headers = lines[0].split('\t').map(header => header.trim());
      const rows = lines.slice(1).filter(line => line.trim() !== '').map(line => {
          const values = line.split('\t').map(value => value.trim());
          return headers.reduce((obj, header, index) => {
              obj[header] = values[index] || '';
              return obj;
          }, {});
      });
      return rows;
  };

    const fetchBreakdown = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await fetch(`/api/${id}/fetch-breakdown`, {
                method: 'GET',
            });
            if (!response.ok) {
                throw new Error('Failed to fetch breakdown');
            }
            const tsvText = await response.text();
            const parsedData = parseTSV(tsvText);
            setScriptBreakdown(parsedData);
        } catch (error) {
            console.error('Error fetching breakdown:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBreakdown();
    }, [id]); // Re-fetch when ID changes

    return (
        <div style={styles.pageContainer}>
            <ProjectHeader />
            <div style={styles.header}>
                <div>
                    <h2 style={styles.pageTitle}>Script Breakdown</h2>
                </div>
            </div>
            <div style={styles.mainContent}>
                <div style={styles.contentArea}>
                    {isLoading ? (
                        <div style={styles.message}>Loading breakdown...</div>
                    ) : error ? (
                        <div style={styles.errorMessage}>{error}</div>
                    ) : scriptBreakdown.length === 0 ? (
                        <div style={styles.message}>No breakdown data available</div>
                    ) : (
                        <div style={styles.tableContainer}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        {Object.keys(scriptBreakdown[0]).map((header, index) => (
                                            <th key={index} style={styles.tableHeader}>
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {scriptBreakdown.map((row, rowIndex) => (
                                        <tr key={rowIndex} style={styles.tableRow}>
                                            {Object.values(row).map((cell, cellIndex) => (
                                                <td key={cellIndex} style={styles.tableCell}>
                                                    {cell}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    borderBottom: '1px solid #eee',
    backgroundColor: '#fff',
  },
  mainContent: {
    display: 'flex',
    flexGrow: 1,
    height: 'calc(100vh - 120px)', // Adjust based on your header height
  },
  sidebar: {
    width: '250px',
    borderRight: '1px solid #eee',
    backgroundColor: '#f8f9fa',
    padding: '1rem',
    overflowY: 'auto',
  },
  scriptList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  scriptButton: {
    padding: '0.75rem 1rem',
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '0.9rem',
    color: '#333',
    transition: 'all 0.2s ease',
    width: '100%',
    '&:hover': {
      backgroundColor: '#f0f0f0',
      borderColor: '#ccc',
    },
  },
  scriptButtonActive: {
    backgroundColor: '#e6f3ff',
    borderColor: '#1a73e8',
    color: '#1a73e8',
  },
  contentArea: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '1rem',
    height: '100%',
    width: '100%',
    overflowX: 'auto',
  },
  projectTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    margin: 0,
    color: '#000',
  },
  pageTitle: {
    fontSize: '1.1rem',
    fontWeight: 'normal',
    margin: '0.25rem 0 0 0',
    color: '#555',
  },
  button: {
    padding: '0.6rem 1.2rem',
    backgroundColor: '#e0e0e0',
    color: '#333',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    fontWeight: '500',
    minWidth: '150px',
    textAlign: 'center',
  },
  buttonDisabled: {
    padding: '0.6rem 1.2rem',
    backgroundColor: '#f5f5f5',
    color: '#aaa',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'not-allowed',
    minWidth: '150px',
    textAlign: 'center',
    fontWeight: '500',
  },
  placeholder: {
    fontSize: '1rem',
    color: '#aaa',
  },
  statusMessage: {
    fontSize: '0.9rem',
    color: '#333',
    marginBottom: '1rem',
  },
  pdfViewer: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  tableContainer: {
    width: '100%',
    overflowX: 'auto',
    padding: '1rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  tableHeader: {
    backgroundColor: '#f8f9fa',
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#333',
    borderBottom: '2px solid #dee2e6',
    position: 'sticky',
    top: 0,
  },
  tableRow: {
    borderBottom: '1px solid #dee2e6',
    '&:hover': {
      backgroundColor: '#f8f9fa',
    },
  },
  tableCell: {
    padding: '12px 16px',
    fontSize: '0.9rem',
    color: '#333',
    whiteSpace: 'nowrap',
  },
  message: {
    fontSize: '1rem',
    color: '#666',
    textAlign: 'center',
    padding: '2rem',
  },
  errorMessage: {
    fontSize: '1rem',
    color: '#dc3545',
    textAlign: 'center',
    padding: '2rem',
  },
};

export default ScriptBreakdown;
