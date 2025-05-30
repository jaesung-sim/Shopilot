// components/ChatBot.tsx - 외부 상태 기반 영속성 보장 버전
import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { IMemberMessage, UserType } from '@/interfaces/message';
import { RouteData } from '@/interfaces/route';

// Props 인터페이스 정의
interface ChatBotProps {
  userId: string; // 외부에서 관리되는 사용자 ID
  initialMessages: IMemberMessage[]; // 외부에서 관리되는 메시지 배열
  onRouteDataUpdate?: (data: RouteData) => void;
  onMessagesUpdate?: (messages: IMemberMessage[]) => void; // 메시지 변경 시 콜백
  onChatReset?: () => void; // 채팅 초기화 시 콜백
}

// Ref 인터페이스 정의
export interface ChatBotRef {
  clearChat: () => void;
  getMessageCount: () => number;
}

const ChatBot = forwardRef<ChatBotRef, ChatBotProps>(({ 
  userId, 
  initialMessages, 
  onRouteDataUpdate, 
  onMessagesUpdate,
  onChatReset 
}, ref) => {
  const [message, setMessage] = useState<string>('');
  const [messageList, setMessageList] = useState<IMemberMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const messageEndRef = useRef<HTMLDivElement>(null);

  // 부모 컴포넌트에서 접근할 수 있는 메서드들
  useImperativeHandle(ref, () => ({
    clearChat: () => {
      if (onChatReset) {
        onChatReset();
      }
    },
    getMessageCount: () => messageList.length,
  }));

  // initialMessages가 변경되면 로컬 상태 업데이트
  useEffect(() => {
    setMessageList(initialMessages);
    console.log('💬 ChatBot: 초기 메시지 동기화됨, 개수:', initialMessages.length);
  }, [initialMessages]);

  // 메시지가 변경될 때마다 부모 컴포넌트에 알림
  useEffect(() => {
    if (onMessagesUpdate && messageList !== initialMessages) {
      onMessagesUpdate(messageList);
    }
  }, [messageList, onMessagesUpdate, initialMessages]);

  // 스크롤 자동 이동
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messageList]);

  // 메시지 전송 함수
  const sendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!message.trim() || isLoading) return;

    const currentMessage = message.trim();
    console.log('📤 메시지 전송:', currentMessage, '| 사용자 ID:', userId);

    // 사용자 메시지를 즉시 추가
    const userMessage: IMemberMessage = {
      user_type: UserType.USER,
      nick_name: '사용자',
      message: currentMessage,
      send_date: new Date(),
    };

    // 메시지 리스트 업데이트 및 입력 필드 클리어
    const updatedMessages = [...messageList, userMessage];
    setMessageList(updatedMessages);
    setMessage('');
    setIsLoading(true);

    try {
      console.log('🔄 API 호출 시작...');
      const apiStartTime = Date.now();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: currentMessage, 
          userId: userId, // 영속적인 사용자 ID 사용
          timestamp: new Date().toISOString()
        }),
      });

      const apiTime = Date.now() - apiStartTime;
      console.log(`⏱️ API 응답 시간: ${apiTime}ms`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 오류: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();
console.log('📥 API 응답 데이터:', data);

// 응답 검증
if (!data || !data.data) {
  throw new Error('잘못된 응답 형식입니다.');
}

// ✅ 예시 routeData 정의
const exampleRouteData = {
  route: [
    {
      item: "계란",
      location: "신선식품 매대",
      coordinates: { x: 120, y: 300 }
    },
    {
      item: "빵",
      location: "베이커리 매대",
      coordinates: { x: 300, y: 320 }
    },
    {
      item: "치즈",
      location: "유제품 매대",
      coordinates: { x: 480, y: 300 }
    }
  ],
  items: [
    {
      name: "계란",
      location: "신선식품 매대",
      coordinates: { x: 120, y: 300 }
    },
    {
      name: "빵",
      location: "베이커리 매대",
      coordinates: { x: 300, y: 320 }
    },
    {
      name: "치즈",
      location: "유제품 매대",
      coordinates: { x: 480, y: 300 }
    }
  ],
  total_distance: 620
};

// ✅ 실제 routeData가 없으면 예시로 대체
const routeDataToUse =
  data.data?.routeData && Object.keys(data.data.routeData).length > 0
    ? data.data.routeData
    : exampleRouteData;

// ✅ routeData 전달
if (onRouteDataUpdate) {
  console.log('🗺️ 경로 데이터 전달:', routeDataToUse);
  onRouteDataUpdate(routeDataToUse);
}


      // 디버그 정보 로깅 (개발 모드에서만)
      if (process.env.NODE_ENV === 'development' && data.data?.debugInfo) {
        console.log('🔧 디버그 정보:', data.data.debugInfo);
      }

    } catch (error) {
      console.error('❌ API 호출 오류:', error);
      
      // 오류 메시지 추가
      const errorMessage: IMemberMessage = {
        user_type: UserType.BOT,
        nick_name: 'Shopilot',
        message: `죄송합니다. 요청을 처리하는 중 오류가 발생했습니다.\n\n${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`,
        send_date: new Date(),
      };

      const errorMessages = [...updatedMessages, errorMessage];
      setMessageList(errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  // 예시 메시지 입력 함수
  const insertExampleMessage = (exampleText: string) => {
    setMessage(exampleText);
  };

  return (
    <div className="flex flex-col h-full rounded-lg border bg-white overflow-hidden">
      {/* 채팅 헤더 */}
      <div className="bg-blue-600 text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛒</span>
          <div>
            <span className="font-semibold">쇼핑 어시스턴트</span>
            <div className="text-xs opacity-75">
              메시지 {messageList.length}개 • ID: {userId.slice(-6)}
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            if (onChatReset) {
              onChatReset();
            }
          }}
          className="px-2 py-1 bg-blue-700 hover:bg-blue-800 rounded text-sm transition-colors"
          title="채팅 초기화"
        >
          초기화
        </button>
      </div>

      {/* 채팅 메시지 영역 */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        {messageList.map((msg, index) => (
          <div
            key={`msg-${userId}-${index}-${msg.send_date.getTime()}-${msg.user_type}`}
            className={`mb-4 ${
              msg.user_type === UserType.USER ? 'text-right' : 'text-left'
            }`}
          >
            <div
              className={`inline-block p-3 rounded-lg max-w-xs md:max-w-md lg:max-w-lg ${
                msg.user_type === UserType.USER
                  ? 'bg-blue-500 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 shadow-sm border rounded-bl-sm'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {msg.message}
              </div>
            </div>
            <div className={`text-xs text-gray-500 mt-1 ${
              msg.user_type === UserType.USER ? 'text-right' : 'text-left'
            }`}>
              {msg.nick_name} • {new Date(msg.send_date).toLocaleTimeString()}
            </div>
          </div>
        ))}

        {/* 로딩 인디케이터 */}
        {isLoading && (
          <div className="text-left mb-4">
            <div className="inline-block p-3 bg-white shadow-sm border rounded-lg rounded-bl-sm">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-sm text-gray-600">응답 생성 중...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messageEndRef} />
      </div>

      {/* 예시 메시지 버튼들 */}
      <div className="px-4 py-2 bg-gray-50 border-t">
        <div className="text-xs text-gray-500 mb-2">💡 예시 메시지:</div>
        <div className="flex flex-wrap gap-2">
          {[
            '과자, 라면, 우유, 햄, 신발 사고싶어',
            '사과, 바나나, 오렌지 필요해',
            '계란, 빵, 치즈 구매할게'
          ].map((example, index) => (
            <button
              key={index}
              onClick={() => insertExampleMessage(example)}
              className="px-2 py-1 bg-white border rounded text-xs hover:bg-gray-100 transition-colors"
              disabled={isLoading}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* 입력 영역 */}
      <div className="border-t p-4 bg-white">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="예: 과자, 라면, 우유, 햄, 신발 사고싶어"
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !message.trim()}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>전송중</span>
              </div>
            ) : (
              '전송'
            )}
          </button>
        </form>
        
        {/* 도움말 */}
        <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
          <span>💡 팁: 여러 물품을 쉼표(,)로 구분해서 입력하세요</span>
          <span className="text-blue-500">세션 ID: {userId.slice(-6)}</span>
        </div>
      </div>
    </div>
  );
});

ChatBot.displayName = 'ChatBot';

export default ChatBot;