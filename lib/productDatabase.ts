// lib/productDatabase.ts
import { Product, RoutePoint, RouteData } from '@/interfaces/route';

// 상품 데이터 인터페이스 확장
export interface ProductItem {
  id: string; // KAN_CODE
  name: string; // 실제 상품명 (CLS_NM_4)
  category1: string; // CLS_NM_1 (가공식품, 의류 등)
  category2: string; // CLS_NM_2 (조미료, 패션의류 등)
  category3: string; // CLS_NM_3 (종합조미료, 여성의류 등)
  displayName: string; // 매대이름 (조미료 매대, 패션·의류 매대 등)
}

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

// 섹션 위치 인터페이스
export interface SectionLocation {
  sectionName: string; // 매대이름
  x: number; // location_x 좌표
  y: number; // location_y 좌표
}

// 쇼핑 아이템 인터페이스
export interface ShoppingItem {
  productNames: string[]; // 해당 매대에 있는 모든 상품명
  sectionName: string; // 매대 이름
  coordinates: { x: number; y: number }; // 매대 위치
}

// 마트 섹션 데이터 - 기존 데이터에서 업데이트 (DB에서 로드한 정보 기반)
export const martSections: Section[] = [
  {
    id: '01',
    name: '조미료 매대',
    category: '식료품',
    coordinates: { x: 60, y: 140 },
  },
  {
    id: '02',
    name: '냉장·냉동 매대',
    category: '식료품',
    coordinates: { x: 60, y: 310 },
  },
  {
    id: '03',
    name: '가공육 매대',
    category: '식료품',
    coordinates: { x: 60, y: 460 },
  },
  {
    id: '04',
    name: '즉석식품 매대',
    category: '식료품',
    coordinates: { x: 535, y: 305 },
  },
  {
    id: '05',
    name: '통조림 매대',
    category: '식료품',
    coordinates: { x: 605, y: 305 },
  },
  {
    id: '06',
    name: '기타 식품 매대',
    category: '식료품',
    coordinates: { x: 788, y: 280 },
  },
  {
    id: '07',
    name: '건강식품 매대',
    category: '식료품',
    coordinates: { x: 535, y: 460 },
  },
  {
    id: '08',
    name: '유아·영유아 매대',
    category: '식료품',
    coordinates: { x: 605, y: 460 },
  },
  {
    id: '09',
    name: '과자·스낵 매대',
    category: '식료품',
    coordinates: { x: 1062, y: 158 },
  },
  {
    id: '10',
    name: '음료·주류 매대',
    category: '식료품',
    coordinates: { x: 1113, y: 140 },
  },
  {
    id: '11',
    name: '신선세트 매대',
    category: '신선식품',
    coordinates: { x: 726, y: 280 },
  },
  {
    id: '12',
    name: '과일·채소 매대',
    category: '신선식품',
    coordinates: { x: 1200, y: 140 },
  },
  {
    id: '13',
    name: '정육 매대',
    category: '신선식품',
    coordinates: { x: 530, y: 685 },
  },
  {
    id: '14',
    name: '수산 매대',
    category: '신선식품',
    coordinates: { x: 605, y: 460 },
  },
  {
    id: '15',
    name: '생활용품 매대',
    category: '생활용품',
    coordinates: { x: 606, y: 158 },
  },
  {
    id: '16',
    name: '반려동물 매대',
    category: '생활용품',
    coordinates: { x: 742, y: 158 },
  },
  {
    id: '17',
    name: '자동차용품 매대',
    category: '생활용품',
    coordinates: { x: 1062, y: 124 },
  },
  {
    id: '18',
    name: '주방용품 매대',
    category: '생활용품',
    coordinates: { x: 675, y: 158 },
  },
  {
    id: '19',
    name: '욕실/청소용품 매대',
    category: '생활용품',
    coordinates: { x: 742, y: 124 },
  },
  {
    id: '20',
    name: '기타 매대',
    category: '기타',
    coordinates: { x: 925, y: 158 },
  },
  {
    id: '21',
    name: '의약품/의료기기 매대',
    category: '의약품',
    coordinates: { x: 795, y: 140 },
  },
  {
    id: '22',
    name: '문구/완구 매대',
    category: '문구/완구',
    coordinates: { x: 850, y: 395 },
  },
  {
    id: '23',
    name: '디지털기기 매대',
    category: '가전/디지털',
    coordinates: { x: 875, y: 140 },
  },
  {
    id: '24',
    name: '영상·음향기기 매대',
    category: '가전/디지털',
    coordinates: { x: 925, y: 124 },
  },
  {
    id: '25',
    name: '생활가전 매대',
    category: '가전/디지털',
    coordinates: { x: 994, y: 124 },
  },
  {
    id: '26',
    name: '가구 매대',
    category: '가구/인테리어',
    coordinates: { x: 675, y: 124 },
  },
  {
    id: '27',
    name: '침구·인테리어 매대',
    category: '가구/인테리어',
    coordinates: { x: 606, y: 124 },
  },
  {
    id: '28',
    name: '패션·의류 매대',
    category: '의류',
    coordinates: { x: 850, y: 280 },
  },
  {
    id: '29',
    name: '스포츠의류 매대',
    category: '의류',
    coordinates: { x: 726, y: 395 },
  },
  {
    id: '30',
    name: '가정의류/잡화 매대',
    category: '의류',
    coordinates: { x: 788, y: 395 },
  },
  {
    id: 'entrance',
    name: '입구',
    category: '시설',
    coordinates: { x: 530, y: 680 },
  },
];

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

