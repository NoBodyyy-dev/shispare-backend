import {Request} from "express";
import {IUser} from "./src/models/User.model"

declare module "express-serve-static-core" {
    interface Request {
        user?: IUser,
        access?: boolean
    }
}

declare module "socket.io" {
    interface Socket {
        user?: IUser,
    }
}