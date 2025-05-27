import mongoose from "mongoose";

interface IToken {
    _id: string;
    refreshToken: string;
    userID: mongoose.Types.ObjectId;
}

export default IToken;