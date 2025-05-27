import { Server } from "socket.io";
import {Order, OrderStatus, DeliveryType, IOrder} from "../models/Order.model";
import { Cart } from "../models/Cart.model";
import { User } from "../models/User.model";
import PDFDocument from "pdfkit";
import { YandexCloudService, CloudFileType } from "./cloud.service";

export class OrderService {
    private cloudService: YandexCloudService;
    private io?: Server;

    constructor(io?: Server) {
        this.cloudService = new YandexCloudService();
        this.io = io;
    }

    /**
     * Создает новый заказ из корзины пользователя
     */
    async createOrderFromCart(
        userId: string,
        deliveryType: DeliveryType,
        discount: number = 0,
        socketId?: string
    ): Promise<IOrder> {
        try {
            this.sendProgress(socketId, "Начинаем обработку заказа", 10);

            const [cart, user] = await Promise.all([
                Cart.findOne({ owner: userId }).populate("items.product"),
                User.findById(userId),
            ]);

            if (!cart || cart.items.length === 0) throw new Error("Корзина пуста");
            if (!user) throw new Error("Пользователь не найден");

            this.sendProgress(socketId, "Расчет стоимости", 30);
            const { totalPrice, finalPrice } = this.calculateOrderPrices(
                cart.items,
                discount
            );

            this.sendProgress(socketId, "Генерация документа", 50);
            const pdfBuffer = await this.generateOrderPdf({
                user,
                items: cart.items,
                totalPrice,
                discount,
                finalPrice,
                deliveryType,
            });

            this.sendProgress(socketId, "Сохранение документа", 70);
            const pdfUrl = await this.cloudService.uploadBuffer(
                pdfBuffer,
                "orders",
                CloudFileType.PDF
            );

            this.sendProgress(socketId, "Создание заказа", 90);
            const order = await this.saveOrder(
                userId,
                cart.items,
                {
                    totalPrice,
                    discount,
                    finalPrice,
                    deliveryType,
                    pdfUrl,
                },
                socketId
            );

            this.sendProgress(socketId, "Заказ создан", 100);
            return order.toObject();
        } catch (error) {
            this.sendError(socketId, (error as {message: string}).message);
            throw error;
        }
    }

    /**
     * Получает заказы пользователя
     */
    async getUserOrders(userId: string) {
        return Order.find({ owner: userId })
            .populate({
                path: "items.product",
                model: "Product",
            })
            .populate("owner")
            .sort({ createdAt: -1 });
    }

    /**
     * Получает заказ по ID
     */
    async getOrderById(orderId: string) {
        return Order.findById(orderId)
            .populate({
                path: "items.product",
                model: "Product",
            })
            .populate("owner");
    }

    /**
     * Обновляет статус заказа
     */
    async updateOrderStatus(
        orderId: string,
        status: OrderStatus,
        notifyUser: boolean = true
    ) {
        const order = await Order.findByIdAndUpdate(
            orderId,
            { $set: { status } },
            { new: true }
        )
            .populate("owner")
            .populate({
                path: "items.product",
                model: "Product",
            });

        if (!order) throw new Error("Заказ не найден");

        if (notifyUser) {
            this.notifyUserAboutStatusChange(order.owner._id.toString(), order);
        }

        return order;
    }

    /**
     * Устанавливает дату доставки
     */
    async setDeliveryDate(orderId: string, date: Date) {
        return Order.findByIdAndUpdate(
            orderId,
            { $set: { deliveryDate: date } },
            { new: true }
        );
    }

    /**
     * Получает все заказы (для администратора)
     */
    async getAllOrders(filter: any = {}) {
        return Order.find(filter)
            .populate({
                path: "items.product",
                model: "Product",
            })
            .populate("owner")
            .sort({ createdAt: -1 });
    }

    /**
     * Получает временную ссылку на PDF заказа
     */
    async getOrderPdfUrl(orderId: string, expiresIn: number = 3600) {
        const order = await Order.findById(orderId);
        if (!order) throw new Error("Заказ не найден");

        return this.cloudService.getSignedUrl(
            this.extractFileKeyFromUrl(order.documentUrl),
            expiresIn
        );
    }

    async updateOrderDeliveryAndPayment(
        orderId: string,
        data: {
            deliveryInfo: any;
            paymentMethod: string;
        }
    ) {
        return Order.findByIdAndUpdate(
            orderId,
            {
                $set: {
                    deliveryInfo: data.deliveryInfo,
                    paymentMethod: data.paymentMethod
                }
            },
            { new: true }
        )
            .populate('items.product')
            .populate('user');
    }

