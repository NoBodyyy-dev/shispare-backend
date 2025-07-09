import {Request, Response, NextFunction} from 'express';
import {APIError} from "../services/error.service";
import {User} from "../models/User.model";
import {TokenPayload, TokenService} from "../services/token.service";
import {ExtendedError, Socket} from "socket.io";

const tokenService = new TokenService();

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return next(APIError.Unauthorized())
        const decoded: TokenPayload | null = await tokenService.validateToken(token, 'A');
        if (decoded === null) return next(APIError.Unauthorized())
        const user = await User.findOne({_id: decoded.id}).select("-telegramId -password")
        if (!user) return next(APIError.Unauthorized())
        req.user = user
        next();
    } catch (error) {
        res.status(401).json({message: 'Invalid token'});
    }
};

export const socketAuthMiddleware = async (socket: Socket, next: (err?: ExtendedError) => void) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) return next(APIError.Unauthorized());
        const candidate = await tokenService.validateToken(token, "A");
        if (!candidate || !candidate.email) return next(APIError.Unauthorized());
        const user = await User.findOne({email: candidate.email});
        if (!user) return next(APIError.Unauthorized());
        socket.user = user;
        next();
    } catch (error) {
        next(new Error("Authentication error"));
    }
}