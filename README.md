# 🛒 Shopilot

**Shopilot**은 대형 마트에서 사용하는 스마트 쇼핑 카트를 위한 **AI 기반 쇼핑 보조 시스템**입니다.  
사용자는 웹 챗봇을 통해 구매할 물품을 입력하면, 로봇이 **최적 경로를 생성하고 자율 주행**하여 물품 매대로 안내합니다.

[**시연영상▶️**](https://youtu.be/pP-fz-G6JYQ)

<img src = "https://github.com/user-attachments/assets/75a20c28-3960-4295-a35a-dfd587f7dc11" width="25%">


---

## 📌 주요 기능

- ✅ **웹 챗봇 (React + Node.js + LangChain)**
  - 텍스트 및 음성으로 장보기 물품 요청
  - 대화 기반 추천 및 경로 안내
- ✅ **RAG 기반 검색**
  - Vector DB(FAISS)에 저장된 매장 데이터 기반으로 물품 위치 검색
- ✅ **경로 생성 및 시각화**
  - 통행 가능한 영역 기반 A* 경로 탐색
  - 최적 매대 방문 순서를 계산 (TSP 최적화 포함)
  - 실시간 로봇 위치와 경로를 지도에 표시
- ✅ **ROS2 자율 주행 연동**
  - ROSBridge를 통한 명령 전송 및 상태 수신
  - Scout Mini 로봇과 통신하여 자율 주행

---

## ⚙️ 기술 스택

| 영역              | 기술 스택                                       |
|-------------------|--------------------------------------------------|
| 프론트엔드         | React, Next.js, TypeScript                       |
| 백엔드             | Node.js, FAISS, LangChain                        |
| 챗봇               | Anthropic Claude API + RAG 기반 검색             |
| 자율 주행          | ROS2, roslibjs, ROSBridge                        |
| 경로 탐색          | A* 알고리즘 + TSP 최적화                        |
| 하드웨어           | Scout Mini, 2D Lidar, 카메라                      |

---


## 📂 주요 디렉토리 구조

```plaintext
components/
├── ChatBot.tsx              // 챗봇 인터페이스 (텍스트 + 음성 입력)
├── MarketMap.tsx            // 지도 및 경로 시각화
├── ROSLibRobotControl.tsx   // ROS2와 통신 및 로봇 제어

interfaces/
├── message.ts               // 메시지 타입 정의
├── route.ts                 // 경로 및 상품 타입 정의

lib/
├── memory.ts                // 대화 메모리 관리
├── rag.ts                   // RAG 기반 검색 및 경로 생성
├── productDatabase.ts       // 물품 → 매대 매핑 및 경로 생성
├── vectorstore.ts           // FAISS 기반 Vector DB 관리
├── improvedPathfinding.ts   // A* 경로 탐색 로직
├── walkableAreaMap.ts       // 통행 가능 영역 정의

pages/
├── api/
│   └── chat.ts              // 챗봇 API 엔드포인트
├── index.tsx                 // 메인 페이지 (ChatBot + MarketMap 통합)

```
## 🛠️ 주요 기능 상세

### 🛒 지능형 챗봇 시스템 (ChatBot.tsx)

- **자연어 쇼핑 리스트 처리**
  - 입력 예시: `"바나나, 사과, 우유, 빵, 돼지고기 사고싶어"`
  - AI가 각 물품의 매대 위치를 파악하고 최적화된 쇼핑 경로 생성
  - 결과: "과일·채소 매대 → 냉장·냉동 매대 → 정육 매대" 경로 안내

- **멀티모달 입력 지원**
  - 텍스트 입력: 일반 자연어 문장
  - 음성 입력: `VoiceInput`, `SimpleVoiceInput` 컴포넌트
  - 원클릭 예시: 사전 정의된 시나리오 버튼 제공

- **대화 맥락 관리**
  - `memory.ts`를 통한 사용자별 대화 히스토리 관리
  - 이전 쇼핑 패턴 기반 개인화 추천
  - 페이지 새로고침 이후에도 세션 유지

![image](https://github.com/user-attachments/assets/271aa6a3-5ea6-447b-8dfb-6ced04c1e407)


---

### 🗺️ 실시간 지도 시각화 (MarketMap.tsx)

- **동적 경로 표시**
  - 직선 경로 (회색 점선): 기본 경로
  - A* 최적화 경로 (초록 실선): 실제 로봇 이동 경로
  - 통행 가능 영역 (연두색): 10px 그리드 기반

- **실시간 로봇 추적**
  - 로봇 위치 (x, y, angle) 100ms마다 업데이트
  - 각도 기반 방향 표시
  - 경계 범위(896x504) 외부 진입 시 경고 표시

- **매대 및 상품 정보**
  - 30개 매대와 각 매대별 50개 상품 표시
  - 클릭 시 해당 매대 상품 목록 출력
  - 경로 상 매대 순서 번호 표시
![image](https://github.com/user-attachments/assets/c75223b2-626d-4929-8c67-266a652c6be1)

---

### 🤖 LLM & RAG 기반 검색 시스템 (rag.ts + vectorstore.ts)

- **RAG 기반 검색 아키텍처**
  - 기존 GPT: "우유는 냉장 코너에 있습니다."
  - Shopilot: "우유는 냉장·냉동 매대 (205, 275)에 있습니다."

- **데이터베이스 구조**
  - 약 30개 매대 × 매대당 50개 = 총 1,500개 품목
  - 항목: 이름, 매대명, 좌표, 카테고리, 설명 포함
  - FAISS 기반 vector embedding으로 검색 최적화

- **예시 응답**
  ```json
  매칭 항목:
  product: "사과"
  sectionId: 12
  sectionName: "과일·채소 매대"
  coordinates: { x: 670, y: 358 }4
<img src="https://github.com/user-attachments/assets/d379a7c2-ba94-4b5c-9823-f76bd17ed0de" width="50%">



