import { useRef, useCallback } from "react";

const STACK_LIMIT = 50;
const SNAPSHOT_INTERVAL = 1200; // ms

/**
 * Manages undo/redo for the plain-text code editor.
 *
 * Returns refs (not state) so mutations never cause re-renders.
 * Call `maybeSnapshot(previousValue, nextText)` before each commit to
 * decide whether the change deserves its own undo entry.
 * Call `popUndo(currentValue)` / `popRedo(currentValue)` to navigate history.
 */
const useCodeUndo = () => {
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const lastSnapshotTimeRef = useRef(Date.now());
  const lastSnapshotTextRef = useRef("");

  const maybeSnapshot = useCallback((previousValue, nextText) => {
    const prevSnapshotText = lastSnapshotTextRef.current || "";
    const lenDelta = nextText.length - prevSnapshotText.length;
    const insertedSingleChar =
      lenDelta === 1 && nextText.startsWith(prevSnapshotText);
    const deletedSingleChar =
      lenDelta === -1 && prevSnapshotText.startsWith(nextText);
    const singleCharEdit = insertedSingleChar || deletedSingleChar;
    const whitespaceBoundary = /\s$/.test(nextText);
    const timeExceeded =
      Date.now() - lastSnapshotTimeRef.current > SNAPSHOT_INTERVAL;
    const structuralEdit = Math.abs(lenDelta) > 1;

    const needsSnapshot =
      undoStackRef.current.length === 0 ||
      !singleCharEdit ||
      structuralEdit ||
      whitespaceBoundary ||
      timeExceeded;

    if (needsSnapshot) {
      const stack = undoStackRef.current;
      if (stack.length === 0 || stack[stack.length - 1] !== previousValue) {
        stack.push(previousValue);
        if (stack.length > STACK_LIMIT) stack.shift();
      }
      redoStackRef.current = [];
      lastSnapshotTimeRef.current = Date.now();
    }

    lastSnapshotTextRef.current = nextText;
  }, []);

  const popUndo = useCallback((currentValue) => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return null;
    const previousValue = stack.pop();
    const redoStack = redoStackRef.current;
    redoStack.push(currentValue);
    if (redoStack.length > STACK_LIMIT) redoStack.shift();
    lastSnapshotTimeRef.current = Date.now();
    lastSnapshotTextRef.current = String(previousValue || "").replace(
      /<[^>]+>/g,
      "",
    );
    return previousValue;
  }, []);

  const popRedo = useCallback((currentValue) => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return null;
    const nextValue = stack.pop();
    const undoStack = undoStackRef.current;
    undoStack.push(currentValue);
    if (undoStack.length > STACK_LIMIT) undoStack.shift();
    lastSnapshotTimeRef.current = Date.now();
    lastSnapshotTextRef.current = String(nextValue || "").replace(
      /<[^>]+>/g,
      "",
    );
    return nextValue;
  }, []);

  return {
    undoStackRef,
    redoStackRef,
    lastSnapshotTimeRef,
    lastSnapshotTextRef,
    maybeSnapshot,
    popUndo,
    popRedo,
  };
};

export default useCodeUndo;
