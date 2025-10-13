import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Style from './Navbar.module.css';
// Modal and logout handling moved to App.jsx
import ThangamLogo from '../assets/thangam_medicals.PNG';

const SearchIcon = () => (
  <svg className={Style.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2Zm6-6V11c0-3.07-1.63-5.64-4.5-6.32V4a1.5 1.5 0 1 0-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2Z"/>
  </svg>
);

const Navbar = ({ onRequestLogout }) => {
  const navigate = useNavigate();
  return (
    <header className={Style.navbar}>
      <div className={Style.inner}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div className={Style.brand} onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
            {/* Brand Logo */}
            <span className={Style.brandLogo} aria-hidden>
              <img src={ThangamLogo} alt="Thangam Medicals" />
            </span>
            <span>Thangam Medicals</span>
          </div>
          <nav className={Style.nav}>
            <NavLink to="/dashboard" className={({isActive}) => isActive ? Style.active : undefined}>Dashboard</NavLink>
            <NavLink to="/medicines" className={({isActive}) => isActive ? Style.active : undefined}>Medicines</NavLink>
            <NavLink to="/customers" className={({isActive}) => isActive ? Style.active : undefined}>Customers</NavLink>
            <NavLink to="/reports" className={({isActive}) => isActive ? Style.active : undefined}>Reports</NavLink>
            <NavLink to="/vendors" className={({isActive}) => isActive ? Style.active : undefined}>Vendors</NavLink>
          </nav>
        </div>
        <div className={Style.controls}>
          <button className={Style.logoutBtn} onClick={() => onRequestLogout && onRequestLogout()}>Logout</button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
