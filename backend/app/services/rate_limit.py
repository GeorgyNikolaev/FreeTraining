from redis.asyncio import Redis


async def is_limited(redis: Redis, key: str, limit: int) -> int | None:
    """Сколько секунд ждать, если лимит исчерпан, иначе None."""
    count = await redis.get(key)
    if count is None or int(count) < limit:
        return None
    ttl = await redis.ttl(key)
    return max(ttl, 1)


async def register_hit(redis: Redis, key: str, window_seconds: int) -> None:
    async with redis.pipeline(transaction=True) as pipe:
        pipe.incr(key)
        pipe.expire(key, window_seconds, nx=True)
        await pipe.execute()
