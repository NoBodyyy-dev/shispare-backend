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
        const populatedCart = await Cart.findById(cart._id)
            .populate({
                path: 'items.product',
                model: 'Product',
                populate: {
                    path: 'category',
                    model: 'Category'
                }
            })
            .lean();
        return populatedCart || cart;
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
        await cart.recalcCart();
        
        const populatedCart = await Cart.findById(cart._id)
            .populate({
                path: 'items.product',
                model: 'Product',
                populate: {
                    path: 'category',
                    model: 'Category'
                }
            })
            .lean();
        return populatedCart || cart;
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
        await cart.recalcCart();
        
        const populatedCart = await Cart.findById(cart._id)
            .populate({
                path: 'items.product',
                model: 'Product',
                populate: {
                    path: 'category',
                    model: 'Category'
                }
            })
            .lean();
        return populatedCart || cart;
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
        await cart.recalcCart();
        
        const populatedCart = await Cart.findById(cart._id)
            .populate({
                path: 'items.product',
                model: 'Product',
                populate: {
                    path: 'category',
                    model: 'Category'
                }
            })
            .lean();
        return populatedCart || cart;
    }

    /**
     * Очистка корзины
     */
    async clearCart(owner: string) {
        const cart = await this.initialCart(owner);
        await cart.clearCart();
        return cart;
    }

    /**
     * Синхронизация корзины из localStorage
     */
    async syncCartFromLocalStorage(owner: string, items: Array<{ productId: string; article: number; quantity: number }>) {
        const cart = await this.initialCart(owner);
        
        // Очищаем текущую корзину
        await cart.clearCart();
        
        // Добавляем товары из localStorage
        for (const item of items) {
            try {
                await cart.addItem(toObjID(item.productId), item.article, item.quantity);
            } catch (error) {
                // Пропускаем товары, которых нет в наличии или не найдены
                console.error(`Не удалось добавить товар ${item.productId}:${item.article}`, error);
            }
        }
        
        await cart.recalcCart();
        
        const populatedCart = await Cart.findById(cart._id)
            .populate({
                path: 'items.product',
                model: 'Product',
                populate: {
                    path: 'category',
                    model: 'Category'
                }
            })
            .lean();
        return populatedCart || cart;
    }
}