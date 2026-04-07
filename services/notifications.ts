import { Notification as AppNotification } from '../types';

export const registerAppServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return null;

  if (import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.filter((key) => key.startsWith('teacherlife-shell-')).map((key) => caches.delete(key)));
    }

    return null;
  }

  return navigator.serviceWorker.register('/sw.js');
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) return 'denied';

  if (Notification.permission === 'default') {
    return Notification.requestPermission();
  }

  return Notification.permission;
};

export const showSystemNotification = async (notification: AppNotification) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;

  const options: NotificationOptions = {
    body: notification.message,
    tag: `teacherlife-${notification.relatedId || notification.id}`,
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-badge.svg',
    data: {
      url: notification.targetUrl || '/',
      view: notification.targetView || 'dashboard',
      notificationId: notification.id,
    },
  };

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(notification.title, options);
    return true;
  }

  new Notification(notification.title, options);
  return true;
};
