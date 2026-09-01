import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ThemeInit from "@/components/ThemeInit";
import { SerwistProvider } from "@serwist/turbopack/react";
import { NuqsAdapter } from "nuqs/adapters/next/app";

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
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "FIX Workshop",
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
    viewportFit: "cover",
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
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@graph": [
                                {
                                    "@type": "Organization",
                                    "name": "FIX Workshop",
                                    "url": siteUrl,
                                    "logo": `${siteUrl}/icon-512.png`,
                                },
                                {
                                    "@type": "WebApplication",
                                    "name": "FIX Workshop",
                                    "url": siteUrl,
                                    "applicationCategory": "BusinessApplication",
                                    "operatingSystem": "All",
                                    "offers": {
                                        "@type": "Offer",
                                        "price": "0",
                                        "priceCurrency": "USD"
                                    },
                                    "description": "Sistema de gestión integral para talleres electrónicos multi-tenant con gestión de tickets, inventario y facturación."
                                },
                            ],
                        }),
                    }}
                />
                <ThemeInit />
                <ThemeProvider>
                    <NuqsAdapter>
                        <SerwistProvider swUrl="/serwist/sw.js">
                            <div id="app-root">
                                {children}
                            </div>
                        </SerwistProvider>
                    </NuqsAdapter>
                </ThemeProvider>
                <SpeedInsights />
                <Analytics />
            </body>
        </html>
    );
}