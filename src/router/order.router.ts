import {Router} from "express";
import {authMiddleware} from "../middleware/auth.middleware";
import {validateOrderCreation, validateOrderUpdate} from "../middleware/order.middleware";
import {OrderController} from "../controllers/order.controller";

export const orderRouter = Router();

orderRouter.get("/get-user-orders/:id", authMiddleware, OrderController.getUserOrders);
orderRouter.get("/get-order/:orderNumber", authMiddleware, OrderController.getOrderByNumber);
orderRouter.post("/create", [authMiddleware], OrderController.createOrder);
orderRouter.patch("/:orderId/status", [authMiddleware, validateOrderUpdate], OrderController.updateOrderStatus);


