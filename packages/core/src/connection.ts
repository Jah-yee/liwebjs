import type { Adapter } from "./adapters/adapter.interface";

export interface ConnectionMeta {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  protocol: string;
}

export class LiWebConnection {
  readonly id!: string;
  readonly meta!: ConnectionMeta;

  private readonly adapter: Adapter;

  constructor(id: string, meta: ConnectionMeta, adapter: Adapter) {
    this.adapter = adapter;

    Object.defineProperty(this, "id", {
      value: id,
      writable: false,
      enumerable: true,
      configurable: false,
    });

    Object.defineProperty(this, "meta", {
      value: meta,
      writable: false,
      enumerable: true,
      configurable: false,
    });
  }

  send(event: string, payload: unknown): void {
    this.adapter.send(this, event, payload);
  }

  close(): void {
    this.adapter.close(this);
  }
}