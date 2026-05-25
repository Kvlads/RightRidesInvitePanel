class AdminNotifyQueue {
  private queue: (() => Promise<unknown>)[] = [];
  private isProcessing = false;

  public enqueue(task: () => Promise<unknown>): void {
    this.queue.push(task);
    
    if (!this.isProcessing) {
      this.process();
    }
  }

  private async process(): Promise<void> {
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      console.log('[Admin queue] task processing');

      if (task) {
        try {
          await task();
        } catch (e) {
          console.error('[Admin queue] task error:', e);
        }
      }
    }
  }
}

export const adminQueue = new AdminNotifyQueue();