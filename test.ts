import { Threadpool } from "./threadpool.ts";

const threadpool = new Threadpool(
  new URL("./worker.js", import.meta.url),
  {
    sabByteSize: 64 * 1024,
    workerCount: 100,
  },
);

const ENCODED = new TextEncoder().encode(
  "Riddle me this. Riddle me that. Whose afraid of the big black? ",
);
// const decoder = new TextDecoder();

const start = performance.now();
for (let i = 0; i < 100_000; i++) {
  // console.log(decoder.decode(ENCODED));
  await threadpool.queue(ENCODED);
}

// threadpool.terminate();
const end = performance.now();
console.log(end - start);
const ops = Deno.metrics();
delete (ops as any).ops;
console.log(ops);
