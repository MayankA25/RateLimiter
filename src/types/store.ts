// We are create a universal store so that whatever store user likes to use can use
// 1. Redis Store

import type { Result } from "./result.js"

// 2. Memory Store
export interface Store {
    get<T>(key: string): Promise<T | null>,
    set<T>(key: string, value: T, ttl?: number): Promise<void>
    delete(key: string): Promise<void>
    update<T, R>(
        key: string,
        updater: (current: T | null) => {
            value: T,
            ttl?: number,
            result: R
        }
    ): Promise<R>
}