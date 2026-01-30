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
/**
 * TCFManager - Gestore del Framework IAB TCF 2.2
 * 
 * Questa classe implementa il Transparency & Consent Framework versione 2.2 dell'IAB
 * (Interactive Advertising Bureau). Il TCF è uno standard europeo che permette ai
 * publisher e agli inserzionisti di comunicare le preferenze di consenso degli utenti
 * in modo standardizzato, conforme al GDPR.
 * 
 * Funzionalità principali:
 * - Espone l'API globale __tcfapi() come richiesto dallo standard IAB
 * - Gestisce la Global Vendor List (GVL) contenente tutti i vendor IAB registrati
 * - Gestisce i 10 purpose standard definiti dal TCF 2.2
 * - Genera e mantiene la TC String (Transparency & Consent String) che codifica
 *   i consensi dell'utente in formato standardizzato
 * - Mappa i consensi delle categorie CMP ai purpose TCF
 * 
 * Nota: Questa è un'implementazione semplificata. In produzione, per la piena
 * conformità TCF 2.2, si dovrebbe usare una libreria certificata IAB per la
 * generazione delle TC String.
 */
class TCFManager {
  constructor() {
    // ===== Configurazione Base TCF =====
    /** @type {number} - Versione del TCF implementata (2.2) */
    this.tcfVersion = 2.2;
    
    // ===== Liste IAB =====
    /** @type {Map<number, Object>} - Lista globale dei vendor IAB registrati */
    this.vendors = new Map(); // Caricata da https://vendor-list.consensu.org
    /** @type {Map<number, Object>} - I 10 purpose standard IAB TCF 2.2 */
    this.purposes = new Map(); // Purpose 1-10 definiti dallo standard
    /** @type {Map<number, Object>} - Special features IAB (es. geolocalizzazione precisa) */
    this.specialFeatures = new Map(); // Feature che richiedono opt-in esplicito
    /** @type {Map<number, Object>} - Special purposes IAB */
    this.specialPurposes = new Map(); // Purpose speciali che non richiedono consenso
    
    // ===== Stato dei Consensi =====
    /** @type {string | null} - TC String: stringa codificata che rappresenta tutti i consensi */
    this.tcString = null; // Formato: CPxxx... (base64url encoded)
    /** @type {Object} - Consensi per singolo vendor {vendorId: boolean} */
    this.vendorConsents = {}; // Quale vendor ha il consenso dell'utente
    /** @type {Object} - Consensi per purpose {purposeId: boolean} */
    this.purposeConsents = {}; // Quale purpose è stato consentito
    
    // ===== Identificazione CMP =====
    /** @type {number} - ID della CMP (deve essere registrato con IAB) */
    this.cmpId = 1; // In produzione: ottenere ID ufficiale da IAB
    /** @type {number} - Versione della CMP */
    this.cmpVersion = 1;
    /** @type {string} - Numero dello schermo dove è stato dato il consenso */
    this.consentScreen = 1; // Utile per tracking multi-step
    /** @type {string} - Lingua in cui è stato presentato il consenso (ISO 639-1) */
    this.consentLanguage = 'IT'; // IT = Italiano
    
    // ===== Versioning =====
    /** @type {number} - Versione della Global Vendor List caricata */
    this.vendorListVersion = 0; // Incrementa ad ogni aggiornamento GVL
    /** @type {number} - Versione della policy TCF */
    this.policyVersion = 2; // TCF Policy Version (attualmente 2)
  }

  /**
   * Inizializza il sistema TCF
   * 
   * Questo metodo esegue tre operazioni fondamentali:
   * 1. Configura l'API globale __tcfapi richiesta dallo standard IAB
   * 2. Carica la Global Vendor List da IAB (lista aggiornata di tutti i vendor)
   * 3. Inizializza i 10 purpose standard e le special features del TCF 2.2
   * 
   * @returns {void}
   */
  init() {
    this.setupTCFAPI();    // Espone window.__tcfapi()
    this.loadVendorList(); // Carica vendor da IAB (asincrono)
    this.loadPurposes();   // Carica i 10 purpose standard
  }

