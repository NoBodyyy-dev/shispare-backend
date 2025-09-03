import express from "express";
import {validationResult} from "express-validator";

interface IAPIErrorOptions {
    status: number;
    message: string;
    errors?: unknown[];
    code?: string;
    isPublic?: boolean;
    isOperational?: boolean;
    path?: string;
}

export class APIError extends Error {
    public readonly status: number;
    public readonly errors: unknown[];
    public readonly code?: string;
    public readonly isPublic: boolean;
    public readonly isOperational: boolean;
    public readonly success: boolean = false;
    public readonly timestamp: Date = new Date();
    public path?: string;

    constructor(options: IAPIErrorOptions) {
        super(options.message);

        this.status = options.status;
        this.errors = options.errors || [];
        this.code = options.code;
        this.isPublic = options.isPublic ?? true;
        this.isOperational = options.isOperational ?? true;
        this.path = options.path;

        Error.captureStackTrace?.(this, this.constructor);
    }

    static BadRequest(options: {
        message: string;
        errors?: unknown[];
        code?: string;
        isPublic?: boolean;
    }): APIError {
        return new APIError({
            status: 400,
            message: options.message,
            errors: options.errors,
            code: options.code || 'BAD_REQUEST',
            isPublic: options.isPublic,
        });
    }

    static Unauthorized(options: {
        message?: string;
        code?: string;
        isPublic?: boolean;
    } = {}): APIError {
        return new APIError({
            status: 401,
            message: options.message || 'Пользователь не авторизован',
            code: options.code || 'UNAUTHORIZED',
            isPublic: options.isPublic,
        });
    }

    static Forbidden(options: {
        message: string;
        code?: string;
        isPublic?: boolean;
    }): APIError {
        return new APIError({
            status: 403,
            message: options.message,
            code: options.code || 'FORBIDDEN',
            isPublic: options.isPublic,
        });
    }

    static NotFound(options: {
        message: string;
        code?: string;
        isPublic?: boolean;
    }): APIError {
        return new APIError({
            status: 404,
            message: options.message,
            code: options.code || 'NOT_FOUND',
            isPublic: options.isPublic,
        });
    }

    static Conflict(options: {
        message: string;
        code?: string;
        isPublic?: boolean;
    }): APIError {
        return new APIError({
            status: 409,
            message: options.message,
            code: options.code || 'CONFLICT',
            isPublic: options.isPublic,
        });
    }

    static InternalServerError(options: {
        message?: string;
        errors?: unknown[];
        code?: string;
        isPublic?: boolean;
    } = {}): APIError {
        return new APIError({
            status: 500,
            message: options.message || 'Внутренняя ошибка сервера',
            errors: options.errors,
            code: options.code || 'INTERNAL_SERVER_ERROR',
            isPublic: options.isPublic ?? false,
            isOperational: false,
        });
    }

    toJSON() {
        return {
            success: this.success,
            status: this.status,
            message: this.message,
            ...(this.code && {code: this.code}),
            ...(this.isPublic && this.errors.length > 0 && {errors: this.errors}),
            ...(process.env.NODE_ENV === 'development' && {
                path: this.path,
                timestamp: this.timestamp,
                stack: this.stack
            }),
        };
    }

    public static async catchError(req: express.Request, res: express.Response, next: express.NextFunction): Promise<boolean> {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            next(APIError.BadRequest({message: "Ошибка валидации", errors: errors.array()}));
            return false; // Возвращаем false при ошибке
        }
        return true; // Возвращаем true при успехе
    };
}