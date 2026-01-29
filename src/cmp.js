/**
 * RS-CMP - GDPR-Compliant Consent Management Platform
 * Consolidated SDK - All-in-one file
 * Pure JavaScript Version (ES2015+)
 */

// ============================================================================
// TYPE DEFINITIONS (JSDoc)
// ============================================================================

/**
 * @typedef {Object} ConsentCategories
 * @property {boolean} necessary - Essential cookies required for the site
 * @property {boolean} analytics - Analytics and performance tracking
 * @property {boolean} marketing - Marketing and advertising cookies
 * @property {boolean} preferences - User preferences and settings
 */

/**
 * @typedef {Object} ConsentData
 * @property {ConsentCategories} categories - Consent choices for each category
 * @property {string} timestamp - ISO 8601 timestamp of consent
 * @property {string} version - Policy version
 */

/**
 * @typedef {Object} BannerConfig
 * @property {'bottom' | 'top' | 'center'} position - Banner position on screen
 * @property {'bar' | 'box' | 'modal'} layout - Banner layout style
 * @property {string} primaryColor - Primary button color
 * @property {string} backgroundColor - Banner background color
 * @property {string} textColor - Text color
 * @property {string} buttonTextColor - Button text color
 * @property {boolean} showLogo - Whether to show logo
 * @property {string} [logoUrl] - Optional logo URL
 */

/**
 * @typedef {Object} CategoryConfig
 * @property {string} id - Category identifier
 * @property {string} name - Category display name
 * @property {string} description - Category description
 * @property {boolean} required - Whether category is required
 * @property {boolean} enabled - Whether category is enabled by default
 */

/**
 * @typedef {Object} CategoryTranslation
 * @property {string} name - Translated category name
 * @property {string} description - Translated category description
 */

/**
 * @typedef {Object} Translations
 * @property {string} title - Banner title
 * @property {string} description - Banner description
 * @property {string} acceptAll - Accept all button text
 * @property {string} rejectAll - Reject all button text
 * @property {string} customize - Customize button text
 * @property {string} save - Save button text
 * @property {string} close - Close button text
 * @property {Object.<string, CategoryTranslation>} categories - Category translations
 */

/**
 * @typedef {Object} Config
 * @property {string} siteId - Site identifier
 * @property {string} siteName - Site name
 * @property {string} domain - Site domain
 * @property {string} policyVersion - Policy version
 * @property {BannerConfig} banner - Banner configuration
 * @property {CategoryConfig[]} categories - Category configurations
 * @property {Object.<string, Translations>} translations - Translations by locale
 */

/**
 * @typedef {'consentUpdated' | 'bannerShown' | 'bannerClosed'} ConsentEventType
 */

/**
 * @callback ConsentEventHandler
 * @param {*} data - Event data
 * @returns {void}
 */

// ============================================================================
// CONSENT STORAGE
// ============================================================================

const STORAGE_KEY = 'rs-cmp-consent';
const COOKIE_NAME = 'rs-cmp-consent';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

