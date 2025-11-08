import React, { useState, useEffect } from 'react';
import Style from './Signin.module.css';
import api, { setAuthToken } from '../api/ApiClient';
import { useNavigate, useLocation } from 'react-router-dom';
import ThangamLogo from '../assets/thangam_medicals.PNG';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const resetToken = location.state?.resetToken;

  useEffect(() => {
    if (!resetToken) {
      navigate('/forgot-password');
    }
  }, [resetToken, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post('/password-reset/reset', {
        resetToken,
        newPassword
      });

      // Auto-login with the returned token
      if (data?.token) {
        setAuthToken(data.token);
        navigate('/dashboard');
      } else {
        setError('Password reset successful. Please login.');
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to reset password. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={Style.container}>
      <div className={Style.card}>
        <div className={Style.brandWrap}>
          <div className={Style.brandLogo} aria-hidden="true">
            <img src={ThangamLogo} alt="Thangam Medicals" />
          </div>
        </div>
        <div>
          <h1 className={Style.title}>Reset Password</h1>
          <p className={Style.subtitle}>Enter your new password</p>
        </div>

        <form className={Style.form} onSubmit={handleSubmit}>
          {error && (
            <div role="alert" style={{ color: '#b91c1c', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}
          
          <div className={Style.field}>
            <label htmlFor="newPassword" className={Style.label}>New Password</label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              placeholder="Enter new password"
              className={Style.input}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength="6"
            />
          </div>

          <div className={Style.gap} />

          <div className={Style.field}>
            <label htmlFor="confirmPassword" className={Style.label}>Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              placeholder="Confirm new password"
              className={Style.input}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength="6"
            />
          </div>

          <button type="submit" className={Style.submit} disabled={loading} style={{ marginTop: '1.5rem' }}>
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
