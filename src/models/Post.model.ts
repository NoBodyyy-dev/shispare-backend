import mongoose from "mongoose";
import IPost from "../interfaces/IPost";

const postSchema = new mongoose.Schema<IPost>(
  {
    title: { type: String, trim: true, required: true },
    description: { type: String, trim: true, required: true },
    image: { type: String, trim: true, required: true },
    slug: {type: String},
  },
  { timestamps: true }
);
const Post: mongoose.Model<IPost> = mongoose.model<IPost>("Post", postSchema);
export default Post;
