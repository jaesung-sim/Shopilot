// lib/productDatabase.ts - 주차장 시작점 (218, 160) 적용

import { Product, RoutePoint, RouteData } from '@/interfaces/route';
import { searchVectorDB } from './vectorstore';

// 🔧 시작점과 종착점 설정
const START_POINT = { x: 218, y: 160 }; // 주차장 좌표
const END_POINT = { x: 325, y: 227 }; // 계산대 좌표

// 쇼핑 아이템 인터페이스
export interface ShoppingItem {
  productNames: string[];
  sectionName: string;
  sectionId: number;
  coordinates: { x: number; y: number };
}

// 벡터 DB에서 상품 정보를 검색하여 매대 찾기 (개선된 버전)
export async function findSectionByProductFromVector(
  productName: string,
): Promise<{
  sectionId: number;
  sectionName: string;
  coordinates: { x: number; y: number };
} | null> {
  try {
    console.log('🔍 벡터 DB에서 상품 검색:', productName);

    // 1. 벡터 DB에서 상품 검색 (상품명으로 검색)
    const searchResults = await searchVectorDB(productName, 5);
    console.log('🔎 벡터 검색 결과:', searchResults.length, '개');

    if (!searchResults || searchResults.length === 0) {
      console.log('❌ 벡터 DB에서 상품을 찾을 수 없음:', productName);
      return null;
    }

    // 2. 검색 결과에서 매대 정보 추출 (개선된 방식)
    for (const result of searchResults) {
      const content = result.pageContent;
      const metadata = result.metadata || {};

      console.log('📄 검색 결과 분석:', {
        content: content.substring(0, 100),
        metadata: metadata,
      });

      // 🔧 좌표 및 매대 정보 추출
      let coordinates: { x: number; y: number } | null = null;
      let sectionId: number | null = null;
      let sectionName: string | null = null;

      // 방법 1: 메타데이터에서 직접 추출 (가장 확실한 방법)
      if (metadata.location_x && metadata.location_y) {
        coordinates = {
          x: Number(metadata.location_x),
          y: Number(metadata.location_y),
        };
        console.log('✅ 메타데이터에서 좌표 추출:', coordinates);
      }

      if (metadata.section) {
        sectionName = metadata.section;
        console.log('✅ 메타데이터에서 매대명 추출:', sectionName);
      }

      // 매대 ID 추출 (매대명을 기반으로 생성)
      if (sectionName) {
        sectionId = getSectionIdByName(sectionName);
        console.log('✅ 매대명에서 ID 추출:', sectionId);
      }

      // 🔧 조건 완화: 좌표와 매대명만 있으면 반환 (sectionId는 필수가 아님)
      if (coordinates && sectionName) {
        // sectionId가 없으면 기본값 설정
        if (!sectionId) {
          sectionId = getDefaultSectionId(sectionName);
          console.log('🔧 기본 매대 ID 설정:', sectionId);
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

      // 방법 2: content에서 패턴 매칭으로 추출 (백업)
      if (!coordinates || !sectionName) {
        console.log('🔧 content에서 정보 추출 시도...');

        // "위치: 정육 매대" 패턴 찾기
        const sectionMatch = content.match(/위치:\s*([^.\n]+)/);
        if (sectionMatch && !sectionName) {
          sectionName = sectionMatch[1].trim();
          console.log('✅ content에서 매대명 추출:', sectionName);
        }

        // 좌표 정보가 있는지 확인 (하드코딩된 매핑 사용)
        if (sectionName && !coordinates) {
          coordinates = getCoordinatesBySectionName(sectionName);
          if (coordinates) {
            console.log('✅ 하드코딩 테이블에서 좌표 추출:', coordinates);
          }
        }

        if (sectionName && !sectionId) {
          sectionId = getSectionIdByName(sectionName);
          console.log('✅ 매대명에서 ID 추출:', sectionId);
        }

        // 다시 확인
        if (coordinates && sectionName) {
          if (!sectionId) {
            sectionId = getDefaultSectionId(sectionName);
          }

          const result = {
            sectionId,
            sectionName,
            coordinates,
          };

          console.log('✅ content 패턴으로 매칭 성공:', result);
          return result;
        }
      }
    }

    console.log('❌ 모든 검색 결과에서 필요한 정보를 찾을 수 없음');
    return null;
  } catch (error) {
    console.error('벡터 DB 검색 중 오류:', error);
    return null;
  }
}

// 🔧 매대명으로 매대 ID 가져오기
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

// 🔧 기본 매대 ID 설정 (매대명을 해시해서 고유 ID 생성)
function getDefaultSectionId(sectionName: string): number {
  // 간단한 해시 함수로 매대명을 숫자로 변환
  let hash = 0;
  for (let i = 0; i < sectionName.length; i++) {
    const char = sectionName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 32bit 정수로 변환
  }
  return Math.abs(hash % 1000) + 1000; // 1000-1999 범위의 ID
}

// 🔧 하드코딩된 좌표 매핑 (실제 DB 좌표로 수정)
function getHardcodedCoordinates(
  sectionId: number,
): { x: number; y: number } | null {
  const sectionCoordinates: Record<number, { x: number; y: number }> = {
    1: { x: 205, y: 225 }, // 조미료 매대
    2: { x: 205, y: 275 }, // 냉장·냉동 매대
    3: { x: 205, y: 325 }, // 가공육 매대
    4: { x: 192, y: 360 }, // 즉석식품 매대
    5: { x: 275, y: 360 }, // 통조림 매대
    6: { x: 325, y: 360 }, // 기타 식품 매대
    7: { x: 375, y: 360 }, // 건강식품 매대
    8: { x: 425, y: 360 }, // 유아·영유아 매대
    9: { x: 475, y: 360 }, // 과자·스낵 매대
    10: { x: 525, y: 360 }, // 음료·주류 매대
    11: { x: 575, y: 360 }, // 신선세트 매대
    12: { x: 670, y: 360 }, // 과일·채소 매대
    13: { x: 670, y: 323 }, // 정육 매대
    14: { x: 670, y: 255 }, // 수산 매대
    15: { x: 555, y: 242 }, // 생활용품 매대
    16: { x: 555, y: 142 }, // 반려동물 매대
    17: { x: 536, y: 84 }, // 자동차용품 매대
    18: { x: 422, y: 113 }, // 주방용품 매대
    19: { x: 500, y: 120 }, // 욕실/청소용품 매대
    20: { x: 277, y: 306 }, // 기타 매대
    21: { x: 340, y: 265 }, // 의약품/의료기기 매대
    22: { x: 410, y: 265 }, // 문구/완구 매대
    23: { x: 480, y: 265 }, // 디지털기기 매대
    24: { x: 550, y: 265 }, // 영상·음향기기 매대
    25: { x: 620, y: 265 }, // 생활가전 매대
    26: { x: 340, y: 345 }, // 가구 매대
    27: { x: 410, y: 345 }, // 침구·인테리어 매대
    28: { x: 480, y: 345 }, // 패션·의류 매대
    29: { x: 550, y: 345 }, // 스포츠의류 매대
    30: { x: 620, y: 345 }, // 가정의류/잡화 매대
  };

  return sectionCoordinates[sectionId] || null;
}

// 🔧 매대명으로 좌표 가져오기 (실제 DB 좌표로 수정)
function getCoordinatesBySectionName(
  sectionName: string,
): { x: number; y: number } | null {
  const nameToCoordinates: Record<string, { x: number; y: number }> = {
    '조미료 매대': { x: 205, y: 225 },
    '냉장·냉동 매대': { x: 205, y: 275 },
    '가공육 매대': { x: 205, y: 325 },
    '즉석식품 매대': { x: 192, y: 360 },
    '통조림 매대': { x: 275, y: 360 },
    '기타 식품 매대': { x: 325, y: 360 },
    '건강식품 매대': { x: 375, y: 360 },
    '유아·영유아 매대': { x: 425, y: 360 },
    '과자·스낵 매대': { x: 475, y: 360 },
    '음료·주류 매대': { x: 525, y: 360 },
    '신선세트 매대': { x: 575, y: 360 },
    '과일·채소 매대': { x: 670, y: 360 },
    '정육 매대': { x: 670, y: 323 },
    '수산 매대': { x: 670, y: 255 },
    '생활용품 매대': { x: 555, y: 242 },
    '반려동물 매대': { x: 555, y: 142 },
    '자동차용품 매대': { x: 536, y: 84 },
    '주방용품 매대': { x: 422, y: 113 },
    '욕실/청소용품 매대': { x: 500, y: 120 },
    '기타 매대': { x: 277, y: 306 },
    '의약품/의료기기 매대': { x: 340, y: 265 },
    '문구/완구 매대': { x: 410, y: 265 },
    '디지털기기 매대': { x: 480, y: 265 },
    '영상·음향기기 매대': { x: 550, y: 265 },
    '생활가전 매대': { x: 620, y: 265 },
    '가구 매대': { x: 340, y: 345 },
    '침구·인테리어 매대': { x: 410, y: 345 },
    '패션·의류 매대': { x: 480, y: 345 },
    '스포츠의류 매대': { x: 550, y: 345 },
    '가정의류/잡화 매대': { x: 620, y: 345 },
  };

  return nameToCoordinates[sectionName] || null;
}

// 쇼핑 리스트 처리 - 벡터 DB 기반 (개선됨)
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

  // 각 아이템별로 벡터 DB에서 매대 찾기
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

      // 🔧 백업: 알려진 상품이면 기본 매대로 배정
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

  // 매대별로 그룹화된 결과 생성
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

// 🔧 백업 매대 정보 (일반적인 상품들)
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

  return fallbackMap[productName] || null;
}

// 🔧 경로 최적화 (주차장 기준 가까운 순서 + 계산대 마지막)
export function optimizeRoute(items: ShoppingItem[]): ShoppingItem[] {
  return items.sort((a, b) => {
    const distA = Math.sqrt(
      Math.pow(a.coordinates.x - START_POINT.x, 2) +
        Math.pow(a.coordinates.y - START_POINT.y, 2),
    );

    const distB = Math.sqrt(
      Math.pow(b.coordinates.x - START_POINT.x, 2) +
        Math.pow(b.coordinates.y - START_POINT.y, 2),
    );

    return distA - distB;
  });
}

// 🔧 최종 경로 데이터 생성 - 주차장→매대들→계산대 순서
export async function createRouteDataFromVector(
  items: string[],
): Promise<RouteData | null> {
  if (!items || items.length === 0) {
    console.log('❌ 입력 아이템이 없습니다');
    return null;
  }

  console.log('🗺️ 벡터 DB 기반 경로 생성 시작 (주차장→매대→계산대):', items);

  try {
    // 1. 벡터 DB에서 쇼핑 아이템 처리
    const shoppingItems = await processShoppingListFromVector(items);

    if (shoppingItems.length === 0) {
      console.log('❌ 처리된 쇼핑 아이템이 없습니다');
      return null;
    }

    console.log('📋 처리된 쇼핑 아이템:', shoppingItems.length, '개');

    // 2. 경로 최적화 (주차장 기준)
    const optimizedRoute = optimizeRoute(shoppingItems);

    // 3. RouteData 객체 구성
    const routeItems: Product[] = [];
    const routePoints: RoutePoint[] = [];

    // 🔧 시작점 추가 (주차장)
    routePoints.push({
      order: 0,
      item: '시작',
      location: '주차장',
      section: '0',
      coordinates: START_POINT,
    });

    // 매대 경로 추가
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

      // 경로 포인트 추가
      routePoints.push({
        order: index + 1,
        item: item.productNames.join(', '),
        location: item.sectionName,
        section: item.sectionId.toString(),
        coordinates: item.coordinates,
      });
    });

    // 🔧 종착점 추가 (계산대)
    routePoints.push({
      order: routePoints.length,
      item: '결제',
      location: '계산대',
      section: '999',
      coordinates: END_POINT,
    });

    // 🔧 총 거리 계산 (주차장→매대들→계산대)
    let totalDistance = 0;
    for (let i = 0; i < routePoints.length - 1; i++) {
      const current = routePoints[i].coordinates;
      const next = routePoints[i + 1].coordinates;
      const dist = Math.sqrt(
        Math.pow(next.x - current.x, 2) + Math.pow(next.y - current.y, 2),
      );
      totalDistance += dist;
    }

    const result = {
      items: routeItems,
      route: routePoints,
      total_distance: Math.round(totalDistance),
    };

    console.log('✅ 벡터 DB 기반 경로 생성 완료:', {
      아이템수: result.items.length,
      경로수: result.route.length,
      총거리: result.total_distance,
      경로: `주차장(${START_POINT.x},${START_POINT.y}) → ${optimizedRoute.length}개 매대 → 계산대(${END_POINT.x},${END_POINT.y})`,
    });

    return result;
  } catch (error) {
    console.error('❌ 벡터 DB 기반 경로 생성 실패:', error);
    return null;
  }
}

// 기존 함수들을 벡터 DB 기반으로 교체
export const createRouteData = createRouteDataFromVector;
export const processShoppingList = processShoppingListFromVector;
export const findSectionByProduct = findSectionByProductFromVector;
