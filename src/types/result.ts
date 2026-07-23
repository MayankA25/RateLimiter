// This is the result that will be produced after algorithm is done checking.
export interface Result{
    allowed: boolean
    remaining: number
    retryAfter: number // 0 when allowed
    limit: number
}

export interface UpdateResult<T>{
    state: T | null
    ttl?: number
    result: Result
}