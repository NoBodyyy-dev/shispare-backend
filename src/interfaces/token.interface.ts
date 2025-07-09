import mongoose from "mongoose";

interface TokenInterface {
    _id: string;
    refreshToken: string;
    userID: mongoose.Types.ObjectId;
}

export default TokenInterface;