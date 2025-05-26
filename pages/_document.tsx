import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        {/* 메타 태그들 */}
        <meta name="description" content="AI 기반 스마트 쇼핑 어시스턴트 with Scout Mini" />
        <meta name="keywords" content="쇼핑, AI, 로봇, ROS2, Scout Mini" />
        <meta name="author" content="Shopilot Team" />
        
        {/* 파비콘 */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* 프리로드 (성능 최적화) */}
        <link rel="preconnect" href="https://static.robotwebtools.org" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}