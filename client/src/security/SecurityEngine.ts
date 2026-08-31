export type SecurityLevel = 'NORMAL' | 'CONFIDENTIAL' | 'HIGHLY_CONFIDENTIAL';

export const SecurityLevel = {
  NORMAL: 'NORMAL' as SecurityLevel,
  CONFIDENTIAL: 'CONFIDENTIAL' as SecurityLevel,
  HIGHLY_CONFIDENTIAL: 'HIGHLY_CONFIDENTIAL' as SecurityLevel
};

export interface SecurityPolicy {
  level: SecurityLevel;
  maxTTL: number; // 0 for infinite
  allowDownloads: boolean;
  allowCopy: boolean;
}

export class SecurityEngine {
  private worker: Worker;
  private pendingClassifications: Map<string, { resolve: (res: any) => void, reject: (err: any) => void }> = new Map();
  public currentPolicy: SecurityPolicy = {
    level: SecurityLevel.NORMAL,
    maxTTL: 0,
    allowDownloads: true,
    allowCopy: true
  };

  public onPolicyChanged: (policy: SecurityPolicy) => void = () => {};

  constructor() {
    this.worker = new Worker(new URL('../ai/worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e) => {
      const { id, result, error } = e.data;
      if (this.pendingClassifications.has(id)) {
        const { resolve, reject } = this.pendingClassifications.get(id)!;
        if (error) {
          console.error('AI Error:', error);
          reject(new Error(error));
        } else {
          resolve(result);
        }
        this.pendingClassifications.delete(id);
      }
    };
  }

  // Uses regex + optional AI classification
  public async classifyContext(text: string): Promise<SecurityLevel> {
    const lower = text.toLowerCase();
    
    // Hardcoded keyword heuristics (Instant)
    if (lower.includes('password') || lower.includes('ssn') || lower.includes('credit card')) {
      return SecurityLevel.HIGHLY_CONFIDENTIAL;
    }
    
    if (lower.includes('internal') || lower.includes('confidential')) {
      return SecurityLevel.CONFIDENTIAL;
    }

    // AI based sentiment/classification with a strict timeout so it doesn't block real-time chat
    try {
      const aiRes = await Promise.race([
        this.askAIClassify(text),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AI Timeout')), 100))
      ]);
      
      if (aiRes && aiRes.label === 'NEGATIVE' && aiRes.score > 0.9) {
        return SecurityLevel.CONFIDENTIAL;
      }
    } catch (e) {
      // AI took too long (e.g. models are still downloading) or failed, fallback to normal
    }

    return SecurityLevel.NORMAL;
  }

  public async evaluateMessage(text: string) {
    const level = await this.classifyContext(text);
    this.updatePolicy(level);
  }

  private updatePolicy(newLevel: SecurityLevel) {
    if (this.currentPolicy.level !== newLevel) {
      let nextPolicy = { ...this.currentPolicy, level: newLevel };
      
      switch(newLevel) {
        case SecurityLevel.NORMAL:
          nextPolicy = { level: newLevel, maxTTL: 0, allowDownloads: true, allowCopy: true };
          break;
        case SecurityLevel.CONFIDENTIAL:
          // Force ephemeral 60s, allow downloads
          nextPolicy = { level: newLevel, maxTTL: 60, allowDownloads: true, allowCopy: true };
          break;
        case SecurityLevel.HIGHLY_CONFIDENTIAL:
          // Force ephemeral 10s, block downloads and copy
          nextPolicy = { level: newLevel, maxTTL: 10, allowDownloads: false, allowCopy: false };
          break;
      }
      
      this.currentPolicy = nextPolicy;
      this.onPolicyChanged(this.currentPolicy);
    }
  }

  public askAISummarize(text: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      
      // Fallback timeout in case the Web Worker crashes on initialization (e.g., WASM/CORS issues)
      const timeoutId = setTimeout(() => {
        if (this.pendingClassifications.has(id)) {
          this.pendingClassifications.delete(id);
          resolve("Local AI processing timed out. (Mock Summary): " + text.substring(0, 150) + "...");
        }
      }, 15000); // Wait 15s to allow for initial model download, then fallback

      this.pendingClassifications.set(id, { 
        resolve: (res) => { clearTimeout(timeoutId); resolve(res); }, 
        reject: (err) => { clearTimeout(timeoutId); reject(err); } 
      });
      
      this.worker.postMessage({ action: 'summarize', text, id });
    });
  }

  private askAIClassify(text: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      this.pendingClassifications.set(id, { resolve, reject });
      this.worker.postMessage({ action: 'classify', text, id });
    });
  }
}
