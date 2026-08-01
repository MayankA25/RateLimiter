# Rate Forge

> A production-ready, framework-agnostic rate limiting library for Node.js with multiple algorithms and pluggable storage backends.

![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## ✨ Features

- 🚀 Production-ready
- ⚡ High performance
- 🧩 Framework agnostic
- 📦 Fully written in TypeScript
- 🔌 Pluggable storage backends
- 🔒 Atomic operations for concurrent requests
- 📈 Multiple rate limiting algorithms
- 🛠 Easily extensible
- 🎯 Simple and intuitive API

---

# Installation

```bash
npm install rate-forge
```

or

```bash
yarn add rate-forge
```

or

```bash
pnpm add rate-forge
```

---

# Quick Start

```ts
import {
    RateLimiter,
    MemoryStore,
    FixedWindow,
} from "rate-forge";

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

# Supported Algorithms

| Algorithm | Description |
|------------|-------------|
| Fixed Window | Counts requests within a fixed time window. |
| Sliding Window Log | Stores timestamps for precise rate limiting. |
| Sliding Window Counter | Memory-efficient approximation of Sliding Window Log. |
| Token Bucket | Allows burst traffic while maintaining a refill rate. |
| Leaky Bucket | Processes requests at a constant rate. |
| GCRA | Production-grade algorithm used by high-performance APIs. |

---

# Supported Stores

- Memory Store
- Redis Store
- MongoDB Store
- PostgreSQL Store

---

# Storage Examples

## Memory Store

```ts
import { MemoryStore } from "rate-forge";

const store = new MemoryStore();
```

---

## Redis Store

```ts
import { RedisStore } from "rate-forge";

const store = new RedisStore({
    url: process.env.REDIS_URL!,
});
```

---

## MongoDB Store

```ts
import { MongoStore } from "rate-forge";

const store = new MongoStore({
    uri: process.env.MONGO_URI!,
    dbName: "rateLimiter",
});
```

---

## PostgreSQL Store

```ts
import { PostgresStore } from "rate-forge";

const store = new PostgresStore({
    connectionString: process.env.DATABASE_URL!,
});
```

---

# Algorithm Examples

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

## Create a Rate Limiter

```ts
const limiter = new RateLimiter({
    algorithm,
    store,
});
```

---

## Check a Request

```ts
const result = await limiter.isRequestAllowed(key);
```

---

# Result Object

```ts
interface Result {
    allowed: boolean;
    limit: number;
    remaining: number;
    retryAfter: number;
}
```

| Property | Description |
|-----------|-------------|
| `allowed` | Whether the request is allowed |
| `limit` | Maximum number of requests |
| `remaining` | Remaining requests |
| `retryAfter` | Retry time in milliseconds |

---

# Framework Integration

Rate Forge is completely framework agnostic.

Simply generate a unique key and pass it to the rate limiter.

```ts
await limiter.isRequestAllowed(key);
```

Examples:

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

Rate Forge is fully written in TypeScript and ships with complete type definitions.

---

# Contributing

Contributions are welcome!

Feel free to open an issue or submit a pull request.

---

# License

MIT