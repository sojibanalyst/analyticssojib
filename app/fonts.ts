/**
 * The site's three faces, declared once.
 *
 * Exported from here rather than declared in a layout, because two next/font
 * declarations of the same family produce two separate font files and two sets
 * of CSS variables. The admin layout reuses these.
 *
 *   Space Grotesk   headings
 *   Inter           everything a person reads
 *   JetBrains Mono  event names, stats, ids and the small uppercase labels
 *
 * Inter and JetBrains Mono are loaded as VARIABLE fonts, with no `weight`
 * array: one file per family carries every weight, and both are used at
 * several. Listing weights would download a static file per weight and
 * silently round anything unlisted to the nearest one that shipped.
 *
 * Space Grotesk is the exception, and on purpose. Headings are set at 700 and
 * nothing else, so it loads that one static weight: 13 kB against 23 kB for
 * the variable file, on the font that sets the first screen's largest text.
 * If a heading is ever set lighter, add the weight here; an unlisted one would
 * be faked by the browser.
 *
 * next/font downloads the files at build time and serves them from this
 * origin, so nothing is requested from Google by a visitor's browser.
 *
 * Inter and Space Grotesk are preloaded: one sets the body copy, the other the
 * hero headline, which is the largest thing painted on the first screen. The
 * mono face is not. It only ever sets small labels, where a late swap costs
 * nothing measurable, and a third preload would sit ahead of the page.
 *
 * The .ttf files in app/ are unrelated: they are read from disk by the OG image
 * routes because satori needs raw font bytes, and are not wired to next/font.
 */
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";

export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-space-grotesk",
  display: "swap",
  preload: true,
});

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
});

/** Applied to <html> so the variables resolve at :root, where @theme reads them. */
export const fontVariables = `${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`;
