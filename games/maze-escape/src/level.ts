import { FLOOR, HOLO, rayLength, stepsFrom, tileCentre, tileIndex, tileOf, WALL, type Grid, type Point } from './grid.ts';
import { LONGEST_REACH, PLAYER_SPEED, STAR_TIME_PACE, TUNING, type Setting, type Tuning } from './tuning.ts';

// A level is written as a little text map. In it:
//   #  wall             (space) floor        S  start             E  exit
//   C  checkpoint       H  hidden hologram wall                   G  treasure
//   B  cardboard box    D  disco button
//   a-z  a named spot on the floor, digits  a named spot on a wall
// Hazards in the level's data refer to those names, so they can't drift from the map.

export type Heading = 'N' | 'E' | 'S' | 'W';
export type Idea = 'maze' | 'robot' | 'camera' | 'sensor' | 'laser' | 'box' | 'disco' | 'sweep' | 'mix';
export type Theme = 'cyan' | 'lime' | 'pink' | 'amber';

const HEADINGS: Record<Heading, Point> = { N: { x: 0, y: -1 }, E: { x: 1, y: 0 }, S: { x: 0, y: 1 }, W: { x: -1, y: 0 } };

export interface RobotData {
  /** Named spots, visited in order and then back to the first. */
  route: string;
}

export interface CameraData {
  at: string;
  aim: Heading;
  /** Degrees to each side of the aim. */
  sweep: number;
  period: number;
  offset?: number;
}

export interface SensorData {
  /** Every tile with this letter is one plate. */
  plate: string;
  period: number;
  on: number;
  offset?: number;
}

export interface LaserData {
  at: string;
  aim: Heading;
  kind: 'bolt' | 'sweep';
  period: number;
  offset?: number;
  /** For a sweep: degrees to each side, and seconds to cross. */
  sweep?: number;
  on?: number;
}

export interface LevelData {
  idea: Idea;
  theme: Theme;
  map: readonly string[];
  /** Seconds added to the time star, for a level with waiting built in. */
  waiting?: number;
  robots?: readonly RobotData[];
  cameras?: readonly CameraData[];
  sensors?: readonly SensorData[];
  lasers?: readonly LaserData[];
  /**
   * The safe route, in order. A name is a wait sign: a safe spot where the trail stops until the
   * way ahead is clear. A name after "+" is a spot the trail just passes through, to lead round a patrol.
   */
  guide?: readonly string[];
}

export interface Stop {
  spot: Point;
  tile: number;
  sign: boolean;
  /** Steps to this stop from every tile. */
  steps: Int16Array;
}

export interface Camera {
  mount: Point;
  from: Point;
  aim: number;
  sweep: number;
  period: number;
  offset: number;
  half: number;
  range: number;
}

export interface Sensor {
  tiles: number[];
  period: number;
  on: number;
  warn: number;
  offset: number;
}

export interface Laser {
  kind: 'bolt' | 'sweep';
  mount: Point;
  from: Point;
  aim: number;
  period: number;
  offset: number;
  charge: number;
  speed: number;
  /** Clear floor in front of a bolt. */
  range: number;
  sweep: number;
  on: number;
}

export interface RobotPlan {
  /** A closed walk of tile numbers. */
  loop: number[];
  /** Tiles in the loop where the robot stops and looks about. */
  pauses: Set<number>;
}

export interface Level {
  id: number;
  data: LevelData;
  setting: Setting;
  tuning: Tuning;
  grid: Grid;
  start: Point;
  exit: Point;
  exitTile: number;
  checkpoints: Point[];
  boxes: Point[];
  disco: Point | null;
  treasure: Point | null;
  robots: RobotPlan[];
  cameras: Camera[];
  sensors: Sensor[];
  lasers: Laser[];
  stops: Stop[];
  /** 0 is the level as written. 1 and 2 are quiet help after repeated losses. */
  help: number;
  /** Steps to the exit from every tile: the glowing trail follows this. */
  exitSteps: Int16Array;
  /** The time star, in seconds. */
  par: number;
  /** Lazily filled: steps to a tile, for robots. */
  routes: Map<number, Int16Array>;
}

