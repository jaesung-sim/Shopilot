// lib/productDatabase.ts
import { Product, RoutePoint, PathPoint, RouteData } from '@/interfaces/route';
import { findPath } from './pathfinding';

// 섹션 정보 타입
export interface Section {
  id: string;
  name: string;
  category: string;
  coordinates: {
    x: number;
    y: number;
  };
}

// 라우트 아이템 타입 (경로 포인트 포함)
export interface RouteItem {
  order: number;
  item: string;
  location: string;
  section: string;
  coordinates: { x: number; y: number };
  pathPoints?: PathPoint[]; // 이전 지점에서 이 지점까지의 상세 경로
}

// 섹션 맵 생성 (ID -> 좌표)
export const createSectionMap = (
  sections: Section[],
): Record<string, { x: number; y: number }> => {
  const map: Record<string, { x: number; y: number }> = {};

  sections.forEach((section) => {
    map[section.id] = section.coordinates;
  });

  return map;
};

// 마트 섹션 데이터
export const martSections: Section[] = [
  {
    id: '01',
    name: '음료',
    category: '식료품',
    coordinates: { x: 60, y: 140 },
  },
  {
    id: '02',
    name: '통조림',
    category: '식료품',
    coordinates: { x: 60, y: 310 },
  },
  {
    id: '03',
    name: '면류',
    category: '식료품',
    coordinates: { x: 60, y: 460 },
  },
  {
    id: '04',
    name: '과자/스낵',
    category: '식료품',
    coordinates: { x: 535, y: 305 },
  },
  {
    id: '05',
    name: '빵/베이커리',
    category: '식료품',
    coordinates: { x: 605, y: 305 },
  },
  {
    id: '06',
    name: '조미료/양념',
    category: '식료품',
    coordinates: { x: 535, y: 460 },
  },
  {
    id: '07',
    name: '건어물',
    category: '식료품',
    coordinates: { x: 605, y: 460 },
  },
  {
    id: '08',
    name: '냉장육류',
    category: '신선식품',
    coordinates: { x: 726, y: 280 },
  },
  {
    id: '09',
    name: '냉장유제품',
    category: '신선식품',
    coordinates: { x: 788, y: 280 },
  },
  {
    id: '10',
    name: '냉장두부/계란',
    category: '신선식품',
    coordinates: { x: 850, y: 280 },
  },
  {
    id: '11',
    name: '냉장채소',
    category: '신선식품',
    coordinates: { x: 912, y: 280 },
  },
  {
    id: '12',
    name: '냉장과일',
    category: '신선식품',
    coordinates: { x: 974, y: 280 },
  },
  {
    id: '13',
    name: '냉장반찬',
    category: '신선식품',
    coordinates: { x: 1036, y: 280 },
  },
  {
    id: '14',
    name: '냉장간편식',
    category: '신선식품',
    coordinates: { x: 1098, y: 280 },
  },
  {
    id: '15',
    name: '냉동육류',
    category: '신선식품',
    coordinates: { x: 726, y: 395 },
  },
  {
    id: '16',
    name: '냉동식품',
    category: '신선식품',
    coordinates: { x: 788, y: 395 },
  },
  {
    id: '17',
    name: '냉동디저트',
    category: '신선식품',
    coordinates: { x: 850, y: 395 },
  },
  {
    id: '18',
    name: '냉동간편식',
    category: '신선식품',
    coordinates: { x: 912, y: 395 },
  },
  {
    id: '19',
    name: '냉동튀김류',
    category: '신선식품',
    coordinates: { x: 974, y: 395 },
  },
  {
    id: '20',
    name: '냉동만두',
    category: '신선식품',
    coordinates: { x: 1036, y: 395 },
  },
  {
    id: '21',
    name: '냉동수산물',
    category: '신선식품',
    coordinates: { x: 1098, y: 395 },
  },
  {
    id: '22',
    name: '생선회',
    category: '수산',
    coordinates: { x: 558, y: 140 },
  },
  {
    id: '23',
    name: '수산물',
    category: '수산',
    coordinates: { x: 606, y: 124 },
  },
  { id: '24', name: '젓갈', category: '수산', coordinates: { x: 675, y: 124 } },
  {
    id: '25',
    name: '건해산물',
    category: '수산',
    coordinates: { x: 742, y: 124 },
  },
  {
    id: '26',
    name: '김/해조류',
    category: '수산',
    coordinates: { x: 606, y: 158 },
  },
  {
    id: '27',
    name: '어묵/맛살',
    category: '수산',
    coordinates: { x: 675, y: 158 },
  },
  {
    id: '28',
    name: '수산가공품',
    category: '수산',
    coordinates: { x: 742, y: 158 },
  },
  {
    id: '29',
    name: '훈제오리',
    category: '닭고기',
    coordinates: { x: 795, y: 140 },
  },
  {
    id: '30',
    name: '닭가슴살',
    category: '닭고기',
    coordinates: { x: 875, y: 140 },
  },
  {
    id: '31',
    name: '닭고기',
    category: '닭고기',
    coordinates: { x: 925, y: 124 },
  },
  {
    id: '32',
    name: '돼지고기',
    category: '돼지고기',
    coordinates: { x: 994, y: 124 },
  },
  {
    id: '33',
    name: '소고기',
    category: '소고기',
    coordinates: { x: 1062, y: 124 },
  },
  {
    id: '34',
    name: '닭날개/다리',
    category: '닭고기',
    coordinates: { x: 925, y: 158 },
  },
  {
    id: '35',
    name: '돼지고기특수부위',
    category: '돼지고기',
    coordinates: { x: 994, y: 158 },
  },
  {
    id: '36',
    name: '소고기특수부위',
    category: '소고기',
    coordinates: { x: 1062, y: 158 },
  },
  {
    id: '37',
    name: '계란',
    category: '계란',
    coordinates: { x: 1113, y: 140 },
  },
  {
    id: 'entrance',
    name: '입구',
    category: '시설',
    coordinates: { x: 530, y: 680 },
  },
  {
    id: 'checkout',
    name: '계산대',
    category: '시설',
    coordinates: { x: 800, y: 655 },
  },
];

