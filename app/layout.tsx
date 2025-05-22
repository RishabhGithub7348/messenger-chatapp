'use client'

import { AuthProvider } from "@/context/auth-context";
import "./globals.css";
import { Inter } from 'next/font/google'
import { FilterProvider } from "@/context/filter";
import AuthGuard from "@/components/auth/auth-guard";

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
     <body className={`${inter.className} min-h-screen bg-[#f0f2f5]`}>
        <AuthProvider>
          <FilterProvider>
            <AuthGuard>
              {children}
            </AuthGuard>
          </FilterProvider>

        </AuthProvider>
      </body>
    </html>

  )
}
