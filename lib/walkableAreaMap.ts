// lib/walkableAreaMap.ts - 그리드 좌표 기반 정확한 통행 가능 영역 정의

export interface GridCell {
  x: number;
  y: number;
  walkable: boolean;
  cost: number; // 1: 일반 통로, 2: 좁은 통로, 999: 장애물
}

export interface WalkableAreaMap {
  width: number;
  height: number;
  cellSize: number; // 각 셀의 픽셀 크기
  grid: GridCell[][];
}

// 맵 크기 설정 (기존 맵과 동일)
export const MAP_CONFIG = {
  displayWidth: 896,
  displayHeight: 504,
  cellSize: 10, // 10px 단위로 그리드 생성
};

// 통행 가능 영역 맵 생성 함수
export function createWalkableAreaMap(): WalkableAreaMap {
  const gridWidth = Math.ceil(MAP_CONFIG.displayWidth / MAP_CONFIG.cellSize);
  const gridHeight = Math.ceil(MAP_CONFIG.displayHeight / MAP_CONFIG.cellSize);

  // 기본적으로 모든 영역을 장애물로 설정
  const grid: GridCell[][] = [];

  for (let y = 0; y < gridHeight; y++) {
    grid[y] = [];
    for (let x = 0; x < gridWidth; x++) {
      grid[y][x] = {
        x: x * MAP_CONFIG.cellSize,
        y: y * MAP_CONFIG.cellSize,
        walkable: false,
        cost: 999,
      };
    }
  }

  // 🎯 그리드 좌표 기반 정확한 통행 가능 영역 정의
  const walkableAreas = [
    // 1. 주차장 영역 (P 주변)
    { x1: 200, y1: 180, x2: 400, y2: 300, cost: 1 },

    // 2. 상단 가로 복도 (매대 20 ↔ 매대 21-30 사이)
    { x1: 280, y1: 300, x2: 820, y2: 380, cost: 1 },

    // 3. 하단 가로 복도 (매대 21-30 ↔ 매대 5-12 사이)
    { x1: 280, y1: 480, x2: 820, y2: 510, cost: 1 },

    // 4. 왼쪽 세로 복도 (매대 20 왼쪽)
    { x1: 280, y1: 300, x2: 300, y2: 510, cost: 1 },

    // 5. 오른쪽 세로 복도 (매대 13 왼쪽, 정육 매대 옆)
    { x1: 750, y1: 300, x2: 770, y2: 510, cost: 1 },

    // 6. 계산대 접근 통로
    { x1: 400, y1: 200, x2: 700, y2: 300, cost: 1 },

    // 7. 우측 상단 영역 (매대 14-19 접근)
    { x1: 700, y1: 100, x2: 800, y2: 300, cost: 1 },

    // 8. 주차장과 상단 복도 연결
    { x1: 280, y1: 280, x2: 400, y2: 320, cost: 1 },

    // 9. 계산대 앞 공간
    { x1: 400, y1: 280, x2: 600, y2: 320, cost: 1 },

    // 10. 매대 1-3 접근 통로 (왼쪽)
    { x1: 180, y1: 280, x2: 280, y2: 380, cost: 1 },

    // 11. 매대 4번 접근 통로 (하단 왼쪽)
    { x1: 180, y1: 480, x2: 280, y2: 520, cost: 1 },

    // 12. 매대 12번 접근 통로 (하단 오른쪽)
    { x1: 770, y1: 480, x2: 800, y2: 520, cost: 1 },
  ];

  // 통행 가능 영역을 그리드에 적용
  walkableAreas.forEach((area) => {
    const startX = Math.floor(area.x1 / MAP_CONFIG.cellSize);
    const endX = Math.floor(area.x2 / MAP_CONFIG.cellSize);
    const startY = Math.floor(area.y1 / MAP_CONFIG.cellSize);
    const endY = Math.floor(area.y2 / MAP_CONFIG.cellSize);

    for (let y = startY; y <= endY && y < gridHeight; y++) {
      for (let x = startX; x <= endX && x < gridWidth; x++) {
        if (grid[y] && grid[y][x]) {
          grid[y][x].walkable = true;
          grid[y][x].cost = area.cost;
        }
      }
    }
  });

  // 🚫 명시적으로 매대 21-30 구역을 장애물로 설정 (확실히 차단)
  const obstacleAreas = [
    // 매대 21-30 구역 (완전 차단)
    { x1: 300, y1: 380, x2: 750, y2: 480 },

    // 매대 20 구역
    { x1: 200, y1: 380, x2: 280, y2: 480 },

    // 매대 13 구역
    { x1: 750, y1: 380, x2: 800, y2: 480 },

    // 매대 5-12 구역
    { x1: 280, y1: 510, x2: 750, y2: 550 },
  ];

  obstacleAreas.forEach((area) => {
    const startX = Math.floor(area.x1 / MAP_CONFIG.cellSize);
    const endX = Math.floor(area.x2 / MAP_CONFIG.cellSize);
    const startY = Math.floor(area.y1 / MAP_CONFIG.cellSize);
    const endY = Math.floor(area.y2 / MAP_CONFIG.cellSize);

    for (let y = startY; y <= endY && y < gridHeight; y++) {
      for (let x = startX; x <= endX && x < gridWidth; x++) {
        if (grid[y] && grid[y][x]) {
          grid[y][x].walkable = false;
          grid[y][x].cost = 999;
        }
      }
    }
  });

  console.log('🗺️ 수정된 통행 가능 맵 생성 완료:', {
    총_그리드: `${gridWidth}x${gridHeight}`,
    통행가능영역: walkableAreas.length,
    장애물영역: obstacleAreas.length,
    셀크기: MAP_CONFIG.cellSize,
  });

  return {
    width: gridWidth,
    height: gridHeight,
    cellSize: MAP_CONFIG.cellSize,
    grid,
  };
}

