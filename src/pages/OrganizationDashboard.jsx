import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { getApiUrl, fetchWithAuth } from '../utils/api';

const OrganizationDashboard = () => {
    const { user, organizationid } = useParams();
    const location = useLocation();
    const [organization, setOrganization] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [addMemberLoading, setAddMemberLoading] = useState(false);
    const [deletingMember, setDeletingMember] = useState(null);
    const [currentSection, setCurrentSection] = useState('general');
    const [memberFormData, setMemberFormData] = useState({
        username: '',
        role_id: 1
    });

    // Update current section based on navigation state
    useEffect(() => {
        if (location.state?.section) {
            setCurrentSection(location.state.section);
        }
    }, [location.state]);

    useEffect(() => {
        const fetchOrganization = async () => {
            try {
                setLoading(true);
                const response = await fetchWithAuth(getApiUrl(`/api/${user}/organizations/${organizationid}`), {
                    method: 'GET',
                });
                
                if (!response.ok) {
                    throw new Error('Failed to fetch organization');
                }
                
                const data = await response.json();
                
                if (data.status === 'success') {
                    setOrganization(data.organization);
                } else {
                    throw new Error(data.message);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (organizationid) {
            fetchOrganization();
        }
    }, [user, organizationid]);

    const handleMemberInputChange = (e) => {
        const { name, value } = e.target;
        setMemberFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAddMemberClick = () => {
        setShowAddMemberModal(true);
        setMemberFormData({
            username: '',
            role_id: 1
        });
    };

    const handleCloseModal = () => {
        setShowAddMemberModal(false);
        setMemberFormData({
            username: '',
            role_id: 1
        });
        setError(null);
    };

    const handleAddMemberSubmit = async (e) => {
        e.preventDefault();
        
        if (!memberFormData.username.trim()) {
            setError('Username is required');
            return;
        }

        try {
            setAddMemberLoading(true);
            setError(null);

            const requestData = {
                username: memberFormData.username,
                role_id: parseInt(memberFormData.role_id)
            };

            const response = await fetchWithAuth(getApiUrl(`/api/${user}/organizations/${organizationid}/members`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error('Failed to add member');
            }

            const data = await response.json();
            
            if (data.status === 'success') {
                // Refresh organization details
                const refreshResponse = await fetchWithAuth(getApiUrl(`/api/${user}/organizations/${organizationid}`), {
                    method: 'GET',
                });
                
                if (refreshResponse.ok) {
                    const refreshData = await refreshResponse.json();
                    if (refreshData.status === 'success') {
                        setOrganization(refreshData.organization);
                    }
                }
                handleCloseModal();
            } else {
                throw new Error(data.message || 'Failed to add member');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setAddMemberLoading(false);
        }
    };

    const handleRemoveMember = async (memberUserId, memberUsername) => {
        if (!confirm(`Are you sure you want to remove ${memberUsername} from this organization?`)) {
            return;
        }

        try {
            setDeletingMember(memberUserId);
            setError(null);

            const response = await fetchWithAuth(getApiUrl(`/api/${user}/organizations/${organizationid}/members/${memberUserId}`), {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to remove member');
            }

            const data = await response.json();
            
            if (data.status === 'success') {
                // Refresh organization details to update the members list
                const refreshResponse = await fetchWithAuth(getApiUrl(`/api/${user}/organizations/${organizationid}`), {
                    method: 'GET',
                });
                
                if (refreshResponse.ok) {
                    const refreshData = await refreshResponse.json();
                    if (refreshData.status === 'success') {
                        setOrganization(refreshData.organization);
                    }
                }
            } else {
                throw new Error(data.message || 'Failed to remove member');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setDeletingMember(null);
        }
    };

    const renderGeneralContent = () => (
        <>
            {/* Organization Details */}
            <div style={{ 
                border: '1px solid #ccc', 
                padding: '20px', 
                borderRadius: '5px', 
                marginBottom: '20px',
                backgroundColor: 'white'
            }}>
                <h3 style={{ margin: '0 0 15px 0' }}>Organization Details</h3>
                <p><strong>Description:</strong> {organization.organizationdetails?.description || 'No description'}</p>
                <p><strong>Created:</strong> {new Date(organization.createtime).toLocaleDateString()}</p>
                {organization.deletetime && (
                    <p><strong>Deleted:</strong> {new Date(organization.deletetime).toLocaleDateString()}</p>
                )}
            </div>

            {/* Projects Section */}
            <div style={{ 
                border: '1px solid #ccc', 
                padding: '20px', 
                borderRadius: '5px',
                backgroundColor: 'white'
            }}>
                <h3 style={{ margin: '0 0 15px 0' }}>Projects ({organization.projects?.length || 0})</h3>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {organization.projects?.length > 0 ? (
                        <div style={{ display: 'grid', gap: '15px' }}>
                            {organization.projects.map((project) => (
                                <div key={project.project_id} style={{ 
                                    padding: '15px', 
                                    backgroundColor: '#f8f9fa', 
                                    borderRadius: '5px',
                                    border: '1px solid #dee2e6'
                                }}>
                                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>
                                        {project.projectname}
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#6c757d' }}>
                                        Type: {project.projecttype} | 
                                        Created: {new Date(project.createtime).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ margin: 0, fontStyle: 'italic', color: '#6c757d' }}>No projects found</p>
                    )}
                </div>
            </div>
        </>
    );

    const renderMembersContent = () => (
        <div style={{ 
            border: '1px solid #ccc', 
            padding: '20px', 
            borderRadius: '5px', 
            marginBottom: '20px',
            backgroundColor: 'white'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>Members ({organization.members?.length || 0})</h3>
                <button
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '14px'
                    }}
                    onClick={handleAddMemberClick}
                >
                    + Add Member
                </button>
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto', overflowX: 'auto' }}>
                {organization.members?.length > 0 ? (
                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#e9ecef' }}>
                                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Username</th>
                                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Role</th>
                                <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {organization.members.map((member) => (
                                <tr key={member.user_id} style={{ borderBottom: '1px solid #dee2e6' }}>
                                    <td style={{ padding: '10px' }}>{member.username}</td>
                                    <td style={{ padding: '10px' }}>{member.role_name}</td>
                                    <td style={{ padding: '10px', textAlign: 'right' }}>
                                        <button
                                            onClick={() => handleRemoveMember(member.user_id, member.username)}
                                            disabled={deletingMember === member.user_id}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: deletingMember === member.user_id ? 'not-allowed' : 'pointer',
                                                color: deletingMember === member.user_id ? '#ccc' : '#dc3545',
                                                fontSize: '16px',
                                                padding: '5px'
                                            }}
                                            title="Remove member"
                                        >
                                            {deletingMember === member.user_id ? '⏳' : '🗑️'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p style={{ margin: 0, fontStyle: 'italic', color: '#6c757d' }}>No members found</p>
                )}
            </div>
        </div>
    );

    const renderBillingContent = () => (
        <div style={{ 
            border: '1px solid #ccc', 
            padding: '20px', 
            borderRadius: '5px',
            backgroundColor: 'white'
        }}>
            <h3 style={{ margin: '0 0 15px 0' }}>Billing & Usage</h3>
            <p style={{ margin: '0 0 10px 0', fontStyle: 'italic', color: '#6c757d' }}>
                Billing information coming soon...
            </p>
            <p style={{ margin: 0, color: '#007bff' }}>
                For billing inquiries, please contact us.
            </p>
        </div>
    );

    if (loading) {
        return <div style={{ 
            paddingTop: '2rem', 
            paddingLeft: '270px',
            minHeight: '100vh' 
        }}>Loading organization...</div>;
    }

    if (error) {
        return (
            <div style={{ 
                paddingTop: '2rem', 
                paddingLeft: '270px',
                minHeight: '100vh' 
            }}>
                <div style={{ 
                    color: 'red', 
                    padding: '10px', 
                    backgroundColor: '#fee', 
                    border: '1px solid #fcc',
                    borderRadius: '5px',
                    marginBottom: '20px'
                }}>
                    Error: {error}
                </div>
                <Link to={`/${user}`} style={{ textDecoration: 'none', color: '#007bff' }}>
                    ← Back to Dashboard
                </Link>
            </div>
        );
    }

    if (!organization) {
        return (
            <div style={{ 
                paddingTop: '2rem', 
                paddingLeft: '270px',
                minHeight: '100vh' 
            }}>
                <p>Organization not found.</p>
                <Link to={`/${user}`} style={{ textDecoration: 'none', color: '#007bff' }}>
                    ← Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div style={{ 
            paddingTop: '2rem', 
            paddingLeft: '270px',
            paddingRight: '2rem',
            minHeight: '100vh',
            maxWidth: 'calc(100vw - 270px)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <Link to={`/${user}`} style={{ textDecoration: 'none', color: '#007bff', marginBottom: '10px', display: 'inline-block' }}>
                        ← Back to Dashboard
                    </Link>
                    <h1 style={{ margin: '10px 0' }}>{organization.organizationname}</h1>
                </div>
            </div>

            {error && (
                <div style={{ 
                    color: 'red', 
                    padding: '10px', 
                    backgroundColor: '#fee', 
                    border: '1px solid #fcc',
                    borderRadius: '5px',
                    marginBottom: '20px'
                }}>
                    Error: {error}
                </div>
            )}

            {/* Add Member Modal */}
            {showAddMemberModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        minWidth: '400px',
                        maxWidth: '500px',
                        position: 'relative'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>Add Member to Organization</h3>
                            <button
                                onClick={handleCloseModal}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    padding: '0',
                                    color: '#666'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {error && (
                            <div style={{ 
                                color: 'red', 
                                padding: '10px', 
                                backgroundColor: '#fee', 
                                border: '1px solid #fcc',
                                borderRadius: '5px',
                                marginBottom: '15px',
                                fontSize: '14px'
                            }}>
                                Error: {error}
                            </div>
                        )}

                        <form onSubmit={handleAddMemberSubmit}>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    Username *
                                </label>
                                <input
                                    type="text"
                                    name="username"
                                    value={memberFormData.username}
                                    onChange={handleMemberInputChange}
                                    required
                                    style={{ 
                                        width: '100%', 
                                        padding: '8px', 
                                        border: '1px solid #ccc',
                                        borderRadius: '3px',
                                        fontSize: '14px'
                                    }}
                                    placeholder="Enter username"
                                />
                            </div>
                            
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    Role ID
                                </label>
                                <select
                                    name="role_id"
                                    value={memberFormData.role_id}
                                    onChange={handleMemberInputChange}
                                    style={{ 
                                        width: '100%', 
                                        padding: '8px', 
                                        border: '1px solid #ccc',
                                        borderRadius: '3px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value={1}>Admin (1)</option>
                                    <option value={2}>Member (2)</option>
                                    <option value={3}>Viewer (3)</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button 
                                    type="button"
                                    onClick={handleCloseModal}
                                    style={{ 
                                        padding: '10px 20px', 
                                        backgroundColor: '#6c757d', 
                                        color: 'white', 
                                        border: 'none', 
                                        borderRadius: '5px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={addMemberLoading}
                                    style={{ 
                                        padding: '10px 20px', 
                                        backgroundColor: addMemberLoading ? '#ccc' : '#28a745', 
                                        color: 'white', 
                                        border: 'none', 
                                        borderRadius: '5px',
                                        cursor: addMemberLoading ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {addMemberLoading ? 'Adding...' : 'Add Member'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Conditional Content Rendering */}
            {currentSection === 'general' && renderGeneralContent()}
            {currentSection === 'members' && renderMembersContent()}
            {currentSection === 'billing' && renderBillingContent()}
        </div>
    );
};

export default OrganizationDashboard;