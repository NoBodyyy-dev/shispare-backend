import {APIError} from "./error.service";
import axios from "axios";
import fs from "fs";
import XLSX from "xlsx";
import {createSlug} from "../utils/utils";
import {Product} from "../models/Product.model";
import {Category, ICategory} from "../models/Category.model";

interface FileReturnData {
    category: string;
    article: number;
    title: string;
    type: string;
    count: number;
    unit: string;
    price: number
    country: string;
}

type FileData = Express.Multer.File | Buffer | string

export class ParsingService {
    private colors: Record<string, string> = {
        "черный": "#000000",
        "чёрный": "#000000",
        "белый": "#FFFFFF",
        "бежевый": "#F5F5DC",
        "светло-серый": "#D3D3D3",
        "темно-серый": "#555555",
        "серый": "#808080",
        "бетонный серый": "#9D9D9D",
        "сигнально-серый": "#9C9C9C",
        "сланцево-серый": "#708090",
        "песочный": "#C2B280",
        "желтый": "#FFD700",
        "пастельно-желтый": "#FAFAD2",
        "светло-желтый": "#FFFFE0",
        "красный": "#FF0000",
        "темно-коричневый": "#654321",
        "коричневый": "#8B4513",
        "шоколадно-коричневый": "#5C4033",
        "графит": "#383838",
        "синий": "#0000FF",
        "темно-голубой": "#00008B",
        "голубой": "#87CEEB",
        "зеленый": "#008000",
        "зелёный": "#008000",
        "светло-зеленый": "#90EE90",
        "пастельно-бирюзовый": "#AFEEEE",
        "бело-зеленый": "#E8F5E9",
        "пурпурно-белый": "#EDE7F6",
        "сиреневый": "#C8A2C8",
        "медный": "#B87333",
        "агатово-серый": "#B4B4B4",
        "жемчужно-белый": "#F0EAD6",
        "слоновая кость": "#FFF8E7",
        "терракот": "#E2725B",
        "золотой": "#FFD700",
        "красное золото": "#E9967A",
        "желтое золото": "#FFD700",
        "карамельный": "#FFD59A",
        "кварцево-серый": "#BDB6B6",
        "прозрачный": "#FFFFFF00",
        "ral1001": "#C8A65D",
        "ral1015": "#E6D2B5",
        "ral5012": "#2A7FBC",
        "ral6018": "#57A639",
        "ral7030": "#919089",
        "ral7032": "#B5B5A7",
        "ral7035": "#D7D7D7",
        "ral7037": "#7A7B7A",
        "ral7042": "#8D8F8E",
        "ral7046": "#82898E",
        "ral8008": "#7E5C31",
        "ral8016": "#4E3B31",
        "ral9004": "#282828",
    };

    public async parseProductsFromAPIAndExcel(file: FileData) {
        try {
            const [products, fileData] = await Promise.all([
                this.fetchProductsFromAPI(),
                this.readFile(file),
            ]);

            const titles = fileData.map(f => f.title.toLowerCase().trim());
            let created = 0;

            for (const product of products) {
                const productName = (product.name || "").toLowerCase().trim();
                const matchExcel = fileData.find(row =>
                    productName.startsWith(row.title.toLowerCase()) ||
                    row.title.toLowerCase().startsWith(productName) ||
                    productName.includes(row.title.toLowerCase()) ||
                    row.title.toLowerCase().includes(productName)
                );

                if (!matchExcel) continue;

                const variants = [];
                for (const item of product.items || []) {
                    const excelMatch = fileData.find(f => f.article === Number(item.sku));
                    if (!excelMatch) continue;

                    variants.push({
                        article: Number(item.sku),
                        price: excelMatch.price || 0,
                        color: {
                            ru: item.color?.name || "не указан",
                            hex: this.colors[item.color?.name?.toLowerCase()] || "#FFFFFF",
                        },
                        package: {
                            type: excelMatch.type || item.pack?.name || "",
                            count: excelMatch.count || this.extractPackCount(item.pack?.name),
                            unit: excelMatch.unit || this.extractPackUnit(item.pack?.name),
                        },
                        discount: 0,
                        countInStock: 100,
                    });
                }

                if (!variants.length) continue;

                const title = product.name?.trim();
                const slug = createSlug(title);

                const newProduct = {
                    title,
                    description: this.stripHtml(product.text || product.description || ""),
                    category: matchExcel.category,
                    country: matchExcel.country || "",
                    images: (product.fileImgs || []).map((i: any) => i.urlMin).filter(Boolean),
                    documents: (product.fileDocs || []).map((d: any) => d.urlMin).filter(Boolean),
                    characteristics: (product.details || []).map((d: any) => this.stripHtml(d.text)),
                    slug,
                    variants,
                    isActive: true,
                };

                console.log("new >>>>>", newProduct);

                await Product.findOneAndUpdate(
                    {slug},
                    {$set: newProduct},
                    {upsert: true, new: true}
                );

                created++;
            }

            console.log(`✅ Импорт завершён: ${created} товаров добавлено/обновлено`);
            return {success: true, created};
        } catch (err) {
            console.error("❌ Ошибка парсинга:", err);
            throw APIError.InternalServerError({message: "Ошибка обработки данных"});
        }
    }

