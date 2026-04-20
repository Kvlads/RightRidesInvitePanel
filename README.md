# Запуск бота

## Методы разработчика

### Запускаем ssh туннель

Для разработки потребуется внешний хост, который через ssh-туннель будет выпускать наше приложение в интернет через ssl сертификат

```bash
ssh -i ~/.ssh/id_u115_rsa -R 2181:localhost:8080 root@vm-4b4d6a76.na4u.ru
```

## Выполнение миграции БД

```bash
cd api/ && yarn db:migrate --name "migration_name"
```

## Запуск prisma studio (визуальные клиент бд)

```bash
cd api/ && yarn db:studio
```

### Запускаем только базу данных

```bash
docker-compose up -d db
```

### Запуск приложения в дев окружени

1. В терминале /api: ```yarn dev```

2. В терминале /app: ```yarn dev```

## Prod

Запуск приложения в прод режиме

```bash
docker-compose up --build
```
