import { Router } from 'express';
import chatController from '../controller/chatController';
import { optionalAuth } from '../middleware/authMiddleware';

const router = Router();

// Conversation routes
router.post('/conversations', optionalAuth, chatController.startConversation);
router.get('/conversations/:conversationId/messages', optionalAuth, chatController.getConversationMessages);
router.get('/conversations/customer/:customerId', optionalAuth, chatController.getCustomerConversations);
router.patch('/conversations/:conversationId/close', optionalAuth, chatController.closeConversation);

// Message routes
router.post('/messages', optionalAuth, chatController.sendMessage);

// Agent routes
router.get('/agents/available', optionalAuth, chatController.getAvailableAgents);

export default router; 