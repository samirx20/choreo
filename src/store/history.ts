import { SceneDocument } from "@/types/scene";

export interface HistoryState {
  past: SceneDocument[];
  present: SceneDocument;
  future: SceneDocument[];
  transactionBaseline: SceneDocument | null;
}

const MAX_HISTORY_STEPS = 60;

export class TransactionalHistory {
  private past: SceneDocument[] = [];
  private present: SceneDocument;
  private future: SceneDocument[] = [];
  private transactionBaseline: SceneDocument | null = null;
  private isBatching = false;

  constructor(initialDocument: SceneDocument) {
    // Deep clone to ensure immutability
    this.present = JSON.parse(JSON.stringify(initialDocument));
  }

  public getPresent(): SceneDocument {
    return this.present;
  }

  public canUndo(): boolean {
    return this.past.length > 0;
  }

  public canRedo(): boolean {
    return this.future.length > 0;
  }

  /**
   * Begins a continuous batching transaction (e.g., slider drag, canvas element drag).
   * Subsequent intermediate updates mutate present without adding history entries until committed.
   */
  public startTransaction(): void {
    if (!this.isBatching) {
      this.isBatching = true;
      this.transactionBaseline = JSON.parse(JSON.stringify(this.present));
    }
  }

  /**
   * Commits the continuous batching transaction on pointerup / drag end.
   * Pushes the captured baseline into the past stack as a single undo step.
   */
  public commitTransaction(): void {
    if (this.isBatching && this.transactionBaseline) {
      // Only push to past if the document actually changed
      const hasChanged = JSON.stringify(this.transactionBaseline) !== JSON.stringify(this.present);
      if (hasChanged) {
        this.past.push(this.transactionBaseline);
        if (this.past.length > MAX_HISTORY_STEPS) {
          this.past.shift();
        }
        this.future = [];
      }
      this.transactionBaseline = null;
      this.isBatching = false;
    }
  }

  /**
   * Cancels any active transaction and rolls back to the baseline.
   */
  public cancelTransaction(): SceneDocument {
    if (this.isBatching && this.transactionBaseline) {
      this.present = this.transactionBaseline;
      this.transactionBaseline = null;
      this.isBatching = false;
    }
    return this.present;
  }

  /**
   * Applies an immediate state mutation (e.g., discrete button click, add layer, preset swap).
   */
  public pushState(newDocument: SceneDocument): void {
    if (this.isBatching) {
      // During active drag transaction, update present in-place without touching history stacks
      this.present = JSON.parse(JSON.stringify(newDocument));
      return;
    }

    // Discrete action: push current to past, clear redo future
    this.past.push(JSON.parse(JSON.stringify(this.present)));
    if (this.past.length > MAX_HISTORY_STEPS) {
      this.past.shift();
    }
    this.present = JSON.parse(JSON.stringify(newDocument));
    this.future = [];
  }

  /**
   * Undo to previous document snapshot.
   */
  public undo(): SceneDocument | null {
    if (!this.canUndo()) return null;

    const previous = this.past.pop()!;
    this.future.unshift(this.present);
    this.present = previous;
    return this.present;
  }

  /**
   * Redo to future document snapshot.
   */
  public redo(): SceneDocument | null {
    if (!this.canRedo()) return null;

    const next = this.future.shift()!;
    this.past.push(this.present);
    this.present = next;
    return this.present;
  }

  /**
   * Resets history completely (e.g. when loading a new project bundle).
   */
  public reset(newDocument: SceneDocument): void {
    this.past = [];
    this.present = JSON.parse(JSON.stringify(newDocument));
    this.future = [];
    this.transactionBaseline = null;
    this.isBatching = false;
  }
}