// 매대 이름으로 위치 정보 조회
export function getSectionLocationByName(
  sectionName: string,
): { x: number; y: number } | null {
  const section = martSections.find((s) => s.name === sectionName);
  return section ? section.coordinates : null;
}

// 상품명 유사어 매핑 (사용자 입력과 실제 DB 상품명 연결)
export const productNameMapping: Record<string, string[]> = {
  // 식품 관련
  우유: ['우유', '멸균우유', '저지방우유', '두유', '연유'],
  빵: ['식빵', '베이커리', '빵류', '토스트', '바게트', '페이스트리'],
  과자: ['과자', '스낵', '쿠키', '비스킷', '칩', '크래커'],
  라면: ['라면', '봉지라면', '컵라면', '즉석면', '국수'],
  통조림: ['참치캔', '통조림', '캔', '꽁치통조림'],
  음료: ['음료', '주스', '탄산음료', '물', '생수', '에너지드링크'],
  커피: ['커피', '원두', '인스턴트커피', '커피믹스', '에스프레소'],
  차류: ['차', '녹차', '홍차', '허브차', '티백'],
  주류: ['술', '맥주', '소주', '와인', '위스키'],
  소스: ['소스', '케첩', '마요네즈', '드레싱', '디핑소스'],
  조미료: ['소금', '설탕', '간장', '식초', '고춧가루', '된장', '고추장'],

  // 신선식품
  돼지고기: ['돼지고기', '삼겹살', '목살', '돈육', '돼지갈비', '돈까스'],
  소고기: ['소고기', '쇠고기', '한우', '등심', '안심', '갈비'],
  닭고기: ['닭고기', '닭가슴살', '닭다리', '닭날개', '통닭'],
  계란: ['계란', '달걀', '유정란', '메추리알'],
  생선: ['생선', '어류', '회', '연어', '고등어', '참치', '멸치'],
  해산물: ['해산물', '조개', '새우', '문어', '오징어'],
  두부: ['두부', '유부', '순두부'],

  // 과일/채소
  사과: ['사과', '청사과', '홍로사과', '부사'],
  바나나: ['바나나', '수입바나나', '플랜틴'],
  오이: ['오이', '백오이', '취청오이', '다다기오이'],
  당근: ['당근', '미니당근'],
  감자: ['감자', '홍감자', '수미감자'],
  양파: ['양파', '자색양파', '작은양파'],
  토마토: ['토마토', '방울토마토', '완숙토마토', '체리토마토'],
  딸기: ['딸기', '설향딸기'],
  포도: ['포도', '청포도', '샤인머스캣'],
  수박: ['수박', '미니수박', '씨없는수박'],

  // 의류
  티셔츠: ['티셔츠', '반팔티', '긴팔티', '맨투맨', '후드티'],
  바지: ['바지', '슬랙스', '면바지', '청바지', '반바지'],
  셔츠: ['셔츠', '남방', '블라우스', '와이셔츠'],
  원피스: ['원피스', '드레스'],
  코트: ['코트', '트렌치코트', '롱코트'],
  재킷: ['재킷', '점퍼', '자켓'],
  속옷: ['속옷', '팬티', '브라', '런닝'],
  양말: ['양말', '스타킹', '레깅스'],

  // 생활용품
  세제: ['세제', '세탁세제', '섬유유연제', '주방세제'],
  화장지: ['화장지', '휴지', '티슈', '물티슈'],
  치약: ['치약', '칫솔', '구강청결제'],
  샴푸: ['샴푸', '린스', '컨디셔너', '바디워시'],
  비누: ['비누', '손세정제', '핸드워시'],
  마스크: ['마스크', '위생마스크', '황사마스크'],

  // 기타 일반용품
  건전지: ['건전지', '배터리', '충전지'],
  노트: ['노트', '메모지', '수첩', '다이어리'],
  펜: ['펜', '볼펜', '연필', '샤프', '형광펜'],
};

