import React from 'react';
import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';

const Navbar = () => {
  const { user, id } = useParams();
  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <Link to={`/${user}`} style={styles.logo}>Kinople</Link>
        <div style={styles.iconButton}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
        </div>
      </nav>
    </div>
  );
};

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
  teamIcon: {
    cursor: 'pointer',
  },
};

export default Navbar;