import React, { useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';

const ProjectHeader = () => {
    const { user, id } = useParams();

    return (
        <div style={styles.subHeader}>
            <h1 style={styles.projectTitle}><Link to={`/${user}/${id}`} style={styles.projectTitleLink}>Project - {id}</Link></h1>
            <div style={styles.teamIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#2C3440">
                <path d="M12 12.75c1.63 0 3.07.39 4.24.9 1.08.48 1.76 1.56 1.76 2.73V18H6v-1.62c0-1.17.68-2.25 1.76-2.73 1.17-.51 2.61-.9 4.24-.9zM4 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm18 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-8-6c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z"/>
            </svg>
            </div>
      </div>
    )
}

const styles = {
    container: {
      backgroundColor: '#2C3440',
      color: 'white',
    },
    navbar: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.5rem 2rem',
      height: '50px',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
    },
    logo: {
      fontSize: '1.2rem',
      fontWeight: 'bold',
      color: 'white',
      textDecoration: 'none',
    },
    userIcons: {
      display: 'flex',
      gap: '0.5rem',
    },
    iconButton: {
      backgroundColor: '#4B9CD3',
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
    },
    subHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem 2rem',
      backgroundColor: 'white',
      color: '#2C3440',
    },
    projectTitle: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      margin: 0,
    },
    projectTitleLink: {
      color: '#2C3440',
      textDecoration: 'none',
      '&:hover': {
        textDecoration: 'underline',
      },
    },
    teamIcon: {
      cursor: 'pointer',
    },
  };  

export default ProjectHeader;