// imports
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
import {setupOrderSockets} from "./socket /socket";
import {errorMiddleware, notFoundMiddleware} from "./middleware/error.middleware";
import {router} from "./router/router";

// initialize app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: config.CLIENT_URL,
        methods: ['GET', 'POST'],
    },
});

// app.use
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: config.CLIENT_URL,
    credentials: true,
}));
app.use("/shispare", router);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

async function run(): Promise<void> {
    try {
        setupOrderSockets(io);
        await mongoose.connect(config.DB_URI);
        server.listen(config.APP_PORT);
        console.log(`App started - http://localhost:${config.APP_PORT}`);
        await bot.launch();
    } catch (e) {
        console.error(e);
    }
}

run().catch(console.error);

