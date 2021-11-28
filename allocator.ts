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

  get buffer() {
    return this.#buffer;
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
