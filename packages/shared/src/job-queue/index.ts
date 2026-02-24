/**
 * SmartCon360 Job Queue Abstraction
 *
 * Provides async job processing for heavy computations.
 * Stage 1: BullMQ (Redis-backed), upgradeable to Temporal.io if needed.
 *
 * Usage:
 *   const queue = new JobQueue('risk-assessments', redisUrl);
 *   await queue.add('assess-project', { projectId: 'abc' });
 *   queue.process('assess-project', async (job) => { ... });
 */

// ── Types ──

export type JobStatus = 'pending' | 'active' | 'completed' | 'failed' | 'delayed';

export interface JobOptions {
  /** Delay before processing in milliseconds */
  delay?: number;
  /** Number of retry attempts on failure */
  attempts?: number;
  /** Priority (lower = higher priority) */
  priority?: number;
  /** Remove job after completion */
  removeOnComplete?: boolean;
  /** Backoff strategy for retries */
  backoff?: { type: 'fixed' | 'exponential'; delay: number };
}

export interface JobResult<T = unknown> {
  jobId: string;
  status: JobStatus;
  data?: T;
  error?: string;
  progress?: number;
  createdAt?: string;
  completedAt?: string;
}

export interface JobProcessor<TData = unknown, TResult = unknown> {
  (data: TData, helpers: JobHelpers): Promise<TResult>;
}

export interface JobHelpers {
  /** Update job progress (0-100) */
  updateProgress: (progress: number) => Promise<void>;
  /** Get job ID */
  jobId: string;
}

// ── Abstract Queue Interface ──

export abstract class BaseJobQueue {
  abstract add<T>(name: string, data: T, options?: JobOptions): Promise<string>;
  abstract getStatus(jobId: string): Promise<JobResult>;
  abstract process<TData, TResult>(
    name: string,
    processor: JobProcessor<TData, TResult>,
    concurrency?: number
  ): void;
  abstract close(): Promise<void>;
}

// ── In-Memory Implementation (for development/testing) ──

export class InMemoryJobQueue extends BaseJobQueue {
  private jobs: Map<string, { name: string; data: unknown; status: JobStatus; result?: unknown; error?: string; progress: number; createdAt: string; completedAt?: string }> = new Map();
  private processors: Map<string, JobProcessor> = new Map();
  private nextId = 1;

  async add<T>(name: string, data: T, options?: JobOptions): Promise<string> {
    const jobId = `job_${this.nextId++}`;
    this.jobs.set(jobId, {
      name,
      data,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
    });

    const delay = options?.delay || 0;
    setTimeout(() => this.executeJob(jobId, name, data, options?.attempts || 1), delay);

    return jobId;
  }

  async getStatus(jobId: string): Promise<JobResult> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return { jobId, status: 'failed', error: 'Job not found' };
    }
    return {
      jobId,
      status: job.status,
      data: job.result,
      error: job.error,
      progress: job.progress,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }

  process<TData, TResult>(
    name: string,
    processor: JobProcessor<TData, TResult>,
    _concurrency?: number
  ): void {
    this.processors.set(name, processor as JobProcessor);
  }

  async close(): Promise<void> {
    this.jobs.clear();
    this.processors.clear();
  }

  private async executeJob(jobId: string, name: string, data: unknown, maxAttempts: number): Promise<void> {
    const processor = this.processors.get(name);
    if (!processor) return;

    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'active';

    const helpers: JobHelpers = {
      jobId,
      updateProgress: async (progress: number) => {
        const j = this.jobs.get(jobId);
        if (j) j.progress = progress;
      },
    };

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await processor(data, helpers);
        job.status = 'completed';
        job.result = result;
        job.completedAt = new Date().toISOString();
        return;
      } catch (err) {
        if (attempt === maxAttempts) {
          job.status = 'failed';
          job.error = err instanceof Error ? err.message : String(err);
        }
      }
    }
  }
}

// ── Factory ──

/**
 * Create a job queue instance.
 * Uses InMemoryJobQueue for development.
 * To use BullMQ in production, install bullmq and pass the implementation.
 */
export function createJobQueue(
  queueName: string,
  _redisUrl?: string
): BaseJobQueue {
  // Default: InMemory for development
  // In production, services should provide their own BullMQ implementation
  return new InMemoryJobQueue();
}

// ── Pre-defined Queue Names ──

export const QUEUE_NAMES = {
  RISK_ASSESSMENT: 'risk-assessments',
  SCENARIO_GENERATION: 'scenario-generation',
  REPORT_GENERATION: 'report-generation',
  DATA_IMPORT: 'data-import',
  DATA_EXPORT: 'data-export',
  PROGRAM_AGGREGATION: 'program-aggregation',
  MONTE_CARLO: 'monte-carlo-simulation',
} as const;
