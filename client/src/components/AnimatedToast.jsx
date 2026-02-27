import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function AnimatedToast({ message, type = 'success', onClose }) {
  const toastRef = useRef(null);

  useEffect(() => {
    if (!toastRef.current) return;

    const toast = toastRef.current;

    // Slide in from right
    gsap.fromTo(toast,
      { x: 100, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }
    );

    // Auto close after 5 seconds
    const timer = setTimeout(() => {
      gsap.to(toast, {
        x: 100,
        opacity: 0,
        duration: 0.3,
        ease: 'power3.in',
        onComplete: onClose
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    success: 'rgba(39, 174, 96, 0.15)',
    error: 'rgba(231, 76, 60, 0.15)',
    warning: 'rgba(243, 156, 18, 0.15)',
    info: 'rgba(52, 152, 219, 0.15)'
  };

  const textColors = {
    success: 'var(--accent-success)',
    error: 'var(--accent-danger)',
    warning: 'var(--accent-warning)',
    info: 'var(--accent-primary)'
  };

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  return (
    <div
      ref={toastRef}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: bgColors[type] || bgColors.success,
        color: textColors[type] || textColors.success,
        padding: '1rem 1.5rem',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        maxWidth: '400px',
        fontSize: '0.95rem'
      }}
    >
      <span style={{ fontSize: '1.2rem' }}>{icons[type]}</span>
      <span>{message}</span>
      <button
        onClick={() => {
          gsap.to(toastRef.current, {
            x: 100,
            opacity: 0,
            duration: 0.3,
            ease: 'power3.in',
            onComplete: onClose
          });
        }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1.2rem',
          color: 'inherit',
          marginLeft: '0.5rem',
          padding: '0 0.25rem'
        }}
      >
        ✕
      </button>
    </div>
  );
}
