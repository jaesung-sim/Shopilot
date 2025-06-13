// components/MarketMap.tsx - A* 경로 시각화 추가

import React, { useState, useRef } from 'react';
import { RouteData, Product } from '@/interfaces/route';
import { deduplicateRouteByLocation } from '@/lib/utils';
import { createWalkableAreaMap, WalkableAreaMap } from '@/lib/walkableAreaMap';

interface RobotPosition {
  x: number;
  y: number;
  angle: number;
  timestamp: number;
  type: 'ros' | 'pixel';
  raw?: any;
}

interface MarketMapProps {
  routeData?: RouteData;
  robotPosition?: RobotPosition;
  onClose?: () => void;
}

// 맵 설정 - 단순화
const MAP_CONFIG = {
  displayWidth: 896,
  displayHeight: 504,
};

const MarketMap: React.FC<MarketMapProps> = ({
  routeData,
  robotPosition,
  onClose,
}) => {
  const [selectedItem, setSelectedItem] = useState<Product | null>(null);
  const [showDebugGrid, setShowDebugGrid] = useState(false);
  const [showWalkableAreas, setShowWalkableAreas] = useState(false);
  const [showAStarPath, setShowAStarPath] = useState(true); // 🆕 A* 경로 표시 상태
  const mapRef = useRef<HTMLDivElement>(null);

  // 🆕 통행 가능 영역 맵 생성
  const walkableMap = React.useMemo(() => {
    return createWalkableAreaMap();
  }, []);

  // 안전한 데이터 체크
  const hasValidRoute =
    routeData &&
    routeData.route &&
    Array.isArray(routeData.route) &&
    routeData.route.length > 0;
  const hasValidItems =
    routeData &&
    routeData.items &&
    Array.isArray(routeData.items) &&
    routeData.items.length > 0;

  const handleItemClick = (item: Product) => setSelectedItem(item);

  const uniqueRoute = routeData?.route
    ? deduplicateRouteByLocation(routeData.route)
    : [];

  // ✅ 로봇 위치를 맵 범위 내로 제한하는 함수
  const getClampedRobotPosition = () => {
    if (!robotPosition) return null;

    // 원본 좌표를 맵 크기 내로 제한
    const clampedX = Math.max(
      0,
      Math.min(MAP_CONFIG.displayWidth - 30, robotPosition.x),
    );
    const clampedY = Math.max(
      0,
      Math.min(MAP_CONFIG.displayHeight - 20, robotPosition.y),
    );

    return {
      x: clampedX,
      y: clampedY,
      angle: robotPosition.angle,
      isOutOfBounds:
        robotPosition.x < 0 ||
        robotPosition.x > MAP_CONFIG.displayWidth ||
        robotPosition.y < 0 ||
        robotPosition.y > MAP_CONFIG.displayHeight,
    };
  };

  const clampedPosition = getClampedRobotPosition();

  // 🆕 통행 가능 영역 렌더링 함수
  const renderWalkableAreas = () => {
    if (!showWalkableAreas) return null;

    const areas: JSX.Element[] = [];

    for (let y = 0; y < walkableMap.height; y++) {
      for (let x = 0; x < walkableMap.width; x++) {
        const cell = walkableMap.grid[y][x];

        if (cell.walkable) {
          const rectX = x * walkableMap.cellSize;
          const rectY = y * walkableMap.cellSize;

          // 비용에 따른 색상 구분
          const fillColor = cell.cost === 1 ? '#10b981' : '#f59e0b'; // 일반 통로: 초록, 좁은 통로: 주황
          const opacity = cell.cost === 1 ? 0.3 : 0.4;

          areas.push(
            <rect
              key={`walkable-${x}-${y}`}
              x={rectX}
              y={rectY}
              width={walkableMap.cellSize}
              height={walkableMap.cellSize}
              fill={fillColor}
              opacity={opacity}
              stroke="none"
            />,
          );
        }
      }
    }

    return <g id="walkable-areas">{areas}</g>;
  };

  // 🆕 A* 경로 포인트 렌더링 함수
  const renderAStarPath = () => {
    if (!showAStarPath || !hasValidRoute) return null;

    console.log('🔍 A* 경로 렌더링 시도');
    console.log('🔍 uniqueRoute:', uniqueRoute);

    const pathElements: JSX.Element[] = [];

    uniqueRoute.forEach((routePoint, routeIndex) => {
      if (!routePoint.pathPoints || routePoint.pathPoints.length === 0) {
        console.log(
          `⚠️ RoutePoint ${routeIndex} (${routePoint.location})에 pathPoints 없음`,
        );
        return;
      }

      console.log(
        `✅ RoutePoint ${routeIndex} (${routePoint.location}): ${routePoint.pathPoints.length}개 포인트`,
      );

      // A* 경로 선 그리기
      const pathPoints = routePoint.pathPoints;
      for (let i = 0; i < pathPoints.length - 1; i++) {
        const current = pathPoints[i];
        const next = pathPoints[i + 1];

        pathElements.push(
          <line
            key={`astar-line-${routeIndex}-${i}`}
            x1={current.x}
            y1={current.y}
            x2={next.x}
            y2={next.y}
            stroke="#10b981" // 초록색으로 A* 경로 표시
            strokeWidth="4"
            opacity="0.9"
          />,
        );
      }

      // A* 경로 포인트 작은 점들 그리기
      pathPoints.forEach((point, pointIndex) => {
        if (pointIndex % 3 === 0) {
          // 3개마다 하나씩 표시
          pathElements.push(
            <circle
              key={`astar-point-${routeIndex}-${pointIndex}`}
              cx={point.x}
              cy={point.y}
              r="2"
              fill="#10b981"
              opacity="0.7"
            />,
          );
        }
      });
    });

    return <g id="astar-path">{pathElements}</g>;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div className="bg-blue-600 text-white p-3 flex items-center justify-between">
        <h3 className="font-semibold">🛒 실시간 쇼핑 지도</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDebugGrid(!showDebugGrid)}
            className="p-1 hover:bg-blue-700 rounded text-xs"
            title="디버그 그리드"
          >
            📐
          </button>
          {/* 🆕 통행 가능 영역 표시 버튼 */}
          <button
            onClick={() => setShowWalkableAreas(!showWalkableAreas)}
            className={`p-1 hover:bg-blue-700 rounded text-xs transition-colors ${
              showWalkableAreas ? 'bg-blue-700 text-white' : ''
            }`}
            title="통행 가능 영역 표시"
          >
            🟢
          </button>
          {/* 🆕 A* 경로 표시 버튼 */}
          <button
            onClick={() => setShowAStarPath(!showAStarPath)}
            className={`p-1 hover:bg-blue-700 rounded text-xs transition-colors ${
              showAStarPath ? 'bg-blue-700 text-white' : ''
            }`}
            title="A* 경로 표시"
          >
            🛤️
          </button>
          {/* 상태 표시 */}
          <div className="flex items-center gap-1 text-sm">
            <div
              className={`w-2 h-2 rounded-full ${
                robotPosition ? 'bg-green-400 animate-pulse' : 'bg-red-400'
              }`}
            />
            <span>{robotPosition ? 'LIVE' : 'OFFLINE'}</span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <div
              className={`w-2 h-2 rounded-full ${
                hasValidRoute ? 'bg-blue-400' : 'bg-gray-400'
              }`}
            />
            <span>ROUTE: {hasValidRoute ? 'ON' : 'OFF'}</span>
          </div>
          {robotPosition && (
            <div className="text-xs bg-blue-700 px-2 py-1 rounded">
              {robotPosition.type.toUpperCase()}
            </div>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-blue-700 rounded"
              title="닫기"
            >
              ❌
            </button>
          )}
        </div>
      </div>

      {/* 지도 영역 */}
      <div
        className="flex-1 overflow-hidden relative"
        style={{ maxHeight: '60vh' }}
      >
        <div
          ref={mapRef}
          style={{
            position: 'relative',
            width: MAP_CONFIG.displayWidth,
            height: MAP_CONFIG.displayHeight,
            minWidth: MAP_CONFIG.displayWidth,
            minHeight: MAP_CONFIG.displayHeight,
          }}
        >
          {/* 배경 이미지 */}
          <img
            src="/MarketMap.jpg"
            alt="마트 지도"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              zIndex: 1,
              userSelect: 'none',
              pointerEvents: 'none',
            }}
            onError={(e) => {
              console.log('마트 지도 이미지 로드 실패');
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            draggable={false}
          />

          {/* SVG 오버레이 */}
          <svg
            width={MAP_CONFIG.displayWidth}
            height={MAP_CONFIG.displayHeight}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 2,
              pointerEvents: 'none',
            }}
          >
            {/* 🆕 통행 가능 영역 렌더링 (다른 요소들보다 먼저) */}
            {renderWalkableAreas()}

            {/* 디버그 그리드 */}
            {showDebugGrid && (
              <g opacity="0.5">
                {/* 세로 그리드 라인 */}
                {Array.from({
                  length: Math.floor(MAP_CONFIG.displayWidth / 50),
                }).map((_, i) => (
                  <line
                    key={`v-${i}`}
                    x1={i * 50}
                    y1={0}
                    x2={i * 50}
                    y2={MAP_CONFIG.displayHeight}
                    stroke="#ff0000"
                    strokeWidth="1"
                  />
                ))}
                {/* 가로 그리드 라인 */}
                {Array.from({
                  length: Math.floor(MAP_CONFIG.displayHeight / 50),
                }).map((_, i) => (
                  <line
                    key={`h-${i}`}
                    x1={0}
                    y1={i * 50}
                    x2={MAP_CONFIG.displayWidth}
                    y2={i * 50}
                    stroke="#ff0000"
                    strokeWidth="1"
                  />
                ))}
                {/* 좌표 표시 */}
                {Array.from({
                  length: Math.floor(MAP_CONFIG.displayWidth / 100),
                }).map((_, i) =>
                  Array.from({
                    length: Math.floor(MAP_CONFIG.displayHeight / 100),
                  }).map((_, j) => (
                    <text
                      key={`coord-${i}-${j}`}
                      x={i * 100 + 5}
                      y={j * 100 + 15}
                      fontSize="10"
                      fill="#ff0000"
                    >
                      {i * 100},{j * 100}
                    </text>
                  )),
                )}
              </g>
            )}

            {/* 🆕 A* 경로 렌더링 (기존 경로보다 먼저) */}
            {renderAStarPath()}

            {/* 🔧 기존 직선 경로는 회색으로 변경하여 구분 */}
            {uniqueRoute.map((item, index) => {
              if (index === 0) return null;
              const prev = uniqueRoute[index - 1];

              return (
                <line
                  key={`direct-line-${index}`}
                  x1={prev.coordinates.x}
                  y1={prev.coordinates.y}
                  x2={item.coordinates.x}
                  y2={item.coordinates.y}
                  stroke="#94a3b8" // 회색으로 변경
                  strokeWidth="2"
                  strokeDasharray="10,5"
                  opacity="0.3" // 투명도 낮춤
                />
              );
            })}

            {/* 경로 포인트 표시 - 크기 축소 및 반투명 적용 */}
            {uniqueRoute.map((item, index) => {
              return (
                <g key={`point-${index}`}>
                  <circle
                    cx={item.coordinates.x}
                    cy={item.coordinates.y}
                    r="10"
                    fill="#4f46e5"
                    fillOpacity="0.7"
                    stroke="white"
                    strokeWidth="2"
                    strokeOpacity="0.9"
                  />
                  <text
                    x={item.coordinates.x}
                    y={item.coordinates.y + 3}
                    textAnchor="middle"
                    fill="white"
                    fontSize="9"
                    fontWeight="bold"
                    opacity="0.95"
                  >
                    {index + 1}
                  </text>
                  {/* 매대 이름 라벨 - 반투명 적용 */}
                  <text
                    x={item.coordinates.x}
                    y={item.coordinates.y - 20}
                    textAnchor="middle"
                    fill="#4f46e5"
                    fontSize="11"
                    fontWeight="bold"
                    opacity="0.8"
                  >
                    {item.location}
                  </text>
                  {/* 🆕 A* 경로 포인트 개수 표시 - 더 작게 */}
                 
                </g>
              );
            })}

            {/* ✅ 로봇 위치 표시 - 원본 좌표 그대로 */}
            {clampedPosition && (
              <g>
                {/* 로봇 본체 */}
                <g
                  transform={`translate(${clampedPosition.x}, ${
                    clampedPosition.y
                  }) rotate(${(clampedPosition.angle * 180) / Math.PI})`}
                >
                  {/* 로봇 몸체 */}
                  <rect
                    x="-10"
                    y="-7"
                    width="20"
                    height="14"
                    fill="#4a90e2"
                    stroke="#2563eb"
                    strokeWidth="1.5"
                    rx="3"
                  />
                  {/* 방향 표시 화살표 */}
                  <polygon points="10,0 18,-3 18,3" fill="#2563eb" />
                  {/* 로봇 아이콘 */}
                  <text
                    x="0"
                    y="1"
                    textAnchor="middle"
                    fill="white"
                    fontSize="6"
                    fontWeight="bold"
                  >
                    🛒
                  </text>
                </g>

                {/* 로봇 정보 라벨 */}
                <g
                  transform={`translate(${clampedPosition.x + 15}, ${
                    clampedPosition.y - 15
                  })`}
                >
                  <rect
                    x="0"
                    y="0"
                    width="100"
                    height="40"
                    fill="rgba(255, 255, 255, 0.7)"
                    stroke="rgba(74, 144, 226, 0.8)"
                    strokeWidth="1"
                    rx="3"
                  />
                  <text x="4" y="10" fontSize="7" fill="#333" fontWeight="bold">
                    Scout Mini ({robotPosition?.type})
                  </text>
                  {/*<text x="5" y="24" fontSize="8" fill="#666">
                    원본: ({robotPosition?.x}, {robotPosition?.y})
                  </text>
                  */}
                  <text x="4" y="22" fontSize="6" fill="#666">
                    표시: ({clampedPosition.x.toFixed(0)},{' '}
                    {clampedPosition.y.toFixed(0)})
                  </text>
                  <text x="4" y="32" fontSize="5" fill="#666">
                    {robotPosition &&
                      new Date(robotPosition.timestamp).toLocaleTimeString()}
                  </text>
                  {clampedPosition.isOutOfBounds && (
                    <text
                      x="5"
                      y="58"
                      fontSize="7"
                      fill="#ff0000"
                      fontWeight="bold"
                    >
                      ⚠️ 맵 경계 외부
                    </text>
                  )}
                </g>

                {/* 범위 외부일 때 경고 표시 */}
                {clampedPosition.isOutOfBounds && (
                  <g>
                    <circle
                      cx={clampedPosition.x}
                      cy={clampedPosition.y}
                      r="25"
                      fill="none"
                      stroke="#ff0000"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      opacity="0.7"
                    />
                  </g>
                )}
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* 하단 정보 패널 */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-3 gap-4">
          {/* 쇼핑 리스트 */}
          <div className="text-sm text-gray-700">
            <h4 className="font-semibold mb-2 flex items-center">
              🛒 쇼핑 리스트
              {hasValidItems && (
                <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                  {routeData.items.length}개
                </span>
              )}
            </h4>
            {hasValidItems ? (
              <div className="max-h-20 overflow-y-auto space-y-1 bg-white p-2 rounded border">
                {routeData.items.map((item, i) => (
                  <div
                    key={`item-${i}-${item.name}`}
                    className={`cursor-pointer py-1 px-2 rounded text-xs hover:bg-blue-50 transition-colors ${
                      selectedItem?.name === item.name
                        ? 'bg-blue-100 text-blue-700 font-bold'
                        : 'text-gray-700'
                    }`}
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="flex items-center justify-between">
                      <span>• {item.name}</span>
                      <span className="text-gray-500 text-xs">
                        {item.location} ({item.coordinates.x},{' '}
                        {item.coordinates.y})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-3 rounded border text-center">
                <p className="text-gray-500 text-xs">쇼핑 리스트가 없습니다</p>
                <p className="text-gray-400 text-xs mt-1">
                  챗봇에 "과자, 라면, 우유" 같이 입력해보세요
                </p>
              </div>
            )}
          </div>

          {/* 로봇 상태 */}
          <div className="text-sm text-gray-700">
            <h4 className="font-semibold mb-2">🤖 로봇 상태</h4>
            <div className="bg-white p-2 rounded border">
              {robotPosition ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-600 font-medium text-xs">
                      온라인 ({robotPosition.type})
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    <strong>원본 좌표:</strong> ({robotPosition.x},{' '}
                    {robotPosition.y})
                  </div>
                  {clampedPosition && (
                    <div className="text-xs text-gray-600">
                      <strong>표시 좌표:</strong> (
                      {clampedPosition.x.toFixed(0)},{' '}
                      {clampedPosition.y.toFixed(0)})
                    </div>
                  )}
                  {robotPosition.angle !== 0 && (
                    <div className="text-xs text-gray-600">
                      <strong>방향:</strong>{' '}
                      {((robotPosition.angle * 180) / Math.PI).toFixed(1)}°
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    업데이트:{' '}
                    {new Date(robotPosition.timestamp).toLocaleTimeString()}
                  </div>
                  {clampedPosition?.isOutOfBounds && (
                    <div className="text-xs text-red-600 font-bold">
                      ⚠️ 맵 범위 외부
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-red-600 font-medium text-xs">
                      오프라인
                    </span>
                  </div>
                  <div className="text-gray-500 text-xs">로봇 연결 대기중</div>
                  <div className="text-gray-400 text-xs">
                    ROS 브리지 확인 필요
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 경로 정보 */}
          <div className="text-sm text-gray-700">
            <h4 className="font-semibold mb-2">📍 경로 정보</h4>
            <div className="bg-white p-2 rounded border">
              {hasValidRoute ? (
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">
                    총 거리:{' '}
                    <span className="font-semibold text-blue-600">
                      {routeData.total_distance || 0}m
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    매대 수:{' '}
                    <span className="font-semibold text-green-600">
                      {routeData.route.length}개
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    예상 시간:{' '}
                    <span className="font-semibold text-orange-600">
                      {Math.round((routeData.total_distance || 0) / 100)}분
                    </span>
                  </div>
                  {/* 🆕 A* 경로 정보 */}
                  <div className="text-xs text-gray-600">
                    A* 경로:{' '}
                    <span
                      className={`font-semibold ${
                        showAStarPath ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {showAStarPath ? '표시됨' : '숨김'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    통행 영역:{' '}
                    <span
                      className={`font-semibold ${
                        showWalkableAreas ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {showWalkableAreas ? '표시됨' : '숨김'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-gray-500 text-xs">
                    경로가 설정되지 않았습니다
                  </div>
                  <div className="text-gray-400 text-xs">
                    쇼핑 리스트를 입력하면 자동으로 경로가 생성됩니다
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 선택된 아이템 상세 정보 */}
        {selectedItem && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-semibold text-blue-800">
                  📦 {selectedItem.name}
                </h5>
                <p className="text-sm text-blue-600">
                  위치: {selectedItem.location}
                </p>
                <p className="text-xs text-blue-500">
                  좌표: ({selectedItem.coordinates.x},{' '}
                  {selectedItem.coordinates.y})
                </p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-blue-400 hover:text-blue-600"
              >
                ❌
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 맵 정보 - 범례 추가 */}
      <div className="px-4 py-2 bg-gray-100 border-t text-xs text-gray-600 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>📐 그리드: 좌표 확인</span>
          <span>🟢 통행 영역: {showWalkableAreas ? 'ON' : 'OFF'}</span>
          <span className="text-green-600">
            🛤️ A* 경로: {showAStarPath ? 'ON' : 'OFF'}
          </span>
          <span className="text-gray-400">--- 직선 경로 (참고용)</span>
        </div>
        <div className="text-right">
          <span>
            맵: {MAP_CONFIG.displayWidth}x{MAP_CONFIG.displayHeight}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MarketMap;
