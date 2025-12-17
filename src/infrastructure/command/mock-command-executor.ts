/**
 * Mock command executor for testing
 * Simulates command execution without actually running commands
 */

import type { ICommandExecutor } from '../../core/interfaces/command-executor.interface';

export class MockCommandExecutor implements ICommandExecutor {
  private readonly responses: Map<string, { stdout: string; stderr: string }> = new Map();
  private readonly errors: Map<string, Error> = new Map();
  private executedCommands: Array<{ command: string; args: string[] }> = [];

  /**
   * Register a mock response for a command
   * @param command Command name
   * @param stdout Mock stdout output
   * @param stderr Mock stderr output
   */
  mockResponse(command: string, stdout: string, stderr = ''): void {
    this.responses.set(command, { stdout, stderr });
  }

  /**
   * Register a mock error for a command
   * @param command Command name
   * @param error Error to throw
   */
  mockError(command: string, error: Error): void {
    this.errors.set(command, error);
  }

  /**
   * Execute a mocked command
   * @param command Command name
   * @param args Command arguments
   * @returns Mock output
   * @throws Mock error if registered
   */
  execute(
    command: string,
    args: string[]
  ): Promise<{ stdout: string; stderr: string }> {
    // Track executed commands
    this.executedCommands.push({ command, args });

    // Check for mocked error
    if (this.errors.has(command)) {
      const error = this.errors.get(command);
      if (error instanceof Error) {
        return Promise.reject(error);
      }
    }

    // Check for mocked response
    if (this.responses.has(command)) {
      const response = this.responses.get(command);
      if (response) {
        return Promise.resolve(response);
      }
    }

    // Default response
    return Promise.resolve({ stdout: '', stderr: '' });
  }

  /**
   * Get list of executed commands
   * @returns Array of executed commands
   */
  getExecutedCommands(): Array<{ command: string; args: string[] }> {
    return [...this.executedCommands];
  }

  /**
   * Get count of times a command was executed
   * @param command Command name
   * @returns Execution count
   */
  getExecutionCount(command: string): number {
    return this.executedCommands.filter((c) => c.command === command).length;
  }

  /**
   * Clear all mocks and execution history
   */
  clear(): void {
    this.responses.clear();
    this.errors.clear();
    this.executedCommands = [];
  }
}
