import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { adminMiddleware } from "../middleware/admin.middleware";
import { ProductController } from "../controllers/product.controller";

const router = express.Router();
const controller = new ProductController();

router.get("/category/:slug", controller.getProductsByCategory);
router.get("/slug/:slug", controller.getProduct);
router.get("/popular", controller.getPopularProducts);
router.get("/discounts", controller.getProductsWithDiscount);
router.get("/best-rating", controller.getProductsByBestRating);
router.get("/search", controller.searchProducts);
router.get("/search/articles/:article", controller.searchProductsByArticle);
router.get("/search/suggestions", controller.getSearchSuggestions);
router.get("/check", controller.checkProducts);

router.post("/create", [authMiddleware, adminMiddleware], controller.createProduct);
router.put("/update/:productID", [authMiddleware, adminMiddleware], controller.updateProduct);
router.put(
    "/category/:categorySlug/discount",
    [authMiddleware, adminMiddleware],
    controller.setDiscountOnCategoryProducts
);
router.delete("/delete/:productID", [authMiddleware, adminMiddleware], controller.deleteProduct);

export const productRouter = router;