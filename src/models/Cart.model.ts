import mongoose, {Document, Model, Schema, Types} from "mongoose";
import {Product} from "./Product.model";
import {ICartProduct} from "../interfaces/product.interface";

export interface ICart extends Document {
    owner: Types.ObjectId;
    products: ICartProduct[];
    updatedAt: Date;
    totalAmount: number;
    totalProducts: number;
    discountAmount: number;
    finalAmount: number;

    recalculateCart(): Promise<void>;
}

const cartProductSchema = new Schema<ICartProduct>({
    product: {type: Schema.Types.ObjectId, ref: "Product", required: true},
    quantity: {type: Number, required: true, min: 1},
}, {_id: false});

const cartSchema = new Schema<ICart>({
    owner: {type: Schema.Types.ObjectId, ref: "User", required: true, unique: true},
    products: {type: [cartProductSchema], default: []},
    updatedAt: {type: Date, default: Date.now},
    totalProducts: {type: Number, default: 0},
    totalAmount: {type: Number, default: 0},
    discountAmount: {type: Number, default: 0},
    finalAmount: {type: Number, default: 0},
});

cartSchema.methods.recalculateCart = async function (): Promise<void> {
    try {
        this.updatedAt = new Date();

        if (this.products.length === 0) {
            this.totalAmount = 0;
            this.discountAmount = 0;
            this.finalAmount = 0;
            this.totalProducts = 0;
            return;
        }

        const productIds = this.products.map((item: ICartProduct) => item.product);
        const products = await Product.find({_id: {$in: productIds}});

        const productMap = new Map();
        products.forEach(p => productMap.set(p._id.toString(), p));

        let totalAmount = 0;
        let totalProducts = 0;
        let discountAmount = 0;

        const validProducts: ICartProduct[] = [];

        for (const item of this.products) {
            const findProduct = await Product.findOne({_id: item.product._id});

            if (!findProduct) continue;

            const product = findProduct.variants[findProduct.variantIndex];
            if (product.countInStock < item.quantity) item.quantity = product.countInStock;

            validProducts.push(item);

            const price = Number(product.price) || 0;
            const discountValue = Number(product.discount) || 0;
            const quantity = Number(item.quantity) || 0;

            if (isNaN(price) || isNaN(quantity) || quantity < 1) continue;

            const productTotal = price * quantity;
            totalAmount += productTotal;

            const productDiscount = (price / 100 * discountValue) * quantity;
            discountAmount += productDiscount;

            totalProducts += quantity;
        }

        this.products = validProducts;

        // Защита от NaN значений
        this.totalAmount = Math.round((isNaN(totalAmount) ? 0 : totalAmount) * 100) / 100;
        this.discountAmount = Math.round((isNaN(discountAmount) ? 0 : discountAmount) * 100) / 100;

        const final = (totalAmount - discountAmount);
        this.finalAmount = Math.round((isNaN(final) ? 0 : final) * 100) / 100;
        this.totalProducts = totalProducts;
    } catch (error) {
        console.error('Ошибка в recalculateCart:', error);
        this.totalAmount = 0;
        this.discountAmount = 0;
        this.finalAmount = 0;
        this.totalProducts = 0;
    }
};

cartSchema.methods.recalculateQuantity = async function (): Promise<void> {
    try {
        const productIds = this.products.map((item: ICartProduct) => item.product);
        const products = await Product.find({_id: {$in: productIds}});

        for (const item of products) {

        }
    } catch (e) {

    }
}

cartSchema.pre("save", async function (next) {
    try {
        await this.recalculateCart();
        next();
    } catch (error) {
        next(error as Error);
    }
});

cartSchema.index({owner: 1});
cartSchema.index({"products.product": 1});
cartSchema.index({updatedAt: 1});

export const Cart: Model<ICart> = mongoose.model<ICart>("Cart", cartSchema);