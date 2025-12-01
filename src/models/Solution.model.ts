import mongoose, {model} from "mongoose";

export interface ISolution {
    _id: mongoose.Types.ObjectId;
    name: string;
    slug: string;
    image: string;
    details: ISolutionDetail[];
}

export interface IBody {
    name: string;
    image: string;
    details: ISolutionDetail[];
}

export interface ISolutionDetail {
    section: string;
    products: mongoose.Types.ObjectId[];
}

const solutionDetail = new mongoose.Schema({
    section: {type: String, required: true},
    products: [{type: mongoose.Schema.Types.ObjectId, ref: "Product"}],
    position: {
        left: {type: Number},
        top: {type: Number},
    }
}, {_id: false});

const solutionSchema = new mongoose.Schema({
    name: {type: String, required: true, unique: true},
    slug: {type: String, required: true, unique: true},
    image: {type: String, required: true},
    details: [solutionDetail],
})

export const Solution = model<ISolution>("Solution", solutionSchema);