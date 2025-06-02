import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Script from 'next/script';
import { useState, useEffect } from 'react';

// AppProps 타입 확장 (isROSLIBLoaded prop 추가)
interface ExtendedAppProps extends AppProps {
  pageProps: AppProps['pageProps'] & {
    isROSLIBLoaded?: boolean;
  };
}

// 🔧 ROSLIB 로드 이벤트 타입 정의
interface ROSLIBLoadEvent extends CustomEvent {
  detail: {
    loaded: boolean;
    manual?: boolean;
    url?: string;
    version?: string;
  };
}

// 🔧 타입 안전한 ROSLIB 체크 함수
const checkROSLIBExists = (): boolean => {
  return typeof window !== 'undefined' && window.ROSLIB !== undefined;
};

// 🔧 타입 안전한 ROSLIB 버전 가져오기
const getROSLIBVersion = (): string => {
  if (checkROSLIBExists() && window.ROSLIB) {
    return window.ROSLIB.version || 'Unknown';
  }
  return 'Not Available';
};

export default function App({ Component, pageProps }: ExtendedAppProps) {
  const [isROSLIBLoaded, setIsROSLIBLoaded] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);

  // 클라이언트 사이드에서만 ROSLIB 확인
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 이미 로드되어 있는지 확인
    const checkExistingROSLIB = (): boolean => {
      if (checkROSLIBExists()) {
        console.log('✅ ROSLIB이 이미 로드되어 있습니다');
        setIsROSLIBLoaded(true);
        return true;
      }
      return false;
    };

    // 페이지 로드 시 즉시 확인
    if (checkExistingROSLIB()) return;

    // 주기적으로 확인 (로드 대기)
    const interval = setInterval(() => {
      if (checkExistingROSLIB()) {
        clearInterval(interval);
      }
    }, 100);

    // 5초 후에도 로드되지 않으면 수동 로드 시도
    const timeout = setTimeout(() => {
      if (!checkROSLIBExists()) {
        console.log('⚠️ ROSLIB 자동 로드 실패, 수동 로드 시도');
        loadROSLIBManually();
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  const loadROSLIBManually = (): void => {
    if (loadAttempts >= 3) {
      console.error('❌ ROSLIB 로드 시도 3회 실패');
      return;
    }

    setLoadAttempts((prev) => prev + 1);

    const urls = [
      'https://static.robotwebtools.org/roslibjs/current/roslib.min.js',
      'https://cdn.jsdelivr.net/npm/roslib@1/build/roslib.min.js',
      'https://unpkg.com/roslib@1/build/roslib.min.js',
    ];

    const tryLoadFromURL = (urlIndex: number): void => {
      if (urlIndex >= urls.length) {
        console.error('❌ 모든 ROSLIB URL 시도 실패');
        return;
      }

      const script = document.createElement('script');
      script.src = urls[urlIndex];
      script.async = true;

      script.onload = () => {
        console.log(`✅ ROSLIB.js 수동 로드 성공 (${urls[urlIndex]})`);
        setIsROSLIBLoaded(true);

        // 전역 이벤트 발생
        const event: ROSLIBLoadEvent = new CustomEvent('roslibLoaded', {
          detail: {
            loaded: true,
            manual: true,
            url: urls[urlIndex],
            version: getROSLIBVersion(),
          },
        });
        window.dispatchEvent(event);
      };

      script.onerror = (error: Event | string) => {
        console.error(`❌ ROSLIB 로드 실패: ${urls[urlIndex]}`, error);
        document.head.removeChild(script);
        tryLoadFromURL(urlIndex + 1);
      };

      document.head.appendChild(script);
    };

    tryLoadFromURL(0);
  };

  const handleROSLIBLoad = (): void => {
    console.log('✅ ROSLIB.js Script 태그 로드 완료');

    // 약간의 지연 후 확인 (스크립트 실행 시간 고려)
    setTimeout(() => {
      if (checkROSLIBExists()) {
        setIsROSLIBLoaded(true);
        console.log('✅ ROSLIB 객체 확인됨');

        // 전역 이벤트 발생
        const event: ROSLIBLoadEvent = new CustomEvent('roslibLoaded', {
          detail: {
            loaded: true,
            version: getROSLIBVersion(),
          },
        });
        window.dispatchEvent(event);
      } else {
        console.warn('⚠️ Script 로드되었으나 ROSLIB 객체가 없음');
        loadROSLIBManually();
      }
    }, 100);
  };

  const handleROSLIBError = (e: Event): void => {
    console.error('❌ ROSLIB.js Script 태그 로드 실패:', e);
    loadROSLIBManually();
  };

  return (
    <>
      {/* ROSLIB.js 로드 - 여러 방법 시도 */}
      <Script
        src="https://static.robotwebtools.org/roslibjs/current/roslib.min.js"
        strategy="afterInteractive"
        onLoad={handleROSLIBLoad}
        onError={handleROSLIBError}
      />

      {/* 개발 모드에서 상세한 로드 상태 표시 */}
      {process.env.NODE_ENV === 'development' && (
        <div
          style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            zIndex: 9999,
            background: isROSLIBLoaded ? '#10b981' : '#f59e0b',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold',
            minWidth: '120px',
            textAlign: 'center',
          }}
        >
          <div>ROSLIB: {isROSLIBLoaded ? '✅ 준비됨' : '⏳ 로딩중'}</div>
          {!isROSLIBLoaded && (
            <div style={{ fontSize: '10px', marginTop: '2px' }}>
              시도: {loadAttempts}/3
            </div>
          )}
          {isROSLIBLoaded && (
            <div style={{ fontSize: '10px', marginTop: '2px' }}>
              v{getROSLIBVersion()}
            </div>
          )}
        </div>
      )}

      {/* 메인 앱 컴포넌트 - isROSLIBLoaded prop 전달 */}
      <Component {...pageProps} isROSLIBLoaded={isROSLIBLoaded} />
    </>
  );
}
