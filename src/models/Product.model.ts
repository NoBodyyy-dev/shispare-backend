import mongoose, {Document, Schema, Model} from "mongoose";

export interface IPackage {
    type: string;   // Тип: мешок, ведро, канистра, картридж
    count: number;  // Объём, вес или количество
    unit: string;   // Ед. измерения (кг, л, мл, шт)
}

export interface IColor {
    ru: string;   // Название цвета по-русски
    hex: string;  // HEX-код (#FFFFFF)
}

export interface IVariant {
    article: number;       // Артикул
    price: number;         // Цена (₽)
    color: IColor;         // Цвет
    package: IPackage;     // Упаковка
    discount: number;      // %
    countInStock: number;  // Остаток
}

export interface ISEO {
    metaTitle?: string;        // SEO заголовок
    metaDescription?: string;  // SEO описание
    metaKeywords?: string;     // SEO ключевые слова
    ogImage?: string;          // Изображение для Open Graph
}

export interface IProduct extends Document {
    title: string;                     // Название товара
    description: string;              // Описание
    category: mongoose.Types.ObjectId; // Категория (основная, level: 1)
    subcategory: mongoose.Types.ObjectId; // Подкатегория (из Excel, level: 2)
    country: string;                  // Страна производства
    images: string[];                  // Фото
    slug: string;                      // slug для URL
    displayedRating: number;           // Средний рейтинг
    totalComments: number;             // Кол-во отзывов
    totalRatings: number;              // Кол-во оценок
    totalPurchases: number;            // Сколько раз куплен
    isActive: boolean;                 // Активен ли товар
    variants: IVariant[];              // ✅ Массив вариантов
    shelfLife: string,
    characteristics: string[],
    documents: string[];
    seo?: ISEO;                        // SEO данные
    createdAt: Date;
    updatedAt: Date;
}

const variantSchema = new Schema<IVariant>(
    {
        article: {type: Number, required: true},
        price: {type: Number, required: true, min: 0},
        color: {
            ru: {type: String, required: true, trim: true},
            hex: {
                type: String,
                required: true,
                trim: true,
                match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/, // HEX или HEX+альфа
            },
        },
        package: {
            type: new Schema<IPackage>(
                {
                    type: {type: String, required: true, trim: true},
                    count: {type: Number, required: true, min: 0},
                    unit: {type: String, required: true, trim: true},
                },
                {_id: false}
            ),
            required: true,
        },
        discount: {type: Number, default: 0, min: 0, max: 100},
        countInStock: {type: Number, default: 0, min: 0},
    },
    {_id: false}
);

const productSchema = new Schema<IProduct>(
    {
        title: {type: String, required: true, trim: true},
        description: {type: String, default: ""},
        category: {type: Schema.Types.ObjectId, ref: "Category", required: true},
        subcategory: {type: Schema.Types.ObjectId, ref: "Category"},
        country: {type: String, trim: true},
        images: {type: [String], default: []},
        characteristics: {type: [String], ref: "Characteristics", required: true},
        slug: {type: String, required: true, unique: true, lowercase: true, trim: true},
        displayedRating: {type: Number, default: 0, min: 0, max: 5},
        totalComments: {type: Number, default: 0, min: 0},
        totalRatings: {type: Number, default: 0, min: 0},
        totalPurchases: {type: Number, default: 0, min: 0},
        isActive: {type: Boolean, default: true},
        variants: {type: [variantSchema], default: []},
        documents: {type: [String], default: []},
        seo: {
            metaTitle: {type: String, trim: true},
            metaDescription: {type: String, trim: true},
            metaKeywords: {type: String, trim: true},
            ogImage: {type: String, trim: true},
        },
    },
    {
        timestamps: true,
    }
);

productSchema.index({title: "text"});
productSchema.index({slug: 1});
productSchema.index({category: 1});
productSchema.index({subcategory: 1});
productSchema.index({"variants.color.ru": 1});
productSchema.index({"variants.package.type": 1});
productSchema.index({isActive: 1});

export const Product: Model<IProduct> = mongoose.model<IProduct>("Product", productSchema);