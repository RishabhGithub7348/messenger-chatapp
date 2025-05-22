"use client";

import { AuthProvider } from "@/context/auth-context";
import "./globals.css";
import { FilterProvider } from "@/context/filter";
import AuthGuard from "@/components/auth/auth-guard";


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>Chat Messenger - Connect and Communicate</title>
        <meta name="description" content="A modern chat application to connect with friends, family, and groups. Enjoy seamless communication with real-time messaging and presence tracking." />
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Your Name or Company" />
        <meta name="keywords" content="chat, messaging, communication, real-time, group chat" />
        {/* Open Graph Meta Tags for Social Media */}
        <meta property="og:title" content="Chat App - Connect and Communicate" />
        <meta property="og:description" content="A modern chat application to connect with friends, family, and groups." />
        <meta property="og:type" content="website" />
      </head>
      <body className="min-h-screen bg-[#f0f2f5] hide-scrollbar ">
        <AuthProvider>
          <FilterProvider>
            <AuthGuard>{children}</AuthGuard>
          </FilterProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
