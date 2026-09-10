import React from 'react';
import Card from './Card';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg = 'var(--sd-primary-light)',
  iconColor = 'var(--sd-primary)',
  trend = null, // { value: '+12%', isPositive: true }
}) {
  return (
    <Card padding="1.25rem">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p
            style={{
              margin: '0 0 0.35rem 0',
              fontSize: 'var(--sd-font-size-xs)',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--sd-text-secondary)',
            }}
          >
            {title}
          </p>
          <h3
            style={{
              margin: '0 0 0.25rem 0',
              fontSize: 'var(--sd-font-size-2xl)',
              fontWeight: '800',
              color: 'var(--sd-text-primary)',
            }}
          >
            {value}
          </h3>
          {(subtitle || trend) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
              {trend && (
                <span
                  style={{
                    fontSize: 'var(--sd-font-size-xs)',
                    fontWeight: '700',
                    color: trend.isPositive ? 'var(--sd-success)' : 'var(--sd-danger)',
                  }}
                >
                  {trend.value}
                </span>
              )}
              {subtitle && (
                <span style={{ fontSize: 'var(--sd-font-size-xs)', color: 'var(--sd-text-muted)' }}>
                  {subtitle}
                </span>
              )}
            </div>
          )}
        </div>

        {Icon && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: 'var(--sd-radius-md)',
              backgroundColor: iconBg,
              color: iconColor,
              flexShrink: 0,
            }}
          >
            <Icon size={22} />
          </div>
        )}
      </div>
    </Card>
  );
}
