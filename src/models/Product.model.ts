import mongoose from "mongoose";
import {IProduct} from "../interfaces/product.interface";

const productSchema = new mongoose.Schema({
    title: {type: String, required: true, trim: true, max: 64},
    description: {type: String, required: true, trim: true, max: 255},
    slug: {type: String, required: true},
    article: {type: Number, required: true},
    image: {type: String, required: true, default: []},
    category: {type: mongoose.Schema.Types.ObjectId, required: true, ref: "Category"},
    options: [
        {
            color: {type: String, required: true},
            price: {type: Number, required: true},
            countProducts: {type: Number, required: true, default: 0},
            discount: {type: Number, default: 0, max: 100},
            rating: {type: Number, default: 0.0, max: 5},
        }
    ],
    characteristics: {type: Array(String), required: true},
    document: {type: String, required: true},
    totalPurchases: {type: Number, required: true, default: 0, min: 0},
})

export const Product: mongoose.Model<IProduct> = mongoose.model<IProduct>("Product", productSchema);
