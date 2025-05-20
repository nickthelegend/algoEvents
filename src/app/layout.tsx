import { Inter } from "next/font/google"
import { SiteHeader } from "@/components/ui/header"
import "./globals.css"
import { cn } from "@/lib/utils"
import { Providers } from "./providers"
import type React from "react" // Added import for React

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Anton&family=Audiowide&display=swap" rel="stylesheet" />
      </head>
      <body className={cn(inter.className, "min-h-screen bg-black text-white antialiased")}>
        <Providers>
          <SiteHeader />
          <main className="pt-16">{children}</main>
        </Providers>
      </body>
    </html>
  )
}

