import React from 'react';

export default function Badge({
  children,
  variant = 'primary', // 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  size = 'md',        // 'sm' | 'md'
  icon: Icon = null,
  className = '',
  style = {},
}) {
  const variantStyles = {
    primary: {
      backgroundColor: 'var(--sd-primary-light)',
      color: 'var(--sd-primary)',
      border: '1px solid rgba(255, 87, 34, 0.2)',
    },
    success: {
      backgroundColor: 'var(--sd-success-light)',
      color: '#059669',
      border: '1px solid rgba(16, 185, 129, 0.2)',
    },
    warning: {
      backgroundColor: 'var(--sd-warning-light)',
      color: '#d97706',
      border: '1px solid rgba(245, 158, 11, 0.2)',
    },
    danger: {
      backgroundColor: 'var(--sd-danger-light)',
      color: '#dc2626',
      border: '1px solid rgba(239, 68, 68, 0.2)',
    },
    info: {
      backgroundColor: 'var(--sd-info-light)',
      color: '#2563eb',
      border: '1px solid rgba(59, 130, 246, 0.2)',
    },
    neutral: {
      backgroundColor: 'var(--sd-bg-muted)',
      color: 'var(--sd-text-secondary)',
      border: '1px solid var(--sd-border)',
    },
  };

  const sizeStyles = {
    sm: {
      padding: '0.2rem 0.5rem',
      fontSize: '0.7rem',
      gap: '0.25rem',
    },
    md: {
      padding: '0.3rem 0.75rem',
      fontSize: '0.8rem',
      gap: '0.35rem',
    },
  };

  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 'var(--sd-radius-full)',
    fontWeight: '600',
    letterSpacing: '0.01em',
    lineHeight: 1,
    whiteSpace: 'nowrap',
    ...(variantStyles[variant] || variantStyles.primary),
    ...(sizeStyles[size] || sizeStyles.md),
    ...style,
  };

  return (
    <span style={badgeStyle} className={`sd-badge ${className}`}>
      {Icon && <Icon size={size === 'sm' ? 10 : 12} />}
      {children}
    </span>
  );
}
