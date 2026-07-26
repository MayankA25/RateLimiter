import { Collection, MongoClient } from "mongodb";
import type { Store } from "../types/store.js";

interface MongoOptions{
    uri: string;
    database: string;
    collection: string
}

interface MongoDoc<T>{
    key: string,
    value: T,
    expiresAt?: number | null
}

interface Lock{
    promise: Promise<void>
    release: ()=>void
}

export class MongoStore implements Store{

    private readonly locks = new Map<string, Lock>();

    private constructor(private readonly client: MongoClient, private collection: Collection){}

    static async create(options: MongoOptions){
        const client = new MongoClient(options.uri);
        await client.connect();

        const db = client.db(options.database);
        const collection = db.collection(options.collection);

        await collection.createIndex(
            { expiresAt: 1 },
            { expireAfterSeconds: 0 }
        )


        return new MongoStore(client, collection)
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
        const existing = this.locks.get(key);

        if(existing){
            await existing.promise;
        }

        let release!: ()=>void;

        const promise = new Promise<void>((res: ()=>void)=>{
            release = res;
        })

        this.locks.set(key, {
            promise: promise,
            release: release
        })
    }

    private async releaseLock(key: string){
        const lock = this.locks.get(key);

        if(!lock) return;

        lock.release();
        this.locks.delete(key);
    }


    async update<T, R>(key: string, updater: (current: T | null) => { value: T; ttl?: number; result: R; }): Promise<R> {
        await this.acquireLock(key);

        try{
            const value = await this.get<T>(key);

            const update = updater(value);

            await this.set<T>(key, update.value, update.ttl);

            return update.result;

        }finally{
            await this.releaseLock(key)
        }
    }

}