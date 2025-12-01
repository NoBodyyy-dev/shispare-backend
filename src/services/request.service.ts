import { Request as RequestModel } from "../models/Request.model";
import { APIError } from "./error.service";
import { IUser } from "../models/User.model";
import { Types } from "mongoose";

export interface ICreateRequestPayload {
    fullName: string;
    email: string;
    question: string;
}

export interface IAnswerRequestPayload {
    answer: string;
}

export class RequestService {
    /**
     * Создать новую заявку (публичный endpoint)
     */
    async createRequest(payload: ICreateRequestPayload) {
        const { fullName, email, question } = payload;

        if (!fullName || !email || !question) {
            throw APIError.BadRequest({
                message: "Все поля обязательны для заполнения",
            });
        }

        // Валидация email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw APIError.BadRequest({
                message: "Некорректный email адрес",
            });
        }

        const request = await RequestModel.create({
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            question: question.trim(),
            answered: false,
        });

        return request;
    }

    /**
     * Получить все заявки (только для администраторов)
     */
    async getAllRequests() {
        const requests = await RequestModel.find({})
            .populate("answeredBy", "fullName email")
            .sort({ createdAt: -1 })
            .lean();

        return requests;
    }

    /**
     * Получить заявку по ID (только для администраторов)
     */
    async getRequestById(id: string) {
        if (!Types.ObjectId.isValid(id)) {
            throw APIError.BadRequest({
                message: "Некорректный ID заявки",
            });
        }

        const request = await RequestModel.findById(id)
            .populate("answeredBy", "fullName email")
            .lean();

        if (!request) {
            throw APIError.NotFound({
                message: "Заявка не найдена",
            });
        }

        return request;
    }

    /**
     * Ответить на заявку (только для администраторов)
     */
    async answerRequest(id: string, payload: IAnswerRequestPayload, user: IUser) {
        if (!Types.ObjectId.isValid(id)) {
            throw APIError.BadRequest({
                message: "Некорректный ID заявки",
            });
        }

        const { answer } = payload;

        if (!answer || !answer.trim()) {
            throw APIError.BadRequest({
                message: "Ответ не может быть пустым",
            });
        }

        const request = await RequestModel.findById(id);

        if (!request) {
            throw APIError.NotFound({
                message: "Заявка не найдена",
            });
        }

        if (request.answered) {
            throw APIError.BadRequest({
                message: "На эту заявку уже дан ответ",
            });
        }

        request.answer = answer.trim();
        request.answered = true;
        request.answeredAt = new Date();
        request.answeredBy = user._id;

        await request.save();

        // Возвращаем заявку с populate
        const populatedRequest = await RequestModel.findById(id)
            .populate("answeredBy", "fullName email")
            .lean();

        return populatedRequest;
    }

    /**
     * Удалить заявку (только для администраторов)
     */
    async deleteRequest(id: string) {
        if (!Types.ObjectId.isValid(id)) {
            throw APIError.BadRequest({
                message: "Некорректный ID заявки",
            });
        }

        const request = await RequestModel.findByIdAndDelete(id);

        if (!request) {
            throw APIError.NotFound({
                message: "Заявка не найдена",
            });
        }

        return { success: true };
    }
}


