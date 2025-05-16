// interfaces/message.ts 파일 생성
export enum UserType {
  USER = 'user',
  BOT = 'assistant',
}

export interface IMemberMessage {
  user_type: UserType;
  nick_name: string;
  message: string;
  send_date: Date;
}
