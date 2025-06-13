// lib/tspOptimization.ts - TSP 기반 최적 경로 계산 (새 파일)

import { findPathWithObstacles } from './improvedPathfinding';
import { createWalkableAreaMap } from './walkableAreaMap';

interface Location {
  id: string;
  name: string;
  coordinates: { x: number; y: number };
}

interface DistanceMatrix {
  [fromId: string]: {
    [toId: string]: number;
  };
}

// TSP를 위한 거리 행렬 생성
export function createDistanceMatrix(locations: Location[]): DistanceMatrix {
  const walkableMap = createWalkableAreaMap();
  const matrix: DistanceMatrix = {};

  console.log('🔢 거리 행렬 생성 중...');

  for (const from of locations) {
    matrix[from.id] = {};

    for (const to of locations) {
      if (from.id === to.id) {
        matrix[from.id][to.id] = 0;
        continue;
      }

      // A* 알고리즘으로 실제 경로 거리 계산
      const path = findPathWithObstacles(
        from.coordinates.x,
        from.coordinates.y,
        to.coordinates.x,
        to.coordinates.y,
        walkableMap,
      );

      // 경로 길이 계산
      let distance = 0;
      for (let i = 0; i < path.length - 1; i++) {
        const dx = path[i + 1].x - path[i].x;
        const dy = path[i + 1].y - path[i].y;
        distance += Math.sqrt(dx * dx + dy * dy);
      }

      matrix[from.id][to.id] = distance || Number.MAX_SAFE_INTEGER;
    }
  }

  console.log('✅ 거리 행렬 생성 완료');
  return matrix;
}

// 근사 TSP 해법 - Nearest Neighbor + 2-opt 개선
export function solveTSP(
  startLocationId: string,
  endLocationId: string,
  visitLocations: Location[],
  distanceMatrix: DistanceMatrix,
): string[] {
  console.log('🧭 TSP 최적화 시작...');

  // 1단계: Nearest Neighbor로 초기 해 구성
  const initialRoute = nearestNeighborTSP(
    startLocationId,
    visitLocations.map((loc) => loc.id),
    distanceMatrix,
  );

  // 2단계: 2-opt로 개선
  const optimizedRoute = twoOptImprovement(initialRoute, distanceMatrix);

  // 3단계: 끝점 추가
  const finalRoute = [...optimizedRoute, endLocationId];

  const totalDistance = calculateTotalDistance(finalRoute, distanceMatrix);
  console.log(`✅ TSP 최적화 완료! 총 거리: ${totalDistance.toFixed(1)}px`);

  return finalRoute;
}

// Nearest Neighbor 알고리즘
function nearestNeighborTSP(
  startId: string,
  visitIds: string[],
  distanceMatrix: DistanceMatrix,
): string[] {
  const route = [startId];
  const unvisited = new Set(visitIds);
  let currentId = startId;

  while (unvisited.size > 0) {
    let nearestId = '';
    let nearestDistance = Number.MAX_SAFE_INTEGER;

    for (const candidateId of unvisited) {
      const distance = distanceMatrix[currentId][candidateId];
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestId = candidateId;
      }
    }

    route.push(nearestId);
    unvisited.delete(nearestId);
    currentId = nearestId;
  }

  return route;
}

// 2-opt 개선 알고리즘
function twoOptImprovement(
  route: string[],
  distanceMatrix: DistanceMatrix,
): string[] {
  const n = route.length;
  let improved = true;
  let bestRoute = [...route];
  let bestDistance = calculateTotalDistance(bestRoute, distanceMatrix);

  console.log(`🔄 2-opt 개선 시작 (초기 거리: ${bestDistance.toFixed(1)}px)`);

  while (improved) {
    improved = false;

    for (let i = 1; i < n - 2; i++) {
      for (let j = i + 1; j < n - 1; j++) {
        // 2-opt swap: route[i] ~ route[j] 구간을 뒤집기
        const newRoute = twoOptSwap(bestRoute, i, j);
        const newDistance = calculateTotalDistance(newRoute, distanceMatrix);

        if (newDistance < bestDistance) {
          bestRoute = newRoute;
          bestDistance = newDistance;
          improved = true;
          console.log(
            `  🔄 개선됨: ${newDistance.toFixed(1)}px (${(
              bestDistance - newDistance
            ).toFixed(1)}px 단축)`,
          );
        }
      }
    }
  }

  console.log(`✅ 2-opt 완료 (최종 거리: ${bestDistance.toFixed(1)}px)`);
  return bestRoute;
}

