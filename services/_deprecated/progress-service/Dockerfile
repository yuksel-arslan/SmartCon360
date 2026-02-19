# ---- Build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY prisma/ ./prisma/
RUN npx prisma generate
COPY src/ ./src/
RUN npm run build

# ---- Production ----
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY prisma/ ./prisma/
RUN npx prisma generate
COPY --from=build /app/dist ./dist
ENV PORT=3005
EXPOSE ${PORT}
CMD ["node", "dist/index.js"]
