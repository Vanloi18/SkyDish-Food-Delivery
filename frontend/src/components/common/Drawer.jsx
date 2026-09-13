import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  footer,
  position = 'right', // 'right' | 'left' | 'bottom'
  width = '420px',
  maxWidth = '100%',
  className = '',
}) {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen, onClose]);

  const variants = {
    right: {
      initial: { x: '100%' },
      animate: { x: 0 },
      exit: { x: '100%' },
    },
    left: {
      initial: { x: '-100%' },
      animate: { x: 0 },
      exit: { x: '-100%' },
    },
    bottom: {
      initial: { y: '100%' },
      animate: { y: 0 },
      exit: { y: '100%' },
    },
  };

  const getPositionStyles = () => {
    if (position === 'bottom') {
      return {
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        maxHeight: '85vh',
        borderRadius: 'var(--sd-radius-lg) var(--sd-radius-lg) 0 0',
      };
    }
    if (position === 'left') {
      return {
        top: 0,
        bottom: 0,
        left: 0,
        width,
        maxWidth,
        borderRadius: '0 var(--sd-radius-lg) var(--sd-radius-lg) 0',
      };
    }
    return {
      top: 0,
      bottom: 0,
      right: 0,
      width,
      maxWidth,
      borderRadius: 'var(--sd-radius-lg) 0 0 var(--sd-radius-lg)',
    };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 'var(--sd-z-modal)' }}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(3px)',
              zIndex: 'var(--sd-z-backdrop)',
            }}
          />

          {/* Drawer Sheet */}
          <motion.aside
            {...variants[position]}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={className}
            style={{
              position: 'fixed',
              backgroundColor: 'var(--sd-bg-surface)',
              boxShadow: 'var(--sd-shadow-modal)',
              zIndex: 'var(--sd-z-modal)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              ...getPositionStyles(),
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--sd-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 'var(--sd-font-size-lg)',
                  fontWeight: 'var(--sd-weight-title)',
                  color: 'var(--sd-text-primary)',
                }}
              >
                {title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng bảng điều khiển"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '6px',
                  borderRadius: 'var(--sd-radius-sm)',
                  color: 'var(--sd-text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color var(--sd-transition-fast), background-color var(--sd-transition-fast)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--sd-text-primary)';
                  e.currentTarget.style.backgroundColor = 'var(--sd-bg-muted)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--sd-text-muted)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <FaTimes style={{ fontSize: '1rem' }} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div
              style={{
                padding: '1.5rem',
                overflowY: 'auto',
                flex: 1,
              }}
            >
              {children}
            </div>

            {/* Optional Footer */}
            {footer && (
              <div
                style={{
                  padding: '1.25rem 1.5rem',
                  borderTop: '1px solid var(--sd-border)',
                  backgroundColor: 'var(--sd-bg-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  flexShrink: 0,
                }}
              >
                {footer}
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
