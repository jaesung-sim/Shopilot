// pages/api/chat.ts - 개선된 버전
import type { NextApiRequest, NextApiResponse } from 'next';
import { Anthropic } from '@anthropic-ai/sdk';
import { extractShoppingItems } from '@/lib/utils';
import { createRouteData } from '@/lib/productDatabase';
import { RouteData } from '@/interfaces/route';
import { processRAG } from '@/lib/rag';
import { getConversationHistory, addToMemory } from '@/lib/memory';

type ResponseData = {
  code: number;
  data: {
    message: string;
    routeData?: RouteData;
    sources?: string[];
    debugInfo?: any; // 디버깅 정보 추가
  } | null;
  message: string;
};

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
- 쇼핑 리스트가 제공되면 각 물품의 위치를 안내하고 경로를 설명해주세요.
`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      code: 405,
      data: null,
      message: 'Method Not Allowed',
    });
  }

  const startTime = Date.now();
  console.log('\n=== 새로운 Chat API 요청 ===');

  try {
    const { message, useRAG, userId = 'default-user' } = req.body;

    console.log('📨 요청 데이터:', {
      message: message,
      useRAG: useRAG,
      userId: userId,
      timestamp: new Date().toISOString(),
    });

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        code: 400,
        data: null,
        message: 'Invalid message parameter',
      });
    }

    // 🔍 쇼핑 아이템 추출
    console.log('🔍 쇼핑 아이템 추출 시작...');
    const shoppingItems = extractShoppingItems(message);
    console.log('✅ 추출된 쇼핑 아이템:', shoppingItems);

    // 디버깅 정보 수집
    const debugInfo = {
      originalMessage: message,
      extractedItems: shoppingItems,
      itemCount: shoppingItems.length,
      extractionTime: Date.now() - startTime,
      useRAG: useRAG !== false,
    };

    // ===============================================
    // RAG 사용 여부 자동 판단
    // ===============================================
    const shouldUseRAG = useRAG !== false;

    if (shouldUseRAG) {
      try {
        console.log('🤖 RAG 처리 시작...');
        const ragStartTime = Date.now();
        const ragResult = await processRAG(message, userId);

        debugInfo.ragProcessingTime = Date.now() - ragStartTime;
        debugInfo.ragSuccess = true;

        if (ragResult) {
          console.log('✅ RAG 처리 성공!');
          console.log(`⏱️ 총 처리 시간: ${Date.now() - startTime}ms`);

          return res.status(200).json({
            code: 200,
            data: {
              message: ragResult.answer,
              routeData: ragResult.routeData || undefined,
              sources: ragResult.sources || undefined,
              debugInfo:
                process.env.NODE_ENV === 'development' ? debugInfo : undefined,
            },
            message: 'success',
          });
        }
      } catch (ragError) {
        console.error('❌ RAG 처리 중 오류 발생:', ragError);
        debugInfo.ragSuccess = false;
        debugInfo.ragError =
          ragError instanceof Error ? ragError.message : String(ragError);
        console.log('🔄 기본 모드로 폴백...');
      }
    }

    // ===============================================
    // 기본 모드 처리
    // ===============================================
    console.log('🔄 기본 모드로 처리...');

    // 경로 데이터 계산
    let routeData = undefined;
    if (shoppingItems.length > 0) {
      console.log('🗺️ 경로 데이터 생성 중...');
      const routeStartTime = Date.now();
      routeData = createRouteData(shoppingItems);
      debugInfo.routeCalculationTime = Date.now() - routeStartTime;
      console.log('✅ 경로 데이터 생성 완료:', routeData ? '성공' : '실패');
    }

    // 이전 대화 내역 가져오기
    console.log('💭 대화 내역 조회 중...');
    const conversationHistory = await getConversationHistory(userId);

    // API 키 확인
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('⚠️ API 키 없음, 모의 응답 생성');

      let botResponse = '';
      if (shoppingItems.length > 0) {
        botResponse = `다음 물품들의 위치를 안내해드리겠습니다:\n\n`;
        shoppingItems.forEach((item, index) => {
          botResponse += `${index + 1}. ${item}\n`;
        });
        botResponse += `\n최적의 쇼핑 경로가 준비되었습니다! 🛍️`;
      } else {
        botResponse = `안녕하세요! 쇼핑 파일럿입니다. 필요한 물품을 알려주시면 최적의 경로를 안내해드릴게요.\n\n예시: "과자, 라면, 우유 사고싶어"`;
      }

      // 메모리에 대화 추가
      await addToMemory(userId, message, botResponse);

      return res.status(200).json({
        code: 200,
        data: {
          message: botResponse,
          routeData: routeData ?? undefined,
          debugInfo:
            process.env.NODE_ENV === 'development' ? debugInfo : undefined,
        },
        message: 'success',
      });
    }

    // Anthropic API 클라이언트 초기화
    console.log('🤖 Claude API 호출 준비...');
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // 추가 컨텍스트 구성
    let additionalContext = '';
    if (routeData && routeData.items && routeData.items.length > 0) {
      additionalContext = `
