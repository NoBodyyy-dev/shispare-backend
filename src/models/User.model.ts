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
    online: boolean;
    // Согласия пользователя
    cookieConsent?: boolean; // Согласие на использование cookie
    cookieConsentDate?: Date; // Дата согласия на cookie
    personalDataConsent?: boolean; // Согласие на обработку персональных данных
    personalDataConsentDate?: Date; // Дата согласия на обработку персональных данных
    userAgreementConsent?: boolean; // Согласие с пользовательским соглашением
    userAgreementConsentDate?: Date; // Дата согласия с пользовательским соглашением
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
    banned: { type: Boolean, required: true, default: false },
    online: { type: Boolean, required: true, default: false },
    cookieConsent: { type: Boolean, default: false },
    cookieConsentDate: { type: Date },
    personalDataConsent: { type: Boolean, default: false },
    personalDataConsentDate: { type: Date },
    userAgreementConsent: { type: Boolean, default: false },
    userAgreementConsentDate: { type: Date },
});

export const User: mongoose.Model<IUser> = mongoose.model<IUser>("User", userSchema);