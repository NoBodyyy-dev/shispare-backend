import mongoose from "mongoose";
import {createSlug} from "../utils/utils";

export interface ICategory {
    _id: mongoose.Types.ObjectId;
    title: string;
    slug: string;
    level: number;
}

const categorySchema = new mongoose.Schema<ICategory>({
    title: {type: String, required: true, trim: true},
    slug: {type: String, trim: true},
    level: {type: Number, required: true, default: 1, enum: [1, 2]},
})

categorySchema.pre("save", function (next) {
    if (!this.slug && this.title) {
        this.slug = createSlug(this.title);
    }
    next();
});


export const Category = mongoose.model<ICategory>("Category", categorySchema);