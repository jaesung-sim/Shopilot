// pages/api/chat.ts
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
`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      code: 405,
      data: null,
      message: 'Method Not Allowed',
    });
  }

  try {
    const { message, useRAG, userId = 'default-user' } = req.body;

    console.log(
      'API 요청 받음:',
      message,
      '(RAG 명시적 지정:',
      useRAG !== undefined ? useRAG : '자동',
      ')',
    );

    // 쇼핑 아이템 추출
    const shoppingItems = extractShoppingItems(message);
    console.log('추출된 쇼핑 아이템:', shoppingItems);

    // ===============================================
    // RAG 사용 여부 자동 판단 (useRAG가 명시적으로 false로 지정되지 않은 경우)
    // ===============================================
    const shouldUseRAG = useRAG !== false; // 명시적으로 false인 경우만 RAG 비활성화

    // 명시적으로 false가 아니면 RAG 사용 시도
    if (shouldUseRAG) {
      try {
        console.log('RAG 처리 시작...');
        const ragResult = await processRAG(message, userId);

        if (ragResult) {
          console.log('RAG 처리 성공!');

          return res.status(200).json({
            code: 200,
            data: {
              message: ragResult.answer,
              routeData: ragResult.routeData || undefined, // null을 undefined로 변환
              sources: ragResult.sources || undefined,
            },
            message: 'success',
          });
        }
      } catch (ragError) {
        console.error('RAG 처리 중 오류 발생:', ragError);
        console.log('기본 모드로 폴백...');
        // RAG 오류 시 기본 모드로 폴백 (계속 진행)
      }
    }

    // ===============================================
    // RAG가 비활성화되었거나 오류가 발생한 경우 기본 모드로 진행

    // ===============================================

    // 경로 데이터 계산
    let routeData = undefined;
    if (shoppingItems.length > 0) {
      routeData = createRouteData(shoppingItems);
      console.log('계산된 경로 데이터:', routeData);
    }

    // 이전 대화 내역 가져오기
    const conversationHistory = await getConversationHistory(userId);

    // API 키가 없을 경우 간단한 응답
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('API 키 없음, 모의 응답 반환');

      let botResponse = '';
      if (shoppingItems.length > 0) {
        botResponse = `다음 물품을 찾았습니다: ${shoppingItems.join(
          ', ',
        )}. 최적의 경로를 안내해 드리겠습니다.`;
      } else {
        botResponse = `안녕하세요! 쇼핑 파일럿입니다. 필요한 물품을 알려주시면 최적의 경로를 안내해드릴게요.`;
      }

      // 메모리에 대화 추가
      await addToMemory(userId, message, botResponse);

      return res.status(200).json({
        code: 200,
        data: {
          message: botResponse,
          routeData: routeData ?? undefined,
        },
        message: 'success',
      });
    }

    // Anthropic API 클라이언트 초기화
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // 추가 컨텍스트 구성
    let additionalContext = '';
    if (routeData && routeData.items && routeData.items.length > 0) {
      additionalContext = `
사용자가 다음 물품을 찾고 있습니다: ${shoppingItems.join(', ')}.
각 상품의 위치 정보입니다:
${routeData.items
  .map((item, idx) => `${idx + 1}. ${item.name}: ${item.location}`)
  .join('\n')}

쇼핑 경로 안내:
1. 먼저 ${routeData.route[0].location}에서 ${
        routeData.route[0].item
      }를 찾으세요.
${routeData.route
  .slice(1)
  .map(
    (point, idx) =>
      `${idx + 2}. 그 다음 ${point.location}에서 ${point.item}를 찾으세요.`,
  )
  .join('\n')}

총 이동 거리: ${routeData.total_distance}m
예상 소요 시간: ${Math.round(routeData.total_distance / 10)}분
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

    // 응답 처리
    let assistantResponse = '';

    // 응답 구조 안전하게 처리
    if (response && response.content && response.content.length > 0) {
      const content = response.content[0];
      if (typeof content === 'object' && 'text' in content) {
        assistantResponse = content.text;
      } else if (typeof content === 'string') {
        assistantResponse = content;
      } else {
        console.log('예상치 못한 응답 구조:', content);
        assistantResponse = JSON.stringify(content);
      }
    } else {
      assistantResponse = '응답을 처리할 수 없습니다.';
    }

    await addToMemory(userId, message, assistantResponse);

    return res.status(200).json({
      code: 200,
      data: {
        message: assistantResponse,
        routeData: routeData ?? undefined,
      },
      message: 'success',
    });
  } catch (error) {
    console.error('API 오류:', error);

    return res.status(500).json({
      code: 500,
      data: {
        message: '죄송합니다. 요청을 처리하는 중 오류가 발생했습니다.',
      },
      message: 'error',
    });
  }
}
