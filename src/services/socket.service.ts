import {Server, Socket} from 'socket.io';
import {User} from '../models/User.model';
import {socketAuthMiddleware} from "../middleware/auth.middleware";
import {orderService} from "../app";
import {OrderStatus} from "../models/Order.model";
import {ChatService} from "./chat.service";

export class SocketService {
    private io: Server;
    private onlineUsers = new Map<string, string>();
    private readonly MAX_ROOMS_PER_USER = 10;
    private chatService: ChatService; // ✅ сервис чата

    constructor(io: Server) {
        this.io = io;
        this.chatService = new ChatService(this);
        this.applyMiddleware();
        this.initializeConnectionHandling();
    }

    private applyMiddleware() {
        this.io.use(socketAuthMiddleware);
    }

    private initializeConnectionHandling() {
        this.io.on("connection", (socket) => {
            console.log(`Socket connected: ${socket.id}`);

            socket.on("admin:getOrders", async (callback) => {
                try {
                    const orders = await orderService.getAllOrders();
                    console.log(orders);
                    callback({success: true, orders});
                } catch (err) {
                    callback({success: false, message: "Ошибка получения заказов"});
                }
            });

            socket.on("admin:updateOrderStatus", async ({orderId, status}: {
                orderId: string,
                status: OrderStatus
            }, callback) => {
                try {
                    const order = await orderService.updateOrderStatus(orderId, status);
                    this.sendToAdmins("admin:orderUpdated", order);
                    callback({success: true, order});
                } catch (err: any) {
                    callback({success: false, message: err.message});
                }
            });

            socket.on("chat:get", async (callback) => {
                try {
                    const messages = await this.chatService.getMessages();
                    callback({success: true, messages});
                } catch (e: any) {
                    callback({success: false, message: e.message});
                }
            })

            socket.on("chat:sendMessage", async ({content, attachments, replyTo}: {
                content: string,
                attachments?: string[],
                replyTo?: string
            }, callback) => {
                try {
                    const msg = await this.chatService.sendMessage(socket.user!._id.toString(), content, attachments, replyTo);
                    this.io.emit("chat:newMessage", msg);
                    callback({success: true, message: msg});
                } catch (err: any) {
                    callback({success: false, message: err.message});
                }
            });

            // Редактировать сообщение
            socket.on("chat:editMessage", async ({messageId, editorId, newContent, newAttachments}, callback) => {
                try {
                    const updated = await this.chatService.editMessage(messageId, editorId, newContent, newAttachments);
                    callback({success: true, message: updated});
                } catch (err: any) {
                    callback({success: false, message: err.message});
                }
            });

            socket.on("chat:deleteMessage", async ({messageId, deleterId}, callback) => {
                try {
                    await this.chatService.deleteMessage(messageId, deleterId);
                    callback({success: true});
                } catch (err: any) {
                    callback({success: false, message: err.message});
                }
            });
        });
    }


    private async handleUserConnection(socket: Socket, userId: string) {
        this.onlineUsers.set(userId, socket.id);
        await User.updateOne({_id: userId}, {$set: {online: true, lastActive: new Date()}}).exec();
    }

    private setupUserRooms(socket: Socket, userId: string) {
        const baseRooms = [
            `user-${userId}`,
            'notifications'
        ];

        const roleRooms = [];
        if (socket.user?.role === 'Admin') {
            roleRooms.push('admin-room', 'order-updates', 'system-alerts');
        }

        socket.join([...baseRooms, ...roleRooms]);
        console.log(`User ${userId} joined rooms: ${[...baseRooms, ...roleRooms].join(', ')}`);
    }

    private setupEventHandlers(socket: Socket, userId: string) {
        socket.on('subscribe', (room: string, callback) => {
            if (socket.rooms.size >= this.MAX_ROOMS_PER_USER) {
                return callback?.({
                    success: false,
                    error: 'Maximum rooms limit reached'
                });
            }

            const allowedRooms = this.validateRoomAccess(room, socket.user?.role);
            if (!allowedRooms) {
                return callback?.({
                    success: false,
                    error: 'Access denied for this room'
                });
            }

            socket.join(room);
            console.log(`User ${userId} subscribed to ${room}`);
            callback?.({success: true});
        });

        socket.on('unsubscribe', (room: string) => {
            if (!room.startsWith('user-')) {
                socket.leave(room);
                console.log(`User ${userId} left ${room}`);
            }
        });

        socket.on('refresh-rooms', () => {
            this.setupUserRooms(socket, userId);
        });

        socket.on('ping', (cb) => cb('pong'));
    }

    private validateRoomAccess(room: string, role?: string): boolean {
        if (room.startsWith('user-') && !room.endsWith(role || '')) return false;

        const adminRooms = ['admin-room', 'system-alerts'];
        const supportRooms = ['support-room', 'ticket-updates'];

        if (adminRooms.includes(room) && role !== 'admin') return false;
        return !(supportRooms.includes(room) && role !== 'support');
    }

    private trackConnectionStatus(socket: Socket, userId: string) {
        socket.on('disconnect', async (reason) => {
            console.log(`User ${userId} disconnected: ${reason}`);
            this.onlineUsers.delete(userId);

            await User.updateOne(
                {_id: userId},
                {
                    $set: {online: false},
                    $push: {
                        connectionHistory: {
                            disconnectedAt: new Date(),
                            reason
                        }
                    }
                }
            ).exec();
        });
    }

    public sendToUser(userId: string, event: string, data: any): boolean {
        const socketId = this.onlineUsers.get(userId);
        if (!socketId) return false;

        this.io.to(socketId).emit(event, data);
        return true;
    }

    public sendToRoom(room: string, event: string, data: any): void {
        this.io.to(room).emit(event, data);
    }

    public sendToAdmins(event: string, data: any): void {
        this.sendToRoom('admin-room', event, data);
    }

    public sendToSupport(event: string, data: any): void {
        this.sendToRoom('support-room', event, data);
    }

    public notifyOrderUpdate(orderId: string, update: any): void {
        this.sendToUser(
            update.ownerId,
            'order-updated',
            {orderId, ...update}
        );

        this.sendToAdmins(
            'order-update',
            {orderId, ...update}
        );

        this.sendToRoom(
            `order-${orderId}`,
            'order-details-updated',
            {orderId, ...update}
        );
    }

    public getOnlineUsers(): string[] {
        return Array.from(this.onlineUsers.keys());
    }

    public disconnectUser(userId: string): boolean {
        const socketId = this.onlineUsers.get(userId);
        if (!socketId) return false;

        this.io.sockets.sockets.get(socketId)?.disconnect(true);
        return true;
    }
}