import { ResumeResponse } from '../../../core/models/domain.models';

/** Frontend-friendly resume state normalized from the backend's `active` field. */
export type StudentResume = Omit<ResumeResponse, 'active'> & { isActive: boolean };
