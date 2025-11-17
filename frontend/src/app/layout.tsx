import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DreamPath - AI 진로 상담',
  description: 'AI와 함께하는 진로 탐색 및 분석',
  keywords: ['진로 상담', 'AI', '진로 분석', 'DreamPath'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&family=Cinzel:wght@400;600;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

