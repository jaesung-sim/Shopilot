// components/SmartAutoRobotControl.tsx - 스마트 자동 모드 (테스트 버튼 제거)

import React, { useState, useEffect, useRef } from 'react';
import { RouteData } from '@/interfaces/route';
import { deduplicateRouteByLocation } from '@/lib/utils';
import {
  coordinateTransform,
  webToRos,
  addCalibrationPoint,
  loadPredefinedCalibrationPoints,
} from '@/lib/coordinateTransform';

interface ROSLibRobotControlProps {
  routeData?: RouteData;
  nucIP?: string;
  isROSLIBLoaded?: boolean;
  onRobotPositionUpdate?: (position: RobotPosition) => void;
}

interface RobotPosition {
  x: number;
  y: number;
  angle: number;
  timestamp: number;
  type: 'ros' | 'pixel';
  raw?: {
    original: ROSLIB.geometry_msgs.Point;
    transformed: { x: number; y: number };
  };
}

// ROSLIB 타입 체크 헬퍼
const isROSLIBAvailable = (): boolean => {
  return typeof window !== 'undefined' && window.ROSLIB !== undefined;
};

const getROSLIB = (): typeof ROSLIB | null => {
  if (typeof window !== 'undefined' && window.ROSLIB) {
    return window.ROSLIB;
  }
  return null;
};

