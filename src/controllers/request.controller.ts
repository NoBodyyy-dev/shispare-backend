import {Request, Response, NextFunction} from "express";
import {RequestService} from "../services/request.service";
import {APIError} from "../services/error.service";

export class RequestController {
    private requestService = new RequestService();

    createRequest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {fullName, email, question} = req.body;

            if (!fullName || !email || !question) {
                throw APIError.BadRequest({message: "Все поля обязательны для заполнения"});
            }

            // Валидация email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw APIError.BadRequest({message: "Некорректный email"});
            }

            const request = await this.requestService.createRequest({
                fullName,
                email,
                question,
            });

            res.status(201).json({
                success: true,
                message: "Заявка успешно отправлена",
                data: request,
            });
        } catch (e) {
            next(e);
        }
    };

    getAllRequests = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const requests = await this.requestService.getAllRequests();
            res.status(200).json({
                success: true,
                data: requests,
            });
        } catch (e) {
            next(e);
        }
    };

    getRequestById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {id} = req.params;
            const request = await this.requestService.getRequestById(id);
            res.status(200).json({
                success: true,
                data: request,
            });
        } catch (e) {
            next(e);
        }
    };

    answerRequest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {id} = req.params;
            const {answer} = req.body;

            if (!answer || !answer.trim()) {
                throw APIError.BadRequest({message: "Ответ обязателен для заполнения"});
            }

            const request = await this.requestService.answerRequest(
                id,
                answer,
                req.user!._id.toString()
            );

            res.status(200).json({
                success: true,
                message: "Ответ успешно отправлен",
                data: request,
            });
        } catch (e) {
            next(e);
        }
    };
}

