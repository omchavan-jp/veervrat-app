import { Geist, Geist_Mono, Newsreader, Tiro_Devanagari_Marathi } from 'next/font/google';

export const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  display: 'swap',
});

export const tiroDevanagari = Tiro_Devanagari_Marathi({
  variable: '--font-tiro-devanagari',
  weight: '400',
  subsets: ['devanagari'],
  display: 'swap',
});
