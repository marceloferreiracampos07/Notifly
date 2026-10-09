declare module 'bullmq' {
  export class Queue<T = unknown> {
    add(name: string, data: T, options?: Record<string, unknown>): Promise<unknown>;
  }

  export interface Job<T = unknown, R = unknown, N extends string = string> {
    id?: string;
    data: T;
    attemptsMade: number;
    opts: { attempts?: number };
  }
}
