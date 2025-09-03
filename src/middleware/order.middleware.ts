 import { Request, Response, NextFunction } from "express";
import { DeliveryType, PaymentMethod } from "../models/Order.model";
import { APIError } from "../services/error.service";

export const validateOrderCreation = (req: Request, res: Response, next: NextFunction) => {
    try {
        const { deliveryType, paymentMethod, deliveryInfo } = req.body;
        console.log(req.body);

        // Проверяем обязательные поля
        if (!deliveryType || !paymentMethod || !deliveryInfo.phone) {
            throw APIError.BadRequest({
                message: "Обязательные поля: deliveryType, paymentMethod, recipientPhone"
            });
        }

        // Валидация типа доставки
        if (!Object.values(DeliveryType).includes(deliveryType)) {
            throw APIError.BadRequest({
                message: `Некорректный тип доставки. Доступные: ${Object.values(DeliveryType).join(', ')}`
            });
        }

        // Валидация способа оплаты
        if (!Object.values(PaymentMethod).includes(paymentMethod)) {
            throw APIError.BadRequest({
                message: `Некорректный способ оплаты. Доступные: ${Object.values(PaymentMethod).join(', ')}`
            });
        }

        // Валидация телефона
        if (!/^\+?[0-9\s\-\(\)]{10,}$/.test(deliveryInfo.phone)) {
            throw APIError.BadRequest({
                message: "Некорректный номер телефона получателя"
            });
        }

        // Валидация данных доставки для не-самовывоза
        if (deliveryType !== DeliveryType.PICKUP) {
            if (!deliveryInfo) {
                throw APIError.BadRequest({
                    message: "Для доставки обязательны данные доставки"
                });
            }

            if (!deliveryInfo.city || !deliveryInfo.address) {
                throw APIError.BadRequest({
                    message: "Для доставки обязательны город и адрес"
                });
            }

            if (!deliveryInfo.recipientName) {
                throw APIError.BadRequest({
                    message: "Для доставки обязательно ФИО получателя"
                });
            }
        }

        next();
    } catch (error) {
        next(error);
    }
};

export const validateOrderUpdate = (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status } = req.body;

        if (status && !Object.values(require("../models/Order.model").OrderStatus).includes(status)) {
            throw APIError.BadRequest({
                message: "Некорректный статус заказа"
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};
