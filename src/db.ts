import { MongoClient } from "mongodb";

const url = process.env.MONGODB_URL;
if (!url) 
    throw new Error("env: MONGODB_URL is missing!")

export const client = new MongoClient(url);
export const db = client.db();
