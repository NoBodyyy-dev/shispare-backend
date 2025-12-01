import express from "express";
import {SolutionController} from "../controllers/solution.controller";
import {authMiddleware} from "../middleware/auth.middleware";

export const solutionRouter = express.Router();
const solutionController = new SolutionController();

// Публичные роуты
solutionRouter.get("/all", solutionController.getAllSolutionsFunc);
solutionRouter.get("/get-one/:slug", solutionController.getSolutionFunc);

// Админские роуты (требуют авторизации)
solutionRouter.post("/create", authMiddleware, solutionController.createSolutionFunc);
solutionRouter.put("/update/:slug", authMiddleware, solutionController.updateSolutionFunc);
solutionRouter.delete("/delete/:slug", authMiddleware, solutionController.deleteSolutionFunc);
