import type { Metadata } from "next";
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
            <head />
            <body>
                <ThemeInit />
                <ThemeProvider>
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}
