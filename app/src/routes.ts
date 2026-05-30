import {
  createHashRouter,
  createPanel,
  createRoot,
  createView,
  RoutesConfig,
} from '@vkontakte/vk-mini-apps-router';

export const DEFAULT_ROOT = 'default_root';

export const DEFAULT_VIEW = 'default_view';

export const DEFAULT_VIEW_PANELS = {
  HOME: 'home',

  EVENT: 'event',
  EVENT_REGISTER: 'event-register',
  EVENT_REGISTER_SUCCESS: 'event-register-success',
  EVENT_REGISTER_ERROR: 'event-register-error',
  EVENT_USER_REQUESTS: 'event-user-requests',
  EVENT_USER_REQUEST_ITEM: 'event-user-request-item',

  ADMIN_EVENT_LIST: 'admin-event-list',
  ADMIN_EVENT_EDIT: 'admin-event-edit',
  ADMIN_LOGIN: 'admin-login',
  ADMIN_EVENT_REQUESTS: 'admin-event-requests',
  ADMIN_STAFF_LIST: 'admin-staff-list',
} as const;

export const routes = RoutesConfig.create([
  createRoot(DEFAULT_ROOT, [
    createView(DEFAULT_VIEW, [
      createPanel(DEFAULT_VIEW_PANELS.HOME, '/', []),

      createPanel(DEFAULT_VIEW_PANELS.EVENT, `/event/:id`, []),
      createPanel(DEFAULT_VIEW_PANELS.EVENT_REGISTER, `/event/:id/register`, []),
      createPanel(DEFAULT_VIEW_PANELS.EVENT_USER_REQUESTS, `/event/:id/requests`, []),
      createPanel(DEFAULT_VIEW_PANELS.EVENT_REGISTER_SUCCESS, `/event-success`, []),
      createPanel(DEFAULT_VIEW_PANELS.EVENT_REGISTER_ERROR, `/event-error`, []),
      createPanel(DEFAULT_VIEW_PANELS.EVENT_USER_REQUEST_ITEM, `/event/:id/requests/:requestId`, []),

      createPanel(DEFAULT_VIEW_PANELS.ADMIN_EVENT_LIST, `/admin`, []),
      createPanel(DEFAULT_VIEW_PANELS.ADMIN_LOGIN, `/admin-login`, []),
      createPanel(DEFAULT_VIEW_PANELS.ADMIN_EVENT_EDIT, `/admin/event`, []),
      createPanel(DEFAULT_VIEW_PANELS.ADMIN_EVENT_EDIT, `/admin/event/:id`, []),
      createPanel(DEFAULT_VIEW_PANELS.ADMIN_EVENT_REQUESTS, `/admin/event/:id/requests`, []),
      createPanel(DEFAULT_VIEW_PANELS.ADMIN_STAFF_LIST, `/admin/staff`, []),
    ]),
  ]),
]);

export const router = createHashRouter(routes.getRoutes());
