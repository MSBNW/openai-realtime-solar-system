/**
 * Conversation Manager
 * Manages ongoing conversations across multiple task executions
 */

import fs from 'fs/promises';
import path from 'path';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  taskId?: string;
  timestamp: string;
  attachments?: {
    type: 'task_result' | 'tool_output' | 'file';
    name: string;
    content: any;
  }[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: ConversationMessage[];
  context: {
    previousTasks: string[];
    lastTaskId?: string;
    memory: Record<string, any>;
  };
  createdAt: string;
  updatedAt: string;
}

class ConversationManager {
  private conversations: Map<string, Conversation> = new Map();
  private conversationsDir = path.join(process.cwd(), '.conversations');

  async initialize() {
    // Create conversations directory
    try {
      await fs.mkdir(this.conversationsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create conversations directory:', error);
    }

    // Load existing conversations
    await this.loadConversations();
  }

  /**
   * Load conversations from disk
   */
  private async loadConversations() {
    try {
      const files = await fs.readdir(this.conversationsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.conversationsDir, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const conversation: Conversation = JSON.parse(data);
          this.conversations.set(conversation.id, conversation);
        }
      }
      console.log(`Loaded ${this.conversations.size} conversation(s)`);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(title: string): Promise<Conversation> {
    const conversation: Conversation = {
      id: `conv-${Date.now()}`,
      title,
      messages: [],
      context: {
        previousTasks: [],
        memory: {}
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.conversations.set(conversation.id, conversation);
    await this.saveConversation(conversation.id);

    return conversation;
  }

  /**
   * Get conversation by ID
   */
  getConversation(conversationId: string): Conversation | undefined {
    return this.conversations.get(conversationId);
  }

  /**
   * Get or create active conversation
   */
  async getOrCreateActiveConversation(): Promise<Conversation> {
    // Find most recent conversation or create new one
    const conversations = Array.from(this.conversations.values());
    if (conversations.length > 0) {
      conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return conversations[0];
    }

    return this.createConversation('New Conversation');
  }

  /**
   * Add message to conversation
   */
  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    options?: {
      taskId?: string;
      attachments?: ConversationMessage['attachments'];
    }
  ): Promise<ConversationMessage> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const message: ConversationMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      role,
      content,
      taskId: options?.taskId,
      timestamp: new Date().toISOString(),
      attachments: options?.attachments
    };

    conversation.messages.push(message);
    conversation.updatedAt = new Date().toISOString();

    // Update context
    if (options?.taskId && !conversation.context.previousTasks.includes(options.taskId)) {
      conversation.context.previousTasks.push(options.taskId);
      conversation.context.lastTaskId = options.taskId;
    }

    await this.saveConversation(conversationId);

    return message;
  }

  /**
   * Get conversation history formatted for Claude API
   */
  getClaudeMessages(conversationId: string, includeLastN?: number): any[] {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return [];
    }

    let messages = conversation.messages;

    // Optionally limit to last N messages to manage context window
    if (includeLastN) {
      messages = messages.slice(-includeLastN);
    }

    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * Get conversation context (previous task outputs)
   */
  getConversationContext(conversationId: string): string {
    const conversation = this.conversations.get(conversationId);
    if (!conversation || conversation.messages.length === 0) {
      return '';
    }

    // Build context from previous messages with attachments
    const contextParts: string[] = [];

    for (const msg of conversation.messages) {
      if (msg.attachments && msg.attachments.length > 0) {
        for (const attachment of msg.attachments) {
          if (attachment.type === 'task_result') {
            contextParts.push(`\n## Previous Task: ${attachment.name}\n${JSON.stringify(attachment.content, null, 2)}`);
          }
        }
      }
    }

    return contextParts.join('\n\n');
  }

  /**
   * Update conversation memory
   */
  async updateMemory(conversationId: string, key: string, value: any) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    conversation.context.memory[key] = value;
    conversation.updatedAt = new Date().toISOString();

    await this.saveConversation(conversationId);
  }

  /**
   * Get all conversations
   */
  getAllConversations(): Conversation[] {
    return Array.from(this.conversations.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversationId: string) {
    this.conversations.delete(conversationId);

    const filePath = path.join(this.conversationsDir, `${conversationId}.json`);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Failed to delete conversation file ${conversationId}:`, error);
    }
  }

  /**
   * Save conversation to disk
   */
  private async saveConversation(conversationId: string) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return;
    }

    const filePath = path.join(this.conversationsDir, `${conversationId}.json`);
    try {
      await fs.writeFile(filePath, JSON.stringify(conversation, null, 2));
    } catch (error) {
      console.error(`Failed to save conversation ${conversationId}:`, error);
    }
  }
}

// Singleton instance
let conversationManagerInstance: ConversationManager | null = null;

export async function getConversationManager(): Promise<ConversationManager> {
  if (!conversationManagerInstance) {
    conversationManagerInstance = new ConversationManager();
    await conversationManagerInstance.initialize();
  }
  return conversationManagerInstance;
}
