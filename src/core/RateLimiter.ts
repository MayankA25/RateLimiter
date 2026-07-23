import type { RateLimiterOptions } from "../types/rateLimiting.js";

let initialized = false;
export class RateLimiter{
    private algorithm;
    private store;
    private keyGenerator;

    constructor(options: RateLimiterOptions){
        if(initialized) throw new Error("Rate limiter already initialized");

        initialized = true;
        this.algorithm = options.algorithm;
        this.store = options.store;
        this.keyGenerator = options.keyGenerator;
    }
}