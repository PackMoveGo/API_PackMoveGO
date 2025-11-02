import { configManager } from '../util/app-config-stub';
import { consoleLogger } from '../util/console-logger';

interface AIResponse {
  answer: string;
  confidence: number;
  suggestions?: string[];
  estimatedPrice?: number;
  nextSteps?: string[];
}

interface MovingQuery {
  question: string;
  context?: {
    moveType?: 'local' | 'long-distance' | 'international';
    inventory?: string[];
    distance?: number;
    specialItems?: string[];
  };
}

class AIService {
  private openaiApiKey: string;
  private openaiModel: string;
  private anthropicApiKey: string;
  private anthropicModel: string;
  private isOpenAIEnabled: boolean;
  private isAnthropicEnabled: boolean;

  constructor() {
    const aiConfig = configManager.getServicesConfig().ai;
    this.openaiApiKey = aiConfig.openai.apiKey || '';
    this.openaiModel = aiConfig.openai.model;
    this.anthropicApiKey = aiConfig.anthropic.apiKey || '';
    this.anthropicModel = aiConfig.anthropic.model;
    this.isOpenAIEnabled = aiConfig.openai.enabled;
    this.isAnthropicEnabled = aiConfig.anthropic.enabled;
  }

  async processQuery(query: MovingQuery): Promise<AIResponse> {
    try {
      consoleLogger.info('ai', 'Processing AI query', { question: query.question.substring(0, 50) + '...' });

      if (this.isOpenAIEnabled) {
        return await this.processWithOpenAI(query);
      } else if (this.isAnthropicEnabled) {
        return await this.processWithAnthropic(query);
      } else {
        return this.getFallbackResponse(query);
      }
    } catch (error) {
      consoleLogger.error('ai', 'AI processing failed', error);
      return this.getFallbackResponse(query);
    }
  }

  private async processWithOpenAI(query: MovingQuery): Promise<AIResponse> {
    const systemPrompt = this.getSystemPrompt();
    const userPrompt = this.formatUserPrompt(query);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.openaiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json() as any;
    const answer = data.choices[0]?.message?.content || 'I apologize, but I cannot provide an answer at this time.';

    return this.parseAIResponse(answer, query);
  }

  private async processWithAnthropic(query: MovingQuery): Promise<AIResponse> {
    const systemPrompt = this.getSystemPrompt();
    const userPrompt = this.formatUserPrompt(query);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.anthropicApiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.anthropicModel,
        max_tokens: 1000,
        messages: [
          { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }
        ]
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json() as any;
    const answer = data.content[0]?.text || 'I apologize, but I cannot provide an answer at this time.';

    return this.parseAIResponse(answer, query);
  }

  private getSystemPrompt(): string {
    return `You are an AI assistant for PackMoveGO, a professional moving company. Your role is to help customers with:

1. **Moving Estimates**: Provide rough estimates based on move type, distance, and inventory
2. **Packing Tips**: Offer advice on packing, organizing, and preparing for moves
3. **Service Information**: Explain different moving services (local, long-distance, international, storage, packing)
4. **Cost Factors**: Explain what affects moving costs (distance, weight, special items, timing)
5. **Preparation Guidance**: Help customers prepare for their move
6. **FAQ Answers**: Answer common moving-related questions

**Important Guidelines:**
- Always be helpful, professional, and accurate
- Provide rough estimates only (exact pricing requires a detailed quote)
- Include relevant safety and preparation tips
- Suggest next steps when appropriate
- Be encouraging and supportive
- If you can't answer something specific, direct them to contact customer service

**Response Format:**
Provide a clear, helpful answer. If appropriate, include:
- Rough cost estimates (if requested)
- Preparation tips
- Next steps
- Safety considerations

Keep responses concise but informative.`;
  }

  private formatUserPrompt(query: MovingQuery): string {
    let prompt = `Customer Question: ${query.question}`;
    
    if (query.context) {
      prompt += `\n\nContext:`;
      if (query.context.moveType) {
        prompt += `\n- Move Type: ${query.context.moveType}`;
      }
      if (query.context.distance) {
        prompt += `\n- Distance: ${query.context.distance} miles`;
      }
      if (query.context.inventory && query.context.inventory.length > 0) {
        prompt += `\n- Items: ${query.context.inventory.join(', ')}`;
      }
      if (query.context.specialItems && query.context.specialItems.length > 0) {
        prompt += `\n- Special Items: ${query.context.specialItems.join(', ')}`;
      }
    }

    return prompt;
  }

