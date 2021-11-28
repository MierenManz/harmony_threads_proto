// import { processMessage, CommandClient, Message } from "./test_util.ts"

let sab: SharedArrayBuffer = null as unknown as SharedArrayBuffer;
// const client = new CommandClient({prefix: "!"});
const TEXT_DECODER = new TextDecoder("utf-8", {fatal: false});
const TEXT_ENCODER = new TextEncoder();

(self as unknown as Worker).onmessage = (evt: MessageEvent<[number, number] | Uint8Array>) => {
    if (evt.data instanceof SharedArrayBuffer) {
        sab = evt.data;
    } else {
        const ptr = evt.data[0];
        const length = evt.data[0];
        const slice = new Uint8Array(sab, ptr, length);
        const ttext = TEXT_DECODER.decode(slice);
        const message = JSON.parse(TEXT_DECODER.decode(slice));
        // const ctx = await processMessage(client, message);
        const dataString = JSON.stringify(message);
        // TEXT_ENCODER.encodeInto(dataString, slice);
    }
}