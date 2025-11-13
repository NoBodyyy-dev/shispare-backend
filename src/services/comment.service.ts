import {Comment} from "../models/Comment.modal";
import {APIError} from "./error.service";

export class CommentService {
    async getProductComments(product: string) {
        return Comment.find({product})
            .populate("owner", "fullName _id")
            .populate("product", "title slug _id")
            .sort({createdAt: -1});
    }

    async getUserComments(owner: string) {
        return Comment.find({owner})
            .populate("owner", "fullName _id")
            .populate("product", "title slug _id")
            .sort({createdAt: -1});
    }

    async getComment(_id: string) {
        return Comment.findOne({_id});
    }

    async createComment(data: { product: string, owner: string, content: string, rating: number }) {
        return await Comment.create({
            product: data.product,
            owner: data.owner,
            content: data.content,
            rating: data.rating,
        });
    }

    async deleteComment(id: string) {
        return Comment.deleteOne({_id: id});
    }
}