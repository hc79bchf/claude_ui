FROM node:20-alpine
WORKDIR /app

# Install expect for PTY support and Claude CLI
RUN apk add --no-cache expect && \
    npm install -g @anthropic-ai/claude-code

COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build

EXPOSE 3001
CMD ["node", "dist/index.js"]
