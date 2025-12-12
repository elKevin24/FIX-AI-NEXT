import styles from './BrandLogo.module.css';

interface BrandLogoProps {
    size?: 'sm' | 'md' | 'lg';
    theme?: 'dark' | 'light'; // dark text or light text
    className?: string;
    showText?: boolean;
}

export default function BrandLogo({ 
    size = 'md', 
    theme = 'dark', 
    className = '',
    showText = true 
}: BrandLogoProps) {
    return (
        <div className={`${styles.container} ${styles[size]} ${styles[theme]} ${className}`}>
            <div className={styles.icon}>
                {/* Un simple isotipo geométrico: Un engranaje estilizado o chip */}
                <svg viewBox="0 0 24 24" className={styles.shape} xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 2h2v3.06a6 6 0 0 1 2.58.97l2.42-1.92 1.41 1.41-1.92 2.42a6 6 0 0 1 .97 2.58H22v2h-3.54a6 6 0 0 1-.97 2.58l1.92 2.42-1.41 1.41-2.42-1.92a6 6 0 0 1-2.58.97V22h-2v-3.06a6 6 0 0 1-2.58-.97l-2.42 1.92-1.41-1.41 1.92-2.42a6 6 0 0 1-.97-2.58H2v-2h3.06a6 6 0 0 1 .97-2.58L4.08 6.5l1.41-1.41 2.42 1.92A6 6 0 0 1 11 5.06V2zm1 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                </svg>
            </div>
            {showText && <span>FIX-AI</span>}
        </div>
    );
}
