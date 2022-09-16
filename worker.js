import { Worker } from "./worker-messenger.ts";

const w = new Worker();

const TEXT_DECODER = new TextDecoder();

for await (const buff of w) {
  console.log(TEXT_DECODER.decode(buff), w.id);
}
