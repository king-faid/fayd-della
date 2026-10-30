import './globals.css';

export const metadata = {
  title: 'SOP Sayang',
  description: 'Saling menjaga, bertumbuh bersama, menuju pernikahan'
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#c94f72'
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
