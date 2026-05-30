import { FC, useEffect, useState, ReactNode } from 'react';
import { 
  Panel, PanelHeader, PanelHeaderBack, 
  Button, Text, Spinner, NavIdProps,
  Card, Title, Div, Group, FormItem, Input, Select, Snackbar, IconButton, Box
} from '@vkontakte/vkui';
import { Icon16ErrorCircleFill, Icon16Done, Icon28EditOutline, Icon28DeleteOutline } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
// Эти функции мы добавим в adminApi.ts на следующем шаге
import { fetchStaff, createStaff, updateStaff, deleteStaff, StaffUser } from '../../services/adminApi';

export const AdminStaffList: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);

  // Состояния для формы (создание / редактирование)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ login: '', password: '', role: 'voter', vkId: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showSnackbar = (text: string, type: 'success' | 'error') => {
    setSnackbar(
      <Snackbar
        onClose={() => setSnackbar(null)}
        before={type === 'error' ? <Icon16ErrorCircleFill fill="var(--vkui--color_icon_negative)" /> : <Icon16Done fill="var(--vkui--color_icon_positive)" />}
      >
        {text}
      </Snackbar>
    );
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchStaff();
      setStaff(data);
    } catch (error) {
      showSnackbar('Ошибка загрузки персонала', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({ login: '', password: '', role: 'voter', vkId: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (user: StaffUser) => {
    setEditingId(user.id);
    setFormData({ 
      login: user.login, 
      password: '', // Пароль не показываем, заполняется только для изменения
      role: user.role, 
      vkId: user.vkId || '' 
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (userId: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого сотрудника?')) return;
    try {
      await deleteStaff(userId);
      setStaff(prev => prev.filter(u => u.id !== userId));
      showSnackbar('Сотрудник удален', 'success');
    } catch (error) {
      showSnackbar('Ошибка при удалении', 'error');
    }
  };

  const handleSubmit = async () => {
    if (!formData.login.trim()) return showSnackbar('Логин обязателен', 'error');
    if (!editingId && !formData.password.trim()) return showSnackbar('Пароль обязателен для новых пользователей', 'error');

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateStaff(editingId, formData);
        showSnackbar('Данные обновлены', 'success');
      } else {
        await createStaff(formData);
        showSnackbar('Сотрудник добавлен', 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      showSnackbar(error.message || 'Ошибка сохранения', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Panel id={id}>
        <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>Персонал</PanelHeader>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }}><Spinner size="l" /></div>
      </Panel>
    );
  }

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        Управление персоналом
      </PanelHeader>

      <Div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 40 }}>
        <Button size="l" stretched mode="primary" onClick={openCreateModal} style={{ marginBottom: 24 }}>
          Добавить сотрудника
        </Button>

        {staff.length === 0 ? (
          <Text style={{ textAlign: 'center', color: 'var(--vkui--color_text_secondary)' }}>Список пуст</Text>
        ) : (
          staff.map(user => (
            <Card key={user.id} mode="shadow" style={{ marginBottom: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Title level="3" style={{ marginBottom: 4 }}>{user.login}</Title>
                  <Text style={{ color: 'var(--vkui--color_text_secondary)', marginBottom: 4 }}>
                    Роль: <b>{user.role === 'admin' ? 'Администратор' : 'Выборщик'}</b>
                  </Text>
                  <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                    VK ID: {user.vkId || 'Не привязан'}
                  </Text>
                </Box>
                <div style={{ display: 'flex', gap: 8 }}>
                  <IconButton onClick={() => openEditModal(user)}>
                    <Icon28EditOutline width={24} height={24} />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(user.id)}>
                    <Icon28DeleteOutline width={24} height={24} fill="var(--vkui--color_icon_negative)" />
                  </IconButton>
                </div>
              </div>
            </Card>
          ))
        )}
      </Div>

      {/* Всплывающее окно для создания/редактирования */}
      {isModalOpen && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000,
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20
          }} 
          onClick={() => !isSubmitting && setIsModalOpen(false)}
        >
          <Card 
            mode="shadow"
            style={{ width: '100%', maxWidth: 400, padding: 24, borderRadius: 16 }} 
            onClick={e => e.stopPropagation()}
          >
            <Title level="2" style={{ marginBottom: 16, textAlign: 'center' }}>
              {editingId ? 'Редактирование' : 'Новый сотрудник'}
            </Title>
            
            <FormItem top="Логин">
              <Input 
                value={formData.login} 
                onChange={e => setFormData({...formData, login: e.target.value})} 
                placeholder="Например: moderator1"
              />
            </FormItem>

            <FormItem top="Пароль" bottom={editingId ? 'Оставьте пустым, если не хотите менять' : ''}>
              <Input 
                type="text" 
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                placeholder={editingId ? 'Новый пароль' : 'Укажите пароль'}
              />
            </FormItem>

            <FormItem top="Роль">
              <Select 
                value={formData.role} 
                onChange={e => setFormData({...formData, role: e.target.value})}
                options={[
                  { label: 'Выборщик (только голосование)', value: 'voter' },
                  { label: 'Администратор (полный доступ)', value: 'admin' }
                ]}
              />
            </FormItem>

            <FormItem top="VK ID (опционально)" bottom="Для сопоставления голосов">
              <Input 
                type="number" 
                value={formData.vkId} 
                onChange={e => setFormData({...formData, vkId: e.target.value})} 
                placeholder="Например: 12345678"
              />
            </FormItem>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <Button size="l" stretched mode="secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                Отмена
              </Button>
              <Button size="l" stretched mode="primary" onClick={handleSubmit} loading={isSubmitting}>
                Сохранить
              </Button>
            </div>
          </Card>
        </div>
      )}

      {snackbar}
    </Panel>
  );
};