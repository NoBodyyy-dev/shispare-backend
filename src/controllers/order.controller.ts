import {OrderService} from "../services/order.service";
import {Request, Response, NextFunction} from "express";

export class OrderController {
    constructor(private readonly orderService: OrderService = new OrderService()) {
    }

    public async getUserOrders(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await this.orderService.getUserOrders(req.user!._id.toString())
            res.status(200).json({orders: result});
        } catch (e) {
            next(e);
        }
    }

    public async getOrderById(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await this.orderService.getOrderById(req.params.id);
            res.status(200).json({order: result});
        } catch (e) {
            next(e);
        }
    }

    public async getAllOrders(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await this.orderService.getAllOrders(req.body.filter);
            res.status(200).json({orders: result});
        } catch (e) {
            next(e);
        }
    }
}