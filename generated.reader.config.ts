import { httpWire } from "@mit-sdg/sync-engine-http/tooling";
import { assembleWikiplotter } from "@/assembly/assembly.ts";
import { readerHttpPolicy } from "@/http/policy.ts";

export default {
  assemble: assembleWikiplotter,
  title: "Wikiplotter reader",
  wireName: "ReaderWire",
  directory: new URL("./generated/reader/", import.meta.url),
  conceptSet: {
    module: new URL("./src/assembly/concepts.ts", import.meta.url)
  },
  design: { version: 1, documents: [] },
  projections: [httpWire({ policy: readerHttpPolicy, name: "ReaderWireHttp" })],
};
