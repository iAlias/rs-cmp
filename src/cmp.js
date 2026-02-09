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
 * @property {string} [privacyPolicyUrl] - Optional privacy policy URL
 * @property {string} [cookiePolicyUrl] - Optional cookie policy URL
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
 * @property {string} [privacyPolicy] - Privacy policy link text
 * @property {string} [cookiePolicy] - Cookie policy link text
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

/**
 * Get CSP nonce for dynamically created elements
 * @returns {string | null} Nonce value or null
 */
function getNonce() {
  // Try to get nonce from script tag
  const scriptWithNonce = document.querySelector('script[nonce]');
  if (scriptWithNonce && scriptWithNonce.nonce) {
    return scriptWithNonce.nonce;
  }
  
  // Try to get nonce from meta tag
  const metaWithNonce = document.querySelector('meta[property="csp-nonce"]');
  if (metaWithNonce) {
    return metaWithNonce.getAttribute('content');
  }
  
  return null;
}

class ConsentStorage {
  /**
   * Save consent to localStorage and cookie
   * @param {ConsentData} consent - Consent data to save
   * @returns {void}
   */
  saveConsent(consent) {
    const consentString = JSON.stringify(consent);

    // Save full state to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, consentString);
    } catch (error) {
      console.warn('[RS-CMP] Failed to save to localStorage:', error);
    }