  /**
   * Configura l'API IAB TCF standard: window.__tcfapi
   * 
   * Il TCF richiede che ogni CMP esponga una funzione globale __tcfapi() che
   * permette a vendor, publisher e altri script di:
   * - Verificare se la CMP è caricata (ping)
   * - Ottenere i dati di consenso correnti (getTCData)
   * - Accedere alla Global Vendor List (getVendorList)
   * - Registrare listener per aggiornamenti (addEventListener)
   * 
   * Questa funzione è lo standard de facto per la comunicazione dei consensi
   * nell'ecosistema pubblicitario europeo.
   * 
   * Comandi supportati:
   * - ping: Verifica stato CMP
   * - getTCData: Ottiene tutti i dati di consenso (TC Data)
   * - getVendorList: Ottiene la lista vendor
   * - addEventListener: Registra un listener per cambiamenti
   * - removeEventListener: Rimuove un listener
   * 
   * @returns {void}
   */
  setupTCFAPI() {
    // Crea la funzione globale __tcfapi come richiesto dallo standard IAB
    window.__tcfapi = (command, version, callback, parameter) => {
      // Il callback è obbligatorio secondo lo standard
      if (typeof callback !== 'function') {
        console.error('[TCF] Callback must be a function');
        return;
      }

      // Gestisce i vari comandi standard TCF
      switch (command) {
        case 'ping':
          // Ping: Restituisce lo stato della CMP
          // Usato da vendor/script per verificare se la CMP è pronta
          callback({
            gdprApplies: true,           // GDPR si applica (siamo in EU)
            cmpLoaded: true,             // CMP è caricata
            cmpStatus: 'loaded',         // Stato: loaded, error, stub
            displayStatus: 'visible',    // Banner: visible, hidden, disabled
            apiVersion: '2.2',           // Versione API TCF
            cmpVersion: this.cmpVersion, // Versione della nostra CMP
            cmpId: this.cmpId,          // ID CMP registrato con IAB
            gvlVersion: this.vendorListVersion, // Versione GVL caricata
            tcfPolicyVersion: this.policyVersion // Versione policy TCF
          }, true);
          break;

        case 'getTCData':
          // getTCData: Restituisce tutti i dati di consenso
          // Questo è il comando più importante - contiene la TC String,
          // i consensi per purpose e vendor, e tutti i metadati
          callback(this.getTCData(parameter), true);
          break;

        case 'getVendorList':
          // getVendorList: Restituisce la Global Vendor List completa
          // Include tutti i vendor IAB con i loro purpose, features, etc.
          callback(this.getVendorList(parameter), true);
          break;

        case 'addEventListener':
          // addEventListener: Registra un listener per cambiamenti consenso
          // Il listener viene chiamato ogni volta che i consensi cambiano
          this.addEventListener(callback);
          break;

        case 'removeEventListener':
          // removeEventListener: Rimuove un listener precedentemente registrato
          this.removeEventListener(parameter);
          break;

        default:
          // Comando non riconosciuto
          console.warn(`[TCF] Unknown command: ${command}`);
          callback(null, false);
      }
    };

    // Inizializza la coda per chiamate __tcfapi effettuate prima del caricamento
    // Gli script possono chiamare __tcfapi prima che la CMP sia pronta,
    // queste chiamate vengono messe in coda e processate dopo
    window.__tcfapi.a = window.__tcfapi.a || [];
  }

  /**
   * Ottiene i dati TC (Transparency & Consent)
   * 
   * Questo metodo costruisce l'oggetto TC Data che è il cuore del TCF.
   * Contiene tutte le informazioni sui consensi dell'utente in un formato
   * standardizzato che vendor e publisher possono leggere.
   * 
   * Struttura TC Data:
   * - tcString: La stringa codificata con tutti i consensi (formato IAB)
   * - purpose: Consensi per i 10 purpose standard (es. ads, analytics)
   * - vendor: Consensi specifici per ogni vendor
   * - specialFeatureOptins: Opt-in per feature speciali (es. geolocalizzazione)
   * - publisher: Dati specifici del publisher
   * - outOfBand: Consensi fuori banda (es. contratti diretti)
   * 
   * @param {Array<number>} vendorIds - IDs vendor opzionali per filtrare
   * @returns {Object} Oggetto TC Data completo secondo standard IAB TCF 2.2
   */
  getTCData(vendorIds) {
    return {
      // ===== TC String =====
      // La stringa codificata che rappresenta tutti i consensi
      tcString: this.tcString || '',
      
      // ===== Metadati CMP =====
      tcfPolicyVersion: this.policyVersion, // Versione policy TCF
      cmpId: this.cmpId,                    // ID della CMP
      cmpVersion: this.cmpVersion,          // Versione della CMP
      
      // ===== Stato GDPR =====
      gdprApplies: true,  // Il GDPR si applica sempre (EU)
      
      // ===== Stati UI/Consenso =====
      eventStatus: this.tcString ? 'tcloaded' : 'cmpuishown',
      // tcloaded: consenso già dato, TC String disponibile
      // cmpuishown: banner mostrato, consenso non ancora dato
      cmpStatus: 'loaded', // CMP caricata e pronta
      
      // ===== Listener e Service =====
      listenerId: null,          // ID del listener (per addEventListener)
      isServiceSpecific: false,  // Consenso specifico per questo servizio?
      useNonStandardTexts: false, // Usa testi non standard IAB?
      
      // ===== Publisher Info =====
      publisherCC: 'IT',         // Country code del publisher (IT = Italia)
      purposeOneTreatment: false, // Trattamento speciale per purpose 1?
      
      // ===== Out of Band =====
      // Consensi dati fuori dal sistema TCF (es. contratti diretti)
      outOfBand: {
        allowedVendors: {},    // Vendor con consenso OOB
        disclosedVendors: {}   // Vendor dichiarati OOB
      },
      
      // ===== Purpose Consents =====
      // Consensi per i 10 purpose standard IAB
      purpose: {
        consents: this.purposeConsents,        // Consenso esplicito
        legitimateInterests: {}                 // Legittimo interesse (non usato)
      },
      
      // ===== Vendor Consents =====
      // Consensi per singoli vendor dalla Global Vendor List
      vendor: {
        consents: vendorIds 
          ? this.filterVendorConsents(vendorIds)  // Filtrati se richiesto
          : this.vendorConsents,                   // Tutti se non specificato
        legitimateInterests: {}                    // Legittimo interesse (non usato)
      },
      
      // ===== Special Feature Opt-ins =====
      // Opt-in espliciti per feature speciali (es. geolocalizzazione)
      specialFeatureOptins: {},
      
      // ===== Publisher Restrictions =====
      // Configurazioni specifiche del publisher
      publisher: {
        consents: {},              // Consensi custom del publisher
        legitimateInterests: {},   // Legittimo interesse custom
        customPurpose: {           // Purpose personalizzati
          consents: {},
          legitimateInterests: {}
        },
        restrictions: {}           // Restrizioni imposte dal publisher
      }
    };
  }

