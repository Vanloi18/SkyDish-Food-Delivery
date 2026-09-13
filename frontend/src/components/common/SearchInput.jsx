import React from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';

export default function SearchInput({
  value = '',
  onChange,
  onClear,
  placeholder = 'Tìm kiếm nhà hàng, món ăn...',
  ariaLabel = 'Tìm kiếm',
  autoFocus = false,
  disabled = false,
  size = 'md',
  className = '',
  style = {},
  onKeyDown,
  ...props
}) {
  const sizeStyles = {
    sm: { padding: '0.45rem 2.25rem 0.45rem 2.25rem', fontSize: 'var(--sd-font-size-xs)' },
    md: { padding: '0.65rem 2.5rem 0.65rem 2.5rem', fontSize: 'var(--sd-font-size-sm)' },
    lg: { padding: '0.85rem 2.75rem 0.85rem 2.75rem', fontSize: 'var(--sd-font-size-base)' },
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ target: { value: '' } });
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', ...style }} className={className}>
      <span
        style={{
          position: 'absolute',
          left: '0.9rem',
          color: 'var(--sd-text-muted)',
          fontSize: size === 'sm' ? '0.8rem' : '0.95rem',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <FaSearch />
      </span>

      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoFocus={autoFocus}
        disabled={disabled}
        onKeyDown={onKeyDown}
        style={{
          width: '100%',
          backgroundColor: disabled ? 'var(--sd-bg-muted)' : 'var(--sd-bg-surface)',
          color: 'var(--sd-text-primary)',
          border: '1px solid var(--sd-border)',
          borderRadius: 'var(--sd-radius-md)',
          outline: 'none',
          fontFamily: 'inherit',
          transition: 'border-color var(--sd-transition-fast), box-shadow var(--sd-transition-fast)',
          ...(sizeStyles[size] || sizeStyles.md),
        }}
        onFocus={(e) => {
          if (!disabled) {
            e.target.style.borderColor = 'var(--sd-border-focus)';
            e.target.style.boxShadow = '0 0 0 3px var(--sd-primary-glow)';
          }
        }}
        onBlur={(e) => {
          if (!disabled) {
            e.target.style.borderColor = 'var(--sd-border)';
            e.target.style.boxShadow = 'none';
          }
        }}
        {...props}
      />

      {value && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Xóa nội dung tìm kiếm"
          style={{
            position: 'absolute',
            right: '0.75rem',
            background: 'none',
            border: 'none',
            color: 'var(--sd-text-muted)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: 'var(--sd-radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color var(--sd-transition-fast)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--sd-text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--sd-text-muted)')}
        >
          <FaTimes style={{ fontSize: '0.8rem' }} />
        </button>
      )}
    </div>
  );
}
