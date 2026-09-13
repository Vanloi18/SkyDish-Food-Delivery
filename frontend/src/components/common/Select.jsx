import React from 'react';
import { FaChevronDown } from 'react-icons/fa';

export default function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Chọn một mục...',
  error = '',
  helperText = '',
  disabled = false,
  required = false,
  id,
  name,
  className = '',
  style = {},
  size = 'md',
  ...props
}) {
  const selectId = id || name || `select-${Math.random().toString(36).substr(2, 9)}`;

  const sizeStyles = {
    sm: { padding: '0.4rem 2rem 0.4rem 0.75rem', fontSize: 'var(--sd-font-size-xs)' },
    md: { padding: '0.625rem 2.25rem 0.625rem 1rem', fontSize: 'var(--sd-font-size-sm)' },
    lg: { padding: '0.75rem 2.5rem 0.75rem 1.125rem', fontSize: 'var(--sd-font-size-base)' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', width: '100%', ...style }} className={className}>
      {label && (
        <label
          htmlFor={selectId}
          style={{
            fontSize: 'var(--sd-font-size-sm)',
            fontWeight: 'var(--sd-weight-metadata)',
            color: error ? 'var(--sd-error)' : 'var(--sd-text-primary)',
          }}
        >
          {label}
          {required && <span style={{ color: 'var(--sd-error)', marginLeft: '4px' }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative', width: '100%' }}>
        <select
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          style={{
            width: '100%',
            appearance: 'none',
            backgroundColor: disabled ? 'var(--sd-bg-muted)' : 'var(--sd-bg-surface)',
            color: value ? 'var(--sd-text-primary)' : 'var(--sd-text-placeholder)',
            border: `1px solid ${error ? 'var(--sd-error)' : 'var(--sd-border)'}`,
            borderRadius: 'var(--sd-radius-md)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'border-color var(--sd-transition-fast), box-shadow var(--sd-transition-fast)',
            outline: 'none',
            ...(sizeStyles[size] || sizeStyles.md),
          }}
          onFocus={(e) => {
            if (!disabled && !error) {
              e.target.style.borderColor = 'var(--sd-border-focus)';
              e.target.style.boxShadow = '0 0 0 3px var(--sd-primary-glow)';
            }
          }}
          onBlur={(e) => {
            if (!disabled && !error) {
              e.target.style.borderColor = 'var(--sd-border)';
              e.target.style.boxShadow = 'none';
            }
          }}
          {...props}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((opt) => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const text = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={String(val)} value={val}>
                {text}
              </option>
            );
          })}
        </select>

        <span
          style={{
            position: 'absolute',
            right: '0.85rem',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: 'var(--sd-text-muted)',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <FaChevronDown />
        </span>
      </div>

      {error && (
        <span style={{ fontSize: 'var(--sd-font-size-xs)', color: 'var(--sd-error)', fontWeight: 'var(--sd-weight-metadata)' }}>
          {error}
        </span>
      )}
      {!error && helperText && (
        <span style={{ fontSize: 'var(--sd-font-size-xs)', color: 'var(--sd-text-muted)' }}>
          {helperText}
        </span>
      )}
    </div>
  );
}
