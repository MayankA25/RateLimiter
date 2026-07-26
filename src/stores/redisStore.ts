import { Redis } from "ioredis";
import type { Store } from "../types/store.js";


interface RedisStoreOptions{
    url?: string;
    client?: Redis
}

interface RedisEntry<T>{
    value: T,
    expiresAt?: number
}

interface Lock{
    promise: Promise<void>
    release: ()=>void
}

export class RedisStore implements Store{
    private readonly redis;

    private readonly locks = new Map<string, Lock>();

    constructor(options: RedisStoreOptions){
        if(options.client){
            this.redis = options.client;
        }
        else if(options.url){
            this.redis = new Redis(options.url);
        }
        else{
            throw new Error("Either Provider Redis Client or URL");
        }
    }


    async get<T>(key: string): Promise<T | null>{
        const value: string|null = await this.redis.get(key);

        if(!value) return null;
        const parsedValue: RedisEntry<T> = JSON.parse(value)

        if(parsedValue.expiresAt != null && parsedValue.expiresAt != undefined && Date.now() >= parsedValue.expiresAt){
            return null;
        }

        return parsedValue.value as T;

    }

    async set<T>(key: string, value: T, ttl?:number){

        
        if(ttl != undefined){
            const data: RedisEntry<T> = {
                value,
                expiresAt: Date.now() + ttl
            }
            const serialized = JSON.stringify(data)
            await this.redis.set(key, serialized, "PX", ttl);
        }
        else{
             const data: RedisEntry<T> = {
                value
            }
            const serialized = JSON.stringify(data)
            await this.redis.set(key, serialized);
        }
    }

    async delete(key: string): Promise<void>{
        await this.redis.del(key);
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