FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_SCORE_SIGNING_KEY
ENV VITE_SCORE_SIGNING_KEY=${VITE_SCORE_SIGNING_KEY}
RUN npm run build

FROM nginx:1.27-alpine
# 自定义 nginx 配置，代理 /api 到 backend 服务
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
