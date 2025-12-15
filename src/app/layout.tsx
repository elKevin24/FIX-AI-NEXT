import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";

export const metadata: Metadata = {
    title: "Multi-Tenant Workshop App",
    description: "Managed workshop system",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                try {
                                    const theme = localStorage.getItem('theme');
                                    if (theme && ['light', 'dark', 'dark-colorblind'].includes(theme)) {
                                        document.documentElement.setAttribute('data-theme', theme);
                                    } else {
                                        document.documentElement.setAttribute('data-theme', 'light');
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
