FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build 2>/dev/null || true
EXPOSE ${PORT:-3000}
CMD ["npm", "start"]
