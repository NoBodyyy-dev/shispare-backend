import {Router} from "express";
import {asyncHandler} from "../utils/utils";
import {check} from "express-validator"
import {AuthController} from "../controllers/auth.controller";

export const authRouter = Router();
const authController = new AuthController();

authRouter.post("/register", authController.registerFunc);
authRouter.post("/login", authController.loginFunc);
authRouter.post("/verify", [
    check("code").isNumeric().notEmpty()
], asyncHandler(authController.verifyCode));
authRouter.post("/resend", asyncHandler(authController.resendCode));
authRouter.post("/logout", authController.logoutFunc)
authRouter.post("/check-verify", authController.checkVerifySessionFunc)

authRouter.get("/refresh", authController.refreshFunc);
