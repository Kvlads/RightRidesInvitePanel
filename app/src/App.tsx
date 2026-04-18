import { useState, useEffect, ReactNode } from 'react';
import bridge, { UserInfo } from '@vkontakte/vk-bridge';
import { View, SplitLayout, SplitCol, ScreenSpinner } from '@vkontakte/vkui';
import { useActiveVkuiLocation } from '@vkontakte/vk-mini-apps-router';

import { Persik, Home } from './panels';
import { DEFAULT_VIEW_PANELS } from './routes';

import './index.css';
import EventDetailPanel from './panels/event/EventDetail';
import { RegisterPanel } from './panels/eventRegister/Register';
import { SuccessPanel } from './panels/eventRegister/RegisterSuccess';
import { ErrorPanel } from './panels/eventRegister/RegisterError';
import { EventUserRequestsPanel } from './panels/event/EventUserRequests';
import { RequestDetailPanel } from './panels/event/EventUserRequestDetails';

export const App = () => {
  const { panel: activePanel = DEFAULT_VIEW_PANELS.HOME } = useActiveVkuiLocation();
  const [fetchedUser, setUser] = useState<UserInfo | undefined>();
  const [popout, setPopout] = useState<ReactNode | null>(<ScreenSpinner />);

  useEffect(() => {
    async function fetchData() {
      const user = await bridge.send('VKWebAppGetUserInfo');
      setUser(user);
      setPopout(null);
    }
    fetchData();
  }, []);

  return (
    <SplitLayout>
      <SplitCol>
        <View activePanel={activePanel}>
          <Home id="home" fetchedUser={fetchedUser} />
          <Persik id="persik" />

          <EventDetailPanel id="event" />
          <EventUserRequestsPanel id="event-user-requests" />

          <RegisterPanel id="event-register" />
          <SuccessPanel id="event-register-success" />
          <ErrorPanel id="event-register-error" />
          <RequestDetailPanel id="event-user-request-item" />
        </View>
      </SplitCol>
      {popout}
    </SplitLayout>
  );
};
