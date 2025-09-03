import express from "express";
import {UserService} from "../services/user.service";


export class UserController {
    constructor(private readonly userService: UserService = new UserService()) {
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

    getOneUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
            const user = await this.userService.getUserById(req.params.id);
            res.status(200).json({user});
        } catch (e) {
            next(e);
        }
    }
}