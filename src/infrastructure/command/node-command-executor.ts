/**
 * Node.js command executor
 * Executes system commands using Node.js child_process module
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { ICommandExecutor } from '../../core/interfaces/command-executor.interface';

const execFileAsync = promisify(execFile);

export class NodeCommandExecutor implements ICommandExecutor {
  /**
   * Execute a system command
   * @param command Command name or path (e.g., 'npx', 'node')
   * @param args Command arguments
   * @returns Command output
   * @throws Error if command fails
   */
  async execute(
    command: string,
    args: string[]
  ): Promise<{ stdout: string; stderr: string }> {
    try {
      const { stdout, stderr } = await execFileAsync(command, args);
      return { stdout, stderr };
    } catch (error) {
      // Re-throw with additional context
      if (error instanceof Error) {
        const message = `Command failed: ${command} ${args.join(' ')}\n${error.message}`;
        const error_ = new Error(message);
        Object.assign(error_, error);
        throw error_;
      }
      throw error;
    }
  }
}
