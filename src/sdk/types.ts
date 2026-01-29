/**
 * Type definitions for RS-CMP
 */

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
