import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const serif = Playfair_Display({ subsets: ['latin'], weight: ['600', '700'], style: ['normal', 'italic'], variable: '--font-serif' });
const sans = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-sans' });

export const metadata = {
  title: 'SOP Sayang',
  description: 'Saling menjaga, bertumbuh bersama, menuju pernikahan',
  appleWebApp: { capable: true, title: 'SOP Sayang', statusBarStyle: 'default' }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#b8406a'
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