// 카테고리별 매대 매핑 (DB 데이터 기반 확장)
export const categoryToSectionMap: Record<string, string> = {
  // 대분류(category1) 기준 매핑
  의류: '패션·의류 매대',
  가공식품: '가공육 매대',
  신선식품: '신선세트 매대',
  생활용품: '생활용품 매대',
  '가전/디지털': '디지털기기 매대',
  '가구/인테리어': '가구 매대',

  // 중분류(category2) 기준 매핑
  패션의류: '패션·의류 매대',
  조미료: '조미료 매대',
  음료: '음료·주류 매대',
  '과자/간식': '과자·스낵 매대',
  스포츠의류: '스포츠의류 매대',
  '냉장/냉동식품': '냉장·냉동 매대',
  주방용품: '주방용품 매대',
  욕실용품: '욕실/청소용품 매대',
  청소용품: '욕실/청소용품 매대',
  문구: '문구/완구 매대',
  완구: '문구/완구 매대',
  의약품: '의약품/의료기기 매대',
  반려동물: '반려동물 매대',
  자동차용품: '자동차용품 매대',

  // 세부분류(category3) 기준 매핑
  여성의류: '패션·의류 매대',
  남성의류: '패션·의류 매대',
  아동의류: '패션·의류 매대',
  과일: '과일·채소 매대',
  채소: '과일·채소 매대',
  정육: '정육 매대',
  수산물: '수산 매대',
  즉석식품: '즉석식품 매대',
  통조림: '통조림 매대',
  건강식품: '건강식품 매대',
  '유아/영유아식품': '유아·영유아 매대',
};

// 매대별 상품 데이터 매핑 (샘플 데이터 - 실제로는 DB에서 가져옴)
export const sectionProductMapping: Record<string, string[]> = {
  '조미료 매대': [
    '소금',
    '설탕',
    '간장',
    '고추장',
    '된장',
    '식초',
    '물엿',
    '육수',
    '양념장',
    '천일염',
    '가공염',
  ],
  '냉장·냉동 매대': [
    '우유',
    '요거트',
    '치즈',
    '버터',
    '두부',
    '계란',
    '아이스크림',
    '냉동만두',
    '냉동피자',
  ],
  '가공육 매대': ['라면', '즉석밥', '햄', '소시지', '스팸', '통조림', '즉석국'],
  '즉석식품 매대': [
    '김밥',
    '샌드위치',
    '도시락',
    '즉석국',
    '즉석조리식품',
    '냉장간편식',
  ],
  '통조림 매대': ['참치캔', '꽁치캔', '햄', '스팸', '과일통조림', '야채통조림'],
  '과자·스낵 매대': [
    '과자',
    '스낵',
    '사탕',
    '초콜릿',
    '젤리',
    '껌',
    '시리얼',
    '쿠키',
    '비스킷',
  ],
  '음료·주류 매대': [
    '생수',
    '탄산음료',
    '주스',
    '커피',
    '에너지드링크',
    '맥주',
    '소주',
    '와인',
    '위스키',
  ],
  '과일·채소 매대': [
    '사과',
    '바나나',
    '딸기',
    '포도',
    '오이',
    '당근',
    '토마토',
    '양파',
    '감자',
    '고구마',
  ],
  '정육 매대': ['돼지고기', '소고기', '닭고기', '소시지', '베이컨', '햄'],
  '패션·의류 매대': [
    '티셔츠',
    '바지',
    '셔츠',
    '원피스',
    '코트',
    '재킷',
    '스웨터',
    '니트',
    '청바지',
    '스커트',
    '브라우스',
  ],
  '욕실/청소용품 매대': [
    '샴푸',
    '린스',
    '바디워시',
    '비누',
    '치약',
    '칫솔',
    '세제',
    '섬유유연제',
    '청소용품',
  ],
  '생활용품 매대': [
    '화장지',
    '물티슈',
    '일회용품',
    '주방용품',
    '생활잡화',
    '메이크업리무버',
  ],
  '디지털기기 매대': [
    '이어폰',
    '충전기',
    '배터리',
    '메모리카드',
    '휴대폰액세서리',
  ],
  // 추가 매핑...
};

