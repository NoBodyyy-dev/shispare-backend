import mongoose, {Document, Schema, Types} from "mongoose";

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
    COURIER = "courier",           // Курьерская доставка
    POST = "post",                 // Почта России
    EXPRESS = "express"            // Экспресс-доставка
}

export enum PaymentMethod {
    CARD = "card",                 // Оплата картой
    CASH = "cash",                 // Наличные при получении
    SBP = "sbp",                   // Система быстрых платежей
    INVOICE = "invoice"            // По счету для юр. лиц
}

// Интерфейс для элемента заказа
export interface IOrderItem {
    product: Types.ObjectId;       // Ссылка на продукт
    optionIndex: number;           // Индекс выбранной опции (цвет/размер)
    quantity: number;              // Количество товара
    price: number;                 // Цена на момент заказа (фиксируем)
    discount?: number;             // Скидка на товар (%)
}

// Интерфейс для данных доставки
export interface IDeliveryInfo {
    city: string;                  // Город
    address: string;               // Адрес
    postalCode?: string;           // Почтовый индекс
    recipientName: string;         // ФИО получателя
    phone: string;                 // Телефон получателя
    comment?: string;              // Комментарий к доставке
}

// Основной интерфейс заказа
export interface IOrder extends Document {
    orderNumber: string;           // Уникальный номер заказа (генерируется)
    owner: Types.ObjectId;         // Пользователь, оформивший заказ
    items: IOrderItem[];           // Состав заказа
    totalAmount: number;           // Общая сумма
    discountAmount: number;        // Сумма скидки
    deliveryCost: number;          // Стоимость доставки
    finalAmount: number;           // Итоговая сумма к оплате
    status: OrderStatus;           // Статус заказа
    deliveryType: DeliveryType;    // Способ доставки
    deliveryInfo: IDeliveryInfo;   // Данные доставки
    paymentMethod: PaymentMethod;  // Способ оплаты
    paymentStatus: boolean;        // Статус оплаты
    invoiceUrl?: string;           // Ссылка на счет/накладную
    trackingNumber?: string;       // Трек-номер для отслеживания
    createdAt: Date;               // Дата создания
    updatedAt: Date;               // Дата обновления
    cancelledAt?: Date;            // Дата отмены
    deliveredAt?: Date;            // Дата доставки
    documentUrl: string;
}

const OrderSchema = new Schema<IOrder>({
    orderNumber: {
        type: String,
        required: true,
        unique: true,
        default: () => `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    },
    owner: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    items: [{
        product: {type: Schema.Types.ObjectId, ref: 'Product', required: true},
        optionIndex: {type: Number, required: true},
        quantity: {type: Number, required: true, min: 1},
        price: {type: Number, required: true},
        discount: {type: Number, default: 0, min: 0, max: 100}
    }],
    totalAmount: {type: Number, required: true, min: 0},
    discountAmount: {type: Number, default: 0, min: 0},
    deliveryCost: {type: Number, required: true, min: 0},
    finalAmount: {type: Number, required: true, min: 0},
    status: {type: String, enum: Object.values(OrderStatus), default: OrderStatus.PENDING},
    deliveryType: {type: String, enum: Object.values(DeliveryType), required: true},
    deliveryInfo: {
        city: {type: String, required: true},
        address: {type: String, required: true},
        postalCode: {type: String},
        recipientName: {type: String, required: true},
        phone: {type: String, required: true},
        comment: {type: String}
    },
    paymentMethod: {type: String, enum: Object.values(PaymentMethod), required: true},
    paymentStatus: {type: Boolean, default: false},
    invoiceUrl: {type: String},
    trackingNumber: {type: String},
    cancelledAt: {type: Date},
    deliveredAt: {type: Date},
    documentUrl: {type: String}
}, {
    timestamps: true,
    versionKey: false
});

OrderSchema.index({orderNumber: 1});
OrderSchema.index({user: 1});
OrderSchema.index({status: 1});
OrderSchema.index({createdAt: -1});

// Middleware для предварительной обработки
OrderSchema.pre<IOrder>('save', function (next) {
    // Автоматическая генерация трек-номера для отправленных заказов
    if (this.isModified('status') && this.status === OrderStatus.SHIPPED && !this.trackingNumber) {
        this.trackingNumber = `TRACK-${this.orderNumber.slice(-8)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    }

    // Фиксация времени доставки/отмены
    if (this.isModified('status')) {
        if (this.status === OrderStatus.DELIVERED) {
            this.deliveredAt = new Date();
        } else if (this.status === OrderStatus.CANCELLED) {
            this.cancelledAt = new Date();
        }
    }

    next();
});

// Статические методы модели
OrderSchema.statics = {
    async findByUser(userId: Types.ObjectId) {
        return this.find({user: userId}).sort({createdAt: -1});
    },

    async findRecent(limit: number = 10) {
        return this.find().sort({createdAt: -1}).limit(limit);
    }
};

// Экспорт модели
export const Order = mongoose.model<IOrder>('Order', OrderSchema);