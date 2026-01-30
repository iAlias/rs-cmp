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
          box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.1);
          border-top: 1px solid rgba(0, 0, 0, 0.08);
          ${this.getPositionStyles(position, layout)}
        }
        
        .rs-cmp-content {
          padding: 20px 32px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .rs-cmp-logo {
          max-width: 150px;
          margin-bottom: 16px;
        }
        
        .rs-cmp-title {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
          line-height: 1.4;
        }
        
        .rs-cmp-description {
          margin: 0 0 16px 0;
          font-size: 13px;
          line-height: 1.6;
          opacity: 0.85;
          max-width: 800px;
        }
        
        .rs-cmp-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }
        
        .rs-cmp-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        
        .rs-cmp-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        
        .rs-cmp-btn:active {
          transform: translateY(0);
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
          background: #f5f5f5;
          color: ${textColor};
          border: 1px solid #e0e0e0;
        }
        
        .rs-cmp-btn-reject:hover {
          background: #ebebeb;
        }
        
        .rs-cmp-btn-customize {
          background: transparent;
          color: ${primaryColor};
          text-decoration: none;
          padding: 10px 16px;
        }
        
        .rs-cmp-btn-customize:hover {
          text-decoration: underline;
          box-shadow: none;
          transform: none;
        }
        
        @media (max-width: 768px) {
          #rs-cmp-banner {
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
          }
          
          .rs-cmp-content {
            padding: 16px 20px;
          }
          
          .rs-cmp-buttons {
            flex-direction: column;
            gap: 8px;
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
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(2px);
        }
        
        .rs-cmp-modal-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: linear-gradient(to bottom, #ffffff, #f8f9fa);
          padding: 32px;
          border-radius: 16px;
          min-width: 50vw;
          max-width: 800px;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 1px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.8);
          animation: rs-cmp-modal-appear 0.3s ease-out;
        }
        
        @keyframes rs-cmp-modal-appear {
          from {
            opacity: 0;
            transform: translate(-50%, -48%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        
        .rs-cmp-modal-content h2 {
          color: #1a202c;
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 8px 0;
          letter-spacing: -0.5px;
        }
        
        .rs-cmp-categories {
          margin: 24px 0;
        }
        
        .rs-cmp-category {
          padding: 20px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          margin-bottom: 16px;
          transition: all 0.2s ease;
        }
        
        .rs-cmp-category:hover {
          border-color: #cbd5e0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transform: translateY(-2px);
        }
        
        .rs-cmp-category label {
          display: flex;
          gap: 16px;
          cursor: pointer;
          align-items: flex-start;
        }
        
        .rs-cmp-category input[type="checkbox"] {
          margin-top: 4px;
          width: 20px;
          height: 20px;
          cursor: pointer;
          accent-color: #2563eb;
        }
        
        .rs-cmp-category input[type="checkbox"]:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
        
        .rs-cmp-category strong {
          color: #2d3748;
          font-size: 16px;
          font-weight: 600;
        }
        
        .rs-cmp-category p {
          margin: 6px 0 0 0;
          font-size: 14px;
          line-height: 1.6;
          color: #4a5568;
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
          margin-top: 24px;
        }
        
        .rs-cmp-modal-buttons button {
          flex: 1;
          padding: 14px 28px;
          font-size: 15px;
          font-weight: 600;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .rs-cmp-modal-buttons button:first-child {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }
        
        .rs-cmp-modal-buttons button:first-child:hover {
          background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
          transform: translateY(-2px);
        }
        
        .rs-cmp-modal-buttons button:last-child {
          background: #f1f5f9;
          color: #475569;
          border: 2px solid #e2e8f0;
        }
        
        .rs-cmp-modal-buttons button:last-child:hover {
          background: #e2e8f0;
          border-color: #cbd5e0;
        }
        
        @media (max-width: 768px) {
          .rs-cmp-modal-content {
            min-width: 90vw;
            max-width: 90vw;
            padding: 24px;
          }
          
          .rs-cmp-modal-buttons {
            flex-direction: column;
          }
        }
        
        @media (prefers-reduced-motion: reduce) {
          .rs-cmp-modal-content {
            animation: none;
          }
          
          .rs-cmp-category:hover {
            transform: none;
          }
          
          .rs-cmp-modal-buttons button:hover {
            transform: none;
          }
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
// TCF 2.2 MANAGER (IAB Transparency & Consent Framework)
// ============================================================================

class TCFManager {
  constructor() {
    /** @type {number} */
    this.tcfVersion = 2.2;
    /** @type {Map<number, Object>} */
    this.vendors = new Map(); // IAB vendor list
    /** @type {Map<number, Object>} */
    this.purposes = new Map(); // IAB purposes
    /** @type {Map<number, Object>} */
    this.specialFeatures = new Map(); // IAB special features
    /** @type {Map<number, Object>} */
    this.specialPurposes = new Map(); // IAB special purposes
    /** @type {string | null} */
    this.tcString = null;
    /** @type {Object} */
    this.vendorConsents = {};
    /** @type {Object} */
    this.purposeConsents = {};
    /** @type {number} */
    this.cmpId = 1; // CMP ID (should be registered with IAB)
    /** @type {number} */
    this.cmpVersion = 1;
    /** @type {string} */
    this.consentScreen = 1;
    /** @type {string} */
    this.consentLanguage = 'IT';
    /** @type {number} */
    this.vendorListVersion = 0;
    /** @type {number} */
    this.policyVersion = 2;
  }

  /**
   * Initialize TCF API
   * @returns {void}
   */
  init() {
    this.setupTCFAPI();
    this.loadVendorList();
    this.loadPurposes();
  }

  /**
   * Setup IAB TCF API window.__tcfapi
   * @returns {void}
   */
  setupTCFAPI() {
    const tcfManager = this;
    
    // Setup __tcfapi function
    window.__tcfapi = (command, version, callback, parameter) => {
      if (typeof callback !== 'function') {
        console.error('[TCF] Callback must be a function');
        return;
      }

      // Handle commands
      switch (command) {
        case 'ping':
          callback({
            gdprApplies: true,
            cmpLoaded: true,
            cmpStatus: 'loaded',
            displayStatus: 'visible',
            apiVersion: '2.2',
            cmpVersion: tcfManager.cmpVersion,
            cmpId: tcfManager.cmpId,
            gvlVersion: tcfManager.vendorListVersion,
            tcfPolicyVersion: tcfManager.policyVersion
          }, true);
          break;

        case 'getTCData':
          callback(tcfManager.getTCData(parameter), true);
          break;

        case 'getVendorList':
          callback(tcfManager.getVendorList(parameter), true);
          break;

        case 'addEventListener':
          tcfManager.addEventListener(callback);
          break;

        case 'removeEventListener':
          tcfManager.removeEventListener(parameter);
          break;

        default:
          console.warn(`[TCF] Unknown command: ${command}`);
          callback(null, false);
      }
    };

    // Setup __tcfapi.a queue for early calls
    window.__tcfapi.a = window.__tcfapi.a || [];
  }

  /**
   * Get TC Data
   * @param {Array<number>} vendorIds - Optional vendor IDs to filter
   * @returns {Object} TC Data object
   */
  getTCData(vendorIds) {
    return {
      tcString: this.tcString || '',
      tcfPolicyVersion: this.policyVersion,
      cmpId: this.cmpId,
      cmpVersion: this.cmpVersion,
      gdprApplies: true,
      eventStatus: this.tcString ? 'tcloaded' : 'cmpuishown',
      cmpStatus: 'loaded',
      listenerId: null,
      isServiceSpecific: false,
      useNonStandardTexts: false,
      publisherCC: 'IT',
      purposeOneTreatment: false,
      outOfBand: {
        allowedVendors: {},
        disclosedVendors: {}
      },
      purpose: {
        consents: this.purposeConsents,
        legitimateInterests: {}
      },
      vendor: {
        consents: vendorIds 
          ? this.filterVendorConsents(vendorIds)
          : this.vendorConsents,
        legitimateInterests: {}
      },
      specialFeatureOptins: {},
      publisher: {
        consents: {},
        legitimateInterests: {},
        customPurpose: {
          consents: {},
          legitimateInterests: {}
        },
        restrictions: {}
      }
    };
  }

  /**
   * Filter vendor consents by IDs
   * @param {Array<number>} vendorIds - Vendor IDs
   * @returns {Object} Filtered consents
   */
  filterVendorConsents(vendorIds) {
    const filtered = {};
    vendorIds.forEach(id => {
      if (this.vendorConsents[id] !== undefined) {
        filtered[id] = this.vendorConsents[id];
      }
    });
    return filtered;
  }

  /**
   * Get vendor list
   * @param {number} vendorListVersion - Optional version
   * @returns {Object} Vendor list
   */
  getVendorList(vendorListVersion) {
    return {
      gvlSpecificationVersion: 2,
      vendorListVersion: this.vendorListVersion,
      tcfPolicyVersion: this.policyVersion,
      lastUpdated: new Date().toISOString(),
      purposes: this.getPurposesObject(),
      specialPurposes: this.getSpecialPurposesObject(),
      features: {},
      specialFeatures: this.getSpecialFeaturesObject(),
      vendors: this.getVendorsObject()
    };
  }

  /**
   * Get purposes as object
   * @returns {Object} Purposes
   */
  getPurposesObject() {
    const purposesObj = {};
    this.purposes.forEach((purpose, id) => {
      purposesObj[id] = purpose;
    });
    return purposesObj;
  }

  /**
   * Get special purposes as object
   * @returns {Object} Special purposes
   */
  getSpecialPurposesObject() {
    const specialPurposesObj = {};
    this.specialPurposes.forEach((purpose, id) => {
      specialPurposesObj[id] = purpose;
    });
    return specialPurposesObj;
  }

  /**
   * Get special features as object
   * @returns {Object} Special features
   */
  getSpecialFeaturesObject() {
    const specialFeaturesObj = {};
    this.specialFeatures.forEach((feature, id) => {
      specialFeaturesObj[id] = feature;
    });
    return specialFeaturesObj;
  }

  /**
   * Get vendors as object
   * @returns {Object} Vendors
   */
  getVendorsObject() {
    const vendorsObj = {};
    this.vendors.forEach((vendor, id) => {
      vendorsObj[id] = vendor;
    });
    return vendorsObj;
  }

  /**
   * Add event listener
   * @param {Function} callback - Callback function
   * @returns {void}
   */
  addEventListener(callback) {
    // Store listener and call immediately with current data
    callback(this.getTCData(), true);
  }

  /**
   * Remove event listener
   * @param {number} listenerId - Listener ID
   * @returns {void}
   */
  removeEventListener(listenerId) {
    // Implementation for removing event listeners
    console.log(`[TCF] Remove listener: ${listenerId}`);
  }

  /**
   * Load IAB vendor list
   * @returns {Promise<void>}
   */
  async loadVendorList() {
    try {
      // Load official IAB Global Vendor List
      const response = await fetch('https://vendor-list.consensu.org/v2/vendor-list.json');
      const data = await response.json();
      
      this.vendorListVersion = data.vendorListVersion || 0;
      
      // Store vendors
      if (data.vendors) {
        Object.entries(data.vendors).forEach(([id, vendor]) => {
          this.vendors.set(parseInt(id), vendor);
        });
      }

      console.log(`[TCF] Loaded ${this.vendors.size} vendors from IAB GVL v${this.vendorListVersion}`);
    } catch (error) {
      console.error('[TCF] Failed to load vendor list:', error);
      // Initialize with empty vendor list
      this.vendors = new Map();
      this.vendorListVersion = 0;
    }
  }

  /**
   * Load IAB purposes
   * @returns {void}
   */
  loadPurposes() {
    // Standard IAB TCF v2.2 purposes
    this.purposes.set(1, {
      id: 1,
      name: 'Store and/or access information on a device',
      description: 'Cookies, device identifiers, or other information can be stored or accessed on your device for the purposes presented to you.',
      descriptionLegal: 'Vendors can: Store and access information on the device such as cookies and device identifiers presented to a user.'
    });
    
    this.purposes.set(2, {
      id: 2,
      name: 'Select basic ads',
      description: 'Ads can be shown to you based on the content you\'re viewing, the app you\'re using, your approximate location, or your device type.',
      descriptionLegal: 'To do basic ad selection vendors can: Use real-time information about the context in which the ad will be shown.'
    });
    
    this.purposes.set(3, {
      id: 3,
      name: 'Create a personalized ads profile',
      description: 'A profile can be built about you and your interests to show you personalized ads that are relevant to you.',
      descriptionLegal: 'To create a personalized ads profile vendors can: Collect information about a user, including a user\'s activity, interests, demographic information, or location.'
    });
    
    this.purposes.set(4, {
      id: 4,
      name: 'Select personalized ads',
      description: 'Personalized ads can be shown to you based on a profile about you.',
      descriptionLegal: 'To select personalized ads vendors can: Select personalized ads based on a profile or other historical user data.'
    });
    
    this.purposes.set(5, {
      id: 5,
      name: 'Create a personalized content profile',
      description: 'A profile can be built about you and your interests to show you personalized content that is relevant to you.',
      descriptionLegal: 'To create a personalized content profile vendors can: Collect information about a user, including a user\'s activity, interests, demographic information, or location.'
    });
    
    this.purposes.set(6, {
      id: 6,
      name: 'Select personalized content',
      description: 'Personalized content can be shown to you based on a profile about you.',
      descriptionLegal: 'To select personalized content vendors can: Select personalized content based on a profile or other historical user data.'
    });
    
    this.purposes.set(7, {
      id: 7,
      name: 'Measure ad performance',
      description: 'The performance and effectiveness of ads that you see or interact with can be measured.',
      descriptionLegal: 'To measure ad performance vendors can: Measure whether and how ads were delivered to and interacted with by a user.'
    });
    
    this.purposes.set(8, {
      id: 8,
      name: 'Measure content performance',
      description: 'The performance and effectiveness of content that you see or interact with can be measured.',
      descriptionLegal: 'To measure content performance vendors can: Measure whether and how content was delivered to and interacted with by a user.'
    });
    
    this.purposes.set(9, {
      id: 9,
      name: 'Apply market research to generate audience insights',
      description: 'Market research can be used to learn more about the audiences who visit sites/apps and view ads.',
      descriptionLegal: 'To apply market research to generate audience insights vendors can: Provide aggregate reporting to advertisers or their representatives about the audiences reached by their ads.'
    });
    
    this.purposes.set(10, {
      id: 10,
      name: 'Develop and improve products',
      description: 'Your data can be used to improve existing systems and software, and to develop new products.',
      descriptionLegal: 'To develop new products and improve products vendors can: Use information to improve their existing products with new features and to develop new products.'
    });

    // Special features
    this.specialFeatures.set(1, {
      id: 1,
      name: 'Use precise geolocation data',
      description: 'Your precise geolocation data can be used in support of one or more purposes.'
    });
    
    this.specialFeatures.set(2, {
      id: 2,
      name: 'Actively scan device characteristics for identification',
      description: 'Your device can be identified based on a scan of your device\'s unique combination of characteristics.'
    });

    console.log(`[TCF] Loaded ${this.purposes.size} purposes and ${this.specialFeatures.size} special features`);
  }

  /**
   * Update consent from categories
   * @param {ConsentCategories} categories - Consent categories
   * @returns {void}
   */
  updateConsent(categories) {
    // Map CMP categories to TCF purposes
    this.purposeConsents = {
      1: categories.necessary,  // Store and access information
      2: categories.marketing,  // Basic ads
      3: categories.marketing,  // Personalized ads profile
      4: categories.marketing,  // Select personalized ads
      5: categories.preferences, // Personalized content profile
      6: categories.preferences, // Select personalized content
      7: categories.analytics,  // Measure ad performance
      8: categories.analytics,  // Measure content performance
      9: categories.analytics,  // Market research
      10: categories.analytics  // Develop and improve products
    };

    // Set all vendors to the same consent status
    // In a production system, this should be more granular
    const hasMarketingConsent = categories.marketing;
    this.vendors.forEach((vendor, id) => {
      this.vendorConsents[id] = hasMarketingConsent;
    });

    // Generate TC String
    this.tcString = this.generateTCString();
    
    // Update __tcfapi listeners
    this.notifyListeners();
    
    console.log('[TCF] Consent updated, TC String:', this.tcString);
  }

  /**
   * Generate TC String (simplified implementation)
   * @returns {string} TC String
   */
  generateTCString() {
    // This is a simplified TC String generation
    // Production implementation should follow IAB TCF specification exactly
    // TC String format: CPXxxx... (base64url encoded binary consent data)
    
    const version = 2;
    const created = Math.floor(Date.now() / 100); // deciseconds
    const updated = created;
    const cmpId = this.cmpId;
    const cmpVersion = this.cmpVersion;
    const consentScreen = this.consentScreen;
    const consentLanguage = this.consentLanguage;
    const vendorListVersion = this.vendorListVersion;
    
    // Create a simplified identifier (not a real TC String)
    // In production, use a proper TC String encoder library
    const tcString = `CP${version}${cmpId}${cmpVersion}_${consentLanguage}${vendorListVersion}`;
    
    return btoa(tcString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Notify listeners of consent changes
   * @returns {void}
   */
  notifyListeners() {
    // Dispatch event for any listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tcfapi-update', {
        detail: this.getTCData()
      }));
    }
  }

  /**
   * Get current TC String
   * @returns {string | null} TC String
   */
  getTCString() {
    return this.tcString;
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
    /** @type {TCFManager} */
    this.tcfManager = new TCFManager();
    /** @type {Config | null} */
    this.config = null;
    /** @type {string | null} */
    this.siteId = null;
    /** @type {boolean} */
    this.debugMode = false;
    /** @type {HTMLElement | null} */
    this.reopenButton = null;
  }

  /**
   * Initialize the CMP
   * @param {Config | null} [inlineConfig] - Optional inline configuration
   * @returns {Promise<void>}
   */
  async init(inlineConfig = null) {
    try {
      // Initialize TCF 2.2
      this.tcfManager.init();
      
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
        // Show reopen button
        this.showReopenButton();
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

      // Listen for banner close to show reopen button
      this.consentManager.on('bannerClosed', () => {
        this.showReopenButton();
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
    
    // Update TCF 2.2 consent
    this.tcfManager.updateConsent(categories);
    
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
        it: {
          title: 'Rispettiamo la tua privacy',
          description: 'Utilizziamo cookie per migliorare la tua esperienza sul nostro sito.',
          acceptAll: 'Accetta tutto',
          rejectAll: 'Rifiuta tutto',
          customize: 'Personalizza',
          save: 'Salva preferenze',
          close: 'Chiudi',
          categories: {
            necessary: { name: 'Necessari', description: 'Cookie essenziali per il funzionamento del sito' },
            analytics: { name: 'Analitici', description: 'Statistiche di utilizzo per migliorare il sito' },
            marketing: { name: 'Marketing', description: 'Cookie pubblicitari per annunci personalizzati' },
            preferences: { name: 'Preferenze', description: 'Le tue impostazioni personalizzate' }
          }
        },
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
   * Show reopen button (fixed bottom-left)
   * @returns {void}
   */
  showReopenButton() {
    if (this.reopenButton) {
      return; // Already shown
    }

    // Create button
    const button = document.createElement('button');
    button.id = 'rs-cmp-reopen-btn';
    button.setAttribute('aria-label', 'Privacy Settings');
    button.title = 'Privacy Settings';
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" fill="currentColor"/>
      </svg>
    `;

    // Add styles
    if (!document.getElementById('rs-cmp-reopen-styles')) {
      const style = document.createElement('style');
      style.id = 'rs-cmp-reopen-styles';
      style.textContent = `
        #rs-cmp-reopen-btn {
          position: fixed;
          bottom: 20px;
          left: 20px;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #0084ff;
          color: white;
          border: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          cursor: pointer;
          z-index: 999998;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        
        #rs-cmp-reopen-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        #rs-cmp-reopen-btn:focus {
          outline: 2px solid #0084ff;
          outline-offset: 2px;
        }
        
        @media (max-width: 768px) {
          #rs-cmp-reopen-btn {
            bottom: 15px;
            left: 15px;
            width: 44px;
            height: 44px;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Add click handler
    button.addEventListener('click', () => {
      this.showPreferences();
    });

    // Add to document
    document.body.appendChild(button);
    this.reopenButton = button;
  }

  /**
   * Hide reopen button
   * @returns {void}
   */
  hideReopenButton() {
    if (this.reopenButton) {
      this.reopenButton.remove();
      this.reopenButton = null;
    }
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
