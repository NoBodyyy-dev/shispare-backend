import {IPaymentMethodType} from "@a2seven/yoo-checkout";
import {
    DeliveryType,
    IOrder,
    Order,
    OrderStatus,
    PaymentMethod,
} from "../models/Order.model";
import {IUser, User} from "../models/User.model";
import {Cart, ICart} from "../models/Cart.model";
import {SenderService} from "./sender.service";
import {PaymentService} from "./payment.service";
import {ProductService} from "./product.service";
import {APIError} from "./error.service";
import {SocketService} from "./socket.service";

export class OrderService {
    private senderService = new SenderService();
    private paymentService = new PaymentService();
    private productService = new ProductService();
    private socketService: SocketService;

    constructor(socketService: SocketService) {
        this.socketService = socketService;
    }

    /**
     * 🧾 Создание нового заказа
     */
    async createOrder(
        user: IUser,
        deliveryInfo: IOrder["deliveryInfo"],
        deliveryType: DeliveryType,
        paymentMethod: PaymentMethod
    ) {
        this.validateOrderData(deliveryType, deliveryInfo);

        try {
            const cart = await Cart.findOne({owner: user._id});
            if (!cart) throw APIError.NotFound({message: "Корзина не найдена"});

            await cart.recalcCart();

            if (!cart.items.length)
                throw APIError.BadRequest({message: "Корзина пуста"});

            await this.validateStockAvailability(cart);

            const orderItems = await this.buildOrderItems(cart);

            const order = new Order({
                owner: user._id,
                items: orderItems,
                totalProducts: cart.totalProducts,
                totalAmount: cart.totalAmount,
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

            if (
                ![PaymentMethod.CASH, PaymentMethod.INVOICE, PaymentMethod.PAYINSHOP].includes(paymentMethod)
            ) {
                const yooType = this.mapPaymentMethodToYooKassa(paymentMethod);
                const payment = await this.paymentService.createPayment({
                    paymentData: {
                        amount: cart.finalAmount.toFixed(2),
                        type: yooType,
                    },
                    orderData: {
                        orderId: order._id.toString(),
                        description: `Заказ №${order.orderNumber}`,
                    },
                });

                order.paymentId = payment.id;
            }

            // Сохраняем заказ
            await order.save();

            // Обновляем остатки на складе и счетчики покупок
            for (const item of cart.items) {
                await this.productService.decreaseStock(
                    item.product.toString(),
                    item.article,
                    item.quantity
                );
                await this.productService.incrementPurchaseCount(item.product.toString(), item.quantity);
            }

            // Очищаем корзину
            await cart.clearCart();
            console.log("afterclear >>>", cart)

            // Асинхронно обновляем статус заказа и отправляем уведомления
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
                    telegramId: user.telegramId,
                });
            }, 500);

            return {
                order,
                paymentUrl: order.paymentId
                    ? await this.paymentService.getPaymentUrl(order.paymentId)
                    : null,
            };
        } catch (err) {
            // В случае ошибки заказ не будет создан, остатки не будут изменены
            // Это обеспечивает консистентность данных даже без транзакций
            throw err;
        }
    }

    private async validateStockAvailability(cart: ICart) {
        for (const item of cart.items) {
            const isAvailable = await this.productService.checkStock(
                item.product.toString(),
                item.article,
                item.quantity
            );

            if (!isAvailable) {
                throw APIError.BadRequest({
                    message: `Недостаточно товара (артикул ${item.article}) на складе.`,
                });
            }
        }
    }

    private async buildOrderItems(cart: ICart) {
        const productIds = cart.items.map(i => i.product.toString());
        const products = await this.productService.checkProducts(productIds);

        return cart.items.map(item => {
            const product = products.find(p => p._id!.toString() === item.product.toString());
            if (!product) throw APIError.BadRequest({message: "Товар не найден"});

            const variant = product.variants.find(v => v.article === item.article);
            if (!variant)
                throw APIError.BadRequest({
                    message: `Вариант товара не найден (${product.title})`,
                });

            return {
                product: product._id,
                article: variant.article,
                title: product.title,
                color: variant.color,
                package: variant.package,
                price: variant.price,
                discount: variant.discount,
                quantity: item.quantity,
            };
        });
    }

    private validateOrderData(deliveryType: DeliveryType, deliveryInfo: IOrder["deliveryInfo"]) {
        if (!deliveryInfo.phone || !/^\+?[0-9\s\-\(\)]{10,}$/.test(deliveryInfo.phone)) {
            throw APIError.BadRequest({message: "Некорректный номер телефона получателя"});
        }

        if (deliveryType !== DeliveryType.PICKUP) {
            if (!deliveryInfo.city || !deliveryInfo.address) {
                throw APIError.BadRequest({message: "Для доставки обязательны город и адрес"});
            }
        }
    }

    /**
     * 💳 Маппинг метода оплаты под YooKassa
     */
    private mapPaymentMethodToYooKassa(paymentMethod: PaymentMethod): IPaymentMethodType {
        switch (paymentMethod) {
            case PaymentMethod.CARD:
                return "bank_card";
            case PaymentMethod.SBP:
                return "sbp";
            default:
                return "bank_card";
        }
    }

    async updateOrderStatus(orderId: string, newStatus: OrderStatus) {
        const order = await Order.findById(orderId);
        if (!order) throw APIError.NotFound({message: "Заказ не найден"});

        if (newStatus === OrderStatus.CANCELLED && order.paymentId) {
            await this.paymentService.refundPayment(order.paymentId);
            order.cancelledAt = new Date();
        }

        if (newStatus === OrderStatus.DELIVERED && order.paymentId && !order.paymentStatus) {
            order.paymentStatus = true;
            order.deliveredAt = new Date();
        }

        order.status = newStatus;
        await order.save();

        const user = await User.findById(order.owner);
        if (user) {
            await this.senderService.sendEmail({
                to: user.email,
                subject: `Статус заказа №${order.orderNumber} изменён`,
                html: `<p>Новый статус заказа: <b>${newStatus}</b></p>`,
            });
        }

        this.socketService.notifyOrderUpdate(order._id.toString(), {
            ownerId: order.owner.toString(),
            status: newStatus,
        });

        return order.populate("owner items.product");
    }

    async getUserOrders(userId: string) {
        return Order.find({owner: userId})
            .populate("owner")
            .populate("items.product")
            .lean();
    }

    async getAllOrders() {
        return Order.find()
            .populate("owner")
            .populate("items.product")
            .lean();
    }
}