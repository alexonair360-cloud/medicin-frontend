import React from 'react';
import styles from './Loader.module.css';

const Loader = ({ fullscreen = false, minHeight = true }) => {
  if (fullscreen) {
    return (
      <div className={styles.centerFull}>
        <div className={styles.spinner} />
      </div>
    );
  }
  return (
    <div className={minHeight ? styles.wrap : undefined}>
      <div className={styles.spinner} />
    </div>
  );
};

export default Loader;
