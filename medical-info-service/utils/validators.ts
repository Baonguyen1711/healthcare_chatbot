import { MedicalCategory, SourceType } from "../models/medicalInfo.model";

export class Validators {
  /**
   * Validate medical info ID format
   */
  static isValidId(id: string): boolean {
    if (!id || typeof id !== "string") return false;
    // UUID v4 format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Validate category
   */
  static isValidCategory(category: string): boolean {
    return Object.values(MedicalCategory).includes(category as MedicalCategory);
  }

  /**
   * Validate source type
   */
  static isValidSource(source: string): boolean {
    return Object.values(SourceType).includes(source as SourceType);
  }

  /**
   * Validate language code
   */
  static isValidLanguage(language: string): boolean {
    return ["vi", "en"].includes(language);
  }

  /**
   * Validate search keyword
   */
  static isValidSearchKeyword(keyword: string): boolean {
    if (!keyword || typeof keyword !== "string") return false;
    // Minimum 2 characters, maximum 100 characters
    return keyword.length >= 2 && keyword.length <= 100;
  }

  /**
   * Validate pagination parameters
   */
  static isValidPaginationParams(
    limit?: number,
    offset?: number
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (limit !== undefined) {
      if (typeof limit !== "number" || limit < 1 || limit > 100) {
        errors.push("Limit must be between 1 and 100");
      }
    }

    if (offset !== undefined) {
      if (typeof offset !== "number" || offset < 0) {
        errors.push("Offset must be a non-negative number");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate reliability score
   */
  static isValidReliability(score: number): boolean {
    return typeof score === "number" && score >= 1 && score <= 5;
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ["http:", "https:"].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Validate medical info title
   */
  static isValidTitle(title: string): boolean {
    if (!title || typeof title !== "string") return false;
    return title.length >= 5 && title.length <= 200;
  }

  /**
   * Validate medical info content
   */
  static isValidContent(content: string): boolean {
    if (!content || typeof content !== "string") return false;
    return content.length >= 50 && content.length <= 10000;
  }

  /**
   * Validate tags array
   */
  static isValidTags(tags: string[]): boolean {
    if (!Array.isArray(tags)) return false;
    if (tags.length === 0 || tags.length > 20) return false;
    return tags.every(
      (tag) => typeof tag === "string" && tag.length >= 2 && tag.length <= 50
    );
  }

  /**
   * Validate date string (ISO format)
   */
  static isValidISODate(dateString: string): boolean {
    if (!dateString || typeof dateString !== "string") return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Sanitize search keyword
   */
  static sanitizeSearchKeyword(keyword: string): string {
    if (!keyword) return "";
    return keyword
      .trim()
      .replace(/[<>\"\']/g, "") // Remove potentially dangerous characters
      .substring(0, 100); // Enforce max length
  }

  /**
   * Sanitize HTML content
   */
  static sanitizeHtml(html: string): string {
    if (!html) return "";
    // Basic HTML sanitization - remove script tags and event handlers
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
      .replace(/on\w+\s*=\s*[^\s>]*/gi, "");
  }

  /**
   * Validate complete medical info object for creation
   */
  static validateMedicalInfoForCreation(data: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!this.isValidTitle(data.title)) {
      errors.push("Title must be between 5 and 200 characters");
    }

    if (!this.isValidCategory(data.category)) {
      errors.push("Invalid category");
    }

    if (!this.isValidContent(data.content)) {
      errors.push("Content must be between 50 and 10000 characters");
    }

    if (!this.isValidSource(data.source)) {
      errors.push("Invalid source type");
    }

    if (!this.isValidUrl(data.sourceUrl)) {
      errors.push("Invalid source URL");
    }

    if (!this.isValidTags(data.tags)) {
      errors.push("Tags must be an array of 1-20 strings (2-50 chars each)");
    }

    if (!this.isValidLanguage(data.language)) {
      errors.push('Language must be "vi" or "en"');
    }

    if (
      data.reliability !== undefined &&
      !this.isValidReliability(data.reliability)
    ) {
      errors.push("Reliability must be between 1 and 5");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate and parse query parameters
   */
  static parseQueryParams(params: any): {
    isValid: boolean;
    parsed: any;
    errors: string[];
  } {
    const errors: string[] = [];
    const parsed: any = {};

    // Parse limit
    if (params.limit) {
      const limit = parseInt(params.limit);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        errors.push("Limit must be between 1 and 100");
      } else {
        parsed.limit = limit;
      }
    }

    // Parse offset
    if (params.offset) {
      const offset = parseInt(params.offset);
      if (isNaN(offset) || offset < 0) {
        errors.push("Offset must be a non-negative number");
      } else {
        parsed.offset = offset;
      }
    }

    // Validate keyword
    if (params.keyword) {
      const sanitized = this.sanitizeSearchKeyword(params.keyword);
      if (!this.isValidSearchKeyword(sanitized)) {
        errors.push("Keyword must be between 2 and 100 characters");
      } else {
        parsed.keyword = sanitized;
      }
    }

    // Validate category
    if (params.category) {
      if (!this.isValidCategory(params.category)) {
        errors.push("Invalid category");
      } else {
        parsed.category = params.category;
      }
    }

    // Validate source
    if (params.source) {
      if (!this.isValidSource(params.source)) {
        errors.push("Invalid source type");
      } else {
        parsed.source = params.source;
      }
    }

    // Validate language
    if (params.language) {
      if (!this.isValidLanguage(params.language)) {
        errors.push('Language must be "vi" or "en"');
      } else {
        parsed.language = params.language;
      }
    }

    return {
      isValid: errors.length === 0,
      parsed,
      errors,
    };
  }
}
