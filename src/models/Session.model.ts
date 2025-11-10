import mongoose from "mongoose";

export interface ISession {
    token: string;
    user: mongoose.Types.ObjectId;
    code: string;
    expires: Date;
    attempts?: number;
    lastSentAt?: Date;
    resendCount?: number;
    deviceId?: string;
    ip?: string;
    userAgent?: string;
}

const sessionSchema = new mongoose.Schema<ISession>({
    token: {type: String, required: true},
    user: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true},
    code: {type: String, required: true},
    expires: {type: Date, required: true},
    attempts: {type: Number, required: false, default: 0},
    lastSentAt: {type: Date, required: false},
    resendCount: {type: Number, required: false, default: 0},
    deviceId: {type: String, required: false},
    ip: {type: String, required: false},
    userAgent: {type: String, required: false},
})

sessionSchema.index({expires: 1}, {expireAfterSeconds: 0});

export const Session: mongoose.Model<ISession> = mongoose.model<ISession>("Session", sessionSchema);