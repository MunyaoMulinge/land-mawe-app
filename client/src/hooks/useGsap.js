import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

// Hook for fade-in animation on mount
export function useFadeIn(delay = 0) {
  const ref = useRef(null);
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    gsap.fromTo(element, 
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, delay, ease: 'power2.out' }
    );
  }, [delay]);
  
  return ref;
}

// Hook for stagger animation on a list of children
export function useStagger(selector, staggerDelay = 0.1) {
  const containerRef = useRef(null);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const items = container.querySelectorAll(selector);
    if (items.length === 0) return;
    
    gsap.fromTo(items,
      { opacity: 0, y: 20 },
      { 
        opacity: 1, 
        y: 0, 
        duration: 0.4, 
        stagger: staggerDelay,
        ease: 'power2.out'
      }
    );
  }, [selector, staggerDelay]);
  
  return containerRef;
}

// Hook for counting up numbers
export function useCountUp(endValue, duration = 1.5) {
  const ref = useRef(null);
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const obj = { value: 0 };
    gsap.to(obj, {
      value: endValue,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        element.textContent = Math.round(obj.value);
      }
    });
  }, [endValue, duration]);
  
  return ref;
}

// Hook for page transition
export function usePageTransition() {
  const ref = useRef(null);
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    gsap.fromTo(element,
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }
    );
  }, []);
  
  return ref;
}

export { gsap };
