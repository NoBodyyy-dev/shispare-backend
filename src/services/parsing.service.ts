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
            const mainCategoriesMap = await this.syncMainCategories();

            const [products, fileData] = await Promise.all([
                this.fetchProductsFromAPI(),
                this.readFile(file),
            ]);

            // Создаем Map для быстрого поиска по артикулу из Excel
            const fileDataByArticle = new Map<number, FileReturnData>();
            fileData.forEach(row => {
                if (row.article > 0) {
                    fileDataByArticle.set(row.article, row);
                }
            });

            const productsToUpsert: any[] = [];
            let created = 0;

            // Проходим по всем товарам из API
            for (const product of products) {
                const variants = [];
                let subcategoryId: string | null = null;
                let mainCategoryId: string | null = null;
                let country: string = "";

                // Определяем основную категорию из group товара (category id из API)
                // product.group содержит number - это id категории из API
                // Проверяем разные возможные поля
                const categoryIdFromAPI = product.group || 
                                         product.categoryId || 
                                         product.category?.id || 
                                         product.catalogItem?.group ||
                                         product.catalogItem?.categoryId;
                
                // Логируем структуру первого товара для отладки
                if (products.indexOf(product) === 0) {
                    console.log("🔍 Структура первого товара из API:", {
                        name: product.name,
                        group: product.group,
                        categoryId: product.categoryId,
                        category: product.category,
                        catalogItem: product.catalogItem,
                        foundCategoryId: categoryIdFromAPI
                    });
                }
                
                if (categoryIdFromAPI && typeof categoryIdFromAPI === 'number') {
                    const mainCategory = mainCategoriesMap.get(categoryIdFromAPI);
                    if (mainCategory) {
                        mainCategoryId = mainCategory._id.toString();
                    } else {
                        // Если категория не найдена в синхронизированных, используем первую доступную
                        console.warn(`⚠️ Категория с id ${categoryIdFromAPI} не найдена для товара "${product.name}", используем первую доступную`);
                        const firstMainCategory = Array.from(mainCategoriesMap.values())[0];
                        if (firstMainCategory) {
                            mainCategoryId = firstMainCategory._id.toString();
                        }
                    }
                } else {
                    // Если нет category id в товаре, используем первую доступную категорию
                    console.warn(`⚠️ Товар "${product.name}" не имеет category id (group), используем первую доступную категорию`);
                    const firstMainCategory = Array.from(mainCategoriesMap.values())[0];
                    if (firstMainCategory) {
                        mainCategoryId = firstMainCategory._id.toString();
                    } else {
                        // Если нет синхронизированных категорий, ищем в БД
                        const mainCategories = await Category.find({ level: 1 }).limit(1).lean();
                        if (mainCategories.length > 0) {
                            mainCategoryId = mainCategories[0]._id.toString();
                        }
                    }
                }

                // Для каждого варианта товара из API ищем соответствие в Excel по артикулу
                for (const item of product.items || []) {
                    const article = Number(item.sku);
                    if (!article || article <= 0) continue;

                    const excelData = fileDataByArticle.get(article);
                    if (!excelData) continue;

                    // Сохраняем подкатегорию из Excel и страну из первого найденного соответствия
                    if (!subcategoryId) {
                        subcategoryId = excelData.category;
                    }
                    if (!country) {
                        country = excelData.country || "";
                    }

                    variants.push({
                        article,
                        price: excelData.price || 0,
                        color: {
                            ru: item.color?.name || "не указан",
                            hex: this.colors[item.color?.name?.toLowerCase()] || "#FFFFFF",
                        },
                        package: {
                            type: excelData.type || item.pack?.name || "",
                            count: excelData.count || this.extractPackCount(item.pack?.name),
                            unit: excelData.unit || this.extractPackUnit(item.pack?.name),
                        },
                        discount: 0,
                        countInStock: 100,
                    });
                }

                // Если не нашли ни одного варианта с соответствием в Excel, пропускаем товар
                if (!variants.length || !subcategoryId) continue;

                // Если основная категория не определена, пропускаем товар
                if (!mainCategoryId) continue;

                const title = product.name?.trim(); // Используем название из API
                const slug = createSlug(title);

                const newProduct = {
                    title, // Используем product.name из API
                    description: this.stripHtml(product.text || product.description || ""),
                    category: mainCategoryId,
                    subcategory: subcategoryId,
                    country: country,
                    images: (product.fileImgs || []).map((i: any) => i.url).filter(Boolean),
                    documents: (product.fileDocs || []).map((d: any) => d.url).filter(Boolean),
                    characteristics: (product.details || []).map((d: any) => this.stripHtml(d.text)),
                    slug,
                    variants,
                    isActive: true,
                };

                productsToUpsert.push({
                    updateOne: {
                        filter: {slug},
                        update: {$set: newProduct},
                        upsert: true,
                    },
                });

                created++;
            }

            if (productsToUpsert.length > 0) {
                await Product.bulkWrite(productsToUpsert, {ordered: false});
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
            const wb = XLSX.read(buffer, {type: "buffer"});
            const sheetName = wb.SheetNames[0];
            const sheet = wb.Sheets[sheetName];
            if (!sheet) throw APIError.BadRequest({message: "Ошибка чтения файла!"});

            const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {defval: ""});
            if (!rows.length) return [];

            const filterRows = rows.filter(
                (row: Record<string, any>) => row["№ поз."] !== undefined && row["№ поз."] !== ""
            );
            if (!filterRows.length) throw APIError.BadRequest({message: "Ошибка чтения файла!"});

            const allCategories = await Category.find().lean();
            const categoryMap = new Map<string, ICategory>();
            allCategories.forEach(cat => {
                categoryMap.set(cat.title.toLowerCase().trim(), cat as ICategory);
            });

            const returnData: FileReturnData[] = [];
            let currentCategory: ICategory | null = null;
            const categoriesToCreate: string[] = [];

            for (const row of filterRows) {
                const cellValue = row["№ поз."];
                if (typeof cellValue === "string" && /\d+\./.test(cellValue)) {
                    const titlePart = cellValue.split(". ")[1] || cellValue;
                    const title = titlePart.trim();
                    if (!title) continue;

                    const titleLower = title.toLowerCase();
                    currentCategory = categoryMap.get(titleLower) || null;

                    if (!currentCategory) {
                        categoriesToCreate.push(title);
                        const newCategory = await Category.create({
                            title,
                            level: 2,
                        });
                        categoryMap.set(titleLower, newCategory as ICategory);
                        currentCategory = newCategory as ICategory;
                    }

                    continue;
                }

                if (!currentCategory) {
                    const defaultTitle = "Без категории";
                    const defaultLower = defaultTitle.toLowerCase();
                    currentCategory = categoryMap.get(defaultLower) || null;

                    if (!currentCategory) {
                        const defaultCat = await Category.create({
                            title: defaultTitle,
                            level: 2,
                        });
                        categoryMap.set(defaultLower, defaultCat as ICategory);
                        currentCategory = defaultCat as ICategory;
                    }
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
            return returnData;
        } catch (e) {
            console.error("Ошибка чтения файла Excel:", e);
            throw APIError.InternalServerError({message: "Ошибка чтения EXCEL файла"});
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
        console.log("????", (products.data as { data: any }).data.length)
        return (products.data as { data: any }).data;
    }

    async fetchMainCategories(): Promise<Array<{ id: number; name: string }>> {
        try {
            const response = await axios.get("http://s1-api.sikayufo.ru/catalog/group/all-list");
            const data = response.data as { data: Array<{ id: number; name: string }> };
            return data.data || [];
        } catch (error) {
            console.error("Ошибка получения главных категорий:", error);
            throw APIError.InternalServerError({message: "Ошибка получения категорий из API"});
        }
    }

    async syncMainCategories(): Promise<Map<number, ICategory>> {
        const mainCategoriesData = await this.fetchMainCategories();
        const categoryMap = new Map<number, ICategory>();

        const existingCategories = await Category.find().lean();
        const existingByTitle = new Map<string, ICategory>();
        existingCategories.forEach(cat => {
            existingByTitle.set(cat.title.toLowerCase().trim(), cat as ICategory);
        });

        for (const catData of mainCategoriesData) {
            const titleLower = catData.name.toLowerCase().trim();
            let category = existingByTitle.get(titleLower);

            if (!category) {
                category = await Category.create({
                    title: catData.name,
                    slug: createSlug(catData.name),
                    level: 1,
                }) as ICategory;
            } else if (category.level !== 1) {
                // Обновляем существующую категорию, если она была подкатегорией
                category = await Category.findByIdAndUpdate(
                    category._id,
                    { level: 1 },
                    { new: true }
                ) as ICategory;
            }

            categoryMap.set(catData.id, category);
        }

        return categoryMap;
    }
}