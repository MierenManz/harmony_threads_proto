import { Allocator } from "./allocator.ts";

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER_STREAM = new TextDecoderStream("utf-8", { fatal: false });

export class ThreadPool {
  #sabAllocator: Allocator;
  #workers: Worker[];
  #internalStream: TransformStream<string>;
  #tasks: number[];

  constructor(workerURL: URL, count: number) {
    // Set all values
    this.#workers = [];
    this.#tasks = new Array(count).fill(0);
    this.#internalStream = new TransformStream();
    this.#sabAllocator = new Allocator(1024 ** 2 * count);

    for (let i = 0; i < count; i++) {
      // Create worker
      const worker = new Worker(workerURL.href, {
        type: "module",
        name: `harmony_worker${i}`,
        deno: true,
      });

      // Event listener to handle response
      worker.onmessage = (evt: MessageEvent<[number, number]>) => {
        // Decrease task by done because it is completed
        this.#tasks[i]--;
        // Pipe output of text_decoder to internalWriter
        TEXT_DECODER_STREAM.readable.pipeTo(this.#internalStream.writable);
        // Decode memory block
        TEXT_DECODER_STREAM.writable.getWriter().write(
          new Uint8Array(this.#sabAllocator.buffer, evt.data[0], evt.data[1]),
        );
        // Deallocate memory block
        this.#sabAllocator.drop(evt.data[0]);
      };
      worker.postMessage(this.#sabAllocator.buffer);
      this.#workers[i] = worker;
    }
  }

  process(data: string): void {
    let workerID = 0;
    let smallest = this.#tasks[0];
    let worker: Worker = this.#workers[0];

    // Find least busy worker
    // Start at 1 because 0 is the default
    for (let i = 1; i < this.#tasks.length; i++) {
      if (this.#tasks[i] < smallest) {
        smallest = this.#tasks[i];
        worker = this.#workers[i];
      }
    }

    // Allocate memory
    const ptr = this.#sabAllocator.alloc(data.length);
    // Write into the allocated memory
    const slice = new Uint8Array(this.#sabAllocator.buffer, ptr!, data.length);
    console.log({slice});
    // TEXT_ENCODER.encodeInto(data, slice);
    // Add task to worker
    this.#tasks[workerID]++;
    // Send ptr and length
    worker.postMessage([ptr, data.length]);
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<string> {
    return this.#internalStream.readable[Symbol.asyncIterator]();
  }
}
