import {Schema, Types, model} from "mongoose";
import {ICart, ICartItem} from "../interfaces/cart.interface";

const CartSchema = new Schema<ICart>({
    user: {type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true},
    items: [{
        product: {type: Schema.Types.ObjectId, ref: 'Product', required: true},
        optionIndex: {type: Number, required: true, min: 0},
        quantity: {type: Number, required: true, min: 1, max: 100},
        addedAt: {type: Date, default: Date.now},
        customOptions: {type: Schema.Types.Mixed}
    }],
    lastActivity: {type: Date, default: Date.now}
}, {
    timestamps: true,
    versionKey: false,
    toJSON: {virtuals: true},
    toObject: {virtuals: true}
});

CartSchema.virtual('totalItems').get(function (this: ICart) {
    return this.items.reduce((total, item) => total + item.quantity, 0);
});

CartSchema.virtual('totalPrice').get(function (this: ICart) {
    if (!this.populated('items.product')) return 0;

    return this.items.reduce((total, item) => {
        const product = item.product as any;
        const option = product.options[item.optionIndex];
        const price = option.price * (1 - (option.discount || 0) / 100);
        return total + (price * item.quantity);
    }, 0);
});

CartSchema.index({user: 1});
CartSchema.index({lastActivity: 1});

CartSchema.pre<ICart>(/^(save|updateOne|findOneAndUpdate)/, function (next) {
    this.set({lastActivity: new Date()});
    next();
});

CartSchema.statics = {
    async findOrCreate(userId: Types.ObjectId) {
        let cart = await this.findOne({user: userId}).populate('items.product');
        if (!cart) {
            cart = await this.create({user: userId, items: []});
        }
        return cart;
    },

    async clearCart(userId: Types.ObjectId) {
        return this.findOneAndUpdate(
            {user: userId},
            {$set: {items: []}},
            {new: true}
        );
    }
};

CartSchema.methods = {
    async addItem(productId: Types.ObjectId, optionIndex: number, quantity: number = 1) {
        const existingItemIndex = this.items.findIndex(
            (item: ICartItem) => item.product.equals(productId) && item.optionIndex === optionIndex
        );

        if (existingItemIndex >= 0) {
            this.items[existingItemIndex].quantity += quantity;
        } else {
            this.items.push({
                product: productId,
                optionIndex,
                quantity,
                addedAt: new Date()
            });
        }

        return this.save();
    },

    async updateItem(productId: Types.ObjectId, optionIndex: number, newQuantity: number) {
        const itemIndex = this.items.findIndex(
            (item: ICartItem) => item.product.equals(productId) && item.optionIndex === optionIndex
        );

        if (itemIndex === -1) throw new Error('Товар не найден в корзине');

        if (newQuantity <= 0) {
            // Удаляем товар если количество <= 0
            this.items.splice(itemIndex, 1);
        } else {
            this.items[itemIndex].quantity = newQuantity;
        }

        return this.save();
    },

    async removeItem(productId: Types.ObjectId, optionIndex: number) {
        this.items = this.items.filter(
            (item: ICartItem) => !(item.product.equals(productId) && item.optionIndex === optionIndex)
        );
        return this.save();
    }
};

export const Cart = model<ICart>('Cart', CartSchema);