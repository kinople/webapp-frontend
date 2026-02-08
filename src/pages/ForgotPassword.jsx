import React, { useState } from 'react';
import { getApiUrl } from '../utils/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(getApiUrl('/api/request-reset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessage('OTP sent to your email');
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(getApiUrl('/api/verify-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessage('OTP verified. You can now reset your password.');
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(getApiUrl('/api/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessage('Password has been reset successfully!');
      setStep(1);
      setEmail('');
      setOtp('');
      setNewPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Forgot Password</h2>
        {message && <p style={styles.success}>{message}</p>}
        {error && <p style={styles.error}>{error}</p>}

        {step === 1 && (
          <form style={styles.form} onSubmit={handleEmailSubmit}>
            <label style={styles.label}>Enter your registered email</label>
            <input
              style={styles.input}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form style={styles.form} onSubmit={handleOtpSubmit}>
            <label style={styles.label}>Enter the OTP sent to your email</label>
            <input
              style={styles.input}
              type="text"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              disabled={loading}
            />
            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        )}

        {step === 3 && (
          <form style={styles.form} onSubmit={handleResetSubmit}>
            <label style={styles.label}>Enter your new password</label>
            <input
              style={styles.input}
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
            />
            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
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
    marginBottom: '1.5rem',
    fontSize: '1.75rem',
    color: '#2C3440',
    textAlign: 'center',
  },
  form: {
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
    marginBottom: '1rem',
  },
  button: {
    padding: '0.75rem',
    fontSize: '1rem',
    fontWeight: '500',
    color: '#fff',
    background: 'linear-gradient(135deg, #6c5ce7, #00b894)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  error: {
    color: '#e74c3c',
    fontSize: '0.9rem',
    marginBottom: '1rem',
    textAlign: 'center',
  },
  success: {
    color: '#2ecc71',
    fontSize: '0.9rem',
    marginBottom: '1rem',
    textAlign: 'center',
  },
};

export default ForgotPassword;
