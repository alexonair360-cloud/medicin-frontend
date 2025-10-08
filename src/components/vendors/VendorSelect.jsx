import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { getVendors } from '../../api/vendorService';
import styles from './VendorSelect.module.css';

// Reusable searchable vendor selector
// Shows options as: Name (Phone)
// Props:
// - value: selected vendor id (string)
// - onChange: (vendor) => void
// - placeholder: string
// - disabled: boolean
const VendorSelect = ({ value, onChange, placeholder = 'Search vendor...', disabled = false }) => {
  const [vendors, setVendors] = useState([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const list = await getVendors();
        setVendors(list || []);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const selected = useMemo(() => vendors.find(v => (v.id ?? v._id) === value), [vendors, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter(v => {
      const name = (v.name || '').toLowerCase();
      const phone = (v.phone || '').toLowerCase();
      const email = (v.email || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [vendors, query]);

  const labelFor = (v) => `${v.name || 'Unknown'}${v.phone ? ` (${v.phone})` : ''}`;

  const handlePick = (v) => {
    onChange?.(v);
    setOpen(false);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.control} onClick={() => !disabled && setOpen(o => !o)} aria-expanded={open}>
        <span className={styles.valueText}>
          {selected ? labelFor(selected) : <span className={styles.placeholder}>{placeholder}</span>}
        </span>
        <span className={styles.caret} aria-hidden>▾</span>
      </div>
      {open && (
        <div className={styles.popover} role="listbox">
          <div className={styles.searchRow}>
            <input
              className={styles.searchInput}
              type="text"
              autoFocus
              placeholder="Type to search vendors..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className={styles.options}>
            {loading && <div className={styles.optionDisabled}>Loading...</div>}
            {!loading && filtered.length === 0 && (
              <div className={styles.optionDisabled}>No vendors found</div>
            )}
            {!loading && filtered.map(v => (
              <button
                key={v.id ?? v._id}
                type="button"
                className={styles.option}
                onClick={() => handlePick(v)}
              >
                <span>{labelFor(v)}</span>
                {selected && (selected.id ?? selected._id) === (v.id ?? v._id) && (
                  <span className={styles.check} aria-hidden>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

VendorSelect.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
};

export default VendorSelect;
