import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Script from 'next/script';
import { useState } from 'react';

// AppProps 타입 확장 (isROSLIBLoaded prop 추가)
interface ExtendedAppProps extends AppProps {
  pageProps: AppProps['pageProps'] & {
    isROSLIBLoaded?: boolean;
  };
}

export default function App({ Component, pageProps }: ExtendedAppProps) {
  const [isROSLIBLoaded, setIsROSLIBLoaded] = useState(false);

  return (
    <>
      {/* ROSLIB.js 로드 */}
      <Script
        src="https://static.robotwebtools.org/roslibjs/current/roslib.min.js"
        strategy="beforeInteractive"
        onLoad={() => {
          console.log('✅ ROSLIB.js 로드 완료');
          setIsROSLIBLoaded(true);

          // 전역 이벤트 발생 (컴포넌트에서 감지 가능)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('roslibLoaded', {
                detail: {
                  loaded: true,
                  version: (window as any).ROSLIB?.version || 'Unknown',
                },
              }),
            );
          }
        }}
        onError={(e) => {
          console.error('❌ ROSLIB.js 로드 실패:', e);

          // 백업 CDN 시도
          const script = document.createElement('script');
          script.src =
            'https://cdn.jsdelivr.net/npm/roslib@1/build/roslib.min.js';

          script.onload = () => {
            console.log('✅ 백업 ROSLIB.js 로드 완료');
            setIsROSLIBLoaded(true);

            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('roslibLoaded', {
                  detail: { loaded: true, backup: true },
                }),
              );
            }
          };

          script.onerror = () => {
            console.error('❌ 백업 ROSLIB.js도 로드 실패');
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('roslibError', {
                  detail: { error: 'All ROSLIB sources failed' },
                }),
              );
            }
          };

          document.head.appendChild(script);
        }}
      />

      {/* 전역 스타일 및 ROSLIB 상태 표시 (개발 모드에서만) */}
      {process.env.NODE_ENV === 'development' && (
        <div
          style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            zIndex: 9999,
            background: isROSLIBLoaded ? '#10b981' : '#f59e0b',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          ROSLIB: {isROSLIBLoaded ? '✅' : '⏳'}
        </div>
      )}

      {/* 메인 앱 컴포넌트 - isROSLIBLoaded prop 전달 */}
      <Component {...pageProps} isROSLIBLoaded={isROSLIBLoaded} />
    </>
  );
}
