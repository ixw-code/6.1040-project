import { assembleSetupWikiplotter } from "@/assembly.ts";

export default {
    assemble: assembleSetupWikiplotter,
    title: "Wikiplotter",
    directory: new URL("./generated/reader/", import.meta.url),

    design: {
        version: 1,
        documents: [
            new URL("./design/types.md", import.meta.url),
            new URL("./design/compositions/HubManagement.md", import.meta.url),
            new URL("./design/compositions/ContentManagement.md", import.meta.url),
            new URL("./design/compositions/ReaderProgress.md", import.meta.url),
            new URL("./design/compositions/Reading.md", import.meta.url),
        ],
    },
};
