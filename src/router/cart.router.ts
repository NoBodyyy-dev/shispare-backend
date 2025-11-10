import { Router } from "express";
import { CartController } from "../controllers/cart.controller";
import { authMiddleware } from "../middleware/auth.middleware";

export const cartRouter = Router();
const cartController = new CartController();

cartRouter.use(authMiddleware);

cartRouter.get("/get", cartController.getCart);
cartRouter.post("/add", cartController.addToCart);
cartRouter.put("/update", cartController.updateQuantity);
cartRouter.delete("/remove", cartController.removeFromCart);
cartRouter.delete("/clear", cartController.clearCart);
cartRouter.post("/sync", cartController.syncCart);