// 제품 데이터베이스
export const productDatabase: Product[] = [
  {
    name: '우유',
    location: '냉장유제품 코너',
    section: '09',
    coordinates: { x: 788, y: 280 },
  },
  {
    name: '치즈',
    location: '냉장유제품 코너',
    section: '09',
    coordinates: { x: 788, y: 280 },
  },
  {
    name: '요거트',
    location: '냉장유제품 코너',
    section: '09',
    coordinates: { x: 788, y: 280 },
  },
  {
    name: '계란',
    location: '냉장두부/계란 코너',
    section: '10',
    coordinates: { x: 850, y: 280 },
  },
  {
    name: '두부',
    location: '냉장두부/계란 코너',
    section: '10',
    coordinates: { x: 850, y: 280 },
  },
  {
    name: '소고기',
    location: '소고기 코너',
    section: '33',
    coordinates: { x: 1062, y: 124 },
  },
  {
    name: '돼지고기',
    location: '돼지고기 코너',
    section: '32',
    coordinates: { x: 994, y: 124 },
  },
  {
    name: '닭고기',
    location: '닭고기 코너',
    section: '31',
    coordinates: { x: 925, y: 124 },
  },
  {
    name: '생선',
    location: '수산물 코너',
    section: '23',
    coordinates: { x: 606, y: 124 },
  },
  {
    name: '빵',
    location: '빵/베이커리 코너',
    section: '05',
    coordinates: { x: 605, y: 305 },
  },
  {
    name: '과자',
    location: '과자/스낵 코너',
    section: '04',
    coordinates: { x: 535, y: 305 },
  },
  {
    name: '라면',
    location: '면류 코너',
    section: '03',
    coordinates: { x: 60, y: 460 },
  },
  {
    name: '참치캔',
    location: '통조림 코너',
    section: '02',
    coordinates: { x: 60, y: 310 },
  },
  {
    name: '물',
    location: '음료 코너',
    section: '01',
    coordinates: { x: 60, y: 140 },
  },
  {
    name: '주스',
    location: '음료 코너',
    section: '01',
    coordinates: { x: 60, y: 140 },
  },
  {
    name: '소금',
    location: '조미료/양념 코너',
    section: '06',
    coordinates: { x: 535, y: 460 },
  },
  {
    name: '설탕',
    location: '조미료/양념 코너',
    section: '06',
    coordinates: { x: 535, y: 460 },
  },
  {
    name: '간장',
    location: '조미료/양념 코너',
    section: '06',
    coordinates: { x: 535, y: 460 },
  },
  // 더 많은 제품 추가 (실제 마트 제품에 맞게)
];

