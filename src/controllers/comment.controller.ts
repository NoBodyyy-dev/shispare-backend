import {Request, Response, NextFunction} from "express";
import {APIError} from "../services/error.service";
import {CommentService} from "../services/comment.service";
import {User} from "node-telegram-bot-api";

export class CommentController {
    private commentService: CommentService = new CommentService();

    getProductComments = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const comments = await this.commentService.getProductComments(req.params.product);
            res.status(200).json({comments});
        } catch (e) {
            next(e);
        }
    }

    getMyComments = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const comments = this.commentService.getUserComments(req.user!._id.toString());
            res.status(200).json(comments);
        } catch (e) {
            next(e);
        }
    }

    getUserComments = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const comments = this.commentService.getUserComments(req.params.user);
            res.status(200).json(comments);
        } catch (e) {
            next(e);
        }
    }

    getComment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const comments = this.commentService.getComment(req.params.id);
            res.status(200).json(comments);
        } catch (e) {
            next(e);
        }
    }

    createComment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;
            const {product, content, rating} = req.body;
            const newComment = await this.commentService.createComment({
                owner: user!._id.toString(),
                content,
                product,
                rating
            })

            res.status(201).json({comment: newComment});
        } catch (e) {
            next(e);
        }
    }

    deleteComment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const comment = await this.commentService.deleteComment(req.params.id);
            res.status(200).json({comment});
        } catch (e) {
            next(e);
        }
    }
}