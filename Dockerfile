# Estágio 1: compila o jogo (Vite) em game/dist.
FROM node:20-alpine AS build
WORKDIR /app/game
COPY game/package.json game/package-lock.json ./
RUN npm ci
COPY game/ ./
RUN npm run build

# Estágio 2: só o estático, servido por nginx (sem Node na imagem final).
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/game/dist /usr/share/nginx/html
EXPOSE 80
