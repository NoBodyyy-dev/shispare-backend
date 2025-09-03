import {Router} from "express";
import {asyncHandler} from "../utils/utils";
import {authMiddleware} from "../middleware/auth.middleware";
import {adminMiddleware} from "../middleware/admin.middleware";
import {BlogController} from "../controllers/blog.controller";
import multer from "multer";

export const blogRouter = Router();
const blogController = new BlogController();

const upload = multer({ storage: multer.memoryStorage() });

blogRouter.get("/get-all", asyncHandler(blogController.getAllPosts));
blogRouter.get("/get-post/:slug", asyncHandler(blogController.getPost));

blogRouter.use([authMiddleware, adminMiddleware]);

blogRouter.post("/create", upload.single("image"), asyncHandler(blogController.createPost));
blogRouter.get("/update/:id", asyncHandler(blogController.updatePost));
blogRouter.get("/delete/:id", asyncHandler(blogController.deletePost));