  /**
   * Filtra i consensi vendor per IDs specifici
   * 
   * Quando un vendor chiama getTCData con una lista di IDs, vuole sapere
   * solo il consenso per quei vendor specifici, non per tutti.
   * 
   * @param {Array<number>} vendorIds - Array di vendor IDs da includere
   * @returns {Object} Oggetto con solo i consensi per i vendor richiesti
   */
  filterVendorConsents(vendorIds) {
    const filtered = {};
    vendorIds.forEach(id => {
      // Include solo i vendor richiesti che esistono nei nostri consensi
      if (this.vendorConsents[id] !== undefined) {
        filtered[id] = this.vendorConsents[id];
      }
    });
    return filtered;
  }

  /**
   * Ottiene la Global Vendor List (GVL)
   * 
   * La GVL è la lista ufficiale IAB di tutti i vendor registrati che operano
   * nell'ecosistema pubblicitario europeo. Include:
   * - Tutti i vendor registrati (Google, Facebook, centinaia di altri)
   * - I purpose che ogni vendor utilizza
   * - Le feature speciali richieste da ogni vendor
   * - I legittimi interessi dichiarati
   * 
   * Questa lista viene aggiornata regolarmente da IAB e deve essere
   * scaricata periodicamente per avere i vendor più recenti.
   * 
   * @param {number} _vendorListVersion - Versione opzionale (non usato, riservato)
   * @returns {Object} Global Vendor List completa formato IAB
   */
  getVendorList(_vendorListVersion) {
    return {
      // Versione della specifica GVL (attualmente 2)
      gvlSpecificationVersion: 2,
      
      // Versione numerica di questa lista (incrementa con aggiornamenti)
      vendorListVersion: this.vendorListVersion,
      
      // Versione della policy TCF (attualmente 2)
      tcfPolicyVersion: this.policyVersion,
      
      // Timestamp ultimo aggiornamento
      lastUpdated: new Date().toISOString(),
      
      // I 10 purpose standard IAB TCF 2.2
      purposes: this.getPurposesObject(),
      
      // Special purposes (non richiedono consenso esplicito)
      specialPurposes: this.getSpecialPurposesObject(),
      
      // Features standard (future use)
      features: {},
      
      // Special features (richiedono opt-in esplicito)
      specialFeatures: this.getSpecialFeaturesObject(),
      
      // Lista completa di tutti i vendor IAB registrati
      vendors: this.getVendorsObject()
    };
  }

  /**
   * Converte la Map dei purposes in un oggetto
   * @returns {Object} Purposes come oggetto {id: purposeData}
   */
  getPurposesObject() {
    const purposesObj = {};
    this.purposes.forEach((purpose, id) => {
      purposesObj[id] = purpose;
    });
    return purposesObj;
  }

  /**
   * Converte la Map degli special purposes in un oggetto
   * @returns {Object} Special purposes come oggetto
   */
  getSpecialPurposesObject() {
    const specialPurposesObj = {};
    this.specialPurposes.forEach((purpose, id) => {
      specialPurposesObj[id] = purpose;
    });
    return specialPurposesObj;
  }

  /**
   * Converte la Map delle special features in un oggetto
   * @returns {Object} Special features come oggetto
   */
  getSpecialFeaturesObject() {
    const specialFeaturesObj = {};
    this.specialFeatures.forEach((feature, id) => {
      specialFeaturesObj[id] = feature;
    });
    return specialFeaturesObj;
  }

  /**
   * Converte la Map dei vendors in un oggetto
   * @returns {Object} Vendors come oggetto {id: vendorData}
   */
  getVendorsObject() {
    const vendorsObj = {};
    this.vendors.forEach((vendor, id) => {
      vendorsObj[id] = vendor;
    });
    return vendorsObj;
  }

  /**
   * Registra un event listener per aggiornamenti dei consensi
   * 
   * I vendor/script possono registrare listener per essere notificati
   * quando i consensi cambiano. Utile per aggiornare in tempo reale
   * il comportamento degli script pubblicitari.
   * 
   * @param {Function} callback - Funzione da chiamare con i TC Data aggiornati
   * @returns {void}
   */
  addEventListener(callback) {
    // Chiama immediatamente il callback con i dati correnti
    // Questo è il comportamento richiesto dallo standard IAB
    callback(this.getTCData(), true);
  }

  /**
   * Rimuove un event listener precedentemente registrato
   * 
   * @param {number} listenerId - ID del listener da rimuovere
   * @returns {void}
   */
  removeEventListener(listenerId) {
    // Implementazione per rimuovere listener specifici
    // In una implementazione completa, si terrebbe traccia dei listener
    // in un array/map e si rimuoverebbe quello con questo ID
    console.log(`[TCF] Remove listener: ${listenerId}`);
  }

