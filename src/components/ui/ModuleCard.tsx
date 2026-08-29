import React from 'react';
import Link from 'next/link';
import styles from './ModuleCard.module.css';

type ModuleVariant = 'primary' | 'secondary' | 'warning' | 'success';

interface ModuleCardProps {
  variant: ModuleVariant;
  icon: React.ReactNode;
  badges: { text: string; outline?: boolean }[];
  title: string | React.ReactNode;
  description: string;
  features: string[];
  actionText: string;
  href: string;
}

export function ModuleCard({
  variant,
  icon,
  badges,
  title,
  description,
  features,
  actionText,
  href
}: ModuleCardProps) {
  return (
    <Link href={href} className={`${styles['moduleCard']} ${styles[variant]}`}>
      {/* Curved background blob */}
      <div className={styles['backgroundWave']}></div>
      
      {/* Icon */}
      <div className={styles['iconContainer']}>
        {icon}
      </div>
      
      {/* Badges */}
      <div className={styles['badgesContainer']}>
        {badges.map((badge, idx) => (
          <span 
            key={idx} 
            className={badge.outline ? styles['badgeOutline'] : styles['badge']}
          >
            {badge.text}
          </span>
        ))}
      </div>
      
      {/* Content */}
      <h3 className={styles['title']}>{title}</h3>
      <p className={styles['description']}>{description}</p>
      
      {/* Features Checklist */}
      <div className={styles['featuresList']}>
        {features.map((feature, idx) => (
          <div key={idx} className={styles['featureItem']}>
            <svg 
              className={styles['featureIcon']} 
              xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            >
              {variant === 'warning' && idx === 1 ? (
                // En la imagen original, el módulo naranja (warning) tiene un icono de reloj en el 2do item
                <>
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </>
              ) : (
                <polyline points="20 6 9 17 4 12"></polyline>
              )}
            </svg>
            <span dangerouslySetInnerHTML={{ __html: feature }} />
          </div>
        ))}
      </div>
      
      {/* Footer Action */}
      <div className={styles['actionFooter']}>
        <span>{actionText}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </div>
    </Link>
  );
}
