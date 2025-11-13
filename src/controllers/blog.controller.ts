import {Request, Response, NextFunction} from "express";
import Post from "../models/Post.model";
import {createSlug} from "../utils/utils";
import {APIError} from "../services/error.service";
import {BlogService} from "../services/blog.service";

export class BlogController {
    private readonly blogService = new BlogService();

    // Use consistent method syntax - either all arrow functions or all traditional methods
    getAllPosts = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const posts = await this.blogService.getAllPosts();
            res.status(200).json({posts});
        } catch (e) {
            next(e);
        }
    }

    getPost = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const post = await this.blogService.getPost(req.params.slug);
            res.status(200).json({post});
        } catch (e) {
            next(e);
        }
    }

    createPost = async (req: Request, res: Response, next: NextFunction) => {
        try {
            console.log(req.body, req.file)
            if (!req.file) {
                return res.status(400).json({ message: "Файл изображения обязателен" });
            }

            const post = await this.blogService.createPost(req.body, req.file);
            res.status(200).json({ post });
        } catch (err) {
            next(err);
        }
    };

    updatePost = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const post = await this.blogService.updatePost(req.params.id, req.body);
            res.status(200).json({post});
        } catch (e) {
            next(e);
        }
    }

    deletePost = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const post = await this.blogService.deletePost(req.params.id);
            res.status(200).json({post});
        } catch (e) {
            next(e);
        }
    }
}