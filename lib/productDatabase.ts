// lib/improvedProductDatabase.ts - A* 경로 통합 버전
import { optimizeRouteWithTSP } from './tspOptimization';

import { Product, RoutePoint, RouteData } from '@/interfaces/route';
import { searchVectorDB } from './vectorstore';
import { createWalkableAreaMap, findNearestWalkable } from './walkableAreaMap';
import {
  findPathWithObstacles,
  createOptimalShoppingRoute,
} from './improvedPathfinding';
import { webToRos, coordinateTransform } from './coordinateTransform';

// 🔧 시작점과 종착점 설정
const START_POINT = { x: 218, y: 160 }; // 주차장 좌표
const END_POINT = { x: 325, y: 227 }; // 계산대 좌표

// 전역 통행 가능 맵 (한 번만 생성)
let walkableMap: any = null;

function getWalkableMap() {
  if (!walkableMap) {
    walkableMap = createWalkableAreaMap();
    console.log('🗺️ 통행 가능 맵 생성 완료');
  }
  return walkableMap;
}

// 쇼핑 아이템 인터페이스
export interface ShoppingItem {
  productNames: string[];
  sectionName: string;
  sectionId: number;
  coordinates: { x: number; y: number };
}

// 벡터 DB에서 상품 정보를 검색하여 매대 찾기 (기존과 동일)
export async function findSectionByProductFromVector(
  productName: string,
): Promise<{
  sectionId: number;
  sectionName: string;
  coordinates: { x: number; y: number };
} | null> {
  try {
    console.log('🔍 벡터 DB에서 상품 검색:', productName);

    const searchResults = await searchVectorDB(productName, 5);
    console.log('🔎 벡터 검색 결과:', searchResults.length, '개');

    if (!searchResults || searchResults.length === 0) {
      console.log('❌ 벡터 DB에서 상품을 찾을 수 없음:', productName);
      return null;
    }

    // 검색 결과에서 매대 정보 추출
    for (const result of searchResults) {
      const content = result.pageContent;
      const metadata = result.metadata || {};

      let coordinates: { x: number; y: number } | null = null;
      let sectionId: number | null = null;
      let sectionName: string | null = null;

      // 메타데이터에서 직접 추출
      if (metadata.location_x && metadata.location_y) {
        coordinates = {
          x: Number(metadata.location_x),
          y: Number(metadata.location_y),
        };
      }

      if (metadata.section) {
        sectionName = metadata.section;
      }

      if (sectionName) {
        sectionId = getSectionIdByName(sectionName);
      }

      // 백업: content에서 패턴 매칭으로 추출
      if (!coordinates || !sectionName) {
        const sectionMatch = content.match(/위치:\s*([^.\n]+)/);
        if (sectionMatch && !sectionName) {
          sectionName = sectionMatch[1].trim();
        }

        if (sectionName && !coordinates) {
          coordinates = getCoordinatesBySectionName(sectionName);
        }

        if (sectionName && !sectionId) {
          sectionId = getSectionIdByName(sectionName);
        }
      }

      // 🔧 통행 가능한 위치로 조정
      if (coordinates && sectionName) {
        if (!sectionId) {
          sectionId = getDefaultSectionId(sectionName);
        }

        // 매대 좌표를 가장 가까운 통행 가능 지점으로 조정
        const walkableAreaMap = getWalkableMap();
        const adjustedCoordinates = findNearestWalkable(
          coordinates.x,
          coordinates.y,
          walkableAreaMap,
        );

        if (adjustedCoordinates) {
          console.log(
            `🔧 매대 좌표 조정: (${coordinates.x}, ${coordinates.y}) → (${adjustedCoordinates.x}, ${adjustedCoordinates.y})`,
          );
          coordinates = adjustedCoordinates;
        }

        const result = {
          sectionId,
          sectionName,
          coordinates,
        };

        console.log('✅ 매칭 성공:', {
          product: productName,
          result: result,
        });

        return result;
      }
    }

    console.log('❌ 모든 검색 결과에서 필요한 정보를 찾을 수 없음');
    return null;
  } catch (error) {
    console.error('벡터 DB 검색 중 오류:', error);
    return null;
  }
}

