FROM node:20-alpine
WORKDIR /app

# Install Claude CLI globally
RUN npm install -g @anthropic-ai/claude-code

COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["node", "dist/index.js"]
