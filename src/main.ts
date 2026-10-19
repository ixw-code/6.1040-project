import { assembleWikiplotter } from "./assembly.ts";

const application = assembleWikiplotter();
console.log(JSON.stringify(Object.keys(application.publicInterface.routes).sort()));
