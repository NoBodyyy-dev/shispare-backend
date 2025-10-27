import {ParsingService} from "../services/parsing.service";
import {Request, Response, NextFunction} from "express";
import {APIError} from "../services/error.service";

export class ParsingController {
    private parsingService: ParsingService = new ParsingService();

    parseFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const file = req.file;
            if (!file) {
                next(APIError.BadRequest({ message: "Файл обязателен!" }));
                return;
            }

            const data = await this.parsingService.parseProductsFromAPIAndExcel(file);
            res.status(200).json({ success: true, data });
        } catch (e) {
            next(e);
        }
    };
}