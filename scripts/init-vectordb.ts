// scripts/init-vectordb-faiss.ts
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from "langchain/document";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import path from 'path';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import fs from 'fs';

// 환경 변수 로드
dotenv.config();

// 상품 및 매대 데이터 인터페이스
interface Product {
  id: string;           // KAN_CODE
  name: string;         // 실제 상품명 (CLS_NM_4)
  category1: string;    // CLS_NM_1 (가공식품, 의류 등)
  category2: string;    // CLS_NM_2 (조미료, 패션의류 등)
  category3: string;    // CLS_NM_3 (종합조미료, 여성의류 등)
  displayName: string;  // 매대이름 (조미료 매대, 패션·의류 매대 등)
}

interface SectionLocation {
  sectionName: string;  // 매대이름
  x: number;            // location_x 좌표
  y: number;            // location_y 좌표
}

// SQLite 데이터 로드 함수 (이전과 동일)
async function loadDataFromSQLite(): Promise<{ products: Product[], sectionLocations: SectionLocation[] }> {
  let db: Database;
  
  try {
    // SQLite DB 열기
    db = await open({
      filename: path.resolve(process.cwd(), 'lib/shopilot_items.db'),
      driver: sqlite3.Database
    });
    
    console.log("SQLite 데이터베이스에 연결되었습니다.");
    
    // 매대 위치 테이블(sections) 조회
    const sectionLocations = await db.all(`
      SELECT 
        section_name as sectionName,
        location_x as x,
        location_y as y
      FROM sections
    `);
    
    // 상품 테이블(items) 조회
    const productsRaw = await db.all(`
      SELECT 
        KAN_CODE as id,
        CLS_NM_1 as category1,
        CLS_NM_2 as category2,
        CLS_NM_3 as category3,
        CLS_NM_4 as name,
        매대이름 as displayName
      FROM items
    `);
    
    // 사용 가능한 매대 이름 목록 생성
    const availableSections = sectionLocations.map(s => s.sectionName);
    console.log(`사용 가능한 매대 이름 (${availableSections.length}개):`, availableSections);
    
    // 카테고리별 매대 매핑 - 실제 DB 구조에 맞춰 수정
    const categoryToSectionMap: Record<string, string> = {
      // 대분류(category1) 기준 매핑
      "의류": "패션·의류 매대",
      "가공식품": "가공육 매대",
      "신선식품": "신선세트 매대",
      
      // 중분류(category2) 기준 매핑
      "패션의류": "패션·의류 매대",
      "조미료": "조미료 매대",
      
      // 세부분류(category3) 기준 매핑
      "여성의류": "패션·의류 매대",
      "과일": "과일·채소 매대",
      "채소": "과일·채소 매대"
    };
    
    // 상품 데이터에 유효한 매대 이름 매핑
    const products = productsRaw.map(product => {
      // 이미 매대이름이 있고 유효한 경우 그대로 사용
      if (product.displayName && availableSections.includes(product.displayName)) {
        return product;
      }
      
      // 없거나 유효하지 않은 경우, 카테고리 기반으로 매핑
      let mappedSection = categoryToSectionMap[product.category3] || 
                         categoryToSectionMap[product.category2] || 
                         categoryToSectionMap[product.category1];
      
      // 매핑된 매대가 유효한지 확인
      if (!mappedSection || !availableSections.includes(mappedSection)) {
        // 기본 매대 설정 (예: "패션·의류 매대")
        mappedSection = availableSections.find(s => s.includes("패션")) || availableSections[0];
      }
      
      return {
        ...product,
        displayName: mappedSection
      };
    });
    
    console.log(`상품 데이터 (${products.length}개) 처리 완료`);
    
    return {
      products: products as Product[],
      sectionLocations: sectionLocations as SectionLocation[]
    };
  } catch (error) {
    console.error("SQLite 데이터베이스 쿼리 오류:", error);
    throw error;
  } finally {
    if (db) {
      await db.close();
      console.log("SQLite 데이터베이스 연결이 종료되었습니다.");
    }
  }
}

