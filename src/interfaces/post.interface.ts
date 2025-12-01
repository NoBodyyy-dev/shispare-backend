import mongoose from "mongoose";

export default interface PostInterface {
  _id: mongoose.ObjectId
  title: string;
  content: string;
  image: string;
  slug: string
  createdAt: Date,
  updatedAt: Date,
}
