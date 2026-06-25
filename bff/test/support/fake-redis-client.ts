interface StoredRedisValue {
  expiresAt: number;
  value: string;
}

interface RedisSetOptions {
  EX: number;
}

export class FakeRedisClient {
  private readonly values = new Map<string, StoredRedisValue>();

  // TTL expiry を実 Redis に依存せず検証するため、テスト側で時刻を進められるようにする。
  private now = 0;

  public connectCount = 0;

  public async connect(): Promise<void> {
    this.connectCount += 1;
  }

  public async del(key: string): Promise<number> {
    return this.values.delete(key) ? 1 : 0;
  }

  public async get(key: string): Promise<string | null> {
    const stored = this.values.get(key);

    if (stored === undefined) {
      return null;
    }

    if (stored.expiresAt <= this.now) {
      this.values.delete(key);
      return null;
    }

    return stored.value;
  }

  public async ping(): Promise<string> {
    return 'PONG';
  }

  public async set(key: string, value: string, options: RedisSetOptions): Promise<string> {
    this.values.set(key, {
      expiresAt: this.now + options.EX * 1000,
      value,
    });

    return 'OK';
  }

  public async ttl(key: string): Promise<number> {
    const stored = await this.get(key);

    if (stored === null) {
      return -2;
    }

    const value = this.values.get(key);

    if (value === undefined) {
      throw new TypeError('Redis value must exist after get');
    }

    return Math.ceil((value.expiresAt - this.now) / 1000);
  }

  public advance(milliseconds: number): void {
    this.now += milliseconds;
  }
}
