FROM node:20-alpine

WORKDIR /app

# Install dependencies first for efficient layer caching
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --prod

# Copy source code
COPY src ./src

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "src/app.js"]
