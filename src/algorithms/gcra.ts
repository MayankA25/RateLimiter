import type { Algorithm } from "../types/algorithm.js";
import type { Result } from "../types/result.js";
import type { Store } from "../types/store.js";


interface GCRAOptions{
    requestPerSecond: number;
    burst: number
}

interface GCRAState{
    theoreticalTimeOfArrival: number
}

export class GCRA implements Algorithm{
    
    private readonly requestPerSecond;
    private readonly burst;

    constructor(options: GCRAOptions){
        this.requestPerSecond = options.requestPerSecond;
        this.burst = options.burst;
    }

    async isRequestAllowed(key: string, store: Store){
        const updatedResult = await store.update<GCRAState, Result>(key, (currentState)=>{
            const now = Date.now();
            const interval = 1000/this.requestPerSecond;
            const burstAllowance = this.burst * interval;

            if(!currentState){
                const newState: GCRAState = {
                    theoreticalTimeOfArrival: now + interval
                };

                return {
                    value: newState,
                    ttl: burstAllowance+interval,
                    result: {
                        allowed: true,
                        retryAfter: 0,
                        limit: this.requestPerSecond
                    }
                }
            }

            const earliestAllowed = currentState.theoreticalTimeOfArrival - burstAllowance

            if(now < earliestAllowed){
                return {
                    value: currentState,
                    ttl: burstAllowance + interval,
                    result: {
                        allowed: false,
                        retryAfter: earliestAllowed - now,
                        limit: this.requestPerSecond
                    }
                }
            }

            const newState: GCRAState = {
                theoreticalTimeOfArrival: Math.max(currentState.theoreticalTimeOfArrival, now) + interval
            }

            return {
                value: newState,
                ttl: burstAllowance +interval,
                result:{
                    allowed: true,
                    retryAfter: 0,
                    limit: this.requestPerSecond
                }
            }

        });

        return updatedResult;
    }

}