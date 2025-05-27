import express, {Router} from "express";
import {asyncHandler, createCode, createSlug} from "../utils/utils";
import * as controller from "../controllers/category.controller";
import authMiddleware from "../middleware/auth.middleware";
import accessMiddleware from "../middleware/admin.middleware";
import APIError from "../utils/error";
import axios from "axios";
import Category from "../models/Category.model";

const categoryRouter = Router();

categoryRouter.post("/create", [authMiddleware, accessMiddleware], asyncHandler(controller.createCategory))
categoryRouter.get("/get-all", asyncHandler(controller.getAllCategories));
categoryRouter.put("/update/:id", [authMiddleware, accessMiddleware], asyncHandler(controller.updateCategory));
categoryRouter.delete("/delete-category/:id", [authMiddleware, accessMiddleware], asyncHandler(controller.deleteCategory));

categoryRouter.post("/insert", asyncHandler(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const haha = await axios.get("http://s1-api.sikayufo.ru/catalog/group/all-list")
        if (haha.status !== 200) return next(APIError.BadRequests(`${haha.status}`))
        const insertData = (haha.data as any).data.map((d: {id: number; name: string}) => {
            return {title: d.name, slug: createSlug(d.name), group: d.id}
        })
        await Category.deleteMany();
        await Category.insertMany(insertData);
        res.status(200).send("success");
    } catch (e) {
        next(e);
    }
}))

categoryRouter.post("/insert-items", asyncHandler(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
       const cat = await Category.find();
       if (!cat) return next(APIError.NotFound("Category not found"));
        for (const c of cat) {
            const originalArray = await axios.get(`http://s1-api.sikayufo.ru/catalog?add=count&per_page=100&groupId=${c.id}&isActive=1&expand=fileCovers,fileImgs,fileDocs,uses,details,colors,items,catalogItem.pack,catalogItem.color`)
            if (!originalArray) return next(APIError.NotFound("Products not found"));
            const transformedProducts = (originalArray.data as Array<any>).map(product => {
                return {
                    title: product.name,
                    description: product.text.replace(/<[^>]*>/g, ''),
                    slug: createSlug(product.name),
                    article: createCode(10),
                    category: c._id,
                    productImages: product.fileImgs.map((img: {url: string}) => img.url),
                    countProducts: 0,
                    discount: 0,
                    rating: 0,
                    options: [],
                    colors: product.colors.map((color: {name: string}) => color.name),
                    characteristics: product.details.map((detail: {text: string}) => detail.text),
                    consumption: 0,
                    documents: product.fileDocs.map((doc: {url: string}) => doc.url),
                    totalPurchases: 0
                };
            });
        }
    } catch (e) {
        next(e);
    }
}))

export default categoryRouter;