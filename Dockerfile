FROM node:22.2-alpine

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости (включая dev для сборки)
RUN npm ci

# Устанавливаем wget для healthcheck
RUN apk add --no-cache wget

# Копируем исходный код
COPY . .

# Компилируем TypeScript
RUN npm run build

# Удаляем dev зависимости после сборки
RUN npm prune --production

# Создаем директории для файлов
RUN mkdir -p /app/invoices /app/uploads

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["npm", "start"]