  /**
   * Carica la Global Vendor List ufficiale da IAB
   * 
   * Scarica la lista più recente di tutti i vendor IAB registrati dal
   * server ufficiale consensu.org. Questa lista contiene:
   * - Centinaia di vendor (Google, Facebook, Amazon, centinaia di AdTech)
   * - I purpose che ogni vendor dichiara di utilizzare
   * - Le policy privacy di ogni vendor
   * - Le feature speciali richieste
   * 
   * La lista viene aggiornata regolarmente da IAB quando:
   * - Nuovi vendor si registrano
   * - Vendor esistenti aggiornano i loro purpose
   * - Vendor vengono rimossi
   * 
   * @returns {Promise<void>}
   */
  async loadVendorList() {
    try {
      // Scarica la GVL ufficiale dal server IAB
      // https://vendor-list.consensu.org è l'endpoint ufficiale IAB
      const response = await fetch('https://vendor-list.consensu.org/v2/vendor-list.json');
      const data = await response.json();
      
      // Salva la versione della lista (si incrementa ad ogni aggiornamento)
      this.vendorListVersion = data.vendorListVersion || 0;
      
      // Popola la Map dei vendor
      // Ogni vendor ha: id, name, purposes, specialPurposes, features,
      // specialFeatures, policyUrl, deletedDate, overflow, etc.
      if (data.vendors) {
        Object.entries(data.vendors).forEach(([id, vendor]) => {
          this.vendors.set(parseInt(id), vendor);
        });
      }

      console.log(`[TCF] Loaded ${this.vendors.size} vendors from IAB GVL v${this.vendorListVersion}`);
    } catch (error) {
      // Se il caricamento fallisce (es. offline, CORS, server down),
      // continua con una lista vuota. In produzione potrebbe essere
      // utile caricare una GVL cached locale come fallback.
      console.error('[TCF] Failed to load vendor list:', error);
      this.vendors = new Map();
      this.vendorListVersion = 0;
    }
  }

  /**
   * Carica i 10 Purpose standard IAB TCF 2.2
   * 
   * Il TCF definisce 10 "purpose" standard che descrivono tutti i possibili
   * utilizzi dei dati personali nell'ecosistema pubblicitario digitale.
   * Ogni vendor dichiara quali purpose utilizza, e l'utente può consentire
   * o rifiutare ogni singolo purpose.
   * 
   * I 10 Purpose Standard IAB TCF 2.2:
   * 1. Store and/or access information (archiviare info sul device)
   * 2. Select basic ads (mostrare pubblicità base)
   * 3. Create ads profile (creare profilo pubblicitario)
   * 4. Select personalized ads (mostrare ads personalizzate)
   * 5. Create content profile (creare profilo contenuti)
   * 6. Select personalized content (mostrare contenuti personalizzati)
   * 7. Measure ad performance (misurare performance ads)
   * 8. Measure content performance (misurare performance contenuti)
   * 9. Apply market research (ricerca di mercato)
   * 10. Develop and improve products (sviluppare e migliorare prodotti)
   * 
   * Oltre ai purpose standard, definisce anche 2 Special Features:
   * - Precise geolocation (geolocalizzazione precisa)
   * - Device characteristics scanning (scansione caratteristiche device)
   * 
   * Queste feature richiedono un opt-in esplicito separato.
   * 
   * @returns {void}
   */
  loadPurposes() {
    // ===== PURPOSES STANDARD IAB TCF 2.2 =====
    
    // PURPOSE 1: Store and/or access information on a device
    // Il purpose più basilare - permette di salvare/leggere cookie e storage
    // Quasi tutti i vendor richiedono questo purpose
    this.purposes.set(1, {
      id: 1,
      name: 'Store and/or access information on a device',
      description: 'Cookies, device identifiers, or other information can be stored or accessed on your device for the purposes presented to you.',
      descriptionLegal: 'Vendors can: Store and access information on the device such as cookies and device identifiers presented to a user.'
    });
    
    // PURPOSE 2: Select basic ads
    // Mostrare pubblicità base senza personalizzazione
    // Non usa dati personali o profili utente
    this.purposes.set(2, {
      id: 2,
      name: 'Select basic ads',
      description: 'Ads can be shown to you based on the content you\'re viewing, the app you\'re using, your approximate location, or your device type.',
      descriptionLegal: 'To do basic ad selection vendors can: Use real-time information about the context in which the ad will be shown.'
    });
    
    // PURPOSE 3: Create a personalized ads profile
    // Costruire un profilo dell'utente per personalizzare le ads
    // Traccia interessi, comportamenti, demografici dell'utente
    this.purposes.set(3, {
      id: 3,
      name: 'Create a personalized ads profile',
      description: 'A profile can be built about you and your interests to show you personalized ads that are relevant to you.',
      descriptionLegal: 'To create a personalized ads profile vendors can: Collect information about a user, including a user\'s activity, interests, demographic information, or location.'
    });
    
    // PURPOSE 4: Select personalized ads
    // Usare il profilo creato per mostrare ads personalizzate
    // Richiede prima il Purpose 3 per creare il profilo
    this.purposes.set(4, {
      id: 4,
      name: 'Select personalized ads',
      description: 'Personalized ads can be shown to you based on a profile about you.',
      descriptionLegal: 'To select personalized ads vendors can: Select personalized ads based on a profile or other historical user data.'
    });
    
    // PURPOSE 5: Create a personalized content profile
    // Simile al Purpose 3 ma per contenuti invece di ads
    // Profila l'utente per personalizzare articoli, video, etc.
    this.purposes.set(5, {
      id: 5,
      name: 'Create a personalized content profile',
      description: 'A profile can be built about you and your interests to show you personalized content that is relevant to you.',
      descriptionLegal: 'To create a personalized content profile vendors can: Collect information about a user, including a user\'s activity, interests, demographic information, or location.'
    });
    
    // PURPOSE 6: Select personalized content
    // Usare il profilo per mostrare contenuti personalizzati
    // Richiede prima il Purpose 5 per creare il profilo
    this.purposes.set(6, {
      id: 6,
      name: 'Select personalized content',
      description: 'Personalized content can be shown to you based on a profile about you.',
      descriptionLegal: 'To select personalized content vendors can: Select personalized content based on a profile or other historical user data.'
    });
    
    // PURPOSE 7: Measure ad performance
    // Analytics per le pubblicità - misurare click, impression, conversioni
    // Fondamentale per ROI e ottimizzazione campagne
    this.purposes.set(7, {
      id: 7,
      name: 'Measure ad performance',
      description: 'The performance and effectiveness of ads that you see or interact with can be measured.',
      descriptionLegal: 'To measure ad performance vendors can: Measure whether and how ads were delivered to and interacted with by a user.'
    });
    
    // PURPOSE 8: Measure content performance
    // Analytics per contenuti - misurare visualizzazioni, engagement, etc.
    // Simile al Purpose 7 ma per contenuti organici
    this.purposes.set(8, {
      id: 8,
      name: 'Measure content performance',
      description: 'The performance and effectiveness of content that you see or interact with can be measured.',
      descriptionLegal: 'To measure content performance vendors can: Measure whether and how content was delivered to and interacted with by a user.'
    });
    
    // PURPOSE 9: Apply market research to generate audience insights
    // Ricerca di mercato e analisi dell'audience
    // Report aggregati su demografia, interessi, comportamenti
    this.purposes.set(9, {
      id: 9,
      name: 'Apply market research to generate audience insights',
      description: 'Market research can be used to learn more about the audiences who visit sites/apps and view ads.',
      descriptionLegal: 'To apply market research to generate audience insights vendors can: Provide aggregate reporting to advertisers or their representatives about the audiences reached by their ads.'
    });
    
    // PURPOSE 10: Develop and improve products
    // Usare dati per migliorare prodotti e servizi
    // Include A/B testing, debugging, feature development
    this.purposes.set(10, {
      id: 10,
      name: 'Develop and improve products',
      description: 'Your data can be used to improve existing systems and software, and to develop new products.',
      descriptionLegal: 'To develop new products and improve products vendors can: Use information to improve their existing products with new features and to develop new products.'
    });

    // ===== SPECIAL FEATURES IAB TCF 2.2 =====
    // Le Special Features richiedono un opt-in esplicito separato
    // Non possono essere abilitate automaticamente
    
    // SPECIAL FEATURE 1: Use precise geolocation data
    // Geolocalizzazione precisa (GPS) - molto sensibile per privacy
    // Richiede consenso esplicito separato dai purpose standard
    this.specialFeatures.set(1, {
      id: 1,
      name: 'Use precise geolocation data',
      description: 'Your precise geolocation data can be used in support of one or more purposes.'
    });
    
    // SPECIAL FEATURE 2: Actively scan device characteristics
    // Fingerprinting del device - identificazione tramite caratteristiche hardware
    // Considerato invasivo, richiede consenso esplicito
    this.specialFeatures.set(2, {
      id: 2,
      name: 'Actively scan device characteristics for identification',
      description: 'Your device can be identified based on a scan of your device\'s unique combination of characteristics.'
    });

    console.log(`[TCF] Loaded ${this.purposes.size} purposes and ${this.specialFeatures.size} special features`);
  }