    private async readFile(file: Express.Multer.File | Buffer | string): Promise<FileReturnData[]> {
        try {
            const buffer = await this.resolveToBuffer(file);
            const wb = XLSX.read(buffer, { type: "buffer" });
            const sheetName = wb.SheetNames[0];
            const sheet = wb.Sheets[sheetName];
            if (!sheet) throw APIError.BadRequest({ message: "Ошибка чтения файла!" });

            const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
            if (!rows.length) return [];

            const filterRows = rows.filter(
                (row: Record<string, any>) => row["№ поз."] !== undefined && row["№ поз."] !== ""
            );
            if (!filterRows.length) throw APIError.BadRequest({ message: "Ошибка чтения файла!" });

            const returnData: FileReturnData[] = [];
            let currentCategory: ICategory | null = null;

            for (const row of filterRows) {
                const cellValue = row["№ поз."];
                if (typeof cellValue === "string" && /\d+\./.test(cellValue)) {
                    const titlePart = cellValue.split(". ")[1] || cellValue;
                    const title = titlePart.trim();
                    if (!title) continue;

                    currentCategory =
                        (await Category.findOne({ title })) ||
                        (await Category.create({ title }));

                    continue; // это категория, не продукт
                }

                // ─────────────────────────────
                // если нет активной категории — создаём дефолтную
                // ─────────────────────────────
                if (!currentCategory) {
                    currentCategory =
                        (await Category.findOne({ title: "Без категории" })) ||
                        (await Category.create({ title: "Без категории" }));
                }

                const article: number = Number(row["Артикул"]) || 0;
                const title: string = row["Наименование материала"]?.toString().trim();
                const type: string = row["Упаковка"]?.toString().trim() || "";

                let unit = "";
                let count = 0;
                const cell = row["__EMPTY"];

                if (typeof cell === "number") {
                    count = cell;
                    unit = row["Ед. изм."]?.toString().trim() || "";
                } else if (typeof cell === "string") {
                    const match = cell.match(/([\d.,]+)\s*(\S+)?/);
                    if (match) {
                        count = Number(match[1].replace(",", "."));
                        unit = match[2] || row["Ед. изм."] || "";
                    }
                }

                const price = Number(row["Цена, руб/ед. с НДС"]) || 0;
                const country = row["Страна производства"]?.toString().trim() || "";

                if (!title) continue;

                returnData.push({
                    category: (currentCategory as ICategory)._id.toString(),
                    article,
                    title,
                    type,
                    count,
                    unit,
                    price,
                    country,
                });
            }
            console.log("ret >>>", returnData)
            return returnData;
        } catch (e) {
            console.error("Ошибка чтения файла Excel:", e);
            throw APIError.InternalServerError({ message: "Ошибка чтения EXCEL файла" });
        }
    }

    private extractPackCount(text?: string): number {
        if (!text) return 0;
        const m = text.match(/(\d+(?:[.,]\d+)?)\s*(мл|л|кг|шт)?/i);
        return m ? Number(m[1].replace(",", ".")) : 0;
    }

    private extractPackUnit(text?: string): string {
        if (!text) return "";
        const m = text.match(/(\d+(?:[.,]\d+)?)\s*(мл|л|кг|шт)/i);
        return m?.[2] ?? "";
    }

    private async resolveToBuffer(file?: FileData): Promise<Buffer> {
        if (!file) {
            throw APIError.BadRequest({message: "Файл Excel не передан"});
        }
        if (typeof file === "object" && "buffer" in file && file.buffer instanceof Buffer) {
            return file.buffer as Buffer;
        }
        if (typeof file === "object" && "path" in file && typeof (file as any).path === "string") {
            // use async file read to avoid blocking the event loop for large files
            return await fs.promises.readFile((file as any).path);
        }
        if (typeof file === "string") {
            return await fs.promises.readFile(file);
        }
        if (file instanceof Buffer) {
            return file;
        }
        throw APIError.BadRequest({message: "Неподдерживаемый тип входного файла"});
    }


    private stripHtml(html?: string) {
        return (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }

    private parseMoney(v: unknown): number | undefined {
        if (v == null) return undefined;
        if (typeof v === "number" && Number.isFinite(v)) return v;
        let s = String(v)
            .trim()
            .replace(/\u00A0/g, " ")
            .replace(/[₽рRUBuв]/gi, "")
            .replace(/руб\.?/gi, "")
            .replace(/\s+/g, " ");

        if (s.includes(",") && s.includes(".")) {
            s = s.replace(/\./g, "").replace(",", ".");
        } else {
            s = s.replace(",", ".");
        }
        s = s.replace(/\s/g, "");
        const n = Number(s);
        return Number.isFinite(n) ? n : undefined;
    }

    private splitTitleAndColor(fullName: string): {
        title: string;
        color: { ru: string; hex: string } | null;
    } {
        if (!fullName) return {title: "", color: null};
        const str = fullName.trim();
        const match = str.match(/^(.*?)\s*([А-Яа-яЁёRALral0-9\s-]+)$/);
        if (match) {
            const title = match[1].trim();
            const colorName = match[2].trim().toLowerCase();
            const hex = this.colors[colorName] || "";
            return {title, color: {ru: colorName, hex}};
        }
        return {title: str, color: null};
    }

    async fetchProductsFromAPI(): Promise<any[]> {
        const products = await axios.get("http://s1-api.sikayufo.ru/catalog?add=count&per_page=300&expand=fileCovers,fileImgs,fileDocs,details,colors,items,catalogItem.pack,catalogItem.color&k=738da44267d8c&t=1")
        return (products.data as { data: any }).data;
    }
}