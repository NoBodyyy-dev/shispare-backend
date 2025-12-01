import {IBody, ISolution, Solution} from "../models/Solution.model";
import {createSlug} from "../utils/utils";

export class SolutionService {
    public async getAllSolutions() {
        return Solution.find().lean();
    }

    public async getSolution(slug: string) {
        const sol = await Solution.findOne({slug})
            .populate([
                {path: "details.products"},
                {path: "details.products.category"}
            ])
            .lean();
        console.log("sol >>>", sol?.details[0].products);
        return sol;
    }

    public async createSolution(solutionData: IBody) {
        const slug = createSlug(solutionData.name);
        return Solution.create({...solutionData, slug});
    }

    public async updateSolution(slug: string, dataToUpdate: IBody) {
        return Solution.findOneAndUpdate({slug: slug}, {
            ...dataToUpdate,
            slug: createSlug(dataToUpdate.name),
        });
    }

    public async deleteSolution(slug: string) {
        return Solution.findOneAndDelete({slug: slug});
    }
}