/** Window events shared between the shell and pages. */
export const NEW_CONVERSATION_EVENT = "corvus:new-conversation";
/** Fired with the memory id in `detail` after a memory is forgotten from the evidence drawer. */
export const MEMORY_FORGOTTEN_EVENT = "corvus:memory-forgotten";
/** Fired with a question in `detail` to ask it on the Ask page without reloading. */
export const ASK_EVENT = "corvus:ask";
/** Fired when the recent-questions list changes. */
export const RECENT_EVENT = "corvus:recent";
