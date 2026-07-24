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

class SlidingWindowLog implements Algorithm {
  private readonly limit;
  private readonly window;

  constructor(options: SlidingWindowLogOptions) {
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

        const prevTIme = now - this.window;

        const filterTimeStamps = currentState.timestamps.filter((elem)=>elem >= prevTIme);

        const newState = {
            timestamps: filterTimeStamps
        }

        if(newState.timestamps.length > 0 && newState.timestamps.length >= this.limit){
            const now = Date.now();
            const retryAfter = newState.timestamps[0] + this.window - now;
            const ttl = this.window - (now - newState.timestamps[0]);
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

        filterTimeStamps.push(Date.now());
        const newState = {
            timestamps: FileSystemDirectoryReader
        }
      },
    );
  }
}
