// lib/audioUtils.ts - 음성 녹음 및 처리 유틸리티

export interface AudioRecorderConfig {
  sampleRate?: number;
  channels?: number;
  bitRate?: number;
  maxDuration?: number; // 초 단위
  mimeType?: string;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioLevel: number;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private config: Required<AudioRecorderConfig>;
  private onStateChange?: (state: RecordingState) => void;
  private onError?: (error: Error) => void;

  // 실시간 오디오 레벨 측정용
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioLevelInterval: NodeJS.Timeout | null = null;

  // 상태 관리
  private state: RecordingState = {
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioLevel: 0,
  };

  constructor(config: AudioRecorderConfig = {}) {
    this.config = {
      sampleRate: config.sampleRate || 16000,
      channels: config.channels || 1,
      bitRate: config.bitRate || 128000,
      maxDuration: config.maxDuration || 60, // 기본 60초
      mimeType: config.mimeType || this.getOptimalMimeType(),
    };
  }

  // 브라우저별 최적 MIME 타입 선택
  private getOptimalMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('🎵 선택된 오디오 형식:', type);
        return type;
      }
    }

    console.warn('⚠️ 지원되는 오디오 형식을 찾을 수 없음, 기본값 사용');
    return 'audio/webm';
  }

  // 이벤트 리스너 설정
  public setOnStateChange(callback: (state: RecordingState) => void): void {
    this.onStateChange = callback;
  }

  public setOnError(callback: (error: Error) => void): void {
    this.onError = callback;
  }

  // 마이크 권한 요청 및 스트림 초기화
  public async initialize(): Promise<void> {
    try {
      console.log('🎤 마이크 권한 요청...');

      // 브라우저 지원 확인
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('브라우저가 음성 녹음을 지원하지 않습니다');
      }

      if (!MediaRecorder) {
        throw new Error('브라우저가 MediaRecorder를 지원하지 않습니다');
      }

      // 마이크 권한 요청
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      console.log('✅ 마이크 권한 획득 성공');

      // 오디오 레벨 측정을 위한 AudioContext 설정
      this.setupAudioLevelMonitoring();

      // MediaRecorder 초기화
      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType: this.config.mimeType,
        audioBitsPerSecond: this.config.bitRate,
      });

      this.setupMediaRecorderEvents();
    } catch (error) {
      console.error('❌ 마이크 초기화 실패:', error);

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error(
            '마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.',
          );
        } else if (error.name === 'NotFoundError') {
          throw new Error('마이크 장치를 찾을 수 없습니다.');
        } else if (error.name === 'NotReadableError') {
          throw new Error('마이크가 다른 애플리케이션에서 사용 중입니다.');
        }
      }

      throw error;
    }
  }

  // 오디오 레벨 모니터링 설정
  private setupAudioLevelMonitoring(): void {
    if (!this.audioStream) return;

    try {
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(
        this.audioStream,
      );
      this.analyser = this.audioContext.createAnalyser();

      this.analyser.fftSize = 256;
      source.connect(this.analyser);
    } catch (error) {
      console.warn('⚠️ 오디오 레벨 모니터링 설정 실패:', error);
    }
  }

  // MediaRecorder 이벤트 설정
  private setupMediaRecorderEvents(): void {
    if (!this.mediaRecorder) return;

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
        console.log('🎵 오디오 청크 수신:', event.data.size, 'bytes');
      }
    };

    this.mediaRecorder.onstart = () => {
      console.log('🎤 녹음 시작');
      this.state.isRecording = true;
      this.state.isPaused = false;
      this.updateState();
      this.startAudioLevelMonitoring();
      this.startDurationTimer();
    };

    this.mediaRecorder.onstop = () => {
      console.log('⏹️ 녹음 중지');
      this.state.isRecording = false;
      this.state.isPaused = false;
      this.updateState();
      this.stopAudioLevelMonitoring();
      this.stopDurationTimer();
    };

    this.mediaRecorder.onpause = () => {
      console.log('⏸️ 녹음 일시정지');
      this.state.isPaused = true;
      this.updateState();
    };

    this.mediaRecorder.onresume = () => {
      console.log('▶️ 녹음 재개');
      this.state.isPaused = false;
      this.updateState();
    };

    this.mediaRecorder.onerror = (event) => {
      console.error('❌ 녹음 오류:', event);
      const error = new Error('음성 녹음 중 오류가 발생했습니다');
      this.onError?.(error);
    };
  }

  // 녹음 시작
  public async startRecording(): Promise<void> {
    if (!this.mediaRecorder) {
      await this.initialize();
    }

    if (this.mediaRecorder?.state === 'recording') {
      console.warn('⚠️ 이미 녹음 중입니다');
      return;
    }

    try {
      this.audioChunks = [];
      this.state.duration = 0;

      this.mediaRecorder?.start(100); // 100ms마다 데이터 수집
    } catch (error) {
      console.error('❌ 녹음 시작 실패:', error);
      const recordingError = new Error('녹음을 시작할 수 없습니다');
      this.onError?.(recordingError);
      throw recordingError;
    }
  }

  // 녹음 중지 및 Blob 반환
  public async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(new Error('녹음이 진행 중이지 않습니다'));
        return;
      }

      const handleStop = () => {
        console.log(
          '🎵 MediaRecorder 중지 이벤트 발생, 청크 개수:',
          this.audioChunks.length,
        );

        if (this.audioChunks.length === 0) {
          reject(new Error('녹음된 오디오 데이터가 없습니다'));
          return;
        }

        try {
          const audioBlob = new Blob(this.audioChunks, {
            type: this.config.mimeType,
          });

          console.log('✅ 오디오 Blob 생성 성공:', {
            size: audioBlob.size,
            type: audioBlob.type,
            chunks: this.audioChunks.length,
            mimeType: this.config.mimeType,
          });

          // 최소 크기 체크 (매우 작은 파일은 문제가 있을 수 있음)
          if (audioBlob.size < 100) {
            reject(
              new Error('녹음된 파일이 너무 작습니다. 다시 시도해주세요.'),
            );
            return;
          }

          resolve(audioBlob);
        } catch (blobError) {
          console.error('❌ Blob 생성 오류:', blobError);
          reject(new Error('오디오 파일 생성에 실패했습니다'));
        }
      };

      this.mediaRecorder.addEventListener('stop', handleStop, { once: true });

      try {
        this.mediaRecorder.stop();
      } catch (stopError) {
        console.error('❌ MediaRecorder 중지 오류:', stopError);
        reject(new Error('녹음 중지에 실패했습니다'));
      }
    });
  }

  // 일시정지/재개
  public pauseRecording(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  public resumeRecording(): void {
    if (this.mediaRecorder?.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  // 실시간 오디오 레벨 모니터링
  private startAudioLevelMonitoring(): void {
    if (!this.analyser) return;

    this.audioLevelInterval = setInterval(() => {
      if (!this.analyser) return;

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(dataArray);

      // 평균 오디오 레벨 계산 (0-100)
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      this.state.audioLevel = Math.round((average / 255) * 100);

      this.updateState();
    }, 100);
  }

  private stopAudioLevelMonitoring(): void {
    if (this.audioLevelInterval) {
      clearInterval(this.audioLevelInterval);
      this.audioLevelInterval = null;
    }
    this.state.audioLevel = 0;
  }

  // 녹음 시간 타이머
  private durationTimer: NodeJS.Timeout | null = null;

  private startDurationTimer(): void {
    this.durationTimer = setInterval(() => {
      if (this.state.isRecording && !this.state.isPaused) {
        this.state.duration += 0.1;

        // 최대 녹음 시간 체크
        if (this.state.duration >= this.config.maxDuration) {
          console.log('⏰ 최대 녹음 시간 도달, 자동 중지');
          this.stopRecording().catch(console.error);
        }

        this.updateState();
      }
    }, 100);
  }

  private stopDurationTimer(): void {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
  }

  // 상태 업데이트 알림
  private updateState(): void {
    this.onStateChange?.(this.state);
  }

  // 현재 상태 반환
  public getState(): RecordingState {
    return { ...this.state };
  }

  // 리소스 정리
  public cleanup(): void {
    console.log('🧹 AudioRecorder 리소스 정리');

    // 녹음 중지
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
    }

    // 타이머 정리
    this.stopAudioLevelMonitoring();
    this.stopDurationTimer();

    // 스트림 정리
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => {
        track.stop();
        console.log('🎤 오디오 트랙 중지:', track.kind);
      });
      this.audioStream = null;
    }

    // AudioContext 정리
    if (this.audioContext?.state !== 'closed') {
      this.audioContext?.close();
      this.audioContext = null;
    }

    // 상태 초기화
    this.state = {
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioLevel: 0,
    };

    this.mediaRecorder = null;
    this.analyser = null;
    this.audioChunks = [];
  }
}

