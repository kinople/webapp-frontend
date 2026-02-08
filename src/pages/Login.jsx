import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getApiUrl } from '../utils/api';
import { setToken } from '../utils/auth'; // Add this import


const Login = () => {
  const [isLogin, setIsLogin] = useState(true); // toggle
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleToggle = () => {
    setIsLogin(!isLogin);
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isLogin ? '/api/login' : '/api/signup';

    try {
      const response = await fetch(getApiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong.');
      }

      if (isLogin) {
        // Add token storage logic like in Login.jsx
        if (data.token) {
          setToken(data.token);
          navigate(`/${data.user.id}`);
        } else {
          throw new Error('No token received from server');
        }
      } else {
        navigate('/login');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>{isLogin ? 'Sign In' : 'Create Account'}</h2>
        <form style={styles.form} onSubmit={handleSubmit}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.field}>
            <label style={styles.label}>Email or Mobile</label>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? (isLogin ? 'Signing in...' : 'Signing up...') : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>

          {isLogin && (
            <Link to="/signup" style={styles.forgot}>Forgot Password?</Link>
          )}
        </form>

        <div style={styles.signupContainer}>
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button onClick={handleToggle} style={styles.signupLink}>
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #f5f7fa, #c3cfe2)',
    padding: '1rem',
  },
  card: {
    background: '#fff',
    borderRadius: '8px',
    boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
    padding: '2rem',
    maxWidth: '400px',
    width: '100%',
  },
  title: {
    margin: 0,
    marginBottom: '1.5rem',
    fontSize: '1.75rem',
    color: '#2C3440',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    marginBottom: '0.5rem',
    color: '#555',
    fontSize: '0.9rem',
  },
  input: {
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid #ccd0d5',
    borderRadius: '4px',
    outline: 'none',
  },
  button: {
    marginTop: '1rem',
    padding: '0.75rem',
    fontSize: '1rem',
    fontWeight: '500',
    color: '#fff',
    background: 'linear-gradient(135deg, #6c5ce7, #00b894)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  forgot: {
    marginTop: '0.5rem',
    fontSize: '0.9rem',
    color: '#6c5ce7',
    textAlign: 'center',
    textDecoration: 'none',
  },
  signupContainer: {
    marginTop: '1.5rem',
    textAlign: 'center',
    fontSize: '0.9rem',
    color: '#555',
  },
  signupLink: {
    marginLeft: '0.25rem',
    background: 'none',
    border: 'none',
    color: '#6c5ce7',
    textDecoration: 'underline',
    fontWeight: '500',
    cursor: 'pointer',
  },
  error: {
    color: '#e74c3c',
    fontSize: '0.9rem',
    textAlign: 'center',
  },
};

export default Login;
