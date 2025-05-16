// pages/index.tsx
import { useState } from 'react';
import Head from 'next/head';
import ChatBot from '@/components/ChatBot';
import MarketMap from '@/components/MarketMap';
import { RouteData } from '@/interfaces/route';

export default function Home() {
  const [routeData, setRouteData] = useState<RouteData | undefined>(undefined);

  // 경로 데이터 업데이트 핸들러
  const handleRouteDataUpdate = (data: RouteData) => {
    console.log('경로 데이터 업데이트:', data);
    setRouteData(data);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Shopilot - 스마트 장보기 어시스턴트</title>
        <meta
          name="description"
          content="대형마트에서 최적의 쇼핑 경험을 위한 스마트 장보기 도우미"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto p-4">
        <h1 className="text-3xl font-bold text-center my-8">
          🛒 Shopilot - 스마트 장보기 어시스턴트
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-7xl mx-auto">
          {/* 왼쪽: 챗봇 */}
          <div className="h-[70vh]">
            <ChatBot onRouteDataUpdate={handleRouteDataUpdate} />
          </div>

          {/* 오른쪽: 지도 */}
          <div className="h-[70vh]">
            <MarketMap routeData={routeData} />
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-gray-500">
        <p>© Shopilot-2025 Capstone Project</p>
      </footer>
    </div>
  );
}
