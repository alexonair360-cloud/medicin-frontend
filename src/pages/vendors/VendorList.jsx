import React from 'react';
import PropTypes from 'prop-types';
import styles from './VendorsPage.module.css';
import { useNavigate } from 'react-router-dom';

const VendorList = ({ vendors = [], onEditVendor, onDeleteVendor }) => {
  // Coerce vendors into an array defensively
  const rows = Array.isArray(vendors) ? vendors : (vendors?.vendors || vendors?.data || []);
  const navigate = useNavigate();
  const handleEdit = (vendor) => {
    onEditVendor(vendor);
  };

  const handleDelete = (vendor) => {
    if (onDeleteVendor && typeof onDeleteVendor === 'function') {
      onDeleteVendor(vendor.id);
    }
  };

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th className={styles.th}>Vendor Name</th>
            <th className={styles.th}>Contact Person</th>
            <th className={styles.th}>Email</th>
            <th className={styles.th}>Phone</th>
            <th className={styles.th}>Address</th>
            <th className={`${styles.th} ${styles.center}`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((vendor) => (
            <tr key={vendor.id}>
              <td className={styles.td}>{vendor.name}</td>
              <td className={styles.td}>{vendor.contactPerson || '-'}</td>
              <td className={styles.td}>{vendor.email || '-'}</td>
              <td className={styles.td}>{vendor.phone || '-'}</td>
              <td className={styles.td}>{vendor.address || '-'}</td>
              <td className={`${styles.td} ${styles.center}`}>
                <button className={styles.actionLink} onClick={() => handleEdit(vendor)}>Edit</button>
                <button className={styles.dangerLink} onClick={() => handleDelete(vendor)}>Delete</button>
                <button className={styles.actionLink} onClick={() => navigate(`/vendors/${vendor.id}/orders`)}>Orders</button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className={styles.td} colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                No vendors found. Click 'Add New Vendor' to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

VendorList.propTypes = {
  vendors: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
      contactPerson: PropTypes.string,
      email: PropTypes.string,
      phone: PropTypes.string,
      address: PropTypes.string,
      notes: PropTypes.string,
      createdAt: PropTypes.string,
      updatedAt: PropTypes.string,
    })
  ),
  onEditVendor: PropTypes.func,
  onDeleteVendor: PropTypes.func,
};

VendorList.defaultProps = {
  vendors: [],
  onEditVendor: null,
  onDeleteVendor: null,
};

export default VendorList;
