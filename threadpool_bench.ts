import { ThreadPool } from "./threadpool.ts";
const obj = {
    author: {
        bot: false,
        id: "1290",
    },
    member: {
        id: "1290",
        name: "ree",
    },
    channel: {
        id: "1290",
    },
    guild: {
        id: "1290",
    }

}
const payload = JSON.stringify(obj);
const process = () => {
    for (let i = 0; i < 10000; i++) {
        tr.process(payload);
    }
}

const getMessages = async () => {
    for await (const f of tr) {
        console.log(f);
    }
}
const tr = new ThreadPool(new URL("./threadpool_worker.ts", import.meta.url), 10);
await Promise.all([process, getMessages]);
