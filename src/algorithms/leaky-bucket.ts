import type { Algorithm } from "../types/algorithm.js";
import type { Result } from "../types/result.js";
import type { Store } from "../types/store.js";


interface LeakyBucketOptions{
    capacity: number;
    leakRate: number;
}

interface LeakyBucketState{
    level: number,
    lastUpdatedAt: number
}

export class LeakyBucket implements Algorithm {

    private readonly capacity;
    private readonly leakRate;

    constructor(options: LeakyBucketOptions){
        this.capacity = options.capacity;
        this.leakRate = options.leakRate;
    }

    async isRequestAllowed(key: string, store: Store){
        const updatedResult = await store.update<LeakyBucketState, Result>(key, (currentState)=>{
            if(!currentState){
                const now = Date.now();

                const newState = {
                    level: 1,
                    lastUpdatedAt: now
                }

                const ttl = (newState.level)/this.leakRate;

                return {
                    value: newState,
                    ttl: ttl*1000,
                    result: {
                        allowed: true,
                        remaining: Math.floor(this.capacity - newState.level),
                        retryAfter: 0,
                        limit: this.capacity
                    }
                }
            }

            const now = Date.now();
            const elapsed = (now - currentState.lastUpdatedAt)/1000;

            const leaked = elapsed * this.leakRate;

            const updatedLevel = Math.max(currentState.level - leaked, 0);

            if(updatedLevel + 1 > this.capacity){
                
                const newState = {
                    level: Math.min(updatedLevel, this.capacity),
                    lastUpdatedAt: now
                }

                const ttl = (updatedLevel)/this.leakRate;

                const retryAfter = 1/this.leakRate;

                return {
                    value: newState,
                    ttl: ttl * 1000,
                    result: {
                        allowed: false,
                        remaining: 0,
                        retryAfter: retryAfter*1000,
                        limit: this.capacity
                    }
                }
            }

            const newState = {
                level: updatedLevel + 1,
                lastUpdatedAt: now
            }

            const ttl = newState.level/this.leakRate;

            return {
                value: newState,
                ttl: ttl*1000,
                result: {
                    allowed: true,
                    remaining: Math.floor(this.capacity - newState.level),
                    retryAfter: 0,
                    limit: this.capacity
                }
            }

        });

        return updatedResult;
    }

}