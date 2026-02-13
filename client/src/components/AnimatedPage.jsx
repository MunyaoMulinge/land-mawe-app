import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function AnimatedPage({ children, className = '' }) {
  const pageRef = useRef(null);
  
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    
    // Animate page content on mount
    const children = page.children;
    if (children.length === 0) return;
    
    gsap.fromTo(children,
      { opacity: 0, y: 20 },
      { 
        opacity: 1, 
        y: 0, 
        duration: 0.4, 
        stagger: 0.05,
        ease: 'power2.out'
      }
    );
  }, []);
  
  return (
    <div ref={pageRef} className={className}>
      {children}
    </div>
  );
}
