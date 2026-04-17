# Build from repo root. VITE_SOCKET_URL must be reachable from the user's browser.
FROM node:22-alpine AS build
WORKDIR /repo
COPY shared ./shared
COPY client ./client
RUN cd shared && npm install && npm run build
WORKDIR /repo/client
ARG VITE_SOCKET_URL=http://localhost:3001
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
RUN npm install && npm run build

FROM nginx:alpine
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/client/dist /usr/share/nginx/html
EXPOSE 80
