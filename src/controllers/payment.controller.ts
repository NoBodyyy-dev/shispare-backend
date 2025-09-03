import {Request, Response, NextFunction} from "express";
import {PaymentService} from "../services/payment.service";

export class PaymentController {
    private paymentService: PaymentService = new PaymentService();

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
}