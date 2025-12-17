/**
 * Seed strategy interface for extensible database seeding
 */

export type ISeedStrategy = {
  /**
   * Name of the seed strategy (e.g., 'users', 'configs')
   */
  readonly name: string;

  /**
   * Execute the seeding operation
   * @returns Seed result with statistics
   */
  execute(): Promise<{ created: number; updated: number; errors: string[] }>;
};
