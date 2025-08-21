import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import ProjectHeader from '../components/ProjectHeader';
import { getApiUrl, fetchWithAuth } from '../utils/api';

ChartJS.register(ArcElement, Tooltip, Legend);

const ProjectDashboard = () => {
  const { user, id } = useParams(); // Extract both user and id from URL
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        console.log('fetchMetrics called, user:', user, 'id:', id); // Debug log
        
        if (!user || !id) {
          console.error('User or project ID not found in URL');
          return;
        }

        const apiUrl = getApiUrl(`/api/projects/${id}/metrics/${user}`);
        console.log('Making request to:', apiUrl); // Debug log

        const res = await fetchWithAuth(apiUrl);
        console.log('Response received:', res); // Debug log
        
        const data = await res.json();
        console.log('Response data:', data); // Debug log
        
        if (res.ok) {
          setMetrics(data);
        } else {
          console.error('Error fetching metrics:', data.message);
        }
      } catch (err) {
        console.error('Error fetching metrics:', err);
      }
    };

    fetchMetrics();
  }, [user, id]); // Add user to dependency array

  if (!metrics) return (
    <div style={styles.loadingContainer}>
      <div style={styles.loadingCard}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Loading dashboard...</p>
      </div>
    </div>
  );

  const createPieData = (labels, values, colors) => ({
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors,
        borderWidth: 0,
        hoverBorderWidth: 2,
        hoverBorderColor: '#fff',
      },
    ],
  });

  const pieOptions = {
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#2C3440',
          font: {
            size: 12,
            family: 'Inter, system-ui, sans-serif',
            weight: '500',
          },
          padding: 12,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#2C3440',
        bodyColor: '#2C3440',
        borderColor: 'rgba(255, 255, 255, 0.8)',
        borderWidth: 1,
        cornerRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      },
    },
    animation: {
      duration: 800,
      easing: 'easeOutQuart',
    },
    maintainAspectRatio: false,
    responsive: true,
  };

  return (
    <div style={styles.page}>
      <ProjectHeader />
      <div style={styles.grid}>
        {/* Scripts Summary */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>📄</div>
            <h2 style={styles.cardTitle}>Scripts</h2>
          </div>
          <div style={styles.cardContent}>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>Total Drafts</span>
              <span style={styles.statValue}>{metrics.scripts?.total || 0}</span>
            </div>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>Latest Draft</span>
              <span style={styles.statValue}>{metrics.scripts?.latest || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Cast Overview */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>🎭</div>
            <h2 style={styles.cardTitle}>Cast Overview</h2>
          </div>
          <div style={styles.chartContainer}>
            <Pie 
              data={createPieData(
                ['Locked', 'Unlocked'],
                [metrics.cast?.locked || 0, (metrics.cast?.total || 0) - (metrics.cast?.locked || 0)],
                ['#6c5ce7', '#a29bfe']
              )} 
              options={pieOptions} 
            />
          </div>
          <div style={styles.chartStats}>
            <span style={styles.totalCount}>Total: {metrics.cast?.total || 0}</span>
          </div>
        </div>

        {/* Locations Overview */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>📍</div>
            <h2 style={styles.cardTitle}>Locations</h2>
          </div>
          <div style={styles.chartContainer}>
            <Pie 
              data={createPieData(
                ['Locked', 'Under Review'],
                [metrics.locations?.locked || 0, metrics.locations?.under_review || 0],
                ['#00b894', '#55efc4']
              )} 
              options={pieOptions} 
            />
          </div>
          <div style={styles.chartStats}>
            <span style={styles.totalCount}>Total: {(metrics.locations?.locked || 0) + (metrics.locations?.under_review || 0)}</span>
          </div>
        </div>

        {/* Scheduling Overview */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>🗓️</div>
            <h2 style={styles.cardTitle}>Schedules</h2>
          </div>
          <div style={styles.chartContainer}>
            <Pie 
              data={createPieData(
                ['Locked', 'Unlocked'],
                [metrics.schedules?.locked || 0, (metrics.schedules?.total || 0) - (metrics.schedules?.locked || 0)],
                ['#fd79a8', '#fdcb6e']
              )} 
              options={pieOptions} 
            />
          </div>
          <div style={styles.chartStats}>
            <span style={styles.totalCount}>Total: {metrics.schedules?.total || 0}</span>
          </div>
        </div>

        {/* Shoot Days */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>🎬</div>
            <h2 style={styles.cardTitle}>Shoot Days</h2>
          </div>
          <div style={styles.cardContent}>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>Total Days</span>
              <span style={styles.statValue}>{metrics.schedules?.shoot_days || 'N/A'}</span>
            </div>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>Completed</span>
              <span style={styles.statValue}>{metrics.schedules?.completed || 0}</span>
            </div>
            <div style={styles.progressBar}>
              <div 
                style={{
                  ...styles.progressFill,
                  width: `${((metrics.schedules?.completed || 0) / (metrics.schedules?.shoot_days || 1)) * 100}%`
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Quick Stats Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardIcon}>⚡</div>
            <h2 style={styles.cardTitle}>Quick Stats</h2>
          </div>
          <div style={styles.cardContent}>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>Total Cast</span>
              <span style={styles.statValue}>{metrics.cast?.total || 0}</span>
            </div>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>Locked Items</span>
              <span style={styles.statValue}>
                {(metrics.cast?.locked || 0) + (metrics.locations?.locked || 0) + (metrics.schedules?.locked || 0)}
              </span>
            </div>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>Progress</span>
              <span style={styles.statValue}>
                {metrics.schedules?.shoot_days ? 
                  `${Math.round(((metrics.schedules?.completed || 0) / metrics.schedules.shoot_days) * 100)}%` : 
                  '0%'
                }
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    padding: '2rem',
    paddingTop: 'calc(2rem + 50px)', // Add navbar height (50px) + original padding
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    paddingTop: '50px', // Add navbar height
  },
  
  loadingCard: {
    padding: '2rem',
    background: 'rgba(255, 255, 255, 0.6)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  },
  
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(108, 92, 231, 0.2)',
    borderTop: '3px solid #6c5ce7',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem',
  },
  
  loadingText: {
    margin: 0,
    color: '#2C3440',
    fontSize: '1.1rem',
    fontWeight: '500',
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  
  heading: {
    margin: 0,
    fontSize: '2.5rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #6c5ce7, #00b894)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: 'rgba(0, 184, 148, 0.1)',
    border: '1px solid rgba(0, 184, 148, 0.3)',
    borderRadius: '20px',
    color: '#00b894',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#00b894',
    animation: 'pulse 2s infinite',
  },
  
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '1.5rem',
    maxWidth: '1400px',
  },
  
  card: {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
  },
  
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.5rem',
  },
  
  cardIcon: {
    fontSize: '1.5rem',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #6c5ce7, #00b894)',
    borderRadius: '12px',
    boxShadow: '0 4px 16px rgba(108, 92, 231, 0.3)',
  },
  
  cardTitle: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#2C3440',
  },
  
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
  },
  
  statLabel: {
    fontSize: '0.9rem',
    color: '#666',
    fontWeight: '500',
  },
  
  statValue: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#2C3440',
  },
  
  chartContainer: {
    height: '180px',
    position: 'relative',
    marginBottom: '1rem',
  },
  
  chartStats: {
    textAlign: 'center',
    paddingTop: '0.5rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.5)',
  },
  
  totalCount: {
    fontSize: '0.85rem',
    color: '#666',
    fontWeight: '500',
  },
  
  progressBar: {
    width: '100%',
    height: '8px',
    background: 'rgba(108, 92, 231, 0.2)',
    borderRadius: '4px',
    overflow: 'hidden',
    marginTop: '0.5rem',
  },
  
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #6c5ce7, #00b894)',
    borderRadius: '4px',
    transition: 'width 0.8s ease',
  },
};

// Add keyframes for animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  .card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15) !important;
  }
`;
document.head.appendChild(styleSheet);

export default ProjectDashboard;