import { Request, Response, NextFunction } from "express";
import { CartService } from "../services/cart.service";
import { APIError } from "../services/error.service";

export class CartController {
    private cartService: CartService = new CartService();

    getCart = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const cart = await this.cartService.getUserCart(req.user!._id.toString());

            res.status(200).json({
                success: true,
                data: cart
            });
        } catch (e) {
            next(e);
        }
    }

    addToCart = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { productId, quantity = 1 } = req.body;

            if (!productId) throw APIError.BadRequest({ message: "ID товара обязателен" });

            const cart = await this.cartService.addToCart(productId, req.user!._id.toString(), quantity);

            res.status(200).json({
                success: true,
                message: "Товар добавлен в корзину",
                data: cart
            });
        } catch (e) {
            next(e);
        }
    }

    updateQuantity = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { productId, quantity } = req.body;
            console.log("---------", req.body);

            if (!quantity || quantity < 1) throw APIError.BadRequest({ message: "Количество должно быть не менее 1" });
            const cart = await this.cartService.updateQuantity(productId, req.user!._id.toString(), quantity);

            res.status(200).json({
                success: true,
                message: "Количество товара обновлено",
                data: cart
            });
        } catch (e) {
            next(e);
        }
    }

    removeFromCart = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { productId } = req.params;

            const cart = await this.cartService.removeFromCart(productId, req.user!._id.toString());

            res.status(200).json({
                success: true,
                message: "Товар удален из корзины",
                data: cart
            });
        } catch (e) {
            next(e);
        }
    }

    clearCart = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const cart = await this.cartService.clearCart(req.user!._id.toString());
            res.status(200).json({
                success: true,
                message: "Корзина очищена",
                data: cart
            });
        } catch (e) {
            next(e);
        }
    }
}