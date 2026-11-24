/** Bridge between the window and the generator (no direct access to files from the page). */
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('keygen', {
  state: () => ipcRenderer.invoke('state'),
  importKey: () => ipcRenderer.invoke('import-key'),
  generate: (input: { machine: string; customer: string; note?: string }) => ipcRenderer.invoke('generate', input),
  copy: (text: string) => ipcRenderer.invoke('copy', text),
  saveKey: (entry: unknown) => ipcRenderer.invoke('save-key', entry)
});
