import express from "express";
import {asyncHandler} from "../utils/utils";
import * as controller from "../controllers/stock.controller";
import {authMiddleware} from "../middleware/auth.middleware";
import {adminMiddleware} from "../middleware/admin.middleware";

const stockRouter = express.Router();

stockRouter.post("/create", [authMiddleware, adminMiddleware], asyncHandler(controller.createStock))
stockRouter.get("/get-all", asyncHandler(controller.getAllStocks));