import * as dotenv from "dotenv";

dotenv.config();
import express from "express";
import mongoose from "mongoose";
import * as http from "node:http";
import cors from "cors";
import cookieParser from "cookie-parser";
import {Server} from "socket.io";
import config from "./config/config";
import bot from "./bot"
// import {app, server} from "./socket /socket";
import {errorMiddleware, notFoundMiddleware} from "./middleware/error.middleware";
import {router} from "./router/router";
import {socketAuthMiddleware} from "./middleware/auth.middleware";
import {User} from "./models/User.model";

export const app = express();
export const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: config.CLIENT_URL,
        methods: ['GET', 'POST'],
    },
});
io.use(socketAuthMiddleware);

app.use(express.json());
app.use(cookieParser(config.COOKIE_SECRET));
app.use(cors({
    origin: config.CLIENT_URL,
    credentials: true,
    exposedHeaders: ['set-cookie']
}));
app.use("/shispare", router);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

async function run(): Promise<void> {
    try {
        await mongoose.connect(config.DB_URI);
        server.listen(config.APP_PORT);
        console.log(`App started - http://localhost:${config.APP_PORT}`);
        await bot.launch();
    } catch (e) {
        console.error(e);
    }
}

run().catch(console.error);

