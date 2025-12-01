import {Router} from "express";
import {cartRouter} from "./cart.router";
import {productRouter} from "./product.router";
import {authRouter} from "./auth.router";
import {categoryRouter} from "./category.router";
import {blogRouter} from "./blog.router";
import {orderRouter} from "./order.router";
import {userRouter} from "./user.router";
import {commentRouter} from "./comment.router";
import {parserRouter} from "./parser.router";
import {stockRouter} from "./stock.router";
import {postRouter} from "./post.router";
import {paymentRouter} from "./payment.router";
import {requestRouter} from "./request.router";
import {chatRouter} from "./chat.router";
import {solutionRouter} from "./solution.router";

export const router: Router = Router();

// Публичные роуты (без авторизации)
router.use("/auth", authRouter);
router.use("/product", productRouter);
router.use("/category", categoryRouter);
router.use("/blog", blogRouter);
router.use("/solution", solutionRouter);
router.use("/stock", stockRouter);
router.use("/post", postRouter);
router.use("/request", requestRouter);
router.use("/comment", commentRouter);
router.use("/payment", paymentRouter);

router.use("/user", userRouter);
router.use("/user/cart", cartRouter);
router.use("/user/order", orderRouter);
router.use("/user/chat", chatRouter);

router.use("/admin/product", productRouter);
router.use("/admin/category", categoryRouter);
router.use("/admin/blog", blogRouter);
router.use("/admin/solution", solutionRouter);
router.use("/admin/request", requestRouter);
router.use("/admin/comment", commentRouter);
router.use("/admin/user", userRouter);
router.use("/admin/stock", stockRouter);
router.use("/admin/post", postRouter);
router.use("/admin/parse", parserRouter);

