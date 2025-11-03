import { Outfit } from "next/font/google";
import "./globals.css";
import { Metadata } from "next";
import { ThemeProvider } from "@/context/ThemeContext";
import { SidebarProvider } from "@/context/SidebarContext";
import AuthProvider from "./providers/AuthProvider"; // Importamos el AuthProvider

const outfit = Outfit({
  variable: "--font-outfit-sans",
  subsets: ["latin"],
  display: "swap",
  fallback: ["Arial", "sans-serif"],
  preload: true,
});

export const metadata: Metadata = {
  title: {
    template: '%s | Mecanica',
    default: 'Mecanica | Administración',
  },
  description: 'Sistema de administración Mecanica',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${outfit.variable} dark:bg-gray-900`}>
        <AuthProvider>
          <ThemeProvider>
            <SidebarProvider>
              {children}
            </SidebarProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}