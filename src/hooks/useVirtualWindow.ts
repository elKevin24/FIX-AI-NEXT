import { RefObject, useEffect, useMemo, useState } from 'react';

interface VirtualWindowOptions {
  itemHeight: number;
  overscan?: number;
  enabled?: boolean;
}

export function useVirtualWindow<T>(
  items: T[],
  containerRef: RefObject<HTMLElement | null>,
  { itemHeight, overscan = 3, enabled = true }: VirtualWindowOptions,
) {
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const element = containerRef.current;
    if (!element) return;

    let frame = 0;

    const updateMetrics = () => {
      frame = 0;
      setScrollTop(element.scrollTop);
      setViewportHeight(element.clientHeight);
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateMetrics);
    };

    updateMetrics();
    element.addEventListener('scroll', onScroll, { passive: true });

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateMetrics);
      observer.observe(element);
      return () => {
        if (frame) window.cancelAnimationFrame(frame);
        observer.disconnect();
        element.removeEventListener('scroll', onScroll);
      };
    }

    window.addEventListener('resize', updateMetrics);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      element.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateMetrics);
    };
  }, [containerRef, enabled]);

  return useMemo(() => {
    if (!enabled || items.length === 0) {
      return {
        visibleItems: items,
        startIndex: 0,
        endIndex: items.length,
        paddingTop: 0,
        paddingBottom: 0,
        totalHeight: items.length * itemHeight,
      };
    }

    const visibleCount = Math.max(1, Math.ceil(viewportHeight / itemHeight));
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length,
      startIndex + visibleCount + overscan * 2,
    );

    return {
      visibleItems: items.slice(startIndex, endIndex),
      startIndex,
      endIndex,
      paddingTop: startIndex * itemHeight,
      paddingBottom: Math.max(0, (items.length - endIndex) * itemHeight),
      totalHeight: items.length * itemHeight,
    };
  }, [enabled, items, itemHeight, overscan, scrollTop, viewportHeight]);
}
