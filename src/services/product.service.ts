import {IProduct, IVariant, Product} from "../models/Product.model";
import {Category} from "../models/Category.model";
import {createSlug} from "../utils/utils";
import {APIError} from "./error.service";
import {CloudService} from "./cloud.service";

export class ProductService {
    private cloudService = new CloudService();
    private readonly categoryFields = "name slug title level";

    async checkProducts(productIds: string[]): Promise<IProduct[]> {
        if (!Array.isArray(productIds) || productIds.length === 0)
            throw APIError.BadRequest({message: "Передайте массив productIds"});

        return Product.find({_id: {$in: productIds}})
            .populate("category", this.categoryFields)
            .populate("subcategory", this.categoryFields)
            .lean();
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
    }, files?: Express.Multer.File[]): Promise<IProduct> {
        const category = await Category.findOne({slug: data.categorySlug});
        if (!category) throw APIError.NotFound({message: "Категория не найдена"});

        const slug = createSlug(`${data.title}-${data.country || ""}`);

        let imageUrls: string[] = data.images || [];
        if (files && files.length > 0) {
            const uploadPromises = files.map(file => 
                this.cloudService.uploadBuffer(file.buffer, {folder: "products"})
            );
            const uploadResults = await Promise.all(uploadPromises);
            imageUrls = uploadResults.map(result => result.secure_url) as string[];
        }

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
            images: imageUrls,
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
        await product.populate("category", this.categoryFields);
        await product.populate("subcategory", this.categoryFields);
        return product.toObject();
    }

    async getProductsByCategory(
        categorySlug: string,
        filters: Record<string, unknown> = {}
    ) {
        const category = await Category.findOne({slug: categorySlug});
        if (!category) throw APIError.NotFound({message: "Категория не найдена"});

        const products = await Product
            .find({category: category._id.toString(), isActive: true})
            .populate("category", this.categoryFields)
            .populate("subcategory", this.categoryFields)
            .lean();

        const priceMin = this.parseNumber(filters.priceMin, 0);
        const priceMax = this.parseNumber(filters.priceMax, Number.MAX_SAFE_INTEGER);
        const color = this.parseStringFilter(filters.color);
        const packageType = this.parseStringFilter(filters.packageType);
        const requireStock = this.parseBooleanFilter(filters.inStock, false);
        const sort = this.parseSort(filters.sort);

        const filtered = products
            .map(product => {
                const variants = (product.variants || []).filter(variant => {
                    if (typeof variant.price !== "number") return false;
                    if (variant.price < priceMin || variant.price > priceMax) return false;
                    if (color && variant?.color?.ru !== color) return false;
                    if (packageType && variant?.package?.type !== packageType) return false;
                    if (requireStock && (variant?.countInStock ?? 0) <= 0) return false;
                    return true;
                });

                return {
                    ...product,
                    variants,
                };
            })
            .filter(product => product.variants.length > 0);

        const sortByPrice = (item: any, mode: "min" | "max") => {
            const prices = item.variants.map((v: any) => (typeof v.price === "number" ? v.price : 0));
            if (!prices.length) return 0;
            return mode === "max" ? Math.max(...prices) : Math.min(...prices);
        };

        const sortByStock = (item: any) =>
            item.variants.reduce((sum: number, variant: any) => sum + (variant.countInStock || 0), 0);

        filtered.sort((a, b) => {
            switch (sort) {
                case "price-desc":
                    return sortByPrice(b, "max") - sortByPrice(a, "max");
                case "stock-asc":
                    return sortByStock(a) - sortByStock(b);
                case "stock-desc":
                    return sortByStock(b) - sortByStock(a);
                case "rating-desc":
                    return (b.displayedRating || 0) - (a.displayedRating || 0);
                case "rating-asc":
                    return (a.displayedRating || 0) - (b.displayedRating || 0);
                case "price-asc":
                default:
                    return sortByPrice(a, "min") - sortByPrice(b, "min");
            }
        });

        return filtered;
    }

    private parseNumber(value: unknown, fallback: number): number {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "string" && value.trim().length > 0) {
            const parsed = Number(value);
            if (!Number.isNaN(parsed)) return parsed;
        }
        return fallback;
    }

    private parseStringFilter(value: unknown): string | undefined {
        if (typeof value !== "string") return undefined;
        const normalized = value.trim();
        return normalized && normalized !== "all" ? normalized : undefined;
    }

    private parseBooleanFilter(value: unknown, fallback: boolean): boolean {
        if (typeof value === "boolean") return value;
        if (typeof value === "string") {
            return ["true", "1", "yes", "on"].includes(value.toLowerCase());
        }
        return fallback;
    }

    private parseSort(value: unknown): string {
        if (typeof value !== "string") return "price-asc";
        const allowed = new Set(["price-asc", "price-desc", "stock-asc", "stock-desc", "rating-asc", "rating-desc"]);
        return allowed.has(value) ? value : "price-asc";
    }

    async getProduct(article: number) {
        const product = await Product.findOne({"variants.article": article, isActive: true})
            .populate("category", this.categoryFields)
            .populate("subcategory", this.categoryFields)
            .lean();
        if (!product) throw APIError.NotFound({message: "Товар не найден"});
        return product;
    }

    async getPopularProducts(limit = 12) {
        return Product.find({isActive: true})
            .populate("category", this.categoryFields)
            .populate("subcategory", this.categoryFields)
            .sort({totalPurchases: -1})
            .limit(limit)
            .lean();
    }

    async getProductsWithDiscount(limit = 12) {
        return Product.find({
            isActive: true,
            "variants.discount": {$gt: 0},
        })
            .populate("category", this.categoryFields)
            .populate("subcategory", this.categoryFields)
            .limit(limit)
            .lean();
    }

    async getProductsByBestRating(limit = 12) {
        return Product.find({
            displayedRating: {$gt: 0},
            isActive: true,
        })
            .populate("category", this.categoryFields)
            .populate("subcategory", this.categoryFields)
            .sort({displayedRating: -1})
            .limit(limit)
            .lean();
    }

    async updateProduct(productId: string, updateData: Partial<IProduct>) {
        if (updateData.title) updateData.slug = createSlug(updateData.title);
        const product = await Product.findByIdAndUpdate(productId, updateData, {new: true})
            .populate("category", this.categoryFields)
            .populate("subcategory", this.categoryFields);
        if (!product) throw APIError.NotFound({message: "Товар не найден"});
        return product.toObject();
    }

    async searchProducts(query: string) {
        if (!query || !query.trim()) return [];

        const searchQuery = query.trim();
        const regex = new RegExp(searchQuery, "i");
        const articleNumber = Number(searchQuery);
        const isArticleSearch = !isNaN(articleNumber) && articleNumber > 0;

        const searchConditions: any = {
            isActive: true,
            $or: [
                {title: regex},
                {description: regex},
                {characteristics: {$in: [regex]}},
                {"variants.color.ru": regex},
            ],
        };

        // Если запрос - число, добавляем поиск по артикулу
        if (isArticleSearch) {
            searchConditions.$or.push({"variants.article": articleNumber});
        }

        const results = await Product.find(searchConditions)
            .populate("category", this.categoryFields)
            .populate("subcategory", this.categoryFields)
            .limit(50)
            .select("title slug images variants characteristics category subcategory")
            .lean();

        // Если поиск по артикулу и ничего не найдено, пробуем точный поиск
        if (isArticleSearch && results.length === 0) {
            const exactMatch = await Product.findOne({
                "variants.article": articleNumber,
                isActive: true,
            })
                .populate("category", this.categoryFields)
                .populate("subcategory", this.categoryFields)
                .select("title slug images variants characteristics category subcategory")
                .lean();
            
            if (exactMatch) {
                return [exactMatch];
            }
        }

        return results;
    }

    async searchProductsByArticle(article: number) {
        if (!article || article <= 0) {
            return null;
        }
        
        return Product.findOne({
            "variants.article": article,
            isActive: true,
        })
            .populate("category", this.categoryFields)
            .populate("subcategory", this.categoryFields)
            .lean();
    }

    async getSearchSuggestions(query: string) {
        if (!query || !query.trim()) return [];
        
        const searchQuery = query.trim();
        const regex = new RegExp(searchQuery, "i");
        const articleNumber = Number(searchQuery);
        const isArticleSearch = !isNaN(articleNumber) && articleNumber > 0;

        const searchConditions: any = {
            isActive: true,
            $or: [
                {title: regex},
                {description: regex},
                {"variants.color.ru": regex},
            ],
        };

        // Если запрос - число, добавляем поиск по артикулу
        if (isArticleSearch) {
            searchConditions.$or.push({"variants.article": articleNumber});
        }

        const products = await Product.find(searchConditions)
            .populate("category", this.categoryFields)
            .populate("subcategory", this.categoryFields)
            .limit(5)
            .select("title slug images variants characteristics category subcategory")
            .lean();

        // Добавляем variantIndex для каждого продукта
        return products.map((product: any) => {
            let variantIndex = 0;
            
            // Если поиск по артикулу, находим индекс варианта с этим артикулом
            if (isArticleSearch && product.variants) {
                const foundIndex = product.variants.findIndex((v: any) => v.article === articleNumber);
                if (foundIndex !== -1) {
                    variantIndex = foundIndex;
                }
            }
            
            return {
                ...product,
                variantIndex,
            };
        });
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