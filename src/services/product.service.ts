import {Product} from "../models/Product.model";
import {createCode, createSlug, toObjID} from "../utils/utils";
import Category from "../models/Category.model";
import {APIError} from "./error.service";
import {IProduct} from "../interfaces/product.interface";

export class ProductService {
    async createProduct(productData: any): Promise<IProduct> {
        const slug = createSlug(productData.title);
        const article = createCode(10);

        const product = new Product({
            ...productData,
            slug,
            article,
            category: toObjID(productData.category),
        });

        await product.save();
        return product;
    }

    async getProductsByCategory(categorySlug: string) {
        const category = await Category.findOne({slug: categorySlug});
        if (!category) throw APIError.NotFound({message: "Категория не найдена"});

        return Product.find({category: category._id}).populate(
            "category",
            "title slug"
        );
    }

    async getProduct(slug: string) {
        return Product.findOne({slug}).populate("category", "title slug");
    }

    async getPopularProducts(limit: number = 12) {
        return Product.find().sort({totalPurchases: -1}).limit(limit);
    }

    async getProductsWithDiscount(limit: number = 12) {
        return Product.find({discount: {$gt: 0}}).limit(limit);
    }

    async getProductsByBestRating(limit: number = 12) {
        return Product.find().sort({rating: -1}).limit(limit);
    }

    async updateProduct(productID: string, updateData: any) {
        const product = await Product.findById(productID);
        if (!product) throw APIError.NotFound({message: "Товар не найден!"});

        if (updateData.title) {
            updateData.slug = createSlug(updateData.title);
        }

        Object.assign(product, updateData);
        await product.save();
        return product;
    }

    async setDiscountOnCategoryProducts(categoryID: string, discount: number) {
        return Product.updateMany(
            {category: categoryID},
            {$set: {discount}}
        );
    }

    async deleteProduct(productID: string) {
        return Product.deleteOne({_id: productID});
    }
}