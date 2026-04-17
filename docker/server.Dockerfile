# Build from repo root: docker compose build (see docker-compose.yml)
FROM node:22-alpine
WORKDIR /repo
COPY shared ./shared
COPY server ./server
RUN cd shared && npm install && npm run build
WORKDIR /repo/server
RUN npm install && npm run build
ENV NODE_ENV=production
EXPOSE 3001
WORKDIR /repo/server
CMD ["node", "dist/index.js"]
