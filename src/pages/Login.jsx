import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getApiUrl } from '../utils/api';
const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await fetch(getApiUrl('/api/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Login failed');
      }

      const data = await response.json();
      console.log('Login response data:', data); // Debug log
      const user_id = data.user.id;
      console.log('Navigating to:', `/${user_id}`); // Debug log
      
      if (user_id) {
        navigate(`/${user_id}`);
      } else {
        throw new Error('User ID not received from server');
      }
      
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div style={styles.container}>
      <form style={styles.form} onSubmit={handleSubmit}>
        {error && <div style={styles.error}>{error}</div>}
        <input
          style={styles.input}
          type="text"
          name="email"
          placeholder="Email/Mobile Number"
          value={form.email}
          onChange={handleChange}
        />
        <input
          style={styles.input}
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
        />
        <button type="submit" style={styles.button}>
          Sign In
        </button>
        <a href="#" style={styles.forgot}>
          Forgot Password
        </a>
      </form>
      <div style={styles.signupContainer}>
        Don't have an existing account?{' '}
        <Link to="/signup" style={styles.signup}>
          <b>Sign Up</b>
        </Link>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#fff',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: '350px',
    gap: '24px',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    fontSize: '1.3rem',
    border: 'none',
    borderBottom: '2px solid #222',
    padding: '8px 0',
    outline: 'none',
    background: 'transparent',
    marginBottom: '8px',
  },
  button: {
    width: '180px',
    padding: '12px 0',
    fontSize: '1.4rem',
    fontWeight: 'bold',
    background: '#ddd',
    border: 'none',
    borderRadius: '2px',
    cursor: 'pointer',
    marginTop: '8px',
    marginBottom: '0',
  },
  forgot: {
    marginTop: '4px',
    fontSize: '1rem',
    color: '#000',
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  signupContainer: {
    marginTop: '80px',
    fontSize: '1.4rem',
    color: '#111',
    textAlign: 'center',
  },
  signup: {
    color: '#000',
    textDecoration: 'underline',
    marginLeft: '4px',
    cursor: 'pointer',
  },
  error: {
    color: '#dc3545',
    marginBottom: '16px',
    textAlign: 'center',
    width: '100%',
  },
};

export default Login;