const isName = (mark: string): boolean => /[a-z0-9]/.test(mark);

function cellFor(mark: string): number {
  if (mark === '#' || /[0-9]/.test(mark)) return WALL;
  return mark === 'H' ? HOLO : FLOOR;
}

function readMap(map: readonly string[]): { grid: Grid; marks: Map<string, number[]> } {
  const width = Math.max(...map.map((line) => line.length));
  const height = map.length;
  const grid: Grid = { width, height, cells: new Uint8Array(width * height) };
  const marks = new Map<string, number[]>();
  map.forEach((line, row) => {
    for (let column = 0; column < width; column += 1) {
      const mark = line[column] ?? '#';
      grid.cells[tileIndex(grid, column, row)] = cellFor(mark);
      if (mark !== '#' && mark !== ' ') marks.set(mark, [...(marks.get(mark) ?? []), tileIndex(grid, column, row)]);
    }
  });
  return { grid, marks };
}

function spot(grid: Grid, marks: Map<string, number[]>, name: string): Point {
  const tile = marks.get(name)?.[0];
  if (tile === undefined) throw new Error(`The map has no "${name}"`);
  return tileCentre(grid, tile);
}

function spots(grid: Grid, marks: Map<string, number[]>, name: string): Point[] {
  return (marks.get(name) ?? []).map((tile) => tileCentre(grid, tile));
}

/** The spot just off the wall, where a mounted hazard's cone or bolt begins. */
function offWall(mount: Point, aim: Heading): Point {
  const { x, y } = HEADINGS[aim];
  return { x: mount.x + x * 0.56, y: mount.y + y * 0.56 };
}

const angleOf = (aim: Heading): number => Math.atan2(HEADINGS[aim].y, HEADINGS[aim].x);

function buildCamera(data: CameraData, grid: Grid, marks: Map<string, number[]>, tuning: Tuning): Camera {
  const mount = spot(grid, marks, data.at);
  return {
    mount,
    from: offWall(mount, data.aim),
    aim: angleOf(data.aim),
    sweep: (data.sweep * Math.PI) / 180,
    period: data.period * tuning.cameraPace,
    offset: data.offset ?? 0,
    half: tuning.cameraHalf,
    range: tuning.cameraRange,
  };
}

function buildSensor(data: SensorData, marks: Map<string, number[]>, tuning: Tuning): Sensor {
  const tiles = marks.get(data.plate);
  if (!tiles) throw new Error(`The map has no plate "${data.plate}"`);
  return {
    tiles,
    period: data.period * tuning.sensorPace,
    on: data.on * tuning.sensorOn,
    warn: tuning.sensorWarnS,
    offset: data.offset ?? 0,
  };
}

function buildLaser(data: LaserData, grid: Grid, marks: Map<string, number[]>, tuning: Tuning): Laser {
  const mount = spot(grid, marks, data.at);
  const from = offWall(mount, data.aim);
  const aim = angleOf(data.aim);
  return {
    kind: data.kind,
    mount,
    from,
    aim,
    period: data.period * tuning.laserPace,
    offset: data.offset ?? 0,
    charge: tuning.chargeS,
    speed: tuning.boltSpeed,
    range: rayLength(grid, from, aim, LONGEST_REACH),
    sweep: ((data.sweep ?? 0) * Math.PI) / 180,
    on: (data.on ?? 0) * tuning.laserPace,
  };
}

function walkBetween(grid: Grid, from: number, to: number): number[] {
  const steps = stepsFrom(grid, to, false);
  const path: number[] = [];
  let tile = from;
  while (tile !== to) {
    path.push(tile);
    const next = [tile + 1, tile - 1, tile + grid.width, tile - grid.width].find((near) => (steps[near] ?? -1) === (steps[tile] ?? 0) - 1 && (steps[near] ?? -1) >= 0);
    if (next === undefined) throw new Error('A robot route crosses a wall');
    tile = next;
  }
  return path;
}

