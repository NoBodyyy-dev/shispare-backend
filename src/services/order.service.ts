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
import {InvoiceService} from "./invoice.service";

export class OrderService {
    private senderService = new SenderService();
    private paymentService = new PaymentService();
    private productService = new ProductService();
    private invoiceService = new InvoiceService();
    private socketService: SocketService;

    constructor(socketService: SocketService) {
        this.socketService = socketService;
    }

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

            // Определяем начальный статус заказа
            const requiresPayment = ![PaymentMethod.CASH, PaymentMethod.INVOICE, PaymentMethod.PAYINSHOP].includes(paymentMethod);
            const initialStatus = requiresPayment ? OrderStatus.WAITING_FOR_PAYMENT : OrderStatus.PROCESSING;

            const order = new Order({
                owner: user._id,
                items: orderItems,
                totalProducts: cart.totalProducts,
                totalAmount: cart.totalAmount,
                discountAmount: cart.discountAmount,
                finalAmount: cart.finalAmount,
                status: initialStatus,
                deliveryType,
                deliveryInfo,
                paymentMethod,
                paymentStatus: false,
                paymentId: "",
                documentUrl: "",
            });

            if (requiresPayment) {
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

            await order.save();

            for (const item of cart.items) {
                await this.productService.decreaseStock(
                    item.product.toString(),
                    item.article,
                    item.quantity
                );
                await this.productService.incrementPurchaseCount(item.product.toString(), item.quantity);
            }

            await cart.clearCart();
            
            // Убеждаемся, что корзина очищена
            await cart.save();

            // Для заказов без оплаты сразу переводим в PENDING
            if (!requiresPayment) {
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
            } else {
                // Для заказов с оплатой отправляем уведомление о создании заказа
                // Статус изменится на PENDING после успешной оплаты через webhook
                setTimeout(async () => {
                    await this.senderService.sendMessagesAboutCreatedOrder({
                        to: user.email,
                        orderId: order._id.toString(),
                        orderNumber: order.orderNumber,
                        telegramId: user.telegramId,
                    });
                }, 500);
            }

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

    async updateOrderStatus(orderId: string, newStatus: OrderStatus, cancellationReason?: string, deliveryDate?: string) {
        const order = await Order.findById(orderId);
        if (!order) throw APIError.NotFound({message: "Заказ не найден"});

        if (newStatus === OrderStatus.CANCELLED && order.paymentId) {
            await this.paymentService.refundPayment(order.paymentId);
            order.cancelledAt = new Date();
            if (cancellationReason) {
                order.canceledCaused = cancellationReason;
            }
        }

        if (newStatus === OrderStatus.DELIVERED && order.paymentId && !order.paymentStatus) {
            order.paymentStatus = true;
            order.deliveredAt = new Date();
        }

        if (newStatus === OrderStatus.CONFIRMED && deliveryDate) {
            // Можно сохранить дату доставки, если нужно
        }

        // Генерируем счет на оплату для юридических лиц при подтверждении заказа
        if (newStatus === OrderStatus.CONFIRMED) {
            const user = await User.findById(order.owner);
            if (user && user.legalType && user.bankAccount?.accountNumber) {
                try {
                    const invoiceUrl = await this.invoiceService.generateInvoice(order, user);
                    order.documentUrl = invoiceUrl;
                    order.invoiceUrl = invoiceUrl;
                } catch (error) {
                    console.error("Ошибка генерации счета:", error);
                    // Не прерываем процесс, просто логируем ошибку
                }
            }
        }

        order.status = newStatus;
        await order.save();

        const user = await User.findById(order.owner);
        if (user) {
            await this.senderService.sendOrderStatusUpdateEmail({
                to: user.email,
                orderNumber: order.orderNumber,
                status: newStatus,
                orderId: order._id.toString(),
                cancellationReason: cancellationReason,
                deliveryDate: deliveryDate,
                invoiceUrl: order.invoiceUrl,
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

    async getOrderByNumber(orderNumber: string | number) {
        // Преобразуем number в string, если нужно
        const orderNumberStr = typeof orderNumber === 'number' ? orderNumber.toString() : orderNumber;
        
        const order = await Order.findOne({orderNumber: orderNumberStr})
            .populate("owner")
            .populate({
                path: "items.product",
                populate: {
                    path: "category"
                }
            })
            .lean();
        
        if (!order) {
            throw APIError.NotFound({message: "Заказ не найден"});
        }
        
        return order;
    }

    /**
     * Обработка успешной оплаты заказа
     */
    async handlePaymentSuccess(paymentId: string) {
        const order = await Order.findOne({paymentId});
        if (!order) {
            console.error(`Заказ с paymentId ${paymentId} не найден`);
            return;
        }

        // Обновляем статус только если заказ еще ожидает оплаты
        if (order.status === OrderStatus.WAITING_FOR_PAYMENT) {
            order.status = OrderStatus.PENDING;
            order.paymentStatus = true;
            await order.save();

            // Уведомляем пользователя через socket
            this.socketService.notifyOrderUpdate(order._id.toString(), {
                ownerId: order.owner.toString(),
                status: OrderStatus.PENDING,
            });

            // Отправляем email уведомление
            const user = await User.findById(order.owner);
            if (user) {
                await this.senderService.sendOrderStatusUpdateEmail({
                    to: user.email,
                    orderNumber: order.orderNumber,
                    status: OrderStatus.PENDING,
                    orderId: order._id.toString(),
                });
            }
        }
    }
}