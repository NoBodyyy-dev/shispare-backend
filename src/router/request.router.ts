import {Router} from "express";
import {RequestController} from "../controllers/request.controller";
import {authMiddleware} from "../middleware/auth.middleware";
import {adminMiddleware} from "../middleware/admin.middleware";

export const requestRouter = Router();
const requestController = new RequestController();

// Публичный endpoint для создания заявки
requestRouter.post("/create", requestController.createRequest);

// Защищенные endpoints для администраторов
requestRouter.get("/all", [authMiddleware, adminMiddleware], requestController.getAllRequests);
requestRouter.get("/:id", [authMiddleware, adminMiddleware], requestController.getRequestById);
requestRouter.post("/:id/answer", [authMiddleware, adminMiddleware], requestController.answerRequest);

