import {Router, Request, Response} from "express";
import {Product} from "../models/Product.model";
import Post from "../models/Post.model";
import {Category} from "../models/Category.model";

const router = Router();

router.get("/sitemap.xml", async (req: Request, res: Response) => {
    try {
        const baseUrl = process.env.CLIENT_URL || "https://shispare.ru";
        
        // Получаем все активные товары
        const products = await Product.find({isActive: true})
            .select("slug updatedAt")
            .populate("category", "slug")
            .lean();
        
        // Получаем все посты блога
        const posts = await Post.find()
            .select("slug updatedAt")
            .lean();
        
        // Получаем все категории
        const categories = await Category.find()
            .select("slug")
            .lean();
        
        // Статические страницы
        const staticPages = [
            {url: "", priority: "1.0", changefreq: "daily"},
            {url: "/blog", priority: "0.9", changefreq: "weekly"},
            {url: "/about", priority: "0.8", changefreq: "monthly"},
            {url: "/contacts", priority: "0.7", changefreq: "monthly"},
            {url: "/delivery-payment", priority: "0.7", changefreq: "monthly"},
            {url: "/categories", priority: "0.9", changefreq: "weekly"},
        ];
        
        // Генерируем XML
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        
        // Статические страницы
        staticPages.forEach(page => {
            xml += `  <url>\n`;
            xml += `    <loc>${baseUrl}${page.url}</loc>\n`;
            xml += `    <priority>${page.priority}</priority>\n`;
            xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
            xml += `  </url>\n`;
        });
        
        // Категории
        categories.forEach(category => {
            xml += `  <url>\n`;
            xml += `    <loc>${baseUrl}/categories/${category.slug}</loc>\n`;
            xml += `    <priority>0.8</priority>\n`;
            xml += `    <changefreq>weekly</changefreq>\n`;
            xml += `  </url>\n`;
        });
        
        // Товары
        products.forEach(product => {
            const categorySlug = (product.category as any)?.slug || "";
            product.variants.forEach((variant: any) => {
                xml += `  <url>\n`;
                xml += `    <loc>${baseUrl}/categories/${categorySlug}/${variant.article}</loc>\n`;
                xml += `    <lastmod>${new Date(product.updatedAt).toISOString().split('T')[0]}</lastmod>\n`;
                xml += `    <priority>0.7</priority>\n`;
                xml += `    <changefreq>weekly</changefreq>\n`;
                xml += `  </url>\n`;
            });
        });
        
        // Посты блога
        posts.forEach(post => {
            xml += `  <url>\n`;
            xml += `    <loc>${baseUrl}/blog/${post.slug}</loc>\n`;
            xml += `    <lastmod>${new Date(post.updatedAt).toISOString().split('T')[0]}</lastmod>\n`;
            xml += `    <priority>0.6</priority>\n`;
            xml += `    <changefreq>monthly</changefreq>\n`;
            xml += `  </url>\n`;
        });
        
        xml += '</urlset>';
        
        res.set("Content-Type", "text/xml");
        res.send(xml);
    } catch (error) {
        console.error("Error generating sitemap:", error);
        res.status(500).send("Error generating sitemap");
    }
});

export {router as sitemapRouter};

