import mongoose from "mongoose";

export interface ISEO {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  ogImage?: string;
}

export default interface PostInterface {
  _id: mongoose.ObjectId
  title: string;
  content: string;
  image: string;
  slug: string
  seo?: ISEO;
  createdAt: Date,
  updatedAt: Date,
}