// 매대명으로 매대 ID 가져오기 (기존과 동일)
function getSectionIdByName(sectionName: string): number | null {
  const sectionNameToId: Record<string, number> = {
    '조미료 매대': 1,
    '냉장·냉동 매대': 2,
    '가공육 매대': 3,
    '즉석식품 매대': 4,
    '통조림 매대': 5,
    '기타 식품 매대': 6,
    '건강식품 매대': 7,
    '유아·영유아 매대': 8,
    '과자·스낵 매대': 9,
    '음료·주류 매대': 10,
    '신선세트 매대': 11,
    '과일·채소 매대': 12,
    '정육 매대': 13,
    '수산 매대': 14,
    '생활용품 매대': 15,
    '반려동물 매대': 16,
    '자동차용품 매대': 17,
    '주방용품 매대': 18,
    '욕실/청소용품 매대': 19,
    '기타 매대': 20,
    '의약품/의료기기 매대': 21,
    '문구/완구 매대': 22,
    '디지털기기 매대': 23,
    '영상·음향기기 매대': 24,
    '생활가전 매대': 25,
    '가구 매대': 26,
    '침구·인테리어 매대': 27,
    '패션·의류 매대': 28,
    '스포츠의류 매대': 29,
    '가정의류/잡화 매대': 30,
  };

  return sectionNameToId[sectionName] || null;
}

// 기본 매대 ID 설정 (기존과 동일)
function getDefaultSectionId(sectionName: string): number {
  let hash = 0;
  for (let i = 0; i < sectionName.length; i++) {
    const char = sectionName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash % 1000) + 1000;
}

// 매대명으로 좌표 가져오기 (기존과 동일, 하지만 통행 가능 지점으로 조정)
function getCoordinatesBySectionName(
  sectionName: string,
): { x: number; y: number } | null {
  const nameToCoordinates: Record<string, { x: number; y: number }> = {
    '조미료 매대': { x: 207, y: 225 },
    '냉장·냉동 매대': { x: 207, y: 275 },
    '가공육 매대': { x: 207, y: 325 },
    '즉석식품 매대': { x: 207, y: 358 },
    '통조림 매대': { x: 275, y: 358 },
    '기타 식품 매대': { x: 325, y: 358 },
    '건강식품 매대': { x: 375, y: 358 },
    '유아·영유아 매대': { x: 425, y: 358 },
    '과자·스낵 매대': { x: 475, y: 358 },
    '음료·주류 매대': { x: 525, y: 358 },
    '신선세트 매대': { x: 575, y: 358 },
    '과일·채소 매대': { x: 670, y: 358 },
    '정육 매대': { x: 670, y: 323 },
    '수산 매대': { x: 670, y: 255 },
    '생활용품 매대': { x: 552, y: 242 },
    '반려동물 매대': { x: 552, y: 142 },
    '자동차용품 매대': { x: 552, y: 84 },
    '주방용품 매대': { x: 429, y: 113 },
    '욕실/청소용품 매대': { x: 500, y: 120 },
    '기타 매대': { x: 246, y: 261 },
    '의약품/의료기기 매대': { x: 340, y: 261 },
    '문구/완구 매대': { x: 410, y: 261 },
    '디지털기기 매대': { x: 480, y: 261 },
    '영상·음향기기 매대': { x: 550, y: 261 },
    '생활가전 매대': { x: 620, y: 261 },
    '가구 매대': { x: 340, y: 344 },
    '침구·인테리어 매대': { x: 410, y: 344 },
    '패션·의류 매대': { x: 480, y: 344 },
    '스포츠의류 매대': { x: 550, y: 344 },
    '가정의류/잡화 매대': { x: 620, y: 344 },
  };

  const baseCoord = nameToCoordinates[sectionName];
  if (!baseCoord) return null;

  // 🔧 통행 가능한 지점으로 조정
  const walkableAreaMap = getWalkableMap();
  const adjustedCoord = findNearestWalkable(
    baseCoord.x,
    baseCoord.y,
    walkableAreaMap,
  );

  return adjustedCoord || baseCoord;
}

