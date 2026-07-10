import { Promotion } from './Promotion.js';
import { promotionsData } from './dataPromotions.js';

export function initPromotions() {
    const gridContainer = document.querySelector('.promo-grid');
    if (!gridContainer) return;

    const promotionsInstances = promotionsData.map(data => new Promotion(data));

    const htmlContent = promotionsInstances
        .map(promo => promo.renderHTML())
        .join('');

    gridContainer.innerHTML = htmlContent;
}