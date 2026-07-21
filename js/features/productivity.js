/**
 * features/productivity.js — Notes framework & tasks board functionality.
 *
 * Owns: /notes and /tasks CRUD, markdown rendering, tag/folder filtering,
 * priority sorting. Left as a scaffold — wire up per section 6.5.
 */

export async function init({ store }) {
  console.info('[productivity] hub mounted — implement notes editor and task board here.');
  // TODO: notes list + markdown editor pane (sanitize rendered markdown with
  //   a safe renderer — never dangerouslySetInnerHTML raw user markdown).
  // TODO: task board with priority/status columns, drag-to-reorder optional.
}
