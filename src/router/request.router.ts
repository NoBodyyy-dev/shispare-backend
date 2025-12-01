import {Router} from "express";
import {RequestController} from "../controllers/request.controller";
import {authMiddleware} from "../middleware/auth.middleware";

export const requestRouter = Router();
const requestController = new RequestController();

requestRouter.post("/create", requestController.createRequest);

requestRouter.get("/all", authMiddleware, requestController.getAllRequests);
requestRouter.get("/:id", authMiddleware, requestController.getRequestById);
requestRouter.post("/:id/answer", authMiddleware, requestController.answerRequest);
requestRouter.delete("/:id", authMiddleware, requestController.deleteRequest);





