// lib/utils.ts - 햄, 차, 죽 등 한글자 음식명 인식 개선

/**
 * 사용자 입력에서 쇼핑 아이템 목록을 추출 (한 글자 허용 목록 확장)
 */
export function extractShoppingItems(text: string): string[] {
  console.log('🔍 원본 텍스트:', text);

  // 제외할 단어들 (동사, 조사, 감탄사 등) - 음식명은 제외하지 않도록 수정
  const excludeWords = [
    '사고싶어',
    '사고싶다',
    '사겠어',
    '사야지',
    '살래',
    '살거야',
    '구매할게',
    '구매하고싶어',
    '구매하겠어',
    '찾고있어',
    '찾아줘',
    '필요해',
    '원해',
    '가져다줘',
    '가져와',
    '주세요',
    '해주세요',
    '보여줘',
    '알려줘',
    '이야',
    '예요',
    '입니다',
    '이에요',
    '거야',
    '것',
    '걸',
    '를',
    '을',
    '에서',
    '에게',
    '한테',
    '부터',
    '까지',
    '와',
    '과',
    '하고',
    '랑',
    '이랑',
    '그리고',
    '또',
    '그냥',
    '좀',
    '조금',
    '많이',
    '진짜',
    '정말',
    '너무',
    '완전',
    '엄청',
    '되게',
    '정도',
    '쯤',
    '약간',
    '어',
    '아',
    '음',
    '네',
    '예',
    '응',
    '글쎄',
    '그런데',
    '근데',
    '하지만',
    '그래도',
    '그래서',
    '따라서',
    '왜냐하면',
    '때문에',
    '뭐',
    '뭘',
    '무엇을',
  ];

  // 1단계: 동사/어미 부분 제거
  let cleanedText = text
    .replace(
      /\s+(사고싶어|사고싶다|살거야|구매할게|찾고있어|필요해|원해|뭘\s*사고\s*싶다고|뭐\s*사고\s*싶어|뭐\s*사야|뭘\s*사야).*$/i,
      '',
    )
    .replace(/\s+(이야|예요|입니다|이에요).*$/i, '')
    .trim();

  console.log('🧹 전처리된 텍스트:', cleanedText);

  // 2단계: 쉼표나 접속사로 분리
  let items: string[] = [];

  // 먼저 쉼표로 분리 시도
  if (
    cleanedText.includes(',') ||
    cleanedText.includes('，') ||
    cleanedText.includes('、')
  ) {
    items = cleanedText
      .split(/[,，、]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  // 접속사로 분리 시도
  else if (/\s+(와|과|랑|하고|그리고|및)\s+/.test(cleanedText)) {
    items = cleanedText
      .split(/\s+(와|과|랑|하고|그리고|및)\s+/)
      .filter((item, index) => {
        // 홀수 인덱스는 접속사이므로 제외
        return index % 2 === 0 && item.trim().length > 0;
      })
      .map((item) => item.trim());
  }
  // 공백으로만 구분된 경우
  else {
    const words = cleanedText.split(/\s+/).filter((word) => word.length > 0);
    if (words.length >= 2 && words.length <= 6) {
      items = words;
    } else if (words.length === 1) {
      items = [cleanedText];
    }
  }

  console.log('🔍 1차 추출된 아이템:', items);

  // 3단계: 각 아이템 정리 (너무 공격적인 필터링 제거)
  const cleanedItems = items
    .map((item) => {
      // 각 아이템에서 불필요한 부분만 제거 (음식명은 보존)
      return item
        .replace(/^(그|저|이|그런|저런)\s*/, '') // 지시대명사 제거
        .replace(/\s*(을|를|도|이|가|은|는|의)\s*$/, '') // 조사 제거
        .replace(/\s*(들)\s*$/, '') // 복수형 제거
        .trim();
    })
    .filter((item) => {
      // 빈 문자열 제거
      if (!item || item.length === 0) {
        console.log('❌ 빈 문자열 제거:', item);
        return false;
      }

      // 제외 단어 확인 (정확히 일치하는 경우만)
      if (excludeWords.includes(item)) {
        console.log('❌ 제외 단어:', item);
        return false;
      }

      // 제외 단어가 포함된 경우 확인 (부분 일치는 더 엄격하게)
      const containsExcludeWord = excludeWords.some((excludeWord) => {
        // 긴 제외 단어만 부분 일치 검사 (3글자 이상)
        if (excludeWord.length >= 3) {
          return item.includes(excludeWord);
        }
        return false;
      });

      if (containsExcludeWord) {
        console.log('❌ 제외 단어 포함:', item);
        return false;
      }

      // 숫자만 있는 경우 제거
      if (/^\d+$/.test(item)) {
        console.log('❌ 숫자만:', item);
        return false;
      }

      // 특수문자만 있는 경우 제거
      if (/^[^\w가-힣]+$/u.test(item)) {
        console.log('❌ 특수문자만:', item);
        return false;
      }

      // 🔧 한 글자 단어 허용 목록 확장 (일반적인 한글자 음식명들)
      const allowedSingleChars = [
        '쌀',
        '콩',
        '김',
        '떡',
        '죽',
        '차',
        '술',
        '햄',
        '빵',
        '꿀',
        '잼',
        '젤',
        '국',
        '탕',
        '면',
        '밥',
        '죽',
        '물',
        '차',
        '술',
        '주',
        '과',
        '등',
        '참',
        '깨',
        '염',
        '소',
        '당',
        '유',
        '기',
        '생',
        '감',
        '배',
        '귤',
        '밤',
      ];

      if (item.length === 1 && !allowedSingleChars.includes(item)) {
        console.log('❌ 한 글자 (허용 목록 제외):', item);
        return false;
      }

      console.log('✅ 통과:', item);
      return true;
    });

  // 4단계: 중복 제거
  const uniqueItems = [...new Set(cleanedItems)];

  console.log('✅ 최종 추출된 쇼핑 아이템:', uniqueItems);
  return uniqueItems;
}

/**
 * Claude 응답에서 경로 데이터를 JSON 형식으로 파싱
 */
export function parseRouteData(responseText: string): any {
  try {
    // JSON 블록 찾기
    const jsonPattern = /```json\s*([\s\S]*?)\s*```/;
    const matches = responseText.match(jsonPattern);

    if (matches && matches[1]) {
      const jsonStr = matches[1].trim();
      return JSON.parse(jsonStr);
    }

    return null;
  } catch (error) {
    console.error('JSON 파싱 에러:', error);
    return null;
  }
}

export const deduplicateRouteByLocation = (route: any[]) => {
  return Array.from(
    new Map(
      route
        .filter((item) => item && item.location) // ✅ location 없는 거 걸러냄
        .map((item) => [item.location, item]),
    ).values(),
  );
};
