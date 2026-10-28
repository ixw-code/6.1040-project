import { assembleWikiplotter } from "@/assembly/assembly.ts";

export default {
  assemble: assembleWikiplotter,
  title: "Wikiplotter",
  directory: new URL("./generated/application/", import.meta.url),
  conceptSet: {
    module: new URL("./src/assembly/concepts.ts", import.meta.url)
  },
  design: { version: 1, documents: [
    new URL('./design/types.md', import.meta.url),
    new URL('./design/compositions/ReaderProgress.md', import.meta.url),
    new URL('./design/compositions/Reading.md', import.meta.url),
  ] },

};
