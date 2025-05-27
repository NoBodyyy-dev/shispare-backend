import {AuthService} from "../services/auth.service";
import {Request, Response, NextFunction} from "express";
import {APIError} from "../services/error.service"

export class AuthController {
    constructor(private readonly authService: AuthService = new AuthService()) {
    }

    public async loginFunc(req: Request, res: Response, next: NextFunction) {
        try {
            await APIError.catchError(req, res, next);
            const result = await this.authService.login(req.body);
            res.cookie("ss_id", result.sessionToken, {
                httpOnly: true,
                secure: true,
                signed: true,
                maxAge: 3 * 60 * 60 * 1000,
                sameSite: 'strict'
            });
            res.status(200).json({message: "Подтвердите почту!"})
        } catch (e) {
            next(e);
        }
    }

    public async registerFunc(req: Request, res: Response, next: NextFunction) {
        try {
            await APIError.catchError(req, res, next);
            const result = await this.authService.register(req.body);
            res.cookie("ss_id", result.sessionToken, {
                httpOnly: true,
                secure: true,
                signed: true,
                maxAge: 3 * 60 * 60 * 1000,
                sameSite: 'strict'
            });
            res.status(200).json({message: "Подтвердите почту!"})
        } catch (e) {
            next(e);
        }
    }

    public async verifyCode(req: Request, res: Response, next: NextFunction) {
        try {
            const ss_id = req.signedCookies["ss_id"];
            const { code } = req.body;

            const tokens = await this.authService.verifyCode(ss_id, code);

            res.cookie('refreshToken', tokens.refreshToken, {
                maxAge: 60 * 24 * 60 * 60 * 1000,
                httpOnly: true,
                secure: true,
                signed: true
            });

            res.clearCookie('ss_id');
            res.json({ accessToken: tokens.accessToken });
        } catch (e) {
            next(e);
        }
    }

    public async logoutFunc(req: Request, res: Response, next: NextFunction) {
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

    public async refreshFunc(req: Request, res: Response, next: NextFunction) {
        try {
            const refreshToken = req.signedCookies['refreshToken'];
            const tokens = await this.authService.refreshToken(refreshToken);

            res.cookie('refreshToken', tokens.refreshToken, {
                maxAge: 60 * 24 * 60 * 60 * 1000,
                httpOnly: true,
                secure: true,
                signed: true
            });

            res.json({ accessToken: tokens.accessToken });
        } catch (e) {
            next(e);
        }
    }
}