import mongoose from "mongoose";
import CategoryInterface from "../interfaces/category.interface";

const categorySchema = new mongoose.Schema<CategoryInterface>({
    title: {type: String, required: true, trim: true},
    slug: {type: String, required: true, trim: true},
    group: {type: Number, required: true, trim: true},
})

const Category = mongoose.model<CategoryInterface>("Category", categorySchema);
export default Category;