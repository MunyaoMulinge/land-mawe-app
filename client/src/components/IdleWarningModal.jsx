import { useEffect, useState } from 'react';
import AnimatedModal from './AnimatedModal';
import { getSessionInfo, formatTimeRemaining } from '../hooks/useSession';

export default function IdleWarningModal({ onStayActive, onLogout }) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      const session = getSessionInfo();
      if (session) {
        const secondsLeft = Math.ceil(session.idleTimeRemaining / 1000);
        setTimeLeft(secondsLeft);
        
        // Auto logout when timer reaches 0
        if (secondsLeft <= 0) {
          setIsOpen(false);
          onLogout();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [onLogout]);

  const handleStayActive = () => {
    setIsOpen(false);
    onStayActive();
  };

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={handleStayActive}
      title="⏰ Session Timeout Warning"
    >
      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        <p style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
          You will be logged out due to inactivity in:
        </p>
        <div 
          style={{ 
            fontSize: '3rem', 
            fontWeight: 'bold', 
            color: timeLeft <= 10 ? '#dc3545' : 'var(--accent-warning)',
            marginBottom: '1.5rem'
          }}
        >
          {timeLeft}s
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Click the button below to stay logged in.
        </p>
        <button 
          className="btn btn-primary" 
          onClick={handleStayActive}
          style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
        >
          I'm Still Here ✅
        </button>
      </div>
    </AnimatedModal>
  );
}
