import {Cart} from "../models/Cart.model";
import {APIError} from "./error.service";
import {Product} from "../models/Product.model";
import {toObjID} from "../utils/utils";
import {ProductService} from "./product.service";

export class CartService {
    private productService: ProductService

    constructor() {
        this.productService = new ProductService();
    }

    async initialCart(owner: string) {
        return Cart.create({owner});
    }

    async getUserCart(owner: string) {
        return Cart.findOne({owner})
            .populate({
                path: "products.product",
                populate: {
                    path: "category",
                    select: "name slug"
                }
            });
    }

    async addToCart(productId: string, owner: string, quantity: number = 1) {
        try {
            let cart = await Cart.findOne({owner});
            const product = await Product.findById(productId);

            if (!product) throw APIError.NotFound({message: "Товар не найден!"});
            if (!cart) cart = await this.initialCart(owner);

            const existingProduct = cart.products.find(
                item => item.product.toString() === productId
            );

            if (existingProduct) {
                existingProduct.quantity += quantity;
                existingProduct.addedAt = new Date();
            } else {
                cart.products.push({
                    product: toObjID(productId),
                    quantity,
                    addedAt: new Date()
                });
            }

            await cart.recalculateCart();
            await cart.save();

            return cart.populate({
                path: "products.product",
                populate: {
                    path: "category",
                    select: "name slug"
                }
            });
        } catch (e) {
            throw APIError.InternalServerError({message: (e as Error).message});
        }
    }

    async updateQuantity(productId: string, owner: string, newQuantity: number) {
        try {
            if (newQuantity < 1) {
                throw APIError.BadRequest({message: "Количество должно быть не менее 1"});
            }

            const cart = await this.getUserCart(owner);
            if (!cart) throw APIError.NotFound({message: "Корзина не найдена!"});

            const product = cart.products.find(
                item => item.product._id.toString() === productId
            );

            if (!product) throw APIError.NotFound({message: "Товар не найден в корзине!"});

            product.quantity = newQuantity;
            product.addedAt = new Date();

            await cart.save();

            // Исправлено: дожидаемся выполнения populate и возвращаем результат
            return await cart.populate({
                path: "products.product",
                populate: {
                    path: "category",
                    select: "name slug"
                }
            });
        } catch (e) {
            throw APIError.InternalServerError({message: (e as Error).message});
        }
    }

    async removeFromCart(productId: string, owner: string) {
        try {
            const cart = await Cart.findOne({owner});
            if (!cart) throw APIError.NotFound({message: "Корзина не найдена!"});

            const initialLength = cart.products.length;
            cart.products = cart.products.filter(
                item => item.product.toString() !== productId
            );

            if (cart.products.length === initialLength) {
                throw APIError.NotFound({message: "Товар не найден в корзине!"});
            }

            await cart.recalculateCart();
            await cart.save();

            return cart.populate({
                path: "products.product",
                populate: {
                    path: "category",
                    select: "name slug"
                }
            });
        } catch (e) {
            throw APIError.InternalServerError({message: (e as Error).message});
        }
    }

    async clearCart(owner: string) {
        try {
            const cart = await Cart.findOne({owner});
            if (!cart) throw APIError.NotFound({message: "Корзина не найдена!"});

            cart.products = [];

            await cart.recalculateCart();
            await cart.save();

            return cart;
        } catch (e) {
            throw APIError.InternalServerError({message: (e as Error).message});
        }
    }
}