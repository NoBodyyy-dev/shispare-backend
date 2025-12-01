import express from "express";
import {UserService} from "../services/user.service";
import {TokenService} from "../services/token.service";


export class UserController {
    private readonly tokenService: TokenService;

    constructor(private readonly userService: UserService = new UserService()) {
        this.tokenService = new TokenService();
    }

    getMeFunc = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
            const user = req.user;
            res.status(200).json({user});
        } catch (e) {
            next(e);
        }
    }

    updateMeFunc = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
            const user = req.user;
            await this.userService.updateUser(user!._id.toString(), req.body)
            res.status(200).json({user});
        } catch (e) {
            next(e);
        }
    }

    getAllUsersFunc = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
            const users = await this.userService.getAllUsers();
            res.status(200).json({users});
        } catch (e) {
            next(e);
        }
    }

    getAllStaffFunc = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
            const staff = await this.userService.getAllStaff();
            res.status(200).json({staff});
        } catch (e) {
            next(e);
        }
    }

    getOneUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
            const user = await this.userService.getUserById(req.params.id);
            res.status(200).json({user});
        } catch (e) {
            next(e);
        }
    }

    // Admin: list tokens for a user (device-level metadata, no raw refresh tokens)
    listUserTokens = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
            const userId = req.params.id;
            const tokens = await this.tokenService.listTokensByUser(userId);
            res.status(200).json({tokens});
        } catch (e) {
            next(e);
        }
    }

    // Admin: revoke tokens for a user, optionally by deviceId
    revokeUserTokens = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
            const userId = req.params.id;
            const deviceId = req.query.deviceId as string | undefined;
            await this.tokenService.revokeTokens(userId, deviceId);
            res.status(200).json({message: 'Токены отозваны'});
        } catch (e) {
            next(e);
        }
    }

    // Admin: ban or unban a user
    banUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
            const userId = req.params.id;
            const {banned} = req.body;

            if (typeof banned !== 'boolean') {
                res.status(400).json({success: false, message: 'banned должен быть boolean'});
                return
            }

            const user = await this.userService.banUser(userId, banned);
            res.status(200).json({
                success: true,
                message: banned ? 'Пользователь заблокирован' : 'Пользователь разблокирован',
                user
            });
        } catch (e) {
            next(e);
        }
    }
}