  /**
   * Aggiorna i consensi TCF dalle categorie CMP
   * 
   * Questo metodo è il ponte tra il nostro sistema di categorie semplificato
   * (necessary, analytics, marketing, preferences) e il sistema TCF con i
   * suoi 10 purpose standard.
   * 
   * Mappatura Categorie CMP → Purpose TCF:
   * - necessary → Purpose 1 (Store and access information)
   * - marketing → Purpose 2, 3, 4 (Ads base e personalizzate)
   * - preferences → Purpose 5, 6 (Content personalizzato)
   * - analytics → Purpose 7, 8, 9, 10 (Misurazione e miglioramenti)
   * 
   * Dopo aver aggiornato i consensi:
   * 1. Genera una nuova TC String codificata
   * 2. Notifica tutti i listener registrati
   * 3. I vendor possono leggere i nuovi consensi via __tcfapi
   * 
   * @param {ConsentCategories} categories - Categorie di consenso CMP
   * @returns {void}
   */
  updateConsent(categories) {
    // ===== MAPPATURA CATEGORIE → PURPOSES =====
    // Mappa le 4 categorie semplici della CMP ai 10 purpose dettagliati TCF
    this.purposeConsents = {
      // Purpose 1: Storage - sempre legato a "necessary"
      1: categories.necessary,
      
      // Purpose 2-4: Pubblicità - tutti legati a "marketing"
      2: categories.marketing,  // Basic ads (senza profiling)
      3: categories.marketing,  // Create ads profile (profiling utente)
      4: categories.marketing,  // Select personalized ads (usa il profilo)
      
      // Purpose 5-6: Contenuti personalizzati - legati a "preferences"
      5: categories.preferences, // Create content profile
      6: categories.preferences, // Select personalized content
      
      // Purpose 7-10: Analytics e miglioramenti - legati a "analytics"
      7: categories.analytics,  // Measure ad performance
      8: categories.analytics,  // Measure content performance
      9: categories.analytics,  // Market research & audience insights
      10: categories.analytics  // Product development & improvement
    };

    // ===== VENDOR CONSENTS =====
    // Imposta il consenso per tutti i vendor in base al consenso marketing
    // In un sistema di produzione più sofisticato, ogni vendor potrebbe
    // avere un consenso individuale e granulare per ogni purpose
    const hasMarketingConsent = categories.marketing;
    this.vendors.forEach((vendor, id) => {
      // Per semplicità, tutti i vendor seguono il consenso marketing
      // In produzione: controllare i purpose specifici di ogni vendor
      this.vendorConsents[id] = hasMarketingConsent;
    });

    // ===== TC STRING GENERATION =====
    // Genera la TC String che codifica tutti i consensi in formato IAB
    // Questa stringa viene poi letta dai vendor per determinare se possono
    // eseguire le loro operazioni (ads, analytics, etc.)
    this.tcString = this.generateTCString();
    
    // ===== NOTIFICA LISTENERS =====
    // Informa tutti i listener (vendor/script) che i consensi sono cambiati
    // I listener registrati tramite addEventListener riceveranno i nuovi dati
    this.notifyListeners();
    
    console.log('[TCF] Consent updated, TC String:', this.tcString);
  }

