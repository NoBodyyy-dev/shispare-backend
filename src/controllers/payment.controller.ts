import { Request, Response, NextFunction } from "express";
import { PaymentService } from "../services/payment.service";

export class PaymentController {
    constructor(private paymentService: PaymentService) {}

    async createPayment(req: Request, res: Response, next: NextFunction) {
        try {
            const {
                amount,
                description = "Оплата товара",
                metadata,
            } = req.body;

            const payment = await this.paymentService.createPayment(
                amount,
                "RUB",
                description,
                metadata,
                `${process.env.FRONTEND_URL}/payment-success`
            );

            res.json(payment);
        } catch (e) {
            next(e);
        }
    }
}