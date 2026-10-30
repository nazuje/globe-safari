export type Energy = 'energetic' | 'calm';

/** Each one is a CSS class, anim-<name>, in style.css. */
export type Anim =
  | 'hop'
  | 'stomp'
  | 'flap'
  | 'slither'
  | 'waddle'
  | 'sway'
  | 'roar'
  | 'stretch'
  | 'wiggle'
  | 'spin'
  | 'tiptoe'
  | 'swim'
  | 'float';

export interface Move {
  id: string;
  emoji: string;
  /** "a frog", for lines such as "Dance like a frog!". */
  like: string;
  /** Spoken first. Short enough for a 4-year-old: 3 to 7 words. */
  line: string;
  /** Spoken right before the beat starts. */
  chant: string;
  energy: Energy;
  anim: Anim;
  /** A little picture beside the animal, so the move reads with no sound. */
  puff: string;
  /** Soft background color for this animal's turn. */
  tint: string;
  /** Small print for the grown-up. */
  tip: string;
}

// Every move stays on the spot and is safe indoors for a small child:
// no running around, no jumping off things, no holding breath.
export const MOVES: readonly Move[] = [
  { id: 'frog', emoji: '🐸', like: 'a frog', line: 'Hop like a frog!', chant: 'Hop hop hop!', energy: 'energetic', anim: 'hop', puff: '💦', tint: '#c9f2c7', tip: 'Small hops on the spot.' },
  { id: 'elephant', emoji: '🐘', like: 'an elephant', line: 'Stomp like an elephant!', chant: 'Stomp stomp stomp!', energy: 'energetic', anim: 'stomp', puff: '💥', tint: '#d9dcf5', tip: 'Big heavy feet on the spot.' },
  { id: 'bird', emoji: '🐦', like: 'a bird', line: 'Flap like a bird!', chant: 'Flap flap flap!', energy: 'energetic', anim: 'flap', puff: '🪶', tint: '#c6e9ff', tip: 'Arms up and down, feet on the floor.' },
  { id: 'penguin', emoji: '🐧', like: 'a penguin', line: 'Waddle like a penguin!', chant: 'Waddle waddle waddle!', energy: 'energetic', anim: 'waddle', puff: '❄️', tint: '#d3eefa', tip: 'Stiff legs, rock side to side.' },
  { id: 'lion', emoji: '🦁', like: 'a lion', line: 'Roar like a lion!', chant: 'Roar roar roar!', energy: 'energetic', anim: 'roar', puff: '💬', tint: '#ffe2a8', tip: 'Big happy roars and paws up.' },
  { id: 'worm', emoji: '🪱', like: 'a worm', line: 'Wiggle like a worm!', chant: 'Wiggle wiggle wiggle!', energy: 'energetic', anim: 'wiggle', puff: '〰️', tint: '#ffd9cf', tip: 'Wiggle the whole body, standing or lying down.' },
  { id: 'monkey', emoji: '🐒', like: 'a monkey', line: 'Scratch like a monkey!', chant: 'Ooh ooh ooh!', energy: 'energetic', anim: 'wiggle', puff: '🍌', tint: '#f3dcc0', tip: 'Scratch your tummy and your head.' },
  { id: 'kangaroo', emoji: '🦘', like: 'a kangaroo', line: 'Bounce like a kangaroo!', chant: 'Boing boing boing!', energy: 'energetic', anim: 'hop', puff: '💫', tint: '#f7dcae', tip: 'Soft bounces on the spot.' },
  { id: 'bee', emoji: '🐝', like: 'a bee', line: 'Buzz like a bee!', chant: 'Bzz bzz bzz!', energy: 'energetic', anim: 'flap', puff: '🌼', tint: '#fff3a6', tip: 'Tiny fast wings, stay on the spot.' },
  { id: 'puppy', emoji: '🐶', like: 'a puppy', line: 'Wag like a puppy!', chant: 'Wag wag wag!', energy: 'energetic', anim: 'waddle', puff: '🦴', tint: '#f6e0c8', tip: 'Wag your bottom like a tail.' },
  { id: 'horse', emoji: '🐴', like: 'a horse', line: 'Trot like a horse!', chant: 'Clip clop clop!', energy: 'energetic', anim: 'stomp', puff: '🥕', tint: '#ecd9c6', tip: 'Knees up, trotting on the spot.' },
  { id: 'crab', emoji: '🦀', like: 'a crab', line: 'Snap like a crab!', chant: 'Snap snap snap!', energy: 'energetic', anim: 'roar', puff: '🌊', tint: '#ffd3cc', tip: 'Hands are claws. Snap them open and shut.' },
  { id: 'duck', emoji: '🦆', like: 'a duck', line: 'Quack like a duck!', chant: 'Quack quack quack!', energy: 'energetic', anim: 'waddle', puff: '💧', tint: '#d4f1e4', tip: 'Elbows flap and quack out loud.' },
  { id: 'chicken', emoji: '🐔', like: 'a chicken', line: 'Peck like a chicken!', chant: 'Peck peck peck!', energy: 'energetic', anim: 'stomp', puff: '🌽', tint: '#ffeab8', tip: 'Bob your head and tuck your wings.' },

  { id: 'snake', emoji: '🐍', like: 'a snake', line: 'Slither like a snake!', chant: 'Ssss ssss ssss!', energy: 'calm', anim: 'slither', puff: '〰️', tint: '#d4efc4', tip: 'Low to the floor, tummy down, nice and slow.' },
  { id: 'giraffe', emoji: '🦒', like: 'a giraffe', line: 'Sway like a giraffe!', chant: 'Sway sway sway!', energy: 'calm', anim: 'sway', puff: '🌿', tint: '#fbe7a9', tip: 'Tall and slow, side to side.' },
  { id: 'cat', emoji: '🐱', like: 'a cat', line: 'Stretch like a cat!', chant: 'Stretch, stretch, stretch!', energy: 'calm', anim: 'stretch', puff: '💤', tint: '#f8dcea', tip: 'Hands on the floor and a long, slow stretch.' },
  { id: 'ladybird', emoji: '🐞', like: 'a ladybird', line: 'Spin slowly like a ladybird!', chant: 'Round and round!', energy: 'calm', anim: 'spin', puff: '🍃', tint: '#ffd7d2', tip: 'Very slow turns, so nobody gets dizzy.' },
  { id: 'mouse', emoji: '🐭', like: 'a mouse', line: 'Tiptoe like a mouse!', chant: 'Shh shh shh!', energy: 'calm', anim: 'tiptoe', puff: '🧀', tint: '#e8e3f4', tip: 'Quiet little tiptoes on the spot.' },
  { id: 'fish', emoji: '🐟', like: 'a fish', line: 'Swim like a fish!', chant: 'Swish swish swish!', energy: 'calm', anim: 'swim', puff: '🫧', tint: '#bfe8f7', tip: 'Arms swim gently, feet stay still.' },
  { id: 'turtle', emoji: '🐢', like: 'a turtle', line: 'Creep like a turtle!', chant: 'Slow, slow, slow!', energy: 'calm', anim: 'sway', puff: '🌱', tint: '#cdeccb', tip: 'The slowest steps on the spot.' },
  { id: 'sloth', emoji: '🦥', like: 'a sloth', line: 'Reach like a sloth!', chant: 'Up, up, up!', energy: 'calm', anim: 'stretch', puff: '🌳', tint: '#e5dccb', tip: 'Slowly reach one arm up, then the other.' },
  { id: 'butterfly', emoji: '🦋', like: 'a butterfly', line: 'Float like a butterfly!', chant: 'Soft, soft, soft!', energy: 'calm', anim: 'float', puff: '🌸', tint: '#dcdcff', tip: 'Gentle arms, light as air.' },
  { id: 'owl', emoji: '🦉', like: 'an owl', line: 'Look around like an owl!', chant: 'Hoo hoo hoo!', energy: 'calm', anim: 'sway', puff: '🌙', tint: '#ddd6ee', tip: 'Turn your head slowly, side to side.' },
  { id: 'bear', emoji: '🐻', like: 'a bear', line: 'Yawn like a sleepy bear!', chant: 'Big, big yawn!', energy: 'calm', anim: 'stretch', puff: '💤', tint: '#ecd6c0', tip: 'A huge yawn and a big slow stretch.' },
  { id: 'bunny', emoji: '🐰', like: 'a bunny', line: 'Sniff like a bunny!', chant: 'Sniff sniff sniff!', energy: 'calm', anim: 'tiptoe', puff: '🥕', tint: '#fbe0e6', tip: 'Crouch down and wiggle your nose.' },
  { id: 'flamingo', emoji: '🦩', like: 'a flamingo', line: 'Stand like a flamingo!', chant: 'Wobble, wobble, wobble!', energy: 'calm', anim: 'float', puff: '🌺', tint: '#ffd6e4', tip: 'One foot up. Hold a hand if it helps.' },
  { id: 'octopus', emoji: '🐙', like: 'an octopus', line: 'Wave like an octopus!', chant: 'Wave wave wave!', energy: 'calm', anim: 'swim', puff: '🫧', tint: '#f3d4f1', tip: 'Floppy arms, waving slowly.' },
];