// 좌표를 그리드 인덱스로 변환
export function pixelToGrid(
  x: number,
  y: number,
): { gridX: number; gridY: number } {
  return {
    gridX: Math.floor(x / MAP_CONFIG.cellSize),
    gridY: Math.floor(y / MAP_CONFIG.cellSize),
  };
}

// 그리드 인덱스를 좌표로 변환
export function gridToPixel(
  gridX: number,
  gridY: number,
): { x: number; y: number } {
  return {
    x: gridX * MAP_CONFIG.cellSize + MAP_CONFIG.cellSize / 2,
    y: gridY * MAP_CONFIG.cellSize + MAP_CONFIG.cellSize / 2,
  };
}

// 특정 좌표가 통행 가능한지 확인
export function isWalkable(
  x: number,
  y: number,
  walkableMap: WalkableAreaMap,
): boolean {
  const { gridX, gridY } = pixelToGrid(x, y);

  if (
    gridY < 0 ||
    gridY >= walkableMap.height ||
    gridX < 0 ||
    gridX >= walkableMap.width
  ) {
    return false;
  }

  return walkableMap.grid[gridY][gridX].walkable;
}

// 가장 가까운 통행 가능한 지점 찾기
export function findNearestWalkable(
  targetX: number,
  targetY: number,
  walkableMap: WalkableAreaMap,
): { x: number; y: number } | null {
  const { gridX: targetGridX, gridY: targetGridY } = pixelToGrid(
    targetX,
    targetY,
  );

  // 이미 통행 가능한 지점이면 그대로 반환
  if (isWalkable(targetX, targetY, walkableMap)) {
    return { x: targetX, y: targetY };
  }

  // 반경을 늘려가며 가장 가까운 통행 가능 지점 찾기
  for (let radius = 1; radius <= 30; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

        const checkGridX = targetGridX + dx;
        const checkGridY = targetGridY + dy;

        if (
          checkGridY >= 0 &&
          checkGridY < walkableMap.height &&
          checkGridX >= 0 &&
          checkGridX < walkableMap.width
        ) {
          if (walkableMap.grid[checkGridY][checkGridX].walkable) {
            const { x, y } = gridToPixel(checkGridX, checkGridY);
            console.log(
              `🔧 좌표 조정: (${targetX}, ${targetY}) → (${x}, ${y})`,
            );
            return { x, y };
          }
        }
      }
    }
  }

  console.warn(`⚠️ 통행 가능한 지점을 찾을 수 없음: (${targetX}, ${targetY})`);
  return null;
}

// 🧪 디버깅용 함수 - 특정 지점의 통행 가능 여부 확인
export function debugWalkableStatus(
  x: number,
  y: number,
  walkableMap: WalkableAreaMap,
) {
  const { gridX, gridY } = pixelToGrid(x, y);
  const isWalkableResult = isWalkable(x, y, walkableMap);

  console.log(`🔍 디버그 - 좌표 (${x}, ${y}):`, {
    그리드좌표: `(${gridX}, ${gridY})`,
    통행가능: isWalkableResult,
    비용: walkableMap.grid[gridY]?.[gridX]?.cost || 'N/A',
  });

  return isWalkableResult;
}
