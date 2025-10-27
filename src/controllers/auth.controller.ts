import {Request, Response, NextFunction} from "express";
import {AuthService} from "../services/auth.service";
import {APIError} from "../services/error.service"

export class AuthController {
    private readonly authService: AuthService

    constructor() {
        this.authService = new AuthService();
    }

    public loginFunc = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await APIError.catchError(req, res, next);
            const result = await this.authService.login(req.body);
            if (result.success) {
                res.cookie("ss_id", result.sessionToken, {
                    httpOnly: true,
                    secure: false,
                    signed: true,
                    maxAge: 3 * 60 * 60 * 1000,
                    sameSite: 'lax'
                });
                res.status(200).json({message: "Подтвердите почту!", success: result.success});
            } else {
                res.status(400).json({message: "Пользователь не найден!"})
            }
        } catch (e) {
            next(e);
        }
    }

    public registerFunc = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const isValid = await APIError.catchError(req, res, next);
            if (!isValid) return;
            const result = await this.authService.register(req.body);
            res.cookie("ss_id", result.sessionToken, {
                httpOnly: true,
                secure: false,
                signed: true,
                maxAge: 3 * 60 * 60 * 1000,
                sameSite: 'lax'
            });
            res.status(200).json({message: "Подтвердите почту!"})
        } catch (e) {
            next(e);
        }
    }

    public verifyCode = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const ss_id = req.signedCookies["ss_id"];
            const {code} = req.body;

            const tokens = await this.authService.verifyCode(ss_id, code);

            res.cookie('refreshToken', tokens.refreshToken, {
                maxAge: 60 * 24 * 60 * 60 * 1000,
                httpOnly: true,
                secure: false,
                signed: true,
                sameSite: 'lax'
            });

            res.clearCookie('ss_id');
            res.json({accessToken: tokens.accessToken, success: true});
        } catch (e) {
            next(e);
        }
    }

    public logoutFunc = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {refreshToken} = req.cookies
            await this.authService.logout(refreshToken);
            res.clearCookie('refreshToken');
            req.headers.authorization = undefined;
            res.json({message: "Success logout"})
        } catch (e) {
            next(e);
        }
    }

    public refreshFunc = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const refreshToken = req.signedCookies['refreshToken'];
            const tokens = await this.authService.refreshToken(refreshToken);
            console.log("refresh")
            res.cookie('refreshToken', tokens.refreshToken, {
                maxAge: 30 * 24 * 60 * 60 * 1000,
                httpOnly: true,
                secure: true,
                signed: true
            });

            res.json({accessToken: tokens.accessToken});
        } catch (e) {
            next(e);
        }
    }
}