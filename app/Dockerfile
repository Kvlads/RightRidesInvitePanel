FROM node:25-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

# Используем легкий образ, чтобы просто держать файлы
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/build ./build
# Контейнер просто копирует файлы и завершается (или "спит")
CMD ["sh", "-c", "cp -R /app/build/* /web_static/"]