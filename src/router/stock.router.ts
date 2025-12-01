import express from "express";
import {asyncHandler} from "../utils/utils";
import * as controller from "../controllers/stock.controller";
import {authMiddleware} from "../middleware/auth.middleware";

export const stockRouter = express.Router();

// Публичные роуты
stockRouter.get("/get-all", asyncHandler(controller.getAllStocks));

// Админские роуты (требуют авторизации)
stockRouter.post("/create", authMiddleware, asyncHandler(controller.createStock))