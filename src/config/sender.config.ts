import * as dotenv from "dotenv";
dotenv.config();

export default {
    EMAIL_SMTP_HOST: process.env.EMAIL_SMTP_HOST!,
    EMAIL_SMTP_PORT: Number(process.env.EMAIL_SMTP_PORT!),
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD!,
    EMAIL_FROM: process.env.EMAIL_FROM!,
    EMAIL_SENDER_NAME: process.env.EMAIL_SENDER_NAME!,
}