  /**
   * Genera la TC String (Transparency & Consent String)
   * 
   * La TC String è una stringa codificata in base64url che contiene tutti
   * i consensi dell'utente in un formato compatto e standardizzato.
   * 
   * Formato TC String v2 (semplificato):
   * - Versione TCF (2)
   * - Timestamp creazione e aggiornamento (in deciseconds)
   * - CMP ID e versione
   * - Consent screen, lingua
   * - Vendor list version
   * - Consensi per tutti i purpose (bitmap)
   * - Consensi per tutti i vendor (bitmap)
   * - Feature opt-ins (bitmap)
   * - Publisher restrictions
   * 
   * NOTA IMPORTANTE: Questa è un'implementazione SEMPLIFICATA per demo.
   * 
   * In produzione, per la piena conformità TCF 2.2, è OBBLIGATORIO usare
   * una libreria certificata IAB per codificare/decodificare le TC String,
   * come ad esempio:
   * - @iabtcf/core (libreria ufficiale IAB)
   * - @iabtcf/cmpapi (CMP API ufficiale)
   * 
   * La specifica completa è molto più complessa e include:
   * - Encoding binario preciso secondo specifica IAB
   * - Gestione vendor ranges (per liste molto grandi)
   * - Publisher restrictions granulari
   * - Disclosed vendors e allowed vendors
   * - Special feature opt-ins
   * 
   * @returns {string} TC String (versione semplificata, non conforme TCF)
   */
  generateTCString() {
    // IMPLEMENTAZIONE SEMPLIFICATA - NON USARE IN PRODUZIONE
    // Una vera TC String è una sequenza binaria codificata secondo
    // la specifica IAB TCF 2.2, con bit precisi per ogni campo
    
    const version = 2;  // TCF versione 2
    const created = Math.floor(Date.now() / 100); // Timestamp in deciseconds
    
    // Note: questi campi sarebbero codificati come bit nella TC String reale
    const _updated = created;                // Timestamp ultimo aggiornamento (riservato)
    const cmpId = this.cmpId;               // ID CMP
    const cmpVersion = this.cmpVersion;     // Versione CMP
    const _consentScreen = this.consentScreen; // Screen ID (riservato)
    const consentLanguage = this.consentLanguage; // Lingua (ISO 639-1)
    const vendorListVersion = this.vendorListVersion; // Versione GVL
    
    // Crea un identificatore semplificato (NON è una vera TC String!)
    // Una vera TC String inizia con "CP" seguito da caratteri base64url
    // che rappresentano dati binari precisi
    const tcString = `CP${version}${cmpId}${cmpVersion}_${consentLanguage}${vendorListVersion}`;
    
    // Codifica in base64url (sostituisce caratteri non URL-safe)
    // base64: +/ → base64url: -_
    return btoa(tcString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Notifica i listener dei cambiamenti nei consensi
   * 
   * Quando i consensi cambiano (es. utente accetta/rifiuta categorie),
   * tutti i listener registrati devono essere notificati per poter
   * aggiornare il loro comportamento in tempo reale.
   * 
   * Dispatcha un CustomEvent 'tcfapi-update' con i nuovi TC Data.
   * I vendor/script possono ascoltare questo evento o usare addEventListener
   * dell'API __tcfapi per ricevere notifiche.
   * 
   * @returns {void}
   */
  notifyListeners() {
    // Dispatch un evento custom per notificare cambiamenti consensi
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tcfapi-update', {
        detail: this.getTCData()  // Invia i TC Data completi aggiornati
      }));
    }
  }

  /**
   * Ottiene la TC String corrente
   * 
   * Metodo di convenienza per ottenere la TC String senza chiamare getTCData()
   * che restituisce l'intero oggetto.
   * 
   * @returns {string | null} TC String o null se non ancora generata
   */
  getTCString() {
    return this.tcString;
  }
}

// ============================================================================
// COOKIE SCANNER
// ============================================================================

/**
 * @typedef {Object} DetectedCookie
 * @property {string} name - Cookie name
 * @property {string} value - Cookie value
 * @property {string} domain - Cookie domain
 * @property {string} path - Cookie path
 * @property {boolean} secure - Whether cookie is secure
 * @property {boolean} httpOnly - Whether cookie is HTTP only
 * @property {string} sameSite - SameSite attribute
 * @property {number | null} expires - Expiration timestamp
 * @property {boolean} isFirstParty - Whether cookie is first-party
 * @property {string} category - Detected category (necessary, analytics, marketing, preferences)
 * @property {number} detectedAt - Timestamp when detected
 */

class CookieScanner {
  constructor() {
    /** @type {Map<string, DetectedCookie>} */
    this.detectedCookies = new Map();
    /** @type {number | null} */
    this.scanIntervalId = null;
    /** @type {number} */
    this.scanInterval = 2000; // Scan every 2 seconds
    /** @type {Object.<string, string>} */
    this.cookiePatterns = this.initializeCookiePatterns();
    /** @type {string | null} */
    this.currentDomain = typeof window !== 'undefined' ? window.location.hostname : null;
  }

