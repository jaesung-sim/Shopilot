// lib/vectorstore.ts
import { OpenAIEmbeddings } from '@langchain/openai';
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import path from 'path';

// OpenAI 임베딩 설정
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// 벡터 저장소 캐싱 변수
let vectorStore: FaissStore | null = null;

// 이미 존재하는 FAISS DB 로드
export async function getVectorStore() {
  if (vectorStore) return vectorStore;
  
  try {
    // 경로 설정
    const dbPath = path.resolve(process.cwd(), 'lib/shopilot_vectordb');
    console.log("벡터 DB 경로:", dbPath);
    
    // FAISS 벡터 스토어 로드
    vectorStore = await FaissStore.load(
      dbPath,
      embeddings
    );
    
    console.log("기존 FAISS 벡터 DB 로드 성공!");
    return vectorStore;
  } catch (error) {
    console.error("벡터 DB 로드 오류:", error);
    throw error;
  }
}

// 검색 함수
export async function searchVectorDB(query: string, limit: number = 5) {
  try {
    const store = await getVectorStore();
    const results = await store.similaritySearch(query, limit);
    return results;
  } catch (error) {
    console.error("검색 오류:", error);
    return [];
  }
}