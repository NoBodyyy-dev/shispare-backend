import mongoose from "mongoose";
import {IStock} from "../interfaces/IStock";

const StockSchema = new mongoose.Schema({
    title: {type: String, required: true, trim: true},
    description: {type: String, required: true, trim: true},
    conditions: {type: Array(String), required: true},
    slug: {type: String, required: true, trim: true},
    image: {type: String, required: true},
    start: {type: Date, required: true, default: Date.now()},
    end: {type: Date, required: true},
})

const Stock: mongoose.Model<IStock> = mongoose.model<IStock>("Stock", StockSchema);
export default Stock;