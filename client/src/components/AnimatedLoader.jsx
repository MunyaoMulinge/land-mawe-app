import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function AnimatedLoader({ message = 'Loading...' }) {
  const containerRef = useRef(null);
  const dotsRef = useRef([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Animate dots
    gsap.to(dotsRef.current, {
      y: -10,
      duration: 0.4,
      stagger: {
        each: 0.15,
        repeat: -1,
        yoyo: true
      },
      ease: 'power2.inOut'
    });
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        color: 'var(--text-secondary)'
      }}
    >
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            ref={(el) => { dotsRef.current[i] = el; }}
            style={{
              width: '12px',
              height: '12px',
              background: 'var(--accent-primary)',
              borderRadius: '50%'
            }}
          />
        ))}
      </div>
      <p>{message}</p>
    </div>
  );
}
