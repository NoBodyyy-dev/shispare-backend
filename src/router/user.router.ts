import express from "express";
import {authMiddleware} from "../middleware/auth.middleware";
import {UserController} from "../controllers/user.controller";

const userController = new UserController();
export const userRouter = express.Router()

userRouter.get("/me", authMiddleware, userController.getMeFunc);
userRouter.put("/update", authMiddleware, userController.updateMeFunc);