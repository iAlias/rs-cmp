/**
 * RS-CMP - GDPR-Compliant Consent Management Platform
 * Main SDK entry point
 */

import { ConsentManager } from './consent-manager';
import { BannerUI } from './banner-ui';
import { ScriptBlocker } from './script-blocker';
import { ConsentStorage } from './consent-storage';
import { GoogleConsentMode } from './google-consent-mode';
import { Config, ConsentCategories } from './types';

class RSCMP {
  private consentManager: ConsentManager;
  private bannerUI: BannerUI;
  private scriptBlocker: ScriptBlocker;
  private consentStorage: ConsentStorage;
  private googleConsentMode: GoogleConsentMode;
  private config: Config | null = null;
  private siteId: string | null = null;

  constructor() {
    this.consentStorage = new ConsentStorage();
    this.consentManager = new ConsentManager(this.consentStorage);
    this.bannerUI = new BannerUI(this.consentManager);
    this.scriptBlocker = new ScriptBlocker(this.consentManager);
    this.googleConsentMode = new GoogleConsentMode(this.consentManager);
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
    
    // Send consent to backend
    if (this.siteId && this.config) {
      this.sendConsentToBackend(categories);
    }
  }

  /**
   * Send consent data to backend
   */
  private async sendConsentToBackend(categories: ConsentCategories): Promise<void> {
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
          version: this.config?.policyVersion || '1.0',
        }),
      });
    } catch (error) {
      console.error('[RS-CMP] Failed to send consent:', error);
    }
  }
}

// Auto-initialize on page load
if (typeof window !== 'undefined') {
  const cmp = new RSCMP();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => cmp.init());
  } else {
    cmp.init();
  }

  // Expose to window for manual control
  (window as any).RSCMP = cmp;
}

export default RSCMP;