  private parseAIResponse(response: string, query: MovingQuery): AIResponse {
    // Extract estimated price if mentioned
    const priceMatch = response.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    const estimatedPrice = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : undefined;

    // Generate suggestions based on response
    const suggestions = this.generateSuggestions(query, response);

    // Determine next steps
    const nextSteps = this.determineNextSteps(query, response);

    return {
      answer: response,
      confidence: 0.8, // AI confidence level
      suggestions,
      estimatedPrice,
      nextSteps
    };
  }

  private generateSuggestions(query: MovingQuery, response: string): string[] {
    const suggestions: string[] = [];

    // Add context-based suggestions
    if (query.context?.moveType === 'long-distance') {
      suggestions.push('Consider packing services for fragile items');
      suggestions.push('Plan for multiple days of travel');
    }

    if (query.context?.specialItems?.some(item => item.toLowerCase().includes('piano'))) {
      suggestions.push('Professional piano moving service recommended');
    }

    if (query.context?.specialItems?.some(item => item.toLowerCase().includes('art'))) {
      suggestions.push('Climate-controlled transport for artwork');
    }

    // Add general suggestions
    suggestions.push('Get a detailed quote for accurate pricing');
    suggestions.push('Book your move 2-4 weeks in advance');

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  private determineNextSteps(query: MovingQuery, response: string): string[] {
    const nextSteps: string[] = [];

    // Add context-based next steps
    if (query.context?.moveType) {
      nextSteps.push(`Schedule a ${query.context.moveType} move consultation`);
    }

    if (response.toLowerCase().includes('quote') || response.toLowerCase().includes('estimate')) {
      nextSteps.push('Request a detailed quote');
    }

    if (response.toLowerCase().includes('packing')) {
      nextSteps.push('Learn about our packing services');
    }

    // Add general next steps
    nextSteps.push('Contact customer service for specific questions');
    nextSteps.push('Browse our moving services');

    return nextSteps.slice(0, 3); // Limit to 3 next steps
  }

  private getFallbackResponse(query: MovingQuery): AIResponse {
    const fallbackAnswers = [
      "I'd be happy to help you with your moving questions! For the most accurate information and pricing, I recommend contacting our customer service team directly.",
      "Thank you for your question about moving services. Our team can provide detailed information and accurate quotes based on your specific needs.",
      "I can help with general moving information, but for specific pricing and detailed quotes, please reach out to our customer service team."
    ];

    const randomAnswer = fallbackAnswers[Math.floor(Math.random() * fallbackAnswers.length)];

    return {
      answer: randomAnswer,
      confidence: 0.5,
      suggestions: [
        'Contact customer service for detailed quotes',
        'Schedule a consultation',
        'Browse our services online'
      ],
      nextSteps: [
        'Call our customer service',
        'Request a quote online',
        'Schedule a consultation'
      ]
    };
  }

  // Specialized methods for common queries
  async getMovingEstimate(context: {
    moveType: 'local' | 'long-distance' | 'international';
    distance?: number;
    inventory?: string[];
    specialItems?: string[];
  }): Promise<AIResponse> {
    const query: MovingQuery = {
      question: `What would be the estimated cost for a ${context.moveType} move?`,
      context
    };

    return this.processQuery(query);
  }

  async getPackingTips(itemType?: string): Promise<AIResponse> {
    const query: MovingQuery = {
      question: itemType 
        ? `What are the best packing tips for ${itemType}?`
        : 'What are the best packing tips for moving?'
    };

    return this.processQuery(query);
  }

  async getServiceInformation(serviceType: string): Promise<AIResponse> {
    const query: MovingQuery = {
      question: `Tell me about your ${serviceType} services.`
    };

    return this.processQuery(query);
  }

  async getPreparationGuidance(moveType: string): Promise<AIResponse> {
    const query: MovingQuery = {
      question: `How should I prepare for a ${moveType} move?`,
      context: { moveType: moveType as any }
    };

    return this.processQuery(query);
  }

  // Check if AI service is available
  isAvailable(): boolean {
    return this.isOpenAIEnabled || this.isAnthropicEnabled;
  }

  // Get service status
  getStatus(): {
    openai: boolean;
    anthropic: boolean;
    available: boolean;
  } {
    return {
      openai: this.isOpenAIEnabled,
      anthropic: this.isAnthropicEnabled,
      available: this.isAvailable()
    };
  }
}

// Export singleton instance
export const aiService = new AIService();

export default aiService; 