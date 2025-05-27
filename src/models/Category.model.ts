import mongoose from "mongoose";
import ICategory from "../interfaces/ICategory";

const categorySchema = new mongoose.Schema<ICategory>({
    title: {type: String, required: true, trim: true},
    slug: {type: String, required: true, trim: true},
    group: {type: Number, required: true, trim: true},
})

const Category = mongoose.model<ICategory>("Category", categorySchema);
export default Category;