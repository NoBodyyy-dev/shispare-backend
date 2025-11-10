import {Session} from '../models/Session.model';
import {APIError} from './error.service';
import {IUser} from "../models/User.model";
import crypto from 'crypto';

export class SessionService {
    // Generate a cryptographically secure 6-digit code
    generateCode(): string {
        // crypto.randomInt is inclusive of min, exclusive of max
        const n = crypto.randomInt(100000, 1000000);
        return n.toString();
    }

    async createSession(data: {
        userId: string;
        token: string;
        code: string;
    }, meta?: { deviceId?: string; ip?: string; userAgent?: string }) {
        const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000);
        await Session.findOneAndUpdate(
            {user: data.userId},
            {
                token: data.token,
                user: data.userId,
                code: data.code,
                expires: expiresAt,
                attempts: 0,
                lastSentAt: new Date(),
                resendCount: 0,
                deviceId: meta?.deviceId,
                ip: meta?.ip,
                userAgent: meta?.userAgent
            },
            {upsert: true, new: true}
        );
    }

    async getSessionByToken(token: string) {
        return Session.findOne({token}).populate('user');
    }

    async resendCode(token: string) {
        const session = await Session.findOne({token}).populate('user');
        if (!session) throw APIError.Unauthorized();
        if (Date.now() > session.expires.getTime()) throw APIError.Forbidden({message: 'Время подтверждения кода вышло'});

        const COOLDOWN_MS = 60 * 1000; // 60 seconds between resends
        if (session.lastSentAt && (Date.now() - session.lastSentAt.getTime()) < COOLDOWN_MS) {
            const wait = Math.ceil((COOLDOWN_MS - (Date.now() - session.lastSentAt.getTime())) / 1000);
            throw APIError.Forbidden({message: `Повторная отправка возможна через ${wait} секунд`});
        }

        const newCode = this.generateCode();
        session.code = newCode;
        session.attempts = 0;
        session.resendCount = (session.resendCount || 0) + 1;
        session.lastSentAt = new Date();
        session.expires = new Date(Date.now() + 3 * 60 * 60 * 1000);
        await session.save();
        return {session, code: newCode};
    }

    async verifyCode(token: string, code: string) {
        const session = await Session.findOne({token}).populate('user');
        if (!session) throw APIError.Unauthorized();
        if (Date.now() > session.expires.getTime()) throw APIError.Forbidden({message: 'Время подтверждения кода вышло'});

        // increment attempts on each verification try
        session.attempts = (session.attempts || 0) + 1;
        await session.save();

        const MAX_ATTEMPTS = 5;
        if (session.attempts > MAX_ATTEMPTS) {
            await Session.deleteOne({_id: session._id});
            throw APIError.Forbidden({message: 'Слишком много неудачных попыток проверки'});
        }

        if (code !== session.code) throw APIError.BadRequest({message: 'Неверный код подтверждения'});

        return {...session, user: session.user as unknown as IUser};
    }

    async deleteSession(id: string) {
        await Session.deleteOne({_id: id});
    }
}