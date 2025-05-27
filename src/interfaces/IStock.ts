export interface IStock extends Document {
    title: string
    description: string;
    conditions: string[]
    slug: string;
    image: string;
    start: Date;
    end: Date;
}