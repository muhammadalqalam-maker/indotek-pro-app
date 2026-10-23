export const acceptOrganizationInvitation: typeof import('./member.service')['acceptOrganizationInvitation'] = (...args) =>
  import('./member.service').then((service) => service.acceptOrganizationInvitation(...args));
export const fetchPendingOrganizationInvitations: typeof import('./member.service')['fetchPendingOrganizationInvitations'] = (...args) =>
  import('./member.service').then((service) => service.fetchPendingOrganizationInvitations(...args));
export const sendMemberInvitation: typeof import('./member.service')['sendMemberInvitation'] = (...args) =>
  import('./member.service').then((service) => service.sendMemberInvitation(...args));
export const setOrganizationMemberStatus: typeof import('./member.service')['setOrganizationMemberStatus'] = (...args) =>
  import('./member.service').then((service) => service.setOrganizationMemberStatus(...args));
export const updateOrganizationMemberRole: typeof import('./member.service')['updateOrganizationMemberRole'] = (...args) =>
  import('./member.service').then((service) => service.updateOrganizationMemberRole(...args));
