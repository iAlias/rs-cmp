/**
 * Consent Manager - Core logic for managing consent state
 */

import { ConsentCategories, ConsentEventType, ConsentEventHandler } from './types';
import { ConsentStorage } from './consent-storage';

export class ConsentManager {
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
  private emit(event: ConsentEventType, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }
}
