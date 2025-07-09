import {Token} from '../models/Token.model';
import jwt from "jsonwebtoken";
import config from "../config/config";
import bcrypt from "bcrypt";
import {SHA256_HEADER} from "@aws-sdk/s3-request-presigner/dist-types/constants";

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

    async saveToken(user: string, refreshToken: string) {
        const token = await Token.findOne({user});
        if (token) {
            token.refreshToken = refreshToken;
            token.expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            return token.save();
        }
        return Token.create({user, refreshToken});
    }

    async removeToken(refreshToken: string) {
        return Token.deleteOne({refreshToken});
    }
}