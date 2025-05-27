import {Router} from "express";
import cartRouter from "./cart.router";
import productRouter from "./product.router";
import authRouter from "./auth.router";
import categoryRouter from "./category.router";
import blogRouter from "./blog.router";
import {orderRouter} from "./order.router";

export const router: Router = Router();

router.use("/auth", authRouter);
router.use("/blog", blogRouter);
router.use("/cart", cartRouter);
router.use("/category", categoryRouter);
router.use("/order", orderRouter);
router.use("/product", productRouter);
