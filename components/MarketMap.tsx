// components/MarketMap.tsx - 로봇 위치 표시 추가
import React, { useState, useRef, useEffect } from 'react';
import { RouteData, Product, PathPoint, RoutePoint } from '@/interfaces/route';

interface RobotPosition {
  x: number;
  y: number;
  angle: number;
  timestamp: number;
}

interface MarketMapProps {
  routeData?: RouteData;
  robotPosition?: RobotPosition; // 추가: 로봇 실시간 위치
  onClose?: () => void;
}

const MarketMap: React.FC<MarketMapProps> = ({ routeData, robotPosition, onClose }) => {
  const [zoom, setZoom] = useState<number>(1);
  const [selectedItem, setSelectedItem] = useState<Product | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const mapDimensions = { width: 1300, height: 850 };

  // ROS 좌표를 웹 좌표로 변환
  const convertROSToWeb = (rosCoords: { x: number; y: number }) => {
    return {
      x: rosCoords.x * 100 + 650,
      y: 400 - rosCoords.y * 100
    };
  };

  // 웹 좌표로 변환된 로봇 위치
  const webRobotPosition = robotPosition ? convertROSToWeb(robotPosition) : null;

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.2, 0.5));
  };

  const handleItemClick = (item: Product) => {
    setSelectedItem(item);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* 지도 헤더 */}
      <div className="bg-blue-600 text-white p-3 flex items-center justify-between">
        <h3 className="font-semibold">🛒 실시간 쇼핑 지도</h3>
        <div className="flex items-center gap-2">
          <button onClick={handleZoomIn} className="p-1 hover:bg-blue-700 rounded" title="확대">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button onClick={handleZoomOut} className="p-1 hover:bg-blue-700 rounded" title="축소">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          {/* 로봇 연결 상태 표시 */}
          <div className="flex items-center gap-1 text-sm">
            <div className={`w-2 h-2 rounded-full ${robotPosition ? 'bg-green-400' : 'bg-red-400'}`} />
            <span>{robotPosition ? 'LIVE' : 'OFFLINE'}</span>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-blue-700 rounded" title="닫기">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 지도 영역 */}
      <div className="flex-1 overflow-auto relative">
        <div
          ref={mapRef}
          className="relative"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: '0 0',
            width: `${mapDimensions.width}px`,
            height: `${mapDimensions.height}px`,
            background: '#fff',
          }}
        >
          {/* SVG 마트 레이아웃 */}
          <svg
            width={mapDimensions.width}
            height={mapDimensions.height}
            viewBox={`0 0 ${mapDimensions.width} ${mapDimensions.height}`}
            className="absolute top-0 left-0"
          >
            {/* 배경 프레임 */}
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="#fff"
              stroke="#000"
              strokeWidth="2"
            />

            {/* 기존 마트 레이아웃 (생략된 부분들...) */}
            
            {/* 1층 타이틀 */}
            <text x="70" y="80" fontSize="80" fontWeight="bold">1F</text>
            <text x="30" y="145" fontSize="20">식료품 / 다이소 /생활식품</text>

            {/* 매대들 (기존 코드와 동일) */}
            {/* ... 기존 매대 렌더링 코드 ... */}

            {/* 계획된 경로 표시 */}
            {routeData && (
              <>
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="0"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#4f46e5" />
                  </marker>
                </defs>

                {/* 경로 라인 */}
                {routeData.route.map((item, index) => {
                  if (item.pathPoints && item.pathPoints.length > 1) {
                    const points = item.pathPoints;
                    const pathStr = `M${points[0].x},${points[0].y} ${points
                      .slice(1)
                      .map((p) => `L${p.x},${p.y}`)
                      .join(' ')}`;

                    return (
                      <path
                        key={`path-${index}`}
                        d={pathStr}
                        stroke="#4f46e5"
                        strokeWidth="3"
                        fill="none"
                        strokeDasharray="5,5"
                        opacity="0.7"
                      />
                    );
                  }
                  return null;
                })}

                {/* 경로 상의 목표 지점들 */}
                {routeData.route.map((point, index) => (
                  <g key={`marker-${index}`}>
                    <circle
                      cx={point.coordinates.x}
                      cy={point.coordinates.y}
                      r="15"
                      fill="#4f46e5"
                      stroke="white"
                      strokeWidth="3"
                    />
                    <text
                      x={point.coordinates.x}
                      y={point.coordinates.y + 5}
                      textAnchor="middle"
                      fill="white"
                      fontSize="12"
                      fontWeight="bold"
                    >
                      {index + 1}
                    </text>
                  </g>
                ))}
              </>
            )}

            {/* 🤖 실시간 로봇 위치 표시 */}
            {webRobotPosition && (
              <g>
                {/* 로봇 위치 표시 원 (펄스 효과) */}
                <circle
                  cx={webRobotPosition.x}
                  cy={webRobotPosition.y}
                  r="25"
                  fill="none"
                  stroke="#ff4444"
                  strokeWidth="2"
                  opacity="0.6"
                >
                  <animate
                    attributeName="r"
                    values="25;35;25"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.6;0.2;0.6"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>

                {/* 로봇 본체 */}
                <g transform={`translate(${webRobotPosition.x}, ${webRobotPosition.y}) rotate(${(robotPosition?.angle || 0) * 180 / Math.PI})`}>
                  {/* 로봇 몸체 */}
                  <rect
                    x="-20"
                    y="-15"
                    width="40"
                    height="30"
                    fill="#ff4444"
                    stroke="#cc0000"
                    strokeWidth="2"
                    rx="8"
                  />
                  
                  {/* 로봇 방향 표시 (앞쪽 삼각형) */}
                  <polygon
                    points="20,0 35,0 27.5,-8 27.5,8"
                    fill="#cc0000"
                  />
                  
                  {/* 로봇 아이콘 */}
                  <text
                    x="0"
                    y="5"
                    textAnchor="middle"
                    fontSize="16"
                    fill="white"
                    fontWeight="bold"
                  >
                    🤖
                  </text>
                </g>

                {/* 로봇 정보 표시 */}
                <g transform={`translate(${webRobotPosition.x + 30}, ${webRobotPosition.y - 30})`}>
                  <rect
                    x="0"
                    y="0"
                    width="120"
                    height="50"
                    fill="rgba(255, 255, 255, 0.9)"
                    stroke="#ff4444"
                    strokeWidth="1"
                    rx="5"
                  />
                  <text x="5" y="15" fontSize="10" fill="#333">
                    Scout Mini
                  </text>
                  <text x="5" y="28" fontSize="9" fill="#666">
                    ({robotPosition?.x.toFixed(2)}, {robotPosition?.y.toFixed(2)})
                  </text>
                  <text x="5" y="41" fontSize="9" fill="#666">
                    {robotPosition ? new Date(robotPosition.timestamp).toLocaleTimeString() : ''}
                  </text>
                </g>
              </g>
            )}

            {/* 로봇 이동 경로 트레일 (선택사항) */}
            {webRobotPosition && routeData && (
              <g>
                {/* 현재 위치에서 다음 목표점까지 예상 경로 */}
                {routeData.route.map((target, index) => {
                  const distance = Math.sqrt(
                    Math.pow(target.coordinates.x - webRobotPosition.x, 2) +
                    Math.pow(target.coordinates.y - webRobotPosition.y, 2)
                  );
                  
                  // 가장 가까운 목표점으로 추정되는 경우 연결선 표시
                  if (distance < 200) {
                    return (
                      <line
                        key={`trail-${index}`}
                        x1={webRobotPosition.x}
                        y1={webRobotPosition.y}
                        x2={target.coordinates.x}
                        y2={target.coordinates.y}
                        stroke="#ff4444"
                        strokeWidth="2"
                        strokeDasharray="3,3"
                        opacity="0.5"
                      />
                    );
                  }
                  return null;
                })}
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* 하단 정보 영역 */}
      <div className="p-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4">
          {/* 좌측: 쇼핑 리스트 */}
          <div className="border rounded-lg p-3 bg-gray-50">
            <h4 className="font-semibold mb-2">🛒 쇼핑 리스트</h4>
            {routeData && routeData.items ? (
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {routeData.items.map((item, index) => (
                  <li
                    key={index}
                    className={`cursor-pointer text-sm ${
                      selectedItem?.name === item.name
                        ? 'font-bold text-blue-600'
                        : ''
                    }`}
                    onClick={() => handleItemClick(item)}
                  >
                    {index + 1}. {item.name} ({item.section})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">쇼핑 리스트가 없습니다</p>
            )}
          </div>

          {/* 중앙: 로봇 상태 */}
          <div className="border rounded-lg p-3 bg-gray-50">
            <h4 className="font-semibold mb-2">🤖 로봇 상태</h4>
            {robotPosition ? (
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-600 font-medium">온라인</span>
                </div>
                <div>위치: ({robotPosition.x.toFixed(2)}, {robotPosition.y.toFixed(2)})</div>
                <div>방향: {(robotPosition.angle * 180 / Math.PI).toFixed(1)}°</div>
                <div>업데이트: {new Date(robotPosition.timestamp).toLocaleTimeString()}</div>
              </div>
            ) : (
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-red-600 font-medium">오프라인</span>
                </div>
                <div className="text-gray-500">로봇 연결 대기 중...</div>
              </div>
            )}
          </div>

          {/* 우측: 경로 정보 */}
          <div className="border rounded-lg p-3 bg-gray-50">
            <h4 className="font-semibold mb-2">📍 경로 정보</h4>
            {routeData ? (
              <div className="text-sm space-y-1">
                <div>총 거리: {routeData.total_distance}m</div>
                <div>예상 시간: {Math.round(routeData.total_distance / 100)}분</div>
                <div>매대 수: {routeData.route.length}개</div>
                {webRobotPosition && routeData.route.length > 0 && (
                  <div className="text-blue-600">
                    다음 목표까지: {Math.round(Math.sqrt(
                      Math.pow(routeData.route[0].coordinates.x - webRobotPosition.x, 2) +
                      Math.pow(routeData.route[0].coordinates.y - webRobotPosition.y, 2)
                    ))}px
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500">경로가 설정되지 않았습니다</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketMap;