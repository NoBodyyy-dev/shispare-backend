import {Types} from "mongoose";

export interface IProduct {
    _id: Types.ObjectId;
    title: string;                // Название (общее для всех вариантов)
    description: string;          // Описание (общее)
    slug: string;                 // Уникальный идентификатор URL
    category: Types.ObjectId;     // Категория
    images: string[];             // Общие изображения
    characteristics: string[];    // Общие характеристики
    documents: string[];          // Документы (общие)
    country: string;              // Страна производства (общая)
    shelfLife: string;            // Срок хранения (общий)
    variants: IProductVariant[];  // Варианты товара
    totalPurchases: number;       // Общее количество покупок
    variantIndex: number;         // Индекс варианта
}

export interface IProductVariant {
    sku: string;                 // Уникальный идентификатор (например, "SIKA-2212-25KG-GRAY")
    article: number;             // Артикул
    price: number;
    discount: number;           // Опциональная скидка
    countInStock: number;
    rating: number;             // Рейтинг варианта
    countOnPallet: number;
    color: {                     // Цвет с поддержкой локализации
        ru: string;              // Название на русском (для отображения)
        en: string;              // Название на английском (для CSS/классов)
    };
    package: {
        type: string;              // "мешок", "ведро", "бочка"
        count: number;             // 25, 50, 1.5
        unit: string;              // "кг", "л"
    };
}

export interface ICartProduct {
    product: Types.ObjectId;
    quantity: number;
    addedAt: Date;
}
