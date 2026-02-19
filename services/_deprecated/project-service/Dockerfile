# ---- Build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
COPY prisma/ ./prisma/ 2>/dev/null || true
RUN npx prisma generate 2>/dev/null || true
RUN npm run build

# ---- Production ----
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY prisma/ ./prisma/ 2>/dev/null || true
RUN npx prisma generate 2>/dev/null || true
ENV PORT=3002
EXPOSE ${PORT}
CMD ["node", "dist/index.js"]
