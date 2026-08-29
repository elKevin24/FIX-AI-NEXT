import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ 
  className = '', 
  variant = 'rectangular',
  width,
  height
}: SkeletonProps) {
  const inlineStyles: React.CSSProperties = {};
  
  if (width !== undefined) inlineStyles.width = typeof width === 'number' ? `${width}px` : width;
  if (height !== undefined) inlineStyles.height = typeof height === 'number' ? `${height}px` : height;

  const classes = [
    styles.skeleton,
    styles[variant],
    className
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={classes} 
      style={inlineStyles}
      aria-hidden="true" 
    />
  );
}
