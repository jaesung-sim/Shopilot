// lib/rag.ts
import { Anthropic } from '@anthropic-ai/sdk';
import { searchVectorDB } from './vectorstore';
import { extractShoppingItems } from './utils';
import { createRouteData } from './productDatabase';
import { getConversationHistory, addToMemory } from './memory';


// 시스템 프롬프트
const SYSTEM_PROMPT = `
당신은 마트 내 쇼핑을 돕는 장보기 도우미 로봇 'Shopilot(쇼핑 파일럿)'입니다.
목표는 소비자가 대형마트에서 쇼핑할 때 필요한 물품을 효율적으로 찾고 최적의 경로로 이동할 수 있도록 돕는 것입니다.

당신의 주요 기능:
1. 소비자가 찾는 물품의 위치 정보 제공
2. 쇼핑 리스트 기반으로 최적화된 쇼핑 경로 안내
3. 소비자의 쇼핑 관련 질문에 답변
4. 제품 추천 및 대안 제안

응답 스타일:
- 친절하고 도움이 되는 톤을 유지하세요.
- 간결하고 명확하게 답변하세요.
- 쇼핑 리스트가 제공되면 항상 경로 정보를 포함해주세요.

대화 기억:
- 이전 대화 내역을 참고하여 사용자의 선호도와 니즈를 기억하세요.
- 사용자가 이전에 언급한 물품이나 관심사를 기억하여 맥락에 맞는 응답을 제공하세요.

`;

// RAG 처리 함수
export async function processRAG(userMessage: string, userId: string = 'default') {
  console.log("RAG 처리 시작:", userMessage);
  
  try {
    // 이전 대화 내역 가져오기
    const conversationHistory = await getConversationHistory(userId);
    // 1. 쇼핑 아이템 추출
    const shoppingItems = extractShoppingItems(userMessage);
    console.log("추출된 쇼핑 아이템:", shoppingItems);

    // 2. 관련 문서 검색
    let searchResults = [];
    const searchQueries = [];

    // 아이템별 검색과 전체 메시지 검색 조합
    if (shoppingItems.length > 0) {
      // 각 아이템별 검색
      for (const item of shoppingItems) {
        searchQueries.push(item);
      }
    }

    // 전체 메시지도 포함
    searchQueries.push(userMessage);

    // 중복 제거된 검색 쿼리로 문서 검색
    const uniqueQueries = [...new Set(searchQueries)];
    console.log("검색 쿼리:", uniqueQueries);

    let searchSuccess = false;
    for (const query of uniqueQueries) {
      try {
        const results = await searchVectorDB(query, 3);
        if (results && results.length > 0) {
          searchResults.push(...results);
          searchSuccess = true;
        }
      } catch (searchError) {
        console.error(`검색 오류 (쿼리: ${query}):`, searchError);
        // 개별 검색 오류는 무시하고 계속 진행
      }
    }

    // 검색 결과가 없는 경우
    if (searchResults.length === 0) {
      console.log('검색 결과가 없습니다.');
      if (!searchSuccess && shoppingItems.length > 0) {
        console.log('벡터 검색 실패, 기본 경로 생성으로 대체합니다.');
      }
    } else {
      console.log(`${searchResults.length}개의 검색 결과를 찾았습니다.`);
    }

    // 중복 제거 (동일 문서 ID 기준)
    const uniqueDocIds = new Set();
    searchResults = searchResults
      .filter((doc) => {
        if (!doc || !doc.metadata) return false; // 유효하지 않은 문서 필터링
        const docId =
          doc.metadata?.id ||
          doc.pageContent?.slice(0, 50) ||
          Math.random().toString();
        if (uniqueDocIds.has(docId)) return false;
        uniqueDocIds.add(docId);
        return true;
      })
      .slice(0, 8); // 최대 8개 문서로 제한

    // 3. 컨텍스트 구성
    const context =
      searchResults.length > 0
        ? searchResults
            .map((doc, idx) => `[문서 ${idx + 1}] ${doc.pageContent}`)
            .join('\n\n')
        : '검색 결과가 없습니다.';

    // 소스 추출 (메타데이터 기반)
    const sources = searchResults.map((doc) => {
      const metadata = doc.metadata || {};
      return `${metadata.name || '상품'} (${
        metadata.section || '위치 정보 없음'
      })`;
    });

    // 4. 경로 데이터 계산 (아이템이 있는 경우)
    let routeData = null;
    if (shoppingItems.length > 0) {
      try {
        routeData = createRouteData(shoppingItems);
        console.log("경로 데이터 생성 완료:", routeData ? "성공" : "실패");
      } catch (routeError) {
        console.error('경로 계산 오류:', routeError);
        // 경로 계산 오류는 무시하고 계속 진행
      }
    }

    // 5. Claude API 호출
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    // 경로 정보를 포함한 프롬프트 구성
    let promptText = '';
    
    if (conversationHistory && conversationHistory.length > 0) {
      promptText += `이전 대화 내역:\n${conversationHistory}\n\n`;
    }
    
    if (searchResults.length > 0) {
      promptText += `다음은 마트 내 제품 정보입니다:\n\n${context}\n\n`;
    }

    if (routeData && routeData.items && routeData.items.length > 0) {
      promptText += `다음 상품에 대한 쇼핑 경로를 계산했습니다:\n`;

      promptText += routeData.items
        .map(
          (item, idx) =>
            `${idx + 1}. ${item.name}: ${item.location}`,
        )
        .join('\n');

      promptText += `\n\n총 이동 거리: ${routeData.total_distance}m`;
      promptText += `\n예상 소요 시간: ${Math.round(
        routeData.total_distance / 10,
      )}분\n\n`;
    }

    promptText += `사용자 질문: ${userMessage}`;
    console.log("프롬프트 구성 완료");

    // API 호출
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: promptText }],
    });

    // 응답 처리
    let assistantResponse = '';

    if (response.content && response.content.length > 0) {
      const content = response.content[0];
      if (typeof content === 'object' && 'text' in content) {
        assistantResponse = content.text;
      } else if (typeof content === 'string') {
        assistantResponse = content;
      } else {
        assistantResponse = JSON.stringify(content);
      }
    }
    // 메모리에 대화 저장
    await addToMemory(userId, userMessage, assistantResponse);

    console.log("RAG 처리 완료");
    return {
      answer: assistantResponse,
      sources: sources.length > 0 ? sources : [],
      routeData
    };
  } catch (error) {
    console.error('RAG 처리 오류:', error);
    if (error instanceof Error) {
      console.error("오류 메시지:", error.message);
      console.error("오류 스택:", error.stack);
    }
    
    // 기본 응답 생성 (오류가 있더라도 최소한의 응답 제공)
    const fallbackResponse = "죄송합니다. 요청을 처리하는 중 오류가 발생했습니다.";
    
    // 쇼핑 아이템이 있는 경우 최소한 경로 데이터는 제공
    let fallbackRouteData = null;
    try {
      const items = extractShoppingItems(userMessage);
      if (items.length > 0) {
        fallbackRouteData = createRouteData(items);
      }
    } catch (routeError) {
      console.error("대체 경로 생성 실패:", routeError);
    }
    
    return {
      answer: fallbackResponse,
      sources: [],
      routeData: fallbackRouteData
    };
  }
}