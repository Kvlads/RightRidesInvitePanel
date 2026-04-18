# Запуск бота

## Dev

Для запуска в режиме разработки достаточно запустить базу данных в докере. Сам бот запускается через yarn

```bash
docker-compose up -d db
```

```bash
yarn start:dev
```

## Prod

```bash
docker-compose up -d --build
```