async function initializeVectorDB() {
  console.log("FAISS 벡터 DB 초기화 시작...");
  
  try {
    // 1. OpenAI API 키 확인
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.");
    }
    
    // 2. 임베딩 객체 생성
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    
    // 3. DB 경로 설정
    const dbPath = path.resolve(process.cwd(), 'lib/shopilot_vectordb');
    console.log("벡터 DB 저장 경로:", dbPath);
    
    // 경로가 없으면 생성, 있으면 비우기
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath, { recursive: true });
      console.log("벡터 DB 디렉터리를 생성했습니다.");
    } else {
      // 기존 디렉토리 비우기
      console.log("기존 벡터 DB 디렉터리를 삭제합니다...");
      fs.rmSync(dbPath, { recursive: true, force: true });
      fs.mkdirSync(dbPath, { recursive: true });
      console.log("기존 벡터 DB 디렉터리를 삭제했습니다.");
    }
    
    // 4. SQLite DB에서 데이터 로드
    console.log("SQLite 데이터베이스에서 상품 및 매대 정보 로드 중...");
    const { products, sectionLocations } = await loadDataFromSQLite();
    
    console.log(`${products.length}개의 상품과 ${sectionLocations.length}개의 매대 정보를 로드했습니다.`);
    
    // 5. 섹션 위치 정보 맵 생성
    const sectionLocationMap = new Map<string, {x: number, y: number}>();
    for (const section of sectionLocations) {
      sectionLocationMap.set(section.sectionName, {x: section.x, y: section.y});
    }
    
    // 6. 임베딩용 문서 생성
    const documents: Document[] = [];
    let missingLocationCount = 0;
    
    // 각 상품마다 문서 생성
    for (const product of products) {
      const location = sectionLocationMap.get(product.displayName);
      
      if (location) {
        // 상품 정보에 대한 자연어 설명 생성
        const content = `
상품명: ${product.name}
분류: ${product.category1} > ${product.category2} > ${product.category3}
위치: ${product.displayName}
${product.name}은(는) ${product.displayName}에 있습니다.
${product.name}을(를) 찾고 싶으시면 ${product.displayName}으로 가시면 됩니다.
${product.category3} 종류의 ${product.name}은(는) ${product.displayName}에 있습니다.
        `.trim();
        
        // 문서 생성 및 메타데이터 추가
        documents.push(
          new Document({
            pageContent: content,
            metadata: {
              id: product.id,
              name: product.name,
              section: product.displayName,
              location_x: location.x,
              location_y: location.y,
              category1: product.category1,
              category2: product.category2,
              category3: product.category3
            }
          })
        );
      } else {
        missingLocationCount++;
        if (missingLocationCount <= 10) {
          console.warn(`매대 위치 정보를 찾을 수 없음: ${product.displayName}, 상품: ${product.name}`);
        } else if (missingLocationCount === 11) {
          console.warn(`추가 위치 정보 누락 항목이 더 있습니다... (나머지 생략)`);
        }
      }
    }
    
    console.log(`총 ${documents.length}개 상품 문서 생성 완료, FAISS 벡터 DB 생성 중...`);
    
    // 7. FAISS 벡터 스토어 생성
    const vectorStore = await FaissStore.fromDocuments(documents, embeddings);
    
    // 8. 디스크에 저장
    await vectorStore.save(dbPath);
    
    console.log("FAISS 벡터 DB 초기화 및 저장 성공!");
    
    // 9. 테스트 쿼리 실행
    if (documents.length > 0) {
      console.log("\n테스트 쿼리 실행 중...");
      const testQueries = ["원피스", "코트", "셔츠", "바지", "패션"];
      
      for (const query of testQueries) {
        try {
          const results = await vectorStore.similaritySearch(query, 2);
          console.log(`\n'${query}' 검색 결과 (${results.length}개):`);
          
          for (const result of results) {
            console.log(`- ${result.metadata.name} (${result.metadata.section})`);
          }
        } catch (error) {
          console.error(`'${query}' 검색 중 오류:`, error);
        }
      }
    } else {
      console.warn("문서가 없어 테스트 쿼리를 실행하지 않습니다.");
    }
    
    return vectorStore;
  } catch (error) {
    console.error("벡터 DB 초기화 오류:", error);
    throw error;
  }
}

// 스크립트 실행
console.log("Shopilot FAISS 벡터 DB 초기화 스크립트 시작");

initializeVectorDB()
  .then(() => {
    console.log("벡터 DB 초기화 완료!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("벡터 DB 초기화 실패:", error);
    process.exit(1);
  });


