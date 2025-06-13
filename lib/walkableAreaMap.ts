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

  const walkableAreas = [
    /* A)  */
    { x1: 200, y1: 129, x2: 220, y2: 363, cost: 1 },

    /* B)  */
    { x1: 220, y1: 195, x2: 275, y2: 270, cost: 1 },
    /* C)
     */
    { x1: 287, y1: 223, x2: 419, y2: 268, cost: 1 },
    // D)
    { x1: 220, y1: 342, x2: 673, y2: 362, cost: 1 },
    // E)
    { x1: 274, y1: 268, x2: 300, y2: 343, cost: 1 },
    // F)
    { x1: 419, y1: 246, x2: 539, y2: 269, cost: 1 },
    // G)
    { x1: 652, y1: 250, x2: 673, y2: 341, cost: 1 },
    // H)
    { x1: 537, y1: 250, x2: 652, y2: 269, cost: 1 },
    // I)
    { x1: 540, y1: 122, x2: 559, y2: 248, cost: 1 },
    // J)
    { x1: 423, y1: 103, x2: 558, y2: 121, cost: 1 },
    // K)
    { x1: 512, y1: 81, x2: 558, y2: 101, cost: 1 },
  ];
  walkableAreas.forEach((area) => {
    // “x2, y2”는 깨끗하게 덮이도록 -1px 만큼 내부 그리드까지 포함시키겠습니다.
    const startX = Math.floor(area.x1 / MAP_CONFIG.cellSize);
    const endX = Math.floor((area.x2 - 1) / MAP_CONFIG.cellSize);
    const startY = Math.floor(area.y1 / MAP_CONFIG.cellSize);
    const endY = Math.floor((area.y2 - 1) / MAP_CONFIG.cellSize);

    for (let gy = startY; gy <= endY && gy < gridHeight; gy++) {
      for (let gx = startX; gx <= endX && gx < gridWidth; gx++) {
        if (grid[gy] && grid[gy][gx]) {
          grid[gy][gx].walkable = true;
          grid[gy][gx].cost = area.cost;
        }
      }
    }
  });

  // 🚫 명시적으로 매대 21-30 구역을 장애물로 설정 (확실히 차단)

  const obstacleAreas = [
    { x1: 223, y1: 274, x2: 269, y2: 338 },

    { x1: 306, y1: 274, x2: 648, y2: 337 },

    { x1: 424, y1: 167, x2: 532, y2: 240 },
    { x1: 392, y1: 132, x2: 534, y2: 156 },
  ];

  obstacleAreas.forEach((area) => {
    const startX = Math.floor(area.x1 / MAP_CONFIG.cellSize);
    const endX = Math.floor((area.x2 - 1) / MAP_CONFIG.cellSize);
    const startY = Math.floor(area.y1 / MAP_CONFIG.cellSize);
    const endY = Math.floor((area.y2 - 1) / MAP_CONFIG.cellSize);

    for (let gy = startY; gy <= endY && gy < gridHeight; gy++) {
      for (let gx = startX; gx <= endX && gx < gridWidth; gx++) {
        if (grid[gy] && grid[gy][gx]) {
          grid[gy][gx].walkable = false;
          grid[gy][gx].cost = 999;
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