// 백업 매대 정보 (기존과 동일, 하지만 통행 가능 지점으로 조정)
function getFallbackSection(productName: string): {
  sectionId: number;
  sectionName: string;
  coordinates: { x: number; y: number };
} | null {
  const fallbackMap: Record<
    string,
    {
      sectionId: number;
      sectionName: string;
      coordinates: { x: number; y: number };
    }
  > = {
    계란: {
      sectionId: 13,
      sectionName: '정육 매대',
      coordinates: { x: 670, y: 323 },
    },
    라면: {
      sectionId: 4,
      sectionName: '즉석식품 매대',
      coordinates: { x: 192, y: 360 },
    },
    치즈: {
      sectionId: 2,
      sectionName: '냉장·냉동 매대',
      coordinates: { x: 205, y: 275 },
    },
    우유: {
      sectionId: 2,
      sectionName: '냉장·냉동 매대',
      coordinates: { x: 205, y: 275 },
    },
    바나나: {
      sectionId: 12,
      sectionName: '과일·채소 매대',
      coordinates: { x: 670, y: 360 },
    },
    사과: {
      sectionId: 12,
      sectionName: '과일·채소 매대',
      coordinates: { x: 670, y: 360 },
    },
    빵: {
      sectionId: 4,
      sectionName: '즉석식품 매대',
      coordinates: { x: 192, y: 360 },
    },
    햄: {
      sectionId: 3,
      sectionName: '가공육 매대',
      coordinates: { x: 205, y: 325 },
    },
    돼지고기: {
      sectionId: 13,
      sectionName: '정육 매대',
      coordinates: { x: 670, y: 323 },
    },
    쇠고기: {
      sectionId: 13,
      sectionName: '정육 매대',
      coordinates: { x: 670, y: 323 },
    },
    닭고기: {
      sectionId: 13,
      sectionName: '정육 매대',
      coordinates: { x: 670, y: 323 },
    },
    과자: {
      sectionId: 9,
      sectionName: '과자·스낵 매대',
      coordinates: { x: 475, y: 360 },
    },
    음료수: {
      sectionId: 10,
      sectionName: '음료·주류 매대',
      coordinates: { x: 525, y: 360 },
    },
  };

  const fallback = fallbackMap[productName];
  if (!fallback) return null;

  // 🔧 통행 가능한 지점으로 조정
  const walkableAreaMap = getWalkableMap();
  const adjustedCoord = findNearestWalkable(
    fallback.coordinates.x,
    fallback.coordinates.y,
    walkableAreaMap,
  );

  if (adjustedCoord) {
    return {
      ...fallback,
      coordinates: adjustedCoord,
    };
  }

  return fallback;
}

// 쇼핑 리스트 처리 - 벡터 DB 기반 (기존과 동일)
export async function processShoppingListFromVector(
  items: string[],
): Promise<ShoppingItem[]> {
  console.log('🛒 벡터 DB 기반 쇼핑 리스트 처리 시작:', items);

  const result: ShoppingItem[] = [];
  const sectionMap = new Map<
    string,
    {
      sectionId: number;
      sectionName: string;
      coordinates: { x: number; y: number };
      products: string[];
    }
  >();

  for (const item of items) {
    console.log(`🔍 아이템 처리 중: ${item}`);

    const sectionInfo = await findSectionByProductFromVector(item);
    if (sectionInfo) {
      const key = `${sectionInfo.sectionId}-${sectionInfo.sectionName}`;

      if (!sectionMap.has(key)) {
        sectionMap.set(key, {
          sectionId: sectionInfo.sectionId,
          sectionName: sectionInfo.sectionName,
          coordinates: sectionInfo.coordinates,
          products: [],
        });
      }

      sectionMap.get(key)!.products.push(item);
      console.log(
        `✅ ${item} → ${sectionInfo.sectionName} (${sectionInfo.coordinates.x}, ${sectionInfo.coordinates.y})`,
      );
    } else {
      console.warn('⚠️ 벡터 DB에서 매대를 찾을 수 없는 상품:', item);

      const fallbackSection = getFallbackSection(item);
      if (fallbackSection) {
        const key = `${fallbackSection.sectionId}-${fallbackSection.sectionName}`;

        if (!sectionMap.has(key)) {
          sectionMap.set(key, {
            sectionId: fallbackSection.sectionId,
            sectionName: fallbackSection.sectionName,
            coordinates: fallbackSection.coordinates,
            products: [],
          });
        }

        sectionMap.get(key)!.products.push(item);
        console.log(
          `🔧 백업 매대 배정: ${item} → ${fallbackSection.sectionName}`,
        );
      }
    }
  }

  for (const sectionData of sectionMap.values()) {
    result.push({
      productNames: sectionData.products,
      sectionName: sectionData.sectionName,
      sectionId: sectionData.sectionId,
      coordinates: sectionData.coordinates,
    });
  }

  console.log('✅ 벡터 DB 기반 처리 완료:', result);
  return result;
}

