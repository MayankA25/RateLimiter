import type { Algorithm } from "../types/algorithm.js";
import type { Result } from "../types/result.js";
import type { Store } from "../types/store.js";

interface SlidingWindowLogOptions {
  limit: number;
  window: number;
}

interface SlidingWindowState {
  timestamps: number[];
}

export class SlidingWindowLog implements Algorithm {
  private readonly limit;
  private readonly window;

  constructor(options: SlidingWindowLogOptions) {

    if(options.limit <= 0) throw new Error("Limit Should Be Valid");

    if(options.window <= 0) throw new Error("Window should be valid");

    this.limit = options.limit;
    this.window = options.window;
  }

  async isRequestAllowed(key: string, store: Store): Promise<Result> {
    const updatedResult = await store.update<SlidingWindowState, Result>(
      key,
      (currentState) => {
        if(!currentState){
            const now = Date.now();
            const newState = {
                timestamps: [now]
            }

            return {
                value: newState,
                ttl: this.window,
                result: {
                    allowed: true,
                    remaining: this.limit - newState.timestamps.length,
                    retryAfter: 0,
                    limit: this.limit
                }
            }
        }

        const now = Date.now();

        const windowStart = now - this.window;

        const filteredTimeStamps = currentState.timestamps.filter((elem)=>elem >= windowStart);

        // const newState = {
        //     timestamps: filteredTimeStamps
        // }

        if(filteredTimeStamps.length > 0 && filteredTimeStamps.length >= this.limit){
            // const now = Date.now();
            const oldestTimeStamp = filteredTimeStamps[0]!
            const retryAfter = oldestTimeStamp + this.window - now;
            const ttl = this.window - (now - oldestTimeStamp);
            return {
                value: {
                    timestamps: filteredTimeStamps
                },
                ttl: ttl,
                result: {
                    allowed: false,
                    remaining: 0,
                    retryAfter: retryAfter,
                    limit: this.limit

                }
            }
        }
        filteredTimeStamps.push(now);
        const newState = {
            timestamps: filteredTimeStamps
        }

        const oldestTimeStamp = newState.timestamps[0]!;

        return {
            value: newState,
            ttl: this.window - (now - oldestTimeStamp),
            result: {
                allowed: true,
                remaining: this.limit - newState.timestamps.length,
                retryAfter: 0,
                limit: this.limit
            }
        }
      }
    );

    return updatedResult
  }
}
