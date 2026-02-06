export interface Skill {
  id: string;
  name: string;
  plugin: string;
  path: string;
  description: string;
  triggers: string[];
  usageCount: number;
  lastUsedAt: Date | null;
}

export interface SkillUsage {
  skillId: string;
  sessionId: string;
  timestamp: Date;
}
