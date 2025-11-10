// services/AdminChatService.ts
import {Message, IMessage} from '../models/Message.model';
import {SocketService} from './socket.service';
import {Types} from 'mongoose';

export class ChatService {
    constructor(private socketService: SocketService) {
    }

    async getMessages() {
        return Message.find()
            .populate("senderId")
            .populate({
                path: "replyTo",
                populate: {path: "senderId"}
            })
            .lean();
    }

    async sendMessage(senderId: string, content?: string, attachments?: any[], replyTo?: string) {
        const message = new Message({
            senderId: new Types.ObjectId(senderId),
            content,
            attachments,
            replyTo: replyTo ? new Types.ObjectId(replyTo) : undefined
        });
        await message.save();

        const populatedMessage = await Message.findById(message._id)
            .populate('senderId')
            .populate('replyTo')
            .populate('replyTo.senderId')
            .lean();

        this.socketService.sendToAdmins('chat:newMessage', populatedMessage);

        return populatedMessage;
    }

    async editMessage(messageId: string, editorId: string, newContent?: string, newAttachments?: any[]) {
        const message = await Message.findById(messageId);
        if (!message) throw new Error('Message not found');
        if (message.senderId.toString() !== editorId) throw new Error('Permission denied');

        message.content = newContent ?? message.content;
        message.attachments = newAttachments ?? message.attachments;
        message.edited = true;
        message.updatedAt = new Date();

        await message.save();
        
        const populatedMessage = await Message.findById(message._id)
            .populate('senderId')
            .populate('replyTo')
            .populate('replyTo.senderId')
            .lean();
            
        // Отправляем обновленное сообщение всем пользователям чата
        this.socketService.sendToRoom('notifications', 'chat:editMessage', populatedMessage);
        return populatedMessage;
    }

    async deleteMessage(messageId: string, deleterId: string) {
        const message = await Message.findById(messageId);
        if (!message) throw new Error('Message not found');
        if (message.senderId.toString() !== deleterId) throw new Error('Permission denied');

        await message.deleteOne();
        this.socketService.sendToAdmins('chat:deleteMessage', {messageId});
        return true;
    }

    async markAsRead(messageIds: string[], userId: string) {
        await Message.updateMany(
            {_id: {$in: messageIds}, "readBy.user": {$ne: userId}},
            {$push: {readBy: {user: userId, readAt: new Date()}}}
        );
    }
}