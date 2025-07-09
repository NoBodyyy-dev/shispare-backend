import {Request, Response, NextFunction} from "express";
import {createSlug} from "../utils/utils";
import Category from "../models/Category.model";
import {APIError} from "../services/error.service";
import {Product} from "../models/Product.model";

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
    const {title} = req.body;
    const slug = createSlug(title);

    try {
        const category = new Category({
            title,
            slug
        })
        await category.save();
        return res.status(201).json({category});
    } catch (e) {
        next(e);
    }
}

export const getAllCategories = async (_: Request, res: Response, next: NextFunction) => {
    try {
        const categories = await Category.find();
        console.log(categories);
        return res.status(200).json({categories: categories});
    } catch (e) {
        next(e);
    }
}

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
    const {title} = req.body;
    const slug: string = createSlug(req.body.slug);

    try {
        const category = await Category.findOne({_id: req.params.id});
        if (!category) return next(APIError.NotFound({message: "Категория не найдена!"}));

        category.title = title;
        category.slug = slug;

        await category.save();
        return res.status(200).json({category});
    } catch (e) {
        next(e);
    }
}

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await Promise.all([Category.deleteOne({_id: req.params.id}), Product.deleteMany({category: req.params.id})])
        return res.status(200).json({message: "Категория и все ее товары удалены!"});
    } catch (e) {
        next(e);
    }
}