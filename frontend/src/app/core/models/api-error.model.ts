/** Spring ProblemDetail fields. Extra extension members are retained as unknown values. */
export interface ApiProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  [extension: string]: unknown;
}

export type ApiErrorKind = 'validation' | 'unauthorized' | 'forbidden' | 'notFound' | 'conflict' | 'tooLarge' | 'server' | 'other';
