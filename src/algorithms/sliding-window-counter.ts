import type { Algorithm } from "../types/algorithm.js";
import type { Result } from "../types/result.js";
import type { Store } from "../types/store.js";

interface SlidingWindowCounterOptions {
  limit: number;
  window: number;
}

interface SlidingWindowCounterState {
  prevWindow: number;
  currWindow: number;
  currWindowStart: number;
}

export class SlidingWindowCounter implements Algorithm {
  private readonly limit: number;
  private readonly window: number;

  constructor(options: SlidingWindowCounterOptions) {
    this.limit = options.limit;
    this.window = options.window;
  }

  async isRequestAllowed(key: string, store: Store):Promise<Result>{
    const updatedResult = await store.update<SlidingWindowCounterState, Result>(key, (currentState)=>{

      const now = Date.now();
      const windowStart = Math.floor(now / this.window) * this.window;

      if(!currentState){
        const newState:SlidingWindowCounterState = {
          prevWindow: 0,
          currWindow: 1,
          currWindowStart: windowStart
        };

        const remaining = this.limit - 1;

        return {
          value: newState,
          ttl: (windowStart + this.window - now) + this.window,
          result: {
            allowed: true,
            remaining: remaining,
            retryAfter: 0,
            limit: this.limit
          }
        }
      }

      
      const windowsPassed = Math.floor((windowStart - currentState.currWindowStart)/this.window);

      let totalRequests: number;

      const newState:SlidingWindowCounterState = {
        ...currentState
      }

      const weight = (this.window - (now - windowStart))/this.window;
      if(windowsPassed === 0){
        const prevReq = currentState.prevWindow * weight;
        const currReq = currentState.currWindow;

        totalRequests = prevReq + currReq;
        newState.currWindow = currReq
      }
      else if(windowsPassed === 1){
        // const weight = this.window - (now - windowStart);
        const prevReq = currentState.currWindow * weight;
        const currReq = 0;

        totalRequests = prevReq + currReq;
        newState.prevWindow = currentState.currWindow;
        newState.currWindow = 0;
        newState.currWindowStart = windowStart;
      }
      else{
        // const weight = this.window - (now - windowStart);
        const prevReq = 0;
        const currReq = 0;

        totalRequests = prevReq + currReq;

        newState.prevWindow = prevReq;
        newState.currWindow = currReq;

        newState.currWindowStart = windowStart;
      }

      if(totalRequests >= this.limit){

        const ttl = (this.window - (now - windowStart)) + this.window

        const retryAfter: number = this.window - (now - windowStart)

        return {
          value: newState,
          ttl: ttl,
          result: {
            allowed: false,
            remaining: 0,
            retryAfter: retryAfter,
            limit: this.limit
          }
        }
      }

      const updatedState: SlidingWindowCounterState = {
        ...newState,
        currWindow : newState.currWindow + 1,
      }

      const ttl = (this.window - (now - windowStart)) + this.window;

      return {
        value: updatedState,
        ttl: ttl,
        result: {
          allowed: true,
          remaining: Math.max(0, Math.floor(this.limit - (totalRequests + 1))),
          retryAfter: 0,
          limit: this.limit
        }
      }

    });

    return updatedResult;
  }

}
