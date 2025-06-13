// pages/api/stt.ts - OpenAI Whisper를 사용한 STT API (수정된 버전)
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';

// formidable 설정을 위해 bodyParser 비활성화
export const config = {
  api: {
    bodyParser: false,
  },
};

type ResponseData = {
  code: number;
  data: {
    text?: string;
    confidence?: number;
    language?: string;
  } | null;
  message: string;
};

// OpenAI 버전 호환성을 위한 동적 import
let OpenAI: any;
try {
  // OpenAI v4.x 방식
  OpenAI = require('openai').OpenAI;
} catch (error) {
  try {
    // 백업: 구버전 방식
    OpenAI = require('openai');
  } catch (fallbackError) {
    console.error('❌ OpenAI 패키지를 불러올 수 없습니다:', fallbackError);
  }
}

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
  console.log('\n=== STT API 요청 시작 ===');

  try {
    // OpenAI API 키 확인
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY가 설정되지 않았습니다');
      return res.status(500).json({
        code: 500,
        data: null,
        message: 'OpenAI API key not configured',
      });
    }

    // OpenAI API 클라이언트 초기화 (버전 호환성 고려)
    let openai: any;
    try {
      openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || '',
      });
    } catch (initError) {
      console.error('❌ OpenAI 클라이언트 초기화 실패:', initError);
      return res.status(500).json({
        code: 500,
        data: null,
        message: 'OpenAI client initialization failed',
      });
    }

    // formidable을 사용해 파일 파싱
    const form = formidable({
      maxFileSize: 25 * 1024 * 1024, // 25MB (Whisper 최대 크기)
      keepExtensions: true,
      filter: ({ mimetype }) => {
        // Whisper가 지원하는 오디오 형식들
        const supportedTypes = [
          'audio/wav',
          'audio/mp3',
          'audio/mpeg',
          'audio/mp4',
          'audio/webm',
          'audio/ogg',
          'audio/flac',
          'audio/m4a',
        ];
        return supportedTypes.includes(mimetype || '');
      },
    });

    const [fields, files] = await form.parse(req);
    console.log('📁 파일 파싱 완료:', Object.keys(files));

    // 오디오 파일 확인
    const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;
    
    if (!audioFile) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: 'No audio file provided',
      });
    }

    console.log('🎵 오디오 파일 정보:', {
      filename: audioFile.originalFilename,
      size: audioFile.size,
      mimetype: audioFile.mimetype,
      path: audioFile.filepath,
    });

    // 파일 크기 확인
    if (audioFile.size === 0) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: 'Empty audio file',
      });
    }

    // Whisper API 호출
    console.log('🤖 Whisper API 호출 시작...');
    const whisperStartTime = Date.now();

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFile.filepath),
      model: 'whisper-1',
      language: 'ko', // 한국어 지정
      response_format: 'verbose_json', // 상세 정보 포함
      temperature: 0.1, // 일관성을 위해 낮은 값 설정
    });

    const whisperTime = Date.now() - whisperStartTime;
    console.log(`⏱️ Whisper 처리 시간: ${whisperTime}ms`);

    // 임시 파일 정리
    try {
      fs.unlinkSync(audioFile.filepath);
      console.log('🧹 임시 파일 삭제 완료');
    } catch (cleanupError) {
      console.warn('⚠️ 임시 파일 삭제 실패:', cleanupError);
    }

    // 결과 검증
    if (!transcription.text || transcription.text.trim().length === 0) {
      console.log('❌ 음성 인식 실패 - 빈 텍스트');
      return res.status(400).json({
        code: 400,
        data: null,
        message: 'Speech recognition failed - no text detected',
      });
    }

    const recognizedText = transcription.text.trim();
    console.log('✅ 음성 인식 성공:', recognizedText);

    // 상세 정보 추출 (verbose_json 모드에서 제공)
    const confidence = (transcription as any).segments?.[0]?.avg_logprob || 0;
    const detectedLanguage = (transcription as any).language || 'ko';

    const totalTime = Date.now() - startTime;
    console.log(`✅ STT 처리 완료! 총 소요시간: ${totalTime}ms`);

    return res.status(200).json({
      code: 200,
      data: {
        text: recognizedText,
        confidence: confidence,
        language: detectedLanguage,
      },
      message: 'success',
    });

  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error('❌ STT 처리 중 오류 발생:', error);
    console.error('📊 오류 발생 시간:', errorTime + 'ms');

    // 임시 파일이 있다면 정리
    try {
      const form = formidable();
      const [, files] = await form.parse(req);
      const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;
      if (audioFile?.filepath) {
        fs.unlinkSync(audioFile.filepath);
      }
    } catch (cleanupError) {
      console.warn('임시 파일 정리 실패:', cleanupError);
    }

    // 에러 타입별 응답
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return res.status(401).json({
          code: 401,
          data: null,
          message: 'Invalid OpenAI API key',
        });
      }
      
      if (error.message.includes('file size')) {
        return res.status(413).json({
          code: 413,
          data: null,
          message: 'Audio file too large (max 25MB)',
        });
      }

      if (error.message.includes('format')) {
        return res.status(415).json({
          code: 415,
          data: null,
          message: 'Unsupported audio format',
        });
      }
    }

    return res.status(500).json({
      code: 500,
      data: null,
      message: 'STT processing failed',
    });
  }
}