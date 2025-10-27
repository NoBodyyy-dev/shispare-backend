import {Transporter, createTransport} from 'nodemailer';
import path from 'path';
import fs from 'fs';
import handlebars from 'handlebars';
import bot from "../bot";
import config from '../config/sender.config';
import {IFinallyCartItems, IOrder, Order} from "../models/Order.model";
import {ICartProduct, IProduct, IProductVariant} from "../interfaces/product.interface";

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
    private instance: Transporter;

    constructor() {
        this.instance = createTransport({
            host: config.EMAIL_SMTP_HOST,
            port: Number(config.EMAIL_SMTP_PORT),
            secure: Number(config.EMAIL_SMTP_PORT) === 465,
            auth: {
                user: config.EMAIL_FROM,
                pass: config.EMAIL_PASSWORD,
            },
            connectionTimeout: 10000, // 10 секунд
        });

        this.instance.verify().then(() => {
            console.info("✅ SMTP соединение успешно установлено");
        }).catch(err => {
            console.error("❌ Ошибка при соединении с SMTP:", err);
        });
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
            console.info(`Email sent to ${options.to}`);
            return true;
        } catch (error) {
            console.error(`Failed to send email to ${options.to}`, error);
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

    public async sendTelegramMessage(data: { telegramId: number, text: string, parseMode?: string }): Promise<boolean> {
        try {
            await bot.telegram.sendMessage(
                data.telegramId,
                data.text,
                {parse_mode: 'HTML'}
            );
            console.info(`Сообщение отправлено ${data.telegramId}`);
            return true;
        } catch (error) {
            console.error(`Failed to send Telegram message to ${data.telegramId}`, error);
            return false;
        }
    }

    public async sendMessagesAboutCreatedOrder(data: {
        to: string,
        orderId: string,
        orderNumber: string,
        telegramId?: number
    }): Promise<{ message: string, ok: boolean }> {
        try {
            const order = await Order.findById(data.orderId)
                .populate("items.product", "title price images")
                .lean<IOrder>();

            if (!order) return {message: "Заказ не найден", ok: false};

            const itemsHtml = order.items.map((item: any) => {
                const variant: IProductVariant = item.product.variants[item.product.variantIndex]
                const img = item.product.images?.[0] || "";
                return `
                <div style="display:flex;align-items:center;margin-bottom:10px;">
                    <img src="${img}" alt="${item.product.title}" width="60" height="60" style="object-fit:cover;margin-right:10px;">
                    <div>
                        <div><b>${item.product.title}</b></div>
                        <div>Цена: ${variant.price} ₽</div>
                        <div>Количество: ${item.quantity}</div>
                        <div>Сумма: ${variant.price * item.quantity} ₽</div>
                    </div>
                </div>
            `;
            }).join("");

            const totalsHtml = `
            <hr/>
            <div><b>Общее количество товаров:</b> ${order.totalProducts}</div>
            <div><b>Цена без скидки:</b> ${order.totalAmount} ₽</div>
            <div><b>Скидка:</b> ${order.discountAmount} ₽</div>
            <div><b>Итого:</b> ${order.finalAmount} ₽</div>
        `;

            const emailHtml = `
            <h2>Заказ ${order.orderNumber} создан!</h2>
            ${itemsHtml}
            ${totalsHtml}
        `;

            // Для телеграма — текстовый вариант
            const telegramText = [
                `Заказ ${order.orderNumber} создан!`,
                ...order.items.map((item: any) =>
                    `${item.product.title} — ${item.quantity} шт. × ${item.product.price} ₽ = ${item.product.price * item.quantity} ₽`
                ),
                `\nОбщее количество: ${order.totalProducts}`,
                `Цена без скидки: ${order.totalAmount} ₽`,
                `Скидка: ${order.discountAmount} ₽`,
                `Итого: ${order.finalAmount} ₽`
            ].join("\n");

            const isSendEmail = await this.sendEmail({
                to: data.to,
                subject: "Заказ создан",
                html: emailHtml
            });

            const isSendBot = data.telegramId
                ? await this.sendTelegramMessage({
                    telegramId: data.telegramId,
                    text: telegramText
                })
                : null;

            if ((isSendEmail && isSendBot) || (isSendEmail && !data.telegramId))
                return {message: "Заказ создан", ok: true};
            else
                return {message: "Что-то пошло не так", ok: false};

        } catch (e) {
            console.error(e);
            return {message: "Что-то пошло не так", ok: false};
        }
    }
}