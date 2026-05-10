import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})


export const metadata: Metadata = {
  title: "typedump | Free font collection – typography for designers",
  description: "Curated collection of 150+ professional free fonts including variable fonts, display fonts, and text fonts. Perfect for web design, branding, and creative projects. Browse by category, language support, and style. All fonts verified with proper licensing.",
  keywords: "free fonts, variable fonts, typography, font collection, web fonts, display fonts, design fonts, font download, professional fonts, curated fonts, open source fonts",
  metadataBase: new URL('https://typedump.vercel.app'),
  openGraph: {
    title: "typedump | Free font collection – typography for designers",
    description: "150+ curated professional free fonts for designers. Variable fonts, display fonts, multilingual support. Perfect for web design and branding.",
    url: "https://typedump.vercel.app",
    siteName: "typedump",
    images: [
      {
        url: "/og-image.webp",
        width: 1200,
        height: 630,
        alt: "typedump - Curated free font collection for professional designers",
        type: "image/webp",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "typedump | Free font collection – typography for designers",
    description: "150+ curated professional free fonts for designers. Variable fonts, display fonts, multilingual support.",
    images: ["/og-image.webp"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon-light.png", media: "(prefers-color-scheme: light)" },
      { url: "/favicon-dark.png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/apple-touch-icon.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-FL0K563LQ7"></script>
        <script dangerouslySetInnerHTML={{__html:`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-FL0K563LQ7');
        `}} />
        <script dangerouslySetInnerHTML={{__html:`(function(){
          fetch('/api/tags/vocab?type=appearance&collection=Text').then(r=>r.json()).then(d=>{window.__appearanceOrder__=window.__appearanceOrder__||{};window.__appearanceOrder__.Text=d.list||[]});
          fetch('/api/tags/vocab?type=appearance&collection=Display').then(r=>r.json()).then(d=>{window.__appearanceOrder__=window.__appearanceOrder__||{};window.__appearanceOrder__.Display=d.list||[]});
          fetch('/api/tags/vocab?type=appearance&collection=Weirdo').then(r=>r.json()).then(d=>{window.__appearanceOrder__=window.__appearanceOrder__||{};window.__appearanceOrder__.Weirdo=d.list||[]});
          fetch('/api/tags/vocab?type=category&collection=Text').then(r=>r.json()).then(d=>{window.__categoryOrder__=window.__categoryOrder__||{};window.__categoryOrder__.Text=d.list||[]});
          fetch('/api/tags/vocab?type=category&collection=Display').then(r=>r.json()).then(d=>{window.__categoryOrder__=window.__categoryOrder__||{};window.__categoryOrder__.Display=d.list||[]});
          fetch('/api/tags/vocab?type=category&collection=Weirdo').then(r=>r.json()).then(d=>{window.__categoryOrder__=window.__categoryOrder__||{};window.__categoryOrder__.Weirdo=d.list||[]});
        })();`}} />
        <link rel="stylesheet" href="/api/font-css" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300,0,0"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
