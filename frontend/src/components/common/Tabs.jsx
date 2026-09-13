import React from 'react';

export default function Tabs({
  tabs = [],
  activeTab,
  onChange,
  variant = 'underline', // 'underline' | 'pills'
  className = '',
  style = {},
}) {
  return (
    <div
      role="tablist"
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: variant === 'pills' ? '0.5rem' : '1.5rem',
        borderBottom: variant === 'underline' ? '1px solid var(--sd-border)' : 'none',
        paddingBottom: variant === 'underline' ? '0' : '0.25rem',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        ...style,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const Icon = tab.icon;

        if (variant === 'pills') {
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              onClick={() => onChange(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--sd-radius-md)',
                fontSize: 'var(--sd-font-size-sm)',
                fontWeight: isActive ? 'var(--sd-weight-nav-active)' : 'var(--sd-weight-nav)',
                backgroundColor: isActive ? 'var(--sd-primary)' : 'var(--sd-bg-muted)',
                color: isActive ? '#ffffff' : 'var(--sd-text-secondary)',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all var(--sd-transition-fast)',
              }}
            >
              {Icon && <Icon style={{ fontSize: '0.9rem' }} />}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  style={{
                    backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'var(--sd-border)',
                    color: isActive ? '#ffffff' : 'var(--sd-text-primary)',
                    borderRadius: 'var(--sd-radius-pill)',
                    padding: '0.1rem 0.45rem',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        }

        // Underline variant (default)
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 0.25rem',
              fontSize: 'var(--sd-font-size-sm)',
              fontWeight: isActive ? 'var(--sd-weight-nav-active)' : 'var(--sd-weight-nav)',
              color: isActive ? 'var(--sd-primary)' : 'var(--sd-text-secondary)',
              border: 'none',
              borderBottom: `2px solid ${isActive ? 'var(--sd-primary)' : 'transparent'}`,
              marginBottom: '-1px',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color var(--sd-transition-fast), border-color var(--sd-transition-fast)',
            }}
          >
            {Icon && <Icon style={{ fontSize: '0.95rem' }} />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                style={{
                  backgroundColor: isActive ? 'var(--sd-primary-light)' : 'var(--sd-bg-muted)',
                  color: isActive ? 'var(--sd-primary)' : 'var(--sd-text-muted)',
                  borderRadius: 'var(--sd-radius-pill)',
                  padding: '0.1rem 0.5rem',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
