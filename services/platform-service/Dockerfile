# ---- Base ----
FROM node:22-alpine AS base
WORKDIR /app
COPY package.json ./

# ---- Dependencies ----
FROM base AS deps
RUN npm install --production=false

# ---- Build ----
FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Production ----
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
RUN npm install --production

COPY --from=build /app/dist ./dist

EXPOSE 3003

CMD ["node", "dist/app.js"]
