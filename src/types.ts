// ─── System Support shared types ────────────────────────────────────────────
// These mirror the Advisor-side types so both apps share the same Firestore
// schema for the supportRequests and admins collections.

export type SupportCategory =
  | 'Technical Issue'
  | 'Urgent Case'
  | 'System Error'
  | 'Consultation'
  | 'Policy Question'
  | 'Other';

export type SupportPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type SupportStatus = 'pending' | 'in_progress' | 'resolved' | 'closed';

export type AvailabilityStatus = 'online' | 'busy' | 'away' | 'offline';

/** A support request submitted by an advisor. */
export interface SupportRequest {
  id: string;
  advisorId: string;
  advisorName: string;
  /** Populated when an admin accepts the ticket */
  adminId?: string;
  adminName?: string;
  category: SupportCategory;
  priority: SupportPriority;
  subject: string;
  description: string;
  status: SupportStatus;
  /** privateChats doc ID — set when an admin opens a chat thread */
  chatId?: string;
  createdAt: unknown;
  updatedAt: unknown;
  resolvedAt?: unknown;
}

/** A single record in the `admins` Firestore collection. */
export interface AdminRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  availability: AvailabilityStatus;
  profileImageUrl?: string;
  lastSeen?: unknown;
}
