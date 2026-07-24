import type { Algorithm } from "../types/algorithm.js";
import type { RateLimiterOptions } from "../types/rateLimiting.js";
import type { Store } from "../types/store.js";

// let initialized = false;
export class RateLimiter{
    private readonly algorithm: Algorithm;
    private readonly store: Store;
    private readonly keyGenerator;

    constructor(options: RateLimiterOptions){
        // if(initialized) throw new Error("Rate limiter already initialized");

        // initialized = true;
        this.algorithm = options.algorithm;
        this.store = options.store;
        this.keyGenerator = options.keyGenerator;
    }

    async isRequestAllowed(key: string){
        return this.algorithm.isRequestAllowed(key, this.store);
    }
}