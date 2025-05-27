import mongoose from "mongoose";

export interface PairTokens {
    accessToken: string;
    refreshToken?: string;
}