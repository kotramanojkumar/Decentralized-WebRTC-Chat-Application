export type AIToolAction = 'CREATE_ROOM' | 'EXPLAIN_METRICS' | 'NAVIGATE' | 'UNKNOWN';

export interface AIToolExecution {
  action: AIToolAction;
  payload?: any;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class AIToolRegistry {
  private static registeredTools = new Map<AIToolAction, (payload: any) => void>();

  static registerTool(action: AIToolAction, handler: (payload: any) => void) {
    this.registeredTools.set(action, handler);
  }

  static executeTool(execution: AIToolExecution): boolean {
    const handler = this.registeredTools.get(execution.action);
    if (handler) {
      handler(execution.payload);
      return true;
    }
    return false;
  }
}
