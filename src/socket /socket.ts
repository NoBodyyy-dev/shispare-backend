import {Server} from "socket.io";
import {OrderService} from "../services/order.service";
import {socketAuthMiddleware} from "../middleware/auth.middleware";
import {DeliveryType, OrderStatus} from "../models/Order.model";
import {User} from "../models/User.model";

export function setupOrderSockets(io: Server) {
    const orderNamespace = io.of('/orders');
    const orderService = new OrderService(io);
    // Middleware для аутентификации
    orderNamespace.use(socketAuthMiddleware);

    orderNamespace.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id} (User ID: ${socket.data.user._id})`);

        // Присоединение к комнате администратора
        socket.on('join:admin', async (callback: (res: { success: boolean; error?: string }) => void) => {
            try {
                const user = await User.findById(socket.data.user._id);
                if (!user || user.role !== 'Admin') {
                    return callback({success: false, error: 'Доступ запрещен'});
                }

                await socket.join('admin');
                console.log(`Admin joined: ${socket.id}`);
                callback({success: true});
            } catch (error) {
                callback({success: false, error: (error as { message: string }).message});
            }
        });

        // Присоединение к пользовательской комнате
        socket.on('join:user', (callback: (res: { success: boolean; error?: string }) => void) => {
            try {
                socket.join(`user_${socket.data.user._id}`);
                console.log(`User room joined: ${socket.id}`);
                callback({success: true});
            } catch (error) {
                callback({success: false, error: (error as { message: string }).message});
            }
        });

        // Создание нового заказа
        socket.on('order:create', async (
            data: {
                deliveryType: string;
                deliveryInfo: any;
                paymentMethod: string;
                discount?: number;
            },
            callback: (res: { success: boolean; order?: any; error?: string }) => void
        ) => {
            try {
                const userId = socket.data.user._id;

                const order = await orderService.createOrderFromCart(
                    userId,
                    data.deliveryType as DeliveryType,
                    data.discount || 0,
                    socket.id // Передаем ID сокета для отправки прогресса
                );

                // Обновляем данные доставки и оплаты
                const updatedOrder = await orderService.updateOrderDeliveryAndPayment(
                    order._id as string,
                    {
                        deliveryInfo: data.deliveryInfo,
                        paymentMethod: data.paymentMethod
                    }
                );

                callback({success: true, order: updatedOrder});
            } catch (error) {
                console.error('Order creation error:', error);
                callback({success: false, error: (error as { message: string }).message});
            }
        });

        // Изменение статуса заказа (только для админов)
        socket.on('order:update-status', async (
            data: {
                orderId: string;
                newStatus: OrderStatus;
                trackingNumber?: string;
                deliveryDate?: Date;
            },
            callback: (res: { success: boolean; order?: any; error?: string }) => void
        ) => {
            try {
                if (!Object.values(OrderStatus).includes(data.newStatus)) callback({success: false, error: "Указан неверный статус"})
                const user = socket.user;
                if (!user || user.role !== 'Admin') {
                    return callback({success: false, error: 'Доступ запрещен'});
                }

                const updateData: any = {status: data.newStatus};
                if (data.trackingNumber) {
                    updateData.trackingNumber = data.trackingNumber;
                }

                const order = await orderService.updateOrderStatus(
                    data.orderId,
                    data.newStatus,
                    true // Уведомить пользователя
                );

                if (data.deliveryDate && data.newStatus === "confirmed") await orderService.setDeliveryDate(data.orderId, data.deliveryDate);
                else callback({success: false, error: "Укажите дату доставки"})

                callback({success: true, order});
            } catch (error) {
                console.error('Status update error:', error);
                callback({success: false, error: (error as { message: string }).message});
            }
        });

        // Отслеживание прогресса создания заказа
        socket.on('order:track-progress', (orderId: string) => {
            // Здесь можно реализовать дополнительную логику отслеживания
            console.log(`Tracking order progress for: ${orderId}`);
        });

        // Обработка отключения клиента
        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
            // При необходимости можно выполнить cleanup
        });

        // Обработка ошибок
        socket.on('error', (error) => {
            console.error(`Socket error (${socket.id}):`, error);
        });
    });

    // Функция для уведомления пользователей об изменении статуса
    function notifyUserOrderStatus(userId: string, orderId: string, status: OrderStatus) {
        orderNamespace.to(`user_${userId}`).emit('order:status-changed', {
            orderId,
            status,
            updatedAt: new Date()
        });
    }

    // Функция для уведомления админов о новом заказе
    function notifyAdminsNewOrder(order: any) {
        orderNamespace.to('admin').emit('order:new', order);
    }
}