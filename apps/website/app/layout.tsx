import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from 'next/link';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ATM - Agent Tool Manager",
  description: "Discover, publish, and manage AI tools in one place",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        <div className="relative flex min-h-screen flex-col">
          <nav className="border-b">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
              <Link href="/" className="text-xl font-bold">
                ATM
              </Link>
              <div className="flex items-center gap-6">
                <Link href="/tools" className="hover:text-gray-600">
                  Tools
                </Link>
                <Link href="/docs" className="hover:text-gray-600">
                  Documentation
                </Link>
              </div>
            </div>
          </nav>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  )
}
