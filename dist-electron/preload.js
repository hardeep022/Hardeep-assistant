import { contextBridge } from "electron";
//#region electron/preload.ts
contextBridge.exposeInMainWorld("nova", { version: "1.0.0" });
//#endregion
export {};
