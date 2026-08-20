import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ThemeInit from "@/components/ThemeInit";

const inter = Inter({
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700", "800"],
    display: "swap",
    variable: "--font-inter",
});

const siteUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://fix-ai-next.vercel.app';

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: "FIX Workshop - Sistema de Gestión Multi-Tenant",
        template: "%s | FIX Workshop",
    },
    description: "Sistema de gestión integral para talleres electrónicos multi-tenant. Tickets, inventario, facturación, clientes y reportes con aislamiento total de datos.",
    keywords: ["taller", "workshop", "tickets", "inventario", "facturación", "multi-tenant", "gestión", "reparaciones"],
    authors: [{ name: "FIX Workshop Team" }],
    creator: "FIX Workshop",
    publisher: "FIX Workshop",
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    openGraph: {
        type: "website",
        locale: "es_ES",
        url: siteUrl,
        siteName: "FIX Workshop",
        title: "FIX Workshop - Sistema de Gestión Multi-Tenant",
        description: "Sistema de gestión integral para talleres electrónicos multi-tenant. Tickets, inventario, facturación, clientes y reportes.",
        images: [
            {
                url: `${siteUrl}/og-image.png`,
                width: 1200,
                height: 630,
                alt: "FIX Workshop - Dashboard",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        site: "@fixworkshop",
        creator: "@fixworkshop",
        title: "FIX Workshop - Sistema de Gestión Multi-Tenant",
        description: "Sistema de gestión integral para talleres electrónicos multi-tenant.",
        images: [`${siteUrl}/og-image.png`],
    },
    icons: {
        icon: [
            { url: "/favicon.ico", sizes: "32x32" },
            { url: "/favicon.svg", type: "image/svg+xml" },
        ],
        apple: "/apple-touch-icon.png",
        shortcut: "/favicon.ico",
    },
    manifest: "/manifest.json",
    verification: {
        google: "google-site-verification-code",
    },
    alternates: {
        canonical: siteUrl,
        languages: {
            es: siteUrl,
        },
    },
};

export const viewport: Viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#ffffff" },
        { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
    ],
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es" className={inter.variable} suppressHydrationWarning>
            <head />
            <body>
                <a
                    href="#main-content"
                    className="skip-link"
                >
                    Saltar al contenido principal
                </a>
                <ThemeInit />
                <ThemeProvider>
                    <main id="main-content" tabIndex={-1}>
                        {children}
                    </main>
                </ThemeProvider>
            </body>
        </html>
    );
}