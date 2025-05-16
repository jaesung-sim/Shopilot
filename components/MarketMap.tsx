// components/MarketMap.tsx
import React, { useState, useRef } from 'react';
import { RouteData, Product, PathPoint, RoutePoint } from '@/interfaces/route';

// RouteItem 타입 정의 (경로 포인트 포함)
interface RouteItem {
  order: number;
  item: string;
  location: string;
  section: string;
  coordinates: { x: number; y: number };
  pathPoints?: PathPoint[]; // 이전 지점에서 이 지점까지의 상세 경로
}

// 마트맵 컴포넌트 Props
interface MarketMapProps {
  routeData?: RouteData;
  onClose?: () => void;
}

const MarketMap: React.FC<MarketMapProps> = ({ routeData, onClose }) => {
  const [zoom, setZoom] = useState<number>(1);
  const [selectedItem, setSelectedItem] = useState<Product | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // 고정 맵 크기 상수
  const mapDimensions = { width: 1300, height: 850 };

  // 줌 인/아웃 처리
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.2, 0.5));
  };

  // 아이템 선택 처리
  const handleItemClick = (item: Product) => {
    setSelectedItem(item);
  };

  if (!routeData) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg border border-gray-200 p-4">
        <p className="text-gray-500">
          경로 데이터가 없습니다. 쇼핑 물품을 입력해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* 지도 헤더 */}
      <div className="bg-blue-600 text-white p-3 flex items-center justify-between">
        <h3 className="font-semibold">🛒 쇼핑 경로</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomIn}
            className="p-1 hover:bg-blue-700 rounded"
            title="확대"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1 hover:bg-blue-700 rounded"
            title="축소"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-blue-700 rounded"
              title="닫기"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
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

            {/* 1층 타이틀 */}
            <text x="70" y="80" fontSize="80" fontWeight="bold">
              1F
            </text>
            <text x="30" y="145" fontSize="20">
              식료품 / 다이소 /생활식품
            </text>

            {/* 상단 카테고리 영역 */}
            <rect
              x="500"
              y="20"
              width="155"
              height="50"
              fill="#a8e6ff"
              stroke="#000"
            />
            <rect
              x="655"
              y="20"
              width="155"
              height="50"
              fill="#a8e6ff"
              stroke="#000"
            />
            <rect
              x="810"
              y="20"
              width="210"
              height="50"
              fill="#a8e6ff"
              stroke="#000"
            />
            <rect
              x="1020"
              y="20"
              width="150"
              height="50"
              fill="#a8e6ff"
              stroke="#000"
            />
            <rect
              x="1170"
              y="20"
              width="120"
              height="50"
              fill="#a8e6ff"
              stroke="#000"
            />

            <text x="570" y="50" textAnchor="middle" fontSize="18">
              수산
            </text>
            <text x="732" y="50" textAnchor="middle" fontSize="18">
              닭고기
            </text>
            <text x="915" y="50" textAnchor="middle" fontSize="18">
              돼지고기
            </text>
            <text x="1095" y="50" textAnchor="middle" fontSize="18">
              소고기
            </text>
            <text x="1230" y="50" textAnchor="middle" fontSize="18">
              계란
            </text>

            {/* 우측 카테고리 영역 */}
            <rect
              x="1290"
              y="70"
              width="60"
              height="150"
              fill="#a8e6ff"
              stroke="#000"
            />
            <rect
              x="1290"
              y="220"
              width="60"
              height="150"
              fill="#a8e6ff"
              stroke="#000"
            />
            <rect
              x="1290"
              y="370"
              width="60"
              height="240"
              fill="#a8e6ff"
              stroke="#000"
            />

            <text
              x="1320"
              y="185"
              textAnchor="middle"
              fontSize="18"
              writingMode="tb"
            >
              신선식품
            </text>
            <text
              x="1320"
              y="350"
              textAnchor="middle"
              fontSize="18"
              writingMode="tb"
            >
              반찬
            </text>
            <text
              x="1320"
              y="490"
              textAnchor="middle"
              fontSize="18"
              writingMode="tb"
            >
              채소&야채
            </text>

            {/* 섹션 01, 02, 03 영역 */}
            <rect
              x="30"
              y="80"
              width="60"
              height="120"
              fill="#ffeba8"
              stroke="#000"
            />
            <rect
              x="30"
              y="250"
              width="60"
              height="120"
              fill="#ffeba8"
              stroke="#000"
            />
            <rect
              x="30"
              y="400"
              width="60"
              height="120"
              fill="#ffeba8"
              stroke="#000"
            />

            <text x="60" y="140" textAnchor="middle" fontSize="18">
              01
            </text>
            <text x="60" y="310" textAnchor="middle" fontSize="18">
              02
            </text>
            <text x="60" y="460" textAnchor="middle" fontSize="18">
              03
            </text>

            {/* 섹션 04-07 영역 */}
            <rect
              x="500"
              y="250"
              width="70"
              height="110"
              fill="#ffeba8"
              stroke="#000"
            />
            <rect
              x="570"
              y="250"
              width="70"
              height="110"
              fill="#ffeba8"
              stroke="#000"
            />
            <rect
              x="500"
              y="400"
              width="70"
              height="120"
              fill="#ffeba8"
              stroke="#000"
            />
            <rect
              x="570"
              y="400"
              width="70"
              height="120"
              fill="#ffeba8"
              stroke="#000"
            />

            <text x="535" y="305" textAnchor="middle" fontSize="18">
              04
            </text>
            <text x="605" y="305" textAnchor="middle" fontSize="18">
              05
            </text>
            <text x="535" y="460" textAnchor="middle" fontSize="18">
              06
            </text>
            <text x="605" y="460" textAnchor="middle" fontSize="18">
              07
            </text>

            {/* 섹션 08-14 (첫 번째 행) */}
            {Array.from({ length: 7 }).map((_, i) => (
              <React.Fragment key={`section-row1-${i}`}>
                <rect
                  x={695 + i * 62}
                  y="230"
                  width="62"
                  height="100"
                  fill="#ffeba8"
                  stroke="#000"
                />
                <text
                  x={726 + i * 62}
                  y="280"
                  textAnchor="middle"
                  fontSize="18"
                >
                  {String(8 + i).padStart(2, '0')}
                </text>
              </React.Fragment>
            ))}

            {/* 섹션 15-21 (두 번째 행) */}
            {Array.from({ length: 7 }).map((_, i) => (
              <React.Fragment key={`section-row2-${i}`}>
                <rect
                  x={695 + i * 62}
                  y="345"
                  width="62"
                  height="100"
                  fill="#ffeba8"
                  stroke="#000"
                />
                <text
                  x={726 + i * 62}
                  y="395"
                  textAnchor="middle"
                  fontSize="18"
                >
                  {String(15 + i).padStart(2, '0')}
                </text>
              </React.Fragment>
            ))}

            {/* 섹션 22-37 영역 (중앙 상단) */}
            <rect
              x="540"
              y="100"
              width="35"
              height="80"
              fill="#ffeba8"
              stroke="#000"
            />
            <text x="558" y="140" textAnchor="middle" fontSize="16">
              22
            </text>

            {/* 섹션 23-28 영역 (중앙 상단 그룹) */}
            <rect
              x="575"
              y="100"
              width="62"
              height="47"
              fill="#ffeba8"
              stroke="#000"
            />
            <rect
              x="637"
              y="100"
              width="75"
              height="47"
              fill="#ffeba8"
              stroke="#000"
            />
            <rect
              x="712"
              y="100"
              width="60"
              height="47"
              fill="#ffeba8"
              stroke="#000"
            />
            <rect
              x="575"
              y="147"
              width="62"
              height="47"
              fill="#ffeba8"
              stroke="#000"
            />
            <rect
              x="637"
              y="147"
              width="75"
              height="47"
              fill="#ffeba8"
              stroke="#000"
            />
            <rect
              x="712"
              y="147"
              width="60"
              height="47"
              fill="#ffeba8"
              stroke="#000"
            />

            <text x="606" y="124" textAnchor="middle" fontSize="16">
              23
            </text>
            <text x="675" y="124" textAnchor="middle" fontSize="16">
              24
            </text>
            <text x="742" y="124" textAnchor="middle" fontSize="16">
              25
            </text>
            <text x="606" y="158" textAnchor="middle" fontSize="16">
              26
            </text>
            <text x="675" y="158" textAnchor="middle" fontSize="16">
              27
            </text>
            <text x="742" y="158" textAnchor="middle" fontSize="16">
              28
            </text>

            <rect
              x="772"
              y="100"
              width="45"
              height="80"
              fill="#ffeba8"
              stroke="#000"
            />
            <text x="795" y="140" textAnchor="middle" fontSize="16">
              29
            </text>

            <rect
              x="852"
              y="100"
              width="45"
              height="80"
              fill="#ffeba8"
              stroke="#000"
            />
            <text x="875" y="140" textAnchor="middle" fontSize="16">
              30
            </text>

            {/* 섹션 31-36 영역 */}
            <rect
              x="897"
              y="100"
              width="56"
              height="47"
              fill="#ffeba8"
              stroke="#000"
            />
            <rect
              x="953"
              y="100"
              width="82"
              height="47"
              fill="#ffeba8"
              stroke="#000"
            />
            <rect
              x="1035"
              y="100"
              width="54"
              height="47"
              fill="#ffeba8"
              stroke="#000"
            />
            <rect
              x="897"
              y="147"
              width="56"
              height="47"
              fill="#ffeba8"
              stroke="#000"
            />
            <rect
              x="953"
              y="147"
              width="82"
              height="47"
              fill="#ffeba8"
              stroke="#000"
            />
            <rect
              x="1035"
              y="147"
              width="54"
              height="47"
              fill="#ffeba8"
              stroke="#000"
            />

            <text x="925" y="124" textAnchor="middle" fontSize="16">
              31
            </text>
            <text x="994" y="124" textAnchor="middle" fontSize="16">
              32
            </text>
            <text x="1062" y="124" textAnchor="middle" fontSize="16">
              33
            </text>
            <text x="925" y="158" textAnchor="middle" fontSize="16">
              34
            </text>
            <text x="994" y="158" textAnchor="middle" fontSize="16">
              35
            </text>
            <text x="1062" y="158" textAnchor="middle" fontSize="16">
              36
            </text>

            <rect
              x="1089"
              y="100"
              width="48"
              height="80"
              fill="#ffeba8"
              stroke="#000"
            />
            <text x="1113" y="140" textAnchor="middle" fontSize="16">
              37
            </text>

            {/* 섹션 38-49 영역 (우측 2열) */}
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <React.Fragment key={`right-section-${row}`}>
                <rect
                  x="1170"
                  y={100 + row * 70}
                  width="60"
                  height="70"
                  fill="#ffeba8"
                  stroke="#000"
                />
                <rect
                  x="1230"
                  y={100 + row * 70}
                  width="60"
                  height="70"
                  fill="#ffeba8"
                  stroke="#000"
                />
                <text
                  x="1200"
                  y={140 + row * 70}
                  textAnchor="middle"
                  fontSize="16"
                >
                  {String(38 + row * 2).padStart(2, '0')}
                </text>
                <text
                  x="1236"
                  y={140 + row * 70}
                  textAnchor="middle"
                  fontSize="16"
                >
                  {String(39 + row * 2).padStart(2, '0')}
                </text>
              </React.Fragment>
            ))}

            {/* 다이소 영역 */}
            <rect
              x="380"
              y="647"
              width="335"
              height="73"
              fill="#ffb8b8"
              stroke="#000"
            />
            <text x="530" y="685" textAnchor="middle" fontSize="24">
              다이소
            </text>

            {/* 계산대 영역 */}
            {Array.from({ length: 7 }).map((_, i) => (
              <rect
                key={`checkout-${i}`}
                x={790 + i * 62}
                y="636"
                width="40"
                height="40"
                fill="#d9d9d9"
                stroke="#000"
              />
            ))}
            {Array.from({ length: 7 }).map((_, i) => (
              <text
                key={`checkout-text-${i}`}
                x={810 + i * 62}
                y="656"
                textAnchor="middle"
                fontSize="12"
              >
                계산대
              </text>
            ))}

            {/* 고객센터 */}
            <rect
              x="1200"
              y="730"
              width="100"
              height="90"
              fill="#d9d9d9"
              stroke="#000"
            />
            <text x="1250" y="775" textAnchor="middle" fontSize="18">
              고객센터
            </text>

            {/* 입구/카트 영역 */}
            <text x="530" y="680" textAnchor="middle" fontSize="16">
              🛒
            </text>

            {/* 경로 그리기 - 개선된 방식 */}
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

                {/* 각 경로 세그먼트 그리기 - 문제 1 해결 */}
                {routeData.route.map((item: RoutePoint, index) => {
                  // pathPoints가 있을 경우 상세 경로 사용
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
                        stroke={`hsl(${(index * 30) % 360}, 70%, 60%)`}
                        strokeWidth="3"
                        fill="none"
                        strokeDasharray="5,5"
                        markerEnd="url(#arrowhead)"
                      />
                    );
                  }
                  // pathPoints가 없는 경우 기본 직선 경로 사용
                  else if (index > 0) {
                    const prevItem = routeData.route[index - 1];
                    return (
                      <path
                        key={`path-${index}`}
                        d={`M${prevItem.coordinates.x},${prevItem.coordinates.y} L${item.coordinates.x},${item.coordinates.y}`}
                        stroke="#4f46e5"
                        strokeWidth="3"
                        fill="none"
                        strokeDasharray="5,5"
                        markerEnd="url(#arrowhead)"
                      />
                    );
                  }
                  // 첫 번째 아이템이고 pathPoints가 없는 경우 입구에서 시작
                  else if (index === 0) {
                    return (
                      <path
                        key={`path-${index}`}
                        d={`M530,680 L${item.coordinates.x},${item.coordinates.y}`}
                        stroke="#4f46e5"
                        strokeWidth="3"
                        fill="none"
                        strokeDasharray="5,5"
                        markerEnd="url(#arrowhead)"
                      />
                    );
                  }

                  return null;
                })}

                {/* 경로 중간 지점 표시 (선택 사항) */}
                {routeData.route.map((item, routeIndex) => {
                  if (!item.pathPoints || item.pathPoints.length <= 2)
                    return null;

                  // 첫 지점과 마지막 지점을 제외한 중간 지점만 표시
                  return item.pathPoints
                    .slice(1, -1)
                    .map((point, pointIndex) => (
                      <circle
                        key={`waypoint-${routeIndex}-${pointIndex}`}
                        cx={point.x}
                        cy={point.y}
                        r="3"
                        fill={`hsl(${(routeIndex * 30) % 360}, 70%, 60%)`}
                        opacity="0.7"
                      />
                    ));
                })}

                {/* 경로 상의 순서 마커 */}
                {routeData.route.map((point, index) => (
                  <g key={`marker-${index}`}>
                    <circle
                      cx={point.coordinates.x}
                      cy={point.coordinates.y}
                      r="15"
                      fill="#4f46e5"
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
          </svg>
        </div>
      </div>

      {/* 하단 정보 영역 */}
      <div className="p-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4">
          {/* 좌측: 쇼핑 리스트 */}
          <div className="border rounded-lg p-3 bg-gray-50">
            <h4 className="font-semibold mb-2">쇼핑 리스트</h4>
            <ul className="space-y-1">
              {routeData.items.map((item, index) => (
                <li
                  key={index}
                  className={`cursor-pointer ${
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
          </div>

          {/* 우측: 선택 아이템 상세 정보 */}
          <div className="border rounded-lg p-3 bg-gray-50">
            {selectedItem ? (
              <div>
                <h4 className="font-semibold mb-2">{selectedItem.name} 정보</h4>
                <p>위치: {selectedItem.location}</p>
                <p>구역: {selectedItem.section}</p>
              </div>
            ) : (
              <div>
                <h4 className="font-semibold mb-2">경로 정보</h4>
                <p>총 이동 거리: {routeData.total_distance}m</p>
                <p>
                  예상 소요 시간: {Math.round(routeData.total_distance / 10)}분
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketMap;
