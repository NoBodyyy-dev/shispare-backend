import mongoose, { Schema } from "mongoose";
import { IProduct, IProductVariant } from "../interfaces/product.interface";

const productVariantSchema = new Schema<IProductVariant>({
    sku: { type: String, required: true, trim: true },
    article: { type: Number, required: true },
    price: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    countInStock: { type: Number, required: true, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    countOnPallet: { type: Number, required: true, min: 0 },
    color: {
        ru: { type: String, required: true },
        en: { type: String, required: true },
    },
    package: {
        type: { type: String, required: true, enum: ["мешок", "ведро", "бочка"] },
        count: { type: Number, required: true },
        unit: { type: String, required: true, enum: ["кг", "л"] },
    },
});

const productSchema = new Schema<IProduct>({
    title: { type: String, required: true, trim: true, maxlength: 64 },
    description: { type: String, required: true, trim: true, maxlength: 255 },
    slug: { type: String, required: true, unique: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    images: { type: [String], default: [] },
    characteristics: { type: [String], default: [] },
    documents: { type: [String], default: [] },
    country: { type: String, required: true },
    shelfLife: { type: String, required: true },
    variants: { type: [productVariantSchema], required: true },
    totalPurchases: { type: Number, default: 0, min: 0 },
    variantIndex: { type: Number, default: 0 },
});

export const Product = mongoose.model<IProduct>("Product", productSchema);