/**
 * RS-CMP - GDPR-Compliant Consent Management Platform
 * Consolidated SDK - All-in-one file
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ConsentCategories {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

export interface ConsentData {
  categories: ConsentCategories;
  timestamp: string;
  version: string;
}

export interface Config {
  siteId: string;
  siteName: string;
  domain: string;
  policyVersion: string;
  banner: BannerConfig;
  categories: CategoryConfig[];
  translations: { [locale: string]: Translations };
}

export interface BannerConfig {
  position: 'bottom' | 'top' | 'center';
  layout: 'bar' | 'box' | 'modal';
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonTextColor: string;
  showLogo: boolean;
  logoUrl?: string;
}

export interface CategoryConfig {
  id: string;
  name: string;
  description: string;
  required: boolean;
  enabled: boolean;
}

export interface Translations {
  title: string;
  description: string;
  acceptAll: string;
  rejectAll: string;
  customize: string;
  save: string;
  close: string;
  categories: { [categoryId: string]: CategoryTranslation };
}

export interface CategoryTranslation {
  name: string;
  description: string;
}

export type ConsentEventType = 'consentUpdated' | 'bannerShown' | 'bannerClosed';

export type ConsentEventHandler = (data: any) => void;

// ============================================================================
// TCF 2.2 TYPES
// ============================================================================

export interface TCFVendor {
  id: number;
  name: string;
  purposes: number[];
  specialPurposes: number[];
  features: number[];
  specialFeatures: number[];
}

export interface TCFPurpose {
  id: number;
  name: string;
  description: string;
}

export interface TCFData {
  tcString: string;
  tcfPolicyVersion: number;
  cmpId: number;
  cmpVersion: number;
  gdprApplies: boolean;
  purposeConsents: { [purposeId: number]: boolean };
  vendorConsents: { [vendorId: number]: boolean };
}

// ============================================================================
// COOKIE SCANNER TYPES
// ============================================================================

export interface DetectedCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  category?: string;
  expires?: string;
}

export interface CookieScanReport {
  timestamp: string;
  cookies: DetectedCookie[];
  autoCategories: { [cookieName: string]: string };
}

// ============================================================================
// CONSENT STORAGE
// ============================================================================

const STORAGE_KEY = 'rs-cmp-consent';
const COOKIE_NAME = 'rs-cmp-consent';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

class ConsentStorage {
  /**
   * Save consent to localStorage and cookie
   */
  saveConsent(consent: ConsentData): void {
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
   */
  getConsent(): ConsentData | null {
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
   */
  clearConsent(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('[RS-CMP] Failed to clear localStorage:', error);
    }

    this.deleteCookie(COOKIE_NAME);
  }

  /**
   * Set a cookie
   */
  private setCookie(name: string, value: string, maxAge: number): void {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax${secure}`;
  }

  /**
   * Get a cookie value
   */
  private getCookie(name: string): string | null {
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
   */
  private deleteCookie(name: string): void {
    document.cookie = `${name}=; max-age=0; path=/`;
  }
}

// ============================================================================
// CONSENT MANAGER
// ============================================================================

class ConsentManager {
  private eventHandlers: Map<ConsentEventType, ConsentEventHandler[]> = new Map();
  private storage: ConsentStorage;

  constructor(storage: ConsentStorage) {
    this.storage = storage;
  }

  /**
   * Set user consent for categories
   */
  setConsent(categories: ConsentCategories, version: string): void {
    const consentData = {
      categories,
      timestamp: new Date().toISOString(),
      version,
    };

    this.storage.saveConsent(consentData);
    this.emit('consentUpdated', categories);
  }

  /**
   * Get current consent
   */
  getConsent(): ConsentCategories | null {
    const consent = this.storage.getConsent();
    return consent ? consent.categories : null;
  }

  /**
   * Accept all categories
   */
  acceptAll(version: string): void {
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
   */
  rejectAll(version: string): void {
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
   */
  hasConsent(category: keyof ConsentCategories): boolean {
    const consent = this.getConsent();
    return consent ? consent[category] : false;
  }

  /**
   * Event emitter - register handler
   */
  on(event: ConsentEventType, handler: ConsentEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Event emitter - emit event
   */
  emit(event: ConsentEventType, data: any): void {
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
  private consentManager: ConsentManager;
  private blockedScripts: HTMLScriptElement[] = [];

  constructor(consentManager: ConsentManager) {
    this.consentManager = consentManager;
  }

  /**
   * Block all scripts that require consent
   */
  blockScripts(): void {
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

      this.blockedScripts.push(script as HTMLScriptElement);
    });

    // Also scan for common tracking scripts
    this.scanAndBlockCommonScripts();
  }

  /**
   * Unblock scripts based on consent categories
   */
  unblockScripts(categories: ConsentCategories): void {
    this.blockedScripts.forEach((script) => {
      const category = script.getAttribute('data-category') as keyof ConsentCategories;
      
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
        script.parentNode?.replaceChild(newScript, script);
      }
    });

    // Unblock common tracking scripts
    this.unblockCommonScripts(categories);
  }

  /**
   * Scan and block common tracking scripts (gtag, GA4, Meta Pixel, etc.)
   */
  private scanAndBlockCommonScripts(): void {
    // Block Google Analytics / gtag
    const gtagScripts = document.querySelectorAll('script[src*="googletagmanager.com/gtag"]');
    gtagScripts.forEach((script) => {
      if (!script.getAttribute('data-category')) {
        script.setAttribute('data-category', 'analytics');
        script.setAttribute('type', 'text/plain');
        this.blockedScripts.push(script as HTMLScriptElement);
      }
    });

    // Block Facebook Pixel
    const fbScripts = document.querySelectorAll('script[src*="connect.facebook.net"]');
    fbScripts.forEach((script) => {
      if (!script.getAttribute('data-category')) {
        script.setAttribute('data-category', 'marketing');
        script.setAttribute('type', 'text/plain');
        this.blockedScripts.push(script as HTMLScriptElement);
      }
    });

    // Block Hotjar
    const hotjarScripts = document.querySelectorAll('script[src*="hotjar.com"]');
    hotjarScripts.forEach((script) => {
      if (!script.getAttribute('data-category')) {
        script.setAttribute('data-category', 'analytics');
        script.setAttribute('type', 'text/plain');
        this.blockedScripts.push(script as HTMLScriptElement);
      }
    });
  }

  /**
   * Unblock common tracking scripts based on consent
   */
  private unblockCommonScripts(categories: ConsentCategories): void {
    // Initialize gtag if analytics is consented
    if (categories.analytics && typeof (window as any).gtag === 'function') {
      (window as any).gtag('consent', 'update', {
        analytics_storage: 'granted',
      });
    }

    // Initialize Facebook Pixel if marketing is consented
    if (categories.marketing && typeof (window as any).fbq === 'function') {
      (window as any).fbq('consent', 'grant');
    }
  }
}

// ============================================================================
// GOOGLE CONSENT MODE
// ============================================================================

class GoogleConsentMode {
  private consentManager: ConsentManager;

  constructor(consentManager: ConsentManager) {
    this.consentManager = consentManager;
    this.initializeDefaultConsent();
  }

  /**
   * Initialize default consent state (denied for all)
   */
  private initializeDefaultConsent(): void {
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('consent', 'default', {
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
   */
  update(categories: ConsentCategories): void {
    if (typeof (window as any).gtag !== 'function') {
      // gtag not available, try to initialize
      this.initializeGtag();
    }

    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('consent', 'update', {
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
   */
  private initializeGtag(): void {
    if (typeof (window as any).gtag === 'undefined') {
      // Create gtag function
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).gtag = function(...args: any[]) {
        (window as any).dataLayer.push(args);
      };
      (window as any).gtag('js', new Date());
    }
  }
}

// ============================================================================
// TCF 2.2 MANAGER
// ============================================================================

class TCFManager {
  private tcfVersion = 2.2;
  private cmpId = 1; // Should be assigned by IAB
  private cmpVersion = 1;
  private vendors: Map<number, TCFVendor> = new Map();
  private purposes: Map<number, TCFPurpose> = new Map();
  private consentManager: ConsentManager;
  private tcfData: TCFData | null = null;

  constructor(consentManager: ConsentManager) {
    this.consentManager = consentManager;
    this.initializeDefaultPurposes();
    this.initializeDefaultVendors();
    this.setupTCFAPI();
  }

  /**
   * Initialize IAB TCF 2.2 standard purposes
   */
  private initializeDefaultPurposes(): void {
    // Standard IAB TCF 2.2 Purposes
    this.purposes.set(1, {
      id: 1,
      name: 'Store and/or access information on a device',
      description: 'Cookies, device identifiers, or other information can be stored or accessed on your device for the purposes presented to you.',
    });
    this.purposes.set(2, {
      id: 2,
      name: 'Select basic ads',
      description: 'Ads can be shown to you based on the content you\'re viewing, the app you\'re using, your approximate location, or your device type.',
    });
    this.purposes.set(3, {
      id: 3,
      name: 'Create a personalised ads profile',
      description: 'A profile can be built about you and your interests to show you personalised ads that are relevant to you.',
    });
    this.purposes.set(4, {
      id: 4,
      name: 'Select personalised ads',
      description: 'Personalised ads can be shown to you based on a profile about you.',
    });
    this.purposes.set(7, {
      id: 7,
      name: 'Measure ad performance',
      description: 'The performance and effectiveness of ads that you see or interact with can be measured.',
    });
    this.purposes.set(8, {
      id: 8,
      name: 'Measure content performance',
      description: 'The performance and effectiveness of content that you see or interact with can be measured.',
    });
    this.purposes.set(9, {
      id: 9,
      name: 'Apply market research to generate audience insights',
      description: 'Market research can be used to learn more about the audiences who visit sites/apps and view ads.',
    });
    this.purposes.set(10, {
      id: 10,
      name: 'Develop and improve products',
      description: 'Your data can be used to improve existing systems and software, and to develop new products.',
    });
  }

  /**
   * Initialize common vendors (Google, Meta, etc.)
   */
  private initializeDefaultVendors(): void {
    // Google
    this.vendors.set(755, {
      id: 755,
      name: 'Google Advertising Products',
      purposes: [1, 2, 3, 4, 7, 8, 9, 10],
      specialPurposes: [1, 2],
      features: [1, 2, 3],
      specialFeatures: [1, 2],
    });
    
    // Meta (Facebook)
    this.vendors.set(138, {
      id: 138,
      name: 'Meta Platforms Ireland Limited',
      purposes: [1, 2, 3, 4, 7, 9, 10],
      specialPurposes: [1, 2],
      features: [1, 2],
      specialFeatures: [1],
    });
  }

  /**
   * Setup window.__tcfapi according to IAB TCF 2.2 spec
   */
  private setupTCFAPI(): void {
    if (typeof window !== 'undefined') {
      (window as any).__tcfapi = (
        command: string,
        version: number,
        callback: (data: any, success: boolean) => void,
        parameter?: any
      ) => {
        switch (command) {
          case 'ping':
            callback(
              {
                gdprApplies: true,
                cmpLoaded: true,
                cmpStatus: 'loaded',
                displayStatus: 'visible',
                apiVersion: '2.2',
                cmpVersion: this.cmpVersion,
                cmpId: this.cmpId,
                gvlVersion: 1,
                tcfPolicyVersion: 2,
              },
              true
            );
            break;

          case 'getTCData':
            this.getTCData(callback, parameter);
            break;

          case 'getVendorList':
            this.getVendorList(callback, parameter);
            break;

          case 'addEventListener':
            this.addEventListener(callback);
            break;

          case 'removeEventListener':
            // Not implemented in minimal version
            callback({ success: true }, true);
            break;

          default:
            callback({ msg: 'Command not supported' }, false);
        }
      };
    }
  }

  /**
   * Get TC Data for __tcfapi
   */
  private getTCData(callback: (data: any, success: boolean) => void, parameter?: any): void {
    const consent = this.consentManager.getConsent();
    const tcData = this.generateTCData(consent?.categories);
    
    callback(tcData, true);
  }

  /**
   * Get vendor list for __tcfapi
   */
  private getVendorList(callback: (data: any, success: boolean) => void, parameter?: any): void {
    const vendorList = {
      gvlSpecificationVersion: 2,
      vendorListVersion: 1,
      tcfPolicyVersion: 2,
      lastUpdated: new Date().toISOString(),
      purposes: Array.from(this.purposes.values()),
      vendors: Array.from(this.vendors.values()),
    };
    
    callback(vendorList, true);
  }

  /**
   * Add event listener for __tcfapi
   */
  private addEventListener(callback: (data: any, success: boolean) => void): void {
    // Listen for consent changes
    this.consentManager.on('consentUpdated', () => {
      const consent = this.consentManager.getConsent();
      const tcData = this.generateTCData(consent?.categories);
      callback(tcData, true);
    });
  }

  /**
   * Generate TC Data from consent categories
   */
  private generateTCData(categories?: ConsentCategories): any {
    if (!categories) {
      categories = {
        necessary: true,
        analytics: false,
        marketing: false,
        preferences: false,
      };
    }

    // Map consent categories to IAB purposes
    const purposeConsents: { [key: number]: boolean } = {
      1: categories.necessary, // Store and access information
      2: categories.marketing, // Select basic ads
      3: categories.marketing, // Create personalised ads profile
      4: categories.marketing, // Select personalised ads
      7: categories.marketing, // Measure ad performance
      8: categories.analytics, // Measure content performance
      9: categories.analytics, // Apply market research
      10: categories.preferences, // Develop and improve products
    };

    // Generate vendor consents based on purposes
    const vendorConsents: { [key: number]: boolean } = {};
    this.vendors.forEach((vendor, vendorId) => {
      // Vendor is consented if all its purposes are consented
      const allPurposesConsented = vendor.purposes.every(
        (purposeId) => purposeConsents[purposeId]
      );
      vendorConsents[vendorId] = allPurposesConsented;
    });

    const tcData = {
      tcString: this.generateTCString(purposeConsents, vendorConsents),
      tcfPolicyVersion: 2,
      cmpId: this.cmpId,
      cmpVersion: this.cmpVersion,
      gdprApplies: true,
      eventStatus: 'useractioncomplete',
      cmpStatus: 'loaded',
      listenerId: undefined,
      isServiceSpecific: true,
      useNonStandardStacks: false,
      publisherCC: 'IT', // Can be configured per site
      purposeOneTreatment: false,
      outOfBand: {
        allowedVendors: {},
        disclosedVendors: {},
      },
      purpose: {
        consents: purposeConsents,
        legitimateInterests: {},
      },
      vendor: {
        consents: vendorConsents,
        legitimateInterests: {},
      },
      specialFeatureOptins: {},
      publisher: {
        consents: {},
        legitimateInterests: {},
        customPurpose: {
          consents: {},
          legitimateInterests: {},
        },
        restrictions: {},
      },
    };

    this.tcfData = {
      tcString: tcData.tcString,
      tcfPolicyVersion: tcData.tcfPolicyVersion,
      cmpId: tcData.cmpId,
      cmpVersion: tcData.cmpVersion,
      gdprApplies: tcData.gdprApplies,
      purposeConsents,
      vendorConsents,
    };

    return tcData;
  }

  /**
   * Generate TCF String (TC String encoding according to IAB spec)
   * This is a simplified version - production should use a proper IAB encoder library
   */
  generateTCString(
    purposeConsents: { [key: number]: boolean },
    vendorConsents: { [key: number]: boolean }
  ): string {
    // Simplified TCF String generation
    // Real implementation should follow IAB TCF 2.2 encoding spec
    // Format: CPXxxx... (base64url encoded binary data)
    
    const version = 2; // TCF version 2
    const created = Math.floor(Date.now() / 100); // Deciseconds since epoch
    const updated = created;
    
    // Convert consents to bit strings
    const purposeBits = Array.from({ length: 24 }, (_, i) => 
      purposeConsents[i + 1] ? '1' : '0'
    ).join('');
    
    const vendorBits = Array.from({ length: 1000 }, (_, i) => 
      vendorConsents[i + 1] ? '1' : '0'
    ).join('');
    
    // Create a simple encoded string (simplified - not full IAB spec)
    // In production, use @iabtcf/core library for proper encoding
    const data = {
      v: version,
      c: created,
      u: updated,
      p: purposeBits,
      vl: vendorBits.substring(0, 100), // Limit for simplicity
    };
    
    // Base64 encode (simplified)
    const jsonStr = JSON.stringify(data);
    const b64 = typeof btoa !== 'undefined' ? btoa(jsonStr) : Buffer.from(jsonStr).toString('base64');
    
    // Add CP prefix (Consent Purposes) as per IAB spec
    return `CP${b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}`;
  }

  /**
   * Get current TCF data
   */
  getTCFData(): TCFData | null {
    return this.tcfData;
  }

  /**
   * Update TCF data when consent changes
   */
  updateFromConsent(categories: ConsentCategories): void {
    this.generateTCData(categories);
  }
}

// ============================================================================
// COOKIE SCANNER
// ============================================================================

class CookieScanner {
  private cookies: Map<string, DetectedCookie> = new Map();
  private scanInterval: number | null = null;
  private mutationObserver: MutationObserver | null = null;
  private onScanComplete?: (report: CookieScanReport) => void;

  constructor() {
    this.initializeCookieDatabase();
  }

  /**
   * Initialize database of known cookies for categorization
   */
  private initializeCookieDatabase(): void {
    // This would typically be a much larger database
    // or call to an external categorization service
  }

  /**
   * Scan all cookies on the page
   */
  async scanCookies(): Promise<CookieScanReport> {
    // 1. Detect all first-party cookies
    this.detectCurrentCookies();

    // 2. Start monitoring for new cookies
    this.watchCookieChanges();

    // 3. Categorize cookies automatically
    const categorized = this.categorizeCookies();

    // 4. Create report
    const report: CookieScanReport = {
      timestamp: new Date().toISOString(),
      cookies: Array.from(this.cookies.values()),
      autoCategories: categorized,
    };

    return report;
  }

  /**
   * Detect current cookies from document.cookie
   */
  private detectCurrentCookies(): void {
    if (typeof document === 'undefined') return;

    const cookieString = document.cookie;
    if (!cookieString) return;

    const cookiePairs = cookieString.split(';');
    
    for (const pair of cookiePairs) {
      const [name, value] = pair.trim().split('=');
      if (name && !this.cookies.has(name)) {
        this.cookies.set(name, {
          name,
          value: value || '',
          domain: window.location.hostname,
          path: '/',
        });
      }
    }
  }

  /**
   * Watch for cookie changes using MutationObserver and polling
   */
  private watchCookieChanges(): void {
    if (typeof window === 'undefined') return;

    // MutationObserver for script tags
    if (typeof MutationObserver !== 'undefined') {
      this.mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeName === 'SCRIPT') {
              // Re-scan cookies when new scripts are added
              setTimeout(() => this.detectCurrentCookies(), 100);
            }
          });
        });
      });

      this.mutationObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    }

    // Polling for cookie changes every 2 seconds
    this.scanInterval = window.setInterval(() => {
      this.detectCurrentCookies();
    }, 2000);
  }

  /**
   * Stop watching for cookie changes
   */
  stopWatching(): void {
    if (this.scanInterval !== null) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }

  /**
   * Automatically categorize cookies based on known patterns
   */
  private categorizeCookies(): { [cookieName: string]: string } {
    const categories: { [cookieName: string]: string } = {};

    // Known cookie patterns for automatic categorization
    const patterns = {
      analytics: [
        '_ga', '_gid', '_gat', '_gac', // Google Analytics
        '__utma', '__utmb', '__utmc', '__utmz', '__utmt', // Legacy Google Analytics
        '_clck', '_clsk', 'CLID', 'ANONCHK', 'MR', 'MUID', 'SM', // Microsoft Clarity
        '_hjid', '_hjSessionUser', '_hjFirstSeen', '_hjSession', // Hotjar
        'mp_', 'mixpanel', // Mixpanel
        'amplitude_', // Amplitude
      ],
      marketing: [
        '_fbp', '_fbc', 'fr', // Facebook/Meta
        '_ttp', '_tt_enable_cookie', '_ttp_', // TikTok
        '_gcl_', '_gac_', // Google Ads Conversion
        'IDE', 'test_cookie', // DoubleClick
        '__Secure-', '__Host-', // Secure cookies often used for ads
      ],
      necessary: [
        'rs-cmp-consent', // Our consent cookie
        'PHPSESSID', 'JSESSIONID', // Session cookies
        'csrftoken', 'csrf_token', '_csrf', // CSRF tokens
        'cookie_notice', 'gdpr', 'privacy', // Consent-related
      ],
      preferences: [
        'lang', 'language', 'locale', // Language preferences
        'theme', 'dark_mode', // Theme preferences
        'timezone', 'tz', // Timezone
      ],
    };

    this.cookies.forEach((cookie, name) => {
      let category = 'unclassified';

      // Check each pattern
      for (const [cat, patterns_list] of Object.entries(patterns)) {
        for (const pattern of patterns_list) {
          if (name.includes(pattern) || name.startsWith(pattern)) {
            category = cat;
            break;
          }
        }
        if (category !== 'unclassified') break;
      }

      categories[name] = category;
      
      // Update cookie with category
      const cookieData = this.cookies.get(name);
      if (cookieData) {
        cookieData.category = category;
      }
    });

    return categories;
  }

  /**
   * Get all detected cookies
   */
  getDetectedCookies(): DetectedCookie[] {
    return Array.from(this.cookies.values());
  }

  /**
   * Send cookie report to backend
   */
  async sendReportToBackend(siteId: string, apiUrl: string): Promise<void> {
    const report = await this.scanCookies();
    
    try {
      await fetch(`${apiUrl}/v1/cookies/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId,
          ...report,
        }),
      });
    } catch (error) {
      console.error('[RS-CMP] Failed to send cookie report:', error);
    }
  }

  /**
   * Set callback for scan completion
   */
  onScan(callback: (report: CookieScanReport) => void): void {
    this.onScanComplete = callback;
  }
}

