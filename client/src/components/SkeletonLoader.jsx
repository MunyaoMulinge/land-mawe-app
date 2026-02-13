import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function SkeletonLoader({ rows = 5, columns = 4 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const items = containerRef.current.querySelectorAll('.skeleton-item');
    
    gsap.fromTo(items,
      { opacity: 0.3 },
      {
        opacity: 0.7,
        duration: 0.8,
        stagger: 0.05,
        repeat: -1,
        yoyo: true,
        ease: 'power2.inOut'
      }
    );
  }, []);

  return (
    <div ref={containerRef} style={{ padding: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        {Array(columns).fill(0).map((_, i) => (
          <div
            key={`header-${i}`}
            className="skeleton-item"
            style={{
              flex: 1,
              height: '40px',
              background: 'var(--bg-tertiary)',
              borderRadius: '6px'
            }}
          />
        ))}
      </div>
      
      {/* Rows */}
      {Array(rows).fill(0).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
          {Array(columns).fill(0).map((_, colIndex) => (
            <div
              key={`cell-${rowIndex}-${colIndex}`}
              className="skeleton-item"
              style={{
                flex: 1,
                height: '50px',
                background: 'var(--bg-tertiary)',
                borderRadius: '6px'
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
