import {Request, Response, NextFunction} from 'express';
import {ExtendedError, Socket} from "socket.io";
import {TokenPayload, TokenService} from "../services/token.service";
import {APIError} from "../services/error.service";
import {User} from "../models/User.model";

const tokenService = new TokenService();

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return next(APIError.Unauthorized());
        const decoded: TokenPayload | null = await tokenService.validateToken(token, 'A');
        if (decoded === null) return next(APIError.Unauthorized());
        const user = await User.findOne({_id: decoded.id})
            .select("-telegramId -password")
            .lean();
        if (!user) return next(APIError.Unauthorized());
        req.user = user;
        next();
    } catch (error) {
        next(APIError.Unauthorized());
    }
};

export const socketAuthMiddleware = async (socket: Socket, next: (err?: ExtendedError) => void) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) return next(APIError.Unauthorized());
        const candidate = await tokenService.validateToken(token, "A");
        if (!candidate || !candidate.email) return next(APIError.Unauthorized());
        const user = await User.findOne({email: candidate.email}).lean();
        if (!user) return next(APIError.Unauthorized());
        socket.user = user;
        next();
    } catch (error) {
        next(APIError.Unauthorized());
    }
}