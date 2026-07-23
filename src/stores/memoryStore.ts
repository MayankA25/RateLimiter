import type { Store } from "../types/store.js";

interface MemoryEntry<T> {
  value: T;
  expiresAt?: number;
}

interface Lock{
    promise: Promise<void>
    release: ()=>void
}

export class MemoryStore implements Store {
  private readonly store = new Map<string, MemoryEntry<unknown>>();

  private readonly locks = new Map<string, Lock>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    if (
      entry.expiresAt !== null &&
      entry.expiresAt !== undefined &&
      entry.expiresAt <= Date.now()
    ) {
      this.store.delete(key);

      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (ttl !== undefined) {
      this.store.set(key, {
        value,
        expiresAt: Date.now() + ttl,
      });
    } else {
      this.store.set(key, {
        value,
      });
    }
  }

  async delete(key: string) {
    this.store.delete(key);
  }

  async acquireLock(key: string){
    const existing = this.locks.get(key);

    if(existing){
        await existing.promise;
    }

    // ! --> defining that the variable is not right now but it will be assigned right value before beign used. 
    let release!: ()=>void;

    const promise = new Promise<void>((resolve)=>{
        release = resolve;
    })

    this.locks.set(key, {
        promise,
        release: release
    })
  }

  async releaseLock(key: string){
    const lock = this.locks.get(key);

    if(!lock) return;

    lock.release();

    this.locks.delete(key);
  }

  async update<T, R>(key: string, updater: (current: T | null) => { value: T; ttl?: number; result: R }): Promise<R> {
      await this.acquireLock(key);
      try{

          const currentVal = await this.get<T>(key);
          const update = updater(currentVal);

          await this.set(key, update.value, update.ttl);

          // return result.value;
          return update.result
        }
        finally{
            await this.releaseLock(key);
        }
    }

  
}
