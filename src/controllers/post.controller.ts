import {Request, Response, NextFunction} from 'express';
import {PostService} from "../services/post.service";

export class PostController {
    constructor(private readonly postService: PostService = new PostService()) {
    }

    public async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const posts = await this.postService.findAllPosts();
            res.status(200).json({posts});
        } catch (e) {
            next(e);
        }
    }

    public async getPost(req: Request, res: Response, next: NextFunction) {
        try {
            const post = await this.postService.findOnePost(req.params._id);
            res.status(200).json({post});
        } catch (e) {
            next(e);
        }
    }

    public async createPost(req: Request, res: Response, next: NextFunction) {
        try {
            const post = this.postService.createPost(req.body);
            res.status(200).json({post});
        } catch (e) {
            next(e);
        }
    }

    public async updatePost(req: Request, res: Response, next: NextFunction) {
        const post =  await this.postService.updatePost(req.params._id, req.body);
        res.status(200).json({post});
    }

    public async deletePost(req: Request, res: Response, next: NextFunction) {
        try {
            const deletePost = await this.postService.deletePost(req.params._id);
            res.status(200).json({deletePost});
        } catch (e) {
            next(e);
        }
    }
}