import { promises as fsp, existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { glob } from 'glob';
import type { Skill } from './shared-types.js';
import type { RawSessionMessage } from './types.js';

interface SkillFrontmatter {
  name?: string;
  description?: string;
  triggers?: string[];
}

interface SkillUsageStats {
  usageCount: number;
  lastUsedAt: Date | null;
}

export class SkillService {
  private claudeDir: string;
  private pluginCacheDir: string;
  private skillUsageCache: Map<string, SkillUsageStats> = new Map();
  private usageCacheTimestamp: number = 0;
  private readonly CACHE_TTL_MS = 60000; // 1 minute cache TTL

  constructor() {
    this.claudeDir = path.join(os.homedir(), '.claude');
    this.pluginCacheDir = path.join(this.claudeDir, 'plugins', 'cache');
  }

  /**
   * Get all discovered skills with usage statistics
   */
  async getSkills(): Promise<Skill[]> {
    const skills: Skill[] = [];

    // Discover skills from multiple locations
    const discoveredSkills = await this.discoverSkills();

    // Get usage stats (cached)
    await this.refreshUsageStats();

    // Merge discovered skills with usage stats
    for (const skill of discoveredSkills) {
      const usageStats = this.skillUsageCache.get(skill.id) || {
        usageCount: 0,
        lastUsedAt: null,
      };

      skills.push({
        ...skill,
        usageCount: usageStats.usageCount,
        lastUsedAt: usageStats.lastUsedAt,
      });
    }

    // Sort by usage count (most used first), then by name
    skills.sort((a, b) => {
      if (b.usageCount !== a.usageCount) {
        return b.usageCount - a.usageCount;
      }
      return a.name.localeCompare(b.name);
    });

    return skills;
  }

  /**
   * Discover skills from plugin cache directories
   */
  private async discoverSkills(): Promise<Omit<Skill, 'usageCount' | 'lastUsedAt'>[]> {
    const skills: Omit<Skill, 'usageCount' | 'lastUsedAt'>[] = [];

    if (!existsSync(this.pluginCacheDir)) {
      return skills;
    }

    // Pattern 1: Superpowers marketplace skills
    // ~/.claude/plugins/cache/superpowers-marketplace/superpowers/*/skills/*/
    const superpowersPattern = path.join(
      this.pluginCacheDir,
      'superpowers-marketplace',
      'superpowers',
      '*',
      'skills',
      '*'
    );

    // Pattern 2: Other plugin skills
    // ~/.claude/plugins/cache/*/skills/*/
    const otherPluginsPattern = path.join(this.pluginCacheDir, '*', 'skills', '*');

    try {
      // Discover superpowers skills
      const superpowersDirs = await glob(superpowersPattern, { nodir: false });
      for (const skillDir of superpowersDirs) {
        const stat = await fsp.stat(skillDir);
        if (stat.isDirectory()) {
          const skill = await this.parseSkillFromDirectory(skillDir, 'superpowers');
          if (skill) {
            skills.push(skill);
          }
        }
      }

      // Discover other plugin skills
      const otherDirs = await glob(otherPluginsPattern, { nodir: false });
      for (const skillDir of otherDirs) {
        // Skip superpowers to avoid duplicates
        if (skillDir.includes('superpowers-marketplace')) {
          continue;
        }

        const stat = await fsp.stat(skillDir);
        if (stat.isDirectory()) {
          const pluginName = this.extractPluginName(skillDir);
          const skill = await this.parseSkillFromDirectory(skillDir, pluginName);
          if (skill) {
            skills.push(skill);
          }
        }
      }
    } catch (error) {
      console.error('Error discovering skills:', error);
    }

    return skills;
  }

  /**
   * Parse a skill from a directory containing markdown files
   */
  private async parseSkillFromDirectory(
    skillDir: string,
    pluginName: string
  ): Promise<Omit<Skill, 'usageCount' | 'lastUsedAt'> | null> {
    try {
      // Look for skill markdown file
      const skillName = path.basename(skillDir);
      const possibleFiles = [
        path.join(skillDir, `${skillName}.md`),
        path.join(skillDir, 'index.md'),
        path.join(skillDir, 'skill.md'),
      ];

      let skillFile: string | null = null;
      for (const file of possibleFiles) {
        if (existsSync(file)) {
          skillFile = file;
          break;
        }
      }

      // If no standard file found, look for any .md file
      if (!skillFile) {
        const mdFiles = await glob(path.join(skillDir, '*.md'));
        if (mdFiles.length > 0) {
          skillFile = mdFiles[0];
        }
      }

      if (!skillFile) {
        // No markdown file found, create basic skill entry
        return {
          id: this.generateSkillId(pluginName, skillName),
          name: skillName,
          plugin: pluginName,
          path: skillDir,
          description: '',
          triggers: [],
        };
      }

      // Parse the markdown file
      const content = await fsp.readFile(skillFile, 'utf-8');
      const frontmatter = this.parseFrontmatter(content);

      return {
        id: this.generateSkillId(pluginName, frontmatter.name || skillName),
        name: frontmatter.name || skillName,
        plugin: pluginName,
        path: skillDir,
        description: frontmatter.description || '',
        triggers: frontmatter.triggers || [],
      };
    } catch (error) {
      console.error(`Error parsing skill from ${skillDir}:`, error);
      return null;
    }
  }

  /**
   * Parse YAML frontmatter from markdown content
   */
  private parseFrontmatter(content: string): SkillFrontmatter {
    const frontmatter: SkillFrontmatter = {};

    // Check for YAML frontmatter (between --- markers)
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return frontmatter;
    }

    const yamlContent = frontmatterMatch[1];

    // Simple YAML parsing for key: value pairs
    const lines = yamlContent.split('\n');
    let currentKey: string | null = null;
    let currentArray: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Check for array item
      if (trimmed.startsWith('- ') && currentKey) {
        currentArray.push(trimmed.slice(2).trim());
        continue;
      }

      // Save previous array if we had one
      if (currentKey && currentArray.length > 0) {
        if (currentKey === 'triggers') {
          frontmatter.triggers = currentArray;
        }
        currentArray = [];
      }

      // Check for key: value
      const keyMatch = line.match(/^(\w+):\s*(.*)/);
      if (keyMatch) {
        const [, key, value] = keyMatch;
        currentKey = key;

        if (value.trim()) {
          // Inline value - remove quotes if present
          const cleanValue = value.trim().replace(/^["']|["']$/g, '');

          switch (key) {
            case 'name':
              frontmatter.name = cleanValue;
              break;
            case 'description':
              frontmatter.description = cleanValue;
              break;
            case 'triggers':
              // Could be inline array like [trigger1, trigger2]
              if (cleanValue.startsWith('[') && cleanValue.endsWith(']')) {
                frontmatter.triggers = cleanValue
                  .slice(1, -1)
                  .split(',')
                  .map(t => t.trim().replace(/^["']|["']$/g, ''));
              }
              break;
          }
        }
      }
    }

    // Handle any remaining array
    if (currentKey === 'triggers' && currentArray.length > 0) {
      frontmatter.triggers = currentArray;
    }

    return frontmatter;
  }

  /**
   * Extract plugin name from a skill directory path
   */
  private extractPluginName(skillDir: string): string {
    // Path format: ~/.claude/plugins/cache/{plugin-name}/skills/{skill-name}
    const parts = skillDir.split(path.sep);
    const cacheIndex = parts.indexOf('cache');
    if (cacheIndex !== -1 && cacheIndex + 1 < parts.length) {
      return parts[cacheIndex + 1];
    }
    return 'unknown';
  }

  /**
   * Generate a unique skill ID
   */
  private generateSkillId(pluginName: string, skillName: string): string {
    return `${pluginName}:${skillName}`;
  }

  /**
   * Refresh skill usage stats from session files
   */
  private async refreshUsageStats(): Promise<void> {
    const now = Date.now();

    // Check if cache is still valid
    if (now - this.usageCacheTimestamp < this.CACHE_TTL_MS) {
      return;
    }

    this.skillUsageCache.clear();

    const projectsDir = path.join(this.claudeDir, 'projects');
    if (!existsSync(projectsDir)) {
      this.usageCacheTimestamp = now;
      return;
    }

    try {
      // Find all session files
      const sessionFiles = await glob(path.join(projectsDir, '**/*.jsonl'));

      for (const sessionFile of sessionFiles) {
        await this.parseSessionFileForSkillUsage(sessionFile);
      }

      this.usageCacheTimestamp = now;
    } catch (error) {
      console.error('Error refreshing skill usage stats:', error);
    }
  }

  /**
   * Parse a session file to find Skill tool invocations
   */
  private async parseSessionFileForSkillUsage(filePath: string): Promise<void> {
    try {
      const content = await fsp.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const msg: RawSessionMessage = JSON.parse(line);

          if (msg.message?.content) {
            for (const block of msg.message.content) {
              // Look for Skill tool usage
              if (block.type === 'tool_use' && block.name === 'Skill' && block.input) {
                const input = block.input as { skill?: string };
                if (input.skill) {
                  const skillId = this.normalizeSkillId(input.skill);
                  const timestamp = new Date(msg.timestamp);
                  if (isNaN(timestamp.getTime())) {
                    continue; // Skip invalid timestamps
                  }

                  const existing = this.skillUsageCache.get(skillId);
                  if (existing) {
                    existing.usageCount++;
                    if (!existing.lastUsedAt || timestamp > existing.lastUsedAt) {
                      existing.lastUsedAt = timestamp;
                    }
                  } else {
                    this.skillUsageCache.set(skillId, {
                      usageCount: 1,
                      lastUsedAt: timestamp,
                    });
                  }
                }
              }
            }
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    } catch (error) {
      console.error(`Error parsing session file ${filePath} for skill usage:`, error);
    }
  }

  /**
   * Normalize skill ID from various formats
   * e.g., "superpowers:skill-name" -> "superpowers:skill-name"
   * e.g., "skill-name" -> "unknown:skill-name"
   */
  private normalizeSkillId(skillRef: string): string {
    if (skillRef.includes(':')) {
      return skillRef;
    }
    return `unknown:${skillRef}`;
  }
}