  /**
   * Initialize cookie pattern mappings for automatic categorization
   * @returns {Object.<string, string>} Pattern to category mappings
   */
  initializeCookiePatterns() {
    return {
      // Analytics cookies
      '_ga': 'analytics',
      '_gid': 'analytics',
      '_gat': 'analytics',
      '_gat_gtag': 'analytics',
      '_gac': 'analytics',
      '__utma': 'analytics',
      '__utmb': 'analytics',
      '__utmc': 'analytics',
      '__utmt': 'analytics',
      '__utmz': 'analytics',
      '_hjid': 'analytics',
      '_hjIncludedInPageviewSample': 'analytics',
      '_hjAbsoluteSessionInProgress': 'analytics',
      '_clck': 'analytics', // Microsoft Clarity
      '_clsk': 'analytics',
      'CLID': 'analytics',
      
      // Marketing/Advertising cookies
      '_fbp': 'marketing',
      '_fbc': 'marketing',
      'fr': 'marketing', // Facebook
      'tr': 'marketing',
      '_gcl_au': 'marketing', // Google AdSense
      '_gcl_aw': 'marketing',
      '_gcl_dc': 'marketing',
      'IDE': 'marketing', // Google DoubleClick
      'DSID': 'marketing',
      'test_cookie': 'marketing',
      '__Secure-3PAPISID': 'marketing',
      '__Secure-3PSID': 'marketing',
      'NID': 'marketing',
      '_ttp': 'marketing', // TikTok
      '_ttp_pixel': 'marketing',
      '__ttd': 'marketing',
      'YSC': 'marketing', // YouTube
      'VISITOR_INFO1_LIVE': 'marketing',
      
      // Preference cookies
      'lang': 'preferences',
      'language': 'preferences',
      'i18n': 'preferences',
      'locale': 'preferences',
      'theme': 'preferences',
      'timezone': 'preferences',
      'currency': 'preferences',
      
      // Necessary cookies (authentication, session, security)
      'PHPSESSID': 'necessary',
      'JSESSIONID': 'necessary',
      'ASPSESSIONID': 'necessary',
      'session': 'necessary',
      'csrf': 'necessary',
      'XSRF-TOKEN': 'necessary',
      '__cfduid': 'necessary', // Cloudflare
      '__cf_bm': 'necessary',
      'rs-cmp-consent': 'necessary' // Our own consent cookie
    };
  }

  /**
   * Categorize a cookie based on its name
   * @param {string} cookieName - Cookie name
   * @returns {string} Category (necessary, analytics, marketing, preferences)
   */
  categorizeCookie(cookieName) {
    // Check exact matches first
    if (this.cookiePatterns[cookieName]) {
      return this.cookiePatterns[cookieName];
    }
    
    // Check pattern matches (for cookies with dynamic suffixes)
    for (const [pattern, category] of Object.entries(this.cookiePatterns)) {
      if (cookieName.startsWith(pattern)) {
        return category;
      }
    }
    
    // Default to preferences for unknown cookies
    return 'preferences';
  }

  /**
   * Check if cookie is first-party or third-party
   * @param {string} cookieDomain - Cookie domain
   * @returns {boolean} True if first-party
   */
  isFirstPartyCookie(cookieDomain) {
    if (!this.currentDomain || !cookieDomain) {
      return true; // Assume first-party if can't determine
    }
    
    // Remove leading dot from domain
    const cleanDomain = cookieDomain.startsWith('.') ? cookieDomain.substring(1) : cookieDomain;
    const currentDomain = this.currentDomain;
    
    // Check if domains match or cookie domain is a parent domain
    return currentDomain === cleanDomain || currentDomain.endsWith('.' + cleanDomain) || cleanDomain.endsWith('.' + currentDomain);
  }

  /**
   * Parse cookies from document.cookie
   * @returns {DetectedCookie[]} Array of detected cookies
   */
  scanCookies() {
    if (typeof document === 'undefined') {
      return [];
    }
    
    const cookies = [];
    const cookieStrings = document.cookie.split(';');
    
    for (const cookieString of cookieStrings) {
      const trimmed = cookieString.trim();
      if (!trimmed) continue;
      
      const [name, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('='); // Handle values with = in them
      
      if (!name) continue;
      
      // Try to get additional cookie info (limited in client-side JS)
      const category = this.categorizeCookie(name);
      const isFirstParty = this.isFirstPartyCookie(this.currentDomain);
      
      const detectedCookie = {
        name: name,
        value: value,
        domain: this.currentDomain || '',
        path: '/', // Can't easily detect from JS
        secure: false, // Can't detect from JS
        httpOnly: false, // Can't detect from JS (by definition)
        sameSite: 'Lax',
        expires: null,
        isFirstParty: isFirstParty,
        category: category,
        detectedAt: Date.now()
      };
      
      cookies.push(detectedCookie);
    }
    
    return cookies;
  }

  /**
   * Start continuous cookie monitoring
   * @param {Function} [onNewCookie] - Callback when new cookie is detected
   * @returns {void}
   */
  startMonitoring(onNewCookie) {
    if (this.scanIntervalId) {
      return; // Already monitoring
    }
    
    console.log('[CookieScanner] Starting continuous monitoring...');
    
    // Initial scan
    this.performScan(onNewCookie);
    
    // Set up periodic scanning
    this.scanIntervalId = setInterval(() => {
      this.performScan(onNewCookie);
    }, this.scanInterval);
  }

  /**
   * Perform a single scan
   * @param {Function} [onNewCookie] - Callback when new cookie is detected
   * @returns {void}
   */
  performScan(onNewCookie) {
    const currentCookies = this.scanCookies();
    
    for (const cookie of currentCookies) {
      const existingCookie = this.detectedCookies.get(cookie.name);
      
      if (!existingCookie) {
        // New cookie detected
        this.detectedCookies.set(cookie.name, cookie);
        console.log(`[CookieScanner] New cookie detected: ${cookie.name} (${cookie.category})`);
        
        if (onNewCookie && typeof onNewCookie === 'function') {
          onNewCookie(cookie);
        }
      } else if (existingCookie.value !== cookie.value) {
        // Cookie value changed
        this.detectedCookies.set(cookie.name, cookie);
        console.log(`[CookieScanner] Cookie updated: ${cookie.name}`);
      }
    }
  }

  /**
   * Stop cookie monitoring
   * @returns {void}
   */
  stopMonitoring() {
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
      console.log('[CookieScanner] Monitoring stopped');
    }
  }

