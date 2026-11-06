import "./globals.css";
import SwRegister from "@/components/SwRegister";

export const metadata = {
  title: "Billy777 Customer Support",
  description: "24x7 live support chat",
  applicationName: "billy777",
  manifest: "/manifest.json",
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    title: "billy777",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/app/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
      { url: "/app/icon-512.png?v=2", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/app/icon-512.png?v=2", sizes: "180x180" }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#d63f12",
  colorScheme: "light",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              'window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__sgInstall=e;window.dispatchEvent(new Event("sg-install-ready"))});',
          }}
        />
      </head>
      <body>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
