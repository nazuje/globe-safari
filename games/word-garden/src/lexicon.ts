import { LEVELS } from './words.ts';

/**
 * Everyday words a child or grown-up would accept as a real answer. The tray's
 * extra letters must never be able to spell one of these instead of the target.
 */
const EVERYDAY = `
act add age ago aid aim air all and ant any ape arm art ash ask ate awe axe
bad bag ban bar bat bay bed bee beg bet bib bid big bin bit bow box boy bud bug bun bus but buy
cab can cap car cat cob cod cog cop cot cow cry cub cue cup cut
dad dam day den dew did dig dim dip dog dot dry dub due dug dye
ear eat egg elf elk elm end era eve ewe eye
fad fan far fat fed fee few fig fin fir fit fix fly foe fog for fox fry fun fur
gap gas gem get gig gin god got gum gun gut guy gym
had ham has hat hay hem hen her hid him hip his hit hog hop hot how hub hug hum hut
ice icy ill imp ink inn ion its ivy
jab jag jam jar jaw jay jet jig job jog jot joy jug jut
keg ken key kid kin kit
lab lad lag lap law lay led leg let lid lie lip lit log lot low lug
mad man map mat may men met mix mob mom mop mow mud mug mum
nab nag nap net new nil nip nit nod nor not now nun nut
oak oar oat odd off oil old one orb ore our out owe owl own
pad pal pan paw pay pea peg pen pet pew pie pig pin pit ply pod pop pot pro pry pub pug pun pup put
rag ram ran rap rat raw ray red rib rid rig rim rip rob rod rot row rub rug rum run rut rye
sad sag sap sat saw say sea see set sew she shy sin sip sir sit six ski sky sly sob sod son sow soy spa spy sub sum sun
tab tag tan tap tar tax tea ten the tie tin tip toe tog ton too top tow toy try tub tug two
urn use van vat vet vow wag war was wax way web wed wee wet who why wig win wit woe wok won woo wow
yak yam yap yes yet yew you zap zip zoo
able ache acid acre aged also ants arch area army arts aunt away
baby back bail bake bald ball band bang bank bark barn base bath bead beak beam bean bear beat beef been beer bell belt bend bent best bike bill bind bird bite blew blob blot blow blue blur boar boat body bold bolt bomb bond bone book boot bore born boss both bowl brag bran brat brew brim bulb bull bump bunk burn bush busy
cage cake call calf calm came camp cane cape card care cart case cash cast cave cell chat chef chew chin chip chop city clam clap claw clay clip club clue coal coat code coil coin cold comb come cone cook cool cope cord core cork corn cost cosy cozy crab crew crib crop crow cube cuff curb cure curl cute
dale damp dare dark dart dash date dawn days dead deaf deal dear deck deep deer dent desk dial dice diet dime dine dirt dish disk dive dock does doll dome done door dose dots dove down drag draw drew drip drop drum dual duck dude duke dull dumb dump dune dusk dust duty
each earn ears ease east easy eats edge eggs else even ever evil exit eyes
face fact fade fail fair fake fall fame fang fare farm fast fate fawn fear feed feel feet fell felt fern fest fill film find fine fire firm fish fist five flag flap flat flaw flea fled flew flip flit flop flow flute foam foil fold folk fond food fool foot fork form fort foul four fowl free frog from fuel full fund fuse fuss
gain gale game gang gate gave gaze gear gift gill girl give glad glee glow glue goal goat gold golf gone good goof gown grab gram gray grew grey grid grim grin grip grit grow gulf gull gust
hail hair half hall halt hand hang hard hare harm harp hate haul have hawk head heal heap hear heat heel held hell helm help herb herd here hero hide high hike hill hint hips hire hiss hits hive hold hole holy home hood hoof hook hoop hoot hope horn hose host hour howl huge hull hump hung hunt hurt hush hymn
idea idle inch into iron item
jail jazz jeep jerk jest jobs join joke jolt jump june junk jury just
keel keen keep kelp kept kick kids kill kind king kiss kite kiwi knee knew knit knob knot know
lace lack lady laid lake lamb lame lamp land lane lark lash last late lava lawn lazy lead leaf leak lean leap left lend lens lent less lick lied life lift like limb lime limp line link lion lips list live load loaf loan lock loft logo lone long look loop lord lose loss lost lots loud love luck lump lung lure lurk lush
made maid mail main make male mall malt mane many mare mark mash mask mast mate math maze meal mean meat meet melt memo mend menu meow mesh mess mice mild mile milk mill mind mine mint miss mist mitt moan moat mock mode mold mole monk mood moon moor more moss most moth move much mule muse must mute
nail name nape navy near neat neck need nest news next nice nick nine node noon nose note noun nuts
oaks oars oath obey odds oils okay once ones only onto open oven over owls
pace pack page paid pail pain pair pale palm pant park part pass past path pave pawn paws peak peal pear peas peat peck peek peel peep peer pelt pets pick pier pike pile pill pine ping pink pint pipe pits pity plan play plot plow plug plum plus poem poet pole poll polo pond pony pool poor pope pops pork port pose post pour pray prey prod prop pull pulp pump punk pure push
quit quiz race rack raft rage raid rail rain rake ramp rang rank rare rash rate rats rave read real reap rear reed reef reel rely rent rest rice rich ride rift ring riot ripe rise risk road roam roar robe rock rode role roll roof room root rope rose rosy ruby rude ruin rule rung runs rush rust
sack safe sage said sail sake sale salt same sand sane sang sank save scan scar seal seam seat seed seek seem seen self sell send sent shed shin ship shoe shop shot show shut sick side sift sigh sign silk sill silo sing sink site size skid skim skin skip skit slab slam slap sled slew slid slim slip slit slob slop slot slow slug slum smug snag snap snip snow snub snug soak soap soar sock soda sofa soft soil sold sole some song soon soot sore sort soul soup sour sown spin spit spot spun spur stab stag star stay stem step stew stir stop stub stud stun such suck suit sulk sung sunk sure swam swan swap sway swim
tack taco tail take tale talk tall tame tank tape tart task taxi team tear teen tell tend tent term test text than that them then they thin this thud thug thus tick tide tidy tied tier tile till tilt time tiny tips tire toad toes tofu told toll tomb tone took tool toot tops tore torn toss tour town toys tram trap tray tree trek trim trio trip trot true tube tuck tuna tune turn tusk twig twin type
ugly undo unit upon urge used user vain vale vane vase vast veil vein vent verb very vest veto view vine visa void volt vote
wade wage wail wait wake walk wall wand want ward warm warn wart wash wasp wave wavy waxy weak wear weed week weep well went were west wham what when whip whom wick wide wife wild will wilt wind wine wing wink wipe wire wise wish with woke wolf wood wool word wore work worm worn wove wrap wren
yard yarn yawn year yell yoga yolk your zero zinc zone zoom
about above acorn actor adult after again agree ahead alarm alert alike alive allow alone along among angel anger angle angry ankle apart apple apron arena arrow aside atlas awake award aware
bacon badge baker basic basin beach beard beast began begin being belly bench berry bible bingo birch birth black blade blame blank blast blaze bleak blend bless blind blink bliss block blond blood bloom blown blues bluff blunt blush board boast bonus boost booth boots bored bound brain brake brand brass brave bread break breed brick bride brief bring brink broad broke brook broom broth brown brush build built bulky bumpy bunch bunny burnt burst buyer
cabin cable camel candy canoe cards cargo carol carry catch cater cause cedar chain chair chalk champ chant chaos charm chart chase cheap cheat check cheek cheer chess chest chick chief child chill chime chimp china chirp choir chomp chord chose chunk cider cigar cinch civil claim clamp clang clash clasp class clean clear clerk click cliff climb cling cloak clock clone close cloth cloud clove clown clubs cluck clump coach coast cobra cocoa comet comic coral could count court cover crack craft crane crash crate crawl crazy creak cream creek creep crepe crest crime crisp croak crock crook cross crowd crown crude cruel crumb crush crust curly curve cycle
daily dairy daisy dance dared dates dealt death decal delay delta dense depth diary dicey diner dirty ditch diver dizzy dodge doing donut doubt dough dozen draft drain drake drama drank drape drawn dread dream dress dried drift drill drink drive droit drone drool droop drops drove drown drums drunk dryer ducks dusty dwarf
eager eagle early earth easel eaten eight elbow elder elect elves empty enemy enjoy enter entry equal erase error essay event every exact extra
fable faced fairy faith false fancy fatal fault favor feast fence ferry fetch fever fewer fiber field fifth fifty fight final finch first fixed flake flame flash flask fleet flesh flick fling flint flip float flock flood floor flora floss flour flown fluff fluid fluke flush flute focus foggy force forge forth forty forum found frame frank fraud freak fresh friar fried frill frisk frizz frock front frost frown froze fruit fudge fully funny furry fussy
gamer gauge gecko genie ghost giant giddy given glade gland glare glass gleam glide glint globe gloom glory gloss glove gnome goose gorge grace grade grain grand grant grape graph grasp grass grate grave gravy graze great greed greek green greet grief grill grime grind groan groom gross group grove growl grown guard guess guest guide guild guilt gummy gusty
habit hairy handy happy hardy harsh haste hasty hatch haunt haven hazel heads heard heart heavy hedge hefty hello hence heron hills hippo hobby hoist holds holly honey honor hoped hopes horse hotel hound hours house hover human humid humor hurry husky
icing ideal igloo image imply inbox inner input irony issue itchy ivory
jazzy jeans jelly jewel jiffy joint joker jolly judge juice juicy jumbo jumpy juror
kayak kebab kiosk kitty knack knead kneel knelt knife knock known koala
label labor laced lance large laser later laugh layer learn lease leash least leave ledge lemon level lever light lilac limit linen liner liver llama loaded loaf lobby local locks lodge lofty logic loose lorry loser lotus loved lover lower lucky lumpy lunar lunch lunge lying lyric
macaw magic major maker mango manor maple march marry marsh match maybe mayor meant medal melon mercy merge merit merry messy metal meter midge might mimic mince miner minor minty minus mirth misty mixed mixer model moist molar money month moody moose moral motel motor motto mound mount mourn mouse mouth moved movie muddy mummy mural music mushy
naive nanny nasty naval navel nerve never newly nicer niece night ninja ninth noble noise noisy north notch noted novel nudge nurse nutty nylon
oasis occur ocean offer often olive onion onset opera orbit order organ other otter ought ounce outer overt owner oxide ozone
paddy paint panda panel panic pansy pants paper party pasta paste pasty patch patio pause peace peach pearl pecan pedal penny perch peril petal phone photo piano picky piece piggy pilot pinch piper pitch pizza place plaid plain plane plank plant plate plaza plead pleat pluck plumb plume plump plush poach point poise poker polar polka pooch poppy porch pouch pound power press price prick pride prime print prior prism prize probe prong proof prose proud prove prowl prune puffy pulse punch pupil puppy puree purse pushy putty
quack quail quake qualm quart queen query quest queue quick quiet quilt quirk quite quota quote
rabid racer radar radio rainy raise rally ranch range rapid raven razor reach react ready realm rebel refer reign relax relay renew reply rhino rhyme rider ridge rifle right rigid rinse ripen risen risky rival river roach roast robin robot rocky rodeo rogue roomy roost rough round route rover royal rugby ruler rumor rural rusty
sadly safer saint salad salon salsa salty sandy sauce sadly savor scale scalp scant scare scarf scary scene scent scone scoop scoot scope score scorn scout scowl scram scrap screw scrub seize sense serve setup seven sever shack shade shady shake shaky shall shame shape share shark sharp shave shawl sheen sheep sheer sheet shelf shell shift shine shiny shirt shock shoes shone shook shoot shore short shout shove shown showy shrub shrug shuck sight sigma silky silly since singe siren sixth sixty skate skill skimp skirt skull skunk slack slain slant slash slate sleek sleep sleet slept slice slick slide slime sling slink sloop slope sloth slump slung slunk slurp slush small smart smash smear smell smelt smile smirk smith smock smoke snack snail snake snare snarl sneak sniff snipe snoop snore snort snout snowy soapy sober solar solid solve sonic sorry sound south space spade spare spark spawn speak spear speck speed spell spend spent spice spicy spike spill spine spiny spite splat split spoil spoke spoof spook spool spoon spore sport spout spray spree sprig spunk squad squat squid stack staff stage stain stair stake stale stalk stall stamp stand stare stark start stash state stays steak steal steam steel steep steer stern stick stiff still stilt sting stink stint stock stoic stoke stole stomp stone stood stool stoop store stork storm story stout stove strap straw stray strip strum strut stuck study stuff stump stung stunk stunt style sugar suite sulky sunny super surge sushi swamp swarm swear sweat sweep sweet swell swept swift swine swing swirl swiss swoop sword syrup
table tacky taffy taken tally talon tango tangy taper tardy taste tasty taunt teach tease teddy teeth tempo tense tenth tepid terms thank theft their theme there these thick thief thigh thing think third thorn those three threw throb throw thumb thump tiara tidal tiger tight tilde timer timid tired titan title toast today token tonal tooth topaz topic torch total touch tough towel tower toxic trace track trade trail train trait tramp trash tread treat trend trial tribe trick tried trike trill troll troop trout truce truck truly trump trunk trust truth tulip tumor tunic turbo tutor twang tweak tweet twice twigs twine twirl twist tying
udder ultra uncle under unfit union unite unity until upper upset urban usage usual utter
vague valid valor value valve vapor vault vegan venom verse video vigor villa vinyl viola viper viral virus visit vital vivid vocal vodka vogue voice vomit voter vowel
wacky wafer wagon waist waltz waste watch water waver weary weave wedge weigh weird whack whale wharf wheat wheel where which while whine whirl whisk white whole whose widen wider widow width wince winch windy wings wiped witch woken woman women woods woody wooly woozy words world worms worry worse worst worth would wound woven wrath wreck wrist write wrong wrote
yacht yeast yield young yours youth yummy zebra zesty zippy zonal
`
  .split(/\s+/)
  .filter(Boolean);

export const LEXICON: readonly string[] = [
  ...new Set([...EVERYDAY, ...LEVELS.flatMap((level) => level.words.map((entry) => entry.word))]),
];