  /**
   * Get all detected cookies
   * @returns {DetectedCookie[]} Array of all detected cookies
   */
  getAllCookies() {
    return Array.from(this.detectedCookies.values());
  }

  /**
   * Get cookies by category
   * @param {string} category - Category to filter by
   * @returns {DetectedCookie[]} Filtered cookies
   */
  getCookiesByCategory(category) {
    return this.getAllCookies().filter(cookie => cookie.category === category);
  }

  /**
   * Get cookie report for backend
   * @returns {Object} Cookie report
   */
  getCookieReport() {
    const cookies = this.getAllCookies();
    const report = {
      timestamp: new Date().toISOString(),
      domain: this.currentDomain,
      totalCookies: cookies.length,
      firstPartyCookies: cookies.filter(c => c.isFirstParty).length,
      thirdPartyCookies: cookies.filter(c => !c.isFirstParty).length,
      categories: {
        necessary: this.getCookiesByCategory('necessary').length,
        analytics: this.getCookiesByCategory('analytics').length,
        marketing: this.getCookiesByCategory('marketing').length,
        preferences: this.getCookiesByCategory('preferences').length
      },
      cookies: cookies.map(cookie => ({
        name: cookie.name,
        domain: cookie.domain,
        category: cookie.category,
        isFirstParty: cookie.isFirstParty,
        detectedAt: cookie.detectedAt
      }))
    };
    
    return report;
  }

  /**
   * Send cookie report to backend
   * @param {string} apiUrl - Backend API URL
   * @param {string} siteId - Site identifier
   * @returns {Promise<void>}
   */
  async sendReportToBackend(apiUrl, siteId) {
    try {
      const report = this.getCookieReport();
      
      await fetch(`${apiUrl}/v1/cookies/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId: siteId,
          ...report
        }),
      });
      
      console.log('[CookieScanner] Report sent to backend');
    } catch (error) {
      console.error('[CookieScanner] Failed to send report:', error);
    }
  }

  /**
   * Clear all detected cookies
   * @returns {void}
   */
  clear() {
    this.detectedCookies.clear();
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
    /** @type {CookieScanner} */
    this.cookieScanner = new CookieScanner();
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
      
      // Start cookie scanner monitoring
      this.cookieScanner.startMonitoring((cookie) => {
        this.handleNewCookie(cookie);
      });
      
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
   * Handle new cookie detection
   * @param {DetectedCookie} cookie - Newly detected cookie
   * @returns {void}
   */
  handleNewCookie(cookie) {
    this.log('New cookie detected:', cookie.name, 'Category:', cookie.category);
    
    // Optionally send report to backend when new cookies are detected
    // Only send every 10 seconds to avoid flooding the backend
    if (this.siteId && this.config) {
      const now = Date.now();
      if (!this._lastCookieReport || (now - this._lastCookieReport) > 10000) {
        this._lastCookieReport = now;
        this.sendCookieReportToBackend();
      }
    }
  }

  /**
   * Get cookie scanner report
   * @returns {Object} Cookie report
   */
  getCookieReport() {
    return this.cookieScanner.getCookieReport();
  }

  /**
   * Get all detected cookies
   * @returns {DetectedCookie[]} Array of detected cookies
   */
  getDetectedCookies() {
    return this.cookieScanner.getAllCookies();
  }

  /**
   * Send cookie report to backend
   * @returns {Promise<void>}
   */
  async sendCookieReportToBackend() {
    if (!this.siteId || !this.config) {
      return;
    }
    
    try {
      const apiUrl = this.getApiUrl();
      await this.cookieScanner.sendReportToBackend(apiUrl, this.siteId);
    } catch (error) {
      console.error('[RS-CMP] Failed to send cookie report:', error);
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
      bannerVisible: !!this.bannerUI.bannerElement,
      detectedCookies: this.cookieScanner.getAllCookies().length,
      cookieCategories: {
        necessary: this.cookieScanner.getCookiesByCategory('necessary').length,
        analytics: this.cookieScanner.getCookiesByCategory('analytics').length,
        marketing: this.cookieScanner.getCookiesByCategory('marketing').length,
        preferences: this.cookieScanner.getCookiesByCategory('preferences').length
      }
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
let cmpInstance = null;

if (typeof window !== 'undefined') {
  cmpInstance = new RSCMP();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => cmpInstance.init().catch(err => {
      console.error('[RS-CMP] Auto-initialization failed:', err);
    }));
  } else {
    cmpInstance.init().catch(err => {
      console.error('[RS-CMP] Auto-initialization failed:', err);
    });
  }

  // Expose to window for manual control
  window.RSCMP = cmpInstance;
}

// Export for module systems
// In browser (IIFE), export the instance; in Node, export the class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = cmpInstance || RSCMP;
}
