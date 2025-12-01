import {Comment} from "../models/Comment.modal";
import {Product} from "../models/Product.model";
import {APIError} from "./error.service";

export class CommentService {
    async getProductComments(product: string, page: number = 1, limit: number = 5) {
        const skip = (page - 1) * limit;
        
        const [comments, total] = await Promise.all([
            Comment.find({product})
                .populate("owner", "fullName _id")
                .populate("product", "title slug _id")
                .sort({createdAt: -1})
                .skip(skip)
                .limit(limit)
                .lean(),
            Comment.countDocuments({product})
        ]);

        return {
            comments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getUserComments(owner: string) {
        return Comment.find({owner})
            .populate("owner", "fullName _id")
            .populate("product", "title slug _id")
            .sort({createdAt: -1})
            .lean();
    }

    async getComment(_id: string) {
        return Comment.findOne({_id})
            .populate("owner", "fullName _id")
            .populate("product", "title slug _id")
            .lean();
    }

    async createComment(data: { product: string, owner: string, content: string, rating: number }) {
        // Создаем комментарий
        const newComment = await Comment.create({
            owner: data.owner,
            product: data.product,
            content: data.content,
            rating: data.rating,
        });

        // Обновляем статистику продукта
        await this.updateProductRating(data.product);

        return newComment;
    }

    /**
     * Обновляет рейтинг и количество комментариев для продукта
     */
    private async updateProductRating(productId: string) {
        // Получаем все комментарии для продукта
        const comments = await Comment.find({product: productId}).select("rating").lean();
        
        if (comments.length === 0) {
            // Если комментариев нет, сбрасываем значения
            await Product.findByIdAndUpdate(productId, {
                displayedRating: 0,
                totalComments: 0,
                totalRatings: 0
            });
            return;
        }

        // Вычисляем средний рейтинг
        const totalRating = comments.reduce((sum, comment) => sum + comment.rating, 0);
        const averageRating = totalRating / comments.length;
        
        // Округляем до 1 знака после запятой
        const displayedRating = Math.round(averageRating * 10) / 10;

        // Обновляем продукт
        await Product.findByIdAndUpdate(productId, {
            displayedRating,
            totalComments: comments.length,
            totalRatings: comments.length
        });
    }

    async deleteComment(id: string) {
        const comment = await Comment.findById(id);
        if (!comment) {
            throw APIError.NotFound({message: "Комментарий не найден"});
        }

        const productId = comment.product.toString();
        
        // Удаляем комментарий
        const result = await Comment.deleteOne({_id: id});
        
        // Обновляем статистику продукта после удаления
        if (result.deletedCount > 0) {
            await this.updateProductRating(productId);
        }

        return result;
    }
}