// 🔧 A* 알고리즘을 이용한 경로 최적화
/*
export function optimizeRouteWithAstar(items: ShoppingItem[]): ShoppingItem[] {
  console.log('🧭 A* 알고리즘을 이용한 경로 최적화 시작');

  if (items.length <= 1) return items;

  const walkableAreaMap = getWalkableMap();

  // 주차장에서 각 매대까지의 실제 거리 계산 (A* 이용)
  const distancesFromStart = items.map((item) => {
    const path = findPathWithObstacles(
      START_POINT.x,
      START_POINT.y,
      item.coordinates.x,
      item.coordinates.y,
      walkableAreaMap,
    );

    // 경로 길이 계산
    let pathLength = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const dx = path[i + 1].x - path[i].x;
      const dy = path[i + 1].y - path[i].y;
      pathLength += Math.sqrt(dx * dx + dy * dy);
    }

    return {
      item,
      distance: pathLength || Number.MAX_SAFE_INTEGER, // 경로를 찾지 못한 경우 최대값
      path: path,
    };
  });

  // 거리 순으로 정렬
  distancesFromStart.sort((a, b) => a.distance - b.distance);

  const optimizedItems = distancesFromStart.map((d) => d.item);

  console.log('✅ A* 기반 경로 최적화 완료:', {
    original: items.map((i) => i.sectionName),
    optimized: optimizedItems.map((i) => i.sectionName),
  });

  return optimizedItems;
}*/

// 🆕 새로운 TSP 기반 함수로 교체
export function optimizeRouteWithAstar(items: ShoppingItem[]): ShoppingItem[] {
  console.log('🧭 TSP 알고리즘을 이용한 경로 최적화 시작');
  
  // TSP 기반 최적화 호출
  return optimizeRouteWithTSP(items);
}

