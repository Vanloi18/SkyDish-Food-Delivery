import React from 'react';

export default function LoadingSkeleton({
  type = 'card', // 'card' | 'text' | 'avatar' | 'table-row'
  count = 1,
  height,
  width,
  style = {},
}) {
  const items = Array.from({ length: count });

  if (type === 'avatar') {
    return (
      <div style={{ display: 'flex', gap: '0.75rem', ...style }}>
        {items.map((_, i) => (
          <div
            key={i}
            className="sd-skeleton"
            style={{
              width: width || '48px',
              height: height || '48px',
              borderRadius: '50%',
            }}
          />
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.5rem',
          width: '100%',
          ...style,
        }}
      >
        {items.map((_, i) => (
          <div
            key={i}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--sd-radius-lg)',
              border: '1px solid var(--sd-border)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div
              className="sd-skeleton"
              style={{
                width: '100%',
                height: height || '160px',
                borderRadius: 'var(--sd-radius-md)',
              }}
            />
            <div className="sd-skeleton" style={{ width: '70%', height: '20px' }} />
            <div className="sd-skeleton" style={{ width: '90%', height: '14px' }} />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '0.5rem',
              }}
            >
              <div className="sd-skeleton" style={{ width: '30%', height: '18px' }} />
              <div
                className="sd-skeleton"
                style={{ width: '36px', height: '36px', borderRadius: '50%' }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table-row') {
    return (
      <>
        {items.map((_, i) => (
          <tr key={i}>
            <td colSpan={10} style={{ padding: '1rem' }}>
              <div className="sd-skeleton" style={{ width: '100%', height: '24px' }} />
            </td>
          </tr>
        ))}
      </>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', ...style }}>
      {items.map((_, i) => (
        <div
          key={i}
          className="sd-skeleton"
          style={{
            width: width || (i === items.length - 1 ? '60%' : '100%'),
            height: height || '16px',
          }}
        />
      ))}
    </div>
  );
}
