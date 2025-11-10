import { Request, Response, NextFunction } from "express";
import { CartService } from "../services/cart.service";
import { APIError } from "../services/error.service";

export class CartController {
    private cartService = new CartService();

    getCart = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const cart = await this.cartService.getUserCart(req.user!._id.toString());
            res.status(200).json({ success: true, data: cart });
        } catch (e) {
            next(e);
        }
    };

    addToCart = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { productId, article, quantity = 1 } = req.body;

            if (!productId) throw APIError.BadRequest({ message: "ID товара обязателен" });
            if (!article) throw APIError.BadRequest({ message: "Артикул обязателен" });

            const cart = await this.cartService.addToCart({
                productId,
                owner: req.user!._id.toString(),
                article: Number(article),
                quantity: Number(quantity),
            });

            res.status(200).json({
                success: true,
                message: "✅ Товар добавлен в корзину",
                data: cart,
            });
        } catch (e) {
            next(e);
        }
    };

    updateQuantity = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { productId, article, quantity } = req.body;

            if (!productId) throw APIError.BadRequest({ message: "ID товара обязателен" });
            if (!article) throw APIError.BadRequest({ message: "Артикул обязателен" });
            if (!quantity || Number(quantity) < 1)
                throw APIError.BadRequest({ message: "Количество должно быть ≥ 1" });

            const cart = await this.cartService.updateQuantity({
                productId,
                owner: req.user!._id.toString(),
                article: Number(article),
                quantity: Number(quantity),
            });

            res.status(200).json({
                success: true,
                message: "✏️ Количество обновлено",
                data: cart,
            });
        } catch (e) {
            next(e);
        }
    };

    removeFromCart = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { productId, article } = req.query;

            if (!productId) throw APIError.BadRequest({ message: "ID товара обязателен" });
            if (!article) throw APIError.BadRequest({ message: "Артикул обязателен" });

            const cart = await this.cartService.removeFromCart({
                productId: productId.toString(),
                owner: req.user!._id.toString(),
                article: Number(article),
            });

            res.status(200).json({
                success: true,
                message: "🗑️ Товар удалён из корзины",
                data: cart,
            });
        } catch (e) {
            next(e);
        }
    };

    clearCart = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const cart = await this.cartService.clearCart(req.user!._id.toString());
            res.status(200).json({
                success: true,
                message: "🧹 Корзина полностью очищена",
                data: cart,
            });
        } catch (e) {
            next(e);
        }
    };

    syncCart = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { items } = req.body;
            
            if (!Array.isArray(items)) {
                throw APIError.BadRequest({ message: "items должен быть массивом" });
            }

            const cart = await this.cartService.syncCartFromLocalStorage(
                req.user!._id.toString(),
                items.map((item: any) => ({
                    productId: item.productId || item.product?._id,
                    article: Number(item.article),
                    quantity: Number(item.quantity) || 1,
                }))
            );

            res.status(200).json({
                success: true,
                message: "✅ Корзина синхронизирована",
                data: cart,
            });
        } catch (e) {
            next(e);
        }
    };
}