import type { Store } from "./store.js";

export interface RateLimiterOptions{
    algorithm: Algorithm,
    store: Store,
    keyGenerator?: (req: any)=>string
}