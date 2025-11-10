import {Token} from '../models/Token.model';
import jwt from "jsonwebtoken";
import config from "../config/config";
import bcrypt from "bcrypt";

export interface PairTokens {
    accessToken: string;
    refreshToken?: string;
}

export interface TokenPayload {
    id?: string;
    email: string;
    role: "Admin" | "User" | "Creator";
}

export class TokenService {
    generateSessionToken(payload: TokenPayload) {
        return jwt.sign(payload, config.SESSION_TOKEN_SECRET, {expiresIn: '3h'});
    }

    generateTokens(payload: TokenPayload, pair: boolean): PairTokens {
        const accessToken: string = jwt.sign(payload, config.ACCESS_TOKEN_SECRET, {expiresIn: '15m'});
        if (!pair) return {accessToken};

        const refreshToken: string = jwt.sign(payload, config.REFRESH_TOKEN_SECRET, {expiresIn: '30d'});
        return {accessToken, refreshToken};
    }

    async validateToken(token: string, type: "A" | "R"): Promise<TokenPayload | null> {
        try {
            const secret = {"A": config.ACCESS_TOKEN_SECRET, "R": config.REFRESH_TOKEN_SECRET};
            return jwt.verify(token, secret[type]) as TokenPayload;
        } catch (e) {
            return null
        }
    }

    // Save a refresh token hashed in DB (rotate existing token for the user)
    async saveToken(user: string, refreshToken: string, meta?: { deviceId?: string; ip?: string; userAgent?: string }) {
        const hashed = await bcrypt.hash(refreshToken, 12);
        const token = await Token.findOne({user, deviceId: meta?.deviceId});
        if (token) {
            token.refreshToken = hashed;
            token.expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            token.ip = meta?.ip;
            token.userAgent = meta?.userAgent;
            return token.save();
        }
        return Token.create({user, refreshToken: hashed, deviceId: meta?.deviceId, ip: meta?.ip, userAgent: meta?.userAgent});
    }

    // Find stored token by user id
    async findTokenByUser(user: string, deviceId?: string) {
        if (deviceId) return Token.findOne({user, deviceId});
        return Token.findOne({user});
    }

    // List all tokens for a user (for admin/audit purposes)
    async listTokensByUser(user: string) {
        return Token.find({user}).select('-refreshToken').lean();
    }

    // Revoke tokens by user and deviceId (if deviceId provided revoke only that device)
    async revokeTokens(user: string, deviceId?: string) {
        if (deviceId) return Token.deleteMany({user, deviceId});
        return Token.deleteMany({user});
    }

    // Compare a raw refresh token against the stored hashed value
    async compareRefreshToken(rawRefresh: string, storedHashed: string) {
        return bcrypt.compare(rawRefresh, storedHashed);
    }

    // Remove token by raw refresh token (compares to stored hashed and deletes match)
    async removeToken(rawRefreshToken: string, deviceId?: string) {
        if (deviceId) {
            const token = await Token.findOne({deviceId});
            if (!token) return null;
            const match = await bcrypt.compare(rawRefreshToken, token.refreshToken);
            if (match) return Token.deleteOne({_id: token._id});
            return null;
        }

        const tokens = await Token.find();
        for (const t of tokens) {
            if (await bcrypt.compare(rawRefreshToken, t.refreshToken)) {
                return Token.deleteOne({_id: t._id});
            }
        }
        return null;
    }
}