사용자가 다음 물품을 찾고 있습니다: ${shoppingItems.join(', ')}.

각 상품의 위치 정보:
${routeData.items
  .map((item, idx) => `${idx + 1}. ${item.name}: ${item.location}`)
  .join('\n')}

추천 쇼핑 순서:
${routeData.route
  .map((point, idx) => `${idx + 1}. ${point.location}에서 ${point.item}`)
  .join('\n')}

총 이동 거리: ${routeData.total_distance}m
예상 소요 시간: ${Math.round(routeData.total_distance / 100)}분

위 정보를 바탕으로 친절하게 쇼핑 경로를 안내해주세요.
      `;
    }

    const userPrompt = [];

    // 이전 대화 내역이 있으면 포함
    if (conversationHistory && conversationHistory.length > 0) {
      userPrompt.push(`이전 대화 내역:\n${conversationHistory}`);
    }

    // 추가 컨텍스트가 있으면 포함
    if (additionalContext) {
      userPrompt.push(`\n\n${additionalContext}`);
    }

    // 현재 사용자 메시지 추가
    userPrompt.push(`사용자 메시지: ${message}`);

    // 최종 프롬프트 생성
    const finalPrompt = userPrompt.join('\n\n');

    // Claude API 호출
    console.log('🤖 Claude API 호출 중...');
    const apiStartTime = Date.now();
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: finalPrompt,
        },
      ],
    });

    debugInfo.claudeApiTime = Date.now() - apiStartTime;

    // 응답 처리
    let assistantResponse = '';

    if (response && response.content && response.content.length > 0) {
      const content = response.content[0];
      if (typeof content === 'object' && 'text' in content) {
        assistantResponse = content.text;
      } else if (typeof content === 'string') {
        assistantResponse = content;
      } else {
        console.log('⚠️ 예상치 못한 응답 구조:', content);
        assistantResponse = JSON.stringify(content);
      }
    } else {
      assistantResponse = '응답을 처리할 수 없습니다.';
    }

    // 메모리에 대화 추가
    await addToMemory(userId, message, assistantResponse);

    const totalTime = Date.now() - startTime;
    console.log(`✅ 기본 모드 처리 완료! 총 소요시간: ${totalTime}ms`);

    debugInfo.totalProcessingTime = totalTime;

    return res.status(200).json({
      code: 200,
      data: {
        message: assistantResponse,
        routeData: routeData ?? undefined,
        debugInfo:
          process.env.NODE_ENV === 'development' ? debugInfo : undefined,
      },
      message: 'success',
    });
  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error('❌ API 처리 중 오류 발생:', error);
    console.error('📊 오류 발생 시간:', errorTime + 'ms');

    // 상세한 오류 로깅
    if (error instanceof Error) {
      console.error('오류 메시지:', error.message);
      console.error('오류 스택:', error.stack);
    }

    return res.status(500).json({
      code: 500,
      data: {
        message: '죄송합니다. 요청을 처리하는 중 오류가 발생했습니다.',
        debugInfo:
          process.env.NODE_ENV === 'development'
            ? {
                error: error instanceof Error ? error.message : String(error),
                processingTime: errorTime,
                timestamp: new Date().toISOString(),
              }
            : undefined,
      },
      message: 'error',
    });
  }
}
