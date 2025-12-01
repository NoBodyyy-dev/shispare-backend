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
            console.log("hahah")
            await APIError.catchError(req, res, next);
            const meta = {
                deviceId: (req.get('x-device-id') as string) || undefined,
                ip: req.ip,
                userAgent: req.get('User-Agent') || ''
            };
            const result = await this.authService.login(req.body, meta);
            if (result.success) {
                const isProd = process.env.NODE_ENV === 'production';
                res.cookie("ss_id", result.sessionToken, {
                    httpOnly: true,
                    secure: isProd,
                    signed: true,
                    maxAge: 3 * 60 * 60 * 1000,
                    sameSite: isProd ? 'none' : 'lax'
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
            const meta = {
                deviceId: (req.get('x-device-id') as string) || undefined,
                ip: req.ip,
                userAgent: req.get('User-Agent') || ''
            };
            const result = await this.authService.register(req.body, meta);
            const isProd = process.env.NODE_ENV === 'production';
            res.cookie("ss_id", result.sessionToken, {
                httpOnly: true,
                secure: isProd,
                signed: true,
                maxAge: 3 * 60 * 60 * 1000,
                sameSite: isProd ? 'none' : 'lax'
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

            const meta = {
                deviceId: (req.get('x-device-id') as string) || undefined,
                ip: req.ip,
                userAgent: req.get('User-Agent') || ''
            };

            const tokens = await this.authService.verifyCode(ss_id, code, meta);

            const isProd = process.env.NODE_ENV === 'production';
            res.cookie('refreshToken', tokens.refreshToken, {
                maxAge: 60 * 24 * 60 * 60 * 1000,
                httpOnly: true,
                secure: isProd,
                signed: true,
                sameSite: isProd ? 'none' : 'lax'
            });

            res.clearCookie('ss_id');
            res.json({accessToken: tokens.accessToken, success: true});
        } catch (e) {
            next(e);
        }
    }

    public resendCode = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const ss_id = req.signedCookies['ss_id'];
            if (!ss_id) return next(APIError.Unauthorized());
            const meta = {
                ip: req.ip,
                userAgent: req.get('User-Agent') || ''
            };
            const result = await this.authService.resendCode(ss_id);
            res.json({message: 'Код отправлен повторно', success: result.success});
        } catch (e) {
            next(e);
        }
    }

    public logoutFunc = async (req: Request, res: Response, next: NextFunction) => {
        try {
            // refresh token is stored as a signed cookie
            const refreshToken = req.signedCookies['refreshToken'];
            const meta = {deviceId: (req.get('x-device-id') as string) || undefined};
            await this.authService.logout(refreshToken, meta);
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
            const meta = {
                deviceId: (req.get('x-device-id') as string) || undefined,
                ip: req.ip,
                userAgent: req.get('User-Agent') || ''
            };
            const tokens = await this.authService.refreshToken(refreshToken, meta);
            console.log("refresh")
            const isProd = process.env.NODE_ENV === 'production';
            res.cookie('refreshToken', tokens.refreshToken, {
                maxAge: 30 * 24 * 60 * 60 * 1000,
                httpOnly: true,
                secure: isProd,
                signed: true,
                sameSite: isProd ? 'none' : 'lax'
            });

            res.json({accessToken: tokens.accessToken});
        } catch (e) {
            next(e);
        }
    }

    public checkVerifySessionFunc = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const ss_id = req.signedCookies["ss_id"];
            console.log(ss_id);
            const {success} = await this.authService.checkSession(ss_id);
            res.json({success})
        } catch (e) {
            next(e);
        }
    }
}