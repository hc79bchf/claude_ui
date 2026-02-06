import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { McpServer, McpConfig, McpServerConfig } from '../../src/types/mcp';

export class McpConfigService {
  private claudeDir: string;
  private settingsPath: string;

  constructor() {
    this.claudeDir = path.join(os.homedir(), '.claude');
    this.settingsPath = path.join(this.claudeDir, 'settings.json');
  }

  /**
   * Get all configured MCP servers from global and project configs
   */
  async getMcpServers(): Promise<McpServer[]> {
    const servers: McpServer[] = [];

    // Read global config
    const globalServers = await this.readGlobalConfig();
    servers.push(...globalServers);

    // Read project configs from known project directories
    const projectServers = await this.readProjectConfigs();
    servers.push(...projectServers);

    return servers;
  }

  /**
   * Toggle a server's enabled state
   */
  async toggleMcpServer(serverId: string, enabled: boolean): Promise<void> {
    const settings = this.readSettingsFile();

    // Initialize disabledMcpServers array if it doesn't exist
    if (!settings.disabledMcpServers) {
      settings.disabledMcpServers = [];
    }

    // Find the server to get its name
    const servers = await this.getMcpServers();
    const server = servers.find(s => s.id === serverId);
    const serverName = server?.name;

    const disabledIndex = settings.disabledMcpServers.indexOf(serverId);
    const disabledByNameIndex = serverName
      ? settings.disabledMcpServers.indexOf(serverName)
      : -1;

    if (enabled) {
      // Remove both ID and name from disabled list
      if (disabledIndex !== -1) {
        settings.disabledMcpServers.splice(disabledIndex, 1);
      }
      if (disabledByNameIndex !== -1) {
        // Recalculate index after possible splice above
        const nameIdx = settings.disabledMcpServers.indexOf(serverName!);
        if (nameIdx !== -1) {
          settings.disabledMcpServers.splice(nameIdx, 1);
        }
      }
    } else if (!enabled && disabledIndex === -1 && disabledByNameIndex === -1) {
      // Add to disabled list to disable (only if not already disabled by ID or name)
      settings.disabledMcpServers.push(serverId);
    }

    // Write updated settings
    this.writeSettingsFile(settings);
  }

  /**
   * Read global MCP config from ~/.claude/settings.json
   */
  private async readGlobalConfig(): Promise<McpServer[]> {
    const settings = this.readSettingsFile();
    const mcpServers = settings.mcpServers || {};
    const disabledServers = settings.disabledMcpServers || [];

    return this.parseServerConfigs(mcpServers, disabledServers, 'global');
  }

  /**
   * Read project MCP configs from .mcp.json files in known project directories
   */
  private async readProjectConfigs(): Promise<McpServer[]> {
    const servers: McpServer[] = [];
    const projectsDir = path.join(this.claudeDir, 'projects');

    if (!fs.existsSync(projectsDir)) {
      return servers;
    }

    // Get all project directories from ~/.claude/projects
    const projectDirs = this.getProjectDirectories(projectsDir);
    const settings = this.readSettingsFile();
    const disabledServers = settings.disabledMcpServers || [];

    for (const projectDir of projectDirs) {
      // The project directory name is URL-encoded project path
      const decodedPath = this.decodeProjectPath(projectDir);
      const mcpJsonPath = path.join(decodedPath, '.mcp.json');

      if (fs.existsSync(mcpJsonPath)) {
        try {
          const content = fs.readFileSync(mcpJsonPath, 'utf-8');
          const config = JSON.parse(content) as McpConfig;
          const mcpServers = config.mcpServers || {};
          const source = `project:${decodedPath}`;

          const projectServers = this.parseServerConfigs(mcpServers, disabledServers, source);
          servers.push(...projectServers);
        } catch (error) {
          console.error(`Error reading MCP config from ${mcpJsonPath}:`, error);
        }
      }
    }

    return servers;
  }

  /**
   * Parse server configs into McpServer objects
   */
  private parseServerConfigs(
    mcpServers: Record<string, McpServerConfig>,
    disabledServers: string[],
    source: string
  ): McpServer[] {
    const servers: McpServer[] = [];

    for (const [name, config] of Object.entries(mcpServers)) {
      const id = this.generateServerId(name, source);
      const serverType = this.determineServerType(config);

      const server: McpServer = {
        id,
        name,
        type: serverType,
        command: config.command,
        args: config.args,
        url: config.url,
        env: config.env,
        enabled: !disabledServers.includes(id) && !disabledServers.includes(name),
        source,
        tools: [], // Tools will be populated when the server is connected
        description: config.description,
      };

      servers.push(server);
    }

    return servers;
  }

  /**
   * Determine server type based on config
   */
  private determineServerType(config: McpServerConfig): 'stdio' | 'http' {
    if (config.type) {
      return config.type;
    }
    // If url is present, assume http; otherwise stdio
    return config.url ? 'http' : 'stdio';
  }

  /**
   * Generate a unique server ID based on name and source
   */
  private generateServerId(name: string, source: string): string {
    if (source === 'global') {
      return `global:${name}`;
    }
    // For project sources, include a hash of the project path to keep IDs unique but manageable
    const projectPath = source.replace('project:', '');
    const pathHash = this.hashString(projectPath).slice(0, 8);
    return `project:${pathHash}:${name}`;
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get project directories from ~/.claude/projects
   */
  private getProjectDirectories(projectsDir: string): string[] {
    const dirs: string[] = [];

    try {
      const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          dirs.push(entry.name);
        }
      }
    } catch (error) {
      console.error('Error reading projects directory:', error);
    }

    return dirs;
  }

  /**
   * Decode project path from directory name
   * The directory name is the project path with slashes replaced by dashes or encoded
   */
  private decodeProjectPath(encodedPath: string): string {
    // Project directories in ~/.claude/projects are typically named with
    // URL-encoded or dash-separated paths. Try to decode them.
    try {
      // First try URL decoding
      return decodeURIComponent(encodedPath);
    } catch {
      // If that fails, try replacing dashes with slashes
      // and adding a leading slash if it looks like a Unix path
      const decoded = encodedPath.replace(/-/g, '/');
      return decoded.startsWith('/') ? decoded : `/${decoded}`;
    }
  }

  /**
   * Read settings.json file
   */
  private readSettingsFile(): McpConfig & { disabledMcpServers?: string[] } {
    if (!fs.existsSync(this.settingsPath)) {
      return { mcpServers: {} };
    }

    try {
      const content = fs.readFileSync(this.settingsPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error reading settings.json:', error);
      return { mcpServers: {} };
    }
  }

  /**
   * Write settings.json file
   */
  private writeSettingsFile(settings: McpConfig & { disabledMcpServers?: string[] }): void {
    try {
      // Ensure the .claude directory exists
      if (!fs.existsSync(this.claudeDir)) {
        fs.mkdirSync(this.claudeDir, { recursive: true });
      }

      const content = JSON.stringify(settings, null, 2);
      fs.writeFileSync(this.settingsPath, content, 'utf-8');
    } catch (error) {
      console.error('Error writing settings.json:', error);
      throw error;
    }
  }
}
