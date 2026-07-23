import type { Store } from "../types/store.js";
import type { Algorithm } from "../types/algorithm.js";
import type { Result, UpdateResult } from "../types/result.js";

interface FixedWindowOptions{
    limit: number,
    window: number
}
interface FixedWindowState{
    count: number,
    expiresAt: number
}




export class FixedWindow implements Algorithm{

    private readonly limit;
    private readonly window;

    constructor(options : FixedWindowOptions){
        this.limit = options.limit;
        this.window = options.window;
    }

    async isRequestAllowed(key: string, store: Store): Promise<Result>{
        
        const updatedResult = await store.update<FixedWindowState, Result>(key, (state)=>{
            if(!state){
                const newState = {
                    count: 1,
                    expiresAt: Date.now() + this.window
                }

                return {
                    value: newState,
                    ttl: this.window,
                    result: {
                        allowed: true,
                        remaining: this.limit-1,
                        retryAfter: 0,
                        limit: this.limit
                    }
                };
            }

            if(state.expiresAt <= Date.now()){
                const newState = {
                    count: 1,
                    expiresAt: Date.now()
                }

                return {
                    value: newState,
                    ttl: this.window,
                    result: {
                        allowed: true,
                        remaining: this.limit-1,
                        retryAfter: 0,
                        limit: this.limit
                    }
                }
            }

            if(state.count >= this.limit){
                const newState = {
                    count: state.count,
                    expiresAt: state.expiresAt
                }

                return {
                    value: newState,
                    ttl: state.expiresAt - Date.now(),
                    result :{
                        allowed: false,
                        remaining: 0,
                        retryAfter: state.expiresAt - Date.now(),
                        limit: this.limit
                    }

                }
            }

            const newState = {
                count: state.count + 1,
                expiresAt: state.expiresAt
            }

            return {
                value: newState,
                ttl: state.expiresAt - Date.now(),
                result: {
                    allowed: true,
                    remaining: this.limit - newState.count,
                    retryAfter: 0,
                    limit: this.limit
                }
            };
            
        })

        return updatedResult
    }
}