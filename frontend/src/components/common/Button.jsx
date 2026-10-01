import React from 'react';
import { motion } from 'framer-motion';

export default function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'cart'
  size = 'md',        // 'sm' | 'md' | 'lg'
  icon: Icon = null,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
  style = {},
  ...props
}) {
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontWeight: '600',
    fontFamily: 'inherit',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.65 : 1,
    border: '1px solid transparent',
    borderRadius: 'var(--sd-radius-md)',
    transition: 'all var(--sd-transition-fast)',
    width: fullWidth ? '100%' : 'auto',
    textDecoration: 'none',
    boxSizing: 'border-box',
    ...style,
  };

  const sizeStyles = {
    sm: { padding: '0.4rem 0.85rem', fontSize: 'var(--sd-font-size-xs)' },
    md: { padding: '0.625rem 1.25rem', fontSize: 'var(--sd-font-size-sm)' },
    lg: { padding: '0.85rem 1.75rem', fontSize: 'var(--sd-font-size-base)' },
  };

  const variantStyles = {
    primary: {
      backgroundColor: 'var(--sd-primary)',
      color: '#ffffff',
      boxShadow: '0 2px 4px rgba(255, 87, 34, 0.25)',
    },
    cart: {
      backgroundColor: '#b93800',
      color: '#ffffff',
      boxShadow: '0 3px 8px rgba(185, 56, 0, 0.28)',
    },
    secondary: {
      backgroundColor: 'var(--sd-secondary)',
      color: '#ffffff',
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: 'var(--sd-border)',
      color: 'var(--sd-text-primary)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--sd-text-secondary)',
    },
    danger: {
      backgroundColor: 'var(--sd-danger)',
      color: '#ffffff',
    },
    success: {
      backgroundColor: 'var(--sd-success)',
      color: '#ffffff',
    },
  };

  const computedStyle = {
    ...baseStyles,
    ...(sizeStyles[size] || sizeStyles.md),
    ...(variantStyles[variant] || variantStyles.primary),
  };

  return (
    <motion.button
      type={type}
      style={computedStyle}
      disabled={disabled || loading}
      onClick={onClick}
      className={`sd-button ${className}`}
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      {...props}
    >
      {loading ? (
        <span
          style={{
            display: 'inline-block',
            width: '1em',
            height: '1em',
            border: '2px solid currentColor',
            borderRightColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }}
        />
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon size={size === 'sm' ? 14 : 18} />}
          {children}
          {Icon && iconPosition === 'right' && <Icon size={size === 'sm' ? 14 : 18} />}
        </>
      )}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.button>
  );
}
