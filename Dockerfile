# Stage 1: Build React SPA
FROM node:22-alpine AS web-builder
WORKDIR /app
COPY web/package*.json web/
RUN npm --prefix web install
COPY web/ web/
RUN VITE_BASE_PATH=/ npm --prefix web run build

# Stage 2: Compile TypeScript server
FROM node:22-alpine AS server-builder
WORKDIR /app
COPY package*.json tsconfig.json tsconfig.server.json ./
RUN npm ci
COPY src/ src/
COPY server/ server/
RUN npm run server:build

# Stage 3: Playwright runtime
FROM mcr.microsoft.com/playwright:v1.58.1-noble
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=server-builder /app/dist-server/ dist-server/
COPY --from=web-builder /app/web/dist/ web/dist/
ENV DB_PATH=/data/jobscout.sqlite
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist-server/server/index.js"]
