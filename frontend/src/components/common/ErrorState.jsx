import React from 'react';
import { FaExclamationTriangle, FaRedo, FaArrowLeft } from 'react-icons/fa';
import Button from './Button';

export default function ErrorState({
  title = 'Không thể tải dữ liệu',
  description = 'Đã có lỗi xảy ra trong quá trình xử lý. Vui lòng kiểm tra kết nối mạng và thử lại.',
  onRetry,
  onBack,
  retryLabel = 'Thử lại',
  backLabel = 'Quay lại',
  icon: Icon = FaExclamationTriangle,
  className = '',
  style = {},
}) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '3rem 1.5rem',
        backgroundColor: 'var(--sd-bg-surface)',
        borderRadius: 'var(--sd-radius-lg)',
        border: '1px solid var(--sd-border)',
        boxShadow: 'var(--sd-shadow-xs)',
        maxWidth: '540px',
        margin: '2rem auto',
        ...style,
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: 'var(--sd-radius-md)',
          backgroundColor: 'var(--sd-error-light)',
          color: 'var(--sd-error)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          marginBottom: '1.25rem',
        }}
      >
        <Icon />
      </div>

      <h3
        style={{
          fontSize: 'var(--sd-font-size-xl)',
          fontWeight: 'var(--sd-weight-title)',
          color: 'var(--sd-text-primary)',
          marginBottom: '0.5rem',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: 'var(--sd-font-size-sm)',
          color: 'var(--sd-text-secondary)',
          lineHeight: 1.5,
          maxWidth: '420px',
          marginBottom: '1.5rem',
        }}
      >
        {description}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {onRetry && (
          <Button variant="primary" icon={FaRedo} onClick={onRetry}>
            {retryLabel}
          </Button>
        )}
        {onBack && (
          <Button variant="outline" icon={FaArrowLeft} onClick={onBack}>
            {backLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
