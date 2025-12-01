import {Category} from "../models/Category.model";
import {createSlug} from "../utils/utils";

export class CategoryService {
    public async getCategories() {
        return Category.find({ level: 1 });
    }

    public async createCategory(data: {
        title: string;
        group: number;
    }): Promise<any> {
        const slug: string = createSlug(data.title);
        return Category.create({
            title: data.title,
            group: data.group,
            slug,
            level: 1,
        })
    }

    public async updateCategory(
        categoryId: string,
        data: {
            title: string;
            group: number;
        }) {
        const slug: string = createSlug(data.title);
        return Category.findOneAndUpdate({_id: categoryId}, {
            title: data.title,
            group: data.group,
            slug,
        })
    }

    public async deleteCategory(_id: string) {
        return Category.findOneAndDelete({_id: _id});
    }
}