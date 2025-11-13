#!/bin/bash

# Создает общую сеть Docker для взаимодействия контейнеров
# Запустите этот скрипт перед первым запуском docker-compose

NETWORK_NAME="shispare-network"

# Проверяем, существует ли сеть
if docker network ls | grep -q "$NETWORK_NAME"; then
    echo "Сеть $NETWORK_NAME уже существует"
else
    echo "Создание сети $NETWORK_NAME..."
    docker network create $NETWORK_NAME
    echo "Сеть $NETWORK_NAME успешно создана"
fi

echo "Готово! Теперь можно запускать docker-compose в обоих проектах."

