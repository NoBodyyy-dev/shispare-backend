import { Cart } from "../models/Cart.model";
import { Product } from "../models/Product.model";
import { APIError } from "./error.service";
import { toObjID } from "../utils/utils";

export class CartService {
    /**
     * Инициализация корзины при первом обращении
     */
    async initialCart(owner: string) {
        let cart = await Cart.findOne({ owner });
        if (!cart) {
            cart = new Cart({ owner, items: [] });
            await cart.save();
        }
        return cart;
    }

    /**
     * Получение корзины пользователя
     */
    async getUserCart(owner: string) {
        const cart = await this.initialCart(owner);
        await cart.recalcCart();
        return cart;
    }

    /**
     * Добавление товара по артикулу
     */
    async addToCart({
                        owner,
                        productId,
                        article,
                        quantity,
                    }: {
        owner: string;
        productId: string;
        article: number;
        quantity: number;
    }) {
        if (quantity <= 0)
            throw APIError.BadRequest({ message: "Количество должно быть больше 0" });

        const product = await Product.findById(productId);
        if (!product) throw APIError.NotFound({ message: "Товар не найден" });

        const variant = product.variants.find(v => v.article === article);
        if (!variant)
            throw APIError.NotFound({ message: "Артикул не найден в товаре" });

        if (variant.countInStock < quantity)
            throw APIError.BadRequest({ message: "Недостаточно товара на складе" });

        const cart = await this.initialCart(owner);
        await cart.addItem(toObjID(productId), article, quantity);

        return await cart.recalcCart();
    }

    /**
     * Обновление количества по артикулу
     */
    async updateQuantity({
                             owner,
                             productId,
                             article,
                             quantity,
                         }: {
        owner: string;
        productId: string;
        article: number;
        quantity: number;
    }) {
        if (quantity < 1)
            throw APIError.BadRequest({ message: "Количество должно быть не менее 1" });

        const product = await Product.findById(productId);
        if (!product) throw APIError.NotFound({ message: "Товар не найден" });

        const variant = product.variants.find(v => v.article === article);
        if (!variant)
            throw APIError.NotFound({ message: "Артикул не найден в товаре" });

        if (variant.countInStock < quantity)
            throw APIError.BadRequest({ message: "Недостаточно товара на складе" });

        const cart = await this.initialCart(owner);
        await cart.updateQuantity(toObjID(productId), article, quantity);
        return await cart.recalcCart();
    }

    /**
     * Удаление позиции по артикулу
     */
    async removeFromCart({
                             owner,
                             productId,
                             article,
                         }: {
        owner: string;
        productId: string;
        article: number;
    }) {
        const cart = await Cart.findOne({ owner });
        if (!cart) throw APIError.NotFound({ message: "Корзина не найдена" });

        await cart.removeItem(toObjID(productId), article);
        return await cart.recalcCart();
    }

    /**
     * Очистка корзины
     */
    async clearCart(owner: string) {
        const cart = await this.initialCart(owner);
        await cart.clearCart();
        return cart;
    }
}