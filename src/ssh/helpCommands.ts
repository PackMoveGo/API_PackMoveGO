// SSH Help Commands
export const SSH_HELP_COMMANDS = {
  help: {
    description: 'Show available commands',
    usage: 'help [command]',
    examples: ['help', 'help status', 'help logs']
  },
  status: {
    description: 'Show server status and health',
    usage: 'status',
    examples: ['status']
  },
  logs: {
    description: 'View recent server logs',
    usage: 'logs [lines]',
    examples: ['logs', 'logs 50']
  },
  restart: {
    description: 'Restart the server (requires confirmation)',
    usage: 'restart',
    examples: ['restart']
  },
  clear: {
    description: 'Clear the terminal screen',
    usage: 'clear',
    examples: ['clear']
  },
  exit: {
    description: 'Disconnect from SSH',
    usage: 'exit',
    examples: ['exit', 'logout']
  },
  whoami: {
    description: 'Show current user and connection info',
    usage: 'whoami',
    examples: ['whoami']
  },
  uptime: {
    description: 'Show server uptime',
    usage: 'uptime',
    examples: ['uptime']
  },
  memory: {
    description: 'Show memory usage',
    usage: 'memory',
    examples: ['memory']
  },
  processes: {
    description: 'Show running processes',
    usage: 'processes',
    examples: ['processes']
  }
};

export function getHelpText(command?: string): string {
  if (!command) {
    // Show all commands
    let helpText = `
╔══════════════════════════════════════════════════════════════╗
║                    PackMoveGO SSH Help                      ║
╠══════════════════════════════════════════════════════════════╣
║  Available Commands:                                        ║
`;
    
    Object.entries(SSH_HELP_COMMANDS).forEach(([cmd, info]) => {
      helpText += `║  ${cmd.padEnd(15)} - ${info.description.padEnd(35)} ║\n`;
    });
    
    helpText += `╠══════════════════════════════════════════════════════════════╣
║  Type 'help <command>' for detailed usage                  ║
║  Session timeout: 10 minutes                               ║
╚══════════════════════════════════════════════════════════════╝
`;
    return helpText;
  }
  
  // Show specific command help
  const cmdInfo = SSH_HELP_COMMANDS[command as keyof typeof SSH_HELP_COMMANDS];
  if (!cmdInfo) {
    return `❌ Command '${command}' not found. Type 'help' for available commands.\n`;
  }
  
  return `
╔══════════════════════════════════════════════════════════════╗
║                    Command: ${command.padEnd(35)} ║
╠══════════════════════════════════════════════════════════════╣
║  Description: ${cmdInfo.description.padEnd(47)} ║
║  Usage: ${cmdInfo.usage.padEnd(51)} ║
║  Examples:                                                   ║
`;
  
  cmdInfo.examples.forEach(example => {
    return `║    ${example.padEnd(49)} ║\n`;
  });
  
  return `╚══════════════════════════════════════════════════════════════╝
`;
}

export function executeHelpCommand(command: string, args: string[]): string {
  if (args.length === 0) {
    return getHelpText();
  }
  
  return getHelpText(args[0]);
} 