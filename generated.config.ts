import { assembleSetupWikiplotter } from "@/assembly/assembly.ts";

export default {
  assemble: assembleSetupWikiplotter,
  title: "Wikiplotter",
  directory: new URL("./generated/setup/", import.meta.url),
  conceptSet: { 
    module: new URL("./src/assembly/concepts.ts", import.meta.url)
  },
  design: { version: 1, documents: [] },

};
