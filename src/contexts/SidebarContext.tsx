'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface SidebarContextType {
    isOpen: boolean;
    toggle: () => void;
    close: () => void;
    open: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
    isOpen: false,
    toggle: () => {},
    close: () => {},
    open: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const [prevPathname, setPrevPathname] = useState(pathname);

    // Cerrar sidebar al navegar entre rutas durante el render
    if (pathname !== prevPathname) {
        setPrevPathname(pathname);
        setIsOpen(false);
    }

    // Evitar scroll en el cuerpo cuando el drawer está abierto en móvil
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

    return (
        <SidebarContext.Provider
            value={{
                isOpen,
                toggle: () => setIsOpen((prev) => !prev),
                close: () => setIsOpen(false),
                open: () => setIsOpen(true),
            }}
        >
            {children}
        </SidebarContext.Provider>
    );
}

export const useSidebar = () => useContext(SidebarContext);
