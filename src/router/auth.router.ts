import {Router} from "express";
import {asyncHandler} from "../utils/utils";
import {check} from "express-validator"
import {AuthController} from "../controllers/auth.controller";

const authRouter = Router();
const authController = new AuthController();

authRouter.post("/register", authController.registerFunc);
authRouter.post("/login", authController.loginFunc);
authRouter.post("/verify", [
    check("code").isNumeric().notEmpty()
], asyncHandler(authController.verifyCode));
authRouter.post("/logout", authController.logoutFunc)

authRouter.get("/refresh", authController.refreshFunc);

export default authRouter;