// 2-opt swap 연산
function twoOptSwap(route: string[], i: number, j: number): string[] {
  const newRoute = [...route];

  // route[i] ~ route[j] 구간을 뒤집기
  while (i < j) {
    [newRoute[i], newRoute[j]] = [newRoute[j], newRoute[i]];
    i++;
    j--;
  }

  return newRoute;
}

// 총 거리 계산
function calculateTotalDistance(
  route: string[],
  distanceMatrix: DistanceMatrix,
): number {
  let totalDistance = 0;

  for (let i = 0; i < route.length - 1; i++) {
    totalDistance += distanceMatrix[route[i]][route[i + 1]];
  }

  return totalDistance;
}

// 기존 ShoppingItem 타입에 맞춘 최적화 함수
export function optimizeRouteWithTSP(items: any[]): any[] {
  if (!items || items.length === 0) return items;
  if (items.length === 1) return items; // 1개면 최적화 불필요

  const START_POINT = { x: 218, y: 160 }; // 주차장
  const END_POINT = { x: 325, y: 227 }; // 계산대

  console.log('🎯 TSP 기반 매대 순서 최적화 시작');

  // 위치 정보 구성
  const locations: Location[] = [
    {
      id: 'start',
      name: '주차장',
      coordinates: START_POINT,
    },
    ...items.map((item, index) => ({
      id: `store_${index}`,
      name: item.sectionName,
      coordinates: item.coordinates,
    })),
    {
      id: 'end',
      name: '계산대',
      coordinates: END_POINT,
    },
  ];

  // 거리 행렬 생성
  const distanceMatrix = createDistanceMatrix(locations);

  // TSP 해법으로 최적 순서 찾기
  const visitLocations = items.map((item, index) => ({
    id: `store_${index}`,
    name: item.sectionName,
    coordinates: item.coordinates,
  }));

  const optimalRoute = solveTSP('start', 'end', visitLocations, distanceMatrix);

  // 결과를 원래 형식으로 변환
  const optimizedItems = optimalRoute
    .filter((id) => id.startsWith('store_'))
    .map((id) => {
      const index = parseInt(id.replace('store_', ''));
      return items[index];
    });

  console.log(
    '🎯 최적화된 매대 순서:',
    optimizedItems.map((item) => item.sectionName),
  );

  // 개선 효과 로깅
  const originalDistance = calculateOriginalDistance(items, distanceMatrix);
  const optimizedDistance = calculateTotalDistance(
    optimalRoute,
    distanceMatrix,
  );
  const improvement = originalDistance - optimizedDistance;

  console.log(`📊 최적화 결과:`);
  console.log(`   기존 거리: ${originalDistance.toFixed(1)}px`);
  console.log(`   최적 거리: ${optimizedDistance.toFixed(1)}px`);
  console.log(
    `   단축 거리: ${improvement.toFixed(1)}px (${(
      (improvement / originalDistance) *
      100
    ).toFixed(1)}% 개선)`,
  );

  return optimizedItems;
}

// 기존 순서대로의 총 거리 계산 (비교용)
function calculateOriginalDistance(
  items: any[],
  distanceMatrix: DistanceMatrix,
): number {
  if (items.length === 0) return 0;

  let totalDistance = 0;

  // 주차장 → 첫 번째 매대
  totalDistance += distanceMatrix['start']['store_0'];

  // 매대 간 이동
  for (let i = 0; i < items.length - 1; i++) {
    totalDistance += distanceMatrix[`store_${i}`][`store_${i + 1}`];
  }

  // 마지막 매대 → 계산대
  totalDistance += distanceMatrix[`store_${items.length - 1}`]['end'];

  return totalDistance;
}
