import type { MemoryItem, MemoryType } from '../types';

export class MemoryService {
  /**
   * Fetch all stored memories via Window IPC or LocalStorage fallback
   */
  public async getMemories(type?: MemoryType): Promise<MemoryItem[]> {
    if (window.nova?.getMemories) {
      try {
        return await window.nova.getMemories(type);
      } catch (err) {
        console.warn('[MEMORY] IPC getMemories failed:', err);
      }
    }
    const raw = localStorage.getItem('nova_memories');
    if (!raw) return [];
    try {
      const items: MemoryItem[] = JSON.parse(raw);
      if (type) return items.filter(m => m.type === type);
      return items;
    } catch {
      return [];
    }
  }

  /**
   * Save or update a memory item
   */
  public async saveMemory(item: Omit<MemoryItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<MemoryItem> {
    if (window.nova?.saveMemory) {
      try {
        return await window.nova.saveMemory(item);
      } catch (err) {
        console.warn('[MEMORY] IPC saveMemory failed:', err);
      }
    }

    const items = await this.getMemories();
    const now = Date.now();
    const id = item.id || crypto.randomUUID();
    const existingIdx = items.findIndex(m => m.id === id || (m.key.toLowerCase() === item.key.toLowerCase() && m.type === item.type));

    const record: MemoryItem = {
      id: existingIdx >= 0 ? items[existingIdx].id : id,
      type: item.type || 'long_term',
      key: item.key,
      value: item.value,
      category: item.category || 'General',
      createdAt: existingIdx >= 0 ? items[existingIdx].createdAt : now,
      updatedAt: now,
    };

    if (existingIdx >= 0) {
      items[existingIdx] = record;
    } else {
      items.push(record);
    }
    localStorage.setItem('nova_memories', JSON.stringify(items));
    return record;
  }

  /**
   * Delete a memory item by ID
   */
  public async deleteMemory(id: string): Promise<boolean> {
    if (window.nova?.deleteMemory) {
      try {
        return await window.nova.deleteMemory(id);
      } catch (err) {
        console.warn('[MEMORY] IPC deleteMemory failed:', err);
      }
    }

    const items = await this.getMemories();
    const updated = items.filter(m => m.id !== id);
    localStorage.setItem('nova_memories', JSON.stringify(updated));
    return true;
  }

  /**
   * Clear memories
   */
  public async clearMemories(type?: MemoryType): Promise<boolean> {
    if (window.nova?.clearMemories) {
      try {
        return await window.nova.clearMemories(type);
      } catch (err) {
        console.warn('[MEMORY] IPC clearMemories failed:', err);
      }
    }

    if (type) {
      const items = (await this.getMemories()).filter(m => m.type !== type);
      localStorage.setItem('nova_memories', JSON.stringify(items));
    } else {
      localStorage.removeItem('nova_memories');
    }
    return true;
  }

  /**
   * Detect and handle natural memory commands (e.g. "Remember that...", "Forget...")
   */
  public async handleNaturalMemoryCommand(userText: string): Promise<{ handled: boolean; responseMessage?: string }> {
    const trimmed = userText.trim();

    // 1. "Show my memories" / "What do you remember?"
    if (/^(show|list|view|what do you remember|get)\s+(my\s+)?memor(ies|y)/i.test(trimmed)) {
      const memories = await this.getMemories();
      if (memories.length === 0) {
        return {
          handled: true,
          responseMessage: '🧠 **Nova Memory is empty.** You can teach me facts using `"Remember that [fact]"` or `"Remember I prefer [preference]"`.',
        };
      }

      const formatted = memories
        .map((m, i) => `${i + 1}. **[${m.type.toUpperCase()}]** ${m.key}: ${m.value}`)
        .join('\n');

      return {
        handled: true,
        responseMessage: `🧠 **Stored Memory Items (${memories.length}):**\n\n${formatted}\n\n*You can manage or clear memories in Nova Settings (⚙️) -> Memory Manager.*`,
      };
    }

    // 2. "Remember that [key/value]" or "Remember I prefer [preference]"
    const rememberMatch = /^remember\s+(that\s+|i\s+prefer\s+)?(.+)/i.exec(trimmed);
    if (rememberMatch) {
      const fact = rememberMatch[2].trim();
      if (fact) {
        const isPref = /prefer|like|always|enjoy|use/i.test(fact);
        const type: MemoryType = isPref ? 'user_preference' : 'long_term';
        const parts = fact.split(/\s+is\s+|\s+called\s+|\s+:\s+/i);
        const key = parts.length > 1 ? parts[0].trim() : fact.slice(0, 30);
        const value = parts.length > 1 ? parts.slice(1).join(' is ').trim() : fact;

        await this.saveMemory({ type, key, value, category: isPref ? 'Preference' : 'Fact' });
        return {
          handled: true,
          responseMessage: `🧠 **Saved to Memory!**\n- **Category**: ${type}\n- **Key**: ${key}\n- **Value**: ${value}`,
        };
      }
    }

    // 3. "Forget [key]"
    const forgetMatch = /^forget\s+(that\s+|about\s+)?(.+)/i.exec(trimmed);
    if (forgetMatch) {
      const target = forgetMatch[2].trim().toLowerCase();
      const memories = await this.getMemories();
      const match = memories.find(m => m.key.toLowerCase().includes(target) || m.value.toLowerCase().includes(target));

      if (match) {
        await this.deleteMemory(match.id);
        return {
          handled: true,
          responseMessage: `🗑️ **Memory Forgotten:** "${match.key}: ${match.value}"`,
        };
      } else {
        return {
          handled: true,
          responseMessage: `⚠️ Could not find a memory matching "${target}".`,
        };
      }
    }

    return { handled: false };
  }

  /**
   * Build System Context String incorporating stored memories for AI Prompts
   */
  public async buildMemoryContext(): Promise<string> {
    const memories = await this.getMemories();
    if (memories.length === 0) return '';

    const lines = memories.map(m => `- [${m.type}]: ${m.key} -> ${m.value}`);
    return `\n\n[USER & PROJECT MEMORY CONTEXT]\n${lines.join('\n')}\nUse these stored memories to personalize responses seamlessly.\n`;
  }
}

export const memoryService = new MemoryService();
