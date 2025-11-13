import {Request as RequestModel, IRequest} from "../models/Request.model";
import {APIError} from "./error.service";
import {SenderService} from "./sender.service";
import {toObjID} from "../utils/utils";

export class RequestService {
    private senderService = new SenderService();

    async createRequest(data: {fullName: string; email: string; question: string}) {
        const request = new RequestModel({
            fullName: data.fullName,
            email: data.email,
            question: data.question,
            answered: false,
        });

        await request.save();
        return request;
    }

    async getAllRequests() {
        return RequestModel.find()
            .populate("answeredBy", "fullName email")
            .sort({createdAt: -1})
            .lean();
    }

    async getRequestById(requestId: string) {
        const request = await RequestModel.findById(requestId)
            .populate("answeredBy", "fullName email")
            .lean();
        
        if (!request) {
            throw APIError.NotFound({message: "Заявка не найдена"});
        }
        
        return request;
    }

    async answerRequest(requestId: string, answer: string, answeredBy: string) {
        const request = await RequestModel.findById(requestId);
        if (!request) {
            throw APIError.NotFound({message: "Заявка не найдена"});
        }

        if (request.answered) {
            throw APIError.BadRequest({message: "Заявка уже отвечена"});
        }

        request.answer = answer;
        request.answered = true;
        request.answeredAt = new Date();
        request.answeredBy = toObjID(answeredBy);

        await request.save();

        // Отправляем ответ на email пользователю
        await this.senderService.sendRequestAnswerEmail({
            to: request.email,
            fullName: request.fullName,
            question: request.question,
            answer: answer,
        });

        return request.populate("answeredBy", "fullName email");
    }
}

