import {IOrder, Order} from "../models/Order.model";
import {IUser} from "../models/User.model";
import {APIError} from "./error.service";
import path from "path";
import fs from "fs";
import handlebars from "handlebars";

export class InvoiceService {
    /**
     * Генерирует счет на оплату для юридического лица
     */
    async generateInvoice(order: IOrder, user: IUser): Promise<string> {
        if (!user.legalType || !user.bankAccount?.accountNumber) {
            throw APIError.BadRequest({
                message: "Для генерации счета необходимы реквизиты расчетного счета"
            });
        }

        // Populate products для получения полной информации о товарах
        const populatedOrder = await Order.findById(order._id)
            .populate({
                path: "items.product",
                select: "title variants"
            })
            .lean();
        
        if (!populatedOrder) {
            throw APIError.NotFound({message: "Заказ не найден"});
        }

        // Путь к шаблону счета
        const templatePath = path.join(__dirname, "../template/invoice.hbs");
        
        // Если шаблона нет, создаем простой HTML
        let htmlContent: string;
        
        if (fs.existsSync(templatePath)) {
            const template = fs.readFileSync(templatePath, "utf-8");
            const compiledTemplate = handlebars.compile(template);
            htmlContent = compiledTemplate({
                order: populatedOrder,
                user,
                invoiceNumber: `INV-${populatedOrder.orderNumber}`,
                invoiceDate: new Date().toLocaleDateString("ru-RU"),
                dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString("ru-RU"), // +5 дней
            });
        } else {
            // Простой HTML шаблон, если файл шаблона не найден
            htmlContent = this.generateSimpleInvoiceHTML(populatedOrder as any, user);
        }

        // Сохраняем счет как HTML файл (можно также генерировать PDF)
        const invoiceDir = path.join(__dirname, "../../invoices");
        if (!fs.existsSync(invoiceDir)) {
            fs.mkdirSync(invoiceDir, {recursive: true});
        }

        const invoiceFileName = `invoice-${populatedOrder.orderNumber}.html`;
        const invoicePath = path.join(invoiceDir, invoiceFileName);
        fs.writeFileSync(invoicePath, htmlContent, "utf-8");

        // Возвращаем URL для доступа к счету
        return `/invoices/${invoiceFileName}`;
    }

    private generateSimpleInvoiceHTML(order: IOrder, user: IUser): string {
        const invoiceNumber = `INV-${order.orderNumber}`;
        const invoiceDate = new Date().toLocaleDateString("ru-RU");
        const dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString("ru-RU");

        return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Счет на оплату ${invoiceNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .invoice-info { margin-bottom: 30px; }
        .company-info { margin-bottom: 30px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .items-table th { background-color: #f2f2f2; }
        .total { text-align: right; font-weight: bold; font-size: 18px; }
        .bank-details { margin-top: 30px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>СЧЕТ НА ОПЛАТУ № ${invoiceNumber}</h1>
        <p>от ${invoiceDate}</p>
    </div>
    
    <div class="company-info">
        <h3>Поставщик:</h3>
        <p><strong>ООО "Шиспаре"</strong></p>
        <p>ИНН: [Ваш ИНН]</p>
        <p>КПП: [Ваш КПП]</p>
        <p>Адрес: [Ваш адрес]</p>
    </div>
    
    <div class="company-info">
        <h3>Покупатель:</h3>
        <p><strong>${user.legalName || user.fullName}</strong></p>
        ${user.legalType === "ЮЛ" ? `<p>ОГРН: ${user.legalId}</p>` : `<p>ОГРНИП: ${user.legalId}</p>`}
        <p>ИНН: ${user.legalId}</p>
        ${user.bankAccount ? `
        <div class="bank-details">
            <h4>Реквизиты для оплаты:</h4>
            <p>Расчетный счет: ${user.bankAccount.accountNumber || "Не указан"}</p>
            <p>Банк: ${user.bankAccount.bankName || "Не указан"}</p>
            <p>БИК: ${user.bankAccount.bik || "Не указан"}</p>
            ${user.bankAccount.correspondentAccount ? `<p>Корр. счет: ${user.bankAccount.correspondentAccount}</p>` : ""}
        </div>
        ` : ""}
    </div>
    
    <div class="invoice-info">
        <p><strong>Основание:</strong> Заказ №${order.orderNumber} от ${new Date(order.createdAt).toLocaleDateString("ru-RU")}</p>
        <p><strong>Срок оплаты:</strong> ${dueDate}</p>
    </div>
    
    <table class="items-table">
        <thead>
            <tr>
                <th>№</th>
                <th>Наименование</th>
                <th>Количество</th>
                <th>Цена</th>
                <th>Сумма</th>
            </tr>
        </thead>
        <tbody>
            ${(order.items as any[]).map((item, index) => {
                // В order.items сохраняются только product (ObjectId) и quantity
                // После populate product содержит полную информацию о товаре
                const product = typeof item.product === 'object' && item.product ? item.product : null;
                const productTitle = product?.title || "Товар";
                // Получаем цену из первого варианта товара (можно улучшить, если нужно учитывать конкретный вариант)
                const productPrice = product?.variants?.[0]?.price || 0;
                const quantity = item.quantity || 1;
                const itemTotal = quantity * productPrice;
                
                return `
            <tr>
                <td>${index + 1}</td>
                <td>${productTitle}</td>
                <td>${quantity}</td>
                <td>${productPrice} ₽</td>
                <td>${itemTotal.toFixed(2)} ₽</td>
            </tr>
            `;
            }).join("")}
        </tbody>
    </table>
    
    <div class="total">
        <p>Итого: ${order.finalAmount.toFixed(2)} ₽</p>
        <p>НДС: Не облагается</p>
        <p><strong>К оплате: ${order.finalAmount.toFixed(2)} ₽</strong></p>
    </div>
    
    <div style="margin-top: 50px;">
        <p>Руководитель: _________________</p>
        <p>Бухгалтер: _________________</p>
    </div>
</body>
</html>
        `.trim();
    }
}

