// lib/productDatabase.ts - 벡터 DB 기반으로 완전히 재구성
import { Product, RoutePoint, RouteData } from '@/interfaces/route';
import { searchVectorDB } from './vectorstore';

// 쇼핑 아이템 인터페이스
export interface ShoppingItem {
  productNames: string[];
  sectionName: string;
  sectionId: number;
  coordinates: { x: number; y: number };
}

// 벡터 DB에서 상품 정보를 검색하여 매대 찾기
export async function findSectionByProductFromVector(productName: string): Promise<{ sectionId: number; sectionName: string; coordinates: { x: number; y: number } } | null> {
  try {
    console.log('🔍 벡터 DB에서 상품 검색:', productName);
    
    // 1. 벡터 DB에서 상품 검색 (상품명으로 검색)
    const searchResults = await searchVectorDB(productName, 5);
    console.log('🔎 벡터 검색 결과:', searchResults.length, '개');
    
    if (!searchResults || searchResults.length === 0) {
      console.log('❌ 벡터 DB에서 상품을 찾을 수 없음:', productName);
      return null;
    }
    
    // 2. 검색 결과에서 매대 정보 추출
    for (const result of searchResults) {
      const content = result.pageContent;
      const metadata = result.metadata || {};
      
      console.log('📄 검색 결과 분석:', {
        content: content.substring(0, 100),
        metadata: metadata
      });
      
      // 메타데이터에서 section 정보 추출
      let sectionId: number | null = null;
      let sectionName: string | null = null;
      
      // 메타데이터에서 직접 추출
      if (metadata.section_id) {
        sectionId = parseInt(metadata.section_id);
      }
      if (metadata.section_name) {
        sectionName = metadata.section_name;
      }
      
      // content에서 패턴 매칭으로 추출 (백업)
      if (!sectionId || !sectionName) {
        // "매대: 12번 과일·채소 매대" 같은 패턴 찾기
        const sectionMatch = content.match(/매대.*?(\d+).*?([가-힣·\s]+매대)/);
        if (sectionMatch) {
          sectionId = parseInt(sectionMatch[1]);
          sectionName = sectionMatch[2].trim();
        }
        
        // "과일·채소 매대 (12번)" 같은 패턴 찾기
        const alternativeMatch = content.match(/[가-힣·\s]+매대\).*?\((\d+)번?\)/) ;
        if (alternativeMatch) {
          sectionName = alternativeMatch[1].trim();
          sectionId = parseInt(alternativeMatch[2]);
        }
      }
      
      if (sectionId && sectionName) {
        // 3. 매대 좌표 가져오기 (sections 테이블에서)
        const coordinates = await getSectionCoordinates(sectionId);
        if (coordinates) {
          console.log('✅ 매칭 성공:', {
            product: productName,
            sectionId,
            sectionName,
            coordinates
          });
          
          return {
            sectionId,
            sectionName,
            coordinates
          };
        }
      }
    }
    
    console.log('❌ 매대 정보를 추출할 수 없음');
    return null;
    
  } catch (error) {
    console.error('벡터 DB 검색 중 오류:', error);
    return null;
  }
}

// 매대 ID로 좌표 가져오기 (sections 테이블 기반)
async function getSectionCoordinates(sectionId: number): Promise<{ x: number; y: number } | null> {
  // 하드코딩된 좌표 매핑 (실제 DB 좌표)
  const sectionCoordinates: Record<number, { x: number; y: number }> = {
    1: { x: 80, y: 320 },   // 조미료 매대
    2: { x: 80, y: 380 },   // 냉장·냉동 매대
    3: { x: 80, y: 440 },   // 가공육 매대
    4: { x: 160, y: 560 },  // 즉석식품 매대
    5: { x: 230, y: 560 },  // 통조림 매대
    6: { x: 300, y: 560 },  // 기타 식품 매대
    7: { x: 370, y: 560 },  // 건강식품 매대
    8: { x: 440, y: 560 },  // 유아·영유아 매대
    9: { x: 510, y: 560 },  // 과자·스낵 매대
    10: { x: 580, y: 560 }, // 음료·주류 매대
    11: { x: 650, y: 560 }, // 신선세트 매대
    12: { x: 720, y: 560 }, // 과일·채소 매대 ⭐
    13: { x: 950, y: 470 }, // 정육 매대
    14: { x: 950, y: 360 }, // 수산 매대
    15: { x: 950, y: 320 }, // 생활용품 매대
    16: { x: 950, y: 240 }, // 반려동물 매대
    17: { x: 850, y: 150 }, // 자동차용품 매대
    18: { x: 750, y: 180 }, // 주방용품 매대
    19: { x: 742, y: 240 }, // 욕실/청소용품 매대
    20: { x: 650, y: 430 }, // 기타 매대
    21: { x: 480, y: 400 }, // 의약품/의료기기 매대
    22: { x: 550, y: 400 }, // 문구/완구 매대
    23: { x: 620, y: 400 }, // 디지털기기 매대
    24: { x: 690, y: 400 }, // 영상·음향기기 매대
    25: { x: 760, y: 400 }, // 생활가전 매대
    26: { x: 480, y: 470 }, // 가구 매대
    27: { x: 550, y: 470 }, // 침구·인테리어 매대
    28: { x: 620, y: 470 }, // 패션·의류 매대
    29: { x: 690, y: 470 }, // 스포츠의류 매대
    30: { x: 760, y: 470 }, // 가정의류/잡화 매대
  };
  
  return sectionCoordinates[sectionId] || null;
}

