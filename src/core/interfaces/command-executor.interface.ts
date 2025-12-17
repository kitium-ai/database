/**
 * Command executor interface for abstracting system command execution
 */

export type ICommandExecutor = {
  /**
   * Execute a system command
   * @param command Command name or path
   * @param args Command arguments
   * @returns Command output (stdout and stderr)
   * @throws Error if command execution fails
   */
  execute(command: string, args: string[]): Promise<{ stdout: string; stderr: string }>;
};
