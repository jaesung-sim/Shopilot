// components/ChatBot.tsx
import { useState, useRef, useEffect } from 'react';
import { IMemberMessage, UserType } from '@/interfaces/message';
import { RouteData } from '@/interfaces/route';

// Props 인터페이스 정의
interface ChatBotProps {
  onRouteDataUpdate?: (data: RouteData) => void;
}

const ChatBot: React.FC<ChatBotProps> = ({ onRouteDataUpdate }) => {
  const [message, setMessage] = useState<string>('');
  const [messageList, setMessageList] = useState<IMemberMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const messageEndRef = useRef<HTMLDivElement>(null);

  // 스크롤 자동 이동
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageList]);

  // 초기 웰컴 메시지
  useEffect(() => {
    if (messageList.length === 0) {
      setMessageList([{
        user_type: UserType.BOT,
        nick_name: 'Shopilot',
        message: '안녕하세요! 쇼핑파일럿입니다. 필요한 물품을 알려주시면 최적의 경로를 안내해드릴게요.',
        send_date: new Date()
      }]);
    }
  }, []);

  // 메시지 전송 함수
  const sendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    // 사용자 메시지 추가
    const userMessage: IMemberMessage = {
      user_type: UserType.USER,
      nick_name: '사용자',
      message: message,
      send_date: new Date()
    };
    
    setMessageList(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    const currentMessage = message;
    setMessage('');
    
    // API 호출
    try {
      console.log('API 호출 시작:', currentMessage);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: currentMessage })
      });
      
      console.log('API 응답 상태:', response.status);
      
      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API 응답 데이터:', data);
      
      // 봇 응답 추가
      setMessageList(prev => [...prev, {
        user_type: UserType.BOT,
        nick_name: 'Shopilot',
        message: data.data?.message || '응답을 처리할 수 없습니다.',
        send_date: new Date()
      }]);
      
      // 경로 데이터가 있으면 처리
      if (data.data?.routeData && onRouteDataUpdate) {
        console.log('경로 데이터:', data.data.routeData);
        onRouteDataUpdate(data.data.routeData);
      }
    } catch (error) {
      console.error('오류 발생:', error);
      setMessageList(prev => [...prev, {
        user_type: UserType.BOT,
        nick_name: 'Shopilot',
        message: '죄송합니다. 요청을 처리하는 중 오류가 발생했습니다.',
        send_date: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full rounded-lg border bg-white overflow-hidden">
      {/* 채팅 메시지 영역 */}
      <div className="flex-1 p-4 overflow-y-auto">
        {messageList.map((msg, index) => (
          <div 
            key={index} 
            className={`mb-4 ${msg.user_type === UserType.USER ? 'text-right' : 'text-left'}`}
          >
            <div 
              className={`inline-block p-3 rounded-lg ${
                msg.user_type === UserType.USER 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {msg.message}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {msg.nick_name} - {new Date(msg.send_date).toLocaleTimeString()}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="text-center py-2">
            <div className="inline-block p-2 bg-gray-100 rounded-lg">
              <span className="animate-pulse">응답 생성 중...</span>
            </div>
          </div>
        )}
        
        <div ref={messageEndRef} />
      </div>
      
      {/* 입력 영역 */}
      <form 
        onSubmit={sendMessage} 
        className="border-t p-4 flex gap-2"
      >
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="메시지를 입력하세요..."
          className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isLoading || !message.trim()}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          전송
        </button>
      </form>
    </div>
  );
};

export default ChatBot;