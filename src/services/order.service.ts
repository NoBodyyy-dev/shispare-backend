import mongoose from "mongoose";
import {IPaymentMethodType} from "@a2seven/yoo-checkout";
import {DeliveryType, IOrder, Order, OrderStatus, PaymentMethod} from "../models/Order.model";
import {IUser, User} from "../models/User.model";
import {Cart} from "../models/Cart.model";
import {SenderService} from "./sender.service";
import {PaymentService} from "./payment.service";
import {APIError} from "./error.service";
import {SocketService} from "./socket.service";

export class OrderService {
    private senderService: SenderService;
    private paymentService: PaymentService;
    private socketService: SocketService;

    constructor(socketService: SocketService) {
        this.senderService = new SenderService();
        this.paymentService = new PaymentService();
        this.socketService = socketService;
    }

    async createOrder(
        user: IUser,
        deliveryInfo: IOrder["deliveryInfo"],
        deliveryType: DeliveryType,
        paymentMethod: PaymentMethod,
    ) {
        const recipientPhone = deliveryInfo.phone;
        const recipientName = deliveryInfo.recipientName;
        this.validateOrderData(deliveryType, deliveryInfo);

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const cart = await Cart.findOne({owner: user._id});
            if (!cart) throw APIError.NotFound({message: "Корзина не найдена"});
            if (!cart.products.length) throw APIError.BadRequest({message: "Корзина пуста"});

            await this.validateStockAvailability(cart);

            const order = new Order({
                owner: user._id,
                items: cart.products.map(p => ({
                    product: p.product,
                    quantity: p.quantity
                })),
                totalAmount: cart.totalAmount,
                totalProducts: cart.totalProducts,
                discountAmount: cart.discountAmount,
                finalAmount: cart.finalAmount,
                status: OrderStatus.PROCESSING,
                deliveryType,
                deliveryInfo,
                paymentMethod,
                paymentStatus: false,
                paymentId: "",
                documentUrl: "",
            });


            if (paymentMethod !== PaymentMethod.CASH && paymentMethod !== PaymentMethod.INVOICE && paymentMethod !== PaymentMethod.PAYINSHOP) {
                const yooKassaPaymentType = this.mapPaymentMethodToYooKassa(paymentMethod);

                const payment = await this.paymentService.createPayment({
                    paymentData: {
                        amount: cart.finalAmount.toString(),
                        type: yooKassaPaymentType
                    },
                    orderData: {
                        orderId: order._id.toString(),
                        description: `Заказ №${order.orderNumber}`
                    }
                });

                order.paymentId = payment.id;
            }

            await order.save();

            cart.products = [];
            cart.totalAmount = 0;
            cart.totalProducts = 0;
            cart.discountAmount = 0;
            cart.finalAmount = 0;
            await cart.save();

            await session.commitTransaction();
            await session.endSession();

            setTimeout(async () => {
                order.status = OrderStatus.PENDING;
                await order.save();

                this.socketService.notifyOrderUpdate(order._id.toString(), {
                    ownerId: user._id.toString(),
                    status: OrderStatus.PENDING,
                });

                await this.senderService.sendMessagesAboutCreatedOrder({
                    to: user.email,
                    orderId: order._id.toString(),
                    orderNumber: order.orderNumber,
                    telegramId: user.telegramId
                });
            }, 1000);

            return {
                order,
                paymentUrl: order.paymentId ? (await this.paymentService.getPaymentUrl(order.paymentId)) : null
            };
        } catch (error) {
            await session.abortTransaction();
            await session.endSession();
            throw error;
        }
    }

    private validateOrderData(
        deliveryType: DeliveryType,
        deliveryInfo: IOrder["deliveryInfo"],
    ) {
        if (!deliveryInfo.phone || !/^\+?[0-9\s\-\(\)]{10,}$/.test(deliveryInfo.phone)) {
            throw APIError.BadRequest({message: "Некорректный номер телефона получателя"});
        }

        if (deliveryType !== DeliveryType.PICKUP) {
            if (!deliveryInfo.city || !deliveryInfo.address) {
                throw APIError.BadRequest({message: "Для доставки обязательны город и адрес"});
            }
        }

        if (deliveryType === DeliveryType.PICKUP) {
            if (!deliveryInfo.phone) {
                throw APIError.BadRequest({message: "Для самовывоза обязателен номер телефона"});
            }
        }
    }

    private async validateStockAvailability(cart: any) {
        for (const item of cart.products) {
            const product = await mongoose.model('Product').findById(item.product);
            if (!product) {
                throw APIError.BadRequest({message: `Товар ${item.product} не найден`});
            }

            const variant = product.variants[product.variantIndex];
            if (!variant) {
                throw APIError.BadRequest({message: `Вариант товара ${product.title} не найден`});
            }

            if (variant.countInStock < item.quantity) {
                throw APIError.BadRequest({
                    message: `Недостаточно товара ${product.title} на складе. Доступно: ${variant.countInStock}, запрошено: ${item.quantity}`
                });
            }
        }
    }

    private mapPaymentMethodToYooKassa(paymentMethod: PaymentMethod): IPaymentMethodType {
        switch (paymentMethod) {
            case PaymentMethod.CARD:
                return 'bank_card';
            case PaymentMethod.SBP:
                return 'sbp';
            default:
                return 'bank_card'; // По умолчанию карта
        }
    }

    async updateOrderStatus(orderId: string, newStatus: OrderStatus) {
        const order = await Order.findById(orderId);
        if (!order) throw APIError.NotFound({message: "Заказ не найден"});

        if (newStatus === OrderStatus.CANCELLED && order.paymentId) {
            await this.paymentService.cancelPayment(order.paymentId);
            order.cancelledAt = new Date();
        }

        if (newStatus === OrderStatus.DELIVERED && order.paymentId && !order.paymentStatus) {
            await this.paymentService.capturePayment(order.paymentId);
            order.paymentStatus = true;
            order.deliveredAt = new Date();
        }

        order.status = newStatus;
        await order.save();

        const user = await User.findById(order.owner);
        if (user) {
            await this.senderService.sendEmail({
                to: user.email,
                subject: `Статус вашего заказа №${order.orderNumber} изменён`,
                html: `<p>Новый статус заказа: <b>${newStatus}</b></p>`
            });
        }

        this.socketService.notifyOrderUpdate(order._id.toString(), {
            ownerId: order.owner.toString(),
            status: newStatus,
        });

        return order;
    }

    async getAllOrders() {
        return Order.find().populate("owner").populate("items.product");
    }

    async getUserOrders(userId: string) {
        return Order.findOne({owner: userId}).populate("owner").populate("items.product");
    }

}