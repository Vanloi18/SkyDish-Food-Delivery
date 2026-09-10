import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '550px',
  showClose = true,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(4px)',
            }}
          />

          {/* Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth,
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: '#ffffff',
              borderRadius: 'var(--sd-radius-xl)',
              boxShadow: 'var(--sd-shadow-xl)',
              zIndex: 1051,
              border: '1px solid var(--sd-border)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--sd-border)',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 'var(--sd-font-size-lg)',
                  fontWeight: '700',
                  color: 'var(--sd-text-primary)',
                }}
              >
                {title}
              </h3>
              {showClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Đóng cửa sổ"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: '#f1f5f9',
                    color: 'var(--sd-text-secondary)',
                    cursor: 'pointer',
                    transition: 'background-color var(--sd-transition-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                >
                  <FaTimes size={14} />
                </button>
              )}
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem' }}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
