import mongoose, {Document, Schema, Types} from "mongoose";
import {ICartProduct} from "../interfaces/product.interface";
import {IPaymentMethodType} from "@a2seven/yoo-checkout";

export enum OrderStatus {
    PENDING = "pending",           // Ожидает подтверждения
    PROCESSING = "processing",     // В обработке
    CONFIRMED = "confirmed",       // Подтвержден
    SHIPPED = "shipped",           // Отправлен
    DELIVERED = "delivered",       // Доставлен
    CANCELLED = "cancelled",       // Отменен
    REFUNDED = "refunded"          // Возвращен
}

export enum DeliveryType {
    PICKUP = "pickup",             // Самовывоз
    KRASNODAR = "krasnodar",       // Доставка по краснодару
    RUSSIA = "russia",             // Доставка по России
}

export enum PaymentMethod {
    CARD = "card",                 // Оплата картой
    CASH = "cash",                 // Наличные при получении
    SBP = "sbp",                   // Система быстрых платежей
    INVOICE = "invoice",           // По счету для юр. лиц
    PAYINSHOP = "pay_in_shop"      // Оплата в магазине
}

// Интерфейс для данных доставки
export interface IDeliveryInfo {
    city?: string;                  // Город (обязателен для доставки)
    address?: string;               // Адрес (обязателен для доставки)
    postalCode?: string;            // Почтовый индекс
    recipientName?: string;         // ФИО получателя (обязателен для доставки)
    phone: string;                  // Телефон получателя (всегда обязателен)
    comment?: string;               // Комментарий к доставке
}

export interface IFinallyCartItems {
    product: Types.ObjectId;
    quantity: number;
}

// Основной интерфейс заказа
export interface IOrder extends Document {
    _id: Types.ObjectId;
    orderNumber: string;                // Уникальный номер заказа (генерируется)
    owner: Types.ObjectId;              // Пользователь, оформивший заказ
    items: IFinallyCartItems[];         // Состав заказа
    totalAmount: number;                // Общая сумма
    totalProducts: number;              // Общее количество товаров
    discountAmount: number;             // Сумма скидки
    finalAmount: number;                // Итоговая сумма к оплате
    status: OrderStatus;                // Статус заказа
    deliveryType: DeliveryType;         // Способ доставки
    deliveryInfo: IDeliveryInfo;        // Данные доставки
    paymentMethod: IPaymentMethodType;  // Способ оплаты
    paymentStatus?: boolean;            // Статус оплаты
    paymentId?: string;                 // Айди платежа
    invoiceUrl?: string;                // Ссылка на счет/накладную
    trackingNumber?: string;            // Трек-номер для отслеживания
    createdAt: Date;                    // Дата создания
    updatedAt: Date;                    // Дата обновления
    cancelledAt?: Date;                 // Дата отмены
    canceledCaused?: string;            // Причина отмены
    deliveredAt?: Date;                 // Дата доставки
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