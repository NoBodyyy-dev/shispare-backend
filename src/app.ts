import * as dotenv from "dotenv";

dotenv.config();
import express from "express";
import mongoose from "mongoose";
import * as http from "node:http";
import cors from "cors";
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from "cookie-parser";
import path from "path";
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
        origin: config.CLIENT_URL,
        methods: "*",
        credentials: true
    },
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000
    }
});

export const socketService = new SocketService(io);
export const orderService = new OrderService(socketService);

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({extended: true, limit: '50mb'}));
app.use(cookieParser(config.COOKIE_SECRET));
// Security middlewares
app.use(helmet());
app.use(rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
}));
app.use(cors({
    origin: config.CLIENT_URL,
    credentials: true,
    exposedHeaders: ['set-cookie']
}));
// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Статическая раздача счетов
app.use("/invoices", express.static(path.join(__dirname, "../invoices")));
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

