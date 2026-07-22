import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { staticDb } from "@/lib/static-db"
import "./globals.css"
import "./catalog.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})


// Derived at build time so the count can never go stale again.
const FONT_COUNT = staticDb.getAllFamilies().length
const COUNT_LABEL = `${Math.floor(FONT_COUNT / 10) * 10}+`

export const metadata: Metadata = {
  title: `typedump | Free fonts to download – typography for designers`,
  description: `Download ${COUNT_LABEL} curated free fonts: variable, display, text, pixel and monospace typefaces for web design, branding and creative projects. Browse by category, style and language support. Every font is open-source, with its licence shown.`,
  keywords: "free fonts, free font download, download fonts, variable fonts, typography, font collection, web fonts, display fonts, design fonts, professional fonts, curated fonts, open source fonts",
  metadataBase: new URL('https://www.typedump.com'),
  alternates: { canonical: 'https://www.typedump.com' },
  verification: { google: 'UGauCsR9zcDBwNPf55d-aQuVtlyrfUnKb3h_ytciu-o' },
  openGraph: {
    title: `typedump | Free fonts to download – typography for designers`,
    description: `${COUNT_LABEL} curated free fonts for designers. Variable fonts, display fonts, multilingual support. Preview in the browser, check the licence, download.`,
    url: "https://www.typedump.com",
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
    title: `typedump | Free fonts to download – typography for designers`,
    description: `${COUNT_LABEL} curated free fonts for designers. Variable fonts, display fonts, multilingual support.`,
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
        <style dangerouslySetInnerHTML={{ __html:
          `@keyframes v2NavSlideTop{from{transform:translateX(-50%) translateY(-20px)}to{transform:translateX(-50%)}}` +
          `@keyframes v2NavSlideTopBtn{from{transform:translateY(-20px)}to{transform:none}}` +
          `@keyframes v2NavSlideBottom{from{transform:translateX(-50%) translateY(20px)}to{transform:translateX(-50%)}}` +
          `@keyframes v2FadeIn{from{opacity:0}to{opacity:1}}` +
          `@keyframes v2TextReveal{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`
        }} />
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'typedump',
            url: 'https://www.typedump.com',
            description: `Curated collection of ${COUNT_LABEL} free open-source fonts for designers: variable, display, text, monospace and pixel typefaces. Free to download, with the licence shown for every family.`,
            inLanguage: 'en',
            potentialAction: {
              '@type': 'SearchAction',
              target: { '@type': 'EntryPoint', urlTemplate: 'https://www.typedump.com/?q={search_term_string}' },
              'query-input': 'required name=search_term_string',
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Free fonts',
            url: 'https://www.typedump.com',
            isAccessibleForFree: true,
            about: { '@type': 'Thing', name: 'Free open-source typefaces' },
            // Every family is free. State it explicitly so answer engines can cite it.
            description: `${FONT_COUNT} free, open-source font families, each with its licence, styles, variable axes and language coverage.`,
          },
        ]) }} />
        <link rel="stylesheet" href="/fonts/fonts.css" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300,0,0"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
