import {Markup, Telegraf} from 'telegraf';
import {User} from './models/User.model';
import config from './config/config';
import {Order} from "./models/Order.model";

const bot = new Telegraf(config.BOT_TOKEN);

const getMainMenu = () => Markup.keyboard([
    ['📋 Все заказы'],
    ['❓ Отправить вопрос'],
    ['👤 Личный кабинет']
]).resize();

bot.start(async (ctx) => {
    const personalKey = ctx.payload;

    let user = await User.findOne({telegramId: ctx.message.chat.id});

    if (!user) {
        user = await User.findOne({personalKey});
        if (!user) return ctx.reply(`Здравствуйте! Для использования бота вам необходимо получить персональный ключ.`);
        user.telegramId = ctx.message.chat.id;
        await user.save();
    }

    await ctx.reply(
        `Добро пожаловать ${user.fullName}! Выберите действие:`,
        getMainMenu()
    );
});

bot.hears('📋 Все заказы', async (ctx) => {
    const orders = await Order.find({userId: ctx.message.chat.id});

    if (orders.length === 0) {
        return ctx.reply('У вас нет активных заказов.');
    }

    const buttons = orders.map(order =>
        Markup.button.callback(`Заказ #${order._id}`, `order_${order._id}`)
    );

    await ctx.reply('Ваши заказы:', Markup.inlineKeyboard(buttons, {columns: 1}));
});

bot.hears('❓ Отправить вопрос', async (ctx) => {
    await ctx.reply('Пожалуйста, напишите ваш вопрос:', Markup.removeKeyboard());
});

bot.hears('👤 Личный кабинет', async (ctx) => {
    const user = await User.findOne({telegramId: ctx.message.chat.id});
    if (!user) return ctx.reply('Пользователь не найден.');

    await ctx.replyWithHTML(`
        <b>Личный кабинет</b>
        Имя: ${user.legalName}
        Email: ${user.email || 'не указан'}
    `);
});

// Обработка callback для заказов
// bot.action(/^order_/, async (ctx) => {
//     const orderId = ctx.match[0].split('_')[1];
//     const order = await Order.findById(orderId);
//
//     if (!order) {
//         return ctx.answerCbQuery('Заказ не найден');
//     }
//
//     await ctx.editMessageText(
//         `Детали заказа #${order._id}:\n` +
//         `Статус: ${order.status}\n` +
//         `Дата создания: ${order.createdAt.toLocaleDateString()}\n` +
//         `Сумма: ${order.amount} руб.`,
//         { reply_markup: { inline_keyboard: [
//                     [Markup.button.callback('Назад', 'back_to_orders')]
//             }}
//     );
// });

// Обработка кнопки "Назад" в деталях заказа
bot.action('back_to_orders', async (ctx) => {
    try {
        const orders = await Order.find({userId: ctx.callbackQuery.from.id});

        if (!orders || orders.length === 0) {
            return ctx.editMessageText('У вас нет активных заказов.');
        }

        const buttons = orders.map(order => [
            Markup.button.callback(`Заказ #${order._id}`, `order_${order._id}`)
        ]);

        await ctx.editMessageText('Ваши заказы:', {
            reply_markup: {
                inline_keyboard: buttons
            }
        });

    } catch (error) {
        console.error('Ошибка в back_to_orders:', error);
        await ctx.answerCbQuery('Произошла ошибка');
    }
});

export default bot;