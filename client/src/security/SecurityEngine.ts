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
  public currentPolicy: SecurityPolicy = {
    level: SecurityLevel.NORMAL,
    maxTTL: 0,
    allowDownloads: true,
    allowCopy: true
  };

  public onPolicyChanged: (policy: SecurityPolicy) => void = () => {};

  constructor() {}

  public async evaluateMessage(message: string): Promise<SecurityPolicy> {
    // Basic static fallback without AI worker
    const lower = message.toLowerCase();
    if (lower.includes('password') || lower.includes('secret') || lower.includes('confidential')) {
      this.currentPolicy = { level: SecurityLevel.CONFIDENTIAL, maxTTL: 3600, allowDownloads: false, allowCopy: true };
    } else if (lower.includes('ssn') || lower.includes('credit card') || lower.includes('highly confidential')) {
      this.currentPolicy = { level: SecurityLevel.HIGHLY_CONFIDENTIAL, maxTTL: 60, allowDownloads: false, allowCopy: false };
    } else {
      this.currentPolicy = { level: SecurityLevel.NORMAL, maxTTL: 0, allowDownloads: true, allowCopy: true };
    }
    this.onPolicyChanged(this.currentPolicy);
    return this.currentPolicy;
  }
}