// ============================================================================
// BANNER UI
// ============================================================================

class BannerUI {
  private consentManager: ConsentManager;
  private bannerElement: HTMLElement | null = null;
  private config: Config | null = null;

  constructor(consentManager: ConsentManager) {
    this.consentManager = consentManager;
  }

  /**
   * Show the consent banner
   */
  show(config: Config): void {
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
   */
  hide(): void {
    if (this.bannerElement) {
      this.bannerElement.remove();
      this.bannerElement = null;
      this.consentManager.emit('bannerClosed', {});
    }
  }

  /**
   * Create banner HTML
   */
  private createBanner(config: Config, translations: Translations): HTMLElement {
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
   */
  private applyStyles(banner: HTMLElement, config: Config): void {
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
   */
  private getPositionStyles(position: string, layout: string): string {
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
   */
  private attachEventListeners(banner: HTMLElement): void {
    const acceptBtn = banner.querySelector('#rs-cmp-accept-all');
    const rejectBtn = banner.querySelector('#rs-cmp-reject-all');
    const customizeBtn = banner.querySelector('#rs-cmp-customize');

    acceptBtn?.addEventListener('click', () => {
      this.consentManager.acceptAll(this.config?.policyVersion || '1.0');
      this.hide();
    });

    rejectBtn?.addEventListener('click', () => {
      this.consentManager.rejectAll(this.config?.policyVersion || '1.0');
      this.hide();
    });

    customizeBtn?.addEventListener('click', () => {
      this.showCustomizeModal();
    });
  }

  /**
   * Show customize modal with category options
   */
  private showCustomizeModal(): void {
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
              <label>
                <input 
                  type="checkbox" 
                  name="${cat.id}" 
                  ${cat.required ? 'checked disabled' : ''}
                  ${cat.enabled ? 'checked' : ''}
                />
                <div>
                  <strong>${this.escapeHtml(translations.categories[cat.id]?.name || cat.name)}</strong>
                  <p>${this.escapeHtml(translations.categories[cat.id]?.description || cat.description)}</p>
                </div>
              </label>
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
    modal.querySelector('#rs-cmp-save-preferences')?.addEventListener('click', () => {
      const categories: ConsentCategories = {
        necessary: true, // Always true
        analytics: (modal.querySelector('input[name="analytics"]') as HTMLInputElement)?.checked || false,
        marketing: (modal.querySelector('input[name="marketing"]') as HTMLInputElement)?.checked || false,
        preferences: (modal.querySelector('input[name="preferences"]') as HTMLInputElement)?.checked || false,
      };
      
      this.consentManager.setConsent(categories, this.config?.policyVersion || '1.0');
      modal.remove();
      this.hide();
    });

    modal.querySelector('#rs-cmp-close-modal')?.addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelector('.rs-cmp-modal-overlay')?.addEventListener('click', () => {
      modal.remove();
    });
  }

  /**
   * Detect user's language
   */
  private detectLanguage(): string {
    const lang = navigator.language || (navigator as any).userLanguage || 'en';
    return lang.split('-')[0]; // Get base language (e.g., 'en' from 'en-US')
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ============================================================================
// MAIN CMP CLASS
// ============================================================================

class RSCMP {
  private consentManager: ConsentManager;
  private bannerUI: BannerUI;
  private scriptBlocker: ScriptBlocker;
  private consentStorage: ConsentStorage;
  private googleConsentMode: GoogleConsentMode;
  private tcfManager: TCFManager;
  private cookieScanner: CookieScanner;
  private config: Config | null = null;
  private siteId: string | null = null;

  constructor() {
    this.consentStorage = new ConsentStorage();
    this.consentManager = new ConsentManager(this.consentStorage);
    this.bannerUI = new BannerUI(this.consentManager);
    this.scriptBlocker = new ScriptBlocker(this.consentManager);
    this.googleConsentMode = new GoogleConsentMode(this.consentManager);
    this.tcfManager = new TCFManager(this.consentManager);
    this.cookieScanner = new CookieScanner();
  }

  /**
   * Initialize the CMP
   */
  async init(): Promise<void> {
    try {
      // Get site-id from script tag
      this.siteId = this.getSiteIdFromScript();
      
      if (!this.siteId) {
        console.error('[RS-CMP] Missing data-site-id attribute');
        return;
      }

      // Load configuration
      this.config = await this.loadConfig(this.siteId);
      
      // Start automatic cookie scanning
      this.startCookieScanning();
      
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
      this.consentManager.on('consentUpdated', (categories: ConsentCategories) => {
        this.applyConsent(categories);
      });

    } catch (error) {
      console.error('[RS-CMP] Initialization error:', error);
    }
  }

  /**
   * Get site-id from script tag
   */
  private getSiteIdFromScript(): string | null {
    const scripts = document.querySelectorAll('script[data-site-id]');
    if (scripts.length > 0) {
      return scripts[0].getAttribute('data-site-id');
    }
    return null;
  }

  /**
   * Load configuration from API
   */
  private async loadConfig(siteId: string): Promise<Config> {
    const apiUrl = this.getApiUrl();
    const response = await fetch(`${apiUrl}/v1/site/${siteId}/config`);
    
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * Get API URL (can be overridden with data-api-url attribute)
   */
  private getApiUrl(): string {
    const scripts = document.querySelectorAll('script[data-site-id]');
    if (scripts.length > 0) {
      const customUrl = scripts[0].getAttribute('data-api-url');
      if (customUrl) return customUrl;
    }
    return 'https://api.rs-cmp.com'; // Default API URL
  }

  /**
   * Apply consent to scripts and services
   */
  private applyConsent(categories: ConsentCategories): void {
    // Unblock scripts based on consent
    this.scriptBlocker.unblockScripts(categories);
    
    // Update Google Consent Mode
    this.googleConsentMode.update(categories);
    
    // Update TCF 2.2 data
    this.tcfManager.updateFromConsent(categories);
    
    // Send consent to backend
    if (this.siteId && this.config) {
      this.sendConsentToBackend(categories);
    }
  }

  /**
   * Start automatic cookie scanning
   */
  private async startCookieScanning(): Promise<void> {
    try {
      // Perform initial scan
      const report = await this.cookieScanner.scanCookies();
      
      // Log discovered cookies in debug mode
      console.log('[RS-CMP] Cookie scan complete. Found', report.cookies.length, 'cookies');
      
      // Send report to backend if configured
      if (this.siteId) {
        const apiUrl = this.getApiUrl();
        await this.cookieScanner.sendReportToBackend(this.siteId, apiUrl);
      }
    } catch (error) {
      console.error('[RS-CMP] Cookie scanning error:', error);
    }
  }

  /**
   * Get TCF data (for external use)
   */
  getTCFData(): TCFData | null {
    return this.tcfManager.getTCFData();
  }

  /**
   * Get detected cookies (for external use)
   */
  getDetectedCookies(): DetectedCookie[] {
    return this.cookieScanner.getDetectedCookies();
  }

  /**
   * Send consent data to backend
   */
  private async sendConsentToBackend(categories: ConsentCategories): Promise<void> {
    try {
      const apiUrl = this.getApiUrl();
      const tcfData = this.tcfManager.getTCFData();
      
      await fetch(`${apiUrl}/v1/consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId: this.siteId,
          categories,
          timestamp: new Date().toISOString(),
          version: this.config?.policyVersion || '1.0',
          tcfString: tcfData?.tcString,
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
  (window as any).RSCMP = cmp;
}

export default RSCMP;
