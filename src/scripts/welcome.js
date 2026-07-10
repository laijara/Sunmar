export default function example() {
    const link = document.querySelector('[href="#link"]')
    if (!link) return;

    link.addEventListener('click', () => alert('Link clicked'));
}
