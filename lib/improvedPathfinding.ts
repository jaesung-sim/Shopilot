// lib/improvedPathfinding.ts - 통행 가능 영역을 고려한 A* 알고리즘

import { WalkableAreaMap, pixelToGrid, gridToPixel, isWalkable, findNearestWalkable } from './walkableAreaMap';

interface PathNode {
  gridX: number;
  gridY: number;
  g: number; // 시작점에서의 실제 비용
  h: number; // 목표점까지의 휴리스틱 비용  
  f: number; // g + h
  parent: PathNode | null;
  cost: number; // 이 노드의 이동 비용
}

interface PathPoint {
  x: number;
  y: number;
}

// 맨해튼 거리 휴리스틱
function heuristic(a: PathNode, b: PathNode): number {
  return Math.abs(a.gridX - b.gridX) + Math.abs(a.gridY - b.gridY);
}

// 두 그리드 포인트 간의 실제 거리
function gridDistance(a: PathNode, b: PathNode): number {
  const dx = Math.abs(a.gridX - b.gridX);
  const dy = Math.abs(a.gridY - b.gridY);
  
  // 대각선 이동인 경우
  if (dx === 1 && dy === 1) {
    return Math.sqrt(2); // 대각선 거리
  }
  // 직선 이동인 경우
  return dx + dy;
}

// 8방향 이웃 노드 가져오기
function getNeighbors(node: PathNode, walkableMap: WalkableAreaMap): PathNode[] {
  const neighbors: PathNode[] = [];
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];
  
  directions.forEach(([dx, dy]) => {
    const newGridX = node.gridX + dx;
    const newGridY = node.gridY + dy;
    
    // 맵 경계 확인
    if (newGridX < 0 || newGridX >= walkableMap.width || 
        newGridY < 0 || newGridY >= walkableMap.height) {
      return;
    }
    
    const cell = walkableMap.grid[newGridY][newGridX];
    
    // 통행 불가능한 영역 제외
    if (!cell.walkable) {
      return;
    }
    
    // 대각선 이동 시 코너 컷팅 방지
    if (Math.abs(dx) === 1 && Math.abs(dy) === 1) {
      const horizontal = walkableMap.grid[node.gridY][newGridX];
      const vertical = walkableMap.grid[newGridY][node.gridX];
      
      if (!horizontal.walkable || !vertical.walkable) {
        return; // 대각선 이동 불가
      }
    }
    
    neighbors.push({
      gridX: newGridX,
      gridY: newGridY,
      g: 0,
      h: 0,
      f: 0,
      parent: node,
      cost: cell.cost
    });
  });
  
  return neighbors;
}

// 노드가 리스트에 있는지 확인
function findNodeInList(node: PathNode, list: PathNode[]): PathNode | null {
  return list.find(n => n.gridX === node.gridX && n.gridY === node.gridY) || null;
}

// 리스트에서 노드 제거
function removeNodeFromList(node: PathNode, list: PathNode[]): void {
  const index = list.findIndex(n => n.gridX === node.gridX && n.gridY === node.gridY);
  if (index > -1) {
    list.splice(index, 1);
  }
}

// A* 알고리즘 구현
export function findPathWithObstacles(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  walkableMap: WalkableAreaMap
): PathPoint[] {
  console.log(`🗺️ A* 경로 찾기 시작: (${startX}, ${startY}) → (${endX}, ${endY})`);
  
  // 시작점과 끝점을 가장 가까운 통행 가능 지점으로 조정
  const adjustedStart = findNearestWalkable(startX, startY, walkableMap);
  const adjustedEnd = findNearestWalkable(endX, endY, walkableMap);
  
  if (!adjustedStart || !adjustedEnd) {
    console.error('❌ 시작점 또는 끝점에서 통행 가능한 영역을 찾을 수 없음');
    return [];
  }
  
  const startGrid = pixelToGrid(adjustedStart.x, adjustedStart.y);
  const endGrid = pixelToGrid(adjustedEnd.x, adjustedEnd.y);
  
  // 시작 노드 생성
  const startNode: PathNode = {
    gridX: startGrid.gridX,
    gridY: startGrid.gridY,
    g: 0,
    h: 0,
    f: 0,
    parent: null,
    cost: walkableMap.grid[startGrid.gridY][startGrid.gridX].cost
  };
  
  const endNode: PathNode = {
    gridX: endGrid.gridX,
    gridY: endGrid.gridY,
    g: 0,
    h: 0,
    f: 0,
    parent: null,
    cost: walkableMap.grid[endGrid.gridY][endGrid.gridX].cost
  };
  
  startNode.h = heuristic(startNode, endNode);
  startNode.f = startNode.g + startNode.h;
  
  const openList: PathNode[] = [startNode];
  const closedList: PathNode[] = [];
  
  let iterations = 0;
  const maxIterations = 10000; // 무한 루프 방지
  
  while (openList.length > 0 && iterations < maxIterations) {
    iterations++;
    
    // f값이 가장 낮은 노드 찾기
    let currentNode = openList[0];
    let currentIndex = 0;
    
    openList.forEach((node, index) => {
      if (node.f < currentNode.f || 
          (node.f === currentNode.f && node.h < currentNode.h)) {
        currentNode = node;
        currentIndex = index;
      }
    });
    
    // 현재 노드를 open list에서 제거하고 closed list에 추가
    openList.splice(currentIndex, 1);
    closedList.push(currentNode);
    
    // 목표 도달 확인
    if (currentNode.gridX === endNode.gridX && currentNode.gridY === endNode.gridY) {
      console.log(`✅ A* 경로 찾기 완료! (${iterations}회 반복)`);
      
      // 경로 역추적
      const path: PathPoint[] = [];
      let current: PathNode | null = currentNode;
      
      while (current) {
        const pixelCoord = gridToPixel(current.gridX, current.gridY);
        path.unshift(pixelCoord);
        current = current.parent;
      }
      
      console.log(`📍 경로 포인트 ${path.length}개 생성`);
      return simplifyPath(path, walkableMap);
    }
    
    // 이웃 노드 처리
    const neighbors = getNeighbors(currentNode, walkableMap);
    
    neighbors.forEach(neighbor => {
      // closed list에 있는 노드는 건너뛰기
      if (findNodeInList(neighbor, closedList)) {
        return;
      }
      
      // 이동 비용 계산 (지형 비용 고려)
      const moveCost = gridDistance(currentNode, neighbor) * neighbor.cost;
      const tentativeG = currentNode.g + moveCost;
      
      const existingNode = findNodeInList(neighbor, openList);
      
      if (!existingNode) {
        // 새 노드를 open list에 추가
        neighbor.g = tentativeG;
        neighbor.h = heuristic(neighbor, endNode);
        neighbor.f = neighbor.g + neighbor.h;
        neighbor.parent = currentNode;
        openList.push(neighbor);
      } else if (tentativeG < existingNode.g) {
        // 더 나은 경로를 찾았으므로 업데이트
        existingNode.g = tentativeG;
        existingNode.f = existingNode.g + existingNode.h;
        existingNode.parent = currentNode;
      }
    });
  }
  
  console.warn(`⚠️ A* 경로를 찾을 수 없음 (${iterations}회 반복 후 종료)`);
  return [];
}

