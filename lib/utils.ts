// lib/utils.ts 파일 생성
/**
 * 사용자 입력에서 쇼핑 아이템 목록을 추출
 */
export function extractShoppingItems(text: string): string[] {
  // 쇼핑 아이템 추출을 위한 패턴들
  const patterns = [
    /(?:사고 싶은|구매할|살|찾는|필요한)(?:\s+)(?:물건|아이템|제품|품목)(?:은|는|이|가)?\s+(.*?)(?:이야|예요|입니다|이에요|\.|$)/i,
    /(.*?)(?:을|를|도|,)\s+(?:사고 싶어|구매하고 싶어|찾고 있어)/i,
    /(?:장바구니|카트|리스트)에\s+(.*?)(?:담아|추가|넣어)/i,
    /(.*?)(?:어디|위치|찾을 수)(?:에|서|)(?:있어|있나요|있을까요)/i,
  ];
  
  // 각 패턴으로 일치하는 부분 찾기
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches && matches[1]) {
      // 쉼표로 구분된 아이템을 분리하고 정리
      return matches[1]
        .split(/[,，、]|\s+(?:와|과|랑|하고|및)\s+/)
        .map(item => item.trim())
        .filter(Boolean);
    }
  }
  
  // 패턴이 일치하지 않으면 단순히 쉼표로 분리된 목록을 찾음
  if (text.includes(',')) {
    return text
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }
  
  return [];
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