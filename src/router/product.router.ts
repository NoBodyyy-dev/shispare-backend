import express from 'express';
import {authMiddleware} from "../middleware/auth.middleware";
import {adminMiddleware} from "../middleware/admin.middleware";
import {ProductController} from "../controllers/product.controller";

const productController = new ProductController();
export const productRouter = express.Router();

productRouter.post("/create-product", productController.createProduct)
productRouter.post("/check", productController.checkProducts)

productRouter.get('/get-products-by-category/:slug', productController.getProductsByCategory)
productRouter.get("/get-product/:slug", productController.getProduct);
productRouter.get("/get-best-rating-products", productController.getProductsByBestRating)
productRouter.get("/get-popular-products", productController.getPopularProducts);
productRouter.get("/get-products-with-discount", productController.getProductsWithDiscount);

productRouter.put("/set-discount/:categoryID", [authMiddleware, adminMiddleware], productController.setDiscountOnCategoryProducts)
productRouter.put("/update-product/:productID", [authMiddleware, adminMiddleware], productController.updateProduct);

productRouter.delete("/delete-product/:productID", [authMiddleware, adminMiddleware], productController.deleteProduct);


