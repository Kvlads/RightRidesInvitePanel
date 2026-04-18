# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app

# Копируем конфиги и устанавливаем зависимости
COPY package.json yarn.lock ./
COPY prisma ./prisma/
RUN yarn install --frozen-lockfile

# Копируем исходники и собираем проект
COPY . .
RUN npx prisma generate
RUN yarn build

# Stage 2: Run
FROM node:18-alpine
WORKDIR /app

# Копируем только необходимые файлы из builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/yarn.lock ./yarn.lock

# Устанавливаем переменную окружения для продакшена
ENV NODE_ENV=production

# Запуск через скрипт из package.json для выполнения миграций
CMD ["yarn", "start:prod"]