// components/ROSLibRobotControl.tsx - 팀원 요청사항 반영 + 서비스 방식 + 변환 적용 가능

import React, { useState, useEffect, useRef } from 'react';
import { RouteData } from '@/interfaces/route';
import { deduplicateRouteByLocation } from '@/lib/utils';

interface ROSLibRobotControlProps {
  routeData?: RouteData;
  nucIP?: string;
  isROSLIBLoaded?: boolean;
  onRobotPositionUpdate?: (position: any) => void;
}

interface RobotPosition {
  x: number;
  y: number;
  angle: number;
  timestamp: number;
  type: 'ros' | 'pixel';
  raw?: any; // 원본 데이터 저장
}

// 🔧 좌표 변환 파라미터 인터페이스 (나중에 적용 가능)
interface TransformParameters {
  translation: { x: number; y: number };
  rotation: number; // 라디안
  scale: { x: number; y: number };
  enabled: boolean; // 변환 활성화 여부
}

const ROSLibRobotControl: React.FC<ROSLibRobotControlProps> = ({
  routeData,
  nucIP = '172.19.30.218',
  isROSLIBLoaded = false,
  onRobotPositionUpdate,
}) => {
  const [isROSLIBReady, setIsROSLIBReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [robotPosition, setRobotPosition] = useState<RobotPosition | null>(
    null,
  );
  const [notifications, setNotifications] = useState<string[]>([]);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // 경로 실행 관련 상태
  const [isExecutingRoute, setIsExecutingRoute] = useState(false);
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);

  const rosRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isExecutingRef = useRef<boolean>(false); // 실행 상태 ref

  // 🔧 좌표 변환 파라미터 (나중에 설정 가능)
  const [transformParams, setTransformParams] = useState<TransformParameters>({
    translation: { x: 0, y: 0 },
    rotation: 0,
    scale: { x: 1, y: 1 },
    enabled: false, // 기본적으로 비활성화
  });

  // 🔧 좌표 변환 함수들
  const applyTransform = (webX: number, webY: number) => {
    if (!transformParams.enabled) {
      return { x: webX, y: webY }; // 변환 비활성화 시 원본 반환
    }

    const { translation, rotation, scale } = transformParams;

    // 회전 적용
    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);

    const rotatedX = webX * cosR - webY * sinR;
    const rotatedY = webX * sinR + webY * cosR;

    // 스케일링 및 이동
    const transformedX = rotatedX * scale.x + translation.x;
    const transformedY = rotatedY * scale.y + translation.y;

    return { x: transformedX, y: transformedY };
  };

  const reverseTransform = (rosX: number, rosY: number) => {
    if (!transformParams.enabled) {
      return { x: rosX, y: rosY }; // 변환 비활성화 시 원본 반환
    }

    const { translation, rotation, scale } = transformParams;

    // 이동 및 스케일링 역변환
    const scaledX = (rosX - translation.x) / scale.x;
    const scaledY = (rosY - translation.y) / scale.y;

    // 회전 역변환
    const cosR = Math.cos(-rotation);
    const sinR = Math.sin(-rotation);

    const webX = scaledX * cosR - scaledY * sinR;
    const webY = scaledX * sinR + scaledY * cosR;

    return { x: webX, y: webY };
  };

  // 🔧 변환 파라미터 설정 함수 (외부에서 호출 가능)
  const setCoordinateTransform = (params: Partial<TransformParameters>) => {
    setTransformParams((prev) => ({ ...prev, ...params }));
    addNotification(
      `좌표 변환 업데이트: ${params.enabled ? '활성화' : '비활성화'}`,
    );
  };

  // ROSLIB 로드 상태 감지
  useEffect(() => {
    let checkInterval: NodeJS.Timeout;

    const checkROSLIB = () => {
      if (typeof window !== 'undefined' && (window as any).ROSLIB) {
        console.log('✅ ROSLIB 객체 확인됨');
        setIsROSLIBReady(true);
        addNotification('ROSLIB.js 준비 완료');
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

  // ROSLIB가 준비되면 자동으로 연결 시도
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

  const addNotification = (message: string) => {
    console.log('📢', message);
    setNotifications((prev) => {
      const newNotifications = [
        ...prev,
        `${new Date().toLocaleTimeString()}: ${message}`,
      ];
      return newNotifications.slice(-5);
    });

    setTimeout(() => {
      setNotifications((prev) => prev.slice(1));
    }, 5000);
  };

  const initializeROSConnection = async () => {
    if (!isROSLIBReady || !(window as any).ROSLIB) {
      addNotification('ROSLIB가 준비되지 않았습니다');
      return;
    }

    if (isConnecting) return;

    setIsConnecting(true);
    setConnectionAttempts((prev) => prev + 1);

    try {
      const ROSLIB = (window as any).ROSLIB;

      if (rosRef.current) {
        try {
          rosRef.current.close();
        } catch (error) {
          console.warn('기존 연결 정리 중 오류:', error);
        }
      }

      const rosUrl = `ws://${nucIP}:9090`;
      addNotification(`ROS 연결 시도: ${rosUrl}`);

      rosRef.current = new ROSLIB.Ros({ url: rosUrl });

      rosRef.current.on('connection', () => {
        console.log('✅ ROS2 연결 성공');
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionAttempts(0);
        addNotification('ROS2 연결 성공!');
        setupROSTopics();
      });

      rosRef.current.on('error', (error: any) => {
        console.error('❌ ROS2 연결 오류:', error);
        setIsConnected(false);
        setIsConnecting(false);
        addNotification(`ROS2 연결 오류: ${error?.message || 'Unknown error'}`);

        if (connectionAttempts < 3) {
          scheduleReconnect();
        }
      });

      rosRef.current.on('close', () => {
        console.log('🔌 ROS2 연결 끊김');
        setIsConnected(false);
        setIsConnecting(false);
        addNotification('ROS2 연결 끊김');

        if (connectionAttempts < 3) {
          scheduleReconnect();
        }
      });
    } catch (error) {
      console.error('ROS 초기화 오류:', error);
      setIsConnecting(false);
      addNotification(`ROS 초기화 실패: ${error}`);
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = Math.min(3000 * connectionAttempts, 10000);
    addNotification(
      `${delay / 1000}초 후 재연결 시도... (${connectionAttempts}/3)`,
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      if (!isConnected && connectionAttempts < 3) {
        initializeROSConnection();
      }
    }, delay);
  };

  const setupROSTopics = () => {
    if (!rosRef.current || !(window as any).ROSLIB) return;

    const ROSLIB = (window as any).ROSLIB;

    try {
      // 🔧 픽셀 좌표 토픽 구독 (역변환 적용 가능)
      const pixelTopicSub = new ROSLIB.Topic({
        ros: rosRef.current,
        name: '/robot_pixel_position',
        messageType: 'geometry_msgs/Point',
      });

      pixelTopicSub.subscribe((message: any) => {
        console.log('📍 픽셀 좌표 수신:', message);

        // 🔧 역변환 적용 (활성화 시에만)
        const webCoords = reverseTransform(message.x, message.y);

        const newPosition: RobotPosition = {
          x: webCoords.x,
          y: webCoords.y,
          angle: 0, // pixel 기준이면 방향은 아직 없을 수도 있음
          timestamp: Date.now(),
          type: 'pixel',
          raw: { original: message, transformed: webCoords },
        };

        setRobotPosition(newPosition);
        if (onRobotPositionUpdate) onRobotPositionUpdate(newPosition);

        if (transformParams.enabled) {
          addNotification(
            `위치 수신: ROS(${message.x}, ${
              message.y
            }) → 웹(${webCoords.x.toFixed(1)}, ${webCoords.y.toFixed(1)})`,
          );
        } else {
          addNotification(`픽셀 위치 수신: (${message.x}, ${message.y})`);
        }
      });

      addNotification('픽셀 위치 토픽 구독 완료');
    } catch (error) {
      console.error('픽셀 토픽 설정 오류:', error);
      addNotification(`픽셀 토픽 설정 실패: ${error}`);
    }
  };

  // 🚀 팀원이 요청한 경로 서비스 (수정됨)
  const sendRouteViaService = (
    waypoints: { x: number; y: number }[],
    description?: string,
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!rosRef.current || !(window as any).ROSLIB) {
        addNotification('ROS 연결이 필요합니다');
        resolve(false);
        return;
      }

      const ROSLIB = (window as any).ROSLIB;

      try {
        // 🔧 좌표 변환 적용
        const transformedWaypoints = waypoints.map((point) => {
          const transformed = applyTransform(point.x, point.y);
          return {
            position: { x: transformed.x, y: transformed.y, z: 0.0 },
            orientation: { x: 0, y: 0, z: 0, w: 1 },
          };
        });

        const service = new ROSLIB.Service({
          ros: rosRef.current,
          name: '/route_plan',
          serviceType: 'route_service_pkg/srv/RoutePlan',
        });

        const request = new ROSLIB.ServiceRequest({
          waypoints: transformedWaypoints,
        });

        addNotification(
          `🚀 경로 서비스 호출: ${description || `${waypoints.length}개 지점`}`,
        );

        service.callService(request, (result: any) => {
          console.log('🛰️ 서비스 응답:', result);
          if (result && result.success) {
            addNotification('✅ 경로 전송 성공: ' + (description || ''));
            resolve(true);
          } else {
            addNotification(
              '❌ 경로 전송 실패: ' + (result?.message || 'Unknown error'),
            );
            resolve(false);
          }
        });
      } catch (error) {
        console.error('경로 서비스 호출 오류:', error);
        addNotification(`❌ 경로 서비스 실패: ${error}`);
        resolve(false);
      }
    });
  };

  // 🔧 단일 지점 이동 함수 (누락된 sendGoal 대체)
  const sendSingleGoal = (
    x: number,
    y: number,
    description?: string,
  ): Promise<boolean> => {
    return sendRouteViaService([{ x, y }], description);
  };

  const stopRobot = () => {
    if (!rosRef.current || !(window as any).ROSLIB) {
      addNotification('ROS 연결이 필요합니다');
      return;
    }

    const ROSLIB = (window as any).ROSLIB;

    try {
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
      addNotification('정지 명령 전송');

      // 🔧 경로 실행 중단 (ref 업데이트)
      if (isExecutingRoute) {
        isExecutingRef.current = false;
        setIsExecutingRoute(false);
        addNotification('경로 실행 중단됨');
      }
    } catch (error) {
      console.error('정지 명령 오류:', error);
      addNotification(`정지 명령 실패: ${error}`);
    }
  };

  // 🚀 전체 경로 실행 (서비스 방식)
  const executeFullRoute = async () => {
    if (!routeData || !routeData.route || routeData.route.length === 0) {
      addNotification('실행할 경로가 없습니다');
      return;
    }

    const uniqueRoute = deduplicateRouteByLocation(routeData.route);

    // 전체 경로를 한 번에 서비스로 전송
    const waypoints = uniqueRoute.map((target) => ({
      x: target.coordinates.x,
      y: target.coordinates.y,
    }));

    isExecutingRef.current = true;
    setIsExecutingRoute(true);
    setCurrentTargetIndex(0);

    const success = await sendRouteViaService(
      waypoints,
      `${uniqueRoute.length}개 매대 경로`,
    );

    if (success) {
      addNotification(`✅ 경로 실행 시작: ${uniqueRoute.length}개 매대`);
    } else {
      addNotification(`❌ 경로 실행 실패`);
      setIsExecutingRoute(false);
      isExecutingRef.current = false;
    }
  };

  const forceReconnect = () => {
    setConnectionAttempts(0);
    setIsConnecting(false);
    setIsConnected(false);

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    initializeROSConnection();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg">🤖 Scout Mini 제어</h3>
          <div className="flex items-center gap-4 text-sm">
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
            <div className="flex items-center gap-1">
              <div
                className={`w-3 h-3 rounded-full ${
                  transformParams.enabled ? 'bg-blue-400' : 'bg-gray-400'
                }`}
              />
              <span>변환: {transformParams.enabled ? 'ON' : 'OFF'}</span>
            </div>
            {robotPosition && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
                <span>위치: {robotPosition.type.toUpperCase()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 알림 영역 */}
      {notifications.length > 0 && (
        <div
          className="bg-blue-50 border-b p-3 overflow-y-auto"
          style={{ maxHeight: '120px' }}
        >
          {notifications.map((notification, index) => (
            <div key={index} className="text-xs text-blue-800 mb-1 font-mono">
              📢 {notification}
            </div>
          ))}
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* 연결 성공 상태 */}
        {isConnected && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="font-medium text-green-800">ROS2 연결 활성</span>
              <span className="text-sm text-green-600">- {nucIP}:9090</span>
            </div>
          </div>
        )}

        {/* ROS 연결 필요 */}
        {!isConnected && (
          <div
            className={`border rounded-lg p-4 ${
              isConnecting
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div
                  className={`font-medium ${
                    isConnecting ? 'text-yellow-800' : 'text-red-800'
                  }`}
                >
                  {isConnecting ? 'ROS2 연결 중...' : 'ROS2 연결 필요'}
                </div>
                <div
                  className={`text-sm ${
                    isConnecting ? 'text-yellow-600' : 'text-red-600'
                  }`}
                >
                  NUC ({nucIP}:9090){' '}
                  {connectionAttempts > 0 && `- 시도 ${connectionAttempts}/3`}
                </div>
              </div>
              <button
                onClick={forceReconnect}
                disabled={isConnecting}
                className={`px-3 py-1 text-white rounded text-sm ${
                  isConnecting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {isConnecting ? '연결중...' : '재연결'}
              </button>
            </div>
          </div>
        )}

        {/* 🔧 좌표 변환 설정 */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold mb-2">🔧 좌표 변환 설정</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div>
                상태:{' '}
                <span
                  className={
                    transformParams.enabled
                      ? 'text-green-600 font-semibold'
                      : 'text-gray-500'
                  }
                >
                  {transformParams.enabled ? '활성화' : '비활성화'}
                </span>
              </div>
              <div>
                이동: ({transformParams.translation.x.toFixed(2)},{' '}
                {transformParams.translation.y.toFixed(2)})
              </div>
            </div>
            <div>
              <div>
                회전: {((transformParams.rotation * 180) / Math.PI).toFixed(1)}°
              </div>
              <div>
                스케일: ({transformParams.scale.x.toFixed(2)},{' '}
                {transformParams.scale.y.toFixed(2)})
              </div>
            </div>
          </div>
          <button
            onClick={() =>
              setCoordinateTransform({ enabled: !transformParams.enabled })
            }
            className={`mt-2 px-3 py-1 rounded text-sm ${
              transformParams.enabled
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {transformParams.enabled ? '변환 비활성화' : '변환 활성화'}
          </button>
        </div>

        {/* 테스트 버튼들 */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => sendSingleGoal(100, 100, '테스트 이동')} // 🔧 수정됨
            disabled={!isConnected}
            className={`py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
              !isConnected
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            🚀 테스트 이동 (100, 100)
          </button>

          <button
            onClick={stopRobot}
            disabled={!isConnected}
            className={`py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
              !isConnected
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            ⏹️ 정지
          </button>
        </div>

        {/* 🔧 로봇 위치 정보 - 원본 값 표시 */}
        {robotPosition && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold mb-2 flex items-center">
              📍 로봇 위치 (원본 값)
              <span
                className={`ml-2 px-2 py-1 rounded text-xs ${
                  robotPosition.type === 'pixel'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {robotPosition.type.toUpperCase()}
              </span>
              {transformParams.enabled && (
                <span className="ml-2 px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                  변환됨
                </span>
              )}
            </h4>
            <div className="text-sm space-y-1">
              <div className="font-mono">
                <strong>표시 X:</strong> {robotPosition.x.toFixed(1)}
              </div>
              <div className="font-mono">
                <strong>표시 Y:</strong> {robotPosition.y.toFixed(1)}
              </div>
              {robotPosition.angle !== 0 && (
                <div className="font-mono">
                  <strong>방향:</strong>{' '}
                  {((robotPosition.angle * 180) / Math.PI).toFixed(1)}°
                </div>
              )}
              <div className="text-gray-500 text-xs">
                업데이트:{' '}
                {new Date(robotPosition.timestamp).toLocaleTimeString()}
              </div>

              {/* 원본 vs 변환된 좌표 비교 */}
              {transformParams.enabled && robotPosition.raw?.original && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <div className="text-xs text-gray-600">
                    <div>
                      원본 ROS: ({robotPosition.raw.original.x},{' '}
                      {robotPosition.raw.original.y})
                    </div>
                    <div>
                      변환 후: ({robotPosition.x.toFixed(1)},{' '}
                      {robotPosition.y.toFixed(1)})
                    </div>
                  </div>
                </div>
              )}

              {/* 원본 데이터 표시 (개발용) */}
              {process.env.NODE_ENV === 'development' && robotPosition.raw && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer">
                    원본 데이터 보기
                  </summary>
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                    {JSON.stringify(robotPosition.raw, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )}

        {/* 경로 정보 */}
        {routeData && routeData.route && routeData.route.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">🗺️ 쇼핑 경로</h4>
            <div className="text-sm text-blue-600 mb-3">
              {routeData.route.length}개 매대
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={executeFullRoute}
                disabled={!isConnected || isExecutingRoute}
                className={`py-2 px-3 rounded font-semibold text-white text-sm ${
                  !isConnected || isExecutingRoute
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {isExecutingRoute ? '🔄 실행중...' : '🚀 경로 실행 (서비스)'}
              </button>
            </div>
          </div>
        )}

        {/* 디버그 정보 */}
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-3">
          <h4 className="font-semibold text-sm mb-2">🔧 연결 상태</h4>
          <div className="text-xs space-y-1">
            <div>ROSLIB Ready: {isROSLIBReady ? '✅' : '❌'}</div>
            <div>ROS Connected: {isConnected ? '✅' : '❌'}</div>
            <div>Robot Position: {robotPosition ? '✅' : '❌'}</div>
            <div>Position Type: {robotPosition?.type || 'N/A'}</div>
            <div>
              Transform Enabled: {transformParams.enabled ? '✅' : '❌'}
            </div>
            <div>Route Executing: {isExecutingRoute ? '✅' : '❌'}</div>
            <div>NUC IP: {nucIP}:9090</div>
          </div>
        </div>

        {/* 🔧 개발자 도구 (좌표 변환 테스트) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">
              🔧 개발자 도구
            </h4>
            <div className="space-y-2">
              <button
                onClick={() => {
                  // 테스트용 변환 파라미터 설정
                  setCoordinateTransform({
                    translation: { x: 50, y: 30 },
                    rotation: 0.1, // 약 5.7도
                    scale: { x: 1.1, y: 1.1 },
                    enabled: true,
                  });
                }}
                className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded text-sm hover:bg-yellow-300"
              >
                테스트 변환식 적용
              </button>

              <button
                onClick={() => {
                  // 변환 비활성화
                  setCoordinateTransform({ enabled: false });
                }}
                className="ml-2 px-3 py-1 bg-red-200 text-red-800 rounded text-sm hover:bg-red-300"
              >
                변환 초기화
              </button>
            </div>

            <div className="mt-2 text-xs text-yellow-700">
              * 실제 운영 시에는 정합점 기반 변환 파라미터를 적용하세요
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 🔧 외부에서 좌표 변환 파라미터를 설정할 수 있는 함수 export
export const setRobotControlTransform = (
  params: Partial<TransformParameters>,
) => {
  console.log('Transform parameters to be set:', params);
};

export default ROSLibRobotControl;
