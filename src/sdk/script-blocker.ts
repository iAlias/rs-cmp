/**
 * Script Blocker - Block and unblock scripts based on consent
 */

import { ConsentCategories } from './types';
import { ConsentManager } from './consent-manager';

export class ScriptBlocker {
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
