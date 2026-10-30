export interface Animal {
  emoji: string;
  name: string;
  plural: string;
}

function animal(emoji: string, name: string, plural = `${name}s`): Animal {
  return { emoji, name, plural };
}

/** Every animal a game can draw from. Picked to look different from each other at card size. */
export const ANIMALS: readonly Animal[] = [
  animal('🦁', 'Lion'),
  animal('🐯', 'Tiger'),
  animal('🐵', 'Monkey'),
  animal('🐘', 'Elephant'),
  animal('🦒', 'Giraffe'),
  animal('🦓', 'Zebra'),
  animal('🦛', 'Hippo'),
  animal('🦏', 'Rhino'),
  animal('🐼', 'Panda'),
  animal('🐨', 'Koala'),
  animal('🐻', 'Bear'),
  animal('🦊', 'Fox', 'Foxes'),
  animal('🐺', 'Wolf', 'Wolves'),
  animal('🐰', 'Bunny', 'Bunnies'),
  animal('🐭', 'Mouse', 'Mice'),
  animal('🐸', 'Frog'),
  animal('🐷', 'Pig'),
  animal('🐮', 'Cow'),
  animal('🐴', 'Horse'),
  animal('🐑', 'Sheep', 'Sheep'),
  animal('🐔', 'Chicken'),
  animal('🦆', 'Duck'),
  animal('🦉', 'Owl'),
  animal('🐧', 'Penguin'),
  animal('🐢', 'Turtle'),
  animal('🐍', 'Snake'),
  animal('🐊', 'Crocodile'),
  animal('🐳', 'Whale'),
  animal('🐬', 'Dolphin'),
  animal('🐙', 'Octopus', 'Octopuses'),
  animal('🦋', 'Butterfly', 'Butterflies'),
  animal('🐝', 'Bee'),
];
