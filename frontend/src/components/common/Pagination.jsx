import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  className = '',
  style = {},
}) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  const buttonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '36px',
    height: '36px',
    padding: '0 0.5rem',
    borderRadius: 'var(--sd-radius-sm)',
    border: '1px solid var(--sd-border)',
    backgroundColor: 'var(--sd-bg-surface)',
    color: 'var(--sd-text-primary)',
    fontSize: 'var(--sd-font-size-sm)',
    fontWeight: 'var(--sd-weight-metadata)',
    cursor: 'pointer',
    transition: 'all var(--sd-transition-fast)',
  };

  const activeButtonStyle = {
    ...buttonStyle,
    backgroundColor: 'var(--sd-primary)',
    borderColor: 'var(--sd-primary)',
    color: '#ffffff',
    boxShadow: '0 2px 4px var(--sd-primary-glow)',
  };

  const disabledButtonStyle = {
    ...buttonStyle,
    backgroundColor: 'var(--sd-bg-muted)',
    color: 'var(--sd-text-muted)',
    cursor: 'not-allowed',
    borderColor: 'var(--sd-border)',
  };

  return (
    <nav
      aria-label="Phân trang"
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.375rem',
        marginTop: '1.5rem',
        ...style,
      }}
    >
      {/* Previous button */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Trang trước"
        style={currentPage <= 1 ? disabledButtonStyle : buttonStyle}
      >
        <FaChevronLeft style={{ fontSize: '0.75rem' }} />
      </button>

      {/* Page Numbers */}
      {pages.map((p, idx) => {
        if (p === '...') {
          return (
            <span
              key={`ellipsis-${idx}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '32px',
                height: '36px',
                color: 'var(--sd-text-muted)',
                fontSize: 'var(--sd-font-size-sm)',
              }}
            >
              ...
            </span>
          );
        }

        const isCurrent = p === currentPage;
        return (
          <button
            key={`page-${p}`}
            type="button"
            onClick={() => onPageChange(p)}
            aria-label={`Trang ${p}`}
            aria-current={isCurrent ? 'page' : undefined}
            style={isCurrent ? activeButtonStyle : buttonStyle}
            onMouseEnter={(e) => {
              if (!isCurrent) {
                e.currentTarget.style.borderColor = 'var(--sd-primary)';
                e.currentTarget.style.color = 'var(--sd-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isCurrent) {
                e.currentTarget.style.borderColor = 'var(--sd-border)';
                e.currentTarget.style.color = 'var(--sd-text-primary)';
              }
            }}
          >
            {p}
          </button>
        );
      })}

      {/* Next button */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Trang sau"
        style={currentPage >= totalPages ? disabledButtonStyle : buttonStyle}
      >
        <FaChevronRight style={{ fontSize: '0.75rem' }} />
      </button>
    </nav>
  );
}
