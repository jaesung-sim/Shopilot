import { PathPoint } from '@/interfaces/route';

interface Node {
  position: PathPoint;
  g: number; // 시작점에서 현재 노드까지의 비용
  h: number; // 현재 노드에서 목표까지의 추정 비용
  f: number; // g + h
  parent: Node | null;
}

// 휴리스틱 함수 (맨해튼 거리)
const heuristic = (a: PathPoint, b: PathPoint): number => {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

// 두 점 사이의 유클리드 거리
const distance = (a: PathPoint, b: PathPoint): number => {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
};

// 노드가 장애물 영역인지 확인
const isObstacle = (point: PathPoint, obstacles: PathPoint[]): boolean => {
  return obstacles.some((obstacle) => {
    // 여기서는 단순히 좌표가 일치하는지 확인
    // 실제 구현에서는 장애물의 영역을 고려해야 함
    return obstacle.x === point.x && obstacle.y === point.y;
  });
};

// 이동 가능한 인접 노드 가져오기
const getNeighbors = (
  node: Node,
  graph: PathPoint[],
  obstacles: PathPoint[],
): Node[] => {
  const neighbors: Node[] = [];
  const currentPosition = node.position;

  // 그래프에서 직접 연결된 노드들만 가져옴
  for (const point of graph) {
    // 자기 자신은 제외
    if (point.x === currentPosition.x && point.y === currentPosition.y)
      continue;

    // 장애물 확인
    if (isObstacle(point, obstacles)) continue;

    // 거리 기반 연결성 확인 (가까운 노드만 연결)
    const dist = distance(currentPosition, point);
    if (dist > 200) continue; // 너무 먼 노드는 제외 (실제 구현시 적절한 값으로 조정)

    // 인접 노드 생성
    const g = node.g + dist;
    const h = heuristic(point, { x: 0, y: 0 }); // 목표 지점은 나중에 설정됨

    neighbors.push({
      position: point,
      g,
      h,
      f: g + h,
      parent: node,
    });
  }

  return neighbors;
};

// 노드가 리스트에 있는지 확인
const nodeInList = (node: Node, list: Node[]): Node | null => {
  for (const item of list) {
    if (
      item.position.x === node.position.x &&
      item.position.y === node.position.y
    ) {
      return item;
    }
  }
  return null;
};

// A* 알고리즘 구현
export const findPath = (
  start: PathPoint,
  end: PathPoint,
  graph: PathPoint[],
  obstacles: PathPoint[] = [],
): PathPoint[] => {
  // 시작 노드와 목표 노드 설정
  const startNode: Node = {
    position: start,
    g: 0,
    h: heuristic(start, end),
    f: heuristic(start, end),
    parent: null,
  };

  // 개방 목록과 닫힌 목록 초기화
  const openList: Node[] = [startNode];
  const closedList: Node[] = [];

  // 개방 목록이 비어있지 않은 동안 반복
  while (openList.length > 0) {
    // f 값이 가장 낮은 노드 찾기
    let currentIndex = 0;
    for (let i = 0; i < openList.length; i++) {
      if (openList[i].f < openList[currentIndex].f) {
        currentIndex = i;
      }
    }

    // 현재 노드
    const currentNode = openList[currentIndex];

    // 목표에 도달했는지 확인
    if (currentNode.position.x === end.x && currentNode.position.y === end.y) {
      // 경로 역추적
      const path: PathPoint[] = [];
      let current: Node | null = currentNode;

      while (current) {
        path.push(current.position);
        current = current.parent;
      }

      // 경로 반전 (시작 -> 목표)
      return path.reverse();
    }

    // 현재 노드를 개방 목록에서 제거하고 닫힌 목록에 추가
    openList.splice(currentIndex, 1);
    closedList.push(currentNode);

    // 인접 노드 처리
    const neighbors = getNeighbors(currentNode, graph, obstacles);

    for (const neighbor of neighbors) {
      // 닫힌 목록에 있는지 확인
      if (nodeInList(neighbor, closedList)) continue;

      // 목표까지의 휴리스틱 설정
      neighbor.h = heuristic(neighbor.position, end);
      neighbor.f = neighbor.g + neighbor.h;

      // 이미 개방 목록에 있는지 확인
      const openNode = nodeInList(neighbor, openList);
      if (openNode) {
        // 더 나은 경로인지 확인
        if (neighbor.g < openNode.g) {
          openNode.g = neighbor.g;
          openNode.f = neighbor.g + openNode.h;
          openNode.parent = currentNode;
        }
      } else {
        // 개방 목록에 추가
        neighbor.parent = currentNode;
        openList.push(neighbor);
      }
    }
  }

  // 경로를 찾지 못함
  return [];
};
