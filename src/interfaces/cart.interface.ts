import {Document, Types} from "mongoose";

export interface ICartItem {
    product: Types.ObjectId;
    optionIndex: number;
    quantity: number;
    addedAt: Date;
    customOptions?: {
        [key: string]: string | number;
    };
}

export interface ICart extends Document {
    owner: Types.ObjectId;
    items: ICartItem[];
    createdAt: Date;
    updatedAt: Date;
    lastActivity: Date;
}