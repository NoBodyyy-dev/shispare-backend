import * as dotenv from "dotenv";
dotenv.config();

export default {
    APP_PORT: process.env.APP_PORT!,
    BOT_PORT: process.env.BOT_PORT!,
    BOT_TOKEN: process.env.BOT_TOKEN!,
    CLIENT_URL: process.env.CLIENT_URL!,
    DB_URI: process.env.DB_URI!,
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET!,
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET!,
    SESSION_TOKEN_SECRET: process.env.SESSION_TOKEN_SECRET!,
    FNS_API_KEY: process.env.FNS_API_KEY!,
}