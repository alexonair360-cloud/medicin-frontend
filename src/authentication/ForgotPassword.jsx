import React, { useState, useEffect } from 'react';
import Style from './Signin.module.css';
import api, { getAuthToken } from '../api/ApiClient';
import { useNavigate } from 'react-router-dom';
import ThangamLogo from '../assets/thangam_medicals.PNG';
import OTPModal from './OTPModal';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [developmentOTP, setDevelopmentOTP] = useState('');

  // Check if user is already logged in
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const { data } = await api.post('/password-reset/request-otp', { phone });
      
      // Store OTP for development mode
      if (data.otp) {
        setDevelopmentOTP(data.otp);
      }
      
      // Show OTP modal
      setShowOTPModal(true);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to send OTP. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerified = (resetToken) => {
    // Navigate to reset password page with token
    navigate('/reset-password', { state: { resetToken } });
  };

  return (
    <>
      <div className={Style.container}>
        <div className={Style.card}>
          <div className={Style.brandWrap}>
            <div className={Style.brandLogo} aria-hidden="true">
              <img src={ThangamLogo} alt="Thangam Medicals" />
            </div>
          </div>
          <div>
            <h1 className={Style.title}>Forgot Password</h1>
            <p className={Style.subtitle}>Enter your phone number to reset your password</p>
          </div>

          <form className={Style.form} onSubmit={handleSubmit}>
            {error && (
              <div role="alert" style={{ color: '#b91c1c', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                {error}
              </div>
            )}
            
            <div className={Style.field}>
              <label htmlFor="phone" className={Style.label}>Phone Number</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                placeholder="Enter your phone number"
                className={Style.input}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>

            <div className={Style.actions} style={{ marginTop: '1.5rem', justifyContent: 'space-between' }}>
              <button 
                type="button" 
                onClick={() => navigate('/')}
                className={Style.link}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                ← Back to Login
              </button>
            </div>

            <button type="submit" className={Style.submit} disabled={loading}>
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        </div>
      </div>

      <OTPModal
        show={showOTPModal}
        onClose={() => setShowOTPModal(false)}
        phone={phone}
        onVerified={handleOTPVerified}
        developmentOTP={developmentOTP}
      />
    </>
  );
};

export default ForgotPassword;
