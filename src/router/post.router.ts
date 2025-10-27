import {PostController} from "../controllers/post.controller";
import {Router} from "express";
import {authMiddleware} from "../middleware/auth.middleware"
import {adminMiddleware} from "../middleware/admin.middleware";

const postController = new PostController();
const postRouter = Router();

postRouter.get("/get-all", postController.getAll);
postRouter.get("/get-post/:_id", postController.getPost)
postRouter.get("/get-products-with-discount", postController.getPost)

postRouter.use([authMiddleware, adminMiddleware]);

postRouter.post("/create-post", postController.createPost);
postRouter.put("/update-post/:_id", postController.updatePost);
postRouter.delete("/delete-post/:_id", postController.deletePost);
