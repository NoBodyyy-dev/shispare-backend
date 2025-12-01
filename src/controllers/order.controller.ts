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

            const result = await orderService.createOrder(
                req.user!,
                deliveryInfo,
                deliveryType,
                paymentMethod,
            );

            res.status(201).json({
                order: result.order,
                paymentUrl: result.paymentUrl,
                success: true
            });
        } catch (err) {
            next(err);
        }
    }

    static async updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const {orderId} = req.params;
            const {status, cancellationReason, deliveryDate} = req.body;

            if (!orderId || !status) {
                res.status(400).json({
                    success: false,
                    message: "Обязательные поля: orderId, status"
                });
                return;
            }

            const order = await orderService.updateOrderStatus(orderId, status, cancellationReason, deliveryDate);

            res.json({
                success: true,
                data: order
            });
        } catch (err) {
            next(err);
        }
    }

    static async getOrderByNumber(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const {orderNumber} = req.params;
            const order = await orderService.getOrderByNumber(orderNumber);

            let paymentUrl = null;
            if (order.paymentId && !order.paymentStatus) {
                const {PaymentService} = await import("../services/payment.service");
                const paymentService = new PaymentService();
                paymentUrl = await paymentService.getPaymentUrl(order.paymentId);
            }
            
            res.status(200).json({
                order: {
                    ...order,
                    paymentUrl: paymentUrl || undefined
                },
                success: true
            });
        } catch (err) {
            next(err);
        }
    }

    static async getOneOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const {orderNumber} = req.params;
            const orderNum = isNaN(Number(orderNumber)) ? orderNumber : Number(orderNumber);
            const order = await orderService.getOrderByNumber(orderNum);
            res.status(200).json({order, success: true});
        } catch (err) {
            next(err);
        }
    }
}