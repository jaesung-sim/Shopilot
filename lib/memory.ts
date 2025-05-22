// lib/memory.ts
import { BufferMemory, ChatMessageHistory } from "langchain/memory";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

// 사용자 ID별 메모리 저장
const memoryStore = new Map<string, BufferMemory>();

// 사용자 메모리 가져오기 또는 생성
export function getUserMemory(userId: string): BufferMemory {
  if (!memoryStore.has(userId)) {
    memoryStore.set(
      userId,
      new BufferMemory({
        chatHistory: new ChatMessageHistory([]),
        returnMessages: true,
        memoryKey: "chat_history",
        inputKey: "input",
      })
    );
  }
  return memoryStore.get(userId)!;
}

// 메모리에 대화 추가
export async function addToMemory(
  userId: string,
  userMessage: string,
  aiMessage: string
): Promise<void> {
  const memory = getUserMemory(userId);
  const chatHistory = await memory.chatHistory.getMessages();
  
  // 새 메시지 추가
  chatHistory.push(new HumanMessage(userMessage));
  chatHistory.push(new AIMessage(aiMessage));
  
  // 메모리 업데이트 (최대 10개 메시지 쌍으로 제한)
  if (chatHistory.length > 10) {
    const newHistory = chatHistory.slice(chatHistory.length - 10);
    memory.chatHistory = new ChatMessageHistory(newHistory);
  }
}

// 메모리에서 대화 내역 가져오기
export async function getConversationHistory(userId: string): Promise<string> {
  const memory = getUserMemory(userId);
  const messages = await memory.chatHistory.getMessages();
  
  return messages
    .map((message) => {
      if (message instanceof HumanMessage) {
        return `User: ${message.text}`;
      } else if (message instanceof AIMessage) {
        return `AI: ${message.text}`;
      }
      return "";
    })
    .join("\n");
}