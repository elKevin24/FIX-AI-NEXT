/**
 * Presence Actions (Stubs)
 */

export async function getOnlineUsers(tenantId?: string) {
  return [];
}

export async function updatePresence(route: string, pageName?: string, ticketId?: string | null) {
  return { success: true };
}

export async function setUserStatus(status: string) {
  return { success: true };
}
