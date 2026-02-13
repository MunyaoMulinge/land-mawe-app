import { useRef, useEffect, useCallback } from 'react';
import { gsap } from 'gsap';

// Hook for button hover scale effect
export function useButtonHover() {
  const buttonRef = useRef(null);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const onMouseEnter = () => {
      gsap.to(button, { scale: 1.05, duration: 0.2, ease: 'power2.out' });
    };

    const onMouseLeave = () => {
      gsap.to(button, { scale: 1, duration: 0.2, ease: 'power2.out' });
    };

    button.addEventListener('mouseenter', onMouseEnter);
    button.addEventListener('mouseleave', onMouseLeave);

    return () => {
      button.removeEventListener('mouseenter', onMouseEnter);
      button.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  return buttonRef;
}

// Hook for shake animation (delete confirmation)
export function useShake() {
  const elementRef = useRef(null);

  const shake = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;

    gsap.to(element, {
      x: [-10, 10, -10, 10, -5, 5, -5, 5, 0],
      duration: 0.4,
      ease: 'power2.inOut'
    });
  }, []);

  return [elementRef, shake];
}

// Hook for pulse animation
export function usePulse() {
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    gsap.to(element, {
      scale: 1.02,
      duration: 0.5,
      yoyo: true,
      repeat: -1,
      ease: 'power1.inOut'
    });

    return () => {
      gsap.killTweensOf(element);
    };
  }, []);

  return elementRef;
}

// Hook for fade in on scroll (optional enhancement)
export function useFadeInOnMount(delay = 0) {
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    gsap.fromTo(element,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, delay, ease: 'power2.out' }
    );
  }, [delay]);

  return elementRef;
}

// Confirm delete with shake animation
export function useConfirmDelete(message = 'Are you sure you want to delete this item?') {
  const [elementRef, shake] = useShake();

  const confirmDelete = useCallback(async (onConfirm) => {
    const confirmed = window.confirm(message);
    if (confirmed) {
      await onConfirm();
    } else {
      shake();
    }
  }, [message, shake]);

  return [elementRef, confirmDelete];
}

export { gsap };
