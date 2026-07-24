import type { Algorithm } from "../types/algorithm.js";
import type { Result } from "../types/result.js";
import type { Store } from "../types/store.js";


interface TokenBucketOptions{
    capacity: number,
    refillRate: number
}

interface TokenBucketState{
    tokens: number,
    lastRefill: number
}

export class TokenBucket implements Algorithm{

    private readonly capacity;
    private readonly refillRate;

    constructor(options: TokenBucketOptions){
        this.capacity = options.capacity;
        this.refillRate = options.refillRate
    }

    async isRequestAllowed(key: string, store:Store):Promise<Result>{
        const result = await store.update<TokenBucketState, Result>(key, (currentState)=>{

            if(!currentState){
                const now = Date.now();
                const newState = {
                    tokens: this.capacity-1,
                    lastRefill: now
                }

                const ttl=(this.capacity-newState.tokens)/this.refillRate

                return {
                    value: newState,
                    ttl: ttl * 1000,
                    result: {
                        allowed: true,
                        remaining: Math.floor(newState.tokens),
                        retryAfter: 0,
                        limit: this.capacity
                    }
                }
            }

            const now = Date.now();
            const elapsedTime = (now - currentState.lastRefill)/1000;
            
            const earnedTokens = elapsedTime * this.refillRate
            
            const availableTokens = Math.min(this.capacity, currentState.tokens + earnedTokens)


            if(availableTokens < 1){
                // const currTime = Date.now();
                const newState = {
                    tokens: availableTokens,
                    lastRefill: now
                }
                const ttl = (this.capacity - newState.tokens)/this.refillRate;

                const retryAfter = (1-availableTokens)/this.refillRate

                return {
                    value: newState,
                    ttl: ttl*1000,
                    result: {
                        allowed: false,
                        remaining: 0,
                        retryAfter: retryAfter*1000,
                        limit: this.capacity
                    }   
                }
            }

            // const currTime = Date.now();

            const newState = {
                tokens: availableTokens-1,
                lastRefill: now
            }

            const ttl = (this.capacity - newState.tokens) / this.refillRate

            return {
                value: newState,
                ttl: ttl*1000,
                result: {
                    allowed: true,
                    remaining: Math.floor(newState.tokens),
                    retryAfter: newState.tokens < 1 ? ((1-newState.tokens)/this.refillRate)*1000 : 0,
                    limit: this.capacity
                }
            }

        });

        return result;
    }
}