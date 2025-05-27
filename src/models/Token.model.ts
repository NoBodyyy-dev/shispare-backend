import mongoose from "mongoose";

interface IToken {
    user: mongoose.Types.ObjectId;
    refreshToken: string;
    expires: Date;
}

const tokenSchema = new mongoose.Schema<IToken>({
    user: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    refreshToken: {type: String, required: true, unique: true},
    expires: {type: Date, required: true, default: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)},
})

tokenSchema.index({expires: 1}, {expireAfterSeconds: 0});

export const Token = mongoose.model<IToken>("Token", tokenSchema);