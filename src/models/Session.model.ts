import mongoose from "mongoose";

export interface ISession {
    token: string;
    user: mongoose.Types.ObjectId;
    code: string;
    expires: Date;
}

const sessionSchema = new mongoose.Schema<ISession>({
    token: {type: String, required: true},
    user: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true},
    code: {type: String, required: true},
    expires: {type: Date, required: true},
})

sessionSchema.index({expires: 1}, {expireAfterSeconds: 0});

export const Session: mongoose.Model<ISession> = mongoose.model<ISession>("Session", sessionSchema);