import type { InvitationRecord } from '../types';
import { mapRowToInvitation } from './admin';
import { supabase } from '../lib/supabase';

export { mapRowToInvitation } from './admin';

/** Load authoritative registration rows for the authenticated admin. */
export async function getRegistrationList(): Promise<{
  success: boolean;
  data: InvitationRecord[];
  error?: any;
  errorMessage?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('get_admin_registrations', {});
    if (error) throw error;
    return {
      success: true,
      data: Array.isArray(data) ? data.map(mapRowToInvitation) : [],
    };
  } catch (error:any) {
    return {
      success: false,
      data: [],
      error,
      errorMessage: String(error?.message || 'Unable to load registrations.'),
    };
  }
}

export async function approveRegistration(registrationId: string) {
  try {
    const { data, error } = await supabase.rpc('approve_registration', {
      p_registration_id: registrationId,
      p_passcode: null,
    });
    if (error) throw error;
    if (!data) throw new Error('Database did not return the approved registration.');
    return { success: true, data: mapRowToInvitation(data) };
  } catch (error:any) {
    return { success: false, error, errorMessage: String(error?.message || 'Unable to approve registration.') };
  }
}

export async function rejectRegistration(registrationId: string, reason: string) {
  const cleanReason = reason.trim();
  if (!cleanReason) return { success: false, errorMessage: 'A rejection reason is required.' };
  try {
    const { data, error } = await supabase.rpc('reject_registration', {
      p_registration_id: registrationId,
      p_reason: cleanReason,
      p_passcode: null,
    });
    if (error) throw error;
    if (!data) throw new Error('Database did not return the rejected registration.');
    return { success: true, data: mapRowToInvitation(data) };
  } catch (error:any) {
    return { success: false, error, errorMessage: String(error?.message || 'Unable to reject registration.') };
  }
}

export async function deleteRegistration(registrationId: string) {
  try {
    const { data, error } = await supabase.rpc('hide_registration_from_web', {
      p_registration_id: registrationId,
      p_passcode: null,
    });
    if (error) throw error;
    if (!data) throw new Error('Database did not return the hidden registration.');
    return { success: true, data: mapRowToInvitation(data) };
  } catch (error:any) {
    return { success: false, error, errorMessage: String(error?.message || 'Unable to hide registration.') };
  }
}
