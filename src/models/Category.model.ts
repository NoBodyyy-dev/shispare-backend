import mongoose from "mongoose";
import {createSlug} from "../utils/utils";

export interface ICategory {
    _id: mongoose.Types.ObjectId;
    title: string;
    slug: string;
}

const categorySchema = new mongoose.Schema<ICategory>({
    title: {type: String, required: true, trim: true},
    slug: {type: String, trim: true},
})

categorySchema.pre("save", function (next) {
    if (!this.slug && this.title) {
        this.slug = createSlug(this.title);
    }
    next();
});


export const Category = mongoose.model<ICategory>("Category", categorySchema);