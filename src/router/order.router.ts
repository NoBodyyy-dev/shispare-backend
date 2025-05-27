import {Router} from "express";
import {OrderController} from "../controllers/order.controller";
import {authMiddleware} from "../middleware/auth.middleware";
import {adminMiddleware} from "../middleware/admin.middleware";

const orderController = new OrderController();
export const orderRouter = Router();

orderRouter.get("/get-order/all", [authMiddleware, adminMiddleware], orderController.getAllOrders)
orderRouter.get("/get-order/user", [authMiddleware], orderController.getUserOrders);
orderRouter.get("/get-order/:id", [authMiddleware], orderController.getOrderById);

