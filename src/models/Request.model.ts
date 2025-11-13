import mongoose, {Document, Schema, Types} from "mongoose";

export interface IRequest extends Document {
    _id: Types.ObjectId;
    fullName: string;
    email: string;
    question: string;
    answer?: string;
    answered: boolean;
    answeredAt?: Date;
    answeredBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const RequestSchema = new Schema<IRequest>(
    {
        fullName: {type: String, required: true},
        email: {type: String, required: true},
        question: {type: String, required: true},
        answer: {type: String},
        answered: {type: Boolean, default: false},
        answeredAt: {type: Date},
        answeredBy: {type: Schema.Types.ObjectId, ref: 'User'},
    },
    {timestamps: true}
);

RequestSchema.index({answered: 1});
RequestSchema.index({createdAt: -1});

export const Request = mongoose.model<IRequest>("Request", RequestSchema);

