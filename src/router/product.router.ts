import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { adminMiddleware } from "../middleware/admin.middleware";
import { ProductController } from "../controllers/product.controller";
import multer from "multer";

const router = express.Router();
const controller = new ProductController();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/category/:slug", controller.getProductsByCategory);
router.get("/get-one/:article", controller.getProduct);
router.get("/popular", controller.getPopularProducts);
router.get("/discounts", controller.getProductsWithDiscount);
router.get("/best-rating", controller.getProductsByBestRating);
// Более специфичные роуты должны быть объявлены раньше общих
router.get("/search/suggestions", controller.getSearchSuggestions);
router.get("/search/articles/:article", controller.searchProductsByArticle);
router.get("/search", controller.searchProducts);
router.post("/check", controller.checkProducts);

router.post("/create", [authMiddleware, adminMiddleware], upload.array("images", 10), controller.createProduct);
router.put("/update/:productID", [authMiddleware, adminMiddleware], controller.updateProduct);
router.put(
    "/category/:categorySlug/discount",
    [authMiddleware, adminMiddleware],
    controller.setDiscountOnCategoryProducts
);
router.delete("/delete/:productID", [authMiddleware, adminMiddleware], controller.deleteProduct);

export const productRouter = router;