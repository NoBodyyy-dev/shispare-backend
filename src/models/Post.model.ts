import mongoose from "mongoose";
import PostInterface from "../interfaces/post.interface";

const postSchema = new mongoose.Schema<PostInterface>(
  {
    title: { type: String, trim: true, required: true },
    content: { type: String, trim: true, required: true },
    image: { type: String, trim: true, required: true },
    slug: {type: String},
    seo: {
      metaTitle: {type: String, trim: true},
      metaDescription: {type: String, trim: true},
      metaKeywords: {type: String, trim: true},
      ogImage: {type: String, trim: true},
    },
  },
  { timestamps: true }
);
const Post: mongoose.Model<PostInterface> = mongoose.model<PostInterface>("Post", postSchema);
export default Post;