// 매대명으로 좌표 가져오기 (백업용)
async function getSectionCoordinatesByName(sectionName: string): Promise<{ x: number; y: number } | null> {
  const nameToCoordinates: Record<string, { x: number; y: number }> = {
    '조미료 매대': { x: 80, y: 320 },
    '냉장·냉동 매대': { x: 80, y: 380 },
    '가공육 매대': { x: 80, y: 440 },
    '즉석식품 매대': { x: 160, y: 560 },
    '통조림 매대': { x: 230, y: 560 },
    '기타 식품 매대': { x: 300, y: 560 },
    '건강식품 매대': { x: 370, y: 560 },
    '유아·영유아 매대': { x: 440, y: 560 },
    '과자·스낵 매대': { x: 510, y: 560 },
    '음료·주류 매대': { x: 580, y: 560 },
    '신선세트 매대': { x: 650, y: 560 },
    '과일·채소 매대': { x: 720, y: 560 }, // ⭐ 가장 중요
    '정육 매대': { x: 950, y: 470 },
    '수산 매대': { x: 950, y: 360 },
    '생활용품 매대': { x: 950, y: 320 },
    '반려동물 매대': { x: 950, y: 240 },
    '자동차용품 매대': { x: 850, y: 150 },
    '주방용품 매대': { x: 750, y: 180 },
    '욕실/청소용품 매대': { x: 742, y: 240 },
    '기타 매대': { x: 650, y: 430 },
    '의약품/의료기기 매대': { x: 480, y: 400 },
    '문구/완구 매대': { x: 550, y: 400 },
    '디지털기기 매대': { x: 620, y: 400 },
    '영상·음향기기 매대': { x: 690, y: 400 },
    '생활가전 매대': { x: 760, y: 400 },
    '가구 매대': { x: 480, y: 470 },
    '침구·인테리어 매대': { x: 550, y: 470 },
    '패션·의류 매대': { x: 620, y: 470 },
    '스포츠의류 매대': { x: 690, y: 470 },
    '가정의류/잡화 매대': { x: 760, y: 470 },
  };
  
  return nameToCoordinates[sectionName] || null;
}

// 쇼핑 리스트 처리 - 벡터 DB 기반
export async function processShoppingListFromVector(items: string[]): Promise<ShoppingItem[]> {
  console.log('🛒 벡터 DB 기반 쇼핑 리스트 처리 시작:', items);
  
  const result: ShoppingItem[] = [];
  const sectionMap = new Map<string, { sectionId: number; sectionName: string; coordinates: { x: number; y: number }; products: string[] }>();
  
  // 각 아이템별로 벡터 DB에서 매대 찾기
  for (const item of items) {
    const sectionInfo = await findSectionByProductFromVector(item);
    if (sectionInfo) {
      const key = `${sectionInfo.sectionId}-${sectionInfo.sectionName}`;
      
      if (!sectionMap.has(key)) {
        sectionMap.set(key, {
          sectionId: sectionInfo.sectionId,
          sectionName: sectionInfo.sectionName,
          coordinates: sectionInfo.coordinates,
          products: []
        });
      }
      
      sectionMap.get(key)!.products.push(item);
    } else {
      console.warn('⚠️ 벡터 DB에서 매대를 찾을 수 없는 상품:', item);
    }
  }
  
  // 매대별로 그룹화된 결과 생성
  for (const sectionData of sectionMap.values()) {
    result.push({
      productNames: sectionData.products,
      sectionName: sectionData.sectionName,
      sectionId: sectionData.sectionId,
      coordinates: sectionData.coordinates
    });
  }
  
  console.log('✅ 벡터 DB 기반 처리 완료:', result);
  return result;
}

// 경로 최적화 (입구 기준 가까운 순서)
export function optimizeRoute(items: ShoppingItem[]): ShoppingItem[] {
  const entrance = { x: 530, y: 680 };
  
  return items.sort((a, b) => {
    const distA = Math.sqrt(
      Math.pow(a.coordinates.x - entrance.x, 2) +
      Math.pow(a.coordinates.y - entrance.y, 2)
    );
    
    const distB = Math.sqrt(
      Math.pow(b.coordinates.x - entrance.x, 2) +
      Math.pow(b.coordinates.y - entrance.y, 2)
    );
    
    return distA - distB;
  });
}

// 최종 경로 데이터 생성 - 벡터 DB 기반
export async function createRouteDataFromVector(items: string[]): Promise<RouteData | null> {
  if (!items || items.length === 0) {
    return null;
  }
  
  console.log('🗺️ 벡터 DB 기반 경로 생성 시작:', items);
  
  try {
    // 1. 벡터 DB에서 쇼핑 아이템 처리
    const shoppingItems = await processShoppingListFromVector(items);
    
    if (shoppingItems.length === 0) {
      console.log('❌ 처리된 쇼핑 아이템이 없습니다');
      return null;
    }
    
    // 2. 경로 최적화
    const optimizedRoute = optimizeRoute(shoppingItems);
    
    // 3. RouteData 객체 구성
    const routeItems: Product[] = [];
    const routePoints: RoutePoint[] = [];
    
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
    
    // 총 거리 계산
    const entrance = { x: 530, y: 680 };
    let totalDistance = 0;
    let prevCoord = entrance;
    
    for (const point of routePoints) {
      const coord = point.coordinates;
      const dist = Math.sqrt(
        Math.pow(coord.x - prevCoord.x, 2) + Math.pow(coord.y - prevCoord.y, 2)
      );
      totalDistance += dist;
      prevCoord = coord;
    }
    
    const result = {
      items: routeItems,
      route: routePoints,
      total_distance: Math.round(totalDistance),
    };
    
    console.log('✅ 벡터 DB 기반 경로 생성 완료:', result);
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