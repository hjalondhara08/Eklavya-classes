import type { Metadata } from "next";
import { Poppins, Noto_Sans_Gujarati } from 'next/font/google';
import "./globals.css";
import Providers from "@/components/Providers";
import Navigation from "@/components/ui/Navigation";

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

const gujarati = Noto_Sans_Gujarati({
  subsets: ['gujarati'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-gujarati',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Eklavya Classes | Tuition Management System",
  description: "Tuition fee tracking, student management, and financial reporting system for Eklavya Classes.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} ${gujarati.variable}`}>
      <body className="font-sans bg-slate-50 text-slate-900 antialiased min-h-screen">
        <Providers>
          <Navigation>{children}</Navigation>
        </Providers>
      </body>
    </html>
  );
}
