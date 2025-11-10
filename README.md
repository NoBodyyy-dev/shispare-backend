# Shispare Backend

Backend приложение для интернет-магазина Shispare на Node.js + Express + TypeScript + MongoDB.

## Установка

```bash
npm install
```

## Настройка

Создайте файл `.env` в корне проекта с необходимыми переменными окружения (см. основной README.md).

## Запуск

### Режим разработки
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## Структура проекта

```
src/
├── app.ts              # Главный файл приложения
├── bot.ts              # Telegram бот
├── config/             # Конфигурационные файлы
├── controllers/        # Контроллеры
├── interfaces/         # TypeScript интерфейсы
├── middleware/         # Express middleware
├── models/             # Mongoose модели
├── router/             # Маршруты API
├── services/           # Бизнес-логика
└── utils/              # Утилиты
```

## API Endpoints

Все эндпоинты имеют префикс `/shispare`

### Авторизация
- `POST /auth/register` - Регистрация
- `POST /auth/login` - Вход
- `POST /auth/logout` - Выход
- `POST /auth/refresh` - Обновление токена

### Товары
- `GET /product/get-all` - Все товары
- `GET /product/get-one/:article` - Товар по артикулу
- `GET /product/category/:slug` - Товары категории
- `GET /product/popular` - Популярные товары

### Категории
- `GET /category/get-all` - Все категории

### Корзина
- `GET /cart/get` - Получить корзину
- `POST /cart/add` - Добавить в корзину
- `PUT /cart/update` - Обновить корзину
- `DELETE /cart/remove/:id` - Удалить из корзины

### Заказы
- `POST /order/create` - Создать заказ
- `GET /order/get-all` - Все заказы
- `GET /order/get-one/:id` - Заказ по ID

### Блог
- `GET /blog/get-all` - Все посты
- `GET /blog/get-post/:slug` - Пост по slug

### Акции
- `GET /stock/get-all` - Все акции
- `GET /stock/get-stock/:slug` - Акция по slug
- `POST /stock/create` - Создать акцию (требует админ права)

### Посты (специальные предложения)
- `GET /post/get-all` - Все посты
- `GET /post/get-post/:_id` - Пост по ID
- `GET /post/get-products-with-discount` - Товары со скидкой

## Безопасность

- Helmet для защиты заголовков
- Rate limiting для защиты от DDoS
- JWT токены для аутентификации
- CORS настроен для работы с фронтендом
- Cookie-based сессии

## База данных

Используется MongoDB. Подключение настраивается через переменную окружения `DB_URI`.

## Socket.io

Приложение использует Socket.io для:
- Чат с поддержкой
- Уведомления о заказах в реальном времени

## Telegram Bot

Интеграция с Telegram ботом для уведомлений администраторов.