// 상품명으로 매대 찾기
export function findSectionByProduct(productName: string): string | null {
  // 1. 상품명 정규화 (소문자 변환, 공백 제거)
  const normalizedName = productName.toLowerCase().trim();

  // 2. 매핑 검색 - 유사어 기반
  for (const [key, aliases] of Object.entries(productNameMapping)) {
    if (
      aliases.some(
        (alias) =>
          alias.toLowerCase().includes(normalizedName) ||
          normalizedName.includes(alias.toLowerCase()),
      )
    ) {
      // 3. 해당 상품이 속한 매대 찾기
      for (const [section, products] of Object.entries(sectionProductMapping)) {
        if (products.includes(key)) {
          return section;
        }
      }
    }
  }

  // 4. 직접 매대 검색
  for (const [section, products] of Object.entries(sectionProductMapping)) {
    for (const product of products) {
      if (
        product.toLowerCase().includes(normalizedName) ||
        normalizedName.includes(product.toLowerCase())
      ) {
        return section;
      }
    }
  }

  // 5. 일반적인 카테고리 기반 매핑 (예: 사용자가 "과일"이라고 입력한 경우)
  for (const [category, section] of Object.entries(categoryToSectionMap)) {
    if (
      category.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(category.toLowerCase())
    ) {
      return section;
    }
  }

  // 6. 상품명과 비슷한 카테고리가 있는지 확인 (부분 일치)
  for (const [category, section] of Object.entries(categoryToSectionMap)) {
    // 각 단어별로 확인 (예: "빨간 사과"에서 "사과"가 "과일"과 연관)
    const words = normalizedName.split(/\s+/);
    for (const word of words) {
      if (
        word.length > 1 &&
        (category.toLowerCase().includes(word) ||
          category
            .toLowerCase()
            .split(/\s+/)
            .some((part) => part.includes(word)))
      ) {
        return section;
      }
    }
  }

  // 7. 기본 매대 반환 (패션·의류 매대를 기본값으로 설정)
  return '패션·의류 매대';
}

// 쇼핑 리스트 처리 - 매대별 그룹화
export function processShoppingList(items: string[]): ShoppingItem[] {
  // 쇼핑 아이템별로 매대 정보 조회
  const productSectionMap = new Map<string, string>();

  for (const item of items) {
    const section = findSectionByProduct(item);
    if (section) {
      productSectionMap.set(item, section);
    }
  }

  // 매대별로 상품 그룹화
  const sectionMap = new Map<string, string[]>();

  for (const [itemName, section] of productSectionMap.entries()) {
    if (!sectionMap.has(section)) {
      sectionMap.set(section, []);
    }

    const sectionItems = sectionMap.get(section)!;
    sectionItems.push(itemName);
  }

  // 매대 위치 정보 결합
  const result: ShoppingItem[] = [];

  for (const [sectionName, productNames] of sectionMap.entries()) {
    const coordinates = getSectionLocationByName(sectionName);

    if (coordinates) {
      result.push({
        productNames,
        sectionName,
        coordinates,
      });
    }
  }

  return result;
}

// 경로 최적화 (간단한 구현 - 실제로는 더 복잡한 TSP 알고리즘 적용)
export function optimizeRoute(items: ShoppingItem[]): ShoppingItem[] {
  // 입구 위치
  const entrance = { x: 530, y: 680 };

  // 거리 기반 정렬 (가까운 순서대로)
  return items.sort((a, b) => {
    const distA = Math.sqrt(
      Math.pow(a.coordinates.x - entrance.x, 2) +
        Math.pow(a.coordinates.y - entrance.y, 2),
    );

    const distB = Math.sqrt(
      Math.pow(b.coordinates.x - entrance.x, 2) +
        Math.pow(b.coordinates.y - entrance.y, 2),
    );

    return distA - distB;
  });
}

// 최종 경로 데이터 생성
export function createRouteData(items: string[]): RouteData | null {
  if (!items || items.length === 0) {
    return null;
  }

  // 1. 쇼핑 아이템 처리
  const shoppingItems = processShoppingList(items);

  if (shoppingItems.length === 0) {
    return null;
  }

  // 2. 경로 최적화
  const optimizedRoute = optimizeRoute(shoppingItems);

  // 3. RouteData 객체 구성
  const routeItems: Product[] = [];
  const routePoints: RoutePoint[] = [];

  // 입구 위치
  const entrance = { x: 530, y: 680 };

  // 각 매대 정보 구성
  optimizedRoute.forEach((item, index) => {
    // 상품 정보 추가
    item.productNames.forEach((name) => {
      routeItems.push({
        name: name,
        location: item.sectionName,
        section: item.sectionName.split(' ')[0], // 간단하게 첫 단어를 섹션 ID로 사용
        coordinates: item.coordinates,
      });
    });

    // 경로 포인트 추가
    routePoints.push({
      order: index + 1,
      item: item.productNames.join(', '),
      location: item.sectionName,
      section: item.sectionName.split(' ')[0],
      coordinates: item.coordinates,
    });
  });

  // 총 거리 계산
  let totalDistance = 0;
  let prevCoord = entrance;

  for (const point of routePoints) {
    const coord = point.coordinates;
    const dist = Math.sqrt(
      Math.pow(coord.x - prevCoord.x, 2) + Math.pow(coord.y - prevCoord.y, 2),
    );

    totalDistance += dist;
    prevCoord = coord;
  }

  // RouteData 반환
  return {
    items: routeItems,
    route: routePoints,
    total_distance: Math.round(totalDistance),
  };
}
