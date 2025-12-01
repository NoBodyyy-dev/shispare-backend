import {Router} from "express";
import {PaymentController} from "../controllers/payment.controller";
import {authMiddleware} from "../middleware/auth.middleware";

export const paymentRouter = Router();
const paymentController = new PaymentController();

paymentRouter.post("/webhook", paymentController.handleWebhook);

paymentRouter.post("/create", authMiddleware, paymentController.createPayment);
paymentRouter.post("/get", authMiddleware, paymentController.getPayment);
paymentRouter.post("/capture", authMiddleware, paymentController.capturePayment);
paymentRouter.post("/cancel", authMiddleware, paymentController.cancelPayment);