const SmartAutoRobotControl: React.FC<ROSLibRobotControlProps> = ({
  routeData,
  nucIP = '172.19.17.21',
  isROSLIBLoaded = false,
  onRobotPositionUpdate,
}) => {
  const [isROSLIBReady, setIsROSLIBReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [robotPosition, setRobotPosition] = useState<RobotPosition | null>(
    null,
  );
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // 🔧 스마트 자동 모드 상태
  const [currentStoreIndex, setCurrentStoreIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
  const [autoModeActive, setAutoModeActive] = useState(false);
  const [navigationProgress, setNavigationProgress] = useState(0);

  // 좌표 변환 상태
  const [transformEnabled, setTransformEnabled] = useState(false);

  // refs
  const rosRef = useRef<ROSLIB.Ros | null>(null);
  const goalPublisherRef = useRef<ROSLIB.Topic | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoNavigationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 좌표 변환 상태 업데이트
  useEffect(() => {
    const params = coordinateTransform.getTransformParameters();
    setTransformEnabled(params.enabled);
  }, []);

  // ROSLIB 로드 상태 감지
  useEffect(() => {
    let checkInterval: NodeJS.Timeout;

    const checkROSLIB = (): boolean => {
      if (isROSLIBAvailable()) {
        console.log('✅ ROSLIB 객체 확인됨');
        setIsROSLIBReady(true);
        return true;
      }
      return false;
    };

    if (checkROSLIB()) return;

    if (isROSLIBLoaded) {
      checkInterval = setInterval(() => {
        if (checkROSLIB()) {
          clearInterval(checkInterval);
        }
      }, 50);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [isROSLIBLoaded]);

  // 자동 연결
  useEffect(() => {
    if (
      isROSLIBReady &&
      !isConnected &&
      !isConnecting &&
      connectionAttempts < 3
    ) {
      console.log('🔄 자동 ROS 연결 시도...');
      initializeROSConnection();
    }
  }, [isROSLIBReady, nucIP]);

  // 🔧 백그라운드 캘리브레이션 (UI 없음)
  useEffect(() => {
    if (
      isROSLIBReady &&
      coordinateTransform.getCalibrationPoints().length < 3
    ) {
      console.log('🔧 백그라운드 캘리브레이션 설정...');
      loadPredefinedCalibrationPoints();
    }
  }, [isROSLIBReady]);

  const initializeROSConnection = async (): Promise<void> => {
    const ROSLIB = getROSLIB();
    if (!isROSLIBReady || !ROSLIB) return;

    if (isConnecting) return;

    setIsConnecting(true);
    setConnectionAttempts((prev) => prev + 1);

    try {
      if (rosRef.current) {
        try {
          rosRef.current.close();
        } catch (error) {
          console.warn('기존 연결 정리 중 오류:', error);
        }
      }

      const rosUrl = `ws://${nucIP}:9090`;
      rosRef.current = new ROSLIB.Ros({ url: rosUrl });

      rosRef.current.on('connection', () => {
        console.log('✅ ROS2 연결 성공');
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionAttempts(0);
        setupROSTopics();
      });

      rosRef.current.on('error', (error: Error) => {
        console.error('❌ ROS2 연결 오류:', error);
        setIsConnected(false);
        setIsConnecting(false);
        if (connectionAttempts < 3) {
          scheduleReconnect();
        }
      });

      rosRef.current.on('close', () => {
        console.log('🔌 ROS2 연결 끊김');
        setIsConnected(false);
        setIsConnecting(false);
        if (connectionAttempts < 3) {
          scheduleReconnect();
        }
      });
    } catch (error) {
      console.error('ROS 초기화 오류:', error);
      setIsConnecting(false);
    }
  };

  const scheduleReconnect = (): void => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = Math.min(3000 * connectionAttempts, 10000);
    reconnectTimeoutRef.current = setTimeout(() => {
      if (!isConnected && connectionAttempts < 3) {
        initializeROSConnection();
      }
    }, delay);
  };

  const setupROSTopics = (): void => {
    const ROSLIB = getROSLIB();
    if (!rosRef.current || !ROSLIB) return;

    try {
      // 픽셀 좌표 토픽 구독 (로봇 위치 수신) - 변환 안함
      const pixelTopicSub = new ROSLIB.Topic({
        ros: rosRef.current,
        name: '/robot_pixel_position',
        messageType: 'geometry_msgs/Point',
      });

      pixelTopicSub.subscribe((message: ROSLIB.geometry_msgs.Point) => {
        console.log('📍 픽셀 좌표 수신:', message);

        const newPosition: RobotPosition = {
          x: message.x,
          y: message.y,
          angle: 0,
          timestamp: Date.now(),
          type: 'pixel',
          raw: {
            original: message,
            transformed: { x: message.x, y: message.y },
          },
        };

        setRobotPosition(newPosition);
        if (onRobotPositionUpdate) onRobotPositionUpdate(newPosition);
      });

      // 목표 좌표 퍼블리셔 설정
      goalPublisherRef.current = new ROSLIB.Topic({
        ros: rosRef.current,
        name: '/goal_position',
        messageType: 'geometry_msgs/Point',
      });

      console.log('✅ 토픽 설정 완료');
    } catch (error) {
      console.error('토픽 설정 오류:', error);
    }
  };

  // 🔧 좌표 변환을 적용한 목표 전송
  const sendSingleGoal = (
    webX: number,
    webY: number,
    description?: string,
  ): boolean => {
    const ROSLIB = getROSLIB();
    if (!rosRef.current || !goalPublisherRef.current || !ROSLIB) {
      return false;
    }

    try {
      const roundedX = Math.round(webX);
      const roundedY = Math.round(webY);

      const goalMessage = new ROSLIB.Message({
        x: roundedX,
        y: roundedY,
        z: 0.0,
      });

      goalPublisherRef.current.publish(goalMessage);

      console.log('🎯 목표 전송:', {
        description,
        coordinates: { x: roundedX, y: roundedY },
      });

      return true;
    } catch (error) {
      console.error('목표 전송 오류:', error);
      return false;
    }
  };

  // 🚀 스마트 자동 네비게이션
  const startSmartNavigation = (): void => {
    if (!routeData || !routeData.route || routeData.route.length === 0) {
      return;
    }

    const uniqueRoute = deduplicateRouteByLocation(routeData.route);

    if (currentStoreIndex >= uniqueRoute.length) {
      return;
    }

    const targetStore = uniqueRoute[currentStoreIndex];

    setAutoModeActive(true);
    setIsNavigating(true);

    const success = sendSingleGoal(
      targetStore.coordinates.x,
      targetStore.coordinates.y,
      `${targetStore.location} 최종 목적지지`,
    );
    

    if (success) {
      console.log(`🚀 ${targetStore.location}으로 이동 시작`);


      // 단일 목표이므로 즉시 완료
      setTimeout(() => {
        setIsNavigating(false);
        setAutoModeActive(false);
      }, 1000);
    }
  };

  // 🔄 자동 경로 진행
  const startAutoPathProgression = (
    pathPoints: any[],
    locationName: string,
  ): void => {
    let currentIndex = 0;

    const progressInterval = setInterval(() => {
      currentIndex++;

      if (currentIndex < pathPoints.length) {
        const nextPoint = pathPoints[currentIndex];
        sendSingleGoal(nextPoint.x, nextPoint.y, `${locationName} 진행`);

        setCurrentPathIndex(currentIndex);
        setNavigationProgress((currentIndex / pathPoints.length) * 100);
      } else {
        // 경로 완료
        clearInterval(progressInterval);
        setIsNavigating(false);
        setAutoModeActive(false);
        setNavigationProgress(100);
        console.log(`✅ ${locationName} 도착 완료`);
      }
    }, 3000); // 3초마다 다음 포인트로 이동

    autoNavigationIntervalRef.current = progressInterval;
  };

  // ⏹️ 긴급 정지
  const emergencyStop = (): void => {
    const ROSLIB = getROSLIB();
    if (!rosRef.current || !ROSLIB) return;

    try {
      // 자동 진행 중단
      if (autoNavigationIntervalRef.current) {
        clearInterval(autoNavigationIntervalRef.current);
        autoNavigationIntervalRef.current = null;
      }

      // 로봇 정지 명령
      const cmdVel = new ROSLIB.Topic({
        ros: rosRef.current,
        name: '/cmd_vel',
        messageType: 'geometry_msgs/Twist',
      });

      const stopTwist = new ROSLIB.Message({
        linear: { x: 0.0, y: 0.0, z: 0.0 },
        angular: { x: 0.0, y: 0.0, z: 0.0 },
      });

      cmdVel.publish(stopTwist);

      setIsNavigating(false);
      setAutoModeActive(false);
      setCurrentPathIndex(0);
      setNavigationProgress(0);

      console.log('🛑 긴급 정지 실행');
    } catch (error) {
      console.error('정지 명령 오류:', error);
    }
  };

  // ✅ 매대 완료
  const completeCurrentStore = (): void => {
    if (!routeData || !routeData.route) return;

    const uniqueRoute = deduplicateRouteByLocation(routeData.route);

    if (currentStoreIndex < uniqueRoute.length) {
      setCurrentStoreIndex((prev) => prev + 1);
      setCurrentPathIndex(0);
      setNavigationProgress(0);
      setIsNavigating(false);
      setAutoModeActive(false);

      console.log(`✅ ${uniqueRoute[currentStoreIndex].location} 완료`);
    }
  };

  // 경로 초기화
  const resetNavigation = (): void => {
    if (autoNavigationIntervalRef.current) {
      clearInterval(autoNavigationIntervalRef.current);
    }

    setCurrentStoreIndex(0);
    setCurrentPathIndex(0);
    setNavigationProgress(0);
    setIsNavigating(false);
    setAutoModeActive(false);
  };

  // 현재 경로 정보
  const uniqueRoute = routeData?.route
    ? deduplicateRouteByLocation(routeData.route)
    : [];
  const currentStore =
    currentStoreIndex < uniqueRoute.length
      ? uniqueRoute[currentStoreIndex]
      : null;
  const totalPoints = currentStore?.pathPoints?.length || 1;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-base">🤖 Shopilot 제어</h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div
                className={`w-3 h-3 rounded-full ${
                  isROSLIBReady ? 'bg-green-400' : 'bg-yellow-400'
                }`}
              />
              <span>ROSLIB: {isROSLIBReady ? '준비됨' : '로딩중'}</span>
            </div>
            <div className="flex items-center gap-1">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected
                    ? 'bg-green-400'
                    : isConnecting
                    ? 'bg-yellow-400'
                    : 'bg-red-400'
                }`}
              />
              <span>
                ROS2:{' '}
                {isConnected ? '연결됨' : isConnecting ? '연결중' : '끊김'}
              </span>
            </div>
            {robotPosition && <div className="flex items-center gap-1"></div>}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-1">
        {/* 🎯 스마트 자동 모드 제어 */}
        {uniqueRoute.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-3">
              🗺️ 스마트 자동 네비게이션 ({currentStoreIndex + 1}/
              {uniqueRoute.length})
            </h4>

            {/* 현재 목표 매대 정보 */}
            {currentStore && (
              <div className="bg-white rounded p-3 mb-3 border">
                <div className="font-medium text-gray-800 mb-2">
                  📍 목표: {currentStore.location}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  물품: {currentStore.item}
                </div>

                {/* 진행률 표시 */}
                {isNavigating && autoModeActive && (
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>
                        진행률: {currentPathIndex + 1}/{totalPoints}
                      </span>
                      <span>{Math.round(navigationProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${navigationProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 제어 버튼들 */}
            <div className="grid grid-cols-1 gap-3">
              {/* 메인 네비게이션 버튼 */}
              <button
                onClick={startSmartNavigation}
                disabled={
                  !isConnected ||
                  isNavigating ||
                  currentStoreIndex >= uniqueRoute.length
                }
                className={`py-4 px-4 rounded-lg font-semibold text-white transition-colors ${
                  !isConnected || currentStoreIndex >= uniqueRoute.length
                    ? 'bg-gray-400 cursor-not-allowed'
                    : isNavigating
                    ? 'bg-orange-500 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {currentStoreIndex >= uniqueRoute.length
                  ? '🎉 모든 매대 완료!'
                  : isNavigating && autoModeActive
                  ? `🔄 이동 중... (${currentPathIndex + 1}/${totalPoints})`
                  : `🚀 ${currentStore?.location}으로 이동`}
              </button>

              {/* 하단 제어 버튼들 */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={emergencyStop}
                  disabled={!isConnected}
                  className={`py-2 px-3 rounded-lg font-semibold text-white transition-colors ${
                    !isConnected
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  ⏹️ 정지
                </button>

                <button
                  onClick={completeCurrentStore}
                  disabled={currentStoreIndex >= uniqueRoute.length}
                  className={`py-2 px-3 rounded-lg font-semibold text-white transition-colors ${
                    currentStoreIndex >= uniqueRoute.length
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-indigo-500 hover:bg-indigo-600'
                  }`}
                >
                  ✅ 매대 완료
                </button>

                <button
                  onClick={resetNavigation}
                  disabled={!isConnected}
                  className={`py-2 px-3 rounded-lg font-semibold text-white transition-colors ${
                    !isConnected
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gray-500 hover:bg-gray-600'
                  }`}
                >
                  🔄 초기화
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 로봇 위치 정보 (간소화) */}
        {robotPosition && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <h4 className="font-semibold mb-2 text-sm">📍 로봇 위치</h4>
            <div className="text-sm space-y-1">
              <div className="font-mono">
                위치: ({robotPosition.x.toFixed(1)},{' '}
                {robotPosition.y.toFixed(1)})
              </div>
              <div className="text-gray-500 text-xs">
                업데이트:{' '}
                {new Date(robotPosition.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}

        {/* 간소화된 시스템 상태 */}
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-3">
          <h4 className="font-semibold text-sm mb-2">🔧 연결 상태</h4>
          <div className="text-xs space-y-1">
            <div>
              ROSLIB: {isROSLIBReady ? '✅' : '❌'} | ROS2:{' '}
              {isConnected ? '✅' : '❌'}
            </div>
            <div>
              매대: {currentStoreIndex + 1}/{uniqueRoute.length} | 변환:{' '}
              {transformEnabled ? '✅' : '❌'}
            </div>
            <div>NUC: {nucIP}:9090</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartAutoRobotControl;
