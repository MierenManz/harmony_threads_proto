import { Allocator } from "./allocator.ts";

export class ThreadPool<T, R> {
  #sabAllocator: Allocator;
  #workers: Worker[];
  #internalWriter: WritableStream<R>;
  #busy: boolean[];
  constructor(workerURL: URL, count: number) {
    this.#workers = [];
    this.#busy = new Array(count).fill(false);
    this.#internalWriter = new WritableStream();
    this.#sabAllocator = new Allocator(1024 ** 2 * count);

    for (let i = 0; i < count; i++) {
      const worker = new Worker(workerURL.href, {
        type: "module",
        name: `harmony_worker${i}`,
      });
      worker.onmessage = (evt: MessageEvent<R>) => {
        this.#busy[i] = false;
        this.#internalWriter.getWriter().write(evt.data);
      };
      worker.postMessage(this.#sabAllocator.buffer);
      this.#workers[i] = worker;
    }
  }

  process(data: T): void {
    for (let i = 0; i < this.#workers.length; i++) {
      if (this.#busy[i] === false) {
        // Send ptr and length
        this.#workers[i].postMessage();
      }
    }
  }

  iterator(): void {
  }
}
