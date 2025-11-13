# Docker Compose для Shispare Backend

## Требования
- Docker 20.10+
- Docker Compose 2.0+

## Быстрый старт

1. **Создайте общую Docker сеть** (только при первом запуске):
```bash
# Вариант 1: Используйте скрипт
./scripts/create-network.sh

# Вариант 2: Вручную
docker network create shispare-network
```

2. Скопируйте `.env.example` в `.env` и заполните необходимые переменные:
```bash
cp .env.example .env
```

2. Отредактируйте `.env` файл и укажите все необходимые переменные:
   - `MONGO_ROOT_USERNAME` - имя пользователя MongoDB (по умолчанию `admin`)
   - `MONGO_ROOT_PASSWORD` - пароль MongoDB (по умолчанию `password`)
   - `MONGO_DATABASE` - имя базы данных (по умолчанию `shispare`)
   - `CLIENT_URL` - URL фронтенда (по умолчанию `http://localhost:5173`)
   - Все остальные секреты и ключи API

3. Запустите контейнеры:
```bash
docker-compose up -d
```

4. Проверьте статус:
```bash
docker-compose ps
```

5. Просмотрите логи:
```bash
# Все логи
docker-compose logs -f

# Только бэкенд
docker-compose logs -f backend

# Только MongoDB
docker-compose logs -f mongodb
```

## Остановка

```bash
docker-compose down
```

## Остановка с удалением volumes (⚠️ удалит данные MongoDB):
```bash
docker-compose down -v
```

## Пересборка образов

```bash
docker-compose build --no-cache
docker-compose up -d
```

## Перезапуск сервисов

```bash
docker-compose restart backend
docker-compose restart mongodb
```

## Доступ к MongoDB

### Извне контейнера (localhost):
- Порт: `27017`
- Host: `localhost`
- Username: значение из `MONGO_ROOT_USERNAME` (по умолчанию `admin`)
- Password: значение из `MONGO_ROOT_PASSWORD` (по умолчанию `password`)
- Database: значение из `MONGO_DATABASE` (по умолчанию `shispare`)

### Изнутри контейнера backend:
- Host: `mongodb` (имя сервиса)
- Порт: `27017`
- Connection string автоматически формируется в `DB_URI`

## Подключение к MongoDB через mongosh

```bash
docker exec -it shispare-mongodb mongosh -u admin -p password --authenticationDatabase admin
```

Или с переменными из .env:
```bash
docker exec -it shispare-mongodb mongosh -u ${MONGO_ROOT_USERNAME} -p ${MONGO_ROOT_PASSWORD} --authenticationDatabase admin
```

## Структура

- **mongodb** - контейнер с MongoDB 7.0
  - Данные сохраняются в volumes: `mongodb_data` и `mongodb_config`
  - Healthcheck проверяет доступность базы
  
- **backend** - контейнер с Node.js приложением
  - Порт: `3000:3000`
  - Healthcheck endpoint: `http://localhost:3000/health`
  - Файлы счетов сохраняются в `./invoices` (volume)
  - Загруженные файлы сохраняются в `./uploads` (volume)
  - Зависит от MongoDB (ждет готовности базы)

## Переменные окружения

Все переменные из `.env` файла автоматически загружаются в контейнер backend через `env_file`.
Дополнительно в `docker-compose.yml` переопределяются:
- `DB_URI` - автоматически формируется на основе переменных MongoDB
- `NODE_ENV=production`
- `APP_PORT=3000`

## Проблемы и решения

### MongoDB не запускается
```bash
# Проверьте логи
docker-compose logs mongodb

# Проверьте, не занят ли порт 27017
lsof -i :27017
```

### Backend не может подключиться к MongoDB
- Убедитесь, что MongoDB запущен: `docker-compose ps`
- Проверьте правильность переменных `MONGO_ROOT_USERNAME` и `MONGO_ROOT_PASSWORD`
- Проверьте логи backend: `docker-compose logs backend`

### Проблемы с volumes
```bash
# Проверьте существование директорий
ls -la invoices/ uploads/

# Создайте их вручную, если нужно
mkdir -p invoices uploads
```

