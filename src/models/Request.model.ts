import mongoose, { Document, Schema, Types } from "mongoose";

export interface IRequest extends Document {
    _id: Types.ObjectId;
    fullName: string;
    email: string;
    question: string;
    answered: boolean;
    answer?: string;
    answeredAt?: Date;
    answeredBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const requestSchema = new Schema<IRequest>(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        question: {
            type: String,
            required: true,
            trim: true,
        },
        answered: {
            type: Boolean,
            default: false,
        },
        answer: {
            type: String,
            trim: true,
        },
        answeredAt: {
            type: Date,
        },
        answeredBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Индексы для оптимизации запросов
requestSchema.index({ answered: 1 });
requestSchema.index({ createdAt: -1 });
requestSchema.index({ email: 1 });

export const Request: mongoose.Model<IRequest> = mongoose.model<IRequest>("Request", requestSchema);


