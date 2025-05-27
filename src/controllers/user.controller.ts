import express from "express";
import {UserService} from "../services/user.service";


export class UserController {
    constructor(private readonly userService: UserService = new UserService()) {
    }

    async getMeFunc(req: express.Request, res: express.Response, next: express.NextFunction) {
        try {
            const user = req.user;
            res.status(200).json({user});
        } catch (e) {
            next(e);
        }
    }

    async updateMeFunc(req: express.Request, res: express.Response, next: express.NextFunction) {
        try {
            const user = req.user;
            await this.userService.updateUser(user!._id.toString(), req.body)
            res.status(200).json({user});
        } catch (e) {
            next(e);
        }
    }
}