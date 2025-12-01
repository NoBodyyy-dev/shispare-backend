import {Request, Response, NextFunction} from "express";
import {APIError} from "../services/error.service";
import {CommentService} from "../services/comment.service";
import {orderService} from "../app";

export class CommentController {
    private commentService: CommentService = new CommentService();

    getProductComments = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 5;
            const result = await this.commentService.getProductComments(req.params.product, page, limit);
            res.status(200).json(result);
        } catch (e) {
            next(e);
        }
    }

    getMyComments = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const comments = await this.commentService.getUserComments(req.user!._id.toString());
            res.status(200).json({comments});
        } catch (e) {
            next(e);
        }
    }

    getUserComments = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const comments = await this.commentService.getUserComments(req.params.user);
            res.status(200).json({comments});
        } catch (e) {
            next(e);
        }
    }

    getComment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const comment = await this.commentService.getComment(req.params.id);
            if (!comment) return next(APIError.NotFound({message: "Комментарий не найден"}));
            res.status(200).json({comment});
        } catch (e) {
            next(e);
        }
    }

    createComment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;
            if (!user) {
                return next(APIError.Unauthorized({message: "Необходима авторизация"}));
            }

            const {product, content, rating} = req.body;

            // Валидация входных данных
            if (!product) {
                return next(APIError.BadRequest({message: "Не указан продукт"}));
            }
            if (!content || !content.trim()) {
                return next(APIError.BadRequest({message: "Не указан текст комментария"}));
            }
            if (!rating || rating < 1 || rating > 5) {
                return next(APIError.BadRequest({message: "Рейтинг должен быть от 1 до 5"}));
            }

            // Проверка, покупал ли пользователь этот товар
            const hasPurchased = await orderService.hasUserPurchasedProduct(
                user._id.toString(),
                product
            );

            if (!hasPurchased) {
                return next(APIError.Forbidden({
                    message: "Вы можете оставить отзыв только на товары, которые вы уже купили"
                }));
            }

            const newComment = await this.commentService.createComment({
                owner: user._id.toString(),
                content: content.trim(),
                product,
                rating: Number(rating)
            });

            const populatedComment = await this.commentService.getComment(newComment._id.toString());

            res.status(201).json({comment: populatedComment || newComment});
        } catch (e) {
            next(e);
        }
    }

    checkCanComment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;
            const {productId} = req.params;
            const hasPurchased = await orderService.hasUserPurchasedProduct(
                user!._id.toString(),
                productId
            );

            res.status(200).json({
                canComment: hasPurchased,
                reason: hasPurchased ? null : "Вы можете оставить отзыв только на товары, которые вы уже купили"
            });
        } catch (e) {
            next(e);
        }
    }

    deleteComment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {id} = req.params;
            const result = await this.commentService.deleteComment(id);
            res.status(200).json({id, deleted: result.deletedCount > 0});
        } catch (e) {
            next(e);
        }
    }
}