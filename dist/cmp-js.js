var RSCMP = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // src/cmp.js
  var require_cmp = __commonJS({
    "src/cmp.js"(exports, module) {
      var STORAGE_KEY = "rs-cmp-consent";
      var COOKIE_NAME = "rs-cmp-consent";
      var COOKIE_MAX_AGE = 365 * 24 * 60 * 60;
      function getNonce() {
        const scriptWithNonce = document.querySelector("script[nonce]");
        if (scriptWithNonce && scriptWithNonce.nonce) {
          return scriptWithNonce.nonce;
        }
        const metaWithNonce = document.querySelector('meta[property="csp-nonce"]');
        if (metaWithNonce) {
          return metaWithNonce.getAttribute("content");
        }
        return null;
      }
      var ConsentStorage = class {
        /**
         * Save consent to localStorage and cookie
         * @param {ConsentData} consent - Consent data to save
         * @returns {void}
         */
        saveConsent(consent) {
          const consentString = JSON.stringify(consent);
          try {
            localStorage.setItem(STORAGE_KEY, consentString);
          } catch (error) {
            console.warn("[RS-CMP] Failed to save to localStorage:", error);
          }
          this.setCookie(COOKIE_NAME, "1", COOKIE_MAX_AGE);
        }
        /**
         * Get consent from localStorage or cookie
         * @returns {ConsentData | null} Stored consent data or null
         */
        getConsent() {
          try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
              const data = JSON.parse(stored);
              const consentDate = new Date(data.timestamp);
              const daysSinceConsent = (Date.now() - consentDate.getTime()) / (1e3 * 60 * 60 * 24);
              if (daysSinceConsent > 365) {
                console.log("[RS-CMP] Consent expired (> 12 months), clearing...");
                this.clearConsent();
                return null;
              }
              return data;
            }
          } catch (error) {
            console.warn("[RS-CMP] Failed to read from localStorage:", error);
          }
          const cookieValue = this.getCookie(COOKIE_NAME);
          if (cookieValue === "1") {
            console.warn("[RS-CMP] Cookie found but localStorage unavailable - cannot retrieve full consent state");
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
            console.warn("[RS-CMP] Failed to clear localStorage:", error);
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
          const secure = window.location.protocol === "https:" ? "; Secure" : "";
          document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax${secure}`;
        }
        /**
         * Get a cookie value
         * @private
         * @param {string} name - Cookie name
         * @returns {string | null} Cookie value or null
         */
        getCookie(name) {
          const nameEQ = name + "=";
          const cookies = document.cookie.split(";");
          for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i];
            while (cookie.charAt(0) === " ") {
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
      };
      var ConsentManager = class {
        /**
         * @param {ConsentStorage} storage - Storage instance
         */
        constructor(storage) {
          this.eventHandlers = /* @__PURE__ */ new Map();
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
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            version
          };
          this.storage.saveConsent(consentData);
          this.pushToDataLayer(categories);
          this.emit("consentUpdated", categories);
        }
        /**
         * Push consent data to GTM dataLayer
         * @param {ConsentCategories} categories - Consent categories
         * @returns {void}
         */
        pushToDataLayer(categories) {
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({
            event: "cookie_consent_update",
            cookie_consent_analytics: categories.analytics,
            cookie_consent_marketing: categories.marketing,
            cookie_consent_preferences: categories.preferences,
            cookie_consent_necessary: categories.necessary,
            consent_timestamp: (/* @__PURE__ */ new Date()).toISOString()
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
              preferences: true
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
              preferences: false
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
      };
      var ScriptBlocker = class {
        /**
         * @param {ConsentManager} consentManager - Consent manager instance
         */
        constructor(consentManager) {
          this.consentManager = consentManager;
          this.blockedScripts = [];
          this.scriptObserver = null;
        }
        /**
         * Detect category from script source or content
         * @param {string} srcOrCode - Script src or code content
         * @returns {string | null} Detected category or null
         */
        detectCategory(srcOrCode) {
          const s = (srcOrCode || "").toLowerCase();
          if (!s)
            return null;
          if (s.indexOf("gtag(") !== -1 || s.indexOf("google-analytics") !== -1 || s.indexOf("analytics.js") !== -1 || s.indexOf("googletagmanager.com/gtag") !== -1 || s.indexOf("hotjar") !== -1 || s.indexOf("mixpanel") !== -1 || s.indexOf("amplitude") !== -1 || s.indexOf("clarity.ms") !== -1) {
            return "analytics";
          }
          if (s.indexOf("connect.facebook.net") !== -1 || s.indexOf("fbq(") !== -1 || s.indexOf("tiktok.com") !== -1 || s.indexOf("analytics.tiktok.com") !== -1 || s.indexOf("ads/") !== -1 || s.indexOf("doubleclick.net") !== -1 || s.indexOf("googleadservices.com") !== -1) {
            return "marketing";
          }
          return null;
        }
        /**
         * Block all scripts that require consent
         * @returns {void}
         */
        blockScripts() {
          const scripts = document.querySelectorAll("script[data-category]");
          scripts.forEach((script) => {
            const category = script.getAttribute("data-category");
            if (category === "necessary") {
              return;
            }
            if (script.getAttribute("type") !== "text/plain") {
              script.setAttribute("data-original-type", script.getAttribute("type") || "text/javascript");
              script.setAttribute("type", "text/plain");
            }
            this.blockedScripts.push(script);
          });
          this.scanAndBlockCommonScripts();
          this.startScriptObserver();
        }
        /**
         * Unblock scripts based on consent categories
         * @param {ConsentCategories} categories - Consent categories
         * @returns {void}
         */
        unblockScripts(categories) {
          this.blockedScripts.forEach((script) => {
            const category = script.getAttribute("data-category");
            if (category && categories[category]) {
              const originalType = script.getAttribute("data-original-type") || "text/javascript";
              const newScript = document.createElement("script");
              Array.from(script.attributes).forEach((attr) => {
                if (attr.name === "type") {
                  newScript.setAttribute("type", originalType);
                } else if (attr.name === "data-original-type") {
                } else {
                  newScript.setAttribute(attr.name, attr.value);
                }
              });
              if (script.textContent) {
                newScript.textContent = script.textContent;
              }
              if (script.parentNode) {
                script.parentNode.replaceChild(newScript, script);
              }
            }
          });
          this.unblockCommonScripts(categories);
        }
        /**
         * Scan and block common tracking scripts (gtag, GA4, Meta Pixel, etc.)
         * @private
         * @returns {void}
         */
        scanAndBlockCommonScripts() {
          const scripts = document.querySelectorAll("script");
          scripts.forEach((script) => {
            if (script.getAttribute("data-category"))
              return;
            const src = script.src || "";
            const content = script.textContent || "";
            const detected = this.detectCategory(src + " " + content);
            if (detected && detected !== "necessary") {
              script.setAttribute("data-category", detected);
              script.setAttribute("data-original-type", script.type || "text/javascript");
              script.type = "text/plain";
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
          if (categories.analytics && typeof window.gtag === "function") {
            window.gtag("consent", "update", {
              analytics_storage: "granted"
            });
          }
          if (categories.marketing && typeof window.fbq === "function") {
            window.fbq("consent", "grant");
          }
        }
        /**
         * Start observing DOM for dynamically added scripts (for SPAs)
         * @private
         * @returns {void}
         */
        startScriptObserver() {
          if (typeof MutationObserver === "undefined") {
            console.warn("[RS-CMP] MutationObserver not available, dynamic script blocking disabled");
            return;
          }
          if (this.scriptObserver) {
            return;
          }
          this.scriptObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeName === "SCRIPT") {
                  this.processNewScript(node);
                }
                if (node.querySelectorAll) {
                  const scripts = node.querySelectorAll("script");
                  scripts.forEach((script) => this.processNewScript(script));
                }
              });
            });
          });
          this.scriptObserver.observe(document.documentElement, {
            childList: true,
            subtree: true
          });
          console.log("[RS-CMP] Script observer started for dynamic script blocking");
        }
        /**
         * Process a newly added script element
         * @private
         * @param {HTMLScriptElement} script - Script element to process
         * @returns {void}
         */
        processNewScript(script) {
          if (script.getAttribute("data-rs-cmp-processed")) {
            return;
          }
          script.setAttribute("data-rs-cmp-processed", "true");
          let category = script.getAttribute("data-category");
          if (!category) {
            const src = script.src || "";
            const content = script.textContent || "";
            category = this.detectCategory(src + " " + content);
          }
          if (category && category !== "necessary") {
            const consent = this.consentManager.getConsent();
            if (!consent || !consent[category]) {
              script.setAttribute("data-category", category);
              script.setAttribute("data-original-type", script.type || "text/javascript");
              script.type = "text/plain";
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
            console.log("[RS-CMP] Script observer stopped");
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
          return this.blockedScripts.filter((script) => {
            const scriptCategory = script.getAttribute("data-category");
            return scriptCategory === categoryId;
          });
        }
      };
      var GoogleConsentMode = class {
        /**
         * @param {ConsentManager} consentManager - Consent manager instance
         */
        constructor(consentManager) {
          this.consentManager = consentManager;
          this.initializeDefaultConsent();
        }
        /**
         * Initialize default consent state (denied for all)
         * @private
         * @returns {void}
         */
        initializeDefaultConsent() {
          if (typeof window.gtag === "function") {
            window.gtag("consent", "default", {
              ad_storage: "denied",
              ad_user_data: "denied",
              ad_personalization: "denied",
              analytics_storage: "denied",
              functionality_storage: "denied",
              personalization_storage: "denied",
              security_storage: "granted"
              // Always granted for security
            });
          }
        }
        /**
         * Update consent based on user choices
         * @param {ConsentCategories} categories - Consent categories
         * @returns {void}
         */
        update(categories) {
          if (typeof window.gtag !== "function") {
            this.initializeGtag();
          }
          if (typeof window.gtag === "function") {
            window.gtag("consent", "update", {
              ad_storage: categories.marketing ? "granted" : "denied",
              ad_user_data: categories.marketing ? "granted" : "denied",
              ad_personalization: categories.marketing ? "granted" : "denied",
              analytics_storage: categories.analytics ? "granted" : "denied",
              functionality_storage: categories.preferences ? "granted" : "denied",
              personalization_storage: categories.preferences ? "granted" : "denied"
            });
          }
        }
        /**
         * Initialize gtag if not already present
         * @private
         * @returns {void}
         */
        initializeGtag() {
          if (typeof window.gtag === "undefined") {
            window.dataLayer = window.dataLayer || [];
            window.gtag = function() {
              window.dataLayer.push(arguments);
            };
            window.gtag("js", /* @__PURE__ */ new Date());
          }
        }
      };
      var BannerUI = class {
        /**
         * @param {ConsentManager} consentManager - Consent manager instance
         * @param {CookieScanner} cookieScanner - Cookie scanner instance
         * @param {ScriptBlocker} scriptBlocker - Script blocker instance
         */
        constructor(consentManager, cookieScanner, scriptBlocker) {
          this.consentManager = consentManager;
          this.cookieScanner = cookieScanner;
          this.scriptBlocker = scriptBlocker;
          this.bannerElement = null;
          this.config = null;
        }
        /**
         * Show the consent banner
         * @param {Config} config - CMP configuration
         * @returns {void}
         */
        show(config) {
          this.config = config;
          if (this.bannerElement) {
            return;
          }
          const userLang = this.detectLanguage();
          const translations = config.translations[userLang] || config.translations["en"] || config.translations[Object.keys(config.translations)[0]];
          this.bannerElement = this.createBanner(config, translations);
          document.body.appendChild(this.bannerElement);
          this.consentManager.emit("bannerShown", {});
        }
        /**
         * Hide the banner
         * @returns {void}
         */
        hide() {
          if (this.bannerElement) {
            this.bannerElement.remove();
            this.bannerElement = null;
            this.consentManager.emit("bannerClosed", {});
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
          const banner = document.createElement("div");
          banner.id = "rs-cmp-banner";
          banner.setAttribute("role", "dialog");
          banner.setAttribute("aria-label", translations.title);
          banner.setAttribute("aria-modal", "true");
          this.applyStyles(banner, config);
          const policyLinks = this.createPolicyLinks(config, translations);
          banner.innerHTML = `
      <div class="rs-cmp-content">
        ${config.banner.showLogo && config.banner.logoUrl ? `<img src="${config.banner.logoUrl}" alt="Logo" class="rs-cmp-logo" />` : ""}
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
            return "";
          }
          return '<br><span class="rs-cmp-policy-links">' + links.join(" | ") + "</span>";
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
          if (!document.getElementById("rs-cmp-styles")) {
            const style = document.createElement("style");
            style.id = "rs-cmp-styles";
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
            const nonce = getNonce();
            if (nonce) {
              style.setAttribute("nonce", nonce);
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
          if (layout === "modal" || position === "center") {
            return `
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        max-width: 600px;
        border-radius: 12px;
      `;
          } else if (position === "bottom") {
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
          const acceptBtn = banner.querySelector("#rs-cmp-accept-all");
          const rejectBtn = banner.querySelector("#rs-cmp-reject-all");
          const customizeBtn = banner.querySelector("#rs-cmp-customize");
          if (acceptBtn) {
            acceptBtn.addEventListener("click", () => {
              this.consentManager.acceptAll(this.config ? this.config.policyVersion : "1.0");
              this.hide();
            });
          }
          if (rejectBtn) {
            rejectBtn.addEventListener("click", () => {
              this.consentManager.rejectAll(this.config ? this.config.policyVersion : "1.0");
              this.hide();
            });
          }
          if (customizeBtn) {
            customizeBtn.addEventListener("click", () => {
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
          if (!this.config)
            return;
          this.cookieScanner.performInitialScan();
          const userLang = this.detectLanguage();
          const translations = this.config.translations[userLang] || this.config.translations["en"] || this.config.translations[Object.keys(this.config.translations)[0]];
          const currentConsent = this.consentManager.getConsent();
          const modal = document.createElement("div");
          modal.id = "rs-cmp-customize-modal";
          modal.setAttribute("role", "dialog");
          modal.setAttribute("aria-label", translations.customize);
          modal.innerHTML = `
      <div class="rs-cmp-modal-overlay"></div>
      <div class="rs-cmp-modal-content">
        <h2>${this.escapeHtml(translations.customize)}</h2>
        <div class="rs-cmp-categories">
          ${this.config.categories.map((cat) => {
            const isChecked = cat.required || currentConsent && currentConsent[cat.id] || false;
            return `
            <div class="rs-cmp-category">
              <div class="rs-cmp-category-header">
                <label>
                  <input 
                    type="checkbox" 
                    name="${cat.id}" 
                    ${cat.required ? "checked disabled" : ""}
                    ${isChecked ? "checked" : ""}
                  />
                  <div>
                    <strong>${this.escapeHtml(translations.categories[cat.id] ? translations.categories[cat.id].name : cat.name)}</strong>
                    <p>${this.escapeHtml(translations.categories[cat.id] ? translations.categories[cat.id].description : cat.description)}</p>
                  </div>
                </label>
                <button 
                  class="rs-cmp-toggle-details" 
                  onclick="this.parentElement.nextElementSibling.classList.toggle('rs-cmp-hidden')"
                  aria-label="Show details"
                >
                  \u25BC
                </button>
              </div>
              ${this.getServicesForCategory(cat.id)}
            </div>
          `;
          }).join("")}
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
          if (!document.getElementById("rs-cmp-modal-styles")) {
            const style = document.createElement("style");
            style.id = "rs-cmp-modal-styles";
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
            const nonce = getNonce();
            if (nonce) {
              style.setAttribute("nonce", nonce);
            }
            document.head.appendChild(style);
          }
          document.body.appendChild(modal);
          const saveBtn = modal.querySelector("#rs-cmp-save-preferences");
          if (saveBtn) {
            saveBtn.addEventListener("click", () => {
              const analyticsInput = modal.querySelector('input[name="analytics"]');
              const marketingInput = modal.querySelector('input[name="marketing"]');
              const preferencesInput = modal.querySelector('input[name="preferences"]');
              const categories = {
                necessary: true,
                // Always true
                analytics: analyticsInput ? analyticsInput.checked : false,
                marketing: marketingInput ? marketingInput.checked : false,
                preferences: preferencesInput ? preferencesInput.checked : false
              };
              this.consentManager.setConsent(categories, this.config ? this.config.policyVersion : "1.0");
              modal.remove();
              this.hide();
            });
          }
          const closeBtn = modal.querySelector("#rs-cmp-close-modal");
          if (closeBtn) {
            closeBtn.addEventListener("click", () => {
              modal.remove();
            });
          }
          const overlay = modal.querySelector(".rs-cmp-modal-overlay");
          if (overlay) {
            overlay.addEventListener("click", () => {
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
          var _a, _b;
          const cookies = ((_a = this.cookieScanner) == null ? void 0 : _a.getCookiesByCategory(categoryId)) || [];
          const blockedScripts = ((_b = this.scriptBlocker) == null ? void 0 : _b.getBlockedScriptsByCategory(categoryId)) || [];
          if (cookies.length === 0 && blockedScripts.length === 0) {
            return `
        <div class="rs-cmp-category-services rs-cmp-hidden">
          <p class="rs-cmp-no-cookies">No cookies or scripts detected for this category.</p>
        </div>
      `;
          }
          const services = this.groupCookiesIntoServices(cookies);
          const scriptServices = this.getServicesFromBlockedScripts(blockedScripts);
          const allServices = [...services];
          scriptServices.forEach((scriptService) => {
            const exists = allServices.some((s) => s.provider === scriptService.provider);
            if (!exists) {
              allServices.push(scriptService);
            }
          });
          return `
      <div class="rs-cmp-category-services rs-cmp-hidden">
        <table class="rs-cmp-services-table">
          <thead>
            <tr>
              <th>Cookie Name</th>
              <th>Provider</th>
              <th>Origin</th>
            </tr>
          </thead>
          <tbody>
            ${allServices.map((s) => `
              <tr>
                <td>${this.escapeHtml(s.name)}</td>
                <td>${this.escapeHtml(s.provider)}</td>
                <td>${this.escapeHtml(s.origin)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
        }
        /**
         * Group cookies into services with friendly names
         * @param {DetectedCookie[]} cookies - Array of detected cookies
         * @returns {Array<{name: string, provider: string, origin: string}>}
         */
        groupCookiesIntoServices(cookies) {
          const providerPatterns = [
            { pattern: /^_g(a|id|at|ac)/, provider: "Google Analytics" },
            { pattern: /^_gcl_au$/, provider: "Google Tag Manager" },
            { pattern: /^_gcl/, provider: "Google Ads" },
            { pattern: /^_dc_gtm_/, provider: "Google Tag Manager" },
            { pattern: /^(AEC|ADS_VISITOR_ID|ps_l)$/, provider: "Google Ads" },
            { pattern: /^(APISID|SAPISID|HSID|SID|SSID|SIDCC|__Secure-3PAPISID|__Secure-3PSID|__Secure-3PSIDTS|__Secure-BUCKET|Secure-ENID|SEARCH_SAMESITE)$/, provider: "Google" },
            { pattern: /^NID$/, provider: "Google" },
            { pattern: /^S$/, provider: "Generic Marketing" },
            { pattern: /^(_fbp|_fbc|_fr|^fr|^wd)$/, provider: "Meta (Facebook)" },
            { pattern: /^_hj/, provider: "Hotjar" },
            { pattern: /^(_clck|_clsk|CLID|SM)$/, provider: "Microsoft Clarity" },
            { pattern: /^(ai_session|ai_user)$/, provider: "Azure Application Insights" },
            { pattern: /^(MUID|ANONCHK|SRM_B)$/, provider: "Microsoft" },
            { pattern: /^(_ttp|__ttd)/, provider: "TikTok" },
            { pattern: /^(\.ASPXANONYMOUS|ASP\.NET_ID|ASP\.NET_SessionId)/, provider: "ASP.NET" },
            { pattern: /^(\.?ARRAffinity|ARRAffinitySameSite)/, provider: "Azure" },
            { pattern: /^(cityidc_|CNC_PSIC)/, provider: "Store Selection" },
            { pattern: /(session|SESS)/i, provider: "Session Management" },
            { pattern: /(csrf|XSRF)/i, provider: "Security" },
            { pattern: /^rs-cmp-consent$/, provider: "Consent Management" }
          ];
          return cookies.map((cookie) => {
            let provider = "Unknown";
            for (const { pattern, provider: providerName } of providerPatterns) {
              if (pattern.test(cookie.name)) {
                provider = providerName;
                break;
              }
            }
            if (provider === "Unknown") {
              provider = cookie.isFirstParty ? "First-party" : "Third-party";
            }
            const origin = cookie.isFirstParty ? "First-party" : "Third-party";
            return {
              name: cookie.name,
              provider,
              origin
            };
          });
        }
        /**
         * Get services from blocked scripts
         * @param {Array<HTMLScriptElement>} scripts - Array of blocked script elements
         * @returns {Array<{name: string, provider: string, origin: string}>}
         */
        getServicesFromBlockedScripts(scripts) {
          const services = [];
          const seenProviders = /* @__PURE__ */ new Set();
          const providerPatterns = [
            { patterns: ["googleadservices.com", "googlesyndication.com"], name: "Google Ads" },
            { patterns: ["google-analytics.com", "analytics.js"], name: "Google Analytics" },
            { patterns: ["googletagmanager.com"], name: "Google Tag Manager" },
            { patterns: ["doubleclick.net"], name: "DoubleClick" },
            { patterns: ["connect.facebook.net", "fbq("], name: "Meta (Facebook)" },
            { patterns: ["hotjar.com"], name: "Hotjar" },
            { patterns: ["clarity.ms"], name: "Microsoft Clarity" },
            { patterns: ["tiktok.com"], name: "TikTok" }
          ];
          scripts.forEach((script) => {
            const src = (script.src || "").toLowerCase();
            let provider = null;
            const scriptLabel = "(Script blocked)";
            if (src) {
              for (const { patterns, name } of providerPatterns) {
                if (patterns.some((pattern) => src.includes(pattern))) {
                  provider = name;
                  break;
                }
              }
              if (!provider) {
                try {
                  const url = new URL(script.src);
                  provider = url.hostname;
                } catch (e) {
                  provider = "Third-party Script";
                }
              }
            }
            if (!provider) {
              const content = (script.textContent || "").toLowerCase();
              if (content) {
                for (const { patterns, name } of providerPatterns) {
                  if (patterns.some((pattern) => content.includes(pattern))) {
                    provider = name;
                    break;
                  }
                }
              }
              provider = provider || "Inline Script";
            }
            if (provider && !seenProviders.has(provider)) {
              seenProviders.add(provider);
              services.push({
                name: scriptLabel,
                provider,
                origin: src ? "Third-party" : "First-party"
              });
            }
          });
          return services;
        }
        /**
         * Detect user's language
         * @private
         * @returns {string} Language code
         */
        detectLanguage() {
          const lang = navigator.language || navigator.userLanguage || "en";
          return lang.split("-")[0];
        }
        /**
         * Escape HTML to prevent XSS
         * @private
         * @param {string} text - Text to escape
         * @returns {string} Escaped HTML
         */
        escapeHtml(text) {
          const div = document.createElement("div");
          div.textContent = text;
          return div.innerHTML;
        }
      };
      var CookieScanner = class {
        constructor() {
          this.detectedCookies = /* @__PURE__ */ new Map();
          this.debugMode = false;
          this.cookiePatterns = this.initializeCookiePatterns();
          this.currentDomain = typeof window !== "undefined" ? window.location.hostname : null;
          if (typeof document !== "undefined") {
            this.performInitialScan();
          }
        }
        /**
         * Perform initial cookie scan
         * @returns {void}
         */
        performInitialScan() {
          const cookies = this.scanCookies();
          for (const cookie of cookies) {
            this.detectedCookies.set(cookie.name, cookie);
          }
          console.log(`[CookieScanner] Initial scan complete: ${cookies.length} cookies detected`);
        }
        /**
         * Initialize cookie pattern mappings for automatic categorization
         * @returns {Object.<string, string>} Pattern to category mappings
         */
        initializeCookiePatterns() {
          return {
            // Analytics cookies
            "_ga": "analytics",
            "_gid": "analytics",
            "_gat": "analytics",
            "_gat_gtag": "analytics",
            "_gac": "analytics",
            "_gcl_au": "analytics",
            // Google Tag Manager (analytics, not marketing)
            "_dc_gtm_": "analytics",
            // Google Tag Manager throttle cookie
            "__utma": "analytics",
            "__utmb": "analytics",
            "__utmc": "analytics",
            "__utmt": "analytics",
            "__utmz": "analytics",
            "_hjid": "analytics",
            "_hjFirstSeen": "analytics",
            // Hotjar
            "_hjIncludedInPageviewSample": "analytics",
            "_hjIncludedInSessionSample": "analytics",
            // Hotjar
            "_hjAbsoluteSessionInProgress": "analytics",
            "_hjSession": "analytics",
            // Hotjar
            "_hjSessionUser_": "analytics",
            // Hotjar
            "_clck": "analytics",
            // Microsoft Clarity
            "_clsk": "analytics",
            "CLID": "analytics",
            // Microsoft Clarity
            "SM": "analytics",
            // Microsoft - indicates MUID update
            "ai_session": "analytics",
            // Azure Application Insights
            "ai_user": "analytics",
            // Azure Application Insights
            // Marketing/Advertising cookies
            "_fbp": "marketing",
            "_fbc": "marketing",
            "fr": "marketing",
            // Facebook
            "_fr": "marketing",
            // Facebook with underscore prefix
            "tr": "marketing",
            "_gcl_aw": "marketing",
            // Google Ads
            "_gcl_dc": "marketing",
            "IDE": "marketing",
            // Google DoubleClick
            "DSID": "marketing",
            "test_cookie": "marketing",
            "__Secure-3PAPISID": "marketing",
            // Google
            "__Secure-3PSID": "marketing",
            // Google
            "__Secure-3PSIDTS": "marketing",
            // Google
            "__Secure-BUCKET": "marketing",
            // Google
            "Secure-ENID": "marketing",
            // Google
            "NID": "marketing",
            // Google
            "AEC": "marketing",
            // Google Ads
            "APISID": "marketing",
            // Google
            "SAPISID": "marketing",
            // Google
            "HSID": "marketing",
            // Google
            "SID": "marketing",
            // Google
            "SSID": "marketing",
            // Google
            "SIDCC": "marketing",
            // Google
            "SEARCH_SAMESITE": "marketing",
            // Google
            "ADS_VISITOR_ID": "marketing",
            // Google Ads visitor ID
            "ps_l": "marketing",
            // Google related
            "S": "marketing",
            // Generic marketing cookie
            "_ttp": "marketing",
            // TikTok
            "_ttp_pixel": "marketing",
            "__ttd": "marketing",
            "YSC": "marketing",
            // YouTube
            "VISITOR_INFO1_LIVE": "marketing",
            "MUID": "marketing",
            // Microsoft advertising
            "ANONCHK": "marketing",
            // Microsoft advertising check
            "wd": "marketing",
            // Facebook - window dimensions tracking
            // Preference cookies
            "lang": "preferences",
            "language": "preferences",
            "i18n": "preferences",
            "locale": "preferences",
            "theme": "preferences",
            "timezone": "preferences",
            "currency": "preferences",
            // Necessary cookies (authentication, session, security)
            "PHPSESSID": "necessary",
            "JSESSIONID": "necessary",
            "ASPSESSIONID": "necessary",
            "ASP.NET_SessionId": "necessary",
            // ASP.NET session
            ".ASPXANONYMOUS": "necessary",
            // ASP.NET anonymous
            "ASP.NET_ID": "necessary",
            // ASP.NET session
            ".ARRAffinity": "necessary",
            // Azure affinity (with dot prefix)
            "ARRAffinity": "necessary",
            // Azure affinity
            "ARRAffinitySameSite": "necessary",
            // Azure affinity SameSite
            "session": "necessary",
            "csrf": "necessary",
            "XSRF-TOKEN": "necessary",
            "__cfduid": "necessary",
            // Cloudflare
            "__cf_bm": "necessary",
            "rs-cmp-consent": "necessary",
            // Our own consent cookie
            "cityidc_": "necessary",
            // Custom first-party - store selection
            "CNC_PSIC": "necessary",
            // Custom first-party - store selection
            "SRM_B": "necessary"
            // Microsoft Bing unique ID
          };
        }
        /**
         * Categorize a cookie based on its name
         * @param {string} cookieName - Cookie name
         * @returns {string} Category (necessary, analytics, marketing, preferences)
         */
        categorizeCookie(cookieName) {
          if (this.cookiePatterns[cookieName]) {
            return this.cookiePatterns[cookieName];
          }
          for (const [pattern, category] of Object.entries(this.cookiePatterns)) {
            if (cookieName.startsWith(pattern)) {
              return category;
            }
          }
          return "necessary";
        }
        /**
         * Check if cookie is first-party or third-party
         * @param {string} cookieDomain - Cookie domain
         * @returns {boolean} True if first-party
         */
        isFirstPartyCookie(cookieDomain) {
          if (!this.currentDomain || !cookieDomain) {
            return true;
          }
          const cleanDomain = cookieDomain.startsWith(".") ? cookieDomain.substring(1) : cookieDomain;
          const currentDomain = this.currentDomain;
          return currentDomain === cleanDomain || currentDomain.endsWith("." + cleanDomain) || cleanDomain.endsWith("." + currentDomain);
        }
        /**
         * Parse cookies from document.cookie
         * @returns {DetectedCookie[]} Array of detected cookies
         */
        scanCookies() {
          if (typeof document === "undefined") {
            return [];
          }
          const cookies = [];
          const cookieStrings = document.cookie.split(";");
          for (const cookieString of cookieStrings) {
            const trimmed = cookieString.trim();
            if (!trimmed)
              continue;
            const [name, ...valueParts] = trimmed.split("=");
            const value = valueParts.join("=");
            if (!name)
              continue;
            const category = this.categorizeCookie(name);
            const isFirstParty = this.isFirstPartyCookie(this.currentDomain);
            const detectedCookie = {
              name,
              value,
              domain: this.currentDomain || "",
              path: "/",
              // Cannot be reliably detected from client-side JS
              secure: null,
              // Cannot be detected from client-side JS
              httpOnly: false,
              // Cannot be detected from JS (by definition, httpOnly cookies are not accessible)
              sameSite: "Lax",
              // Assumed default, cannot be reliably detected
              expires: null,
              // Not available from document.cookie
              isFirstParty,
              category,
              detectedAt: Date.now(),
              source: "client"
            };
            cookies.push(detectedCookie);
          }
          return cookies;
        }
        /**
         * Scan cookies on demand (after consent change)
         * Scans cookies to detect what has been added/changed after user consent
         * @returns {void}
         */
        scanOnConsentChange() {
          console.log("[CookieScanner] Scanning cookies after consent change...");
          const currentCookies = this.scanCookies();
          for (const cookie of currentCookies) {
            const existingCookie = this.detectedCookies.get(cookie.name);
            if (!existingCookie) {
              this.detectedCookies.set(cookie.name, cookie);
              console.log(`[CookieScanner] New cookie detected: ${cookie.name} (${cookie.category})`);
            } else if (existingCookie.value !== cookie.value) {
              this.detectedCookies.set(cookie.name, cookie);
              console.log(`[CookieScanner] Cookie updated: ${cookie.name}`);
            }
          }
        }
        /**
         * Enable or disable debug mode for cookie scanning
         * @param {boolean} enabled - Whether debug mode is enabled
         * @returns {void}
         */
        setDebugMode(enabled) {
          this.debugMode = enabled;
          console.log(`[CookieScanner] Debug mode ${enabled ? "enabled" : "disabled"}`);
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
          return this.getAllCookies().filter((cookie) => cookie.category === category);
        }
        /**
         * Get cookie report for backend
         * @returns {Object} Cookie report
         */
        getCookieReport() {
          const cookies = this.getAllCookies();
          const report = {
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            domain: this.currentDomain,
            totalCookies: cookies.length,
            clientDetected: cookies.filter((c) => c.source === "client").length,
            serverDetected: cookies.filter((c) => c.source === "server").length,
            firstPartyCookies: cookies.filter((c) => c.isFirstParty).length,
            thirdPartyCookies: cookies.filter((c) => !c.isFirstParty).length,
            categories: {
              necessary: this.getCookiesByCategory("necessary").length,
              analytics: this.getCookiesByCategory("analytics").length,
              marketing: this.getCookiesByCategory("marketing").length,
              preferences: this.getCookiesByCategory("preferences").length
            },
            cookies: cookies.map((cookie) => ({
              name: cookie.name,
              domain: cookie.domain,
              category: cookie.category,
              isFirstParty: cookie.isFirstParty,
              httpOnly: cookie.httpOnly,
              source: cookie.source,
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
        sendReportToBackend(apiUrl, siteId) {
          return __async(this, null, function* () {
            try {
              const report = this.getCookieReport();
              yield fetch(`${apiUrl}/v1/cookies/scan`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify(__spreadValues({
                  siteId
                }, report))
              });
              console.log("[CookieScanner] Report sent to backend");
            } catch (error) {
              console.error("[CookieScanner] Failed to send report:", error);
            }
          });
        }
        /**
         * Delete cookies by category
         * @param {string[]} categories - Categories of cookies to delete (e.g., ['analytics', 'marketing'])
         * @returns {void}
         */
        deleteCookiesByCategory(categories) {
          const currentCookies = this.scanCookies();
          let processedCount = 0;
          for (const cookie of currentCookies) {
            if (categories.includes(cookie.category)) {
              this.deleteCookie(cookie.name);
              processedCount++;
              this.detectedCookies.delete(cookie.name);
            }
          }
          if (processedCount > 0) {
            console.log(`[CookieScanner] Attempted to delete ${processedCount} cookies from categories: ${categories.join(", ")}`);
          }
        }
        /**
         * Delete a single cookie
         * Attempts multiple domain/path combinations to ensure deletion
         * @param {string} name - Cookie name
         * @returns {void}
         */
        deleteCookie(name) {
          document.cookie = `${name}=; max-age=0; path=/`;
          if (this.currentDomain) {
            document.cookie = `${name}=; max-age=0; path=/; domain=${this.currentDomain}`;
            document.cookie = `${name}=; max-age=0; path=/; domain=.${this.currentDomain}`;
            const domainParts = this.currentDomain.split(".");
            if (domainParts.length > 2) {
              const parentDomain = domainParts.slice(1).join(".");
              document.cookie = `${name}=; max-age=0; path=/; domain=${parentDomain}`;
              document.cookie = `${name}=; max-age=0; path=/; domain=.${parentDomain}`;
            }
          }
        }
        /**
         * Clear all detected cookies
         * @returns {void}
         */
        clear() {
          this.detectedCookies.clear();
        }
        /**
         * Merge server-detected cookies into the detected cookies map.
         * Server-detected cookies include HttpOnly cookies, cookies set by redirects,
         * initial async requests, and CDN/pixel server-side cookies that are invisible
         * to client-side JavaScript.
         * @param {DetectedCookie[]} serverCookies - Cookies detected by the server
         * @returns {void}
         */
        mergeServerCookies(serverCookies) {
          for (const cookie of serverCookies) {
            const existing = this.detectedCookies.get(cookie.name);
            if (!existing || existing.source === "client") {
              const category = cookie.category || this.categorizeCookie(cookie.name);
              this.detectedCookies.set(cookie.name, {
                name: cookie.name,
                value: cookie.httpOnly ? "[httpOnly]" : cookie.value || (existing ? existing.value : ""),
                domain: cookie.domain || (existing ? existing.domain : this.currentDomain || ""),
                path: cookie.path || (existing ? existing.path : "/"),
                secure: cookie.secure != null ? cookie.secure : existing ? existing.secure : null,
                httpOnly: cookie.httpOnly != null ? cookie.httpOnly : false,
                sameSite: cookie.sameSite || (existing ? existing.sameSite : "Lax"),
                expires: cookie.expires || (existing ? existing.expires : null),
                isFirstParty: cookie.isFirstParty != null ? cookie.isFirstParty : this.isFirstPartyCookie(cookie.domain),
                category,
                detectedAt: cookie.detectedAt || Date.now(),
                source: "server"
              });
            }
          }
          console.log(`[CookieScanner] Merged ${serverCookies.length} server-detected cookies`);
        }
      };
      var ServerCookieCollector = class {
        /**
         * @param {string | null} apiUrl - Backend API URL
         * @param {string | null} siteId - Site identifier
         */
        constructor(apiUrl, siteId) {
          this.apiUrl = apiUrl;
          this.siteId = siteId;
          this.enabled = !!(apiUrl && siteId);
        }
        /**
         * Update configuration (called when RSCMP finishes initialization)
         * @param {string} apiUrl - Backend API URL
         * @param {string} siteId - Site identifier
         * @returns {void}
         */
        configure(apiUrl, siteId) {
          this.apiUrl = apiUrl;
          this.siteId = siteId;
          this.enabled = !!(apiUrl && siteId);
        }
        /**
         * Fetch server-detected cookies from the backend.
         * The backend endpoint inspects Set-Cookie headers from upstream responses
         * and returns cookies that are not visible to client-side JavaScript.
         * @returns {Promise<DetectedCookie[]>} Array of server-detected cookies
         */
        fetchServerCookies() {
          return __async(this, null, function* () {
            if (!this.enabled) {
              return [];
            }
            try {
              const response = yield fetch(
                `${this.apiUrl}/v1/site/${this.siteId}/server-cookies`,
                {
                  method: "GET",
                  headers: { "Content-Type": "application/json" },
                  credentials: "same-origin"
                }
              );
              if (!response.ok) {
                console.warn(`[ServerCookieCollector] Endpoint returned ${response.status}, server-side cookie detection not available`);
                return [];
              }
              const data = yield response.json();
              return Array.isArray(data.cookies) ? data.cookies : [];
            } catch (error) {
              console.warn("[ServerCookieCollector] Server-side cookie detection not available:", error.message);
              return [];
            }
          });
        }
        /**
         * Report client-observed Set-Cookie headers from navigation responses.
         * Browsers expose some response headers for same-origin requests.
         * @param {string} url - The URL that was requested
         * @param {Object[]} cookies - Parsed cookie objects from response headers
         * @returns {Promise<void>}
         */
        reportObservedCookies(url, cookies) {
          return __async(this, null, function* () {
            if (!this.enabled || !cookies || cookies.length === 0) {
              return;
            }
            try {
              yield fetch(`${this.apiUrl}/v1/site/${this.siteId}/server-cookies`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  siteId: this.siteId,
                  url,
                  cookies,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                })
              });
            } catch (error) {
              console.warn("[ServerCookieCollector] Failed to report cookies:", error.message);
            }
          });
        }
      };
      var RSCMP = class {
        constructor() {
          this.consentStorage = new ConsentStorage();
          this.consentManager = new ConsentManager(this.consentStorage);
          this.cookieScanner = new CookieScanner();
          this.serverCookieCollector = new ServerCookieCollector(null, null);
          this.scriptBlocker = new ScriptBlocker(this.consentManager);
          this.bannerUI = new BannerUI(this.consentManager, this.cookieScanner, this.scriptBlocker);
          this.googleConsentMode = new GoogleConsentMode(this.consentManager);
          this.config = null;
          this.siteId = null;
          this.debugMode = false;
          this.reopenButton = null;
        }
        /**
         * Initialize the CMP
         * @param {Config | null} [inlineConfig] - Optional inline configuration
         * @returns {Promise<void>}
         */
        init(inlineConfig = null) {
          return __async(this, null, function* () {
            try {
              this.siteId = this.getSiteIdFromScript();
              if (inlineConfig) {
                this.config = this.mergeWithDefaults(inlineConfig);
              } else if (this.siteId) {
                try {
                  this.config = yield this.loadConfig(this.siteId);
                } catch (apiError) {
                  console.warn("[RS-CMP] Failed to load config from API, using default configuration:", apiError.message);
                  this.config = this.getDefaultConfig();
                }
              } else {
                this.config = this.getDefaultConfig();
              }
              const apiUrl = this.getApiUrl();
              if (this.siteId) {
                this.serverCookieCollector.configure(apiUrl, this.siteId);
                this.serverCookieCollector.fetchServerCookies().then((serverCookies) => {
                  if (serverCookies.length > 0) {
                    this.cookieScanner.mergeServerCookies(serverCookies);
                  }
                }).catch((err) => {
                  console.warn("[RS-CMP] Server-side cookie detection skipped:", err.message);
                });
              }
              const existingConsent = this.consentStorage.getConsent();
              if (existingConsent) {
                this.applyConsent(existingConsent.categories, false);
                this.showReopenButton();
              } else {
                this.scriptBlocker.blockScripts();
                this.bannerUI.show(this.config);
              }
              this.consentManager.on("consentUpdated", (categories) => {
                this.applyConsent(categories, true);
              });
              this.consentManager.on("bannerClosed", () => {
                this.showReopenButton();
              });
            } catch (error) {
              console.error("[RS-CMP] Initialization error:", error);
            }
          });
        }
        /**
         * Get site-id from script tag
         * @private
         * @returns {string | null} Site ID or null
         */
        getSiteIdFromScript() {
          const scripts = document.querySelectorAll("script[data-site-id]");
          if (scripts.length > 0) {
            return scripts[0].getAttribute("data-site-id");
          }
          return null;
        }
        /**
         * Check if auto-init is enabled
         * @private
         * @returns {boolean} True if auto-init should happen (default), false if manual init required
         */
        shouldAutoInit() {
          const scripts = document.querySelectorAll("script[data-site-id]");
          if (scripts.length > 0) {
            const autoInit = scripts[0].getAttribute("data-auto-init");
            return autoInit !== "false";
          }
          return true;
        }
        /**
         * Load configuration from API
         * @private
         * @param {string} siteId - Site identifier
         * @returns {Promise<Config>} Configuration
         */
        loadConfig(siteId) {
          return __async(this, null, function* () {
            const apiUrl = this.getApiUrl();
            const configUrl = `${apiUrl}/v1/site/${siteId}/config`;
            const response = yield fetch(configUrl);
            if (!response.ok) {
              throw new Error(`Failed to load config from ${configUrl}: ${response.status}`);
            }
            return response.json();
          });
        }
        /**
         * Get API URL (can be overridden with data-api-url attribute)
         * @private
         * @returns {string} API URL
         */
        getApiUrl() {
          const scripts = document.querySelectorAll("script[data-site-id]");
          if (scripts.length > 0) {
            const customUrl = scripts[0].getAttribute("data-api-url");
            if (customUrl)
              return customUrl;
          }
          return "https://api.rs-cmp.com";
        }
        /**
         * Apply consent to scripts and services
         * @private
         * @param {ConsentCategories} categories - Consent categories
         * @param {boolean} shouldReload - Whether to reload the page after applying consent (deprecated, kept for backwards compatibility)
         * @returns {void}
         */
        applyConsent(categories, shouldReload = false) {
          const categoriesToDelete = [];
          if (!categories.analytics)
            categoriesToDelete.push("analytics");
          if (!categories.marketing)
            categoriesToDelete.push("marketing");
          if (!categories.preferences)
            categoriesToDelete.push("preferences");
          if (categoriesToDelete.length > 0) {
            this.cookieScanner.deleteCookiesByCategory(categoriesToDelete);
          }
          this.scriptBlocker.unblockScripts(categories);
          this.googleConsentMode.update(categories);
          this.cookieScanner.scanOnConsentChange();
          if (this.siteId && this.config) {
            this.sendConsentToBackend(categories);
          }
          if (shouldReload) {
            console.log("[RS-CMP] Page reload requested but skipped - using hot-swapping instead");
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
          console.log("[RS-CMP] Debug mode enabled");
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
            console.log("[RS-CMP]", ...args);
          }
        }
        /**
         * Enable or disable debug mode
         * @param {boolean} enabled - Whether debug mode is enabled
         * @returns {void}
         */
        setDebugMode(enabled) {
          this.debugMode = enabled;
          this.cookieScanner.setDebugMode(enabled);
          console.log(`[RS-CMP] Debug mode ${enabled ? "enabled" : "disabled"}`);
        }
        /**
         * Handle new cookie detection
         * @param {DetectedCookie} cookie - Newly detected cookie
         * @returns {void}
         */
        handleNewCookie(cookie) {
          this.log("New cookie detected:", cookie.name, "Category:", cookie.category);
          if (this.siteId && this.config) {
            const now = Date.now();
            if (!this._lastCookieReport || now - this._lastCookieReport > 1e4) {
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
         * Get only server-detected cookies (HttpOnly, redirect, async, CDN/pixel)
         * @returns {DetectedCookie[]} Array of server-detected cookies
         */
        getServerDetectedCookies() {
          return this.cookieScanner.getAllCookies().filter((c) => c.source === "server");
        }
        /**
         * Manually trigger server-side cookie fetch and merge
         * @returns {Promise<DetectedCookie[]>} Array of server-detected cookies
         */
        fetchServerCookies() {
          return __async(this, null, function* () {
            const serverCookies = yield this.serverCookieCollector.fetchServerCookies();
            if (serverCookies.length > 0) {
              this.cookieScanner.mergeServerCookies(serverCookies);
            }
            return serverCookies;
          });
        }
        /**
         * Send cookie report to backend
         * @returns {Promise<void>}
         */
        sendCookieReportToBackend() {
          return __async(this, null, function* () {
            if (!this.siteId || !this.config) {
              return;
            }
            try {
              const apiUrl = this.getApiUrl();
              yield this.cookieScanner.sendReportToBackend(apiUrl, this.siteId);
            } catch (error) {
              console.error("[RS-CMP] Failed to send cookie report:", error);
            }
          });
        }
        /**
         * Get CMP status (diagnostic method)
         * @returns {Object} Status information
         */
        getStatus() {
          const allCookies = this.cookieScanner.getAllCookies();
          return {
            initialized: !!this.config,
            siteId: this.siteId,
            consent: this.consentManager.getConsent(),
            blockedScripts: this.scriptBlocker.blockedScripts.length,
            bannerVisible: !!this.bannerUI.bannerElement,
            detectedCookies: allCookies.length,
            clientDetectedCookies: allCookies.filter((c) => c.source === "client").length,
            serverDetectedCookies: allCookies.filter((c) => c.source === "server").length,
            cookieCategories: {
              necessary: this.cookieScanner.getCookiesByCategory("necessary").length,
              analytics: this.cookieScanner.getCookiesByCategory("analytics").length,
              marketing: this.cookieScanner.getCookiesByCategory("marketing").length,
              preferences: this.cookieScanner.getCookiesByCategory("preferences").length
            }
          };
        }
        /**
         * Test Google Consent Mode
         * @returns {void}
         */
        testConsentMode() {
          if (typeof window.gtag === "function") {
            console.log("[RS-CMP] Testing Google Consent Mode...");
            window.gtag("get", "G-XXXXXX", "consent", (consent) => {
              console.log("[RS-CMP] Current consent state:", consent);
            });
          } else {
            console.warn("[RS-CMP] gtag not available");
          }
        }
        /**
         * Get default configuration
         * @returns {Config} Default configuration
         */
        getDefaultConfig() {
          return {
            siteId: "default",
            siteName: "Website",
            domain: window.location.hostname,
            policyVersion: "1.0",
            banner: {
              position: "bottom",
              layout: "bar",
              primaryColor: "#0084ff",
              backgroundColor: "#ffffff",
              textColor: "#000000",
              buttonTextColor: "#ffffff",
              showLogo: false
            },
            categories: [
              { id: "necessary", name: "Necessary", description: "Required for site functionality", required: true, enabled: true },
              { id: "analytics", name: "Analytics", description: "Help us improve", required: false, enabled: false },
              { id: "marketing", name: "Marketing", description: "Personalized ads", required: false, enabled: false },
              { id: "preferences", name: "Preferences", description: "Remember your choices", required: false, enabled: false }
            ],
            translations: {
              it: {
                title: "Rispettiamo la tua privacy",
                description: "Utilizziamo i cookie per finalit\xE0 tecniche e, con il tuo consenso, anche per le finalit\xE0 di esperienza, analisi e marketing come specificato nella cookie policy. Puoi liberamente prestare, rifiutare o revocare il tuo consenso, in qualsiasi momento, accedendo al pannello delle preferenze. Il rifiuto del consenso pu\xF2 rendere non disponibili le relative funzioni.",
                acceptAll: "Accetta tutto",
                rejectAll: "Rifiuta tutto",
                customize: "Personalizza",
                save: "Salva preferenze",
                close: "Chiudi",
                privacyPolicy: "Privacy Policy",
                cookiePolicy: "Cookie Policy",
                categories: {
                  necessary: { name: "Necessari", description: "Cookie essenziali per il funzionamento del sito" },
                  analytics: { name: "Analitici", description: "Statistiche di utilizzo per migliorare il sito" },
                  marketing: { name: "Marketing", description: "Cookie pubblicitari per annunci personalizzati" },
                  preferences: { name: "Preferenze", description: "Le tue impostazioni personalizzate" }
                }
              },
              en: {
                title: "We respect your privacy",
                description: "We use cookies to improve your experience.",
                acceptAll: "Accept All",
                rejectAll: "Reject All",
                customize: "Customize",
                save: "Save Preferences",
                close: "Close",
                privacyPolicy: "Privacy Policy",
                cookiePolicy: "Cookie Policy",
                categories: {
                  necessary: { name: "Necessary", description: "Essential cookies" },
                  analytics: { name: "Analytics", description: "Usage statistics" },
                  marketing: { name: "Marketing", description: "Advertising cookies" },
                  preferences: { name: "Preferences", description: "Your settings" }
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
          return __spreadProps(__spreadValues(__spreadValues({}, defaults), config), {
            banner: __spreadValues(__spreadValues({}, defaults.banner), config.banner || {}),
            categories: config.categories || defaults.categories,
            translations: __spreadValues(__spreadValues({}, defaults.translations), config.translations || {})
          });
        }
        /**
         * Show reopen button (fixed bottom-left)
         * @returns {void}
         */
        showReopenButton() {
          if (this.reopenButton) {
            return;
          }
          const button = document.createElement("button");
          button.id = "rs-cmp-reopen-btn";
          button.setAttribute("aria-label", "Privacy Settings");
          button.title = "Privacy Settings";
          button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" fill="currentColor"/>
      </svg>
    `;
          if (!document.getElementById("rs-cmp-reopen-styles")) {
            const style = document.createElement("style");
            style.id = "rs-cmp-reopen-styles";
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
            const nonce = getNonce();
            if (nonce) {
              style.setAttribute("nonce", nonce);
            }
            document.head.appendChild(style);
          }
          button.addEventListener("click", () => {
            this.showPreferences();
          });
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
        sendConsentToBackend(categories) {
          return __async(this, null, function* () {
            try {
              const apiUrl = this.getApiUrl();
              yield fetch(`${apiUrl}/v1/consent`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  siteId: this.siteId,
                  categories,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                  version: this.config ? this.config.policyVersion : "1.0"
                })
              });
            } catch (error) {
              console.error("[RS-CMP] Failed to send consent:", error);
            }
          });
        }
      };
      var cmpInstance = new RSCMP();
      if (typeof window !== "undefined") {
        if (document.readyState === "loading") {
          cmpInstance.scriptBlocker.blockScripts();
        } else {
          cmpInstance.scriptBlocker.blockScripts();
        }
        window.RSCMP = cmpInstance;
        const autoInit = cmpInstance.shouldAutoInit();
        if (autoInit) {
          console.log("[RS-CMP] Auto-initializing...");
          cmpInstance.init().catch((err) => {
            console.error("[RS-CMP] Auto-initialization failed:", err);
          });
        } else {
          console.log("[RS-CMP] Manual init required. Call window.RSCMP.init() to initialize.");
        }
      }
      if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
        module.exports = cmpInstance;
      }
    }
  });
  return require_cmp();
})();
