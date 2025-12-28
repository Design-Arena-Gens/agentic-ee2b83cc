import "./globals.css";
import { Space_Grotesk } from "next/font/google";
import type { Metadata } from "next";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk"
});

export const metadata: Metadata = {
  title: "Génération de vidéo cinématographique",
  description:
    "Studio créatif pour générer facilement des vidéos cinématographiques dynamiques et exportables."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${spaceGrotesk.variable} font-sans bg-black text-slate-100`}>
        {children}
      </body>
    </html>
  );
}
