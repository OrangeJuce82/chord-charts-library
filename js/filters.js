/**
 * @file filters.js
 * @description Tag-input components with autocomplete for composer, groove and style filters.
 * Each component is self-contained and fires a 'filterchange' custom event when tags change.
 */

import { fetchSuggestions } from './api.js';
import { DEBOUNCE_MS, AUTOCOMPLETE_LIMIT } from './config.js';

// ─── Utility ────────────────────────────────────────────────────────────────

/**
 * Simple debounce — returns a function that delays invoking `fn` by `delay` ms.
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
export const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

// ─── TagInput class ──────────────────────────────────────────────────────────

/**
 * A tag-input component with Supabase-backed autocomplete.
 *
 * @param {object} config
 * @param {HTMLElement} config.wrapper       - .tag-input-wrapper element
 * @param {HTMLElement} config.tagsContainer - div that holds rendered tags
 * @param {HTMLInputElement} config.input    - text input
 * @param {HTMLElement} config.suggestions   - <ul> for suggestions
 * @param {string}      config.column        - Supabase column to query
 * @param {string}      config.tagClass      - CSS modifier class for tags
 * @param {Function}    config.onChange      - called with current tags array
 */
export class TagInput {
  constructor({ wrapper, tagsContainer, input, suggestions, column, tagClass, onChange }) {
    this.wrapper       = wrapper;
    this.tagsContainer = tagsContainer;
    this.input         = input;
    this.suggestions   = suggestions;
    this.column        = column;
    this.tagClass      = tagClass;
    this.onChange      = onChange;

    /** @type {string[]} */
    this.tags          = [];
    this.activeSuggIdx = -1;

    this._bindEvents();
  }

  // ── Public ──────────────────────────────────────────────────────────────

  /** Add a tag programmatically (e.g. from a table cell click). */
  addTag(value) {
    const cleaned = value.trim();
    if (!cleaned || this.tags.includes(cleaned)) return;
    this.tags.push(cleaned);
    this._renderTags();
    this.onChange(this.tags);
  }

  /** Clear all tags. */
  clear() {
    this.tags = [];
    this.input.value = '';
    this._renderTags();
    this._closeSuggestions();
    this.onChange(this.tags);
  }

  // ── Private ─────────────────────────────────────────────────────────────

  _bindEvents() {
    // Click on wrapper focuses the input
    this.wrapper.addEventListener('click', () => this.input.focus());

    // Typing → fetch suggestions (debounced)
    const debouncedFetch = debounce(async (q) => {
      if (!q) { this._closeSuggestions(); return; }
      const items = await fetchSuggestions(this.column, q, AUTOCOMPLETE_LIMIT);
      this._renderSuggestions(items);
    }, DEBOUNCE_MS);

    this.input.addEventListener('input', (e) => {
      this.activeSuggIdx = -1;
      debouncedFetch(e.target.value);
    });

    // Keyboard navigation inside the input
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const active = this.suggestions.querySelector('.active');
        if (active) {
          this._selectSuggestion(active.dataset.value);
        } else if (this.input.value.trim()) {
          this.addTag(this.input.value);
          this.input.value = '';
          this._closeSuggestions();
        }
        return;
      }

      const items = [...this.suggestions.querySelectorAll('.suggestions__item')];
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.activeSuggIdx = Math.min(this.activeSuggIdx + 1, items.length - 1);
        this._highlightSuggestion(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.activeSuggIdx = Math.max(this.activeSuggIdx - 1, -1);
        this._highlightSuggestion(items);
      } else if (e.key === 'Escape') {
        this._closeSuggestions();
      } else if (e.key === 'Backspace' && !this.input.value && this.tags.length) {
        this._removeTag(this.tags.length - 1);
      }
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.wrapper.contains(e.target)) this._closeSuggestions();
    });
  }

  _renderTags() {
    this.tagsContainer.innerHTML = '';
    this.tags.forEach((tag, idx) => {
      const span = document.createElement('span');
      span.className = `filter-tag filter-tag--${this.tagClass}`;
      span.innerHTML = `
        ${this._escapeHtml(tag)}
        <button class="filter-tag__remove" data-idx="${idx}" aria-label="Remove ${this._escapeHtml(tag)}" title="Remove">×</button>
      `;
      span.querySelector('.filter-tag__remove').addEventListener('click', (e) => {
        e.stopPropagation();
        this._removeTag(Number(e.currentTarget.dataset.idx));
      });
      this.tagsContainer.appendChild(span);
    });
  }

  _removeTag(idx) {
    this.tags.splice(idx, 1);
    this._renderTags();
    this.onChange(this.tags);
  }

  _renderSuggestions(items) {
    this.suggestions.innerHTML = '';
    if (!items.length) { this._closeSuggestions(); return; }

    items.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'suggestions__item';
      li.dataset.value = item;
      li.role = 'option';
      li.textContent = item;
      li.addEventListener('mousedown', (e) => {
        e.preventDefault(); // prevent blur before click
        this._selectSuggestion(item);
      });
      this.suggestions.appendChild(li);
    });

    this.suggestions.classList.add('open');
    this.activeSuggIdx = -1;
  }

  _highlightSuggestion(items) {
    items.forEach((el, i) => el.classList.toggle('active', i === this.activeSuggIdx));
  }

  _selectSuggestion(value) {
    this.addTag(value);
    this.input.value = '';
    this._closeSuggestions();
  }

  _closeSuggestions() {
    this.suggestions.classList.remove('open');
    this.suggestions.innerHTML = '';
    this.activeSuggIdx = -1;
  }

  /**
   * Minimal HTML escaping to prevent XSS in tag labels.
   * @param {string} str
   * @returns {string}
   */
  _escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
