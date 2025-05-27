import mongoose from "mongoose";

export interface IUser {
    _id: mongoose.Types.ObjectId;
    fullName: string;
    legalName?: string;
    email: string;
    password: string;
    role: "User" | "Admin" | "Creator";
    banned: boolean;
    legalType?: string;
    legalId?: number;
    telegramId?: number;
    personalKey: string;
}

const userSchema = new mongoose.Schema<IUser>({
    fullName: { type: String, required: true },
    legalName: { type: String, unique: true, sparse: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ["User", "Admin", "Creator"],
        required: true,
        default: "User"
    },
    legalType: { type: String, enum: ["ЮЛ", "ИП"] },
    legalId: { type: Number },
    telegramId: { type: Number, unique: true, sparse: true },
    personalKey: { type: String, required: true, unique: true },
    banned: { type: Boolean, required: true, default: false }
});

export const User: mongoose.Model<IUser> = mongoose.model<IUser>("User", userSchema);