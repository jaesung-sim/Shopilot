// pages/index.tsx - 사용자 ID 및 채팅 상태 영속성 보장

import React, { useState, useRef, useEffect } from 'react';
import ChatBot from '@/components/ChatBot';
import MarketMap from '@/components/MarketMap';
import ROSLibRobotControl from '@/components/ROSLibRobotControl';
import { RouteData } from '@/interfaces/route';
import { IMemberMessage, UserType } from '@/interfaces/message';

interface HomePageProps {
  isROSLIBLoaded?: boolean;
}

const HomePage: React.FC<HomePageProps> = ({ isROSLIBLoaded = false }) => {
  const [routeData, setRouteData] = useState<RouteData | undefined>(undefined);
  const [robotPosition, setRobotPosition] = useState(undefined);
  const [activeTab, setActiveTab] = useState<'chat' | 'control'>('chat');
  const [nucIP, setNucIP] = useState('172.19.30.218');
  const [isIPModalOpen, setIsIPModalOpen] = useState(false);
  const [hasNewRoute, setHasNewRoute] = useState(false);

  // 영속적인 채팅 상태 관리
  const [persistentUserId, setPersistentUserId] = useState<string>('');
  const [persistentMessages, setPersistentMessages] = useState<
    IMemberMessage[]
  >([]);
  const [isChatInitialized, setIsChatInitialized] = useState(false);

  const chatBotRef = useRef<any>(null);

  // 초기화 시 사용자 ID 생성 및 웰컴 메시지 설정
  useEffect(() => {
    if (!isChatInitialized) {
      const newUserId = `user-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      setPersistentUserId(newUserId);

      // 초기 웰컴 메시지
      const welcomeMessage: IMemberMessage = {
        user_type: UserType.BOT,
        nick_name: 'Shopilot',
        message:
          '안녕하세요! 쇼핑파일럿입니다. 필요한 물품을 알려주시면 최적의 경로를 안내해드릴게요.\n\n예시: "과자, 라면, 우유, 햄, 신발 사고싶어"',
        send_date: new Date(),
      };

      setPersistentMessages([welcomeMessage]);
      setIsChatInitialized(true);

      console.log('🎯 HomePage: 영속적 사용자 ID 생성:', newUserId);
    }
  }, [isChatInitialized]);

  const handleRouteDataUpdate = (data: RouteData) => {
    console.log('경로 데이터 업데이트:', data);
    setRouteData(data);
    setHasNewRoute(true);
  };

  const handleRobotPositionUpdate = (position: any) => {
    setRobotPosition(position);
  };

  const handleTabChange = (tab: 'chat' | 'control') => {
    console.log('🔄 탭 변경:', activeTab, '->', tab);
    setActiveTab(tab);
    if (tab === 'control' && hasNewRoute) {
      setHasNewRoute(false);
    }
  };

  // 채팅 메시지 업데이트 핸들러
  const handleMessagesUpdate = (messages: IMemberMessage[]) => {
    setPersistentMessages(messages);
    console.log('💬 메시지 상태 업데이트:', messages.length, '개');
  };

  // 채팅 초기화 핸들러
  const handleChatReset = () => {
    const welcomeMessage: IMemberMessage = {
      user_type: UserType.BOT,
      nick_name: 'Shopilot',
      message: '채팅이 초기화되었습니다. 필요한 물품을 알려주세요!',
      send_date: new Date(),
    };
    setPersistentMessages([welcomeMessage]);
    console.log('🧹 채팅 초기화됨');
  };

  const checkROSLIBStatus = () => {
    return {
      propsLoaded: isROSLIBLoaded,
      windowExists: typeof window !== 'undefined',
      roslibExists: typeof window !== 'undefined' && !!(window as any).ROSLIB,
      version:
        typeof window !== 'undefined' && (window as any).ROSLIB
          ? (window as any).ROSLIB.version
          : null,
    };
  };

  const roslibStatus = checkROSLIBStatus();

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
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        roslibStatus.roslibExists
                          ? 'bg-green-500'
                          : roslibStatus.propsLoaded
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                    />
                    <span className="text-sm font-medium">
                      ROSLIB:{' '}
                      {roslibStatus.roslibExists
                        ? '준비됨'
                        : roslibStatus.propsLoaded
                        ? '로딩중'
                        : '대기'}
                    </span>
                  </div>
                  {roslibStatus.version && (
                    <span className="text-xs text-gray-500">
                      v{roslibStatus.version}
                    </span>
                  )}
                </div>
              </div>

              {/* 세션 정보 (개발 모드에서만) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                  <span className="text-xs text-blue-600">
                    세션: {persistentUserId.slice(-6)} | 메시지:{' '}
                    {persistentMessages.length}개
                  </span>
                </div>
              )}

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
            {/* ROSLIB 로드 상태 알림 */}
            {!roslibStatus.roslibExists && (
              <div
                className={`border rounded-lg p-4 mb-4 ${
                  roslibStatus.propsLoaded
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`animate-spin rounded-full h-5 w-5 border-b-2 ${
                      roslibStatus.propsLoaded
                        ? 'border-yellow-600'
                        : 'border-red-600'
                    }`}
                  ></div>
                  <div>
                    <div
                      className={`font-medium ${
                        roslibStatus.propsLoaded
                          ? 'text-yellow-800'
                          : 'text-red-800'
                      }`}
                    >
                      {roslibStatus.propsLoaded
                        ? '시스템 초기화 중'
                        : 'ROSLIB 로드 실패'}
                    </div>
                    <div
                      className={`text-sm ${
                        roslibStatus.propsLoaded
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {roslibStatus.propsLoaded
                        ? 'ROSLIB.js 로드 대기 중...'
                        : 'ROSLIB.js 스크립트 로드에 실패했습니다.'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 새 경로 알림 */}
            {hasNewRoute && activeTab === 'chat' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-800 font-medium">
                      새 쇼핑 경로가 준비되었습니다!
                    </span>
                  </div>
                  <button
                    onClick={() => handleTabChange('control')}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                  >
                    확인하기
                  </button>
                </div>
              </div>
            )}

            {/* 탭 네비게이션 */}
            <div className="bg-white rounded-t-lg border-b">
              <div className="flex">
                <button
                  onClick={() => handleTabChange('chat')}
                  className={`flex-1 py-3 px-4 text-sm font-medium rounded-tl-lg transition-colors ${
                    activeTab === 'chat'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  💬 쇼핑 어시스턴트
                  {activeTab !== 'chat' && persistentMessages.length > 1 && (
                    <span className="ml-1 text-xs opacity-75">
                      ({persistentMessages.length - 1})
                    </span>
                  )}
                </button>
                <button
                  onClick={() => handleTabChange('control')}
                  className={`flex-1 py-3 px-4 text-sm font-medium rounded-tr-lg transition-colors relative ${
                    activeTab === 'control'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  disabled={!roslibStatus.roslibExists}
                >
                  🤖 로봇 제어
                  {!roslibStatus.roslibExists && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></span>
                  )}
                  {hasNewRoute && roslibStatus.roslibExists && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                  )}
                </button>
              </div>
            </div>

            {/* 탭 콘텐츠 */}
            <div className="h-[70vh]">
              {activeTab === 'chat' ? (
                <div className="h-full bg-white rounded-b-lg">
                  {isChatInitialized && (
                    <ChatBot
                      ref={chatBotRef}
                      userId={persistentUserId}
                      initialMessages={persistentMessages}
                      onRouteDataUpdate={handleRouteDataUpdate}
                      onMessagesUpdate={handleMessagesUpdate}
                      onChatReset={handleChatReset}
                    />
                  )}
                </div>
              ) : (
                <div className="h-full">
                  <ROSLibRobotControl
                    routeData={routeData}
                    nucIP={nucIP}
                    isROSLIBLoaded={roslibStatus.propsLoaded}
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
                roslibStatus.roslibExists
                  ? 'bg-gradient-to-r from-green-50 to-green-100'
                  : roslibStatus.propsLoaded
                  ? 'bg-gradient-to-r from-yellow-50 to-yellow-100'
                  : 'bg-gradient-to-r from-red-50 to-red-100'
              }`}
            >
              <h3
                className={`font-semibold mb-2 ${
                  roslibStatus.roslibExists
                    ? 'text-green-800'
                    : roslibStatus.propsLoaded
                    ? 'text-yellow-800'
                    : 'text-red-800'
                }`}
              >
                {roslibStatus.roslibExists
                  ? '🟢 ROSLIB 준비됨'
                  : roslibStatus.propsLoaded
                  ? '🟡 ROSLIB 로딩중'
                  : '🔴 ROSLIB 로드 실패'}
              </h3>
              <div
                className={`text-sm ${
                  roslibStatus.roslibExists
                    ? 'text-green-700'
                    : roslibStatus.propsLoaded
                    ? 'text-yellow-700'
                    : 'text-red-700'
                }`}
              >
                <div>
                  • 스크립트:{' '}
                  {roslibStatus.propsLoaded ? '로드됨' : '로드 실패'}
                </div>
                <div>
                  • 객체: {roslibStatus.roslibExists ? '사용가능' : '대기중'}
                </div>
                <div>• 버전: {roslibStatus.version || 'Unknown'}</div>
                <div>• NUC: {nucIP}:9090</div>
              </div>
            </div>

            {/* 경로 상태 */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">📍 경로 상태</h3>
              <div className="text-sm text-blue-700">
                {routeData && routeData.route && routeData.items ? (
                  <>
                    <div>• 매대: {routeData.route.length}개</div>
                    <div>• 아이템: {routeData.items.length}개</div>
                    <div>
                      • 거리: {Math.round(routeData.total_distance / 10)}m
                    </div>
                  </>
                ) : routeData ? (
                  <>
                    <div>• 경로 데이터 로딩 중...</div>
                    <div className="text-xs text-gray-500">
                      route: {routeData.route ? '✅' : '❌'} | items:{' '}
                      {routeData.items ? '✅' : '❌'} | distance:{' '}
                      {routeData.total_distance || 0}
                    </div>
                  </>
                ) : (
                  <div>• 경로 설정 대기중</div>
                )}
              </div>
            </div>

            {/* 채팅 상태 */}
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800 mb-2">
                💬 채팅 상태
              </h3>
              <div className="text-sm text-purple-700">
                <div>• 메시지: {persistentMessages.length}개</div>
                <div>• 사용자 ID: {persistentUserId.slice(-6)}...</div>
                <div>• 상태: {isChatInitialized ? '활성' : '초기화중'}</div>
                <div>
                  • 현재 탭: {activeTab === 'chat' ? '채팅' : '로봇제어'}
                </div>
              </div>
            </div>

            {/* 시스템 상태 */}
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg">
              <h3 className="font-semibold text-orange-800 mb-2">⚡ 시스템</h3>
              <div className="text-sm text-orange-700">
                <div>• Vector DB: 활성</div>
                <div>• A* 알고리즘: 준비</div>
                <div>
                  • 웹소켓: {roslibStatus.roslibExists ? '준비됨' : '대기중'}
                </div>
                <div>• 로봇: {robotPosition ? '연결됨' : '대기중'}</div>
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
                placeholder="172.19.30.218"
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
            {roslibStatus.roslibExists && (
              <span className="text-green-600 ml-2">✅ 시스템 준비됨</span>
            )}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
