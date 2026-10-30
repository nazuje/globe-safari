/** A big round 🏠 link back to the portal. Place it in the game's top bar. */
export function homeButton(): HTMLAnchorElement {
  const link = document.createElement('a');
  link.className = 'home-btn';
  link.href = '../';
  link.textContent = '🏠';
  link.setAttribute('aria-label', 'Back to Playroom');
  return link;
}
