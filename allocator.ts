import { iterBenchSync } from "https://crux.land/3iJqdU";

type Ptr = number;

interface Block {
  size: number;
}

export class Allocator {
  #buffer: SharedArrayBuffer;
  #blockSize: number;
  #emptyBlocks: Map<Ptr, Block>;
  #blocks: Map<Ptr, Block>;

  get blockSize(): number {
    return this.#blockSize;
  }

  get buffer(): Uint8Array {
    return new Uint8Array(this.#buffer);
  }

  constructor(size: number);
  constructor(sab: SharedArrayBuffer, blockSize?: number);
  constructor(sabOrSize: number | SharedArrayBuffer, blockSize?: number) {
    this.#blockSize = blockSize || 4;

    if (sabOrSize instanceof SharedArrayBuffer) {
      this.#buffer = sabOrSize;
    } else {
      // deno-fmt-ignore
      const aligned = (sabOrSize + this.#blockSize - 1) &~(this.#blockSize - 1);
      this.#buffer = new SharedArrayBuffer(aligned);
    }
    this.#emptyBlocks = new Map([[0, { size: this.#buffer.byteLength }]]);
    this.#blocks = new Map();
  }

  alloc(size: number): Ptr | null {
    const alignedSize = (size + this.#blockSize - 1) & ~(this.#blockSize - 1);

    for (const [ptr, oldBlock] of this.#emptyBlocks) {
      if (oldBlock.size >= alignedSize) {
        oldBlock.size -= alignedSize;

        this.#blocks.set(ptr, { size: alignedSize });
        this.#emptyBlocks.delete(ptr);

        const nextEmptyBlock = this.#emptyBlocks.get(ptr + alignedSize);
        if (nextEmptyBlock) this.mergeEmpty(ptr + alignedSize);
        else this.#emptyBlocks.set(ptr + alignedSize, oldBlock);

        return ptr;
      }
    }

    return null;
  }

  drop(ptr: Ptr) {
    const baseBlockRef = this.#blocks.get(ptr)!;
    this.#blocks.delete(ptr);
    this.#emptyBlocks.set(ptr, baseBlockRef);
    this.mergeEmpty(ptr);
  }

  mergeEmpty(ptr: Ptr) {
    const baseBlockRef = this.#emptyBlocks.get(ptr);
    if (!baseBlockRef) return;

    let nextPtr = baseBlockRef.size + ptr;
    let nextBlock = this.#emptyBlocks.get(nextPtr);

    while (nextBlock) {
      this.#emptyBlocks.delete(nextPtr);
      nextPtr += nextBlock.size;
      nextBlock = this.#emptyBlocks.get(nextPtr);
    }

    baseBlockRef.size = nextPtr - ptr;
  }
}

interface BenchStats {
  iters: number;
  msPerIter: number;
  itersPerSecond: number;
}

function fixBench(b: BenchStats) {
  return {
    iters: b.iters,
    itersPerSecond: parseFloat(b.itersPerSecond.toFixed(0)),
    msPerIter: parseFloat(b.msPerIter.toFixed(5)),
  };
}

console.log("start");
const a = new Allocator(1e7);
const alloc4 = iterBenchSync(1e7 / 4, () => a.alloc(4));
let i = -4;
const drop4 = iterBenchSync(1e7 / 4, () => a.drop(i += 4));
iterBenchSync(1e7 / 4, () => a.alloc(4));
i += 4;
const dropRev4 = iterBenchSync(1e7 / 4, () => a.drop(i -= 4));

console.log("4 byte bench done");

const b = new Allocator(1e7 * 8);

const alloc32 = iterBenchSync(1e7 / 4, () => b.alloc(32));
i = -32;
const drop32 = iterBenchSync(1e7 / 4, () => b.drop(i += 32));
iterBenchSync(1e7 / 4, () => b.alloc(32));
i += 32;
const dropRev32 = iterBenchSync(1e7 / 4, () => b.drop(i -= 32));

console.log({
  alloc4: fixBench(alloc4),
  drop4: fixBench(drop4),
  dropRev4: fixBench(dropRev4),
});
console.log({
  alloc32: fixBench(alloc32),
  drop32: fixBench(drop32),
  dropRev32: fixBench(dropRev32),
});
