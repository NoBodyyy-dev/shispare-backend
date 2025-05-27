import {Router} from "express";
import {asyncHandler} from "../utils/utils";
import * as controller from "../controllers/blog.controller";
import authMiddleware from "../middleware/auth.middleware";
import accessMiddleware from "../middleware/admin.middleware";

const blogRouter = Router();

blogRouter.get("/get-all", asyncHandler(controller.getAllPosts));

export default blogRouter;