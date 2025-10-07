export class UndoManager {
    constructor(maxUndo = 50) {
        this.undoStack = [];
        this.maxUndo = maxUndo;
    }

    /**
     * Pushes a new action onto the undo stack.
     * If the stack exceeds its maximum size, the oldest action is removed.
     * @param {any} action - The action to be stored.
     */
    push(action) {
        this.undoStack.push(action);
        if (this.undoStack.length > this.maxUndo) {
            this.undoStack.shift();
        }
    }

    /**
     * Pops and returns the most recent action from the undo stack.
     * @returns {any|undefined} The last action, or undefined if the stack is empty.
     */
    pop() {
        return this.undoStack.pop();
    }

    /**
     * Clears the entire undo stack.
     */
    clear() {
        this.undoStack = [];
    }

    /**
     * Gets the current size of the undo stack.
     * @returns {number}
     */
    getSize() {
        return this.undoStack.length;
    }
}