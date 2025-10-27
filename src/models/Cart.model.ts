import mongoose, {Document, Model, Schema, Types} from "mongoose";
import {Product, IProduct} from "./Product.model";
import {APIError} from "../services/error.service";

export interface ICartItem {
    product: Types.ObjectId;
    article: number;
    quantity: number;
}

export interface ICart extends Document {
    owner: Types.ObjectId;
    items: ICartItem[];

    totalProducts: number;
    totalAmount: number;
    discountAmount: number;
    finalAmount: number;
    updatedAt: Date;

    recalcCart(): Promise<void>;
    addItem(productId: Types.ObjectId, article: number, quantity: number): Promise<void>;
    updateQuantity(productId: Types.ObjectId, article: number, quantity: number): Promise<void>;
    removeItem(productId: Types.ObjectId, article: number): Promise<void>;
    clearCart(): Promise<void>;
}

const cartItemSchema = new Schema<ICartItem>(
    {
        product: {type: Schema.Types.ObjectId, ref: "Product", required: true},
        article: {type: Number, required: true},
        quantity: {type: Number, required: true, min: 1},
    },
    {_id: false}
);

const cartSchema = new Schema<ICart>(
    {
        owner: {type: Schema.Types.ObjectId, ref: "User", required: true, unique: true},
        items: {type: [cartItemSchema], default: []},
        totalProducts: {type: Number, default: 0},
        totalAmount: {type: Number, default: 0},
        discountAmount: {type: Number, default: 0},
        finalAmount: {type: Number, default: 0},
        updatedAt: {type: Date, default: Date.now},
    },
    {timestamps: true}
);

cartSchema.methods.recalcCart = async function (): Promise<void> {
    const productIds = this.items.map((i: ICartItem) => i.product);
    const products = await Product.find({_id: {$in: productIds}}).lean<IProduct[]>();

    const map = new Map<string, IProduct>();
    for (const p of products) map.set((p._id as Types.ObjectId).toString(), p);

    let total = 0;
    let discount = 0;
    let count = 0;
    const valid: ICartItem[] = [];

    for (const item of this.items) {
        const prod = map.get(item.product.toString());
        if (!prod) continue;

        const variant = prod.variants.find(v => v.article === item.article);
        if (!variant) continue;

        if (variant.countInStock <= 0) continue;
        if (item.quantity > variant.countInStock) item.quantity = variant.countInStock;

        valid.push(item);

        const itemTotal = variant.price * item.quantity;
        const itemDiscount = (variant.discount / 100) * variant.price * item.quantity;

        total += itemTotal;
        discount += itemDiscount;
        count += item.quantity;
    }

    this.items = valid;
    this.totalProducts = count;
    this.totalAmount = Math.round(total * 100) / 100;
    this.discountAmount = Math.round(discount * 100) / 100;
    this.finalAmount = Math.round((total - discount) * 100) / 100;
    this.updatedAt = new Date();
};

cartSchema.methods.addItem = async function (
    productId: Types.ObjectId,
    article: number,
    quantity: number
): Promise<void> {
    const product = await Product.findById(productId);
    if (!product) throw APIError.NotFound({message: "Товар не найден!"});

    const variant = product.variants.find(v => v.article === article);
    if (!variant) throw APIError.NotFound({message: "Товар не найден!"});

    if (variant.countInStock < quantity)
        throw APIError.BadRequest({message: "Недостаточно товаров на складе!"})

    const idx = this.items.findIndex(
        (i: ICartItem) =>
            i.product.toString() === productId.toString() &&
            i.article === article
    );

    if (idx >= 0) {
        this.items[idx].quantity += quantity;
    } else {
        this.items.push({product: productId, article, quantity});
    }

    await this.recalcCart();
    await this.save();
};

cartSchema.methods.updateQuantity = async function (
    productId: Types.ObjectId,
    article: number,
    quantity: number
): Promise<void> {
    if (quantity <= 0) {
        await this.removeItem(productId, article);
        return;
    }

    const product = await Product.findById(productId);
    if (!product) throw APIError.NotFound({message: "Товар не найден!"});

    const variant = product.variants.find(v => v.article === article);
    if (!variant) throw APIError.NotFound({message: "Товар не найден!"});

    if (variant.countInStock < quantity)
        throw APIError.BadRequest({message: "Недостаточно товаров на складе!"})

    const idx = this.items.findIndex(
        (i: ICartItem) =>
            i.product.toString() === productId.toString() &&
            i.article === article
    );
    if (idx < 0) throw new Error("Товар не найден в корзине");

    this.items[idx].quantity = quantity;
    await this.recalcCart();
    await this.save();
};

cartSchema.methods.removeItem = async function (
    productId: Types.ObjectId,
    article: number
): Promise<void> {
    this.items = this.items.filter(
        (i: ICartItem) =>
            i.product.toString() !== productId.toString() ||
            i.article !== article
    );
    await this.recalcCart();
    await this.save();
};

cartSchema.methods.clearCart = async function (): Promise<void> {
    this.items = [];
    this.totalProducts = 0;
    this.totalAmount = 0;
    this.discountAmount = 0;
    this.finalAmount = 0;
    await this.save();
};

cartSchema.index({owner: 1});
cartSchema.index({"items.product": 1});
cartSchema.index({"items.article": 1});
cartSchema.index({updatedAt: 1});

export const Cart: Model<ICart> = mongoose.model<ICart>("Cart", cartSchema);