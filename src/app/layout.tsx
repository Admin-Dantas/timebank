"use client";

import { useEffect } from "react";
import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Dynamic Theme (Point 9): Night mode from 19:00 to 07:00
    const hour = new Date().getHours();
    if (hour >= 19 || hour < 7) {
      document.body.classList.add("theme-night");
    } else {
      document.body.classList.remove("theme-night");
    }
  }, []);

  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
