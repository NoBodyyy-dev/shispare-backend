import {Server, Socket} from "socket.io";
import {socketAuthMiddleware} from "../middleware/auth.middleware";
import {OrderService} from "../services/order.service";
import {DeliveryType, Order, OrderStatus} from "../models/Order.model";
import {User} from "../models/User.model";
import config from "../config/config";
import express from "express";
import http from "node:http";

export const setupOrderSockets = (io: Server) => {
    const onlineUsers = new Map<string, string>(); // ID -> socketId

    io.on("connection", async (socket) => {
        if (!socket.user) {
            console.error('No user data in socket');
            socket.disconnect();
            return;
        }

        const uId = socket.user._id.toString();
        console.log(`Socket connected - ${socket.user.fullName} (${uId})`);
        onlineUsers.set(uId, socket.id);
        await User.findOneAndUpdate({_id: uId}, {$set: {online: true}});

        const handleAdminJoin = async () => {
            try {
                if (socket.user?.role === 'Admin') {
                    await socket.join('admin');
                    console.log(`Admin (re)joined: ${socket.id}`);

                    const adminRoom = io.sockets.adapter.rooms.get('admin');
                    const onlineAdmins = adminRoom ? Array.from(adminRoom) : [];

                    socket.emit('admin:online', {
                        onlineAdmins: Array.from(onlineUsers.keys()),
                        yourId: uId
                    });
                }
            } catch (error) {
                console.error('Admin join error:', error);
            }
        };

        await handleAdminJoin();

        socket.on('admin:reconnect', handleAdminJoin);

        socket.on('join:user', (callback) => {
            try {
                socket.join(`user_${uId}`);
                callback({success: true});
            } catch (error) {
                callback({success: false, error: (error as Error).message});
            }
        });

        socket.on("order:get", async (callback) => {
            try {
                const orders = await Order.find();
                callback({orders, success: true});
            } catch (e) {
                callback({success: false, message: (e as Error).message})
            }
        });

        socket.on("disconnect", async () => {
            onlineUsers.delete(uId);
            await User.findOneAndUpdate({_id: uId}, {$set: {online: false}});
            io.emit("onlineUsers", Array.from(onlineUsers.keys()));
            console.log(`Disconnected: ${uId}`);
        });
    });
};