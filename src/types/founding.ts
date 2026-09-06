/**
 * Founding-member sign-ups (`foundingSignups` collection).
 *
 * No card processing anywhere: the buyer pays by Interac e-transfer (or
 * cheque) outside the platform, and Michael reconciles by hand — he matches
 * the goalie's name in the transfer message to the record here and marks it
 * paid from /admin/founding.
 */

export type FoundingSignupStatus = 'awaiting_payment' | 'paid' | 'archived';

export interface FoundingSignup {
  id: string;
  /** The buyer — usually a parent, sometimes the goalie themselves. */
  name: string;
  email: string;
  /** The payment-matching key: buyers put this in the e-transfer message. */
  goalieName: string;
  phone?: string;
  note?: string;
  status: FoundingSignupStatus;
  /** Whether the payment-instructions email reached the buyer. False means follow up by hand. */
  confirmationEmailSent: boolean;
  createdAt: string; // ISO — serialized by the admin API
  paidAt?: string; // ISO
}
