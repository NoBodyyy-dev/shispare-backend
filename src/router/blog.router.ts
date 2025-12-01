import {Router} from "express";
import {asyncHandler} from "../utils/utils";
import {authMiddleware} from "../middleware/auth.middleware";
import {BlogController} from "../controllers/blog.controller";
import multer from "multer";

export const blogRouter = Router();
const blogController = new BlogController();

const upload = multer({ storage: multer.memoryStorage() });

// Публичные роуты
blogRouter.get("/get-all", asyncHandler(blogController.getAllPosts));
blogRouter.get("/get-post/:slug", asyncHandler(blogController.getPost));

// Админские роуты (требуют авторизации)
blogRouter.post("/create", authMiddleware, upload.single("image"), asyncHandler(blogController.createPost));
blogRouter.post("/update/:id", authMiddleware, upload.single("image"), asyncHandler(blogController.updatePost));
blogRouter.delete("/delete/:id", authMiddleware, asyncHandler(blogController.deletePost));
