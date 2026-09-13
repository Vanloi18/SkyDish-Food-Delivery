import React from 'react';

export default function Skeleton({
  width = '100%',
  height = '1rem',
  borderRadius = 'var(--sd-radius-sm)',
  className = '',
  style = {},
}) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: 'var(--sd-bg-muted)',
        backgroundImage: 'linear-gradient(90deg, var(--sd-bg-muted) 0px, #e2e8f0 50%, var(--sd-bg-muted) 100%)',
        backgroundSize: '200% 100%',
        animation: 'sd-skeleton-shimmer 1.5s infinite linear',
        ...style,
      }}
    />
  );
}
