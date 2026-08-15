/**
 * The site's two faces, declared once.
 *
 * These were module-scoped consts inside layout.tsx, which meant the admin
 * layout could not reuse them without re-declaring the fonts — and two
 * next/font declarations of the same family produce two separate font files
 * and two sets of CSS variables. Exporting from here keeps it to one.
 *
 * Geist and Geist Mono, replacing Archivo and JetBrains Mono. Drawn as a pair
 * by one foundry, which is the whole point of the swap: the sans and the mono
 * share a skeleton, so a column of ids beside a paragraph of prose reads as
 * one system rather than two fonts that happen to share a page. Geist Mono is
 * also considerably softer than JetBrains Mono, so what stays monospace stops
 * looking like a terminal.
 *
 * Both are loaded as VARIABLE fonts — no `weight` array. Two families, two
 * files, every weight from 100 to 900. Listing weights would download a static
 * file per weight and silently round anything unlisted to the nearest one that
 * shipped, which is how the outgoing Archivo would have rendered every
 * paragraph bold.
 *
 * Note these are next/font/google, not next/font/local. The .woff files in
 * app/ are unrelated: they are read from disk by the OG image routes because
 * satori needs raw font bytes, and they are not wired to next/font at all.
 */
import { Geist, Geist_Mono } from "next/font/google";

export const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

/** Applied to <html> so the variables resolve at :root, where @theme reads them. */
export const fontVariables = `${geistSans.variable} ${geistMono.variable}`;
