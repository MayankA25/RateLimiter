import type { Algorithm } from "../types/algorithm.js";
import type { RateLimiterOptions } from "../types/rateLimiting.js";
import type { Store } from "../types/store.js";

// let initialized = false;
export class RateLimiter{
    private readonly algorithm: Algorithm;
    private readonly store: Store;

    constructor(options: RateLimiterOptions){
        // if(initialized) throw new Error("Rate limiter already initialized");

        // initialized = true;

        if(!options.algorithm){
            throw new Error("Algorithm Is Required")
        }
        if(!options.store){
            throw new Error("Store Is Required");
        }

        this.algorithm = options.algorithm;
        this.store = options.store;
    }

    async isRequestAllowed(key: string){
        return this.algorithm.isRequestAllowed(key, this.store);
    }
}