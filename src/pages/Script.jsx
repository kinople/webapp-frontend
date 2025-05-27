import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectHeader from '../components/ProjectHeader';
const Script = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [selectedFile, setSelectedFile] = useState(null); // Keep track of the file *before* upload starts
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    // Add state to store uploaded scripts (example)
    const [uploadedScripts, setUploadedScripts] = useState([]); 
  
    // Create a ref for the hidden file input
    const fileInputRef = useRef(null);

    const [script_list, setScriptList] = useState([]);
    const [selectedScript, setSelectedScript] = useState(null);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [newFileName, setNewFileName] = useState('');
    const [showFileNameModal, setShowFileNameModal] = useState(false);
    const [tempFile, setTempFile] = useState(null);
  
    const fetchScripts = async () => {
        try{
            const response = await fetch(`/api/${id}/script-list`, {
                method: 'GET',
                headers: {
                'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            console.log(data);
            setScriptList(data);
        } catch (error) {
            console.error('Error fetching scripts present:', error);
        }
    }

    // Use useEffect to fetch scripts only once when component mounts
    useEffect(() => {
        fetchScripts();
    }, []); // Empty dependency array means this runs once on mount
    
    // Function to handle the actual file upload logic
    const uploadFile = async (file, fileName) => {
        if (!file) return;
    
        setIsUploading(true);
        setUploadStatus(`Uploading ${fileName}...`);
        setSelectedFile(null);
    
        const formData = new FormData();
        formData.append('scriptPdf', file);
        formData.append('fileName', fileName);
    
        try {
            const response = await fetch(`/api/${id}/upload-script`, {
                method: 'POST',
                body: formData,
            });
    
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
    
            const result = await response.json();
            setUploadStatus(`Successfully uploaded ${fileName}`);
            setUploadedScripts(prev => [...prev, { name: fileName }]);
            await fetchScripts();

            // After successful upload, generate breakdown
            const breakdownResponse = await fetch(`/api/${id}/generate-breakdown/${fileName}`, {
                method: 'POST',
            });

            if (!breakdownResponse.ok) {
                throw new Error('Failed to generate script breakdown');
            }

            // Navigate to the breakdown page
            navigate(`/${id}/script-breakdown`);
    
        } catch (error) {
            console.error('Upload error:', error);
            setUploadStatus(`Upload failed: ${error.message}`);
        } finally {
            setIsUploading(false);
            setShowFileNameModal(false);
            setNewFileName('');
            setTempFile(null);
            setTimeout(() => setUploadStatus(''), 3000);
        }
    };
  
    // This function is called when the hidden file input changes
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file && file.type === 'application/pdf') {
            setTempFile(file);
            setShowFileNameModal(true);
        } else if (file) {
            setUploadStatus('Please select a valid PDF file.');
            setTimeout(() => setUploadStatus(''), 3000);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = null;
        }
    };
  
    // This function is called when the "Import New Draft" button is clicked
    const handleImportClick = () => {
      // Trigger the hidden file input
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    };

    const handleScriptClick = async (script) => {
        try {
            const response = await fetch(`/api/${id}/script-view/${script}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/pdf',
                },
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch PDF');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
            setSelectedScript(script);
            
        } catch (error) {
            console.error('Error fetching script:', error);
            setUploadStatus('Failed to load the script');
            setTimeout(() => setUploadStatus(''), 3000);
        }
    };

    const handleFileNameSubmit = (e) => {
        e.preventDefault();
        if (newFileName.trim() && tempFile) {
            uploadFile(tempFile, newFileName.trim());
        }
    };

    // Cleanup function to revoke object URL when component unmounts or PDF changes
    useEffect(() => {
        return () => {
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [pdfUrl]);

  return (
    <div style={styles.pageContainer}>
      <ProjectHeader />
      <div style={styles.header}>
        <div>
          <h2 style={styles.pageTitle}>Script</h2>
        </div>
        <button
          onClick={handleImportClick}
          style={isUploading ? styles.buttonDisabled : styles.button}
          disabled={isUploading}
        >
          {isUploading ? 'Uploading...' : 'Import New Draft'}
        </button>
      </div>
      <input 
          type="file" 
          accept=".pdf" 
          onChange={handleFileChange} 
          style={{ display: 'none' }}
          ref={fileInputRef}
          disabled={isUploading}
        />

      {/* File Name Modal */}
      {showFileNameModal && (
          <div style={styles.modalOverlay}>
              <div style={styles.modal}>
                  <h3 style={styles.modalTitle}>Enter Script Name</h3>
                  <form onSubmit={handleFileNameSubmit}>
                      <input
                          type="text"
                          value={newFileName}
                          onChange={(e) => setNewFileName(e.target.value)}
                          placeholder="Enter script name"
                          style={styles.fileNameInput}
                          autoFocus
                      />
                      <div style={styles.modalButtons}>
                          <button
                              type="button"
                              onClick={() => {
                                  setShowFileNameModal(false);
                                  setNewFileName('');
                                  setTempFile(null);
                              }}
                              style={styles.cancelButton}
                          >
                              Cancel
                          </button>
                          <button
                              type="submit"
                              disabled={!newFileName.trim()}
                              style={newFileName.trim() ? styles.submitButton : styles.buttonDisabled}
                          >
                              Upload
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      <div style={styles.mainContent}>
        {/* Left sidebar with script list */}
        <div style={styles.sidebar}>
        <h3>Drafts</h3>
          {script_list.length > 0 && (
            <div style={styles.scriptList}>
              {script_list.map((script, index) => (
                <button
                  key={index}
                  style={{
                    ...styles.scriptButton,
                    ...(selectedScript === script.name ? styles.scriptButtonActive : {})
                  }}
                  onClick={() => handleScriptClick(script.name)}
                >
                  v{script.version} - {script.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main content area */}
        <div style={styles.contentArea}>
            {script_list.length === 0 && !isUploading && !uploadStatus && (
                <p style={styles.placeholder}>Upload scripts to view them here</p>
            )}
            {script_list.length > 0 && !pdfUrl && (
                <p style={styles.placeholder}>Select a script to view it here</p>
            )}
            {pdfUrl && (
                <iframe
                    src={pdfUrl}
                    style={styles.pdfViewer}
                    title="PDF Viewer"
                />
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    height: '100%', // Ensure full height
    position: 'relative', // For proper iframe sizing
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
    padding: '2rem',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '400px',
  },
  modalTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.2rem',
    color: '#333',
  },
  fileNameInput: {
    width: '100%',
    padding: '0.5rem',
    fontSize: '1rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    marginBottom: '1rem',
  },
  modalButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
  },
  cancelButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f5f5f5',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default Script;
