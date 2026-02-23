import { useEffect, useRef, useState } from "react";

export function useAnimatedCounter(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const prev = useRef(0);
  const raf = useRef<number>();

  useEffect(() => {
    const start = prev.current;
    const diff = target - start;
    if (diff === 0) return;
    
    const startTime = performance.now();
    
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + diff * eased;
      setValue(current);
      
      if (progress < 1) {
        raf.current = requestAnimationFrame(animate);
      } else {
        prev.current = target;
      }
    };
    
    raf.current = requestAnimationFrame(animate);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration]);

  return value;
}
