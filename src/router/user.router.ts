import express from "express";
import {authMiddleware} from "../middleware/auth.middleware";
import {UserController} from "../controllers/user.controller";

const userController = new UserController();
export const userRouter = express.Router()

// Пользовательские роуты (требуют авторизации)
userRouter.get("/me", authMiddleware, userController.getMeFunc);
userRouter.put("/update", authMiddleware, userController.updateMeFunc);

// Админские роуты (требуют авторизации)
userRouter.get("/get-user/all", authMiddleware, userController.getAllUsersFunc);
userRouter.get("/get-staff/all", authMiddleware, userController.getAllStaffFunc);
userRouter.get("/get-user/:id", authMiddleware, userController.getOneUser);
userRouter.get('/tokens/:id', authMiddleware, userController.listUserTokens);
userRouter.delete('/tokens/:id', authMiddleware, userController.revokeUserTokens);
userRouter.put('/ban/:id', authMiddleware, userController.banUser);