// 경로 단순화 (불필요한 중간 포인트 제거)
function simplifyPath(path: PathPoint[], walkableMap: WalkableAreaMap): PathPoint[] {
  if (path.length <= 2) return path;

   // 🚨 임시로 단순화 비활성화 - 원본 경로 반환
  console.log(`🔧 경로 단순화 비활성화: ${path.length}개 포인트 모두 유지`);
  return path;
  /*
  const simplified: PathPoint[] = [path[0]]; // 시작점 추가
  
  let currentIndex = 0;
  
  while (currentIndex < path.length - 1) {
    // 현재 위치에서 가능한 한 멀리 직선으로 갈 수 있는 지점 찾기
    let farthestIndex = currentIndex + 1;
    
    for (let i = currentIndex + 2; i < path.length; i++) {
      if (isDirectPathClear(path[currentIndex], path[i], walkableMap)) {
        farthestIndex = i;
      } else {
        break;
      }
    }
    
    simplified.push(path[farthestIndex]);
    currentIndex = farthestIndex;
  }
  
  console.log(`🔧 경로 단순화: ${path.length} → ${simplified.length} 포인트`);
  return simplified;
  */
}

// 두 점 사이의 직선 경로가 통행 가능한지 확인
function isDirectPathClear(
  start: PathPoint, 
  end: PathPoint, 
  walkableMap: WalkableAreaMap
): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(distance / (walkableMap.cellSize / 2));
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = start.x + dx * t;
    const y = start.y + dy * t;
    
    if (!isWalkable(x, y, walkableMap)) {
      return false;
    }
  }
  
  return true;
}

// 매대 간 최적 경로 생성 (전체 쇼핑 경로용)
export function createOptimalShoppingRoute(
  startPoint: PathPoint,
  storeLocations: PathPoint[],
  endPoint: PathPoint,
  walkableMap: WalkableAreaMap
): PathPoint[] {
  console.log('🛒 전체 쇼핑 경로 생성 시작');
  
  const fullPath: PathPoint[] = [];
  let currentPoint = startPoint;
  
  // 시작점 추가
  fullPath.push(currentPoint);
  
  // 각 매대까지의 경로 생성
  for (const storeLocation of storeLocations) {
    const segmentPath = findPathWithObstacles(
      currentPoint.x,
      currentPoint.y,
      storeLocation.x,
      storeLocation.y,
      walkableMap
    );
    
    if (segmentPath.length > 1) {
      // 첫 번째 포인트(현재 위치)는 제외하고 추가
      fullPath.push(...segmentPath.slice(1));
      currentPoint = storeLocation;
    } else {
      console.warn(`⚠️ 매대 (${storeLocation.x}, ${storeLocation.y})까지의 경로를 찾을 수 없음`);
      // 직선 경로로 대체
      fullPath.push(storeLocation);
      currentPoint = storeLocation;
    }
  }
  
  // 마지막으로 계산대까지의 경로
  const finalPath = findPathWithObstacles(
    currentPoint.x,
    currentPoint.y,
    endPoint.x,
    endPoint.y,
    walkableMap
  );
  
  if (finalPath.length > 1) {
    fullPath.push(...finalPath.slice(1));
  } else {
    fullPath.push(endPoint);
  }
  
  console.log(`✅ 전체 쇼핑 경로 생성 완료: ${fullPath.length}개 포인트`);
  return fullPath;
}