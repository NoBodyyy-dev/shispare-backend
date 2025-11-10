import express from "express";
import Stock from "../models/Stock.model";
import {createSlug} from "../utils/utils";
import cron from "node-cron"

export const createStock = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const {title, description, conditions, image, start, end} = req.body;
    const slug: string = createSlug(title);

    try {
        const stock = new Stock({
            title,
            description,
            conditions,
            slug,
            image,
            start,
            end
        })
        await stock.save();
        res.status(201).json({stock, success: true});
    } catch (e) {
        next(e);
    }
}

export const getAllStocks = async (_: any, res: express.Response, next: express.NextFunction) => {
    try {
        const stocks = await Stock.find().select("image slug");
        return res.status(200).json({stocks, success: true});
    } catch (e) {
        next(e);
    }
}

export const getStockBySlug = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const {slug} = req.params;
        const stock = await Stock.findOne({slug});
        if (!stock) {
            return res.status(404).json({success: false, message: "Акция не найдена"});
        }
        return res.status(200).json({stock, success: true});
    } catch (e) {
        next(e);
    }
}

const deleteExpiredStocks = async () => {
    try {
        const result = await Stock.deleteMany({end: {$lt: new Date()}});
        console.log(`Удалено акций: ${result.deletedCount}`);
    } catch (error) {
        console.error("Ошибка при удалении акций:", error);
    }
};

cron.schedule("0 0 * * *", () => {
    console.log("Запуск удаления просроченных акций...");
    deleteExpiredStocks().then(r => console.log(r));
});