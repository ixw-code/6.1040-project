import { assembleSetupWikiplotter } from "@/assembly.ts";

export default {
  assemble: assembleSetupWikiplotter,
  title: "Wikiplotter",
  directory: new URL("./generated/setup/", import.meta.url),

  design: {
    version: 1,
    documents: [
      new URL("./design/alpha/types.md", import.meta.url),
      new URL("./design/alpha/compositions/HubManagement.md", import.meta.url),
      new URL("./design/alpha/compositions/ContentManagement.md", import.meta.url),
      new URL("./design/alpha/compositions/ReaderProgress.md", import.meta.url),
      new URL("./design/alpha/compositions/Reading.md", import.meta.url),
    ],
  },
};
