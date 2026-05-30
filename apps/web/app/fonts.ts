import { Newsreader, Tiro_Devanagari_Marathi } from 'next/font/google';

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
