/**
 * The site's two faces, declared once.
 *
 * These were module-scoped consts inside layout.tsx, which meant the admin
 * layout could not reuse them without re-declaring the fonts — and two
 * next/font declarations of the same family produce two separate font files
 * and two sets of CSS variables. Exporting from here keeps it to one.
 *
 * Note these are next/font/google, not next/font/local. The .woff files in
 * app/ are unrelated: they are read from disk by the OG image routes because
 * satori needs raw font bytes, and they are not wired to next/font at all.
 */
import { Archivo, JetBrains_Mono } from "next/font/google";

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// Archivo carries headings only, and every heading in the design is 700.
// Loading the other three weights would ship ~90 KB nobody renders.
export const archivo = Archivo({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-archivo",
  display: "swap",
});

/** Applied to <html> so the variables resolve at :root, where @theme reads them. */
export const fontVariables = `${jetbrainsMono.variable} ${archivo.variable}`;
