FROM node:20-alpine

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package.json tsconfig.json ./
RUN npm install

COPY src/ ./src/
RUN npm run build

# Create data directory
RUN mkdir -p /data

EXPOSE 3001

ENV DB_PATH=/data/memory.db
ENV PORT=3001

CMD ["node", "dist/server.js"]
