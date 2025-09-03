import {Router} from "express";
import {PaymentController} from "../controllers/payment.controller";

export const paymentRouter = Router()
const paymentController = new PaymentController()

paymentRouter.post("/payment/create", paymentController.createPayment);
paymentRouter.post("/payment/capture", paymentController.capturePayment);
paymentRouter.post("/payment/cancel", paymentController.cancelPayment);

paymentRouter.get("/payment/get", paymentController.getPayment);
