import {Types} from "mongoose";

export interface IProduct {
    _doc: any;
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
    totalPurchases: number;       // Общее количество покупок
    variantIndex: number;
}

export interface IProductVariant {
    productId: Types.ObjectId;
    sku: string;                 // Уникальный идентификатор (например, "SIKA-2212-25KG-GRAY")
    slug: string;
    article: number;             // Артикул
    price: number;
    discount: number;            // Опциональная скидка
    countInStock: number;
    countOnPallet: number;
    totalPurchases: number;
    color: string;
    package: {
        type: string;              // "мешок", "ведро", "бочка"
        count: number;             // 25, 50, 1.5
        unit: string;              // "кг", "л"
    };
    totalComments: number;
    totalRatings: number;
    displayedRating: number;
}

export interface ICartProduct {
    variant: Types.ObjectId;
    quantity: number;
}
