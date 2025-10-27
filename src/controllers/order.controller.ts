// controllers/order.controller.ts
import {Request, Response, NextFunction} from "express";
import {orderService} from "../app"
import {OrderStatus} from "../models/Order.model";
import {APIError} from "../services/error.service";

export class OrderController {
    static async getUserOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const orders = await orderService.getUserOrders(req.params.id);
            res.status(200).json({orders});
        } catch (err) {
            next(err);
        }
    }

    static async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const {
                deliveryInfo,
                deliveryType,
                paymentMethod,
            } = req.body;

            if (!deliveryType || !paymentMethod || !deliveryInfo.phone) {
                throw APIError.BadRequest({message: "Нет обязательных полей"});
            }

            const order = await orderService.createOrder(
                req.user!,
                deliveryInfo,
                deliveryType,
                paymentMethod,
            );

            res.status(201).json({
                order,
                success: true
            });
        } catch (err) {
            next(err);
        }
    }

    static async updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const {orderId} = req.params;
            const {status} = req.body;

            if (!orderId || !status) {
                res.status(400).json({
                    success: false,
                    message: "Обязательные поля: orderId, status"
                });
                return;
            }

            const order = await orderService.updateOrderStatus(orderId, status);

            res.json({
                success: true,
                data: order
            });
        } catch (err) {
            next(err);
        }
    }
}