// 🔧 최종 경로 데이터 생성 - A* 알고리즘 적용
export async function createRouteDataFromVectorWithAstar(
  items: string[],
): Promise<RouteData | null> {
  console.log('🚨 A* 함수 진입점 - 디버그:', items); // ← 이 줄 추가

  if (!items || items.length === 0) {
    console.log('❌ 입력 아이템이 없습니다');
    return null;
  }

  console.log('🗺️ A* 알고리즘 기반 경로 생성 시작:', items);

  try {
    // 1. 벡터 DB에서 쇼핑 아이템 처리
    const shoppingItems = await processShoppingListFromVector(items);

    if (shoppingItems.length === 0) {
      console.log('❌ 처리된 쇼핑 아이템이 없습니다');
      return null;
    }

    console.log('📋 처리된 쇼핑 아이템:', shoppingItems.length, '개');

    // 2. A* 알고리즘으로 경로 최적화
    const optimizedRoute = optimizeRouteWithAstar(shoppingItems);

    // 3. 전체 경로 생성 (A* 알고리즘 사용)
    console.log('🚨 walkableMap 생성 중...'); // ← 이 줄 추가
    const walkableAreaMap = getWalkableMap();
    console.log('🚨 walkableMap 생성 완료:', !!walkableAreaMap); // ← 이 줄 추가

    // 매대 좌표들 추출
    const storeCoordinates = optimizedRoute.map((item) => item.coordinates);

    // A* 알고리즘으로 전체 경로 생성
    const fullPath = createOptimalShoppingRoute(
      START_POINT,
      storeCoordinates,
      END_POINT,
      walkableAreaMap,
    );

    console.log(`🛤️ A* 전체 경로 생성: ${fullPath.length}개 포인트`);

    // 4. RouteData 객체 구성
    const routeItems: Product[] = [];
    const routePoints: RoutePoint[] = [];

    // 시작점 추가 (주차장)
    routePoints.push({
      order: 0,
      item: '시작',
      location: '주차장',
      section: '0',
      coordinates: START_POINT,
      pathPoints: fullPath.slice(0, 1), // 시작점만
    });

    // 매대 경로 추가
    let pathIndex = 1;
    optimizedRoute.forEach((item, index) => {
      // 상품 정보 추가
      item.productNames.forEach((name) => {
        routeItems.push({
          name: name,
          location: item.sectionName,
          section: item.sectionId.toString(),
          coordinates: item.coordinates,
        });
      });

      // 이 매대까지의 경로 포인트들 찾기
      const targetCoord = item.coordinates;
      let endIndex = pathIndex;

      // 현재 매대 좌표와 가장 가까운 fullPath 포인트 찾기
      let minDistance = Number.MAX_SAFE_INTEGER;
      for (let i = pathIndex; i < fullPath.length; i++) {
        const dx = fullPath[i].x - targetCoord.x;
        const dy = fullPath[i].y - targetCoord.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minDistance) {
          minDistance = distance;
          endIndex = i + 1; // 해당 지점까지 포함
        }

        // 거리가 다시 멀어지기 시작하면 중단
        if (distance > minDistance && i > pathIndex + 3) {
          break;
        }
      }

      // 경로 포인트 추가
      routePoints.push({
        order: index + 1,
        item: item.productNames.join(', '),
        location: item.sectionName,
        section: item.sectionId.toString(),
        coordinates: item.coordinates,
        pathPoints: fullPath.slice(pathIndex, endIndex),
      });

      pathIndex = endIndex;
    });

    // 종착점 추가 (계산대)
    routePoints.push({
      order: routePoints.length,
      item: '결제',
      location: '계산대',
      section: '999',
      coordinates: END_POINT,
      pathPoints: fullPath.slice(pathIndex), // 나머지 경로
    });

    // 총 거리 계산 (실제 A* 경로 기준)
    let totalDistance = 0;
    for (let i = 0; i < fullPath.length - 1; i++) {
      const dx = fullPath[i + 1].x - fullPath[i].x;
      const dy = fullPath[i + 1].y - fullPath[i].y;
      totalDistance += Math.sqrt(dx * dx + dy * dy);
    }

    const result = {
      items: routeItems,
      route: routePoints,
      total_distance: Math.round(totalDistance),
    };

    console.log('✅ A* 기반 경로 생성 완료:', {
      아이템수: result.items.length,
      경로수: result.route.length,
      총거리: result.total_distance,
      실제경로포인트: fullPath.length,
      경로: `주차장(${START_POINT.x},${START_POINT.y}) → ${optimizedRoute.length}개 매대 → 계산대(${END_POINT.x},${END_POINT.y})`,
    });

    return result;
  } catch (error) {
    console.error('❌ A* 기반 경로 생성 실패:', error);
    return null;
  }
}

// 🔧 좌표 변환을 적용한 목표 좌표 전송 함수
export function sendGoalWithCoordinateTransform(
  webX: number,
  webY: number,
  description?: string,
): { rosCoord: { x: number; y: number }; webCoord: { x: number; y: number } } {
  // 웹 좌표를 ROS 좌표로 변환
  const rosCoord = webToRos({ x: webX, y: webY });

  console.log(
    `🎯 좌표 변환된 목표 전송: ${description || `(${webX}, ${webY})`}`,
    {
      웹좌표: { x: webX, y: webY },
      ROS좌표: rosCoord,
      변환활성화: coordinateTransform.getTransformParameters().enabled,
    },
  );

  return {
    rosCoord,
    webCoord: { x: webX, y: webY },
  };
}

// 🔧 경로 상의 모든 포인트를 ROS 좌표로 변환
export function convertRouteToRosCoordinates(routeData: RouteData): RouteData {
  if (!routeData) return routeData;

  const convertedRoute = {
    ...routeData,
    items: routeData.items.map((item) => ({
      ...item,
      coordinates: webToRos(item.coordinates),
    })),
    route: routeData.route.map((point) => ({
      ...point,
      coordinates: webToRos(point.coordinates),
      pathPoints: point.pathPoints?.map((pathPoint) => webToRos(pathPoint)),
    })),
  };

  console.log('🔄 경로 데이터 ROS 좌표 변환 완료');
  return convertedRoute;
}

