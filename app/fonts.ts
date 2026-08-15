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

/**
 * Archivo, as the variable font — every weight from one file.
 *
 * It was pinned to `weight: ["700"]` when it carried nothing but the two
 * uppercase display headings on the marketing site. That stopped being true
 * when it took over the console's prose: a family with only a 700 file does
 * not render body text at 400, it renders it at 700, because the browser
 * picks the nearest weight it has. Every paragraph would have come out bold.
 *
 * Omitting `weight` gives the variable font instead of a static instance, so
 * 400 body, 700 headings and the 800 the pagehead asks for all resolve from a
 * single request — smaller than the three static files it replaces.
 */
export const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

/** Applied to <html> so the variables resolve at :root, where @theme reads them. */
export const fontVariables = `${jetbrainsMono.variable} ${archivo.variable}`;
