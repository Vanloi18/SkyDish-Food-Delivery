import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

export default function Input({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  error,
  helperText,
  icon: Icon = null,
  required = false,
  disabled = false,
  className = '',
  style = {},
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div style={{ marginBottom: '1.25rem', width: '100%', ...style }} className={`sd-input-group ${className}`}>
      {label && (
        <label
          htmlFor={name}
          style={{
            display: 'block',
            marginBottom: '0.4rem',
            fontSize: 'var(--sd-font-size-sm)',
            fontWeight: '600',
            color: 'var(--sd-text-primary)',
          }}
        >
          {label} {required && <span style={{ color: 'var(--sd-danger)' }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {Icon && (
          <span
            style={{
              position: 'absolute',
              left: '0.85rem',
              color: 'var(--sd-text-muted)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <Icon size={16} />
          </span>
        )}

        <input
          id={name}
          name={name}
          type={effectiveType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          style={{
            width: '100%',
            padding: '0.65rem 1rem',
            paddingLeft: Icon ? '2.5rem' : '1rem',
            paddingRight: isPassword ? '2.5rem' : '1rem',
            fontSize: 'var(--sd-font-size-sm)',
            color: 'var(--sd-text-primary)',
            backgroundColor: disabled ? '#f8fafc' : '#ffffff',
            border: `1px solid ${error ? 'var(--sd-danger)' : 'var(--sd-border)'}`,
            borderRadius: 'var(--sd-radius-md)',
            outline: 'none',
            transition: 'border-color var(--sd-transition-fast), box-shadow var(--sd-transition-fast)',
            boxShadow: 'var(--sd-shadow-xs)',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = error ? 'var(--sd-danger)' : 'var(--sd-primary)';
            e.target.style.boxShadow = error
              ? '0 0 0 3px rgba(239, 68, 68, 0.15)'
              : '0 0 0 3px rgba(255, 87, 34, 0.15)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? 'var(--sd-danger)' : 'var(--sd-border)';
            e.target.style.boxShadow = 'var(--sd-shadow-xs)';
          }}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '0.85rem',
              background: 'none',
              border: 'none',
              color: 'var(--sd-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '0.2rem',
            }}
          >
            {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
          </button>
        )}
      </div>

      {error && (
        <p
          style={{
            margin: '0.35rem 0 0',
            fontSize: 'var(--sd-font-size-xs)',
            color: 'var(--sd-danger)',
            fontWeight: '500',
          }}
        >
          {error}
        </p>
      )}

      {helperText && !error && (
        <p
          style={{
            margin: '0.35rem 0 0',
            fontSize: 'var(--sd-font-size-xs)',
            color: 'var(--sd-text-muted)',
          }}
        >
          {helperText}
        </p>
      )}
    </div>
  );
}
