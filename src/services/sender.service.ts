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

    public async sendOrderStatusUpdateEmail(data: {
        to: string;
        orderNumber: string;
        status: string;
        orderId: string;
        cancellationReason?: string;
        deliveryDate?: string;
        invoiceUrl?: string;
    }): Promise<boolean> {
        const statusLabels: Record<string, { label: string; color: string; icon: string }> = {
            'waiting_for_payment': { label: 'Ожидает оплаты', color: '#9b59b6', icon: '💳' },
            'pending': { label: 'Ожидает подтверждения', color: '#FFA500', icon: '⏳' },
            'processing': { label: 'В обработке', color: '#3498db', icon: '⚙️' },
            'confirmed': { label: 'Подтвержден', color: '#2ecc71', icon: '✅' },
            'shipped': { label: 'Отправлен', color: '#3498db', icon: '📦' },
            'delivered': { label: 'Доставлен', color: '#27ae60', icon: '🎉' },
            'cancelled': { label: 'Отменен', color: '#e74c3c', icon: '❌' },
            'refunded': { label: 'Возвращен', color: '#95a5a6', icon: '↩️' },
        };

        const statusInfo = statusLabels[data.status] || { label: data.status, color: '#333', icon: '📋' };

        let additionalInfo = '';
        if (data.status === 'cancelled' && data.cancellationReason) {
            additionalInfo = `
                <div style="background: #fcebea; border-left: 4px solid #e74c3c; padding: 16px; margin: 20px 0; border-radius: 4px;">
                    <h3 style="margin: 0 0 8px 0; color: #c62828; font-size: 16px;">Причина отмены:</h3>
                    <p style="margin: 0; color: #333; line-height: 1.6;">${data.cancellationReason}</p>
                </div>
            `;
        }
        if (data.status === 'confirmed' && data.deliveryDate) {
            const formattedDate = new Date(data.deliveryDate).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            additionalInfo = `
                <div style="background: #e8f6ff; border-left: 4px solid #3498db; padding: 16px; margin: 20px 0; border-radius: 4px;">
                    <h3 style="margin: 0 0 8px 0; color: #1a73e8; font-size: 16px;">📅 Планируемая дата доставки:</h3>
                    <p style="margin: 0; color: #333; font-size: 18px; font-weight: 600;">${formattedDate}</p>
                </div>
            `;
        }
        
        // Добавляем информацию о счете на оплату для юридических лиц
        if (data.status === 'confirmed' && data.invoiceUrl) {
            const invoiceInfo = `
                <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 20px 0; border-radius: 4px;">
                    <h3 style="margin: 0 0 8px 0; color: #856404; font-size: 16px;">📄 Счет на оплату готов</h3>
                    <p style="margin: 0 0 12px 0; color: #333; line-height: 1.6;">
                        Для вашего заказа был сформирован счет на оплату. Вы можете скачать его по ссылке ниже.
                    </p>
                    <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}${data.invoiceUrl}" 
                       style="display: inline-block; background: #ffc107; color: #000; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 14px; margin-top: 8px;">
                        📥 Скачать счет на оплату
                    </a>
                </div>
            `;
            additionalInfo = (additionalInfo || '') + invoiceInfo;
        }

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Статус заказа изменен</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                ${statusInfo.icon} Статус заказа изменен
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                                Здравствуйте!
                            </p>
                            <p style="margin: 0 0 30px 0; color: #666; font-size: 16px; line-height: 1.6;">
                                Статус вашего заказа <strong style="color: #333;">№${data.orderNumber}</strong> был изменен.
                            </p>
                            
                            <!-- Status Badge -->
                            <div style="text-align: center; margin: 30px 0;">
                                <div style="display: inline-block; background: ${statusInfo.color}15; border: 2px solid ${statusInfo.color}; border-radius: 12px; padding: 20px 40px;">
                                    <div style="font-size: 48px; margin-bottom: 10px;">${statusInfo.icon}</div>
                                    <div style="color: ${statusInfo.color}; font-size: 20px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                        ${statusInfo.label}
                                    </div>
                                </div>
                            </div>
                            
                            ${additionalInfo}
                            
                            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 30px 0;">
                                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Номер заказа:</p>
                                <p style="margin: 0; color: #333; font-size: 18px; font-weight: 600;">#${data.orderNumber}</p>
                            </div>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/lk/${data.orderId}/orders/${data.orderNumber}" 
                                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; transition: transform 0.2s;">
                                    Посмотреть заказ
                                </a>
                            </div>
                            
                            <p style="margin: 30px 0 0 0; color: #999; font-size: 14px; line-height: 1.6; text-align: center;">
                                Если у вас возникли вопросы, пожалуйста, свяжитесь с нашей службой поддержки.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="margin: 0; color: #999; font-size: 12px;">
                                © ${new Date().getFullYear()} Shispare. Все права защищены.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;

        return await this.sendEmail({
            to: data.to,
            subject: `Статус заказа №${data.orderNumber} изменен - ${statusInfo.label}`,
            html: emailHtml,
        });
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

    public async sendRequestAnswerEmail(data: {
        to: string;
        fullName: string;
        question: string;
        answer: string;
    }): Promise<boolean> {
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ответ на ваш вопрос</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                💬 Ответ на ваш вопрос
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                                Здравствуйте, <strong>${data.fullName}</strong>!
                            </p>
                            <p style="margin: 0 0 30px 0; color: #666; font-size: 16px; line-height: 1.6;">
                                Спасибо за ваш вопрос. Мы подготовили ответ:
                            </p>
                            
                            <!-- Question -->
                            <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px;">
                                <h3 style="margin: 0 0 12px 0; color: #667eea; font-size: 16px; font-weight: 600;">Ваш вопрос:</h3>
                                <p style="margin: 0; color: #333; line-height: 1.6; white-space: pre-wrap;">${data.question}</p>
                            </div>
                            
                            <!-- Answer -->
                            <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 20px; margin: 20px 0; border-radius: 4px;">
                                <h3 style="margin: 0 0 12px 0; color: #2e7d32; font-size: 16px; font-weight: 600;">Наш ответ:</h3>
                                <p style="margin: 0; color: #333; line-height: 1.6; white-space: pre-wrap;">${data.answer}</p>
                            </div>
                            
                            <p style="margin: 30px 0 0 0; color: #999; font-size: 14px; line-height: 1.6; text-align: center;">
                                Если у вас возникли дополнительные вопросы, пожалуйста, свяжитесь с нашей службой поддержки.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="margin: 0; color: #999; font-size: 12px;">
                                © ${new Date().getFullYear()} Shispare. Все права защищены.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;

        return await this.sendEmail({
            to: data.to,
            subject: "Ответ на ваш вопрос",
            html: emailHtml,
        });
    }
}