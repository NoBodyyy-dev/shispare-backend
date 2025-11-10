import {IProduct, IVariant, Product} from "../models/Product.model";
import {Category} from "../models/Category.model";
import {createSlug} from "../utils/utils";
import {APIError} from "./error.service";

export class ProductService {
    async checkProducts(productIds: string[]): Promise<IProduct[]> {
        if (!Array.isArray(productIds) || productIds.length === 0)
            throw APIError.BadRequest({message: "Передайте массив productIds"});

        return Product.find({_id: {$in: productIds}}).lean();
    }

    async createProduct(data: {
        title: string;
        description?: string;
        categorySlug: string;
        country?: string;
        images?: string[];
        variants?: IVariant[];
        shelfLife?: string;
        characteristics?: string[];
        documents?: string[];
        article?: number;
        price?: number;
        color?: { ru: string; hex: string };
        package?: { type: string; count: number; unit: string };
        discount?: number;
        countInStock?: number;
    }): Promise<IProduct> {
        const category = await Category.findOne({slug: data.categorySlug});
        if (!category) throw APIError.NotFound({message: "Категория не найдена"});

        const slug = createSlug(`${data.title}-${data.country || ""}`);

        const variants: IVariant[] = data.variants && data.variants.length
            ? data.variants
            : [
                {
                    article: data.article!,
                    price: data.price!,
                    color: data.color!,
                    package: data.package!,
                    discount: data.discount || 0,
                    countInStock: data.countInStock || 0,
                },
            ];

        const product = new Product({
            title: data.title,
            description: data.description || "",
            slug,
            category: category._id,
            country: data.country,
            images: data.images || [],
            variants,
            shelfLife: data.shelfLife || "",
            characteristics: data.characteristics || [],
            documents: data.documents || [],
            isActive: true,
            displayedRating: 0,
            totalComments: 0,
            totalRatings: 0,
            totalPurchases: 0,
        });

        await product.save();
        return product;
    }

    async getProductsByCategory(categorySlug: string) {
        const category = await Category.findOne({slug: categorySlug}).select("_id");
        if (!category) throw APIError.NotFound({message: "Категория не найдена"});

        const products = await Product
            .find({category: category._id, isActive: true})
            .lean();

        return {products};
    }

    async getProduct(article: number) {
        console.log(article);
        const product = await Product.findOne({"variants.article": article, isActive: true}).lean();
        console.log(product);
        if (!product) throw APIError.NotFound({message: "Товар не найден"});
        return product;
    }

    async getPopularProducts(limit = 12) {
        return Product.find({isActive: true})
            .populate("category")
            .sort({totalPurchases: -1})
            .limit(limit)
            .lean();
    }

    async getProductsWithDiscount(limit = 12) {
        return Product.find({
            isActive: true,
            "variants.discount": {$gt: 0},
        })
            .populate("category")
            .limit(limit)
            .lean();
    }

    async getProductsByBestRating(limit = 12) {
        return Product.find({
            displayedRating: {$gt: 0},
            isActive: true,
        })
            .populate("category")
            .sort({displayedRating: -1})
            .limit(limit)
            .lean();
    }

    async updateProduct(productId: string, updateData: Partial<IProduct>) {
        if (updateData.title) updateData.slug = createSlug(updateData.title);
        const product = await Product.findByIdAndUpdate(productId, updateData, {new: true});
        if (!product) throw APIError.NotFound({message: "Товар не найден"});
        return product.toObject();
    }

    async searchProducts(query: string) {
        if (!query) return [];

        let results = await Product.find(
            {$text: {$search: query}, isActive: true},
            {score: {$meta: "textScore"}}
        )
            .sort({score: {$meta: "textScore"}})
            .limit(10)
            .select("title slug images variants characteristics")
            .lean();

        if (!results.length) {
            const regex = new RegExp(query, "i");
            results = await Product.find({
                isActive: true,
                $or: [
                    {title: regex},
                    {description: regex},
                    {characteristics: regex},
                    {"variants.color.ru": regex},
                    {"variants.article": Number(query) || -1},
                ],
            })
                .limit(10)
                .select("title slug images variants characteristics")
                .lean();
        }

        return results;
    }

    async searchProductsByArticle(article: number) {
        return Product.findOne({
            "variants.article": article,
            isActive: true,
        }).lean();
    }

    async getSearchSuggestions(query: string) {
        if (!query) return [];
        const regex = new RegExp(query, "i");
        return Product.find({title: regex, isActive: true})
            .limit(5)
            .select("title slug images characteristics")
            .lean();
    }

    async setDiscountOnCategoryProducts(categorySlug: string, discount: number) {
        const category = await Category.findOne({slug: categorySlug});
        if (!category) throw APIError.NotFound({message: "Категория не найдена"});

        return Product.updateMany(
            {category: category._id},
            {$set: {"variants.$[].discount": discount}}
        );
    }

    async deleteProduct(productId: string) {
        return Product.deleteOne({_id: productId});
    }

    async incrementPurchaseCount(productId: string, quantity = 1) {
        return Product.findByIdAndUpdate(
            productId,
            {$inc: {totalPurchases: quantity}},
            {new: true}
        );
    }

    async updateProductRating(productId: string, newRating: number) {
        const product = await Product.findById(productId);
        if (!product) throw APIError.NotFound({message: "Товар не найден"});

        const totalRatings = product.totalRatings + 1;
        const totalRatingSum =
            product.displayedRating * product.totalRatings + newRating;
        const displayedRating = totalRatingSum / totalRatings;

        product.totalRatings = totalRatings;
        product.displayedRating = Math.round(displayedRating * 10) / 10;

        await product.save();
        return product;
    }

    async incrementCommentCount(productId: string) {
        return Product.findByIdAndUpdate(
            productId,
            {$inc: {totalComments: 1}},
            {new: true}
        );
    }

    async checkStock(productId: string, variantArticle: number, quantity: number) {
        const product = await Product.findById(productId).lean();
        if (!product) throw APIError.NotFound({message: "Товар не найден"});

        const variant = product.variants.find(v => v.article === variantArticle);
        if (!variant) throw APIError.NotFound({message: "Вариант не найден"});

        return variant.countInStock >= quantity;
    }

    async updateStock(productId: string, variantArticle: number, newCount: number) {
        return Product.updateOne(
            {_id: productId, "variants.article": variantArticle},
            {$set: {"variants.$.countInStock": newCount}}
        );
    }

    async decreaseStock(productId: string, variantArticle: number, quantity: number) {
        return Product.updateOne(
            {_id: productId, "variants.article": variantArticle},
            {$inc: {"variants.$.countInStock": -quantity}}
        );
    }
}