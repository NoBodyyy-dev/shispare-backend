import {Request, Response, NextFunction} from "express";
import Post from "../models/Post.model";
import {createSlug} from "../utils/utils";
import {APIError} from "../services/error.service";

export const getAllPosts = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const posts = await Post.find({});
        return res.status(200).json({posts});
    } catch (e) {
        next(e);
    }
};

export const getPost = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const post = await Post.find({slug: req.params.slug});
        if (!post) return next(APIError.NotFound({message: "Пост не найден"}));
        return res.status(200).json({post});
    } catch (e) {
        next(e);
    }
};

export const createCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const {title, description, image} = req.body;
    const slug = createSlug(title);

    try {
        const category = new Post({
            title,
            description,
            image,
            slug,
        });
        await category.save();
        return res.status(201).json({category});
    } catch (e) {
        next(e);
    }
};

export const updatePost = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const {title, description, image} = req.body;

    try {
        const post = await Post.findOne({_id: req.params.id});
        if (!post) return next(APIError.NotFound({message: "Пост не найден!"}));

        post.title = title;
        post.description = description;
        post.image = image;

        await post.save();
        return res.status(200).json({post});
    } catch (e) {
        next(e);
    }
};

export const deletePost = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        await Promise.all([Post.deleteOne({_id: req.params.id})]);
        return res.status(200).json({message: "Пост удален!"});
    } catch (e) {
        next(e);
    }
};
