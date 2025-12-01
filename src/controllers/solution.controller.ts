import {Request, Response, NextFunction} from "express"
import {SolutionService} from "../services/solution.service";

export class SolutionController {
    private solutionService: SolutionService = new SolutionService();

    getAllSolutionsFunc = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const solutions = await this.solutionService.getAllSolutions();
            res.json({solutions, success: true});
        } catch (e) {
            next(e);
        }
    }

    getSolutionFunc = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {slug} = req.params;
            const solution = await this.solutionService.getSolution(slug);
            res.json({solution, success: true});
        } catch (e) {
            next(e);
        }
    }

    createSolutionFunc = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {name, image, details} = req.body;
            const {slug} = req.params;
            const solution = await this.solutionService.createSolution({name, image, details});
            res.json({solution, success: true});
        } catch (e) {
            next(e);
        }
    }

    updateSolutionFunc = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {name, image, details} = req.body;
            const {slug} = req.params;
            const solution = await this.solutionService.updateSolution(slug, {name, image, details});
            res.json({solution, success: true});
        } catch (e) {
            next(e);
        }
    }

    deleteSolutionFunc = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {slug} = req.params;
            const deleteResult = await this.solutionService.deleteSolution(slug);
            res.json({success: true});
        } catch (e) {
            next(e);
        }
    }
}