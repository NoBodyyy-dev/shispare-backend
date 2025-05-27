import { Session } from '../models/Session.model';
import {APIError} from './error.service';
import {IUser} from "../models/User.model";

export class SessionService {
    generateCode(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async createSession(data: {
        userId: string;
        token: string;
        code: string;
    }) {
        const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000);
        await Session.findOneAndUpdate(
            { user: data.userId },
            {
                token: data.token,
                user: data.userId,
                code: data.code,
                expires: expiresAt
            },
            { upsert: true, new: true }
        );
    }

    async verifyCode(token: string, code: string) {
        const session = await Session.findOne({ token }).populate('user');
        if (!session) {
            throw APIError.Unauthorized();
        }

        if (Date.now() > session.expires.getTime()) {
            throw APIError.Forbidden({message: 'Время подтверждения кода вышло'});
        }

        if (code !== session.code) {
            throw APIError.BadRequest({message: 'Неверный код подтверждения'});
        }

        return {...session, user: session.user as unknown as IUser};
    }

    async deleteSession(id: string) {
        await Session.deleteOne({ _id: id });
    }
}