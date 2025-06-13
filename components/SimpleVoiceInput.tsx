// components/SimpleVoiceInput.tsx - 테스트용 간단한 음성 입력

import React, { useState, useRef } from 'react';

interface SimpleVoiceInputProps {
  onTextReceived: (text: string) => void;
  isDisabled?: boolean;
  className?: string;
}

const SimpleVoiceInput: React.FC<SimpleVoiceInputProps> = ({
  onTextReceived,
  isDisabled = false,
  className = '',
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      setError('');

      // 마이크 권한 요청
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // MediaRecorder 설정
      const options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'audio/mp4';
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = '';
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // 이벤트 리스너
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('📦 오디오 청크 수집:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = () => {
        console.log('⏹️ 녹음 중지됨, 총 청크:', audioChunksRef.current.length);
        processAudio();
      };

      // 녹음 시작
      mediaRecorder.start(250); // 250ms마다 데이터 수집
      setIsRecording(true);
      console.log('🎤 녹음 시작됨');
    } catch (err) {
      console.error('❌ 녹음 시작 실패:', err);
      setError('마이크 권한을 허용해주세요');
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      mediaRecorderRef.current.stop();

      // 스트림 정리
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());

      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const processAudio = async () => {
    try {
      console.log(
        '🎵 오디오 처리 시작, 청크 개수:',
        audioChunksRef.current.length,
      );

      if (audioChunksRef.current.length === 0) {
        throw new Error('녹음된 데이터가 없습니다');
      }

      // Blob 생성
      const audioBlob = new Blob(audioChunksRef.current, {
        type: 'audio/webm',
      });

      console.log('📄 Blob 생성됨:', {
        size: audioBlob.size,
        type: audioBlob.type,
      });

      if (audioBlob.size === 0) {
        throw new Error('녹음 파일이 비어있습니다');
      }

      // STT API 호출
      const formData = new FormData();
      const file = new File([audioBlob], 'recording.webm', {
        type: 'audio/webm',
      });
      formData.append('audio', file);

      console.log('📤 STT API 호출 중...');

      const response = await fetch('/api/stt', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('📥 STT 응답:', result);

      if (!response.ok) {
        throw new Error(result.message || 'STT 처리 실패');
      }

      if (result.code === 200 && result.data?.text) {
        console.log('✅ 음성 인식 성공:', result.data.text);
        onTextReceived(result.data.text);
        setError('');
      } else {
        throw new Error('음성이 인식되지 않았습니다');
      }
    } catch (err) {
      console.error('❌ 오디오 처리 실패:', err);
      setError(err instanceof Error ? err.message : '처리 실패');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClick = () => {
    if (isDisabled || isProcessing) return;

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const getButtonStyle = () => {
    if (isDisabled) return 'bg-gray-300 text-gray-500 cursor-not-allowed';
    if (isProcessing) return 'bg-blue-500 text-white';
    if (isRecording) return 'bg-red-500 text-white animate-pulse';
    return 'bg-gray-100 hover:bg-gray-200 text-gray-700';
  };

  const getButtonText = () => {
    if (isProcessing) return '🔄';
    if (isRecording) return '⏹️';
    return '🎤';
  };

  const getStatusText = () => {
    if (isProcessing) return '음성 변환 중...';
    if (isRecording) return '녹음 중 (클릭하여 중지)';
    if (error) return error;
    return '음성 입력';
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 ${getButtonStyle()} ${className}`}
        title={getStatusText()}
      >
        <span className="text-xl">{getButtonText()}</span>
      </button>

      {/* 상태 표시 */}
      {(isRecording || isProcessing || error) && (
        <div
          className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 rounded-lg text-xs whitespace-nowrap z-10 ${
            error
              ? 'bg-red-500 text-white'
              : isProcessing
              ? 'bg-blue-500 text-white'
              : 'bg-black bg-opacity-75 text-white'
          }`}
        >
          {getStatusText()}
        </div>
      )}
    </div>
  );
};

export default SimpleVoiceInput;
