import {Router} from "express";
import {CartController} from "../controllers/cart.controller";
import {authMiddleware} from "../middleware/auth.middleware";

export const cartRouter = Router();

const cartController = new CartController();

cartRouter.use(authMiddleware);

cartRouter.get("/get", cartController.getCart);
cartRouter.post("/add-to-cart", cartController.addToCart);
cartRouter.put("/update-quantity", cartController.updateQuantity);
cartRouter.delete("/remove-from-cart", cartController.removeFromCart);
cartRouter.delete("/clear", cartController.clearCart);
