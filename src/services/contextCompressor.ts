import type { Message } from '../types';

export class ContextCompressor {
  private MAX_RECENT_MESSAGES = 10;

  /**
   * Compresses long conversation history into a sliding window with an integrated context summary
   */
  public compressContext(messages: Message[]): Array<{ role: 'user' | 'assistant'; content: string }> {
    if (messages.length <= this.MAX_RECENT_MESSAGES) {
      return messages.map(m => ({ role: m.role, content: m.content }));
    }

    const olderMessages = messages.slice(0, messages.length - this.MAX_RECENT_MESSAGES);
    const recentMessages = messages.slice(messages.length - this.MAX_RECENT_MESSAGES);

    // Synthesize older message history into a clear topic summary
    const olderSummaryText = olderMessages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 150)}`)
      .join('\n');

    const summaryBlock = {
      role: 'user' as const,
      content: `[PREVIOUS CONVERSATION CONTEXT SUMMARY]\nThe conversation previously covered the following key discussion items, topics, files, and references:\n${olderSummaryText}\n[END CONTEXT SUMMARY]`,
    };

    return [summaryBlock, ...recentMessages.map(m => ({ role: m.role, content: m.content }))];
  }
}

export const contextCompressor = new ContextCompressor();
