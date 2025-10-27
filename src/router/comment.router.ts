import express from "express";
import {CommentController} from "../controllers/comment.controller";
import {authMiddleware} from "../middleware/auth.middleware";
import {adminMiddleware} from "../middleware/admin.middleware";

export const commentRouter = express.Router();
const commentController = new CommentController();

commentRouter.get("/get-product-comments/:product", commentController.getUserComments);
commentRouter.get("/get-comment/:id", [authMiddleware, adminMiddleware], commentController.getUserComments);
commentRouter.get("/get-comments/me", authMiddleware, commentController.getMyComments);
commentRouter.get("/get-comments/:user", [authMiddleware, adminMiddleware], commentController.getUserComments);

commentRouter.post("/create", authMiddleware, commentController.createComment);
commentRouter.delete("/delete", authMiddleware, commentController.deleteComment);