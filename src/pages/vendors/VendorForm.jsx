import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import styles from './VendorsPage.module.css';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import TextArea from '../../components/ui/TextArea';

const VendorForm = ({ initialData, onSubmit, onCancel, isSubmitting = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });
  
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        contactPerson: initialData.contactPerson || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        address: initialData.address || '',
        notes: initialData.notes || '',
      });
    }
  }, [initialData]);

  const validateField = (name, value) => {
    const newErrors = { ...errors };
    
    switch (name) {
      case 'name':
        if (!value.trim()) {
          newErrors.name = 'Vendor name is required';
        } else {
          delete newErrors.name;
        }
        break;
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = 'Please enter a valid email address';
        } else {
          delete newErrors.email;
        }
        break;
      case 'phone':
        if (value && !/^[0-9+\-\s()]*$/.test(value)) {
          newErrors.phone = 'Please enter a valid phone number';
        } else {
          delete newErrors.phone;
        }
        break;
      default:
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (isDirty) {
      validateField(name, value);
    }
  };
  
  const handleBlur = (e) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsDirty(true);
    
    // Validate all fields
    const isValid = Object.entries(formData).every(([key, value]) => {
      if (key === 'email' || key === 'phone' || key === 'name') {
        return validateField(key, value);
      }
      return true;
    });
    
    if (isValid) {
      onSubmit(formData);
    } else {
      // Scroll to the first error
      const firstError = Object.keys(errors)[0];
      if (firstError) {
        document.querySelector(`[name="${firstError}"]`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formRow}>
          <Input
            label="Vendor Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.name}
            required
            helperText={errors.name ? errors.name : null}
          />
          <Input
            label="Contact Person"
            name="contactPerson"
            value={formData.contactPerson}
            onChange={handleChange}
            onBlur={handleBlur}
            required
            helperText={errors.contactPerson ? errors.contactPerson : null}
          />
      </div>

      <div className={styles.formRow}>
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.email}
            helperText={errors.email ? errors.email : null}
          />
          <Input
            label="Phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.phone}
            required
            helperText={errors.phone ? errors.phone : null}
          />
      </div>

      <div className={styles.formRow}>
          <TextArea
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            onBlur={handleBlur}
            rows={3}
            required
            helperText={errors.address ? errors.address : null}
          />
      </div>

      <div className={styles.formRow}>
        <TextArea
          label="Notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={2}
        />
      </div>

      <div className={styles.formActions}>
        <Button 
          type="button" 
          onClick={onCancel} 
          variant="outline"
          style={{ marginRight: '8px' }}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          variant="primary"
          disabled={isSubmitting || Object.keys(errors).length > 0}
        >
          {isSubmitting ? (
            <span>Saving...</span>
          ) : (
            <span>{initialData ? 'Update Vendor' : 'Add Vendor'}</span>
          )}
        </Button>
      </div>
    </form>
  );
};

VendorForm.propTypes = {
  initialData: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    contactPerson: PropTypes.string,
    email: PropTypes.string,
    phone: PropTypes.string,
    address: PropTypes.string,
    notes: PropTypes.string,
  }),
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
};

export default VendorForm;
