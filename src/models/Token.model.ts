import mongoose from "mongoose";

interface IToken {
    user: mongoose.Types.ObjectId;
    refreshToken: string;
    expires: Date;
    deviceId?: string;
    ip?: string;
    userAgent?: string;
}

const tokenSchema = new mongoose.Schema<IToken>({
    user: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    // store hashed refresh token to protect tokens if DB is leaked
    refreshToken: {type: String, required: true},
    expires: {type: Date, required: true, default: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)},
    deviceId: {type: String, required: false},
    ip: {type: String, required: false},
    userAgent: {type: String, required: false},
})

tokenSchema.index({expires: 1}, {expireAfterSeconds: 0});

export const Token = mongoose.model<IToken>("Token", tokenSchema);