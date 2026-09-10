import React from 'react';
import { motion } from 'framer-motion';

export default function Card({
  children,
  interactive = false,
  padding = '1.5rem',
  className = '',
  style = {},
  onClick,
  ...props
}) {
  const cardStyle = {
    backgroundColor: 'var(--sd-bg-surface)',
    borderRadius: 'var(--sd-radius-lg)',
    border: '1px solid var(--sd-border)',
    boxShadow: 'var(--sd-shadow-sm)',
    padding,
    cursor: interactive || onClick ? 'pointer' : 'default',
    transition: 'transform var(--sd-transition-fast), box-shadow var(--sd-transition-fast), border-color var(--sd-transition-fast)',
    ...style,
  };

  const Component = interactive || onClick ? motion.div : 'div';
  const motionProps = interactive || onClick
    ? {
        whileHover: { y: -4, boxShadow: 'var(--sd-shadow-lg)', borderColor: '#cbd5e1' },
        whileTap: { scale: 0.99 },
      }
    : {};

  return (
    <Component
      style={cardStyle}
      onClick={onClick}
      className={`sd-card ${className}`}
      {...motionProps}
      {...props}
    >
      {children}
    </Component>
  );
}