class ConsentStorage {
  /**
   * Save consent to localStorage and cookie
   * @param {ConsentData} consent - Consent data to save
   * @returns {void}
   */
  saveConsent(consent) {
    const consentString = JSON.stringify(consent);

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, consentString);
    } catch (error) {
      console.warn('[RS-CMP] Failed to save to localStorage:', error);
    }

    // Save to cookie (first-party)
    this.setCookie(COOKIE_NAME, consentString, COOKIE_MAX_AGE);
  }

  /**
   * Get consent from localStorage or cookie
   * @returns {ConsentData | null} Stored consent data or null
   */
  getConsent() {
    // Try localStorage first
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('[RS-CMP] Failed to read from localStorage:', error);
    }

    // Fallback to cookie
    const cookieValue = this.getCookie(COOKIE_NAME);
    if (cookieValue) {
      try {
        return JSON.parse(cookieValue);
      } catch (error) {
        console.warn('[RS-CMP] Failed to parse cookie:', error);
      }
    }

    return null;
  }

  /**
   * Clear stored consent
   * @returns {void}
   */
  clearConsent() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('[RS-CMP] Failed to clear localStorage:', error);
    }

    this.deleteCookie(COOKIE_NAME);
  }

  /**
   * Set a cookie
   * @private
   * @param {string} name - Cookie name
   * @param {string} value - Cookie value
   * @param {number} maxAge - Max age in seconds
   * @returns {void}
   */
  setCookie(name, value, maxAge) {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax${secure}`;
  }

  /**
   * Get a cookie value
   * @private
   * @param {string} name - Cookie name
   * @returns {string | null} Cookie value or null
   */
  getCookie(name) {
    const nameEQ = name + '=';
    const cookies = document.cookie.split(';');

    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i];
      while (cookie.charAt(0) === ' ') {
        cookie = cookie.substring(1);
      }
      if (cookie.indexOf(nameEQ) === 0) {
        return decodeURIComponent(cookie.substring(nameEQ.length));
      }
    }

    return null;
  }

  /**
   * Delete a cookie
   * @private
   * @param {string} name - Cookie name
   * @returns {void}
   */
  deleteCookie(name) {
    document.cookie = `${name}=; max-age=0; path=/`;
  }
}

// ============================================================================
// CONSENT MANAGER
// ============================================================================

class ConsentManager {
  /**
   * @param {ConsentStorage} storage - Storage instance
   */
  constructor(storage) {
    /** @type {Map<ConsentEventType, ConsentEventHandler[]>} */
    this.eventHandlers = new Map();
    /** @type {ConsentStorage} */
    this.storage = storage;
  }

  /**
   * Set user consent for categories
   * @param {ConsentCategories} categories - Consent categories
   * @param {string} version - Policy version
   * @returns {void}
   */
  setConsent(categories, version) {
    const consentData = {
      categories,
      timestamp: new Date().toISOString(),
      version,
    };

    this.storage.saveConsent(consentData);
    
    // Push to dataLayer
    this.pushToDataLayer(categories);
    
    this.emit('consentUpdated', categories);
  }

  /**
   * Push consent data to GTM dataLayer
   * @param {ConsentCategories} categories - Consent categories
   * @returns {void}
   */
  pushToDataLayer(categories) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'cookie_consent_update',
      cookie_consent_analytics: categories.analytics,
      cookie_consent_marketing: categories.marketing,
      cookie_consent_preferences: categories.preferences,
      cookie_consent_necessary: categories.necessary,
      consent_timestamp: new Date().toISOString()
    });
  }

  /**
   * Get current consent
   * @returns {ConsentCategories | null} Current consent or null
   */
  getConsent() {
    const consent = this.storage.getConsent();
    return consent ? consent.categories : null;
  }

  /**
   * Accept all categories
   * @param {string} version - Policy version
   * @returns {void}
   */
  acceptAll(version) {
    this.setConsent(
      {
        necessary: true,
        analytics: true,
        marketing: true,
        preferences: true,
      },
      version
    );
  }

  /**
   * Reject all non-necessary categories
   * @param {string} version - Policy version
   * @returns {void}
   */
  rejectAll(version) {
    this.setConsent(
      {
        necessary: true,
        analytics: false,
        marketing: false,
        preferences: false,
      },
      version
    );
  }

  /**
   * Check if a specific category is consented
   * @param {keyof ConsentCategories} category - Category to check
   * @returns {boolean} Whether category is consented
   */
  hasConsent(category) {
    const consent = this.getConsent();
    return consent ? consent[category] : false;
  }

  /**
   * Event emitter - register handler
   * @param {ConsentEventType} event - Event type
   * @param {ConsentEventHandler} handler - Event handler
   * @returns {void}
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * Event emitter - emit event
   * @param {ConsentEventType} event - Event type
   * @param {*} data - Event data
   * @returns {void}
   */
  emit(event, data) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }
}

// ============================================================================
// SCRIPT BLOCKER
// ============================================================================

class ScriptBlocker {
  /**
   * @param {ConsentManager} consentManager - Consent manager instance
   */
  constructor(consentManager) {
    /** @type {ConsentManager} */
    this.consentManager = consentManager;
    /** @type {HTMLScriptElement[]} */
    this.blockedScripts = [];
  }

  /**
   * Detect category from script source or content
   * @param {string} srcOrCode - Script src or code content
   * @returns {string | null} Detected category or null
   */
  detectCategory(srcOrCode) {
    const s = (srcOrCode || '').toLowerCase();
    if (!s) return null;

    // Analytics
    if (
      s.indexOf('gtag(') !== -1 ||
      s.indexOf('google-analytics') !== -1 ||
      s.indexOf('analytics.js') !== -1 ||
      s.indexOf('googletagmanager.com/gtag') !== -1 ||
      s.indexOf('hotjar') !== -1 ||
      s.indexOf('mixpanel') !== -1 ||
      s.indexOf('amplitude') !== -1 ||
      s.indexOf('clarity.ms') !== -1
    ) {
      return 'analytics';
    }
    
    // Marketing
    if (
      s.indexOf('connect.facebook.net') !== -1 ||
      s.indexOf('fbq(') !== -1 ||
      s.indexOf('tiktok.com') !== -1 ||
      s.indexOf('analytics.tiktok.com') !== -1 ||
      s.indexOf('ads/') !== -1 ||
      s.indexOf('doubleclick.net') !== -1 ||
      s.indexOf('googleadservices.com') !== -1
    ) {
      return 'marketing';
    }
    
    return null;
  }

  /**
   * Block all scripts that require consent
   * @returns {void}
   */
  blockScripts() {
    // Find all scripts with data-category attribute
    const scripts = document.querySelectorAll('script[data-category]');
    
    scripts.forEach((script) => {
      const category = script.getAttribute('data-category');
      
      // Skip if it's a necessary category (always allowed)
      if (category === 'necessary') {
        return;
      }

      // Change type to text/plain to prevent execution
      if (script.getAttribute('type') !== 'text/plain') {
        script.setAttribute('data-original-type', script.getAttribute('type') || 'text/javascript');
        script.setAttribute('type', 'text/plain');
      }

      this.blockedScripts.push(script);
    });

    // Also scan for common tracking scripts
    this.scanAndBlockCommonScripts();
  }

  /**
   * Unblock scripts based on consent categories
   * @param {ConsentCategories} categories - Consent categories
   * @returns {void}
   */
  unblockScripts(categories) {
    this.blockedScripts.forEach((script) => {
      const category = script.getAttribute('data-category');
      
      if (category && categories[category]) {
        // Restore original type
        const originalType = script.getAttribute('data-original-type') || 'text/javascript';
        
        // Create a new script element (required for execution)
        const newScript = document.createElement('script');
        newScript.type = originalType;
        
        // Copy attributes
        Array.from(script.attributes).forEach((attr) => {
          if (attr.name !== 'type' && attr.name !== 'data-original-type') {
            newScript.setAttribute(attr.name, attr.value);
          }
        });

        // Copy content if inline script
        if (script.textContent) {
          newScript.textContent = script.textContent;
        }

        // Replace old script with new one
        if (script.parentNode) {
          script.parentNode.replaceChild(newScript, script);
        }
      }
    });

    // Unblock common tracking scripts
    this.unblockCommonScripts(categories);
  }

  /**
   * Scan and block common tracking scripts (gtag, GA4, Meta Pixel, etc.)
   * @private
   * @returns {void}
   */
  scanAndBlockCommonScripts() {
    const scripts = document.querySelectorAll('script');
    
    scripts.forEach((script) => {
      // Skip already categorized scripts
      if (script.getAttribute('data-category')) return;
      
      const src = script.src || '';
      const content = script.textContent || '';
      const detected = this.detectCategory(src + ' ' + content);
      
      if (detected && detected !== 'necessary') {
        script.setAttribute('data-category', detected);
        script.setAttribute('data-original-type', script.type || 'text/javascript');
        script.type = 'text/plain';
        this.blockedScripts.push(script);
      }
    });
  }

  /**
   * Unblock common tracking scripts based on consent
   * @private
   * @param {ConsentCategories} categories - Consent categories
   * @returns {void}
   */
  unblockCommonScripts(categories) {
    // Initialize gtag if analytics is consented
    if (categories.analytics && typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
      });
    }

    // Initialize Facebook Pixel if marketing is consented
    if (categories.marketing && typeof window.fbq === 'function') {
      window.fbq('consent', 'grant');
    }
  }
}

// ============================================================================
// GOOGLE CONSENT MODE
// ============================================================================

class GoogleConsentMode {
  /**
   * @param {ConsentManager} consentManager - Consent manager instance
   */
  constructor(consentManager) {
    /** @type {ConsentManager} */
    this.consentManager = consentManager;
    this.initializeDefaultConsent();
  }

  /**
   * Initialize default consent state (denied for all)
   * @private
   * @returns {void}
   */
  initializeDefaultConsent() {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'default', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
        functionality_storage: 'denied',
        personalization_storage: 'denied',
        security_storage: 'granted', // Always granted for security
      });
    }
  }

  /**
   * Update consent based on user choices
   * @param {ConsentCategories} categories - Consent categories
   * @returns {void}
   */
  update(categories) {
    if (typeof window.gtag !== 'function') {
      // gtag not available, try to initialize
      this.initializeGtag();
    }

    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        ad_storage: categories.marketing ? 'granted' : 'denied',
        ad_user_data: categories.marketing ? 'granted' : 'denied',
        ad_personalization: categories.marketing ? 'granted' : 'denied',
        analytics_storage: categories.analytics ? 'granted' : 'denied',
        functionality_storage: categories.preferences ? 'granted' : 'denied',
        personalization_storage: categories.preferences ? 'granted' : 'denied',
      });
    }
  }

  /**
   * Initialize gtag if not already present
   * @private
   * @returns {void}
   */
  initializeGtag() {
    if (typeof window.gtag === 'undefined') {
      // Create gtag function
      window.dataLayer = window.dataLayer || [];
      window.gtag = function() {
        window.dataLayer.push(arguments);
      };
      window.gtag('js', new Date());
    }
  }
}

// ============================================================================
// SERVICE LOADER
// ============================================================================

class ServiceLoader {
  /**
   * @param {ConsentManager} consentManager - Consent manager instance
   */
  constructor(consentManager) {
    /** @type {ConsentManager} */
    this.consentManager = consentManager;
    /** @type {Object} */
    this.services = {
      'meta-pixel': {
        id: null,
        category: 'marketing',
        loader: (pixelId) => {
          if (!pixelId || window.fbq) return;
          !function(f,b,e,v,n,t,s){
            if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)
          }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          window.fbq('init', pixelId);
          window.fbq('track', 'PageView');
        }
      },
      'clarity': {
        id: null,
        category: 'analytics',
        loader: (projectId) => {
          if (!projectId || window.clarity) return;
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;
            t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window,document,"clarity","script",projectId);
        }
      },
      'tiktok-pixel': {
        id: null,
        category: 'marketing',
        loader: (pixelId) => {
          if (!pixelId || window.ttq) return;
          !function(w,d,t){
            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
            ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
            ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
            for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
            ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
            ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
            ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;
            ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=document.createElement("script");
            o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;
            var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
            ttq.load(pixelId);ttq.page();
          }(window,document,'ttq');
        }
      },
      'google-ads': {
        conversionId: null,
        conversionLabel: null,
        category: 'marketing',
        loader: (config) => {
          // Gestito via Google Consent Mode
          console.log('[RS-CMP] Google Ads ready via Consent Mode:', config);
        }
      }
    };
  }

  /**
   * Configure a service with custom settings
   * @param {string} serviceId - Service identifier
   * @param {Object} config - Service configuration
   * @returns {void}
   */
  configure(serviceId, config) {
    if (this.services[serviceId]) {
      this.services[serviceId] = { ...this.services[serviceId], ...config };
    }
  }

  /**
   * Load a specific service
   * @param {string} serviceId - Service identifier
   * @returns {void}
   */
  loadService(serviceId) {
    const service = this.services[serviceId];
    if (!service) return;
    
    const hasConsent = this.consentManager.hasConsent(service.category);
    if (hasConsent && service.loader) {
      try {
        service.loader(service.id || service);
        console.log(`[RS-CMP] Service loaded: ${serviceId}`);
      } catch (error) {
        console.error(`[RS-CMP] Failed to load service ${serviceId}:`, error);
      }
    }
  }

  /**
   * Load all services based on consent categories
   * @param {ConsentCategories} categories - Consent categories
   * @returns {void}
   */
  loadAllServices(categories) {
    Object.keys(this.services).forEach(serviceId => {
      const service = this.services[serviceId];
      if (categories[service.category]) {
        this.loadService(serviceId);
      }
    });
  }
}

// ============================================================================
// BANNER UI
// ============================================================================

class BannerUI {
  /**
   * @param {ConsentManager} consentManager - Consent manager instance
   */
  constructor(consentManager) {
    /** @type {ConsentManager} */
    this.consentManager = consentManager;
    /** @type {HTMLElement | null} */
    this.bannerElement = null;
    /** @type {Config | null} */
    this.config = null;
  }

  /**
   * Show the consent banner
   * @param {Config} config - CMP configuration
   * @returns {void}
   */
  show(config) {
    this.config = config;
    
    // Don't show if banner already exists
    if (this.bannerElement) {
      return;
    }

    // Get user's language
    const userLang = this.detectLanguage();
    const translations = config.translations[userLang] || config.translations['en'] || config.translations[Object.keys(config.translations)[0]];

    // Create banner element
    this.bannerElement = this.createBanner(config, translations);
    
    // Add to document
    document.body.appendChild(this.bannerElement);

    // Emit event
    this.consentManager.emit('bannerShown', {});
  }

  /**
   * Hide the banner
   * @returns {void}
   */
  hide() {
    if (this.bannerElement) {
      this.bannerElement.remove();
      this.bannerElement = null;
      this.consentManager.emit('bannerClosed', {});
    }
  }

  /**
   * Create banner HTML
   * @private
   * @param {Config} config - CMP configuration
   * @param {Translations} translations - Translations
   * @returns {HTMLElement} Banner element
   */
  createBanner(config, translations) {
    const banner = document.createElement('div');
    banner.id = 'rs-cmp-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', translations.title);
    banner.setAttribute('aria-modal', 'true');

    // Apply styles
    this.applyStyles(banner, config);

    // Create banner content
    banner.innerHTML = `
      <div class="rs-cmp-content">
        ${config.banner.showLogo && config.banner.logoUrl ? `<img src="${config.banner.logoUrl}" alt="Logo" class="rs-cmp-logo" />` : ''}
        <h2 class="rs-cmp-title">${this.escapeHtml(translations.title)}</h2>
        <p class="rs-cmp-description">${this.escapeHtml(translations.description)}</p>
        <div class="rs-cmp-buttons">
          <button class="rs-cmp-btn rs-cmp-btn-accept" id="rs-cmp-accept-all">
            ${this.escapeHtml(translations.acceptAll)}
          </button>
          <button class="rs-cmp-btn rs-cmp-btn-reject" id="rs-cmp-reject-all">
            ${this.escapeHtml(translations.rejectAll)}
          </button>
          <button class="rs-cmp-btn rs-cmp-btn-customize" id="rs-cmp-customize">
            ${this.escapeHtml(translations.customize)}
          </button>
        </div>
      </div>
    `;

    // Add event listeners
    this.attachEventListeners(banner);

    return banner;
  }

  /**
   * Apply CSS styles to banner
   * @private
   * @param {HTMLElement} banner - Banner element
   * @param {Config} config - CMP configuration
   * @returns {void}
   */
  applyStyles(banner, config) {
    const { position, layout, primaryColor, backgroundColor, textColor, buttonTextColor } = config.banner;

    // Add CSS to document
    if (!document.getElementById('rs-cmp-styles')) {
      const style = document.createElement('style');
      style.id = 'rs-cmp-styles';
      style.textContent = `
        #rs-cmp-banner {
          position: fixed;
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: ${backgroundColor};
          color: ${textColor};
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          ${this.getPositionStyles(position, layout)}
        }
        
        .rs-cmp-content {
          padding: 24px;
          max-width: 100%;
        }
        
        .rs-cmp-logo {
          max-width: 150px;
          margin-bottom: 16px;
        }
        
        .rs-cmp-title {
          margin: 0 0 12px 0;
          font-size: 18px;
          font-weight: 600;
        }
        
        .rs-cmp-description {
          margin: 0 0 20px 0;
          font-size: 14px;
          line-height: 1.5;
          opacity: 0.9;
        }
        
        .rs-cmp-buttons {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        
        .rs-cmp-btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        
        .rs-cmp-btn:hover {
          opacity: 0.85;
        }
        
        .rs-cmp-btn:focus {
          outline: 2px solid ${primaryColor};
          outline-offset: 2px;
        }
        
        .rs-cmp-btn-accept {
          background: ${primaryColor};
          color: ${buttonTextColor};
        }
        
        .rs-cmp-btn-reject {
          background: transparent;
          color: ${textColor};
          border: 1px solid ${textColor};
        }
        
        .rs-cmp-btn-customize {
          background: transparent;
          color: ${textColor};
          text-decoration: underline;
        }
        
        @media (max-width: 768px) {
          #rs-cmp-banner {
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
          }
          
          .rs-cmp-buttons {
            flex-direction: column;
          }
          
          .rs-cmp-btn {
            width: 100%;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Get position-specific styles
   * @private
   * @param {string} position - Banner position
   * @param {string} layout - Banner layout
   * @returns {string} CSS styles
   */
  getPositionStyles(position, layout) {
    if (layout === 'modal' || position === 'center') {
      return `
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        max-width: 600px;
        border-radius: 12px;
      `;
    } else if (position === 'bottom') {
      return `
        bottom: 0;
        left: 0;
        right: 0;
        border-radius: 0;
      `;
    } else {
      return `
        top: 0;
        left: 0;
        right: 0;
        border-radius: 0;
      `;
    }
  }

  /**
   * Attach event listeners to buttons
   * @private
   * @param {HTMLElement} banner - Banner element
   * @returns {void}
   */
  attachEventListeners(banner) {
    const acceptBtn = banner.querySelector('#rs-cmp-accept-all');
    const rejectBtn = banner.querySelector('#rs-cmp-reject-all');
    const customizeBtn = banner.querySelector('#rs-cmp-customize');

    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => {
        this.consentManager.acceptAll(this.config ? this.config.policyVersion : '1.0');
        this.hide();
      });
    }

    if (rejectBtn) {
      rejectBtn.addEventListener('click', () => {
        this.consentManager.rejectAll(this.config ? this.config.policyVersion : '1.0');
        this.hide();
      });
    }

    if (customizeBtn) {
      customizeBtn.addEventListener('click', () => {
        this.showCustomizeModal();
      });
    }
  }

  /**
   * Show customize modal with category options
   * @private
   * @returns {void}
   */
  showCustomizeModal() {
    if (!this.config) return;

    const userLang = this.detectLanguage();
    const translations = this.config.translations[userLang] || this.config.translations['en'] || this.config.translations[Object.keys(this.config.translations)[0]];

    const modal = document.createElement('div');
    modal.id = 'rs-cmp-customize-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', translations.customize);
    
    modal.innerHTML = `
      <div class="rs-cmp-modal-overlay"></div>
      <div class="rs-cmp-modal-content">
        <h2>${this.escapeHtml(translations.customize)}</h2>
        <div class="rs-cmp-categories">
          ${this.config.categories.map((cat) => `
            <div class="rs-cmp-category">
              <div class="rs-cmp-category-header">
                <label>
                  <input 
                    type="checkbox" 
                    name="${cat.id}" 
                    ${cat.required ? 'checked disabled' : ''}
                    ${cat.enabled ? 'checked' : ''}
                  />
                  <div>
                    <strong>${this.escapeHtml(translations.categories[cat.id] ? translations.categories[cat.id].name : cat.name)}</strong>
                    <p>${this.escapeHtml(translations.categories[cat.id] ? translations.categories[cat.id].description : cat.description)}</p>
                  </div>
                </label>
                ${cat.id !== 'necessary' ? `
                  <button 
                    class="rs-cmp-toggle-details" 
                    onclick="this.parentElement.nextElementSibling.classList.toggle('rs-cmp-hidden')"
                    aria-label="Show details"
                  >
                    ▼
                  </button>
                ` : ''}
              </div>
              ${this.getServicesForCategory(cat.id)}
            </div>
          `).join('')}
        </div>
        <div class="rs-cmp-modal-buttons">
          <button class="rs-cmp-btn rs-cmp-btn-accept" id="rs-cmp-save-preferences">
            ${this.escapeHtml(translations.save)}
          </button>
          <button class="rs-cmp-btn rs-cmp-btn-customize" id="rs-cmp-close-modal">
            ${this.escapeHtml(translations.close)}
          </button>
        </div>
      </div>
    `;

    // Add modal styles
    if (!document.getElementById('rs-cmp-modal-styles')) {
      const style = document.createElement('style');
      style.id = 'rs-cmp-modal-styles';
      style.textContent = `
        #rs-cmp-customize-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000000;
        }
        
        .rs-cmp-modal-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
        }
        
        .rs-cmp-modal-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          padding: 24px;
          border-radius: 12px;
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }
        
        .rs-cmp-categories {
          margin: 20px 0;
        }
        
        .rs-cmp-category {
          padding: 16px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          margin-bottom: 12px;
        }
        
        .rs-cmp-category label {
          display: flex;
          gap: 12px;
          cursor: pointer;
        }
        
        .rs-cmp-category input[type="checkbox"] {
          margin-top: 4px;
        }
        
        .rs-cmp-category p {
          margin: 4px 0 0 0;
          font-size: 13px;
          opacity: 0.7;
        }
        
        .rs-cmp-hidden {
          display: none !important;
        }
        
        .rs-cmp-category-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        
        .rs-cmp-toggle-details {
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 12px;
          padding: 4px 8px;
        }
        
        .rs-cmp-category-services {
          margin-top: 12px;
          padding: 12px;
          background: #f5f5f5;
          border-radius: 4px;
          font-size: 12px;
        }
        
        .rs-cmp-services-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .rs-cmp-services-table th,
        .rs-cmp-services-table td {
          padding: 6px 8px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        
        .rs-cmp-services-table th {
          font-weight: 600;
          background: #e9e9e9;
        }
        
        .rs-cmp-modal-buttons {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(modal);

    // Event listeners
    const saveBtn = modal.querySelector('#rs-cmp-save-preferences');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const analyticsInput = modal.querySelector('input[name="analytics"]');
        const marketingInput = modal.querySelector('input[name="marketing"]');
        const preferencesInput = modal.querySelector('input[name="preferences"]');

        const categories = {
          necessary: true, // Always true
          analytics: analyticsInput ? analyticsInput.checked : false,
          marketing: marketingInput ? marketingInput.checked : false,
          preferences: preferencesInput ? preferencesInput.checked : false,
        };
        
        this.consentManager.setConsent(categories, this.config ? this.config.policyVersion : '1.0');
        modal.remove();
        this.hide();
      });
    }

    const closeBtn = modal.querySelector('#rs-cmp-close-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.remove();
      });
    }

    const overlay = modal.querySelector('.rs-cmp-modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => {
        modal.remove();
      });
    }
  }

  /**
   * Get services for a specific category
   * @param {string} categoryId - Category identifier
   * @returns {string} HTML for category services
   */
  getServicesForCategory(categoryId) {
    const servicesMap = {
      analytics: [
        { name: 'Google Analytics 4', provider: 'Google', duration: '2 years' },
        { name: 'Microsoft Clarity', provider: 'Microsoft', duration: '1 year' }
      ],
      marketing: [
        { name: 'Google Ads', provider: 'Google', duration: '90 days' },
        { name: 'Meta Pixel', provider: 'Meta', duration: '90 days' },
        { name: 'TikTok Pixel', provider: 'TikTok', duration: '13 months' }
      ],
      preferences: [
        { name: 'Language Settings', provider: 'First-party', duration: '1 year' },
        { name: 'Theme Preferences', provider: 'First-party', duration: '1 year' }
      ]
    };
    
    const services = servicesMap[categoryId] || [];
    
    if (services.length === 0) return '';
    
    return `
      <div class="rs-cmp-category-services rs-cmp-hidden">
        <table class="rs-cmp-services-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Provider</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            ${services.map(s => `
              <tr>
                <td>${this.escapeHtml(s.name)}</td>
                <td>${this.escapeHtml(s.provider)}</td>
                <td>${this.escapeHtml(s.duration)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Detect user's language
   * @private
   * @returns {string} Language code
   */
  detectLanguage() {
    const lang = navigator.language || navigator.userLanguage || 'en';
    return lang.split('-')[0]; // Get base language (e.g., 'en' from 'en-US')
  }

  /**
   * Escape HTML to prevent XSS
   * @private
   * @param {string} text - Text to escape
   * @returns {string} Escaped HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ============================================================================
// MAIN CMP CLASS
// ============================================================================

class RSCMP {
  constructor() {
    /** @type {ConsentStorage} */
    this.consentStorage = new ConsentStorage();
    /** @type {ConsentManager} */
    this.consentManager = new ConsentManager(this.consentStorage);
    /** @type {BannerUI} */
    this.bannerUI = new BannerUI(this.consentManager);
    /** @type {ScriptBlocker} */
    this.scriptBlocker = new ScriptBlocker(this.consentManager);
    /** @type {GoogleConsentMode} */
    this.googleConsentMode = new GoogleConsentMode(this.consentManager);
    /** @type {ServiceLoader} */
    this.serviceLoader = new ServiceLoader(this.consentManager);
    /** @type {Config | null} */
    this.config = null;
    /** @type {string | null} */
    this.siteId = null;
    /** @type {boolean} */
    this.debugMode = false;
  }

  /**
   * Initialize the CMP
   * @param {Config | null} [inlineConfig] - Optional inline configuration
   * @returns {Promise<void>}
   */
  async init(inlineConfig = null) {
    try {
      // Get site-id from script tag
      this.siteId = this.getSiteIdFromScript();
      
      // Support inline configuration
      if (inlineConfig) {
        this.config = this.mergeWithDefaults(inlineConfig);
      } else if (this.siteId) {
        // Load from API
        this.config = await this.loadConfig(this.siteId);
      } else {
        // Use default configuration
        this.config = this.getDefaultConfig();
      }
      
      // Check if consent already exists
      const existingConsent = this.consentStorage.getConsent();
      
      if (existingConsent) {
        // Apply existing consent
        this.applyConsent(existingConsent.categories);
      } else {
        // Block all scripts by default
        this.scriptBlocker.blockScripts();
        
        // Show banner
        this.bannerUI.show(this.config);
      }

      // Listen for consent updates
      this.consentManager.on('consentUpdated', (categories) => {
        this.applyConsent(categories);
      });

    } catch (error) {
      console.error('[RS-CMP] Initialization error:', error);
    }
  }

  /**
   * Get site-id from script tag
   * @private
   * @returns {string | null} Site ID or null
   */
  getSiteIdFromScript() {
    const scripts = document.querySelectorAll('script[data-site-id]');
    if (scripts.length > 0) {
      return scripts[0].getAttribute('data-site-id');
    }
    return null;
  }

  /**
   * Load configuration from API
   * @private
   * @param {string} siteId - Site identifier
   * @returns {Promise<Config>} Configuration
   */
  async loadConfig(siteId) {
    const apiUrl = this.getApiUrl();
    const response = await fetch(`${apiUrl}/v1/site/${siteId}/config`);
    
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * Get API URL (can be overridden with data-api-url attribute)
   * @private
   * @returns {string} API URL
   */
  getApiUrl() {
    const scripts = document.querySelectorAll('script[data-site-id]');
    if (scripts.length > 0) {
      const customUrl = scripts[0].getAttribute('data-api-url');
      if (customUrl) return customUrl;
    }
    return 'https://api.rs-cmp.com'; // Default API URL
  }

  /**
   * Apply consent to scripts and services
   * @private
   * @param {ConsentCategories} categories - Consent categories
   * @returns {void}
   */
  applyConsent(categories) {
    // Unblock scripts based on consent
    this.scriptBlocker.unblockScripts(categories);
    
    // Update Google Consent Mode
    this.googleConsentMode.update(categories);
    
    // Load services based on consent
    this.serviceLoader.loadAllServices(categories);
    
    // Send consent to backend
    if (this.siteId && this.config) {
      this.sendConsentToBackend(categories);
    }
  }

  /**
   * Configure a service (public method)
   * @param {string} serviceId - Service identifier
   * @param {Object} config - Service configuration
   * @returns {void}
   */
  configureService(serviceId, config) {
    this.serviceLoader.configure(serviceId, config);
  }

  /**
   * Show preferences banner (public method)
   * @returns {void}
   */
  showPreferences() {
    if (this.config) {
      this.bannerUI.show(this.config);
    }
  }

  /**
   * Reset consent and show banner (public method)
   * @returns {void}
   */
  resetConsent() {
    this.consentStorage.clearConsent();
    this.scriptBlocker.blockScripts();
    this.showPreferences();
  }

  /**
   * Enable debug mode
   * @returns {void}
   */
  enableDebug() {
    this.debugMode = true;
    console.log('[RS-CMP] Debug mode enabled');
  }

  /**
   * Disable debug mode
   * @returns {void}
   */
  disableDebug() {
    this.debugMode = false;
  }

  /**
   * Log message if debug mode is enabled
   * @param {...*} args - Arguments to log
   * @returns {void}
   */
  log(...args) {
    if (this.debugMode) {
      console.log('[RS-CMP]', ...args);
    }
  }

  /**
   * Get CMP status (diagnostic method)
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      initialized: !!this.config,
      siteId: this.siteId,
      consent: this.consentManager.getConsent(),
      blockedScripts: this.scriptBlocker.blockedScripts.length,
      bannerVisible: !!this.bannerUI.bannerElement
    };
  }

  /**
   * Test Google Consent Mode
   * @returns {void}
   */
  testConsentMode() {
    if (typeof window.gtag === 'function') {
      console.log('[RS-CMP] Testing Google Consent Mode...');
      window.gtag('get', 'G-XXXXXX', 'consent', (consent) => {
        console.log('[RS-CMP] Current consent state:', consent);
      });
    } else {
      console.warn('[RS-CMP] gtag not available');
    }
  }

  /**
   * Get default configuration
   * @returns {Config} Default configuration
   */
  getDefaultConfig() {
    return {
      siteId: 'default',
      siteName: 'Website',
      domain: window.location.hostname,
      policyVersion: '1.0',
      banner: {
        position: 'bottom',
        layout: 'bar',
        primaryColor: '#0084ff',
        backgroundColor: '#ffffff',
        textColor: '#000000',
        buttonTextColor: '#ffffff',
        showLogo: false
      },
      categories: [
        { id: 'necessary', name: 'Necessary', description: 'Required for site functionality', required: true, enabled: true },
        { id: 'analytics', name: 'Analytics', description: 'Help us improve', required: false, enabled: false },
        { id: 'marketing', name: 'Marketing', description: 'Personalized ads', required: false, enabled: false },
        { id: 'preferences', name: 'Preferences', description: 'Remember your choices', required: false, enabled: false }
      ],
      translations: {
        en: {
          title: 'We respect your privacy',
          description: 'We use cookies to improve your experience.',
          acceptAll: 'Accept All',
          rejectAll: 'Reject All',
          customize: 'Customize',
          save: 'Save Preferences',
          close: 'Close',
          categories: {
            necessary: { name: 'Necessary', description: 'Essential cookies' },
            analytics: { name: 'Analytics', description: 'Usage statistics' },
            marketing: { name: 'Marketing', description: 'Advertising cookies' },
            preferences: { name: 'Preferences', description: 'Your settings' }
          }
        }
      }
    };
  }

  /**
   * Merge custom config with defaults
   * @param {Object} config - Custom configuration
   * @returns {Config} Merged configuration
   */
  mergeWithDefaults(config) {
    const defaults = this.getDefaultConfig();
    return {
      ...defaults,
      ...config,
      banner: { ...defaults.banner, ...(config.banner || {}) },
      categories: config.categories || defaults.categories,
      translations: { ...defaults.translations, ...(config.translations || {}) }
    };
  }

  /**
   * Send consent data to backend
   * @private
   * @param {ConsentCategories} categories - Consent categories
   * @returns {Promise<void>}
   */
  async sendConsentToBackend(categories) {
    try {
      const apiUrl = this.getApiUrl();
      await fetch(`${apiUrl}/v1/consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId: this.siteId,
          categories,
          timestamp: new Date().toISOString(),
          version: this.config ? this.config.policyVersion : '1.0',
        }),
      });
    } catch (error) {
      console.error('[RS-CMP] Failed to send consent:', error);
    }
  }
}

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

// Auto-initialize on page load
if (typeof window !== 'undefined') {
  const cmp = new RSCMP();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => cmp.init().catch(err => {
      console.error('[RS-CMP] Auto-initialization failed:', err);
    }));
  } else {
    cmp.init().catch(err => {
      console.error('[RS-CMP] Auto-initialization failed:', err);
    });
  }

  // Expose to window for manual control
  window.RSCMP = cmp;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RSCMP;
}
