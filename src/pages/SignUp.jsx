import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getApiUrl } from '../utils/api';

function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(getApiUrl('/api/signup'), {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Signup successful
        console.log('Signup successful:', data);
        // Redirect to login page
        navigate('/');
      } else {
        // Handle error response
        setError(data.message || 'Signup failed. Please try again.');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <form style={styles.form} onSubmit={handleSubmit}>
        {error && <div style={styles.error}>{error}</div>}
        <input
          style={styles.input}
          type="email"
          name="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />
        <input
          style={styles.input}
          type="password"
          name="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
        />
        <button 
          type="submit" 
          style={loading ? styles.buttonDisabled : styles.button}
          disabled={loading}
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>
      <div style={styles.loginContainer}>
        Already have an account?{' '}
        <Link to="/" style={styles.login}>
          <b>Sign In</b>
        </Link>
      </div>
    </div>
  );
}

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
  buttonDisabled: {
    width: '180px',
    padding: '12px 0',
    fontSize: '1.4rem',
    fontWeight: 'bold',
    background: '#f5f5f5',
    color: '#aaa',
    border: 'none',
    borderRadius: '2px',
    cursor: 'not-allowed',
    marginTop: '8px',
    marginBottom: '0',
  },
  loginContainer: {
    marginTop: '80px',
    fontSize: '1.4rem',
    color: '#111',
    textAlign: 'center',
  },
  login: {
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

export default SignUp;
