import Post from "../models/Post.model";
import {APIError} from "./error.service";
import {NextFunction} from "express";
import {createSlug} from "../utils/utils";

interface PostData {
    title: string;
    description: string;
    image: string;
}

export class PostService {
    constructor() {
    }

    public async findAllPosts() {
        return Post.find();
    }

    public async findOnePost(_id: string) {
        return Post.findById(_id);
    }

    public async createPost(data: PostData) {
        const slug = createSlug(data.title);
        return Post.create({...data, slug});
    }

    public async updatePost(_id: string, data: PostData) {
        const post = await this.findOnePost(_id);
        if (!post) throw APIError.NotFound({message: "Пост не найден"});
        post.title = data.title;
        post.description = data.description;
        post.image = data.image;

        await post.save();
    }

    public async deletePost(_id: string) {
        return Post.deleteOne({_id})
    }
}