import React, { useState, useEffect } from 'react';
import Style from './Signin.module.css';
import api, { setAuthToken, getAuthToken } from '../api/ApiClient';
import { useNavigate, Link } from 'react-router-dom';
import ThangamLogo from '../assets/thangam_medicals.PNG';

const Signin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if user is already logged in
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      // Token exists, redirect to dashboard
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const payload = Object.fromEntries(formData.entries());
      const { data } = await api.post('/auth/login', payload);
      if (data?.token) {
        setAuthToken(data.token);
        navigate('/dashboard');
      } else {
        setError('Unexpected response from server.');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Login failed. Please check your credentials.';
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
          <h1 className={Style.title}>Welcome Back</h1>
          <p className={Style.subtitle}>Log in to manage your medical shop</p>
        </div>

        <form className={Style.form} onSubmit={handleSubmit}>
          {error && (
            <div role="alert" style={{ color: '#b91c1c', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}
          <div className={Style.field}>
            <label htmlFor="username" className={Style.label}>Username</label>
            <input
              id="username"
              name="username"
              type="text"
              required
              placeholder="Username"
              className={Style.input}
              autoComplete="username"
            />
          </div>

          <div className={Style.gap} />

          <div className={Style.field}>
            <label htmlFor="password" className={Style.label}>Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Password"
              className={Style.input}
              autoComplete="current-password"
            />
          </div>

          <div className={Style.actions}>
            <Link to="/forgot-password" className={Style.link}>Forgot your password?</Link>
          </div>

          <button type="submit" className={Style.submit} disabled={loading}>
            {loading ? 'Logging in...' : 'Log in'}
          </button>

          {/* <p className={Style.footer}>
            Don't have an account?{' '}
            <a href="#">Sign up</a>
          </p> */}
        </form>
      </div>
    </div>
  )
}

export default Signin