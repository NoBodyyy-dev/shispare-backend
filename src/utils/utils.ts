import express from "express";
import mongoose from "mongoose";
import slugify from "slugify";
// @ts-ignore
import colorNameList from "color-name-list"

type AsyncFunction = (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<any>;

export const toObjID = (id: string): mongoose.Types.ObjectId => new mongoose.Types.ObjectId(id);
export const createCode = (length: number): string => Array.from({length: length}, () => Math.floor(Math.random() * 10)).join("");
export const asyncHandler = (fn: AsyncFunction) =>
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
export const createSlug =
    (uri: string): string => slugify(uri, {
        locale: "ru",
        lower: true,
        remove: /[*+~.()'"!:@]/g,
        strict: true,
    });