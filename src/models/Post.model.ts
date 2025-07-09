import mongoose from "mongoose";
import PostInterface from "../interfaces/post.interface";

const postSchema = new mongoose.Schema<PostInterface>(
  {
    title: { type: String, trim: true, required: true },
    description: { type: String, trim: true, required: true },
    image: { type: String, trim: true, required: true },
    slug: {type: String},
  },
  { timestamps: true }
);
const Post: mongoose.Model<PostInterface> = mongoose.model<PostInterface>("Post", postSchema);
export default Post;
