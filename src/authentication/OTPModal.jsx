import React, { useState, useEffect } from 'react';
import api from '../api/ApiClient';
import './OTPModal.css';

const OTPModal = ({ show, onClose, phone, onVerified, developmentOTP }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (show) {
      setOtp(['', '', '', '', '', '']);
      setError('');
    }
  }, [show]);

  const handleChange = (index, value) => {
    if (value.length > 1) return;
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length && i < 6; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    
    if (otpString.length !== 6) {
      setError('Please enter complete OTP');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/password-reset/verify-otp', {
        phone,
        otp: otpString
      });

      onVerified(data.resetToken);
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Invalid OTP. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="otp-modal-overlay" onClick={onClose}>
      <div className="otp-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="otp-modal-header">
          <h2>Enter OTP</h2>
          <button className="otp-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="otp-modal-body">
          <p className="otp-modal-description">
            We've sent a 6-digit OTP to <strong>{phone}</strong>
          </p>

          {developmentOTP && (
            <div className="otp-dev-info">
              <strong>Development Mode:</strong> OTP is {developmentOTP}
            </div>
          )}

          {error && (
            <div className="otp-modal-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="otp-input-container" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="otp-input"
                  autoFocus={index === 0}
                />
              ))}
            </div>

            <button 
              type="submit" 
              className="otp-submit-btn"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OTPModal;
