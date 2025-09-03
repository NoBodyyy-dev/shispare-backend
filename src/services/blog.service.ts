import {NextFunction} from "express";
import Post from "../models/Post.model";
import {APIError} from "./error.service";
import {createSlug} from "../utils/utils";
import {CloudService} from "./cloud.service";

export class BlogService {
    private cloudService = new CloudService()
    async getAllPosts() {
        return Post.find({});
    }

    async getPost(slug: string) {
        const post = await Post.findOne({slug});
        if (!post) throw APIError.NotFound({message: "Пост не найден!"});
        return post;
    }

    async createPost(payload: { title: string; content: string }, file: Express.Multer.File) {
        if (!file) throw APIError.BadRequest({message: "Файл изображения обязателен"});

        const uploadResult = await this.cloudService.uploadBuffer(file.buffer, {folder: "posts"});

        const slug = createSlug(payload.title);

        return Post.create({
            ...payload,
            image: uploadResult.secure_url,
            slug,
        });
    }

    /**
     * Обновить пост. Если передан новый файл, загружаем в Cloudinary
     */
    async updatePost(
        postId: string,
        payload: { title: string; content: string },
        file?: Express.Multer.File
    ) {
        const updateData: any = {
            ...payload,
            slug: createSlug(payload.title),
        };

        if (file) {
            const uploadResult = await this.cloudService.uploadBuffer(file.buffer, {folder: "posts"});
            updateData.image = uploadResult.secure_url;
        }

        return Post.findOneAndUpdate({_id: postId}, updateData, {new: true});
    }

    async deletePost(postId: string) {
        return Post.deleteOne({_id: postId});
    }
}