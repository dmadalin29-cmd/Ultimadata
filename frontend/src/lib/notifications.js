// Notification sound - Base64 encoded short beep
const NOTIFICATION_SOUND = 'data:audio/mp3;base64,//uQxAAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kMQAD8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==';

class NotificationService {
  constructor() {
    this.permission = 'default';
    this.swRegistration = null;
    this.audio = null;
    this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
  }

  async init() {
    if (!this.isSupported) {
      console.log('[Notifications] Not supported in this browser');
      return false;
    }

    try {
      // Register service worker
      this.swRegistration = await navigator.serviceWorker.register('/sw.js');
      console.log('[Notifications] Service Worker registered');

      // Check notification permission
      this.permission = Notification.permission;
      
      // Initialize audio
      this.audio = new Audio(NOTIFICATION_SOUND);
      this.audio.volume = 0.5;

      return true;
    } catch (error) {
      console.error('[Notifications] Init error:', error);
      return false;
    }
  }

  async requestPermission() {
    if (!this.isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      console.log('[Notifications] Permission:', permission);
      return permission === 'granted';
    } catch (error) {
      console.error('[Notifications] Permission error:', error);
      return false;
    }
  }

  async playSound() {
    if (this.audio) {
      try {
        this.audio.currentTime = 0;
        await this.audio.play();
      } catch (e) {
        console.log('[Notifications] Audio autoplay blocked');
      }
    }
  }

  async show(title, options = {}) {
    if (this.permission !== 'granted') {
      console.log('[Notifications] Permission not granted');
      return null;
    }

    const defaultOptions = {
      icon: '/icon-192.png',
      badge: '/favicon-32x32.png',
      vibrate: [200, 100, 200],
      tag: 'x67-notification',
      requireInteraction: false,
      ...options
    };

    try {
      // Play sound
      await this.playSound();

      // Show notification
      if (this.swRegistration) {
        await this.swRegistration.showNotification(title, defaultOptions);
      } else {
        new Notification(title, defaultOptions);
      }

      return true;
    } catch (error) {
      console.error('[Notifications] Show error:', error);
      return false;
    }
  }

  // Predefined notification types
  async showNewMessage(senderName, messagePreview, conversationUrl) {
    return this.show(`Mesaj nou de la ${senderName}`, {
      body: messagePreview.substring(0, 100) + (messagePreview.length > 100 ? '...' : ''),
      tag: 'new-message',
      data: { url: conversationUrl || '/messages' },
      actions: [
        { action: 'view', title: 'Vezi mesajul' },
        { action: 'dismiss', title: 'Închide' }
      ]
    });
  }

  async showNewFavorite(adTitle) {
    return this.show('Cineva ți-a salvat anunțul! ❤️', {
      body: `"${adTitle}" a fost adăugat la favorite`,
      tag: 'new-favorite',
      data: { url: '/dashboard' }
    });
  }

  async showViewsMilestone(adTitle, views) {
    return this.show(`🎉 ${views} vizualizări!`, {
      body: `Anunțul "${adTitle}" a atins ${views} vizualizări`,
      tag: 'views-milestone',
      data: { url: '/dashboard' }
    });
  }

  async showPriceDrop(adTitle, oldPrice, newPrice) {
    return this.show('💰 Preț redus!', {
      body: `"${adTitle}" a scăzut de la ${oldPrice}€ la ${newPrice}€`,
      tag: 'price-drop',
      data: { url: '/favorites' }
    });
  }

  async showAdApproved(adTitle, adUrl) {
    return this.show('✅ Anunț aprobat!', {
      body: `"${adTitle}" este acum activ pe platformă`,
      tag: 'ad-approved',
      data: { url: adUrl || '/profile' }
    });
  }

  async showAdPendingApproval(adTitle) {
    return this.show('📝 Anunț nou necesită aprobare', {
      body: `"${adTitle}" așteaptă verificarea ta`,
      tag: 'pending-approval',
      data: { url: '/admin/ads?status=pending' },
      requireInteraction: true
    });
  }

  async showNewUser(userName, userEmail) {
    return this.show('👤 Utilizator nou înregistrat', {
      body: `${userName} (${userEmail}) s-a alăturat platformei`,
      tag: 'new-user',
      data: { url: '/admin/users' }
    });
  }
}

// Singleton instance
const notificationService = new NotificationService();

export default notificationService;
