import * as dotenv from "dotenv";

dotenv.config();
import express from "express";
import mongoose from "mongoose";
import * as http from "node:http";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "./config/config";
import bot from "./bot"
import {errorMiddleware, notFoundMiddleware} from "./middleware/error.middleware";
import {router} from "./router/router";
import {Server} from "socket.io";
import {SocketService} from "./services/socket.service";
import {OrderService} from "./services/order.service";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: "*",
        credentials: true
    },
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000 // 2 минуты
    }
});

export const socketService = new SocketService(io);
export const orderService = new OrderService(socketService);

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

