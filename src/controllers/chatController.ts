import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { log } from '../util/console-logger';

interface Message {
  id: string;
  senderId: string;
  senderType: 'customer' | 'agent' | 'ai';
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'file';
}

interface Conversation {
  id: string;
  customerId: string;
  agentId: string;
  type: 'ai_assistant' | 'live_chat';
  status: 'active' | 'closed' | 'pending';
  createdAt: string;
  lastMessageAt: string;
  messages: Message[];
}

interface AIResponse {
  triggers: string[];
  response: string;
  next_action: string;
}

class ChatController {
  private dataPath: string;

  constructor() {
    this.dataPath = path.join(__dirname, '../data/chat.json');
  }

  private loadData(): any {
    try {
      const data = fs.readFileSync(this.dataPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      log.error('chat', 'Failed to load chat data', error);
      return { conversations: [], ai_responses: {}, agents: [], ai_assistant: {} };
    }
  }

  private saveData(data: any): void {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      log.error('chat', 'Failed to save chat data', error);
    }
  }

  // Start a new conversation
  async startConversation(req: Request, res: Response): Promise<void> {
    try {
      const { customerId, type = 'ai_assistant' } = req.body;

      if (!customerId) {
        res.status(400).json({ error: 'Customer ID is required' });
        return;
      }

      const data = this.loadData();
      const conversationId = `conv_${Date.now()}`;
      
      // For AI assistant, use the AI assistant ID
      // For live chat, find an available agent
      let agentId = 'ai_assistant';
      if (type === 'live_chat') {
        const availableAgent = data.agents.find((agent: any) => 
          agent.status === 'online' && agent.currentConversations < 5
        );
        if (availableAgent) {
          agentId = availableAgent.id;
          availableAgent.currentConversations++;
        } else {
          res.status(503).json({ error: 'No available agents at the moment' });
          return;
        }
      }

      const conversation: Conversation = {
        id: conversationId,
        customerId,
        agentId,
        type,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString(),
        messages: []
      };

      data.conversations.push(conversation);
      this.saveData(data);

      log.info('chat', 'Conversation started', { conversationId, customerId, type });
      res.status(201).json({
        success: true,
        conversation,
        message: 'Conversation started successfully'
      });
    } catch (error) {
      log.error('chat', 'Error starting conversation', error);
      res.status(500).json({ error: 'Failed to start conversation' });
    }
  }

  // Send a message
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId, content, senderId, senderType = 'customer' } = req.body;

      if (!conversationId || !content || !senderId) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const data = this.loadData();
      const conversation = data.conversations.find((conv: Conversation) => conv.id === conversationId);

      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      if (conversation.status === 'closed') {
        res.status(400).json({ error: 'Conversation is closed' });
        return;
      }

      const messageId = `msg_${Date.now()}`;
      const message: Message = {
        id: messageId,
        senderId,
        senderType,
        content,
        timestamp: new Date().toISOString(),
        type: 'text'
      };

      conversation.messages.push(message);
      conversation.lastMessageAt = new Date().toISOString();

      // If it's an AI assistant conversation and the message is from customer, generate AI response
      if (conversation.type === 'ai_assistant' && senderType === 'customer') {
        const aiResponse = this.generateAIResponse(content, data.ai_responses);
        if (aiResponse) {
          const aiMessage: Message = {
            id: `msg_${Date.now()}_ai`,
            senderId: 'ai_assistant',
            senderType: 'ai',
            content: aiResponse,
            timestamp: new Date().toISOString(),
            type: 'text'
          };
          conversation.messages.push(aiMessage);
        }
      }

      this.saveData(data);

      log.info('chat', 'Message sent', { conversationId, messageId, senderType });
      res.status(200).json({
        success: true,
        message,
        conversation: {
          id: conversation.id,
          status: conversation.status,
          lastMessageAt: conversation.lastMessageAt
        }
      });
    } catch (error) {
      log.error('chat', 'Error sending message', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }

  // Get conversation messages
  async getConversationMessages(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const data = this.loadData();
      
      const conversation = data.conversations.find((conv: Conversation) => conv.id === conversationId);

      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      res.status(200).json({
        success: true,
        conversation: {
          id: conversation.id,
          type: conversation.type,
          status: conversation.status,
          messages: conversation.messages
        }
      });
    } catch (error) {
      log.error('chat', 'Error getting conversation messages', error);
      res.status(500).json({ error: 'Failed to get conversation messages' });
    }
  }

  // Get customer conversations
  async getCustomerConversations(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const data = this.loadData();
      
      const conversations = data.conversations.filter((conv: Conversation) => 
        conv.customerId === customerId
      );

      res.status(200).json({
        success: true,
        conversations: conversations.map((conv: Conversation) => ({
          id: conv.id,
          type: conv.type,
          status: conv.status,
          createdAt: conv.createdAt,
          lastMessageAt: conv.lastMessageAt,
          messageCount: conv.messages.length
        }))
      });
    } catch (error) {
      log.error('chat', 'Error getting customer conversations', error);
      res.status(500).json({ error: 'Failed to get customer conversations' });
    }
  }

  // Close conversation
  async closeConversation(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const data = this.loadData();
      
      const conversation = data.conversations.find((conv: Conversation) => conv.id === conversationId);

      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      conversation.status = 'closed';

      // If it was a live chat, update agent's conversation count
      if (conversation.type === 'live_chat') {
        const agent = data.agents.find((a: any) => a.id === conversation.agentId);
        if (agent) {
          agent.currentConversations = Math.max(0, agent.currentConversations - 1);
        }
      }

      this.saveData(data);

      log.info('chat', 'Conversation closed', { conversationId });
      res.status(200).json({
        success: true,
        message: 'Conversation closed successfully'
      });
    } catch (error) {
      log.error('chat', 'Error closing conversation', error);
      res.status(500).json({ error: 'Failed to close conversation' });
    }
  }

  // Get available agents
  async getAvailableAgents(req: Request, res: Response): Promise<void> {
    try {
      const data = this.loadData();
      const availableAgents = data.agents.filter((agent: any) => 
        agent.status === 'online' && agent.currentConversations < 5
      );

      res.status(200).json({
        success: true,
        agents: availableAgents
      });
    } catch (error) {
      log.error('chat', 'Error getting available agents', error);
      res.status(500).json({ error: 'Failed to get available agents' });
    }
  }

  // Generate AI response based on message content
  private generateAIResponse(message: string, aiResponses: any): string | null {
    const lowerMessage = message.toLowerCase();
    
    for (const [key, response] of Object.entries(aiResponses)) {
      const aiResponse = response as AIResponse;
      if (aiResponse.triggers.some(trigger => lowerMessage.includes(trigger))) {
        return aiResponse.response;
      }
    }

    // Default response if no specific triggers match
    return "I'm here to help with your moving needs! I can assist with quotes, scheduling, tracking, and payment questions. What would you like to know?";
  }
}

export default new ChatController(); 