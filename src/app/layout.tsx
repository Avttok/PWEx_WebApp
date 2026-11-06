import type { Metadata, Viewport } from "next";
import "@fontsource-variable/archivo/wdth.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { ProvedorTema, scriptTema } from "@/features/tema/tema";

export const metadata: Metadata = {
  title: "PW Express",
  description: "Coletas e entregas com rastreamento em tempo real",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08080a" },
    { media: "(prefers-color-scheme: light)", color: "#f6f2e9" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body>
        <ProvedorTema>{children}</ProvedorTema>
      </body>
    </html>
  );
}
