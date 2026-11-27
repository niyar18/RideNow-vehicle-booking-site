import { auth } from "@/auth";
import type { Metadata, Viewport } from "next";
import { Inter, DM_Serif_Display, Outfit } from "next/font/google";
import "./globals.css";
import StoreProvider from "@/redux/StoreProvider";
import InitUser from "@/initUser";
import Provider from "@/Provider";
import PhoneLinkModal from "@/features/auth/components/PhoneLinkModal";
import CookieConsent from "@/shared/components/CookieConsent";
import MobileBottomNav from "@/shared/components/MobileBottomNav";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import SplashScreen from "@/shared/components/SplashScreen";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f8f6" },
    { media: "(prefers-color-scheme: dark)", color: "#101c30" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://ridenow-vehicle-booking-site.vercel.app"),
  title: {
    default: "Jaatri (যাত্ৰী) - Smart Vehicle Booking Platform",
    template: "%s | Jaatri",
  },
  description:
    "Jaatri (যাত্ৰী) is a modern vehicle booking platform for reliable, transparent, and verified rides across India. Fast dispatch, upfront pricing, and safety-first mobility.",
  keywords: [
    "Jaatri",
    "যাত্ৰী",
    "cab booking",
    "auto rickshaw",
    "bike taxi",
    "goods delivery",
    "vehicle booking India",
    "smart cab platform",
    "RideNow",
  ],
  authors: [{ name: "Jaatri Mobility Technologies" }],
  creator: "Jaatri",
  publisher: "Jaatri",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/logojatri.png", type: "image/png" },
      { url: "/logojatri.webp", type: "image/webp" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/logojatri.png",
    apple: "/logojatri.png",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://ridenow-vehicle-booking-site.vercel.app",
    siteName: "Jaatri",
    title: "Jaatri (যাত্ৰী) - Smart Vehicle Booking Platform",
    description:
      "Reliable, upfront pricing with instant dispatch for bikes, autos, cabs, and logistics.",
    images: [
      {
        url: "/logojatri.png",
        width: 800,
        height: 400,
        alt: "Jaatri Smart Vehicle Booking",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Jaatri (যাত্ৰী) - Smart Vehicle Booking Platform",
    description:
      "Reliable, upfront pricing with instant dispatch for bikes, autos, cabs, and logistics.",
    images: ["/logojatri.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "googlee620573e04cfbb4e",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TransportationService",
    name: "Jaatri (যাত্ৰী)",
    alternateName: "RideNow",
    url: "https://ridenow-vehicle-booking-site.vercel.app",
    logo: "https://ridenow-vehicle-booking-site.vercel.app/logojatri.png",
    description: "Smart vehicle booking and transparent on-demand transportation platform.",
    areaServed: "IN",
    serviceType: ["Cab Booking", "Auto Rickshaw", "Bike Taxi", "Logistics Delivery"],
  };

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${dmSerifDisplay.variable} ${outfit.variable}`}
    >
      <head>
        {/* Preload Critical Hero and Branding WebP Images for Instant Rendering */}
        <link rel="preload" as="image" href="/logojatri.webp" media="(prefers-color-scheme: light)" type="image/webp" />
        <link rel="preload" as="image" href="/logojatri-dark.webp" media="(prefers-color-scheme: dark)" type="image/webp" />

        {/* Instant Theme Resolver & Zero-FOUC Initialization */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = null;
                  try {
                    stored = localStorage.getItem('ridenow_theme');
                  } catch(e) {}
                  if (!stored) {
                    var m = document.cookie.match(/(?:^|;\\s*)ridenow_theme=([^;]+)/);
                    if (m) stored = decodeURIComponent(m[1]);
                  }
                  var systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = stored === 'dark' || ((!stored || stored === 'system') && systemDark);
                  var root = document.documentElement;
                  if (isDark) {
                    root.classList.add('dark');
                    root.classList.remove('light');
                    root.style.colorScheme = 'dark';
                    root.style.backgroundColor = '#101c30';
                  } else {
                    root.classList.remove('dark');
                    root.classList.add('light');
                    root.style.colorScheme = 'light';
                    root.style.backgroundColor = '#f3f8f6';
                  }

                  // Zero-delay splash screen resolver: hide instantly if already seen in this session
                  var splashSeen = false;
                  try {
                    splashSeen = sessionStorage.getItem('jaatri_splash_seen') === 'true';
                  } catch(e) {}
                  if (splashSeen) {
                    root.classList.add('splash-hidden');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        {/* Critical Instant Splash Screen Styles - Pre-paint full-screen protection */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html.splash-hidden #jaatri-splash-screen {
                display: none !important;
              }
              #jaatri-splash-screen {
                position: fixed;
                inset: 0;
                width: 100vw;
                height: 100vh;
                height: 100dvh;
                z-index: 999999;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                background-color: #f3f8f6;
                user-select: none;
              }
              html.dark #jaatri-splash-screen {
                background-color: #101c30;
              }
              @media (prefers-color-scheme: dark) {
                html:not(.light) #jaatri-splash-screen {
                  background-color: #101c30;
                }
              }
              html:not(.splash-hidden) body {
                overflow: hidden !important;
              }
              html.dark #jaatri-splash-screen .splash-logo-light {
                display: none !important;
              }
              html.dark #jaatri-splash-screen .splash-logo-dark {
                display: block !important;
              }
              html:not(.dark) #jaatri-splash-screen .splash-logo-light {
                display: block !important;
              }
              html:not(.dark) #jaatri-splash-screen .splash-logo-dark {
                display: none !important;
              }
              @media (prefers-color-scheme: dark) {
                html:not(.light):not(.dark) #jaatri-splash-screen .splash-logo-light {
                  display: none !important;
                }
                html:not(.light):not(.dark) #jaatri-splash-screen .splash-logo-dark {
                  display: block !important;
                }
              }
            `,
          }}
        />
        <noscript>
          <style
            dangerouslySetInnerHTML={{
              __html: `
                #jaatri-splash-screen { display: none !important; }
                html body { overflow: auto !important; }
              `,
            }}
          />
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased bg-[var(--background)] text-[var(--text-primary)] w-full min-h-screen font-sans flex flex-col">
        <a className="jaatri-skip-link" href="#main-content">Skip to content</a>
        <SplashScreen />
        <Provider session={session}>
          <ThemeProvider>
            <LanguageProvider>
              <StoreProvider>
                <InitUser />
                <PhoneLinkModal />
                <CookieConsent />
                <div id="main-content" tabIndex={-1} className="flex-1 w-full flex flex-col">
                  {children}
                </div>
                <MobileBottomNav />
              </StoreProvider>
            </LanguageProvider>
          </ThemeProvider>
        </Provider>
      </body>
    </html>
  );
}
