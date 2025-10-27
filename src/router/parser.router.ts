import {Request, Response, NextFunction, Router} from "express";
import {authMiddleware} from "../middleware/auth.middleware";
import {adminMiddleware} from "../middleware/admin.middleware";
import {ParsingService} from "../services/parsing.service";
import {ParsingController} from "../controllers/parsing.controller";
import multer from "multer";

export const parserRouter = Router();
const parsingService = new ParsingService();
const parsingController = new ParsingController();
const upload = multer({storage: multer.memoryStorage()});
// parserRouter.use(authMiddleware);
// parserRouter.use(adminMiddleware);

parserRouter.post("/parse-products", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const haha = await parsingService.fetchProductsFromAPI()
        res.json({haha})
    } catch (e) {
        next(e);
    }
})

parserRouter.post("/test", upload.single("file"), parsingController.parseFile)