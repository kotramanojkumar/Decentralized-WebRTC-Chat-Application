import type { AIToolExecution } from './AIToolRegistry';
import { findBestResponse } from './KnowledgeBase';

export interface AIResponse {
  text: string;
  execution?: AIToolExecution;
}

export class AIService {
  private context: Record<string, any> = {};

  public setContext(key: string, value: any) {
    this.context[key] = value;
  }

  public getContext(key: string) {
    return this.context[key];
  }

  public async processQuery(query: string): Promise<AIResponse> {
    // Simulate LLM processing time for realism
    await new Promise(r => setTimeout(r, 600));
    
    // Find the best intent match using our trained NLP Knowledge Base
    const intentMatch = findBestResponse(query);

    if (!intentMatch) {
      return { 
        text: "I'm sorry, I don't have information on that specific topic. I am Nova, trained specifically on this Decentralized WebRTC platform. Ask me about adaptive file transfers, network telemetry, security policies, or ask me to start a meeting!" 
      };
    }

    // Handle Contextual actions (like Metric Explainers)
    if (intentMatch.action === 'EXPLAIN_METRICS') {
      const isCallActive = !!this.context['currentRoomId'];
      if (!isCallActive) {
        return {
          text: 'I cannot analyze telemetry right now because you are not currently in an active meeting or transferring a file.'
        };
      }
      
      const net = this.context['networkMetrics'];
      const med = this.context['mediaMetrics'];
      
      if (!net && !med) {
        return {
          text: 'I am in a room but the telemetry engines have not emitted any data yet. Try sending a file or starting your video.'
        };
      }

      const report = `Based on the live telemetry engines:\n\n**Network:** ${net?.state || 'UNKNOWN'} (RTT: ${net?.rtt || 0}ms, Loss: ${net?.packetLoss?.toFixed(2) || 0}%).\n**Media:** ${med?.state || 'UNKNOWN'} (Dropped Frames: ${med?.framesDropped || 0}).\n\nThe Adaptive Coordinator is actively managing your session to prevent buffer overflows.`;
      
      return {
        text: report,
        execution: { action: 'EXPLAIN_METRICS', riskLevel: 'LOW' }
      };
    }

    // Standard Action Executions
    if (intentMatch.action) {
      return {
        text: intentMatch.response,
        execution: {
          action: intentMatch.action,
          payload: intentMatch.actionPayload,
          riskLevel: intentMatch.action === 'CREATE_ROOM' ? 'MEDIUM' : 'LOW'
        }
      };
    }

    // Standard Knowledge Responses
    return { text: intentMatch.response };
  }
}

export const aiService = new AIService();

