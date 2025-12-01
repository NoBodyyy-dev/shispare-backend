import {PostController} from "../controllers/post.controller";
import {Router} from "express";
import {authMiddleware} from "../middleware/auth.middleware"

const postController = new PostController();
export const postRouter = Router();

// Публичные роуты
postRouter.get("/get-all", postController.getAll);
postRouter.get("/get-post/:_id", postController.getPost)
postRouter.get("/get-products-with-discount", postController.getPost)

// Админские роуты (требуют авторизации)
postRouter.post("/create-post", authMiddleware, postController.createPost);
postRouter.put("/update-post/:_id", authMiddleware, postController.updatePost);
postRouter.delete("/delete-post/:_id", authMiddleware, postController.deletePost);
