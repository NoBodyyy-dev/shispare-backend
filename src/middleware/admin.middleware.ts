import {Request, Response, NextFunction} from "express";
import {APIError} from "../services/error.service";

export const adminMiddleware = async (req: Request, _: Response, next: NextFunction) => {
    try {
        req.access = req.user!.role.toLowerCase() === "admin";
        if (!req.access) return next(APIError.Forbidden({message: "У вас недостаточно прав доступа чтобы выполнить данное действие!"}));
        next()
    } catch (e) {
        next(e)
    }
}
