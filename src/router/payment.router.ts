import {Router} from "express";
import {PaymentController} from "../controllers/payment.controller";
import {authMiddleware} from "../middleware/auth.middleware";

export const paymentRouter = Router();
const paymentController = new PaymentController();

// Webhook для YooKassa (без авторизации, т.к. это внешний сервис)
paymentRouter.post("/webhook", paymentController.handleWebhook);

// Остальные endpoints требуют авторизации
paymentRouter.post("/create", authMiddleware, paymentController.createPayment);
paymentRouter.post("/get", authMiddleware, paymentController.getPayment);
paymentRouter.post("/capture", authMiddleware, paymentController.capturePayment);
paymentRouter.post("/cancel", authMiddleware, paymentController.cancelPayment);

