import { Collection, MongoClient } from "mongodb";
import type { Store } from "../types/store.js";
import { randomUUID } from "node:crypto";

interface MongoOptions{
    uri: string;
    database: string;
    collection: string;
    lockCollection?: string;
    lockTtl?: number;
}

interface MongoDoc<T>{
    key: string,
    value: T,
    expiresAt?: number | null
}


export class MongoStore implements Store{

    private constructor(private readonly client: MongoClient, private readonly collection: Collection, private readonly lockCollection: Collection, private readonly lockTtl: number){}

    static async create(options: MongoOptions){

        if(options.uri){
            throw new Error("Mongo URI is required");
        }

        if(!options.database){
            throw new Error("Database name is required");
        }

        if(!options.collection){
            throw new Error("Mongo collection name is required");
        }

        const client = new MongoClient(options.uri);
        await client.connect();

        const db = client.db(options.database);
        const collection = db.collection(options.collection);

        await collection.createIndex(
            { expiresAt: 1 },
            { expireAfterSeconds: 0 }
        )

        const lockCollection = db.collection(options.lockCollection ? options.lockCollection : "rate_limiter_locks");

        const lockTtl = options.lockTtl ? options.lockTtl : 5000

        await lockCollection.createIndex(
            { expiresAt: 1 },
            { expireAfterSeconds: 0 }
        )

        await lockCollection.createIndex(
            { lockKey: 1 },
            { unique: true }
        )

        return new MongoStore(client, collection, lockCollection, lockTtl)
    }


    async get<T>(key: string): Promise<T | null>{
        const document = await this.collection.findOne({ key: key });

        
        if(!document) return null;

        const requiredDoc: MongoDoc<T> = {
            key: key,
            value: document.value,
            expiresAt: document.expiresAt != undefined ? new Date(document.expiresAt).getTime() : null
        }

        if(requiredDoc.expiresAt != null && requiredDoc.expiresAt != undefined && requiredDoc.expiresAt <= Date.now()){
            await this.delete(key);
            return null;
        }

        return document.value as T;
    }


    async set<T>(key: string, value: T, ttl?: number){
        await this.collection.updateOne(
            {
                key: key
            },
            {
                $set: {
                    value: value,
                    expiresAt: ttl != undefined ? new Date(Date.now() + ttl) : undefined
                }
            },
            {
                upsert: true
            }
        )
    }


    async delete(key: string): Promise<void>{
        await this.collection.deleteOne({
            key: key
        })
    }


    private async acquireLock(key: string){
       const owner = randomUUID()

        while(true){
            try{
                const result = await this.lockCollection.findOneAndUpdate(
                    {
                        lockKey: key,
                        expiresAt: {
                            $lte: new Date()
                        }
                    },
                    {
                        $set: {
                            owner,
                            expiresAt: new Date(Date.now() + this.lockTtl)
                        }
                    },
                    {
                        returnDocument: "after"
                    }
                )

                if(result) return owner;

                await this.lockCollection.insertOne({
                    lockKey: key,
                    owner: owner,
                    expiresAt: new Date(Date.now() + this.lockTtl)
                })

                return owner
            }
            catch{
                await new Promise((resolve)=>setTimeout(resolve, 50))
            }
        }
    }

    private async releaseLock(key: string, owner: string){
        await this.lockCollection.deleteOne({
            lockKey: key,
            owner: owner
        })
    }


    async update<T, R>(key: string, updater: (current: T | null) => { value: T; ttl?: number; result: R; }): Promise<R> {
        const owner = await this.acquireLock(key);

        try{
            const value = await this.get<T>(key);

            const update = updater(value);

            await this.set<T>(key, update.value, update.ttl);

            return update.result;

        }finally{
            await this.releaseLock(key, owner)
        }
    }

}