    // Save minimal cookie (just "1" to indicate consent exists)
    // Full state is stored only in localStorage
    this.setCookie(COOKIE_NAME, '1', COOKIE_MAX_AGE);
  }

  /**
   * Get consent from localStorage or cookie
   * @returns {ConsentData | null} Stored consent data or null
   */
  getConsent() {
    // Try localStorage first (has full state)
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        
        // Check if consent has expired (12 months = 365 days)
        const consentDate = new Date(data.timestamp);
        const daysSinceConsent = (Date.now() - consentDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceConsent > 365) {
          console.log('[RS-CMP] Consent expired (> 12 months), clearing...');
          this.clearConsent();
          return null;
        }
        
        return data;
      }
    } catch (error) {
      console.warn('[RS-CMP] Failed to read from localStorage:', error);
    }

    // Cookie only indicates consent exists (minimal: "1")
    // If localStorage is not available, we can't get the full consent state
    const cookieValue = this.getCookie(COOKIE_NAME);
    if (cookieValue === '1') {
      console.warn('[RS-CMP] Cookie found but localStorage unavailable - cannot retrieve full consent state');
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
    /** @type {MutationObserver | null} */
    this.scriptObserver = null;
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
    
    // Start observing DOM for dynamically added scripts (for SPAs)
    this.startScriptObserver();
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
        
        // Copy all attributes, preserving critical security and module attributes
        Array.from(script.attributes).forEach((attr) => {
          if (attr.name === 'type') {
            // Use original type instead of blocked type
            newScript.setAttribute('type', originalType);
          } else if (attr.name === 'data-original-type') {
            // Skip internal attribute
          } else {
            // Copy all other attributes including:
            // - nomodule
            // - nonce (CSP)
            // - integrity (SRI)
            // - crossorigin (CORS)
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

  /**
   * Start observing DOM for dynamically added scripts (for SPAs)
   * @private
   * @returns {void}
   */
  startScriptObserver() {
    // Check if MutationObserver is available
    if (typeof MutationObserver === 'undefined') {
      console.warn('[RS-CMP] MutationObserver not available, dynamic script blocking disabled');
      return;
    }

    // Don't create multiple observers
    if (this.scriptObserver) {
      return;
    }

    this.scriptObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Check for added nodes
        mutation.addedNodes.forEach((node) => {
          // Only process script elements
          if (node.nodeName === 'SCRIPT') {
            this.processNewScript(node);
          }
          // Also check children in case a container with scripts was added
          if (node.querySelectorAll) {
            const scripts = node.querySelectorAll('script');
            scripts.forEach((script) => this.processNewScript(script));
          }
        });
      });
    });

    // Start observing the document for script additions
    this.scriptObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    console.log('[RS-CMP] Script observer started for dynamic script blocking');
  }

  /**
   * Process a newly added script element
   * @private
   * @param {HTMLScriptElement} script - Script element to process
   * @returns {void}
   */
  processNewScript(script) {
    // Skip if already processed
    if (script.getAttribute('data-rs-cmp-processed')) {
      return;
    }

    // Mark as processed
    script.setAttribute('data-rs-cmp-processed', 'true');

    // Check if script has data-category
    let category = script.getAttribute('data-category');

    // If no category, try to detect it
    if (!category) {
      const src = script.src || '';
      const content = script.textContent || '';
      category = this.detectCategory(src + ' ' + content);
    }

    // Block if it's a trackable category and user hasn't consented
    if (category && category !== 'necessary') {
      const consent = this.consentManager.getConsent();
      
      // If no consent yet or consent not given for this category, block it
      if (!consent || !consent[category]) {
        script.setAttribute('data-category', category);
        script.setAttribute('data-original-type', script.type || 'text/javascript');
        script.type = 'text/plain';
        this.blockedScripts.push(script);
        console.log(`[RS-CMP] Blocked dynamically added ${category} script`);
      }
    }
  }

  /**
   * Stop observing DOM for script changes
   * @private
   * @returns {void}
   */
  stopScriptObserver() {
    if (this.scriptObserver) {
      this.scriptObserver.disconnect();
      this.scriptObserver = null;
      console.log('[RS-CMP] Script observer stopped');
    }
  }

  /**
   * Get blocked scripts by category
   * @param {string} categoryId - Category ID (necessary, analytics, marketing, preferences)
   * @returns {Array<HTMLScriptElement>} Array of blocked script elements
   */
  getBlockedScriptsByCategory(categoryId) {
    if (!this.blockedScripts || this.blockedScripts.length === 0) {
      return [];
    }
    
    return this.blockedScripts.filter(script => {
      const scriptCategory = script.getAttribute('data-category');
      return scriptCategory === categoryId;
    });
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
// BANNER UI
// ============================================================================

class BannerUI {
  /**
   * @param {ConsentManager} consentManager - Consent manager instance
   * @param {ScriptBlocker} scriptBlocker - Script blocker instance
   */
  constructor(consentManager, scriptBlocker) {
    /** @type {ConsentManager} */
    this.consentManager = consentManager;
    /** @type {ScriptBlocker} */
    this.scriptBlocker = scriptBlocker;
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
    const policyLinks = this.createPolicyLinks(config, translations);
    banner.innerHTML = `
      <div class="rs-cmp-content">
        ${config.banner.showLogo && config.banner.logoUrl ? `<img src="${config.banner.logoUrl}" alt="Logo" class="rs-cmp-logo" />` : ''}
        <h2 class="rs-cmp-title">${this.escapeHtml(translations.title)}</h2>
        <p class="rs-cmp-description">
          ${this.escapeHtml(translations.description)}
          ${policyLinks}
        </p>
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
   * Create policy links HTML
   * @private
   * @param {Config} config - CMP configuration
   * @param {Translations} translations - Translations
   * @returns {string} Policy links HTML
   */
  createPolicyLinks(config, translations) {
    const links = [];
    
    if (config.banner.privacyPolicyUrl && translations.privacyPolicy) {
      links.push(`<a href="${this.escapeHtml(config.banner.privacyPolicyUrl)}" class="rs-cmp-policy-link" target="_blank" rel="noopener noreferrer">${this.escapeHtml(translations.privacyPolicy)}</a>`);
    }
    
    if (config.banner.cookiePolicyUrl && translations.cookiePolicy) {
      links.push(`<a href="${this.escapeHtml(config.banner.cookiePolicyUrl)}" class="rs-cmp-policy-link" target="_blank" rel="noopener noreferrer">${this.escapeHtml(translations.cookiePolicy)}</a>`);
    }
    
    if (links.length === 0) {
      return '';
    }
    
    // Return links with proper spacing
    return '<br><span class="rs-cmp-policy-links">' + links.join(' | ') + '</span>';
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
        
        .rs-cmp-policy-links {
          display: inline-block;
          margin-top: 8px;
          font-size: 12px;
        }
        
        .rs-cmp-policy-link {
          color: ${primaryColor};
          text-decoration: underline;
          font-weight: 500;
          transition: opacity 0.2s ease;
        }
        
        .rs-cmp-policy-link:hover {
          opacity: 0.8;
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
      
      // Apply CSP nonce if available
      const nonce = getNonce();
      if (nonce) {
        style.setAttribute('nonce', nonce);
      }
      
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

    const primaryColor = this.config.banner.primaryColor || '#0084ff';
    const buttonTextColor = this.config.banner.buttonTextColor || '#ffffff';

    // Get current consent to populate checkboxes
    const currentConsent = this.consentManager.getConsent();

    const modal = document.createElement('div');
    modal.id = 'rs-cmp-customize-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', translations.customizeTitle || translations.customize);
    
    const cookiePolicyUrl = this.config.banner.cookiePolicyUrl || '';

    modal.innerHTML = `
      <div class="rs-cmp-modal-overlay"></div>
      <div class="rs-cmp-modal-content">
        <h2>${this.escapeHtml(translations.customizeTitle || translations.customize)}</h2>
        ${translations.customizeSubtitle ? `<p class="rs-cmp-modal-subtitle">${this.escapeHtml(translations.customizeSubtitle)}</p>` : ''}
        ${translations.customizeIntro ? `<h3 class="rs-cmp-modal-intro-title">${this.escapeHtml(translations.customizeIntro)}</h3>` : ''}
        ${translations.customizeDescription ? `<p class="rs-cmp-modal-intro-desc">${this.escapeHtml(translations.customizeDescription)}</p>` : ''}
        <div class="rs-cmp-categories">
          ${this.config.categories.map((cat) => {
            // Determine if checkbox should be checked based on saved consent
            const isChecked = cat.required || (currentConsent && currentConsent[cat.id]) || false;
            return `
            <div class="rs-cmp-category">
              <label>
                <input 
                  type="checkbox" 
                  name="${cat.id}" 
                  ${cat.required ? 'checked disabled' : ''}
                  ${isChecked ? 'checked' : ''}
                />
                <div>
                  <strong>${this.escapeHtml(translations.categories[cat.id] ? translations.categories[cat.id].name : cat.name)}</strong>
                  <p>${this.escapeHtml(translations.categories[cat.id] ? translations.categories[cat.id].description : cat.description)}</p>
                </div>
              </label>
            </div>
          `;
          }).join('')}
        </div>
        ${cookiePolicyUrl && translations.viewCookiePolicy ? `<div class="rs-cmp-modal-policy-link"><a href="${this.escapeHtml(cookiePolicyUrl)}" target="_blank" rel="noopener noreferrer" class="rs-cmp-btn rs-cmp-btn-view-policy">${this.escapeHtml(translations.viewCookiePolicy)}</a></div>` : ''}
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
        
        .rs-cmp-modal-subtitle {
          color: #4a5568;
          font-size: 14px;
          line-height: 1.6;
          margin: 0 0 16px 0;
        }
        
        .rs-cmp-modal-intro-title {
          color: #2d3748;
          font-size: 16px;
          font-weight: 600;
          margin: 16px 0 8px 0;
        }
        
        .rs-cmp-modal-intro-desc {
          color: #4a5568;
          font-size: 14px;
          line-height: 1.6;
          margin: 0 0 8px 0;
        }
        
        .rs-cmp-modal-policy-link {
          text-align: center;
          margin: 16px 0;
        }
        
        .rs-cmp-btn-view-policy {
          display: inline-block;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          color: ${primaryColor};
          background: transparent;
          border: 2px solid ${primaryColor};
          border-radius: 8px;
          text-decoration: none;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .rs-cmp-btn-view-policy:hover {
          background: ${primaryColor};
          color: ${buttonTextColor};
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
          accent-color: ${primaryColor};
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
          background: ${primaryColor};
          color: ${buttonTextColor};
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        
        .rs-cmp-modal-buttons button:first-child:hover {
          filter: brightness(0.9);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
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
      
      // Apply CSP nonce if available
      const nonce = getNonce();
      if (nonce) {
        style.setAttribute('nonce', nonce);
      }
      
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
    /** @type {ScriptBlocker} */
    this.scriptBlocker = new ScriptBlocker(this.consentManager);
    /** @type {BannerUI} */
    this.bannerUI = new BannerUI(this.consentManager, this.scriptBlocker);
    /** @type {GoogleConsentMode} */
    this.googleConsentMode = new GoogleConsentMode(this.consentManager);
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
      // Get site-id from script tag
      this.siteId = this.getSiteIdFromScript();
      
      // Support inline configuration
      if (inlineConfig) {
        this.config = this.mergeWithDefaults(inlineConfig);
      } else if (this.siteId) {
        // Try to load from API, fall back to default if unavailable
        try {
          this.config = await this.loadConfig(this.siteId);
        } catch (apiError) {
          console.warn('[RS-CMP] Failed to load config from API, using default configuration:', apiError.message);
          this.config = this.getDefaultConfig();
        }
      } else {
        // Use default configuration
        this.config = this.getDefaultConfig();
      }
      
      // Check if consent already exists
      const existingConsent = this.consentStorage.getConsent();
      
      if (existingConsent) {
        // Apply existing consent without reload (initial page load)
        this.applyConsent(existingConsent.categories, false);
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
        // Apply consent with reload (user changed consent)
        this.applyConsent(categories, true);
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
   * Check if auto-init is enabled
   * @private
   * @returns {boolean} True if auto-init should happen (default), false if manual init required
   */
  shouldAutoInit() {
    const scripts = document.querySelectorAll('script[data-site-id]');
    if (scripts.length > 0) {
      const autoInit = scripts[0].getAttribute('data-auto-init');
      return autoInit !== 'false'; // Default true, only false if explicitly set to 'false'
    }
    return true; // Default to auto-init if no script tag found
  }

  /**
   * Load configuration from API
   * @private
   * @param {string} siteId - Site identifier
   * @returns {Promise<Config>} Configuration
   */
  async loadConfig(siteId) {
    const apiUrl = this.getApiUrl();
    const configUrl = `${apiUrl}/v1/site/${siteId}/config`;
    const response = await fetch(configUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to load config from ${configUrl}: ${response.status}`);
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
   * @param {boolean} shouldReload - Whether to reload the page after applying consent (deprecated, kept for backwards compatibility)
   * @returns {void}
   */
  applyConsent(categories, shouldReload = false) {
    // Unblock scripts based on consent
    this.scriptBlocker.unblockScripts(categories);
    
    // Update Google Consent Mode
    this.googleConsentMode.update(categories);
    
    // Send consent to backend
    if (this.siteId && this.config) {
      this.sendConsentToBackend(categories);
    }

    // Note: Page reload removed in favor of hot-swapping consent changes
    // Scripts are now unblocked and services loaded dynamically without reload
    // This provides a smoother user experience
    if (shouldReload) {
      console.log('[RS-CMP] Page reload requested but skipped - using hot-swapping instead');
    }
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
   * Get current consent status (public method)
   * @returns {ConsentCategories | null} Current consent or null if not set
   */
  getConsent() {
    return this.consentManager.getConsent();
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
   * Enable or disable debug mode
   * @param {boolean} enabled - Whether debug mode is enabled
   * @returns {void}
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`[RS-CMP] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
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
          description: 'Utilizziamo i cookie per finalità tecniche e, con il tuo consenso, anche per le finalità di esperienza, analisi e marketing come specificato nella cookie policy. Puoi liberamente prestare, rifiutare o revocare il tuo consenso, in qualsiasi momento, accedendo al pannello delle preferenze. Il rifiuto del consenso può rendere non disponibili le relative funzioni.',
          acceptAll: 'Accetta tutto',
          rejectAll: 'Rifiuta tutto',
          customize: 'Personalizza',
          customizeTitle: 'Scegli le tue preferenze relative ai cookie',
          customizeSubtitle: 'Questo pannello ti permette di esprimere alcune preferenze relative al trattamento delle tue informazioni personali. Puoi rivedere e modificare le tue scelte in qualsiasi momento.',
          save: 'Salva preferenze',
          close: 'Chiudi',
          privacyPolicy: 'Privacy Policy',
          cookiePolicy: 'Cookie Policy',
          customizeIntro: 'Le tue preferenze relative al consenso per le tecnologie di tracciamento',
          customizeDescription: 'Le opzioni disponibili in questa sezione ti permettono di personalizzare le preferenze relative al consenso per qualsiasi tecnologia di tracciamento utilizzata per le finalità descritte di seguito. Per ottenere ulteriori informazioni in merito all\'utilità e al funzionamento di tali strumenti di tracciamento, fai riferimento alla cookie policy. Tieni presente che il rifiuto del consenso per una finalità particolare può rendere le relative funzioni non disponibili.',
          viewCookiePolicy: 'Visualizza Cookie Policy completa',
          categories: {
            necessary: { name: 'Necessari', description: 'Questi strumenti di tracciamento sono strettamente necessari per garantire il funzionamento e la fornitura del servizio che ci hai richiesto e, pertanto, non richiedono il tuo consenso.' },
            analytics: { name: 'Analitici', description: 'Questi strumenti di tracciamento ci permettono di misurare il traffico e analizzare il tuo comportamento per migliorare il nostro servizio.' },
            marketing: { name: 'Marketing', description: 'Questi strumenti di tracciamento ci permettono di fornirti contenuti marketing o annunci personalizzati e di misurarne la performance.' },
            preferences: { name: 'Preferenze', description: 'Questi strumenti di tracciamento ci permettono di migliorare la qualità della tua esperienza utente e consentono le interazioni con piattaforme, reti e contenuti esterni.' }
          }
        },
        en: {
          title: 'We respect your privacy',
          description: 'We use cookies to improve your experience.',
          acceptAll: 'Accept All',
          rejectAll: 'Reject All',
          customize: 'Customize',
          customizeTitle: 'Choose your cookie preferences',
          customizeSubtitle: 'This panel allows you to express some preferences related to the processing of your personal information. You can review and change your choices at any time.',
          save: 'Save Preferences',
          close: 'Close',
          privacyPolicy: 'Privacy Policy',
          cookiePolicy: 'Cookie Policy',
          customizeIntro: 'Your preferences for tracking technology consent',
          customizeDescription: 'The options in this section allow you to customize your consent preferences for any tracking technology used for the purposes described below. For more information about the purpose and operation of these tracking tools, please refer to the cookie policy. Please note that refusing consent for a particular purpose may make related features unavailable.',
          viewCookiePolicy: 'View Full Cookie Policy',
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

    const primaryColor = this.config && this.config.banner ? this.config.banner.primaryColor : '#0084ff';

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
          background: ${primaryColor};
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
          outline: 2px solid ${primaryColor};
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
      
      // Apply CSP nonce if available
      const nonce = getNonce();
      if (nonce) {
        style.setAttribute('nonce', nonce);
      }
      
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
// INITIALIZATION
// ============================================================================

// Create instance  
const cmpInstance = new RSCMP();

// Expose to window and return for IIFE assignment
if (typeof window !== 'undefined') {
  // Early script blocking - run immediately to block scripts before they execute
  // This is crucial for proper cookie blocking
  if (document.readyState === 'loading') {
    // Block scripts immediately
    cmpInstance.scriptBlocker.blockScripts();
  } else {
    // Block scripts if document already loaded
    cmpInstance.scriptBlocker.blockScripts();
  }
  
  // Expose to window for manual control
  window.RSCMP = cmpInstance;
  
  // Check if auto-init is enabled (default: true)
  const autoInit = cmpInstance.shouldAutoInit();
  
  if (autoInit) {
    // Auto-initialize the CMP
    console.log('[RS-CMP] Auto-initializing...');
    cmpInstance.init().catch(err => {
      console.error('[RS-CMP] Auto-initialization failed:', err);
    });
  } else {
    // Manual initialization required
    console.log('[RS-CMP] Manual init required. Call window.RSCMP.init() to initialize.');
  }
}

// Export for both IIFE (esbuild) and other module systems
// In browser context, window.RSCMP is already set above
// This export is for Node.js/CommonJS and esbuild's IIFE wrapper
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = cmpInstance;
}
