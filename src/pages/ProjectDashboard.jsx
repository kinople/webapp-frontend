import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import ProjectHeader from '../components/ProjectHeader';
const ProjectDashboard = () => {
  const [hoveredCard, setHoveredCard] = useState(null);

  const handleMouseEnter = (cardTo) => {
    setHoveredCard(cardTo);
  };

  const handleMouseLeave = () => {
    setHoveredCard(null);
  };

  const { id } = useParams();

  const cardData = [
    { to: `/${id}/script`, label: 'Script' },
    { to: `/${id}/script-breakdown`, label: 'Script Breakdown' },
    { to: `/${id}/cast-list`, label: 'Cast List' },
    { to: `/${id}/locations`, label: 'Locations' },
    { to: `/${id}/scheduling`, label: 'Scheduling' },
    { to: `/${id}/call-sheets`, label: 'Call Sheets' },
    { to: `/${id}/dpr`, label: 'DPR' },
  ];
  

  return (
    <div>
      <ProjectHeader />
      <div style={{ padding: '2rem' }}>
        <div style={styles.grid}>
          {cardData.map((card) => (
            <Link
              key={card.to}
              to={card.to}
              style={{
                ...styles.cardLink,
                ...(hoveredCard === card.to ? styles.cardLinkHover : {}),
              }}
              onMouseEnter={() => handleMouseEnter(card.to)}
              onMouseLeave={handleMouseLeave}
            >
              <div style={styles.cardContent}>{card.label}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    padding: '1rem',
  },
  cardLink: {
    textDecoration: 'none',
    color: 'inherit',
    display: 'block',
    backgroundColor: '#f0f0f0',
    borderRadius: '4px',
    transition: 'background-color 0.2s ease',
  },
  cardLinkHover: {
    backgroundColor: '#e0e0e0',
  },
  cardContent: {
    padding: '2rem',
    textAlign: 'center',
    cursor: 'pointer',
  },
};

export default ProjectDashboard; 