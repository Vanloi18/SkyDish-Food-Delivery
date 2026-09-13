import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dropdown({
  trigger,
  children,
  align = 'right', // 'left' | 'right'
  width = '220px',
  className = '',
  style = {},
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', display: 'inline-block', ...style }}
    >
      <div onClick={() => setIsOpen((prev) => !prev)} style={{ cursor: 'pointer' }}>
        {typeof trigger === 'function' ? trigger({ isOpen }) : trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              [align]: 0,
              width,
              backgroundColor: 'var(--sd-bg-surface)',
              borderRadius: 'var(--sd-radius-md)',
              border: '1px solid var(--sd-border)',
              boxShadow: 'var(--sd-shadow-dropdown)',
              padding: '0.375rem',
              zIndex: 'var(--sd-z-dropdown)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            {typeof children === 'function' ? children({ close: () => setIsOpen(false) }) : children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  icon: Icon,
  danger = false,
  disabled = false,
  className = '',
  style = {},
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        width: '100%',
        padding: '0.55rem 0.75rem',
        fontSize: 'var(--sd-font-size-sm)',
        fontWeight: 'var(--sd-weight-nav)',
        color: danger ? 'var(--sd-error)' : disabled ? 'var(--sd-text-muted)' : 'var(--sd-text-primary)',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: 'var(--sd-radius-sm)',
        textAlign: 'left',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color var(--sd-transition-fast), color var(--sd-transition-fast)',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = danger ? 'var(--sd-error-light)' : 'var(--sd-bg-muted)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      {Icon && <Icon style={{ fontSize: '0.95rem', flexShrink: 0 }} />}
      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</span>
    </button>
  );
}

export function DropdownDivider() {
  return (
    <div
      style={{
        height: '1px',
        backgroundColor: 'var(--sd-border)',
        margin: '0.375rem 0',
      }}
    />
  );
}
