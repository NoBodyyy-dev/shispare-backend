import {Request, Response, NextFunction, ErrorRequestHandler} from 'express';
import { APIError } from '../utils/error';
import { Logger } from '../services/logger.service';

export const errorMiddleware: ErrorRequestHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Logger.error(`[${req.method}] ${req.originalUrl}`, {
        error: err.message,
        stack: err.stack,
        status: err instanceof APIError ? err.status : 500,
        body: req.body,
        params: req.params,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });

    if (err instanceof APIError) {
        err.path = req.path;
        res.status(err.status).json(err.toJSON());
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const serverError = APIError.InternalServerError({
        message: isProduction ? 'Внутренняя ошибка сервера' : err.message,
        errors: isProduction ? [] : [err.stack],
        isPublic: !isProduction
    });
    serverError.path = req.path;

    res.status(serverError.status).json(serverError.toJSON());
};

export const notFoundMiddleware = (req: Request, res: Response, next: NextFunction) => {
    next(APIError.NotFound({message: `Ресурс ${req.originalUrl} не найден`}));
};