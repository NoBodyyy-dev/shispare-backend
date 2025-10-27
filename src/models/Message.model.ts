// models/AdminChat.model.ts
import {Schema, model, Types, Document} from 'mongoose';

export interface IMessage extends Document {
    senderId: Types.ObjectId;
    content?: string;
    attachments?: {
        type: 'image' | 'video' | 'file';
        url: string;
        filename: string;
    }[];
    replyTo?: Types.ObjectId;
    edited?: boolean;
    createdAt: Date;
    updatedAt?: Date;
    readBy: {
        user: Types.ObjectId;
        readAt: Date;
    }[];
}

const messageSchema = new Schema<IMessage>({
    senderId: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    content: {type: String, trim: true},
    attachments: [{
        type: {type: String, enum: ['image', 'video', 'file'], required: true},
        url: {type: String, required: true},
        filename: {type: String, required: true},
    }],
    replyTo: {type: Schema.Types.ObjectId, ref: 'Message'},
    edited: {type: Boolean, default: false},
    readBy: [{
        user: {type: Schema.Types.ObjectId, ref: 'User'},
        readAt: {type: Date, default: Date.now}
    }]
}, {timestamps: true});

export const Message = model<IMessage>('Message', messageSchema);