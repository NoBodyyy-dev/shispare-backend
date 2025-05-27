import mongoose from "mongoose";

export default interface IPost extends Document {
  title: string;
  description: string;
  image: string;
  slug: string
  createdAt: Date,
  updatedAt: Date,
}
