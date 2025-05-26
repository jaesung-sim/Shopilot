# Node.js 18 기반 이미지 사용
FROM node:18-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 의존성 파일 복사
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# Next.js 빌드
RUN npm run build

# 포트 3000 노출
EXPOSE 3000

# 개발 모드로 실행
CMD ["npm", "run", "dev"]