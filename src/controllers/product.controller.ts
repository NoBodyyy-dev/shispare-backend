import { NextFunction, Request, Response } from "express";
import { ProductService } from "../services/product.service";
import {APIError} from "../services/error.service";

export class ProductController {
    private readonly productService: ProductService = new ProductService();

    createProduct = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const files = req.files as Express.Multer.File[];
            const body = req.body;
            
            // Парсим JSON поля из FormData
            const productData: any = {
                ...body,
                color: body.color ? JSON.parse(body.color) : undefined,
                package: body.package ? JSON.parse(body.package) : undefined,
                price: body.price ? Number(body.price) : undefined,
                discount: body.discount ? Number(body.discount) : undefined,
                countInStock: body.countInStock ? Number(body.countInStock) : undefined,
                article: body.article ? Number(body.article) : undefined,
            };
            
            const product = await this.productService.createProduct(productData, files);
            res.status(201).json({ success: true, product });
        } catch (e) {
            next(e);
        }
    };

    checkProducts = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { productIds } = req.body;
            const checkedProducts = await this.productService.checkProducts(productIds);
            res.status(200).json({ success: true, products: checkedProducts });
        } catch (e) {
            next(e);
        }
    };

    getProductsByCategory = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const products = await this.productService.getProductsByCategory(req.params.slug);
            console.log("controller >>>", products);

            res.status(200).json({ success: true, products: {...products } });
        } catch (e) {
            next(e);
        }
    };

    getProduct = async (req: Request, res: Response, next: NextFunction) => {
        try {
            console.log(req.params);
            const product = await this.productService.getProduct(Number(req.params.article));
            res.status(200).json({ success: true, product });
        } catch (e) {
            next(e);
        }
    };

    getPopularProducts = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const limit = req.query.limit ? Number(req.query.limit) : 12;
            const products = await this.productService.getPopularProducts(limit);
            res.status(200).json({ success: true, products });
        } catch (e) {
            next(e);
        }
    };

    getProductsWithDiscount = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const limit = req.query.limit ? Number(req.query.limit) : 12;
            const products = await this.productService.getProductsWithDiscount(limit);
            res.status(200).json({ success: true, products });
        } catch (e) {
            next(e);
        }
    };

    getProductsByBestRating = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const limit = req.query.limit ? Number(req.query.limit) : 12;
            const products = await this.productService.getProductsByBestRating(limit);
            res.status(200).json({ success: true, products });
        } catch (e) {
            next(e);
        }
    };

    updateProduct = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const product = await this.productService.updateProduct(
                req.params.productID,
                req.body
            );
            res.status(200).json({ success: true, product });
        } catch (e) {
            next(e);
        }
    };

    searchProducts = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { q } = req.query;
            if (!q || !String(q).trim()) {
                res.status(200).json({ success: true, products: [] });
                return;
            }
            const products = await this.productService.searchProducts(String(q));
            res.status(200).json({ success: true, products });
        } catch (e) {
            next(e);
        }
    };

    searchProductsByArticle = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { article } = req.params;
            const articleNumber = Number(article);
            if (!articleNumber || articleNumber <= 0) {
                res.status(200).json({ success: true, product: null });
                return
            }
            const product = await this.productService.searchProductsByArticle(articleNumber);
            res.status(200).json({ success: true, product });
        } catch (e) {
            next(e);
        }
    };

    getSearchSuggestions = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { q } = req.query;
            if (!q || !String(q).trim()) {
                res.status(200).json({ success: true, suggestions: [] });
                return;
            }
            const suggestions = await this.productService.getSearchSuggestions(String(q));
            res.status(200).json({ success: true, suggestions });
        } catch (e) {
            next(e);
        }
    };

    setDiscountOnCategoryProducts = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { discount } = req.body;
            const result = await this.productService.setDiscountOnCategoryProducts(
                req.params.categorySlug,
                discount
            );
            res.status(200).json({ success: true, message: "Скидка установлена", result });
        } catch (e) {
            next(e);
        }
    };

    deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.productService.deleteProduct(req.params.productID);
            res.status(200).json({ success: true, message: "Товар удален", result });
        } catch (e) {
            next(e);
        }
    };
}