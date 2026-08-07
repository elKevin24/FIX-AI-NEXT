import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";

const inter = Inter({
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700", "800"],
    display: "swap",
    variable: "--font-inter",
});

export const metadata: Metadata = {
    metadataBase: new URL(process.env['NEXT_PUBLIC_APP_URL'] || 'https://fix-ai-next.vercel.app'),
    title: "Multi-Tenant Workshop App",
    description: "Managed workshop system",
    icons: {
        icon: '/icon.svg',
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es" className={inter.variable} suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                try {
                                    const theme = localStorage.getItem('theme') || 'auto';
                                    
                                    if (theme === 'auto') {
                                        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                                        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
                                    } else if (['light', 'dark', 'dark-colorblind'].includes(theme)) {
                                        document.documentElement.setAttribute('data-theme', theme);
                                    } else {
                                        // Fallback to auto behavior
                                        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                                        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
                                    }
                                } catch (e) {
                                    document.documentElement.setAttribute('data-theme', 'light');
                                }
                            })();
                        `,
                    }}
                />
            </head>
            <body>
                <ThemeProvider>
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}
