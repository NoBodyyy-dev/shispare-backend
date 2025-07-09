import mongoose, {Types} from "mongoose";

export interface IProduct extends Document{
    title: string,
    description: string,
    slug: string,
    article: number,
    price: number,
    category: mongoose.Types.ObjectId,
    productImages: string[],
    countProducts: number,
    discount: number,
    rating: number,
    colors: string[],
    characteristics: string[],
    consumption: number,
    documents: string[],
    totalPurchases: number,
}

export interface ICartProduct extends Document{
    product: Types.ObjectId;
    optionIndex: number;
    quantity: number;
    addedAt: Date;
    customOptions?: {
        [key: string]: string | number;
    };
}
