'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Menu,
    X,
    Home,
    Ticket,
    Layers,
    Package,
    Activity,
    FileCode,
    Users,
    ShoppingCart,
    CircleDollarSign,
    Receipt,
    FileSpreadsheet,
    RotateCcw,
    BarChart3,
    UserCog,
    Settings
} from 'lucide-react';
import ThemeSwitcher from '@/components/ui/ThemeSwitcher';
import styles from './Sidebar.module.css';

interface SidebarProps {
    logoutButton: React.ReactNode;
    userRole?: string;
}

export default function Sidebar({ logoutButton, userRole }: SidebarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    // Close sidebar when route changes (mobile)
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsOpen(false);
    }, [pathname]);

    // Prevent scrolling when sidebar is open on mobile
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const isActive = (path: string) => {
        if (path === '/dashboard') {
            return pathname === '/dashboard';
        }
        if (path === '/dashboard/tickets') {
            return (
                pathname === '/dashboard/tickets' ||
                (pathname?.startsWith('/dashboard/tickets/') && !pathname.startsWith('/dashboard/tickets/pool'))
            );
        }
        return pathname?.startsWith(path);
    };

    const getLinkClass = (path: string) => {
        return `${styles['navLink']} ${isActive(path) ? styles['active'] : ''}`;
    };

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                className={`${styles['mobileToggle']} ${isOpen ? styles['toggleOpen'] : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
            >
                {isOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
            </button>

            {/* Overlay */}
            <div
                className={`${styles['overlay']} ${isOpen ? styles['open'] : ''}`}
                onClick={() => setIsOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`${styles['sidebar']} ${isOpen ? styles['open'] : ''}`} aria-label="Menú de navegación">
                <div className={styles['logo']}>
                    <div className={styles['logoIcon']} />
                    <h2>FIX-AI</h2>
                </div>
                <nav className={styles['nav']}>
                    {/* Grupo 1: General (3 ítems) */}
                    <div className={styles['navSection']}>
                        <span className={styles['navSectionTitle']}>General</span>
                        <Link href="/dashboard" className={getLinkClass('/dashboard')}>
                            <Home size={18} className={styles['navIcon']} aria-hidden="true" />
                            Inicio
                        </Link>
                        <Link href="/dashboard/tickets" className={getLinkClass('/dashboard/tickets')}>
                            <Ticket size={18} className={styles['navIcon']} aria-hidden="true" />
                            Tickets
                        </Link>
                        <Link href="/dashboard/tickets/pool" className={getLinkClass('/dashboard/tickets/pool')}>
                            <Layers size={18} className={styles['navIcon']} aria-hidden="true" />
                            Pool de Tickets
                        </Link>
                    </div>

                    {/* Grupo 2: Taller & Operaciones (4 ítems) */}
                    <div className={styles['navSection']}>
                        <span className={styles['navSectionTitle']}>Operaciones</span>
                        <Link href="/dashboard/parts" className={getLinkClass('/dashboard/parts')}>
                            <Package size={18} className={styles['navIcon']} aria-hidden="true" />
                            Repuestos
                        </Link>
                        <Link href="/dashboard/technicians/workload" className={getLinkClass('/dashboard/technicians/workload')}>
                            <Activity size={18} className={styles['navIcon']} aria-hidden="true" />
                            Carga de Trabajo
                        </Link>
                        {userRole === 'ADMIN' && (
                            <Link href="/dashboard/settings/service-templates" className={getLinkClass('/dashboard/settings/service-templates')}>
                                <FileCode size={18} className={styles['navIcon']} aria-hidden="true" />
                                Plantillas
                            </Link>
                        )}
                        <Link href="/dashboard/customers" className={getLinkClass('/dashboard/customers')}>
                            <Users size={18} className={styles['navIcon']} aria-hidden="true" />
                            Clientes
                        </Link>
                    </div>

                    {/* Grupo 3: Ventas & Punto de Venta (5 ítems) */}
                    <div className={styles['navSection']}>
                        <span className={styles['navSectionTitle']}>Ventas & POS</span>
                        <Link href="/dashboard/pos" className={getLinkClass('/dashboard/pos')}>
                            <ShoppingCart size={18} className={styles['navIcon']} aria-hidden="true" />
                            Punto de Venta
                        </Link>
                        <Link href="/dashboard/cash-register" className={getLinkClass('/dashboard/cash-register')}>
                            <CircleDollarSign size={18} className={styles['navIcon']} aria-hidden="true" />
                            Caja
                        </Link>
                        <Link href="/dashboard/invoices" className={getLinkClass('/dashboard/invoices')}>
                            <Receipt size={18} className={styles['navIcon']} aria-hidden="true" />
                            Facturación
                        </Link>
                        <Link href="/dashboard/pos/quotations" className={getLinkClass('/dashboard/pos/quotations')}>
                            <FileSpreadsheet size={18} className={styles['navIcon']} aria-hidden="true" />
                            Cotizaciones
                        </Link>
                        <Link href="/dashboard/pos/returns" className={getLinkClass('/dashboard/pos/returns')}>
                            <RotateCcw size={18} className={styles['navIcon']} aria-hidden="true" />
                            Devoluciones
                        </Link>
                    </div>

                    {/* Grupo 4: Administración (3 ítems) */}
                    <div className={styles['navSection']}>
                        <span className={styles['navSectionTitle']}>Administración</span>
                        <Link href="/dashboard/reports" className={getLinkClass('/dashboard/reports')}>
                            <BarChart3 size={18} className={styles['navIcon']} aria-hidden="true" />
                            Reportes
                        </Link>
                        <Link href="/dashboard/users" className={getLinkClass('/dashboard/users')}>
                            <UserCog size={18} className={styles['navIcon']} aria-hidden="true" />
                            Usuarios
                        </Link>
                        <Link href="/dashboard/settings" className={getLinkClass('/dashboard/settings')}>
                            <Settings size={18} className={styles['navIcon']} aria-hidden="true" />
                            Configuración
                        </Link>
                    </div>
                </nav>
                <div className={styles['userProfile']}>
                    <div className={styles['themeSwitcherWrapper']} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ThemeSwitcher />
                    </div>
                    {logoutButton}
                </div>
            </aside>
        </>
    );
}
