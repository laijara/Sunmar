export default function hideBanner() {
    const mainBanner = document.querySelector('coral-main-banner');
    if (mainBanner) mainBanner.style.display = 'none';
}