    // ============ Вспомогательные методы ============

    private async saveOrder(
        userId: string,
        items: any[],
        orderData: {
            totalPrice: number;
            discount: number;
            finalPrice: number;
            deliveryType: DeliveryType;
            pdfUrl: string;
        },
        socketId?: string
    ) {
        const order = new Order({
            owner: userId,
            items: items.map((item) => ({
                product: item.product._id,
                optionIndex: item.optionIndex,
                quantity: item.quantity,
            })),
            totalPrice: orderData.totalPrice,
            discount: orderData.discount,
            finalPrice: orderData.finalPrice,
            documentUrl: orderData.pdfUrl,
            deliveryType: orderData.deliveryType,
            status: OrderStatus.PENDING,
        });

        await order.save();
        await Cart.updateOne({ owner: userId }, { $set: { items: [] } });

        // Уведомляем администраторов о новом заказе
        await this.notifyAdminsAboutNewOrder(order);

        return order;
    }

    private calculateOrderPrices(items: any[], discount: number) {
        const totalPrice = items.reduce((sum, item) => {
            const product = item.product as any;
            const option = product.options[item.optionIndex];
            return sum + option.price * item.quantity;
        }, 0);

        const finalPrice = totalPrice * (1 - discount / 100);

        return { totalPrice, finalPrice };
    }

    private async generateOrderPdf(orderData: {
        user: any;
        items: any[];
        totalPrice: number;
        discount: number;
        finalPrice: number;
        deliveryType: DeliveryType;
    }) {
        return new Promise<Buffer>((resolve) => {
            const doc = new PDFDocument();
            const chunks: Uint8Array[] = [];

            doc.on("data", (chunk) => chunks.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(chunks)));

            // Заголовок
            doc.fontSize(20).text(`Заказ №${Date.now()}`, { align: "center" });
            doc.moveDown();

            // Информация о клиенте
            doc
                .fontSize(14)
                .text(`Клиент: ${orderData.user.name || orderData.user.email}`)
                .text(`Дата: ${new Date().toLocaleDateString("ru-RU")}`);

            doc.moveDown();
            doc.fontSize(16).text("Состав заказа:", { underline: true });
            doc.moveDown();

            // Список товаров
            orderData.items.forEach((item, index) => {
                const product = item.product;
                const option = product.options[item.optionIndex];
                doc
                    .fontSize(12)
                    .text(
                        `${index + 1}. ${product.title} (${option.color}) - ${
                            item.quantity
                        } × ${option.price} ₽ = ${item.quantity * option.price} ₽`
                    );
            });

            // Итоговая информация
            doc.moveDown();
            doc
                .fontSize(14)
                .text(`Итого: ${orderData.totalPrice.toLocaleString("ru-RU")} ₽`)
                .text(`Скидка: ${orderData.discount}%`)
                .text(
                    `К оплате: ${orderData.finalPrice.toLocaleString("ru-RU")} ₽`
                )
                .text(`Тип доставки: ${orderData.deliveryType}`)
                .text(`Статус: ${OrderStatus.PENDING}`);

            doc.end();
        });
    }

    private extractFileKeyFromUrl(url: string): string {
        const baseUrl = `https://${process.env.YC_BUCKET_NAME}.storage.yandexcloud.net/`;
        if (url.startsWith(baseUrl)) {
            return url.substring(baseUrl.length);
        }
        throw new Error("Invalid Yandex Cloud Storage URL format");
    }

    // ============ Socket методы ============

    private sendProgress(
        socketId: string | undefined,
        message: string,
        percent: number
    ) {
        if (!socketId) return;
        this.io!.to(socketId).emit("order:progress", { message, percent });
    }

    private sendError(socketId: string | undefined, error: string) {
        if (!socketId) return;
        this.io!.to(socketId).emit("order:error", { error });
    }

    private async notifyAdminsAboutNewOrder(order: any) {
        const adminSockets = await this.io!.in("admin").fetchSockets();
        if (adminSockets.length === 0) return;

        const populatedOrder = await Order.findById(order._id)
            .populate("items.product")
            .populate("owner");

        this.io!.to("admin").emit("order:new", populatedOrder);
    }

    private notifyUserAboutStatusChange(userId: string, order: any) {
        this.io!
            .to(`user_${userId}`)
            .emit("order:status-updated", { orderId: order._id, status: order.status });
    }
}