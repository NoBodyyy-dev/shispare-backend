import express from "express";
import {authMiddleware} from "../middleware/auth.middleware";
import {adminMiddleware} from "../middleware/admin.middleware";
import {UserController} from "../controllers/user.controller";

const userController = new UserController();
export const userRouter = express.Router()

userRouter.use(authMiddleware);

userRouter.get("/me", userController.getMeFunc);
userRouter.get("/get-user/all", userController.getAllUsersFunc);
userRouter.get("/get-user/:id", userController.getOneUser);
userRouter.put("/update", userController.updateMeFunc);
// Admin token management
userRouter.get('/tokens/:id', adminMiddleware, userController.listUserTokens);
userRouter.delete('/tokens/:id', adminMiddleware, userController.revokeUserTokens);
// Admin: ban/unban user
userRouter.put('/ban/:id', adminMiddleware, userController.banUser);