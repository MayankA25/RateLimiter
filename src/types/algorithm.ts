import type { Result } from "./result.js";
import type { Store } from "./store.js";


export interface Algorithm{
    isRequestAllowed: (key: string, store: Store)=>Promise<Result>
}