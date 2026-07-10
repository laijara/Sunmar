export class Promotion {
    constructor(data) {
        this.app_erid = data.app_erid;
        this.description = data.description;
        this.entry_point = data.entry_point;
        this.erid = data.erid;
        this.filter = data.filter;
        this.ligal = data.ligal;
        this.name = data.name;
        this.promo_end = data.promo_end;
        this.promo_end_text = data.promo_end_text;
        this.url = data.url;
        this.visual = data.visual;
        this.theme = data.theme;
        this.altText = data.altText;
    }

    isExpired() {
        if (!this.promo_end) return false;
        return new Date(this.promo_end) < new Date();
    }

    renderHTML() {
        if (this.isExpired()) return '';

        return `
            <li class="promo-grid__item">
                <a href="${this.url}" class="promo-card promo-card--${this.theme}">
                    <div class="promo-card__visual">
                        <picture>
                            <source srcset="${this.visual}" type="image/svg+xml">
                            <img src="${this.visual}" alt="${this.altText}" loading="lazy">
                        </picture>
                    </div>
                    <div class="promo-card__content">
                        <h2>${this.name}</h2>
                        ${this.description ? `<p>${this.description}</p>` : ''}
                        ${this.promo_end_text ? `<span class="bonus-rate">${this.promo_end_text}</span>` : ''}
                    </div>
                    <span class="promo-card__badge" title="${this.ligal}">Реклама</span>
                </a>
            </li>
        `;
    }
}