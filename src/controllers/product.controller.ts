import {NextFunction, Request, Response} from "express";
import {ProductService} from "../services/product.service";

export class ProductController {
    constructor(private readonly productService: ProductService = new ProductService()) {
    }

    async createProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const product = await this.productService.createProduct(req.body);
            res.status(201).json({product});
        } catch (e) {
            next(e);
        }
    }

    async getProductsByCategory(req: Request, res: Response, next: NextFunction) {
        try {
            const products = await this.productService.getProductsByCategory(req.params.slug);
            res.status(200).json({products});
        } catch (e) {
            next(e);
        }
    }

    async getProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const product = await this.productService.getProduct(req.params.slug);
            res.status(200).json({product});
        } catch (e) {
            next(e);
        }
    }

    async getPopularProducts(req: Request, res: Response, next: NextFunction) {
        try {
            const products = await this.productService.getPopularProducts();
            res.status(200).json({products});
        } catch (e) {
            next(e);
        }
    }

    async getProductsWithDiscount(req: Request, res: Response, next: NextFunction) {
        try {
            const products = await this.productService.getProductsWithDiscount();
            res.status(200).json({products});
        } catch (e) {
            next(e);
        }
    }

    async getProductsByBestRating(req: Request, res: Response, next: NextFunction) {
        try {
            const products = await this.productService.getProductsByBestRating();
            res.status(200).json({products});
        } catch (e) {
            next(e);
        }
    }

    async updateProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const product = await this.productService.updateProduct(
                req.params.productID,
                req.body
            );
            res.status(200).json({product});
        } catch (e) {
            next(e);
        }
    }

    async setDiscountOnCategoryProducts(req: Request, res: Response, next: NextFunction) {
        try {
            const {discount} = req.body;
            const products = await this.productService.setDiscountOnCategoryProducts(
                req.params.categoryID,
                discount
            );
            res.status(200).json({products});
        } catch (e) {
            next(e);
        }
    }

    async deleteProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await this.productService.deleteProduct(req.params.productID);
            res.status(200).json(result);
        } catch (e) {
            next(e);
        }
    }
}