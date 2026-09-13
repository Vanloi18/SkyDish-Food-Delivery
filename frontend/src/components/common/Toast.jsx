import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback(({ title, message, type = 'info', duration = 3500 }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newToast = { id, title, message, type, duration };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const icons = {
    success: <FaCheckCircle style={{ color: 'var(--sd-success)', fontSize: '1.15rem', flexShrink: 0 }} />,
    error: <FaExclamationCircle style={{ color: 'var(--sd-error)', fontSize: '1.15rem', flexShrink: 0 }} />,
    warning: <FaExclamationTriangle style={{ color: 'var(--sd-warning)', fontSize: '1.15rem', flexShrink: 0 }} />,
    info: <FaInfoCircle style={{ color: 'var(--sd-info)', fontSize: '1.15rem', flexShrink: 0 }} />,
  };

  const borders = {
    success: 'var(--sd-success)',
    error: 'var(--sd-error)',
    warning: 'var(--sd-warning)',
    info: 'var(--sd-info)',
  };

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}

      {/* Toast Container */}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 'var(--sd-z-toast)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          maxWidth: '380px',
          width: 'calc(100vw - 3rem)',
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{
                pointerEvents: 'auto',
                backgroundColor: 'var(--sd-bg-surface)',
                borderLeft: `4px solid ${borders[toast.type] || borders.info}`,
                borderRadius: 'var(--sd-radius-md)',
                boxShadow: 'var(--sd-shadow-dropdown)',
                padding: '0.9rem 1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                border: '1px solid var(--sd-border)',
              }}
            >
              {icons[toast.type] || icons.info}

              <div style={{ flex: 1, minWidth: 0 }}>
                {toast.title && (
                  <div style={{ fontWeight: 'var(--sd-weight-title)', fontSize: 'var(--sd-font-size-sm)', color: 'var(--sd-text-primary)' }}>
                    {toast.title}
                  </div>
                )}
                <div style={{ fontSize: 'var(--sd-font-size-sm)', color: 'var(--sd-text-secondary)', lineHeight: 1.4 }}>
                  {toast.message}
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Đóng thông báo"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '2px',
                  color: 'var(--sd-text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <FaTimes style={{ fontSize: '0.75rem' }} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback safe dummy if used outside ToastProvider
    return {
      showToast: (args) => console.log('[Toast Notice]', args?.message || args),
      removeToast: () => {},
    };
  }
  return context;
}

export default ToastProvider;

