import React from 'react';
import Button from './Button';

export default function EmptyState({
  icon: Icon = null,
  title = 'Không tìm thấy dữ liệu',
  description = 'Hiện tại chưa có thông tin nào để hiển thị.',
  actionLabel = null,
  onAction = null,
  actionIcon = null,
  style = {},
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '3.5rem 1.5rem',
        borderRadius: 'var(--sd-radius-xl)',
        backgroundColor: '#ffffff',
        border: '1px dashed var(--sd-border)',
        ...style,
      }}
    >
      {Icon && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--sd-primary-light)',
            color: 'var(--sd-primary)',
            marginBottom: '1.25rem',
          }}
        >
          <Icon size={28} />
        </div>
      )}
      <h4
        style={{
          margin: '0 0 0.5rem 0',
          fontSize: 'var(--sd-font-size-lg)',
          fontWeight: '700',
          color: 'var(--sd-text-primary)',
        }}
      >
        {title}
      </h4>
      <p
        style={{
          margin: '0 0 1.5rem 0',
          fontSize: 'var(--sd-font-size-sm)',
          color: 'var(--sd-text-secondary)',
          maxWidth: '400px',
          lineHeight: '1.5',
        }}
      >
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          variant="primary"
          onClick={onAction}
          icon={actionIcon}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
