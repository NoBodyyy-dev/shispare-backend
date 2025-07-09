import {Transporter, createTransport} from 'nodemailer';
import path from 'path';
import fs from 'fs';
import handlebars from 'handlebars';
import bot from "../bot";
import config from '../config/sender.config';
import {IOrderItem} from "../models/Order.model";

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
        await this.sendEmail({
            to: data.email,
            subject: "Подтвердите почту!",
            html: `
            <h1 style="font-weight: lighter">Никому не сообщайте код - <b style="font-weight: bold">${data.code}</b></h1>\n\n
            <p>Подтвердите почту в течение 3-х часов</p>
        `,
        })
    }

    public async sendTelegramMessage(data: { telegramId: number, text: string }): Promise<boolean> {
        try {
            await bot.telegram.sendMessage(
                data.telegramId,
                data.text,
                {parse_mode: 'HTML'}
            );
            this.logger.info(`Сообщение отправлено ${data.telegramId}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to send Telegram message to ${data.telegramId}`, error);
            return false;
        }
    }

    public async sendMessagesAboutCreatedOrder(data: {
        to: string,
        items: IOrderItem[],
        orderNumber: string,
        telegramId?: number
    }): Promise<{ message: string, ok: boolean }> {
        try {
            const isSendEmail: boolean = await this.sendEmail({
                to: data.to,
                subject: "Заказ создан",
                html: `Заказ <b>${data.orderNumber}</b> создан! Ожидайте подтверждения`
            })
            const isSendBot: boolean | null = data.telegramId
                ? await this.sendTelegramMessage({
                    telegramId: data.telegramId,
                    text: "Заказ создан! Ожидайте подтверждения"
                })
                : null

            if (isSendEmail && isSendBot || isSendEmail && !data.telegramId)
                return {message: "Заказ создан", ok: true}
            else
                return {message: "Что-то пошло не так", ok: false}

        } catch (e) {
            return {message: "Что-то пошло не так", ok: false};
        }
    }
}