// components/ROSLibRobotControl.tsx - 개선된 버전

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface ROSLibRobotControlProps {
  routeData?: any;
  nucIP?: string;
  isROSLIBLoaded?: boolean; // _app.tsx에서 전달받는 props
}

const ROSLibRobotControl: React.FC<ROSLibRobotControlProps> = ({ 
  routeData, 
  nucIP = '192.168.0.100',
  isROSLIBLoaded = false 
}) => {
  const [isROSLIBReady, setIsROSLIBReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [robotPosition, setRobotPosition] = useState(null);
  const [notifications, setNotifications] = useState<string[]>([]);
  
  const rosRef = useRef<any>(null);

  // ROSLIB 로드 상태 감지
  useEffect(() => {
    const checkROSLIB = () => {
      if (typeof window !== 'undefined' && (window as any).ROSLIB) {
        setIsROSLIBReady(true);
        addNotification('ROSLIB.js 준비 완료');
        return true;
      }
      return false;
    };

    // 즉시 확인
    if (checkROSLIB()) return;

    // props로 전달받은 상태 확인
    if (isROSLIBLoaded) {
      const timer = setTimeout(checkROSLIB, 100);
      return () => clearTimeout(timer);
    }

    // 이벤트 리스너로 로드 감지
    const handleROSLIBLoaded = () => {
      if (checkROSLIB()) {
        console.log('ROSLIB 이벤트로 로드 감지됨');
      }
    };

    const handleROSLIBError = (event: any) => {
      console.error('ROSLIB 로드 오류:', event.detail);
      addNotification('ROSLIB 로드 실패: ' + event.detail.error);
    };

    window.addEventListener('roslibLoaded', handleROSLIBLoaded);
    window.addEventListener('roslibError', handleROSLIBError);

    return () => {
      window.removeEventListener('roslibLoaded', handleROSLIBLoaded);
      window.removeEventListener('roslibError', handleROSLIBError);
    };
  }, [isROSLIBLoaded]);

  // ROSLIB가 준비되면 ROS 연결 초기화
  useEffect(() => {
    if (isROSLIBReady && !isConnected) {
      initializeROSConnection();
    }
  }, [isROSLIBReady, nucIP]);

  const addNotification = (message: string) => {
    setNotifications(prev => [...prev, message]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 5000);
  };

  const initializeROSConnection = () => {
    if (!isROSLIBReady || !(window as any).ROSLIB) {
      addNotification('ROSLIB가 준비되지 않았습니다');
      return;
    }

    try {
      const ROSLIB = (window as any).ROSLIB;
      
      rosRef.current = new ROSLIB.Ros({
        url: `ws://${nucIP}:9090`
      });

      rosRef.current.on('connection', () => {
        console.log('✅ ROS2 연결 성공');
        setIsConnected(true);
        addNotification('ROS2 연결 성공');
        setupROSTopics();
      });

      rosRef.current.on('error', (error: any) => {
        console.error('❌ ROS2 연결 오류:', error);
        setIsConnected(false);
        addNotification(`ROS2 연결 오류: ${error.message || 'Unknown'}`);
      });

      rosRef.current.on('close', () => {
        console.log('🔌 ROS2 연결 끊김');
        setIsConnected(false);
        addNotification('ROS2 연결 끊김');
        
        // 재연결 시도
        setTimeout(() => {
          if (!isConnected) {
            addNotification('재연결 시도 중...');
            initializeROSConnection();
          }
        }, 3000);
      });

    } catch (error) {
      console.error('ROS 초기화 오류:', error);
      addNotification('ROS 초기화 실패');
    }
  };

  const setupROSTopics = () => {
    if (!rosRef.current || !(window as any).ROSLIB) return;

    const ROSLIB = (window as any).ROSLIB;

    // 위치 정보 구독
    const poseSub = new ROSLIB.Topic({
      ros: rosRef.current,
      name: '/slam_toolbox/pose',
      messageType: 'geometry_msgs/msg/PoseStamped'
    });

    poseSub.subscribe((message: any) => {
      const pos = message.pose.position;
      const orientation = message.pose.orientation;
      
      const angle = Math.atan2(
        2.0 * (orientation.w * orientation.z + orientation.x * orientation.y),
        1.0 - 2.0 * (orientation.y * orientation.y + orientation.z * orientation.z)
      );

      setRobotPosition({
        x: pos.x,
        y: pos.y,
        angle: angle,
        timestamp: Date.now()
      });
    });

    addNotification('ROS 토픽 설정 완료');
  };

  const sendGoal = (x: number, y: number) => {
    if (!rosRef.current || !(window as any).ROSLIB) {
      addNotification('ROS 연결이 필요합니다');
      return;
    }

    const ROSLIB = (window as any).ROSLIB;
    
    const goalPub = new ROSLIB.Topic({
      ros: rosRef.current,
      name: '/goal_pose',
      messageType: 'geometry_msgs/msg/PoseStamped'
    });

    const goalMsg = new ROSLIB.Message({
      header: {
        frame_id: "map",
        stamp: { sec: 0, nanosec: 0 }
      },
      pose: {
        position: { x: x, y: y, z: 0.0 },
        orientation: { x: 0, y: 0, z: 0.0, w: 1.0 }
      }
    });

    goalPub.publish(goalMsg);
    addNotification(`목표점 전송: (${x.toFixed(2)}, ${y.toFixed(2)})`);
  };

  const stopRobot = () => {
    if (!rosRef.current || !(window as any).ROSLIB) {
      addNotification('ROS 연결이 필요합니다');
      return;
    }

    const ROSLIB = (window as any).ROSLIB;
    
    const cmdVel = new ROSLIB.Topic({
      ros: rosRef.current,
      name: '/cmd_vel',
      messageType: 'geometry_msgs/msg/Twist'
    });

    const stopTwist = new ROSLIB.Message({
      linear: { x: 0.0, y: 0.0, z: 0.0 },
      angular: { x: 0.0, y: 0.0, z: 0.0 }
    });

    cmdVel.publish(stopTwist);
    addNotification('정지 명령 전송');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg">🤖 Scout Mini 제어</h3>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isROSLIBReady ? 'bg-green-400' : 'bg-yellow-400'}`} />
            <span className="text-sm">ROSLIB: {isROSLIBReady ? '준비됨' : '로딩중'}</span>
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-sm">ROS2: {isConnected ? '연결됨' : '끊김'}</span>
          </div>
        </div>
      </div>

      {/* 알림 영역 */}
      {notifications.length > 0 && (
        <div className="bg-blue-50 border-b p-3 max-h-20 overflow-y-auto">
          {notifications.map((notification, index) => (
            <div key={index} className="text-sm text-blue-800 mb-1">
              📢 {notification}
            </div>
          ))}
        </div>
      )}

      <div className="p-4">
        {/* ROSLIB 로딩 상태 표시 */}
        {!isROSLIBReady && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600"></div>
              <div>
                <div className="font-medium text-yellow-800">ROSLIB.js 로딩 중...</div>
                <div className="text-sm text-yellow-600">로봇 제어 기능을 준비하고 있습니다.</div>
              </div>
            </div>
          </div>
        )}

        {/* ROS 연결 상태 */}
        {isROSLIBReady && !isConnected && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-red-800">ROS2 연결 필요</div>
                <div className="text-sm text-red-600">NUC ({nucIP}:9090)에 연결 중...</div>
              </div>
              <button
                onClick={initializeROSConnection}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
              >
                재연결
              </button>
            </div>
          </div>
        )}

        {/* 로봇 제어 버튼들 */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => sendGoal(1.0, 1.0)} // 테스트용 목표점
            disabled={!isConnected}
            className={`py-3 px-4 rounded-lg font-semibold text-white ${
              !isConnected
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            🚀 테스트 이동
          </button>

          <button
            onClick={stopRobot}
            disabled={!isConnected}
            className={`py-3 px-4 rounded-lg font-semibold text-white ${
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
          <div className="mt-4 bg-gray-50 p-3 rounded-lg">
            <h4 className="font-semibold mb-2">로봇 위치</h4>
            <div className="text-sm space-y-1">
              <div>X: {robotPosition.x.toFixed(2)}m</div>
              <div>Y: {robotPosition.y.toFixed(2)}m</div>
              <div>방향: {(robotPosition.angle * 180 / Math.PI).toFixed(1)}°</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ROSLibRobotControl;