function buildRobot(data: RobotData, grid: Grid, marks: Map<string, number[]>): RobotPlan {
  const stops = [...data.route].map((name) => {
    const tile = marks.get(name)?.[0];
    if (tile === undefined) throw new Error(`The map has no "${name}"`);
    return tile;
  });
  const loop = stops.flatMap((stop, index) => walkBetween(grid, stop, stops[(index + 1) % stops.length] ?? stop));
  return { loop, pauses: new Set(stops) };
}

function buildStop(name: string, grid: Grid, marks: Map<string, number[]>): Stop {
  const sign = !name.startsWith('+');
  const spotAt = spot(grid, marks, sign ? name : name.slice(1));
  const tile = tileOf(grid, spotAt);
  return { spot: spotAt, tile, sign, steps: stepsFrom(grid, tile, true) };
}

export function buildLevel(data: LevelData, id: number, setting: Setting): Level {
  const { grid, marks } = readMap(data.map);
  const tuning = TUNING[setting];
  const exit = spot(grid, marks, 'E');
  const exitTile = tileOf(grid, exit);
  const start = spot(grid, marks, 'S');
  const exitSteps = stepsFrom(grid, exitTile, true);
  const walk = (exitSteps[tileOf(grid, start)] ?? 0) / PLAYER_SPEED;
  return {
    id,
    data,
    setting,
    tuning,
    grid,
    start,
    exit,
    exitTile,
    checkpoints: setting === 'easy' ? spots(grid, marks, 'C') : [],
    boxes: spots(grid, marks, 'B'),
    disco: marks.has('D') ? spot(grid, marks, 'D') : null,
    treasure: marks.has('G') ? spot(grid, marks, 'G') : null,
    robots: (data.robots ?? []).map((robot) => buildRobot(robot, grid, marks)),
    cameras: (data.cameras ?? []).map((camera) => buildCamera(camera, grid, marks, tuning)),
    sensors: (data.sensors ?? []).map((sensor) => buildSensor(sensor, marks, tuning)),
    lasers: (data.lasers ?? []).map((laser) => buildLaser(laser, grid, marks, tuning)),
    stops: (data.guide ?? []).map((name) => buildStop(name, grid, marks)),
    help: 0,
    exitSteps,
    par: Math.ceil(walk * STAR_TIME_PACE + (data.waiting ?? 0)),
    routes: new Map(),
  };
}

const HELP_AFTER = [3, 5];

/** Quiet help: 1 after three losses in a row on a level, 2 after five. */
export const helpFor = (losses: number): number => HELP_AFTER.filter((count) => losses >= count).length;

/** The same level, gentler. Robots slow down, every cone narrows, and at 2 each wait sign is also a checkpoint. */
export function withHelp(level: Level, help: number): Level {
  if (help === 0) return level;
  const { tuning } = level;
  const gentle: Tuning = {
    ...tuning,
    patrol: tuning.patrol * 0.75,
    chase: tuning.chase * 0.75,
    noticeHalf: tuning.noticeHalf * 0.7,
    noticeRange: tuning.noticeRange * 0.8,
    stillRange: tuning.stillRange * 0.8,
    alertS: tuning.alertS + 0.3,
    loseAfter: tuning.loseAfter * 0.7,
  };
  return {
    ...level,
    help,
    tuning: gentle,
    cameras: level.cameras.map((camera) => ({ ...camera, half: camera.half * 0.7 })),
    checkpoints: help < 2 ? level.checkpoints : [...level.checkpoints, ...level.stops.filter(({ sign }) => sign).map(({ spot: place }) => place)],
    routes: new Map(),
  };
}

/** Which letters and digits the map uses, so a test can spot a typo or a forgotten hazard. */
export const namedMarks = (map: readonly string[]): string[] =>
  [...new Set(map.join('').split(''))].filter(isName);
