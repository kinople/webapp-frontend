import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { getApiUrl, fetchWithAuth } from '../utils/api';

const Home = () => {
  const [currentProjects, setCurrentProjects] = useState([]);
  const previousProjects = []; // still empty for now
  const { user } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Get organization info from navigation state
  const organizationId = location.state?.organizationId || null;
  const organizationName = location.state?.organizationName || 'Personal';

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        // Build URL with organization parameter if available
        let url = getApiUrl(`/api/projects/${user}`);
        if (organizationId) {
          url += `?organizationId=${organizationId}`;
        }
        
        const res = await fetchWithAuth(url, {
          method: 'GET',
        });
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setCurrentProjects(data);
      } catch {
        setCurrentProjects([]);
      }
    })();
  }, [user, organizationId]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.heading}>Your Projects</h1>
        <button
          style={styles.newBtn}
          onClick={() => navigate(`/${user}/create-project`, {
            state: {
              organizationId,
              organizationName
            }
          })}
        >
          + New Project
        </button>
      </div>

      <section style={styles.section}>
        <h2 style={styles.subheading}>Current</h2>
        <div style={styles.grid}>
          {currentProjects.length
            ? currentProjects.map(p => (
                <Link
                  key={p.id}
                  to={`/${user}/${p.id}`}
                  style={styles.card}
                >
                  <h3 style={styles.cardTitle}>{p.projectName}</h3>
                  <p style={styles.cardDesc}>In Progress</p>
                </Link>
              ))
            : <p style={styles.empty}>No active projects yet.</p>
          }
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.subheading}>Previous</h2>
        <div style={styles.grid}>
          {previousProjects.length
            ? previousProjects.map(p => (
                <Link
                  key={p.id}
                  to={`/project/${p.id}`}
                  style={styles.card}
                >
                  <h3 style={styles.cardTitle}>{p.name}</h3>
                  <p style={styles.cardDesc}>Completed</p>
                </Link>
              ))
            : <p style={styles.empty}>You haven’t completed any yet.</p>
          }
        </div>
      </section>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    padding: '2rem',
    paddingLeft: '270px', // Add space for sidebar (250px + 20px margin)
    background: 'linear-gradient(135deg, #f5f7fa, #c3cfe2)',
    fontFamily: 'sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  heading: {
    margin: 0,
    fontSize: '2rem',
    color: '#2C3440',
  },
  newBtn: {
    padding: '0.6rem 1.2rem',
    fontSize: '1rem',
    background: 'linear-gradient(135deg, #6c5ce7, #00b894)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s',
  },
  section: {
    marginBottom: '2rem',
  },
  subheading: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.2rem',
    color: '#2C3440',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))',
    gap: '1rem',
  },
  card: {
    display: 'block',
    padding: '1.2rem',
    background: 'rgba(255,255,255,0.6)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.8)',
    borderRadius: '12px',
    textDecoration: 'none',
    color: '#2C3440',
    boxShadow: '0 8px 16px rgba(0,0,0,0.05)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  cardTitle: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.1rem',
    fontWeight: '600',
  },
  cardDesc: {
    margin: 0,
    fontSize: '0.9rem',
    color: '#555',
  },
  empty: {
    gridColumn: '1 / -1',
    color: '#666',
    textAlign: 'center',
    padding: '1rem 0',
  },
};

export default Home;