// 제품 검색 함수
export const searchProducts = (query: string): Product[] => {
  const lowerQuery = query.toLowerCase().trim();

  return productDatabase.filter((product) =>
    product.name.toLowerCase().includes(lowerQuery),
  );
};

// 제품명으로 제품 찾기
export const findProductByName = (name: string): Product | undefined => {
  const lowerName = name.toLowerCase().trim();

  return productDatabase.find(
    (product) => product.name.toLowerCase() === lowerName,
  );
};

// 섹션 간 경로 계산 (A* 알고리즘 활용)
export const calculatePathBetweenSections = (
  fromSection: string,
  toSection: string,
  sectionMap: Record<string, { x: number; y: number }>,
  obstacles: PathPoint[] = [],
): PathPoint[] => {
  // 출발점과 도착점 좌표
  const start = sectionMap[fromSection];
  const end = sectionMap[toSection];

  if (!start || !end) {
    console.error('유효하지 않은 섹션 ID:', { fromSection, toSection });
    return [];
  }

  // 그래프 노드 생성 (마트 내 모든 가능한 위치)
  const graph: PathPoint[] = [];

  // 모든 섹션 좌표를 그래프에 추가
  for (const [id, coords] of Object.entries(sectionMap)) {
    graph.push({ ...coords, id });
  }

  // 통로와 교차점 추가 (실제 구현에서는 마트 레이아웃을 기반으로 더 정확한 그래프 구성 필요)
  // 여기서는 단순화를 위해 일부 주요 통로만 추가
  const aislePoints: PathPoint[] = [
    // 주요 통로 중심점
    { x: 300, y: 140 }, // 상단 가로 통로
    { x: 300, y: 280 }, // 중간 가로 통로
    { x: 300, y: 395 }, // 하단 가로 통로
    { x: 60, y: 220 }, // 왼쪽 세로 통로 1
    { x: 535, y: 380 }, // 오른쪽 세로 통로 1
    { x: 850, y: 220 }, // 오른쪽 세로 통로 2
    // 입구와 출구 주변 통로
    { x: 530, y: 600 }, // 입구 앞
    { x: 800, y: 600 }, // 계산대 앞
    // 추가 연결 포인트
    { x: 300, y: 600 }, // 하단 연결 통로
    { x: 500, y: 280 }, // 중앙 연결 통로
  ];

  // 통로 포인트를 그래프에 추가
  graph.push(...aislePoints);

  // A* 알고리즘을 사용하여 경로 계산
  return findPath(
    { ...start, id: fromSection },
    { ...end, id: toSection },
    graph,
    obstacles,
  );
};

