import {Request, Response, NextFunction} from "express";
import {RequestService} from "../services/request.service";

export class RequestController {
    private readonly requestService = new RequestService();

    /**
     * Создать новую заявку (публичный endpoint)
     */
    createRequest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {fullName, email, question} = req.body;

            const request = await this.requestService.createRequest({
                fullName,
                email,
                question,
            });

            res.status(201).json({
                success: true,
                request,
                message: "Заявка успешно создана",
            });
        } catch (err) {
            next(err);
        }
    };

    /**
     * Получить все заявки (только для администраторов)
     */
    getAllRequests = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const requests = await this.requestService.getAllRequests();

            res.status(200).json({
                success: true,
                requests,
            });
        } catch (err) {
            next(err);
        }
    };

    /**
     * Получить заявку по ID (только для администраторов)
     */
    getRequestById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {id} = req.params;

            const request = await this.requestService.getRequestById(id);

            res.status(200).json({
                success: true,
                request,
            });
        } catch (err) {
            next(err);
        }
    };

    /**
     * Ответить на заявку (только для администраторов)
     */
    answerRequest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {id} = req.params;
            const {answer} = req.body;
            const user = req.user!; // authMiddleware гарантирует наличие user

            const request = await this.requestService.answerRequest(id, {answer}, user);

            res.status(200).json({
                success: true,
                request,
                message: "Ответ успешно отправлен",
            });
        } catch (err) {
            next(err);
        }
    };

    /**
     * Удалить заявку (только для администраторов)
     */
    deleteRequest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {id} = req.params;

            const result = await this.requestService.deleteRequest(id);

            res.status(200).json({
                ...result,
                message: "Заявка успешно удалена",
            });
        } catch (err) {
            next(err);
        }
    };
}


