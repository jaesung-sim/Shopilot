// components/MarketMap.tsx - 쇼핑리스트 표시 및 맵 크기 최적화
import React, { useState, useRef, useEffect } from 'react';
import { RouteData, Product } from '@/interfaces/route';
import { deduplicateRouteByLocation } from '@/lib/utils';
import ROSLIB from 'roslib';

interface RobotPosition {
  x: number;
  y: number;
  angle: number;
  timestamp: number;
}

interface MarketMapProps {
  routeData?: RouteData;
  robotPosition?: RobotPosition;
  onClose?: () => void;
}

const MarketMap: React.FC<MarketMapProps> = ({
  routeData,
  robotPosition,
  onClose,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [selectedItem, setSelectedItem] = useState<Product | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const mapWidth = 1280;
  const mapHeight = 720;

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

  // 컨테이너 크기에 맞는 초기 줌 레벨 계산
  useEffect(() => {
    if (mapContainerRef.current) {
      const container = mapContainerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      const scaleX = containerWidth / mapWidth;
      const scaleY = containerHeight / mapHeight;
      const initialZoom = Math.min(scaleX, scaleY, 1); // 최대 1배까지만

      setZoom(initialZoom);
    }
  }, []);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.3));

  const handleItemClick = (item: Product) => setSelectedItem(item);

  // 드래그 이벤트 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 맵 리셋
  const resetMapView = () => {
    setPanOffset({ x: 0, y: 0 });
    if (mapContainerRef.current) {
      const container = mapContainerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      const scaleX = containerWidth / mapWidth;
      const scaleY = containerHeight / mapHeight;
      const initialZoom = Math.min(scaleX, scaleY, 1);

      setZoom(initialZoom);
    }
  };
  const uniqueRoute = routeData?.route
    ? deduplicateRouteByLocation(routeData.route)
    : [];
  useEffect(() => {
    console.log('[🧪 DEBUG] routeData:', routeData);
    console.log('[🧪 DEBUG] uniqueRoute:', uniqueRoute);
  }, [routeData]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div className="bg-blue-600 text-white p-3 flex items-center justify-between">
        <h3 className="font-semibold">🛒 실시간 쇼핑 지도</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomIn}
            className="p-1 hover:bg-blue-700 rounded"
            title="확대"
          >
            ＋
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1 hover:bg-blue-700 rounded"
            title="축소"
          >
            －
          </button>
          <button
            onClick={resetMapView}
            className="p-1 hover:bg-blue-700 rounded text-xs"
            title="맵 리셋"
          >
            🎯
          </button>
          {/* 상태 표시 */}
          <div className="flex items-center gap-1 text-sm">
            <div
              className={`w-2 h-2 rounded-full ${
                robotPosition ? 'bg-green-400' : 'bg-red-400'
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
        ref={mapContainerRef}
        className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          ref={mapRef}
          style={{
            position: 'relative',
            width: mapWidth,
            height: mapHeight,
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
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
            width={mapWidth}
            height={mapHeight}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 2,
              pointerEvents: 'none',
            }}
          >
            {/* 경로 선 표시 */}
            {uniqueRoute.map((item, index) => {
              if (index === 0) return null;
              const prev = uniqueRoute[index - 1];
              return (
                <line
                  key={`line-${index}`}
                  x1={prev.coordinates.x}
                  y1={prev.coordinates.y}
                  x2={item.coordinates.x}
                  y2={item.coordinates.y}
                  stroke="#4f46e5"
                  strokeWidth="3"
                  strokeDasharray="5,5"
                  opacity="0.8"
                />
              );
            })}

            {/* 경로 포인트 표시 */}
            {uniqueRoute.map((item, index) => (
              <g key={`point-${index}`}>
                <circle
                  cx={item.coordinates.x}
                  cy={item.coordinates.y}
                  r="12"
                  fill="#4f46e5"
                  stroke="white"
                  strokeWidth="3"
                />
                <text
                  x={item.coordinates.x}
                  y={item.coordinates.y + 4}
                  textAnchor="middle"
                  fill="white"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {index + 1}
                </text>
              </g>
            ))}

            {/* 로봇 위치 표시 */}
            {robotPosition && (
              <g
                transform={`translate(${robotPosition.x}, ${
                  robotPosition.y
                }) rotate(${(robotPosition.angle * 180) / Math.PI})`}
              >
                <rect
                  x="-15"
                  y="-10"
                  width="30"
                  height="20"
                  fill="#ff4444"
                  stroke="#cc0000"
                  strokeWidth="2"
                  rx="4"
                />
                <polygon points="15,0 25,-5 25,5" fill="#cc0000" />
                <text
                  x="0"
                  y="2"
                  textAnchor="middle"
                  fill="white"
                  fontSize="8"
                  fontWeight="bold"
                >
                  🤖
                </text>
              </g>
            )}

            {/* 로봇 위치 정보 라벨 */}
            {robotPosition && (
              <g
                transform={`translate(${robotPosition.x + 20}, ${
                  robotPosition.y - 20
                })`}
              >
                <rect
                  x="0"
                  y="0"
                  width="100"
                  height="40"
                  fill="rgba(255, 255, 255, 0.9)"
                  stroke="#ff4444"
                  strokeWidth="1"
                  rx="4"
                />
                <text x="5" y="12" fontSize="8" fill="#333">
                  Scout Mini
                </text>
                <text x="5" y="24" fontSize="7" fill="#666">
                  ({robotPosition.x.toFixed(1)}, {robotPosition.y.toFixed(1)})
                </text>
                <text x="5" y="36" fontSize="7" fill="#666">
                  {new Date(robotPosition.timestamp).toLocaleTimeString()}
                </text>
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
                        {item.location}
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
                      온라인
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    위치: ({robotPosition.x.toFixed(1)},{' '}
                    {robotPosition.y.toFixed(1)})
                  </div>
                  <div className="text-xs text-gray-600">
                    방향: {((robotPosition.angle * 180) / Math.PI).toFixed(1)}°
                  </div>
                  <div className="text-xs text-gray-500">
                    업데이트:{' '}
                    {new Date(robotPosition.timestamp).toLocaleTimeString()}
                  </div>
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
                  <div className="mt-2 pt-2 border-t">
                    <div className="text-xs text-gray-500">
                      경로 상태:{' '}
                      <span className="text-green-600">✓ 준비됨</span>
                    </div>
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
                  {routeData && (
                    <div className="text-xs text-gray-400 mt-1 pt-1 border-t">
                      디버그: route={routeData.route ? '✅' : '❌'} | items=
                      {routeData.items ? '✅' : '❌'}
                    </div>
                  )}
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
                  위치: {selectedItem.location} ({selectedItem.coordinates.x},{' '}
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

      {/* 맵 조작 안내 */}
      <div className="px-4 py-2 bg-gray-100 border-t text-xs text-gray-600 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>🖱️ 드래그: 맵 이동</span>
          <span>🔍 버튼: 확대/축소</span>
          <span>🎯 리셋: 초기 위치</span>
        </div>
        <div className="text-right">
          <span>줌: {Math.round(zoom * 100)}%</span>
        </div>
      </div>
    </div>
  );
};

export default MarketMap;
