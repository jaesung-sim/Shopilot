// pages/index.tsx - isROSLIBLoaded prop 사용

import React, { useState } from 'react';
import ChatBot from '@/components/ChatBot';
import MarketMap from '@/components/MarketMap';
import ROSLibRobotControl from '@/components/ROSLibRobotControl';
import { RouteData } from '@/interfaces/route';

interface HomePageProps {
  isROSLIBLoaded?: boolean; // _app.tsx에서 전달받는 prop
}

const HomePage: React.FC<HomePageProps> = ({ isROSLIBLoaded = false }) => {
  const [routeData, setRouteData] = useState<RouteData | undefined>(undefined);
  const [robotPosition, setRobotPosition] = useState(undefined);
  const [activeTab, setActiveTab] = useState<'chat' | 'control'>('chat');
  const [nucIP, setNucIP] = useState('192.168.0.100');
  const [isIPModalOpen, setIsIPModalOpen] = useState(false);

  const handleRouteDataUpdate = (data: RouteData) => {
    console.log('경로 데이터 업데이트:', data);
    setRouteData(data);
    setActiveTab('control'); // 경로 설정 시 로봇 제어 탭으로 전환
  };

  const handleRobotPositionUpdate = (position: any) => {
    setRobotPosition(position);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 헤더 */}
      <header className="bg-white shadow-lg border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-2xl">🛒</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Shopilot</h1>
                <p className="text-sm text-gray-600">
                  AI 기반 스마트 쇼핑 어시스턴트
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* ROSLIB 상태 표시 */}
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isROSLIBLoaded ? 'bg-green-500' : 'bg-yellow-500'
                  }`}
                />
                <span className="text-sm font-medium">
                  ROSLIB: {isROSLIBLoaded ? '준비됨' : '로딩중'}
                </span>
              </div>

              {/* NUC IP 설정 */}
              <button
                onClick={() => setIsIPModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
              >
                <span>🔧</span>
                <span>NUC: {nucIP}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {/* 좌측: 챗봇 또는 로봇 제어 */}
          <div className="xl:col-span-1">
            {/* ROSLIB가 로드되지 않았을 때 알림 */}
            {!isROSLIBLoaded && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
                  <div>
                    <div className="font-medium text-yellow-800">
                      시스템 초기화 중
                    </div>
                    <div className="text-sm text-yellow-600">
                      ROSLIB.js 로드 대기 중...
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 탭 네비게이션 */}
            <div className="bg-white rounded-t-lg border-b">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 py-3 px-4 text-sm font-medium rounded-tl-lg transition-colors ${
                    activeTab === 'chat'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  💬 쇼핑 어시스턴트
                </button>
                <button
                  onClick={() => setActiveTab('control')}
                  className={`flex-1 py-3 px-4 text-sm font-medium rounded-tr-lg transition-colors relative ${
                    activeTab === 'control'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  disabled={!isROSLIBLoaded} // ROSLIB 로드 전까지 비활성화
                >
                  🤖 로봇 제어
                  {!isROSLIBLoaded && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></span>
                  )}
                  {routeData && isROSLIBLoaded && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                  )}
                </button>
              </div>
            </div>

            {/* 탭 콘텐츠 */}
            <div className="h-[70vh]">
              {activeTab === 'chat' ? (
                <div className="h-full bg-white rounded-b-lg">
                  <ChatBot onRouteDataUpdate={handleRouteDataUpdate} />
                </div>
              ) : (
                <div className="h-full">
                  <ROSLibRobotControl
                    routeData={routeData}
                    nucIP={nucIP}
                    isROSLIBLoaded={isROSLIBLoaded} // prop 전달
                    onRobotPositionUpdate={handleRobotPositionUpdate}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 우측: 실시간 지도 */}
          <div className="xl:col-span-2">
            <div className="h-[70vh] bg-white rounded-lg shadow-lg">
              <MarketMap routeData={routeData} robotPosition={robotPosition} />
            </div>
          </div>
        </div>

        {/* 하단 상태 패널 */}
        <div className="mt-6 bg-white rounded-lg shadow-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* ROSLIB 상태 */}
            <div
              className={`p-4 rounded-lg ${
                isROSLIBLoaded
                  ? 'bg-gradient-to-r from-green-50 to-green-100'
                  : 'bg-gradient-to-r from-yellow-50 to-yellow-100'
              }`}
            >
              <h3
                className={`font-semibold mb-2 ${
                  isROSLIBLoaded ? 'text-green-800' : 'text-yellow-800'
                }`}
              >
                {isROSLIBLoaded ? '🟢 ROSLIB 준비됨' : '🟡 ROSLIB 로딩중'}
              </h3>
              <div
                className={`text-sm ${
                  isROSLIBLoaded ? 'text-green-700' : 'text-yellow-700'
                }`}
              >
                <div>• 라이브러리: {isROSLIBLoaded ? '로드됨' : '로딩중'}</div>
                <div>• 로봇 제어: {isROSLIBLoaded ? '사용가능' : '대기중'}</div>
                <div>• NUC IP: {nucIP}:9090</div>
              </div>
            </div>

            {/* 기존 상태 패널들... */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">📍 경로 상태</h3>
              <div className="text-sm text-blue-700">
                {routeData ? (
                  <>
                    <div>• 매대: {routeData.route.length}개</div>
                    <div>
                      • 거리: {Math.round(routeData.total_distance / 10)}m
                    </div>
                    <div>• 상태: 설정완료</div>
                  </>
                ) : (
                  <div>• 경로 설정 대기중</div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800 mb-2">
                🤖 로봇 상태
              </h3>
              <div className="text-sm text-purple-700">
                {robotPosition ? (
                  <>
                    <div>• 위치: 추적중</div>
                    <div>• 연결: 활성</div>
                    <div>• 상태: 정상</div>
                  </>
                ) : (
                  <div>• 로봇 연결 대기중</div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg">
              <h3 className="font-semibold text-orange-800 mb-2">⚡ 시스템</h3>
              <div className="text-sm text-orange-700">
                <div>• Vector DB: 활성</div>
                <div>• A* 알고리즘: 준비</div>
                <div>• 웹소켓: {isROSLIBLoaded ? '준비됨' : '대기중'}</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* NUC IP 설정 모달 */}
      {isIPModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4">🔧 NUC IP 주소 설정</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">IP 주소:</label>
              <input
                type="text"
                value={nucIP}
                onChange={(e) => setNucIP(e.target.value)}
                placeholder="192.168.0.100"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                Scout Mini가 연결된 NUC의 IP 주소를 입력하세요
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsIPModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                취소
              </button>
              <button
                onClick={() => setIsIPModalOpen(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                적용
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 푸터 */}
      <footer className="bg-white border-t mt-8 py-6">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p className="mb-2">© 2025 Shopilot - Capstone Project</p>
          <p className="text-sm">
            ROSLIB.js + Next.js + Scout Mini Integration
            {isROSLIBLoaded && (
              <span className="text-green-600 ml-2">✅ 시스템 준비됨</span>
            )}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
