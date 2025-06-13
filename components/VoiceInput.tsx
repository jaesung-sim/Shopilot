// components/VoiceInput.tsx - 실제 음성 인식 활성화 수정
import React, { useState, useRef, useEffect } from 'react';

interface VoiceInputProps {
  onVoiceResult: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const VoiceInput: React.FC<VoiceInputProps> = ({
  onVoiceResult,
  disabled = false,
  placeholder = '음성 인식 버튼을 눌러 말씀하세요',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Web Speech API 초기화 및 지원 확인
  useEffect(() => {
    console.log('🔍 Web Speech API 지원 확인...');

    // 브라우저 호환성 체크
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error('❌ Web Speech API 지원되지 않음');
      setError(
        '이 브라우저는 음성 인식을 지원하지 않습니다. Chrome을 사용해주세요.',
      );
      setIsSupported(false);
      return;
    }

    console.log('✅ Web Speech API 지원됨');
    setIsSupported(true);

    // SpeechRecognition 객체 생성
    try {
      recognitionRef.current = new SpeechRecognition();
      setupSpeechRecognition();
    } catch (initError) {
      console.error('❌ SpeechRecognition 초기화 실패:', initError);
      setError('음성 인식 초기화에 실패했습니다.');
      setIsSupported(false);
    }

    // 컴포넌트 언마운트 시 정리
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (err) {
          console.warn('SpeechRecognition 정리 중 오류:', err);
        }
      }
    };
  }, []);

  // SpeechRecognition 설정 및 이벤트 핸들러
  const setupSpeechRecognition = () => {
    if (!recognitionRef.current) return;

    const recognition = recognitionRef.current;

    // 🔧 중요: 실제 음성 인식 설정
    recognition.continuous = false; // 한 번만 인식
    recognition.interimResults = true; // 중간 결과 표시
    recognition.lang = 'ko-KR'; // 한국어 설정
    recognition.maxAlternatives = 1; // 최대 대안 수

    console.log('🎤 SpeechRecognition 설정 완료:', {
      lang: recognition.lang,
      continuous: recognition.continuous,
      interimResults: recognition.interimResults,
    });

    // 음성 인식 시작 이벤트
    recognition.onstart = () => {
      console.log('🎤 음성 인식 시작됨');
      setIsListening(true);
      setError('');
      setCurrentTranscript('');
    };

    // 🔧 핵심: 실제 음성 인식 결과 처리
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      console.log('📝 음성 인식 이벤트 수신:', event);

      let interimTranscript = '';
      let finalTranscript = '';

      // 모든 결과 처리
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;

        console.log(`결과 ${i}:`, {
          transcript: transcript,
          confidence: confidence,
          isFinal: result.isFinal,
        });

        if (result.isFinal) {
          finalTranscript += transcript;
          console.log('✅ 최종 음성 인식 결과:', transcript);
        } else {
          interimTranscript += transcript;
          console.log('⏳ 중간 음성 인식 결과:', transcript);
        }
      }

      // 실시간 중간 결과 표시
      setCurrentTranscript(interimTranscript);

      // 🔧 최종 결과가 있으면 부모 컴포넌트에 전달
      if (finalTranscript.trim()) {
        console.log('🎯 STT 결과:', finalTranscript.trim());
        // ✅ 수정 (안전한 호출)
        if (onVoiceResult && typeof onVoiceResult === 'function') {
          onVoiceResult(finalTranscript.trim());
        } else {
          console.warn('⚠️ onVoiceResult 콜백이 제공되지 않았습니다');
        } // ✅ 실제 인식된 텍스트 전달
      }
    };

    // 오류 처리
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('❌ 음성 인식 오류:', event.error);
      setIsListening(false);

      let errorMessage = '';
      switch (event.error) {
        case 'not-allowed':
          errorMessage =
            '마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.';
          break;
        case 'no-speech':
          errorMessage = '음성이 감지되지 않았습니다. 다시 시도해주세요.';
          break;
        case 'audio-capture':
          errorMessage =
            '마이크에 접근할 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.';
          break;
        case 'network':
          errorMessage =
            '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
          break;
        default:
          errorMessage = `음성 인식 오류: ${event.error}`;
      }
      setError(errorMessage);
    };

    // 음성 인식 종료 이벤트
    recognition.onend = () => {
      console.log('🔚 음성 인식 종료됨');
      setIsListening(false);
      setCurrentTranscript('');
    };

    // 음성 감지 시작
    recognition.onspeechstart = () => {
      console.log('🗣️ 음성 감지 시작');
    };

    // 음성 감지 종료
    recognition.onspeechend = () => {
      console.log('🤐 음성 감지 종료');
    };
  };

  // 음성 인식 시작
  const startListening = async () => {
    if (!recognitionRef.current || !isSupported || disabled) {
      console.warn('⚠️ 음성 인식을 시작할 수 없음:', {
        hasRecognition: !!recognitionRef.current,
        isSupported: isSupported,
        disabled: disabled,
      });
      return;
    }

    try {
      // 마이크 권한 먼저 확인
      console.log('🎯 마이크 권한 요청...');
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ 마이크 권한 확인됨');

      // 이미 실행 중인지 확인
      if (isListening) {
        console.warn('⚠️ 이미 음성 인식이 실행 중입니다');
        return;
      }

      setError('');
      console.log('🎤 음성 인식 시작 요청...');
      recognitionRef.current.start();
    } catch (permissionError) {
      console.error('❌ 마이크 권한 거부:', permissionError);
      setError(
        '마이크 권한이 필요합니다. 브라우저에서 마이크 접근을 허용해주세요.',
      );
    }
  };

  // 음성 인식 중지
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      console.log('⏹️ 음성 인식 중지 요청...');
      recognitionRef.current.stop();
    }
  };

  // 지원되지 않는 브라우저 처리
  if (!isSupported) {
    return (
      <div className="flex items-center gap-2">
        <button
          disabled
          className="p-2 rounded-full bg-gray-400 text-white cursor-not-allowed"
          title="음성 인식이 지원되지 않습니다"
        >
          🎤
        </button>
        <div className="text-sm text-red-600">
          {error || '음성 인식이 지원되지 않습니다'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* 음성 인식 버튼 */}
      <button
        onClick={isListening ? stopListening : startListening}
        disabled={disabled}
        className={`p-2 rounded-full transition-all duration-200 ${
          isListening
            ? 'bg-red-500 hover:bg-red-600 animate-pulse text-white'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        } disabled:bg-gray-400 disabled:cursor-not-allowed`}
        title={isListening ? '음성 인식 중지' : '음성 인식 시작'}
      >
        {isListening ? '🔴' : '🎤'}
      </button>

      {/* 실시간 중간 결과 표시 */}
      {currentTranscript && (
        <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-1 text-sm">
          <span className="text-yellow-700">
            <strong>인식 중:</strong> "{currentTranscript}"
          </span>
        </div>
      )}

      {/* 오류 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded px-3 py-1 text-sm">
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* 상태 표시 */}
      {isListening && !currentTranscript && (
        <div className="flex items-center gap-1 text-sm text-blue-600">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
          <span>듣고 있습니다...</span>
        </div>
      )}
    </div>
  );
};

export default VoiceInput;

// 🔧 사용법 예시 (ChatBot.tsx에서)
/*
import VoiceInput from './VoiceInput';

// ChatBot 컴포넌트 내부에서
const handleVoiceInput = (recognizedText: string) => {
  console.log('🎯 음성으로 입력된 텍스트:', recognizedText);
  setMessage(recognizedText); // 입력 필드에 인식된 텍스트 설정
};

// JSX에서 사용
<div className="flex gap-2">
  <input
    type="text"
    value={message}
    onChange={(e) => setMessage(e.target.value)}
    placeholder="예: 바나나, 사과, 우유, 빵, 돼지고기 사고싶어"
    className="flex-1 border rounded-lg px-4 py-2"
  />
  <VoiceInput 
    onVoiceResult={handleVoiceInput}
    disabled={isLoading}
  />
  <button type="submit">전송</button>
</div>
*/
