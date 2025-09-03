import {NextFunction, Request, Response} from "express";
import {ProductService} from "../services/product.service";

export class ProductController {
    constructor(private readonly productService: ProductService = new ProductService()) {
    }

    createProduct = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const product = await this.productService.createProduct(req.body);
            res.status(201).json({product});
        } catch (e) {
            next(e);
        }
    }

    checkProducts = async (req: Request, res: Response, next: NextFunction) => {
        try {
            console.log(req.body);
            const {productIds} = req.body;
            const checkedProducts = await this.productService.checkProducts(productIds);
            console.log(checkedProducts);
            res.status(200).json({products: checkedProducts});
        } catch (e) {
            next(e);
        }
    }

    getProductsByCategory = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const products = await this.productService.getProductsByCategory(req.params.slug);
            res.status(200).json({products});
        } catch (e) {
            next(e);
        }
    }

    getProduct = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const product = await this.productService.getProduct(req.params.slug);
            res.status(200).json({product});
        } catch (e) {
            next(e);
        }
    }

    getPopularProducts = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const products = await this.productService.getPopularProducts();
            res.status(200).json({products});
        } catch (e) {
            next(e);
        }
    }

    getProductsWithDiscount = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const products = await this.productService.getProductsWithDiscount();
            res.status(200).json({products});
        } catch (e) {
            next(e);
        }
    }

    getProductsByBestRating = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const products = await this.productService.getProductsByBestRating();
            res.status(200).json({products});
        } catch (e) {
            next(e);
        }
    }

    updateProduct = async (req: Request, res: Response, next: NextFunction) => {
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

    setDiscountOnCategoryProducts = async (req: Request, res: Response, next: NextFunction) => {
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

    deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.productService.deleteProduct(req.params.productID);
            res.status(200).json(result);
        } catch (e) {
            next(e);
        }
    }
}