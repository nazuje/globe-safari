/** The session's star count in the top bar. Stars live only as long as the page. */
export function createStarCounter(badge: HTMLElement, countEl: HTMLElement) {
  let stars = 0;
  return {
    add() {
      stars += 1;
      countEl.textContent = String(stars);
      badge.setAttribute('aria-label', `${stars} ${stars === 1 ? 'star' : 'stars'}`);
      badge.classList.remove('pop');
      void badge.offsetWidth; // restart the pop animation
      badge.classList.add('pop');
    },
  };
}
