import mongoose, {Document, Schema, Types} from "mongoose";
import {ICartProduct} from "../interfaces/product.interface";
import {IPaymentMethodType} from "@a2seven/yoo-checkout";

export enum OrderStatus {
    WAITING_FOR_PAYMENT = "waiting_for_payment",
    PENDING = "pending",
    PROCESSING = "processing",
    CONFIRMED = "confirmed",
    SHIPPED = "shipped",
    DELIVERED = "delivered",
    CANCELLED = "cancelled",
    REFUNDED = "refunded"
}

export enum DeliveryType {
    PICKUP = "pickup",
    KRASNODAR = "krasnodar",
    RUSSIA = "russia",
}

export enum PaymentMethod {
    CARD = "card",
    CASH = "cash",
    SBP = "sbp",
    INVOICE = "invoice",
    PAYINSHOP = "pay_in_shop"
}

export interface IDeliveryInfo {
    city?: string;
    address?: string;
    postalCode?: string;
    recipientName?: string;
    phone: string;
    comment?: string;
}

export interface IFinallyCartItems {
    product: Types.ObjectId;
    quantity: number;
}

// Основной интерфейс заказа
export interface IOrder extends Document {
    _id: Types.ObjectId;
    orderNumber: string;
    owner: Types.ObjectId;
    items: IFinallyCartItems[];
    totalAmount: number;
    totalProducts: number;
    discountAmount: number;
    finalAmount: number;
    status: OrderStatus;
    deliveryType: DeliveryType;
    deliveryInfo: IDeliveryInfo;
    paymentMethod: IPaymentMethodType;
    paymentStatus?: boolean;
    paymentId?: string;
    invoiceUrl?: string;
    trackingNumber?: string;
    createdAt: Date;
    updatedAt: Date;
    cancelledAt?: Date;
    canceledCaused?: string;
    deliveredAt?: Date;
    documentUrl?: string;
}

const OrderSchema = new Schema<IOrder>({
    orderNumber: {
        type: String,
        required: true,
        unique: true,
        default: () => `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    },
    owner: {type: Schema.Types.ObjectId, ref: 'User', required: true, index: true},
    items: [{
        product: {type: Schema.Types.ObjectId, ref: 'Product', required: true},
        quantity: {type: Number, required: true, min: 1},
    }],
    totalAmount: {type: Number, required: true, min: 0},
    totalProducts: {type: Number, required: true, min: 0},
    discountAmount: {type: Number, default: 0, min: 0},
    paymentId: {type: String},
    finalAmount: {type: Number, required: true, min: 0},
    status: {type: String, enum: Object.values(OrderStatus), default: OrderStatus.PENDING},
    deliveryType: {type: String, enum: Object.values(DeliveryType), required: true},
    deliveryInfo: {
        city: String,
        address: String,
        postalCode: String,
        recipientName: String,
        phone: {type: String, required: true},
        comment: String
    },
    paymentMethod: {type: String, enum: Object.values(PaymentMethod)},
    paymentStatus: {type: Boolean, default: false},
    invoiceUrl: {type: String},
    trackingNumber: {type: String},
    cancelledAt: {type: Date},
    deliveredAt: {type: Date},
    documentUrl: {type: String},
}, {
    timestamps: true,
    versionKey: false
});

OrderSchema.index({status: 1});
OrderSchema.index({createdAt: -1});

OrderSchema.pre<IOrder>('save', function (next) {
    if (this.isModified('status') && this.status === OrderStatus.SHIPPED && !this.trackingNumber) {
        this.trackingNumber = `TRACK-${this.orderNumber.slice(-8)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    }

    if (this.isModified('status')) {
        if (this.status === OrderStatus.DELIVERED) {
            this.deliveredAt = new Date();
        } else if (this.status === OrderStatus.CANCELLED) {
            this.cancelledAt = new Date();
        }
    }

    next();
});

OrderSchema.statics = {
    async findByUser(userId: Types.ObjectId) {
        return this.find({user: userId}).sort({createdAt: -1});
    },

    async findRecent(limit: number = 10) {
        return this.find().sort({createdAt: -1}).limit(limit);
    }
};

export const Order = mongoose.model<IOrder>('Order', OrderSchema);