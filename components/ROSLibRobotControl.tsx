// components/ROSLibRobotControl.tsx - 경로 계획 및 순차 이동 기능 추가

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
  const [routeStarted, setRouteStarted] = useState(false);

  const rosRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const routeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ROSLIB 로드 상태 감지
  useEffect(() => {
    let checkInterval: NodeJS.Timeout;

    const checkROSLIB = () => {
      if (typeof window !== 'undefined' && (window as any).ROSLIB) {
        console.log('✅ ROSLIB 객체 확인됨');
        setIsROSLIBReady(true);
        addNotification('ROSLIB.js 준비 완료');

        const version = (window as any).ROSLIB.version;
        if (version) {
          addNotification(`ROSLIB 버전: ${version}`);
        }

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

    const handleROSLIBLoaded = () => {
      console.log('🎉 ROSLIB 로드 이벤트 수신');
      if (checkROSLIB()) {
        clearInterval(checkInterval);
      }
    };

    const handleROSLIBError = (event: any) => {
      console.error('❌ ROSLIB 로드 오류:', event.detail);
      addNotification(
        `ROSLIB 로드 실패: ${event.detail?.error || 'Unknown error'}`,
      );
    };

    window.addEventListener('roslibLoaded', handleROSLIBLoaded);
    window.addEventListener('roslibError', handleROSLIBError);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      window.removeEventListener('roslibLoaded', handleROSLIBLoaded);
      window.removeEventListener('roslibError', handleROSLIBError);
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

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (routeTimeoutRef.current) {
        clearTimeout(routeTimeoutRef.current);
      }
      if (rosRef.current) {
        try {
          rosRef.current.close();
        } catch (error) {
          console.warn('ROS 연결 정리 중 오류:', error);
        }
      }
    };
  }, []);

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

    if (isConnecting) {
      addNotification('이미 연결 시도 중입니다');
      return;
    }

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

      rosRef.current = new ROSLIB.Ros({
        url: rosUrl,
      });

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

        const errorMsg = error?.message || error?.toString() || 'Unknown error';
        addNotification(`ROS2 연결 오류: ${errorMsg}`);

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
      const poseTopics = [
        '/slam_toolbox/pose',
        '/amcl_pose',
        '/robot_pose',
        '/pose',
      ];

      let subscribed = false;

      for (const topicName of poseTopics) {
        try {
          const poseSub = new ROSLIB.Topic({
            ros: rosRef.current,
            name: topicName,
            messageType: 'geometry_msgs/msg/PoseStamped',
          });

          poseSub.subscribe((message: any) => {
            if (!subscribed) {
              addNotification(`위치 토픽 구독 성공: ${topicName}`);
              subscribed = true;
            }

            const pos = message.pose.position;
            const orientation = message.pose.orientation;

            const angle = Math.atan2(
              2.0 *
                (orientation.w * orientation.z + orientation.x * orientation.y),
              1.0 -
                2.0 *
                  (orientation.y * orientation.y +
                    orientation.z * orientation.z),
            );

            const newPosition = {
              x: pos.x,
              y: pos.y,
              angle: angle,
              timestamp: Date.now(),
            };

            setRobotPosition(newPosition);

            if (onRobotPositionUpdate) {
              onRobotPositionUpdate(newPosition);
            }

            if (isExecutingRoute && routeData && routeData.route.length > 0) {
              checkGoalReached(newPosition);
            }
          });

          break;
        } catch (topicError) {
          console.warn(`토픽 구독 실패: ${topicName}`, topicError);
        }
      }

      // ✅ 추가된 테스트용 xy_topic 구독
      const xyTopicSub = new ROSLIB.Topic({
        ros: rosRef.current,
        name: '/xy_topic',
        messageType: 'geometry_msgs/msg/Point',
      });

      xyTopicSub.subscribe((message: any) => {
        const newPosition = {
          x: message.x,
          y: message.y,
          angle: 0,
          timestamp: Date.now(),
        };

        setRobotPosition(newPosition);

        if (onRobotPositionUpdate) {
          onRobotPositionUpdate(newPosition);
        }

        addNotification(
          `테스트 위치 수신: x=${message.x.toFixed(2)}, y=${message.y.toFixed(
            2,
          )}`,
        );
      });

      addNotification('ROS 토픽 설정 완료');
    } catch (error) {
      console.error('토픽 설정 오류:', error);
      addNotification(`토픽 설정 실패: ${error}`);
    }
  };

  // 좌표를 ROS 좌표계로 변환 (웹 좌표 → ROS 좌표)
  const convertToROSCoords = (webX: number, webY: number) => {
    // 웹 좌표를 ROS 좌표로 변환 (스케일링 및 원점 이동)
    const rosX = (webX - 650) / 100; // 중앙을 원점으로, 스케일 조정
    const rosY = (400 - webY) / 100; // Y축 뒤집기
    return { x: rosX, y: rosY };
  };

  const sendGoal = (x: number, y: number, description?: string) => {
    if (!rosRef.current || !(window as any).ROSLIB) {
      addNotification('ROS 연결이 필요합니다');
      return;
    }

    const ROSLIB = (window as any).ROSLIB;

    try {
      // 웹 좌표를 ROS 좌표로 변환
      const rosCoords = convertToROSCoords(x, y);

      const goalPub = new ROSLIB.Topic({
        ros: rosRef.current,
        name: '/goal_pose',
        messageType: 'geometry_msgs/msg/PoseStamped',
      });

      const goalMsg = new ROSLIB.Message({
        header: {
          frame_id: 'map',
          stamp: { sec: 0, nanosec: 0 },
        },
        pose: {
          position: { x: rosCoords.x, y: rosCoords.y, z: 0.0 },
          orientation: { x: 0, y: 0, z: 0.0, w: 1.0 },
        },
      });

      goalPub.publish(goalMsg);
      const desc =
        description || `(${rosCoords.x.toFixed(2)}, ${rosCoords.y.toFixed(2)})`;
      addNotification(`목표점 전송: ${desc}`);
    } catch (error) {
      console.error('목표점 전송 오류:', error);
      addNotification(`목표점 전송 실패: ${error}`);
    }
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
        messageType: 'geometry_msgs/msg/Twist',
      });

      const stopTwist = new ROSLIB.Message({
        linear: { x: 0.0, y: 0.0, z: 0.0 },
        angular: { x: 0.0, y: 0.0, z: 0.0 },
      });

      cmdVel.publish(stopTwist);
      addNotification('정지 명령 전송');

      // 경로 실행 중단
      if (isExecutingRoute) {
        setIsExecutingRoute(false);
        setRouteStarted(false);
        if (routeTimeoutRef.current) {
          clearTimeout(routeTimeoutRef.current);
        }
        addNotification('경로 실행 중단됨');
      }
    } catch (error) {
      console.error('정지 명령 오류:', error);
      addNotification(`정지 명령 실패: ${error}`);
    }
  };

  // 목표 도달 확인 함수
  const checkGoalReached = (currentPos: RobotPosition) => {
    if (
      !routeData ||
      !routeData.route ||
      currentTargetIndex >= routeData.route.length
    ) {
      return;
    }

    const uniqueRoute = deduplicateRouteByLocation(routeData.route);
    const target = uniqueRoute[currentTargetIndex];
    const targetROS = convertToROSCoords(
      target.coordinates.x,
      target.coordinates.y,
    );

    const distance = Math.sqrt(
      Math.pow(currentPos.x - targetROS.x, 2) +
        Math.pow(currentPos.y - targetROS.y, 2),
    );

    // 목표점에 도달했는지 확인 (1m 이내)
    if (distance < 1.0) {
      addNotification(
        `${target.location} 도달! (${currentTargetIndex + 1}/${
          routeData.route.length
        })`,
      );

      // 다음 목표로 이동
      const nextIndex = currentTargetIndex + 1;
      if (nextIndex < routeData.route.length) {
        setCurrentTargetIndex(nextIndex);

        // 잠시 대기 후 다음 목표로 이동
        routeTimeoutRef.current = setTimeout(() => {
          const nextTarget = uniqueRoute[nextIndex];
          sendGoal(
            nextTarget.coordinates.x,
            nextTarget.coordinates.y,
            `${nextTarget.location} (${nextIndex + 1}/${
              routeData.route.length
            })`,
          );
        }, 2000); // 2초 대기
      } else {
        // 모든 목표 완료
        setIsExecutingRoute(false);
        setRouteStarted(false);
        addNotification('🎉 모든 매대 방문 완료!');
      }
    }
  };

  // 전체 경로 실행
  const executeFullRoute = () => {
    if (!routeData || !routeData.route || routeData.route.length === 0) {
      addNotification('실행할 경로가 없습니다');
      return;
    }

    const uniqueRoute = deduplicateRouteByLocation(routeData.route);

    setIsExecutingRoute(true);
    setRouteStarted(true);
    setCurrentTargetIndex(0);

    const firstTarget = uniqueRoute[0];
    sendGoal(
      firstTarget.coordinates.x,
      firstTarget.coordinates.y,
      `${firstTarget.location} (1/${uniqueRoute.length})`,
    );

    addNotification(`경로 실행 시작: ${uniqueRoute.length}개 매대`);
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
        {/* ROSLIB 로딩 상태 표시 */}
        {!isROSLIBReady && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600"></div>
              <div>
                <div className="font-medium text-yellow-800">
                  ROSLIB.js 로딩 중...
                </div>
                <div className="text-sm text-yellow-600">
                  로봇 제어 기능을 준비하고 있습니다.
                  {isROSLIBLoaded && (
                    <span className="font-semibold"> (거의 완료됨)</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ROS 연결 상태 */}
        {isROSLIBReady && !isConnected && (
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

        {/* 경로 실행 섹션 */}
        {routeData && routeData.route && routeData.route.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">🗺️ 쇼핑 경로</h4>
            <div className="text-sm text-blue-600 mb-3">
              {routeData.route.length}개 매대, 총 거리:{' '}
              {routeData.total_distance}m
            </div>

            {/* 경로 목록 */}
            <div className="mb-3 max-h-32 overflow-y-auto">
              {routeData.route.map((point, index) => (
                <div
                  key={index}
                  className={`text-xs p-2 mb-1 rounded ${
                    isExecutingRoute && index === currentTargetIndex
                      ? 'bg-yellow-200 text-yellow-800 font-semibold'
                      : index < currentTargetIndex && isExecutingRoute
                      ? 'bg-green-200 text-green-800'
                      : 'bg-white text-gray-700'
                  }`}
                >
                  {index + 1}. {point.location} - {point.item}
                  {isExecutingRoute && index === currentTargetIndex && (
                    <span className="ml-2">← 현재 목표</span>
                  )}
                  {index < currentTargetIndex && isExecutingRoute && (
                    <span className="ml-2">✓ 완료</span>
                  )}
                </div>
              ))}
            </div>

            {/* 경로 제어 버튼들 */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={executeFullRoute}
                disabled={!isConnected || isExecutingRoute}
                className={`py-2 px-3 rounded font-semibold text-white text-sm ${
                  !isConnected || isExecutingRoute
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {isExecutingRoute ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>
                      실행중 ({currentTargetIndex + 1}/{routeData.route.length})
                    </span>
                  </div>
                ) : (
                  '🚀 전체 경로 실행'
                )}
              </button>

              <button
                onClick={() => {
                  if (routeData.route[0]) {
                    const target = routeData.route[0];
                    sendGoal(
                      target.coordinates.x,
                      target.coordinates.y,
                      target.location,
                    );
                  }
                }}
                disabled={!isConnected || isExecutingRoute}
                className={`py-2 px-3 rounded font-semibold text-white text-sm ${
                  !isConnected || isExecutingRoute
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                📍 첫 번째 매대만
              </button>
            </div>

            {/* 진행 상황 표시 */}
            {isExecutingRoute && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-blue-600 mb-1">
                  <span>진행 상황</span>
                  <span>
                    {currentTargetIndex}/{routeData.route.length}
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        (currentTargetIndex / routeData.route.length) * 100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 기본 제어 버튼들 */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => sendGoal(100, 100)} // 테스트용 절대 좌표
            disabled={!isConnected || isExecutingRoute}
            className={`py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
              !isConnected || isExecutingRoute
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            🚀 테스트 이동
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

        {/* 로봇 상태 정보 */}
        {robotPosition && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold mb-2">📍 로봇 위치</h4>
            <div className="text-sm space-y-1">
              <div>X: {robotPosition.x.toFixed(3)}m</div>
              <div>Y: {robotPosition.y.toFixed(3)}m</div>
              <div>
                방향: {((robotPosition.angle * 180) / Math.PI).toFixed(1)}°
              </div>
              <div className="text-gray-500">
                업데이트:{' '}
                {new Date(robotPosition.timestamp).toLocaleTimeString()}
              </div>
              {isExecutingRoute && routeData && (
                <div className="text-blue-600 font-medium">
                  목표: {routeData.route[currentTargetIndex]?.location || 'N/A'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 디버그 정보 (개발 모드에서만) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-3">
            <h4 className="font-semibold text-sm mb-2">🔧 디버그 정보</h4>
            <div className="text-xs space-y-1">
              <div>ROSLIB Ready: {isROSLIBReady ? '✅' : '❌'}</div>
              <div>Props ROSLIB Loaded: {isROSLIBLoaded ? '✅' : '❌'}</div>
              <div>ROS Connected: {isConnected ? '✅' : '❌'}</div>
              <div>Connecting: {isConnecting ? '✅' : '❌'}</div>
              <div>Connection Attempts: {connectionAttempts}/3</div>
              <div>NUC IP: {nucIP}:9090</div>
              <div>
                ROSLIB Object:{' '}
                {typeof window !== 'undefined' && (window as any).ROSLIB
                  ? '✅'
                  : '❌'}
              </div>
              <div>Route Executing: {isExecutingRoute ? '✅' : '❌'}</div>
              <div>
                Current Target: {currentTargetIndex + 1}/
                {routeData?.route?.length || 0}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ROSLibRobotControl;
