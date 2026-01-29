/**
 * Google Consent Mode v2 Integration
 */

import { ConsentCategories } from './types';
import { ConsentManager } from './consent-manager';

export class GoogleConsentMode {
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
      (window as any).gtag = function() {
        (window as any).dataLayer.push(arguments);
      };
      (window as any).gtag('js', new Date());
    }
  }
}