// 섹션 ID 리스트로 전체 경로 계산
export const findPathBySections = (
  startSectionId: string,
  sectionIds: string[],
  sectionMap: Record<string, { x: number; y: number }>,
  obstacles: PathPoint[] = [],
): { path: PathPoint[]; segmentPaths: PathPoint[][]; distance: number } => {
  // 모든 경로 세그먼트 저장
  const segmentPaths: PathPoint[][] = [];

  // 최종 결합된 경로
  let combinedPath: PathPoint[] = [];

  // 총 거리
  let totalDistance = 0;

  // 현재 출발점 섹션
  let currentSectionId = startSectionId;

  // 각 섹션을 순회하며 경로 계산
  for (const nextSectionId of sectionIds) {
    // 현재 섹션에서 다음 섹션까지의 경로 계산
    const segmentPath = calculatePathBetweenSections(
      currentSectionId,
      nextSectionId,
      sectionMap,
      obstacles,
    );

    // 경로 세그먼트 저장
    segmentPaths.push([...segmentPath]);

    // 경로가 있을 경우 결합된 경로에 추가
    if (segmentPath.length > 0) {
      // 첫 번째 세그먼트가 아니면 중복 지점(현재 위치) 제거
      if (combinedPath.length > 0 && segmentPath.length > 0) {
        combinedPath = [...combinedPath, ...segmentPath.slice(1)];
      } else {
        combinedPath = [...combinedPath, ...segmentPath];
      }

      // 세그먼트 거리 계산
      for (let i = 1; i < segmentPath.length; i++) {
        const p1 = segmentPath[i - 1];
        const p2 = segmentPath[i];
        totalDistance += Math.sqrt(
          Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2),
        );
      }

      // 다음 루프를 위해 현재 섹션 업데이트
      currentSectionId = nextSectionId;
    }
  }

  // 최종 경로와 거리 반환
  return {
    path: combinedPath,
    segmentPaths,
    distance: Math.round(totalDistance),
  };
};

export const calculateOptimalRoute = (productNames: string[]): RouteData => {
  // 유효한 제품만 필터링
  const products: Product[] = [];

  for (const name of productNames) {
    const product = findProductByName(name);
    if (product) {
      products.push(product);
    }
  }

  if (products.length === 0) {
    return {
      items: [],
      route: [],
      total_distance: 0,
    };
  }

  // 섹션 맵 생성
  const sectionMap = createSectionMap(martSections);

  // 섹션 ID 목록 생성
  const sectionIds = products.map((product) => product.section);

  // A* 알고리즘으로 최적 경로 계산 - path 변수 제거
  const { segmentPaths, distance } = findPathBySections(
    'entrance',
    sectionIds,
    sectionMap,
  );

  // 경로 구성
  const route: RoutePoint[] = products.map((product, index) => {
    return {
      order: index + 1,
      item: product.name,
      location: product.location,
      section: product.section,
      coordinates: product.coordinates,
      pathPoints: segmentPaths[index] || [],
    };
  });

  return {
    items: products,
    route,
    total_distance: distance,
  };
};

// 최적의 방문 순서 계산 (여행자 문제 - 단순 근사 구현)
export const calculateOptimalVisitOrder = (
  products: Product[],
  startPosition: { x: number; y: number },
): Product[] => {
  // 이 부분에서는 복잡한 TSP(Traveling Salesman Problem) 알고리즘이 필요하지만,
  // 단순화를 위해 가장 가까운 이웃 휴리스틱 사용

  // 상품 복사 (원본 유지)
  const remainingProducts = [...products];
  const orderedProducts: Product[] = [];

  // 현재 위치
  let currentPosition = { ...startPosition };

  // 모든 상품을 방문할 때까지 반복
  while (remainingProducts.length > 0) {
    // 현재 위치에서 가장 가까운 상품 찾기
    let closestIdx = 0;
    let minDistance = Number.MAX_VALUE;

    for (let i = 0; i < remainingProducts.length; i++) {
      const product = remainingProducts[i];
      const dx = product.coordinates.x - currentPosition.x;
      const dy = product.coordinates.y - currentPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        closestIdx = i;
      }
    }

    // 가장 가까운 상품을 순서에 추가
    const nextProduct = remainingProducts.splice(closestIdx, 1)[0];
    orderedProducts.push(nextProduct);

    // 현재 위치 업데이트
    currentPosition = { ...nextProduct.coordinates };
  }

  return orderedProducts;
};

// 카테고리 기반 그룹화 (선택적)
export const groupProductsByCategory = (
  products: Product[],
): Record<string, Product[]> => {
  const groups: Record<string, Product[]> = {};

  for (const product of products) {
    // 제품의 섹션에 해당하는 섹션 객체 찾기
    const section = martSections.find((s) => s.id === product.section);
    if (!section) continue;

    // 카테고리별 그룹화
    const category = section.category;
    if (!groups[category]) {
      groups[category] = [];
    }

    groups[category].push(product);
  }

  return groups;
};
