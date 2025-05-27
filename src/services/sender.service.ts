import {Transporter, createTransport} from 'nodemailer';
import path from 'path';
import fs from 'fs';
import handlebars from 'handlebars';
import config from '../config/sender.config';
import bot from "../bot";

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    attachments?: Array<{
        filename: string;
        path: string;
        contentType: string;
    }>;
}

export class SenderService {
    private static templatesDir = path.join(__dirname, 'templates');
    private logger = console;

    constructor(private instance: Transporter = createTransport({
        host: config.EMAIL_SMTP_HOST,
        port: config.EMAIL_SMTP_PORT,
        secure: true,
        auth: {
            user: config.EMAIL_FROM,
            pass: config.EMAIL_PASSWORD,
        },
    })) {
    }

    private async getTemplate(templateName: string, context: object = {}): Promise<string> {
        const templatePath = path.join(SenderService.templatesDir, `${templateName}.hbs`);
        const templateContent = await fs.promises.readFile(templatePath, 'utf-8');
        const template = handlebars.compile(templateContent);
        return template(context);
    }

    public async sendEmail(options: EmailOptions): Promise<boolean> {
        try {
            const mailOptions = {
                from: `"${config.EMAIL_SENDER_NAME}" <${config.EMAIL_FROM}>`,
                to: options.to,
                subject: options.subject,
                html: options.html,
                attachments: options.attachments,
            };

            await this.instance.sendMail(mailOptions);
            this.logger.info(`Email sent to ${options.to}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to send email to ${options.to}`, error);
            return false;
        }
    }

    public async sendVerificationEmail(data: { email: string, code: number | string }) {
        await this.instance.sendMail({
            to: data.email,
            subject: "Подтвердите почту!",
            html: `
            <h1 style="font-weight: lighter">Никому не сообщайте код - <b style="font-weight: bold">${data.code}</b></h1>\n\n
            <p>Подтвердите почту в течение 3-х часов</p>
        `,
        })
    }

    public async sendTelegramMessage(telegramId: number, text: string): Promise<boolean> {
        try {
            await bot.telegram.sendMessage(
                telegramId,
                text,
                {parse_mode: 'HTML'}
            );
            this.logger.info(`Telegram message sent to ${telegramId}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to send Telegram message to ${telegramId}`, error);
            return false;
        }
    }

    public async sendEmailCreateOrder(data: {to: string, orderId: string}) {

    }
}