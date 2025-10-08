import React from 'react';
import styles from './Input.module.css';

const TextArea = ({
  label,
  name,
  value,
  onChange,
  placeholder = '',
  required = false,
  error = '',
  rows = 3,
  className = '',
  ...props
}) => {
  const textareaId = `textarea-${name}`;
  const textareaClass = `${styles.textarea} ${error ? styles.error : ''} ${className}`.trim();

  return (
    <div className={styles.inputGroup}>
      {label && (
        <label htmlFor={textareaId} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        rows={rows}
        className={textareaClass}
        {...props}
      />
      {error && <p className={styles.errorMessage}>{error}</p>}
    </div>
  );
};

export default TextArea;
