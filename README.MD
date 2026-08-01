# Rate Limiter

A production-ready, framework-agnostic rate limiting library for Node.js with multiple algorithms and pluggable storage backends.

## ✨ Features

- 🚀 Production-ready
- ⚡ High performance
- 🧩 Framework agnostic
- 🔌 Pluggable storage backends
- 📦 Written in TypeScript
- 🔒 Atomic operations for concurrent requests
- 📈 Multiple rate limiting algorithms
- 🛠 Easy to extend with custom algorithms and stores

---

## Installation

```bash
npm install rate-limiter
```

or

```bash
yarn add rate-limiter
```

or

```bash
pnpm add rate-limiter
```

---

## Supported Algorithms

| Algorithm | Description |
|-----------|-------------|
| Fixed Window | Counts requests within a fixed time window. |
| Sliding Window Log | Stores timestamps for accurate limiting. |
| Sliding Window Counter | Approximation of Sliding Window Log with lower memory usage. |
| Token Bucket | Allows bursts while maintaining a refill rate. |
| Leaky Bucket | Processes requests at a constant rate. |
| GCRA | Production-grade algorithm used by APIs like Cloudflare and NGINX. |

---

## Supported Stores

- Memory Store
- Redis Store
- MongoDB Store
- PostgreSQL Store

---

# Quick Start

```ts
import {
    RateLimiter,
    MemoryStore,
    FixedWindow
} from "rate-limiter";

const limiter = new RateLimiter({
    algorithm: new FixedWindow({
        limit: 100,
        window: 60_000,
    }),
    store: new MemoryStore(),
});

const result = await limiter.isRequestAllowed("user-123");

if (!result.allowed) {
    console.log("Rate limit exceeded");
}
```

---

# Result

```ts
{
    allowed: true,
    limit: 100,
    remaining: 99,
    retryAfter: 0
}
```

---

# Storage Backends

## Memory Store

```ts
import { MemoryStore } from "rate-limiter";

const store = new MemoryStore();
```

---

## Redis Store

```ts
import { RedisStore } from "rate-limiter";

const store = new RedisStore({
    url: process.env.REDIS_URL!,
});
```

---

## MongoDB Store

```ts
import { MongoStore } from "rate-limiter";

const store = new MongoStore({
    uri: process.env.MONGO_URI!,
    dbName: "rateLimiter",
});
```

---

## PostgreSQL Store

```ts
import { PostgresStore } from "rate-limiter";

const store = new PostgresStore({
    connectionString: process.env.DATABASE_URL!,
});
```

---

# Algorithms

## Fixed Window

```ts
new FixedWindow({
    limit: 100,
    window: 60_000,
});
```

---

## Sliding Window Log

```ts
new SlidingWindowLog({
    limit: 100,
    window: 60_000,
});
```

---

## Sliding Window Counter

```ts
new SlidingWindowCounter({
    limit: 100,
    window: 60_000,
});
```

---

## Token Bucket

```ts
new TokenBucket({
    capacity: 100,
    refillRate: 10,
});
```

---

## Leaky Bucket

```ts
new LeakyBucket({
    capacity: 100,
    leakRate: 10,
});
```

---

## GCRA

```ts
new GCRA({
    requestPerSecond: 10,
    burst: 20,
});
```

---

# API

## RateLimiter

```ts
const limiter = new RateLimiter({
    algorithm,
    store,
});
```

### Check a Request

```ts
const result = await limiter.isRequestAllowed(key);
```

---

# Result Object

| Property | Type | Description |
|----------|------|-------------|
| allowed | boolean | Whether the request is allowed |
| limit | number | Maximum requests |
| remaining | number | Remaining requests |
| retryAfter | number | Retry time in milliseconds |

---

# Framework Integration

This package is framework agnostic.

Simply generate a unique key for each client and call:

```ts
await limiter.isRequestAllowed(key);
```

Examples of keys:

```ts
req.ip
```

```ts
req.user.id
```

```ts
req.session.user.id
```

```ts
apiKey
```

```ts
`${user.id}:${req.path}`
```

---

# TypeScript

Fully written in TypeScript with complete type definitions.

---

# Contributing

Contributions are welcome.

Feel free to open issues or submit pull requests.
