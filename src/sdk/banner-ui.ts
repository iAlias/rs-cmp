/**
 * Banner UI - Display consent banner with Accept/Reject/Customize options
 */

import { Config, ConsentCategories } from './types';
import { ConsentManager } from './consent-manager';

export class BannerUI {
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
    this.consentManager.on('bannerShown', {});
  }

  /**
   * Hide the banner
   */
  hide(): void {
    if (this.bannerElement) {
      this.bannerElement.remove();
      this.bannerElement = null;
      this.consentManager.on('bannerClosed', {});
    }
  }

  /**
   * Create banner HTML
   */
  private createBanner(config: Config, translations: any): HTMLElement {
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
