import { optionPicture, TAB_PICTURES } from './art.ts';
import { optionLabel, text } from './lang/index.ts';
import { OPTIONS, TAB_PARTS, TABS, type Look, type Part, type Tab } from './parts.ts';
import { onTap } from './tap.ts';

export interface DresserEvents {
  look: () => Look;
  onPick: (part: Part, id: string) => void;
  onTab: () => void;
}

/** Columns that give each tab's options the biggest tiles that fit in two rows. */
function columns(count: number): number {
  if (count <= 6) return 3;
  return count <= 8 ? 4 : 5;
}

export interface Dresser {
  /** Shows the current creature: its colors in the pictures, its choices marked. */
  refresh(): void;
  /** Rebuilds everything, for a new language. */
  redraw(): void;
}

export function createDresser(tabsHost: HTMLElement, trayHost: HTMLElement, events: DresserEvents): Dresser {
  let tab: Tab = 'hat';
  let drawnColor = '';

  const tabButtons = new Map<Tab, HTMLButtonElement>();
  const tiles = new Map<string, HTMLButtonElement>();

  function drawTabs(): void {
    const look = events.look();
    for (const id of TABS) {
      const button = tabButtons.get(id)!;
      button.innerHTML = TAB_PICTURES[id](look);
      button.setAttribute('aria-label', text().tabs[id]);
      button.setAttribute('aria-pressed', String(id === tab));
    }
  }

  function drawTray(): void {
    const look = events.look();
    const parts = TAB_PARTS[tab];
    const count = parts.reduce((sum, part) => sum + OPTIONS[part].length, 0);
    trayHost.style.setProperty('--cols', String(columns(count)));
    trayHost.dataset.tab = tab;
    trayHost.replaceChildren();
    tiles.clear();
    for (const part of parts) {
      for (const id of OPTIONS[part] as readonly string[]) {
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'tile';
        tile.innerHTML = optionPicture(part, id as never, look);
        tile.setAttribute('aria-label', optionLabel(part, id));
        tile.setAttribute('aria-pressed', String(look[part] === id));
        onTap(tile, () => events.onPick(part, id));
        tiles.set(`${part}:${id}`, tile);
        trayHost.append(tile);
      }
    }
  }

  function mark(): void {
    const look = events.look();
    for (const [key, tile] of tiles) {
      const [part, id] = key.split(':') as [Part, string];
      tile.setAttribute('aria-pressed', String(look[part] === id));
    }
  }

  function redraw(): void {
    drawnColor = events.look().color;
    drawTabs();
    drawTray();
  }

  for (const id of TABS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tab';
    onTap(button, () => {
      if (tab !== id) {
        tab = id;
        drawTabs();
        drawTray();
      }
      events.onTab();
    });
    tabButtons.set(id, button);
    tabsHost.append(button);
  }
  redraw();

  return {
    redraw,
    refresh() {
      // Tiles only need redrawing when their colors change: a press keeps its tile under the finger.
      if (events.look().color !== drawnColor) redraw();
      else {
        drawTabs();
        mark();
      }
    },
  };
}
