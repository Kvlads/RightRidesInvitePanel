import { View, SplitLayout, SplitCol } from '@vkontakte/vkui';
import { useActiveVkuiLocation } from '@vkontakte/vk-mini-apps-router';

import { Home } from './panels';
import { DEFAULT_VIEW_PANELS } from './routes';

import './index.css';
import EventDetailPanel from './panels/event/EventDetail';
import { RegisterPanel } from './panels/eventRegister/Register';
import { SuccessPanel } from './panels/eventRegister/RegisterSuccess';
import { ErrorPanel } from './panels/eventRegister/RegisterError';
import { EventUserRequestsPanel } from './panels/event/EventUserRequests';
import { RequestDetailPanel } from './panels/event/EventUserRequestDetails';
import { AdminEventsPanel } from './panels/admin/AdminEvents';
import { AdminEventEdit } from './panels/admin/AdminEventEdit';
import { AdminLogin } from './panels/admin/AdminLogin';
import { AdminEventRequests } from './panels/admin/AdminEventRequests';


export const App = () => {
  const { panel: activePanel = DEFAULT_VIEW_PANELS.HOME } = useActiveVkuiLocation();

  return (
    <SplitLayout>
      <SplitCol>
        <View activePanel={activePanel}>
          <Home id="home" />

          <EventDetailPanel id="event" />
          <EventUserRequestsPanel id="event-user-requests" />

          <RegisterPanel id="event-register" />
          <SuccessPanel id="event-register-success" />
          <ErrorPanel id="event-register-error" />
          <RequestDetailPanel id="event-user-request-item" />

          <AdminLogin id="admin-login" />
          <AdminEventsPanel id="admin-event-list" />
          <AdminEventEdit id="admin-event-edit" />
          
          <AdminEventRequests id="admin-event-requests" />
          
        </View>
      </SplitCol>
    </SplitLayout>
  );
};