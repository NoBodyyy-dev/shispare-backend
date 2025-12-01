import {Request, Response, NextFunction, ErrorRequestHandler} from 'express';
import { APIError } from '../services/error.service';
import { Logger } from '../services/logger.service';

export const errorMiddleware: ErrorRequestHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.log(err)

    if (res.headersSent) {
        return next(err);
    }

    if (err instanceof APIError) {
        err.path = req.path;
        res.status(err.status).json(err.toJSON());
        return;
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