// ✅ 메인 함수를 A* 버전으로 완전 교체
export async function createRouteData(
  items: string[],
): Promise<RouteData | null> {
  console.log('🔥🔥🔥 createRouteData 함수 진입 - A* 알고리즘 사용');
  console.log('입력 아이템:', items);

  if (!items || items.length === 0) {
    console.log('❌ 입력 아이템이 없습니다');
    return null;
  }

  console.log('🗺️ A* 알고리즘 기반 경로 생성 시작:', items);

  try {
    // 1. 벡터 DB에서 쇼핑 아이템 처리
    const shoppingItems = await processShoppingListFromVector(items);

    if (shoppingItems.length === 0) {
      console.log('❌ 처리된 쇼핑 아이템이 없습니다');
      return null;
    }

    // 2. A* 알고리즘으로 경로 최적화
    const optimizedRoute = optimizeRouteWithAstar(shoppingItems);

    // 3. 전체 경로 생성 (A* 알고리즘 사용)
    const walkableAreaMap = getWalkableMap();
    const storeCoordinates = optimizedRoute.map((item) => item.coordinates);

    const fullPath = createOptimalShoppingRoute(
      START_POINT,
      storeCoordinates,
      END_POINT,
      walkableAreaMap,
    );

    console.log(`🛤️ A* 전체 경로 생성: ${fullPath.length}개 포인트`);

    if (fullPath.length === 0) {
      console.error('❌ A* 알고리즘으로 경로를 찾을 수 없음');
      return null;
    }

    // 4. RouteData 객체 구성
    const routeItems: Product[] = [];
    const routePoints: RoutePoint[] = [];

    // 시작점 추가
    routePoints.push({
      order: 0,
      item: '시작',
      location: '주차장',
      section: '0',
      coordinates: START_POINT,
      pathPoints: fullPath.slice(0, 1).map((point) => ({
        x: point.x,
        y: point.y,
        id: 'start-point',
      })),
    });

    // 매대별 경로 포인트 할당
    let pathIndex = 1;
    optimizedRoute.forEach((item, index) => {
      // 상품 정보 추가
      item.productNames.forEach((name) => {
        routeItems.push({
          name: name,
          location: item.sectionName,
          section: item.sectionId.toString(),
          coordinates: item.coordinates,
        });
      });

      // 이 매대까지의 경로 포인트들 찾기
      const targetCoord = item.coordinates;
      let endIndex = pathIndex;

      // A* 경로에서 해당 매대에 가장 가까운 지점 찾기
      let minDistance = Number.MAX_SAFE_INTEGER;
      for (let i = pathIndex; i < fullPath.length; i++) {
        const dx = fullPath[i].x - targetCoord.x;
        const dy = fullPath[i].y - targetCoord.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minDistance) {
          minDistance = distance;
          endIndex = i + 1;
        }

        if (distance > minDistance && i > pathIndex + 3) {
          break;
        }
      }

      // 경로 포인트 추가 (pathPoints 포함)
      routePoints.push({
        order: index + 1,
        item: item.productNames.join(', '),
        location: item.sectionName,
        section: item.sectionId.toString(),
        coordinates: item.coordinates,
        pathPoints: fullPath.slice(pathIndex, endIndex).map((point, i) => ({
          x: point.x,
          y: point.y,
          id: `path-${index}-${pathIndex + i}`,
        })),
      });

      pathIndex = endIndex;
    });

    // 종착점 추가
    routePoints.push({
      order: routePoints.length,
      item: '결제',
      location: '계산대',
      section: '999',
      coordinates: END_POINT,
      pathPoints: fullPath.slice(pathIndex).map((point, i) => ({
        x: point.x,
        y: point.y,
        id: `path-checkout-${pathIndex + i}`,
      })),
    });

    // A* 경로 기준 총 거리 계산
    let totalDistance = 0;
    for (let i = 0; i < fullPath.length - 1; i++) {
      const dx = fullPath[i + 1].x - fullPath[i].x;
      const dy = fullPath[i + 1].y - fullPath[i].y;
      totalDistance += Math.sqrt(dx * dx + dy * dy);
    }

    const result = {
      items: routeItems,
      route: routePoints,
      total_distance: Math.round(totalDistance),
    };

    console.log('✅ A* 기반 경로 생성 완료:', {
      아이템수: result.items.length,
      경로수: result.route.length,
      총거리: result.total_distance,
      A스타포인트수: fullPath.length,
    });

    return result;
  } catch (error) {
    console.error('❌ A* 기반 경로 생성 실패:', error);
    return null;
  }
}

// 기존 함수들 유지 (호환성)
export const processShoppingList = processShoppingListFromVector;
export const findSectionByProduct = findSectionByProductFromVector;
