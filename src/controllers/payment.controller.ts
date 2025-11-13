import {Request, Response, NextFunction} from "express";
import {PaymentService} from "../services/payment.service";
import {OrderService} from "../services/order.service";
import {socketService} from "../app";

export class PaymentController {
    private paymentService: PaymentService = new PaymentService();
    private orderService: OrderService = new OrderService(socketService);

    createPayment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {
                orderId,
                amount,
                description = "Оплата товара",
                type,
            } = req.body;

            const payment = await this.paymentService.createPayment({
                paymentData: {type, amount},
                orderData: {orderId, description}
            })
            console.log(">>>>>>>++++", payment);

            res.json(payment);
        } catch (e) {
            next(e);
        }
    }

    getPayment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {id} = req.body;
            const response = await this.paymentService.getPaymentDataById(id);
            res.json(response);
        } catch (e) {
            next(e);
        }
    }

    capturePayment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const hahaha = await this.paymentService.capturePayment(req.body.id);
            res.json(hahaha);
        } catch (e) {
            next(e);
        }
    }

    cancelPayment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const cancel = await this.paymentService.cancelPayment(req.body.id);
            res.json(cancel);
        } catch (e) {
            next(e);
        }
    }

    /**
     * Webhook для обработки уведомлений от YooKassa
     */
    handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const event = req.body;
            console.log("Payment webhook received:", event);

            // YooKassa отправляет уведомления в формате:
            // { event: "payment.succeeded", object: { id: "...", status: "succeeded", ... } }
            if (event.event === "payment.succeeded" && event.object) {
                const payment = event.object;
                
                if (payment.status === "succeeded") {
                    // Обрабатываем успешную оплату
                    await this.orderService.handlePaymentSuccess(payment.id);
                }
            }

            // Всегда возвращаем 200 OK для YooKassa
            res.status(200).json({ received: true });
        } catch (e) {
            console.error("Error processing payment webhook:", e);
            // Все равно возвращаем 200, чтобы YooKassa не повторял запрос
            res.status(200).json({ received: true, error: "Internal error" });
        }
    }
}