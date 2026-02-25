import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import notificationService from '../lib/notifications';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Initialize notification service
  useEffect(() => {
    const init = async () => {
      const supported = await notificationService.init();
      setIsSupported(supported);
      setPermission(notificationService.permission);
    };
    init();
  }, []);

  // Listen for PWA install prompt
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('[PWA] Install prompt available');
    };

    const handleAppInstalled = () => {
      setIsPWAInstalled(true);
      setDeferredPrompt(null);
      console.log('[PWA] App installed');
    };

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsPWAInstalled(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Update document title with unread count
  useEffect(() => {
    const baseTitle = 'X67 Digital Media Groupe';
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [unreadCount]);

  const requestPermission = useCallback(async () => {
    const granted = await notificationService.requestPermission();
    setPermission(granted ? 'granted' : 'denied');
    return granted;
  }, []);

  const installPWA = useCallback(async () => {
    if (!deferredPrompt) {
      console.log('[PWA] No install prompt available');
      return false;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[PWA] Install outcome:', outcome);
      
      if (outcome === 'accepted') {
        setIsPWAInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[PWA] Install error:', error);
      return false;
    }
  }, [deferredPrompt]);

  const showNotification = useCallback(async (title, options) => {
    return notificationService.show(title, options);
  }, []);

  const notify = {
    newMessage: (senderName, preview, url) => 
      notificationService.showNewMessage(senderName, preview, url),
    newFavorite: (adTitle) => 
      notificationService.showNewFavorite(adTitle),
    viewsMilestone: (adTitle, views) => 
      notificationService.showViewsMilestone(adTitle, views),
    priceDrop: (adTitle, oldPrice, newPrice) => 
      notificationService.showPriceDrop(adTitle, oldPrice, newPrice),
    adApproved: (adTitle, adUrl) => 
      notificationService.showAdApproved(adTitle, adUrl),
    adPendingApproval: (adTitle) => 
      notificationService.showAdPendingApproval(adTitle),
    newUser: (userName, userEmail) => 
      notificationService.showNewUser(userName, userEmail),
  };

  const value = {
    isSupported,
    permission,
    isPWAInstalled,
    canInstallPWA: !!deferredPrompt,
    unreadCount,
    setUnreadCount,
    requestPermission,
    installPWA,
    showNotification,
    notify
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
