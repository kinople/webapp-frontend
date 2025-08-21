import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getApiUrl, fetchWithAuth } from '../utils/api';

const UserSettings = () => {
  const { user } = useParams();
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserDetails();
  }, [user]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth(getApiUrl(`/api/user/${user}`), {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }

      const data = await response.json();
      setUserDetails(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching user details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading user details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>User Settings</h1>
      </div>
      
      <div style={styles.content}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Account Information</h2>
          <div style={styles.userInfo}>
            <div style={styles.infoItem}>
              <label style={styles.label}>Username:</label>
              <span style={styles.value}>{userDetails?.email || user}</span>
            </div>
            <div style={styles.infoItem}>
              <label style={styles.label}>User ID:</label>
              <span style={styles.value}>{user}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    marginLeft: '250px', // Account for navbar width
    padding: '2rem',
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
  },
  header: {
    marginBottom: '2rem',
    borderBottom: '1px solid #e9ecef',
    paddingBottom: '1rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  content: {
    maxWidth: '600px',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#333',
    marginBottom: '1rem',
    margin: '0 0 1rem 0',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  label: {
    fontWeight: '500',
    color: '#666',
    minWidth: '100px',
  },
  value: {
    color: '#333',
    fontSize: '1rem',
  },
  loading: {
    textAlign: 'center',
    color: '#666',
    padding: '2rem',
    fontSize: '1.1rem',
  },
  error: {
    textAlign: 'center',
    color: '#dc3545',
    padding: '2rem',
    fontSize: '1.1rem',
  },
};

export default UserSettings;
