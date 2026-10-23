export const fetchOrganizations: typeof import('./dataService')['fetchOrganizations'] = (...args) =>
  import('./dataService').then((service) => service.fetchOrganizations(...args));
export const fetchProjects: typeof import('./dataService')['fetchProjects'] = (...args) =>
  import('./dataService').then((service) => service.fetchProjects(...args));
export const fetchMembers: typeof import('./dataService')['fetchMembers'] = (...args) =>
  import('./dataService').then((service) => service.fetchMembers(...args));
export const fetchAuditLogs: typeof import('./dataService')['fetchAuditLogs'] = (...args) =>
  import('./dataService').then((service) => service.fetchAuditLogs(...args));
export const createProject: typeof import('./dataService')['createProject'] = (...args) =>
  import('./dataService').then((service) => service.createProject(...args));
export const updateProject: typeof import('./dataService')['updateProject'] = (...args) =>
  import('./dataService').then((service) => service.updateProject(...args));
export const deleteProject: typeof import('./dataService')['deleteProject'] = (...args) =>
  import('./dataService').then((service) => service.deleteProject(...args));
export const addProjectAddendum: typeof import('./dataService')['addProjectAddendum'] = (...args) =>
  import('./dataService').then((service) => service.addProjectAddendum(...args));
export const resetDemoData = async (): Promise<void> => {
  const service = await import('./dataService');
  service.resetDemoData();
};
export const fetchAHSPResources: typeof import('./dataService')['fetchAHSPResources'] = (...args) =>
  import('./dataService').then((service) => service.fetchAHSPResources(...args));
export const addBOQItem: typeof import('./dataService')['addBOQItem'] = (...args) =>
  import('./dataService').then((service) => service.addBOQItem(...args));
export const updateBOQItemProgress: typeof import('./dataService')['updateBOQItemProgress'] = (...args) =>
  import('./dataService').then((service) => service.updateBOQItemProgress(...args));
export const createDailyReport: typeof import('./dataService')['createDailyReport'] = (...args) =>
  import('./dataService').then((service) => service.createDailyReport(...args));
export const fetchVendors: typeof import('./dataService')['fetchVendors'] = (...args) =>
  import('./dataService').then((service) => service.fetchVendors(...args));
export const createVendor: typeof import('./dataService')['createVendor'] = (...args) =>
  import('./dataService').then((service) => service.createVendor(...args));
export const updateVendor: typeof import('./dataService')['updateVendor'] = (...args) =>
  import('./dataService').then((service) => service.updateVendor(...args));
export const archiveVendor: typeof import('./dataService')['archiveVendor'] = (...args) =>
  import('./dataService').then((service) => service.archiveVendor(...args));
export const fetchPurchaseOrders: typeof import('./dataService')['fetchPurchaseOrders'] = (...args) =>
  import('./dataService').then((service) => service.fetchPurchaseOrders(...args));
export const createPurchaseOrder: typeof import('./dataService')['createPurchaseOrder'] = (...args) =>
  import('./dataService').then((service) => service.createPurchaseOrder(...args));
export const updatePOStatus: typeof import('./dataService')['updatePOStatus'] = (...args) =>
  import('./dataService').then((service) => service.updatePOStatus(...args));
export const fetchPurchaseRequests: typeof import('./dataService')['fetchPurchaseRequests'] = (...args) =>
  import('./dataService').then((service) => service.fetchPurchaseRequests(...args));
export const fetchGoodsReceipts: typeof import('./dataService')['fetchGoodsReceipts'] = (...args) =>
  import('./dataService').then((service) => service.fetchGoodsReceipts(...args));
export const createGoodsReceipt: typeof import('./dataService')['createGoodsReceipt'] = (...args) =>
  import('./dataService').then((service) => service.createGoodsReceipt(...args));
export const createSubconOpname: typeof import('./dataService')['createSubconOpname'] = (...args) =>
  import('./dataService').then((service) => service.createSubconOpname(...args));
export const fetchClientInvoices: typeof import('./dataService')['fetchClientInvoices'] = (...args) =>
  import('./dataService').then((service) => service.fetchClientInvoices(...args));
export const createClientInvoice: typeof import('./dataService')['createClientInvoice'] = (...args) =>
  import('./dataService').then((service) => service.createClientInvoice(...args));
export const markInvoicePaid: typeof import('./dataService')['markInvoicePaid'] = (...args) =>
  import('./dataService').then((service) => service.markInvoicePaid(...args));
export const fetchCashTransactions: typeof import('./dataService')['fetchCashTransactions'] = (...args) =>
  import('./dataService').then((service) => service.fetchCashTransactions(...args));
export const createCashTransaction: typeof import('./dataService')['createCashTransaction'] = (...args) =>
  import('./dataService').then((service) => service.createCashTransaction(...args));
export const verifyCashTransaction: typeof import('./dataService')['verifyCashTransaction'] = (...args) =>
  import('./dataService').then((service) => service.verifyCashTransaction(...args));
export const fetchKasbonList: typeof import('./dataService')['fetchKasbonList'] = (...args) =>
  import('./dataService').then((service) => service.fetchKasbonList(...args));
export const createKasbon: typeof import('./dataService')['createKasbon'] = (...args) =>
  import('./dataService').then((service) => service.createKasbon(...args));
export const decideCashAdvance: typeof import('./dataService')['decideCashAdvance'] = (...args) =>
  import('./dataService').then((service) => service.decideCashAdvance(...args));
export const payCashAdvance: typeof import('./dataService')['payCashAdvance'] = (...args) =>
  import('./dataService').then((service) => service.payCashAdvance(...args));
export const settleCashAdvance: typeof import('./dataService')['settleCashAdvance'] = (...args) =>
  import('./dataService').then((service) => service.settleCashAdvance(...args));
export const fetchNotifications: typeof import('./dataService')['fetchNotifications'] = (...args) =>
  import('./dataService').then((service) => service.fetchNotifications(...args));
export const markAllNotificationsAsRead: typeof import('./dataService')['markAllNotificationsAsRead'] = (...args) =>
  import('./dataService').then((service) => service.markAllNotificationsAsRead(...args));
export const markNotificationAsRead: typeof import('./dataService')['markNotificationAsRead'] = (...args) =>
  import('./dataService').then((service) => service.markNotificationAsRead(...args));