// STT 서비스 함수
export async function sendAudioToSTT(audioBlob: Blob): Promise<string> {
  console.log('📤 STT API 호출 시작:', {
    size: audioBlob.size,
    type: audioBlob.type,
  });

  // 오디오 파일 크기 체크
  if (audioBlob.size === 0) {
    throw new Error('녹음된 오디오가 없습니다');
  }

  if (audioBlob.size > 25 * 1024 * 1024) {
    // 25MB 제한
    throw new Error('오디오 파일이 너무 큽니다 (최대 25MB)');
  }

  try {
    const formData = new FormData();

    // 파일명과 MIME 타입을 명시적으로 설정
    const fileName = 'recording.webm';
    const file = new File([audioBlob], fileName, {
      type: audioBlob.type || 'audio/webm',
    });

    formData.append('audio', file);

    console.log('📤 FormData 구성 완료:', {
      fileName: fileName,
      fileSize: file.size,
      fileType: file.type,
    });

    const response = await fetch('/api/stt', {
      method: 'POST',
      body: formData,
    });

    console.log('📥 STT API 응답 상태:', response.status);

    const result = await response.json();
    console.log('📥 STT API 응답 데이터:', result);

    if (!response.ok) {
      throw new Error(result.message || `STT API 오류: ${response.status}`);
    }

    if (result.code !== 200 || !result.data?.text) {
      throw new Error(result.message || '음성 인식 결과가 없습니다');
    }

    console.log('✅ STT 성공:', result.data.text);
    return result.data.text;
  } catch (error) {
    console.error('❌ STT 실패:', error);

    // 네트워크 오류 처리
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('네트워크 연결을 확인해주세요');
    }

    throw error instanceof Error
      ? error
      : new Error('STT 처리 중 오류가 발생했습니다');
  }
}

// 오디오 유틸리티 함수들
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getAudioLevelColor(level: number): string {
  if (level < 20) return '#10b981'; // 초록
  if (level < 60) return '#f59e0b'; // 노랑
  return '#ef4444'; // 빨강
}
