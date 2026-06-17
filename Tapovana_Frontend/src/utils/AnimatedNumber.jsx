import React, { useState, useEffect, useRef } from 'react';

/**
 * AnimatedNumber — Renders a number that counts up from 0 to the target value.
 *
 * Props:
 *   value     — The final target number.
 *   duration  — Animation duration in ms (default: 1400).
 *   prefix    — String placed before the number (e.g. "₹").
 *   suffix    — String placed after the number (e.g. "%").
 *   locale    — Locale for number formatting (default: "en-IN").
 *   className — Optional CSS class for the wrapper span.
 *   style     — Optional inline styles for the wrapper span.
 */
export default function AnimatedNumber({
  value = 0,
  duration = 1400,
  prefix = '',
  suffix = '',
  locale = 'en-IN',
  className = '',
  style = {},
}) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    const end = typeof value === 'number' ? value : parseFloat(value) || 0;

    if (end === 0) {
      setDisplay(0);
      return;
    }

    // Cancel any running animation
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;

    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic — fast start, smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(end * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplay(end);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  const formatted = display.toLocaleString(locale);

  return (
    <span className={className} style={style}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
