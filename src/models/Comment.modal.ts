import {model, Schema, Types} from "mongoose";

export interface IComment extends Document {
    _id: Types.ObjectId;
    owner: Types.ObjectId;
    product: Types.ObjectId;
    rating: number;
    content: string;
    createdAt: Date;
    updatedAt: Date;
}

const commentSchema: Schema<IComment> = new Schema({
    owner: {type: Schema.Types.ObjectId, ref: "User", required: true},
    content: {type: String, required: true},
    rating: {type: Number, required: true},
    product: {type: Schema.Types.ObjectId, ref: "Product", required: true},
}, {timestamps: true});

export const Comment = model("Comment", commentSchema);