import express from "express";
import {CommentController} from "../controllers/comment.controller";
import {authMiddleware} from "../middleware/auth.middleware";

export const commentRouter = express.Router();
const commentController = new CommentController();

// Публичные роуты
commentRouter.get("/get-product-comments/:product", commentController.getProductComments);

// Пользовательские роуты (требуют авторизации)
commentRouter.get("/get-comments/me", authMiddleware, commentController.getMyComments);
commentRouter.get("/check-can-comment/:productId", authMiddleware, commentController.checkCanComment);
commentRouter.post("/create", authMiddleware, commentController.createComment);

// Админские роуты (требуют авторизации)
commentRouter.get("/get-comment/:id", authMiddleware, commentController.getComment);
commentRouter.get("/get-comments/:user", authMiddleware, commentController.getUserComments);
commentRouter.delete("/delete", authMiddleware, commentController.deleteComment);