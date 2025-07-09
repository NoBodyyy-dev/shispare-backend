import {Server, Socket} from "socket.io";
import {socketAuthMiddleware} from "../middleware/auth.middleware";
import {OrderService} from "../services/order.service";
import {DeliveryType, OrderStatus} from "../models/Order.model";
import {User} from "../models/User.model";
import config from "../config/config";
import express from "express";
import http from "node:http";

export const setupOrderSockets = (io: Socket) => {
    const onlineUsers = new Set();
    io.on("connection", async (socket) => {
        console.log(">>>", socket.user);
        onlineUsers.add(socket.user?._id);
        await User.findOneAndUpdate({_id: socket.user?._id}, {$set: {online: true}})
        io.emit("onlineUsers", Array.from(onlineUsers));

        socket.on("disconnect", () => {
            onlineUsers.delete(socket.user?._id);
            io.emit("onlineUsers", Array.from(onlineUsers));
        });


        socket.on('join:admin', async (callback: (res: { success: boolean; error?: string }) => void) => {
            try {
                const user = await User.findById(socket.data.user._id);
                if (!user || user.role !== 'Admin') return callback({success: false, error: 'Доступ запрещен'});

                await socket.join('admin');
                console.log(`Admin joined: ${socket.id}`);
                callback({success: true});
            } catch (error) {
                callback({success: false, error: (error as { message: string }).message});
            }
        });

        socket.on('join:user', (callback: (res: { success: boolean; error?: string }) => void) => {
            try {
                socket.join(`user_${socket.data.user._id}`);
                console.log(`User room joined: ${socket.id}`);
                callback({success: true});
            } catch (error) {
                callback({success: false, error: (error as { message: string }).message});
            }
        });
    });
}


// export function setupOrderSockets(io: Server) {
//     const orderNamespace = io.of('/orders');
//     const orderService = new OrderService(io);
//
//     orderNamespace.use(socketAuthMiddleware);
//     const online = new Set();
//     orderNamespace.on('connection', (socket) => {
//         console.log(`Client connected: ${socket.id} (User ID: ${socket.data.user._id})`);
//
//         socket.emit("onlineUsers", Array.from(online));
//
//         socket.on('join:admin', async (callback: (res: { success: boolean; error?: string }) => void) => {
//             try {
//                 const user = await User.findById(socket.data.user._id);
//                 if (!user || user.role !== 'Admin') return callback({success: false, error: 'Доступ запрещен'});
//
//                 await socket.join('admin');
//                 console.log(`Admin joined: ${socket.id}`);
//                 callback({success: true});
//             } catch (error) {
//                 callback({success: false, error: (error as { message: string }).message});
//             }
//         });
//
//         socket.on('join:user', (callback: (res: { success: boolean; error?: string }) => void) => {
//             try {
//                 socket.join(`user_${socket.data.user._id}`);
//                 console.log(`User room joined: ${socket.id}`);
//                 callback({success: true});
//             } catch (error) {
//                 callback({success: false, error: (error as { message: string }).message});
//             }
//         });
//
//         socket.on('order:create', async (
//             data: {
//                 deliveryType: string;
//                 deliveryInfo: string;
//                 paymentMethod: string;
//                 discount?: number;
//             },
//             callback: (res: { success: boolean; order?: any; error?: string }) => void
//         ) => {
//             try {
//                 const userId: string = socket.data.user._id;
//
//                 const order = await orderService.createOrderFromCart(
//                     userId,
//                     data.deliveryType as DeliveryType,
//                     data.discount || 0,
//                     socket.id
//                 );
//
//                 const updatedOrder = await orderService.updateOrderDeliveryAndPayment(
//                     order._id as string,
//                     {
//                         deliveryInfo: data.deliveryInfo,
//                         paymentMethod: data.paymentMethod
//                     }
//                 );
//
//                 callback({success: true, order: updatedOrder});
//             } catch (error) {
//                 console.error('Order creation error:', error);
//                 callback({success: false, error: (error as { message: string }).message});
//             }
//         });
//
//         socket.on('order:update-status', async (
//             data: {
//                 orderId: string;
//                 newStatus: OrderStatus;
//                 trackingNumber?: string;
//                 deliveryDate?: Date;
//             },
//             callback: (res: { success: boolean; order?: any; error?: string }) => void
//         ) => {
//             try {
//                 if (!Object.values(OrderStatus).includes(data.newStatus)) return callback({
//                     success: false,
//                     error: "Указан неверный статус"
//                 })
//                 const user = socket.user;
//                 if (!user || user.role !== 'Admin') return callback({success: false, error: 'Доступ запрещен'});
//
//                 const updateData: any = {status: data.newStatus};
//                 if (data.trackingNumber) updateData.trackingNumber = data.trackingNumber;
//
//                 const order = await orderService.updateOrderStatus(
//                     data.orderId,
//                     data.newStatus,
//                     true
//                 );
//
//                 if (data.deliveryDate && data.newStatus === "confirmed") await orderService.setDeliveryDate(data.orderId, data.deliveryDate);
//                 else callback({success: false, error: "Укажите дату доставки"})
//
//                 callback({success: true, order});
//             } catch (error) {
//                 console.error('Status update error:', error);
//                 callback({success: false, error: (error as { message: string }).message});
//             }
//         });
//
//         socket.on('order:track-progress', (orderId: string) => {
//             console.log(`Tracking order progress for: ${orderId}`);
//         });
//
//         socket.on('disconnect', () => {
//             console.log(`Client disconnected: ${socket.id}`);
//         });
//
//         socket.on('error', (error) => {
//             console.error(`Socket error (${socket.id}):`, error);
//         });
//     });
//
//     function notifyUserOrderStatus(userId: string, orderId: string, status: OrderStatus) {
//         orderNamespace.to(`user_${userId}`).emit('order:status-changed', {
//             orderId,
//             status,
//             updatedAt: new Date()
//         });
//     }
//
//     function notifyAdminsNewOrder(order: any) {
//         orderNamespace.to('admin').emit('order:new', order);
//     }
// }