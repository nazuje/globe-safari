import { SL_LEVELS } from './slWords.ts';

/**
 * Everyday Slovenian words and their common forms, three to five letters long.
 * The tray's extra letters must never be able to spell one of these instead of
 * the target, so a child can't build a real word that the game calls wrong.
 */
const EVERYDAY = `
aha akt ali ata ati bal bar bas bel bes bež bik bil bit bob bog boj bok bol bom bor bos boš bož brž bum car cel cev
daj dal dam dan dar dat daš ded del des dež dih dim dna dne dni dno dnu dob dol dom duh dva dve ena ene eni eno eva
evo far fen fuj gad gaj gej gol gor grd gre grm haj hej hip hit hiš hod hoj hop hot hud hči iga igo ima ime iti jam
jan jaz jed jej jem jet jež jih jim joj jok jug kaj kam kap kar kač kdo ker kil kip kis kje kos kot koš kri krt krč
kuh kup lak lan las laž led lep les let lev leč lik lip lis lok lom los lov luk luč mah maj mak mal mam mar maš med
met mir mit miš moj mol moč mož mri mrk muh nad naj nam nas naš nek nit niz nič nje njo nog nor nos nov noč nož oba
obe oho oko oli ona one oni ono opa osa oče oči pad pah pal par pas pač pek pel pes pet peč peš pij pik pil pir pit
pod pol pot pri psa pse psi psu pub puh rad raj rak ram ran red rek rep res rez reč rib rim rit rob rod roj rok rop
rov rož rum rus sad saj sal sam san sef sem sen ser sil sin sir sit siv sla slo sme smo sod sok sol spi sta ste sto
suh sva tak tal tam tat tej tek tem ter tih tin tip tir tič tja tla tok ton top trg tri trk tuj tuš uho uma upa ura
ure uri uro ust uči uši vaj val vam van vas vaš ved vem ven ves vez več veš vic vid vij vir vod vol voz vrh vrt vrv
vsa vse vsi vso zal zda zdi zid zla zle zlo zna zob čaj čar čas ček čem čep čet čez čim čip črk črn čut šah šal šef
šel šiv šla šle šli šlo šok šov šum žal žar žen žep žge žig žir živ žre žur
ajda alfa alge avli avta avto azil baba baje bala bale bana bank barv bati baza bazo bega begu bela beli belo bena
beri beta beži bika bila bile bili bilo biti bitk blog blok bobi bodi bodo boga bogu boja boje boji bojo boju boke
boki boks boku boli bolj bomo boni bori bosa bosi brad bral bran brat brca breg brez brin brke brki brod bruc brut
buča buče bučo cela cele celi celo cena cene ceni ceno cent cest cevi cilj cmok cvet daje dajo dala dale dali dalj
dalo dama dame dami damo dana dane dani dano daru data dati dava dela dele deli delo delu desk deva dima dimu dina
dira dlak dlan doba dobe dobi dobo doga dolg doli doma domu dona dost doza dozo drag dren dres drsi drug drva drža
drži duha duhu duša duše duši dušo dvig dvom dvor ekip enak enem enih enim enka enot fajn faks fant farm faza fena
film fina fine fino flek font fort foto funt gaje gaji gala gama gara gasi geja geni gibe glas glej glij gluh gnev
gnil gnoj goba gobe gobo godi goji gola gole golf goli golo golu goni gora gore gori goro gosi gost gozd grad graf
grah gram grda grdo gred greh grem grki grla grlo grlu grob grof grom guma gumb gume gumi gumo hala halo heca herc
hipu hiša hiše hiši hišo hlad hlač hlev hlod hobi hodi hoja hoje hojo hopa hoče hram hrib hrup huda hude hudi hudo
huje hura hčer idol igla igle igli iglo igra igre igri igro imam imaš imel iran irec ista iste isti isto itak izda
izum jabo jaha jaka jama jame jami jamo jata javi jedi jedo jemo jest jeva jeza jezo jezu ječa ječo joga jogi jogo
jopa jope jopo joče juda juga juha juhe juho kadi kaka kako kamp kanu kaos kape kapo kati kava kave kavi kavo kavč
kača kače kači kačo kaša kaše kašo kaže kaži kdaj kdor keša kile kilo kina kino kinu kipa kipe kipu kita kjer klan
klet klic klin klon klop klub kmet knez knof koda kode koga kola koli kolo kolu koma komi komu kopa kopi kora kore
kori koro kosa kose kosi koso kost kosu kota kotu koza koze kozi kozo koča koče koči kočo koša košu koža kože koži
kožo kraj krak krat kres krij kril kriv križ krof krog krov krpa krpo krst kruh krut krvi krče krči krši kuba kubi
kubo kuga kuha kult kuma kupa kupe kupi kupo kura kurb kure kuri kuro kuža kvas kviz lada laja lama lani lano lase
last lasu lava lača laže laži leda lede ledu lega lena leni leno lepa lepe lepi lepo lesa lesu leta lete leti leto
letu leva leve levi levo leča leži ležo lica lice licu liga ligo lika liki liko lila lipa lipe lipi lipo lisa lise
list liza liže ljub loka loke loki lomi lopa lopi loti loto lova lovi loči loža lože loži luka luna lune luni luno
lupa lupe lupo lutk luči luža maha maja maje maji majo maks mala male mali malo mama mame mami mamo mana manj mano
mapa mape mapo marš masa mase masi maso mast mati mačk maša mašo medu mega meja meje meji mejo meli melo mene meni
mera mere meri mero mesa meso mest mesu meta meti meča meče meči meču meša mija miku mila mina mine miri miru misa
miza mize mizi mizo miša mlad moda mode modi modo moja moje moji mojo moka moke moki moko moli molj molk mono mora
more mori moro most moti moto moža može moži možu mrak mraz mrož muca muce muci muco mudi muha muhe muhi muho muka
muke mula muza muči naga naju nami nase nata nate nato nauk naša naše naši našo neba nebi nebo nebu nego neha neka
neko nese nesi neti nima nisi niso nita niti nivo nizu noga noge nogi nogo noht nora nore nori norm noro nosa nosi
nosu note nova nove novi novo noče noči noža nože noži nožu nudi nuja nula oaza obed obeh obir obok obrt obrv obuj
ocen odej oder odru okej oken okna okno oknu okus olja olje omak opal opek opis oreh orel orla orli oseb osel osem
osje oska osla oslu osmi osmo osti otok ovca ovco oven ovir ovoj ozek ozka ozko ozri očal očka očku pada pade padi
pala pale pali palm palo panj papa para pare pari paro paru pase pasi past pasu pata pazi paša paše pega pege pegi
pego peka peki peko pela pele peli pelo pena pene peni peno pero pesa pese pesi peso pest peta pete peti peto peče
pije pika pike piki piko pila pile pili pilo pine pipa pipe pipi pipo pira pire pisk pita pite piti pito pivo pivu
piše plan plat plaz plač plen ples plin plod plot plug plus poba poda pode podi poje pojo poka poke poki pola pole
polh poli polj polk poln polo polt polu polž poni ponj pono port post pote poti poto pouk pove poza poči prag prah
pral prav pred prej prek prha prsa prsi prst prva prve prvi prvo psom ptic ptič pula puli pult pulz puma punc punt
punč pust puta pušk rabi raca race rada rade radi raja raje raju raka rake raki rama rame ramo rana rane rani ranč
rasa rase rast reci reda redu reka reke reki reko rena repa repe repi repo repu reva rezi reče reči reši rešo reža
reži riba ribe ribi ribo rima rime riti riše riže rižu rjav robe robi robo robu rodi rodu roga rogi rogu roji roka
roke roki roko ropa rosa rose rosi roso roza roža rože roži rožo ruda rude rudo ruma rusa ruse rusi ruta rute ruti
ruto ruši rušo sabo saka sama same sami samo samu sani sanj sapa sape sapi saša sebi sede sedi sega seja seka sela
seli selo selu seme sena senc seno senu sera seri seči seži shod siga sije sila sile sili silo sina sine sinu sipa
sira sire siri siru sita site siti sito siva sive sivi sivo skal skok skot skoz skrb slab slak slan slap sled slej
slep slik slog sloj slon sluh sluz smeh smej smel smer smet smrk smrt sneg snel snop snov soba sobe sobi sobo soda
sode sodi sodo sodu soja soka soke soki soku sola soli soln solo soma some somi sope sova sove sovi sovo spat spet
spil spoj spol spor spot sprl sram srbi srca srce srci srcu srna srne srni srno srči stal stan star stas sten step
stik stil stoj stok stol stop stra suha suhe suhi suho suka suma sume surf suša svak svet svit svoj tabo taka take
taki tako tale tang tank tara tare tarč tata tate tati tebi teci tega teka teku tele telo tema teme temi temo temu
tepe tepi teta tete teti teto teče teža težo tiha tihe tihi tiho tima tipa tipe tipi tipo tipu tiri tisa tisk tiča
tiče tiči tiše tkan tlak tleh toda toka toki toku tole tolk tolp tomu tone tono topi topo tota toča toče toči točk
točo tožb toži trak tram trap trda trde trdo treh trem trga trik trio trka trma trop trta trte trti trto trud trup
tuja tuje tuji tujo tule tuna tuno turi turk tuša tvoj ubil ubit ubog uboj udar uhan ujel ukaz ulic ulje ulov umij
umik umor umre umri upaj upal upam upaš upor uprl urad urah uran urin urna urni urok usta usti utež uvod uvoz uzda
učen učil učim ušel ušla ušli ušlo užij vaba vabe vabi vadi vaja vaje vaji vaju vala vali valu vame vami vanj vara
vase vasi vaza vaze vazi vaša vaše vašo vbod vdaj vdal vdam vdan vdih vdor vdrl veda vede vedi vedo veja veje veji
vejo veka veke veko vela vele veli velo vemo vena vene veni veno vera vere veri vero vesa vesi vest veti veto veza
vezo veča veče veči veže vhod vice vida vide vidi vidu vija vila vile vilo vina vino vinu vire viri vise visi više
vlog vlom vmes vnos vnuk voda vode vodi vodo vodu vojn vola vole voli volk volu voni vonj vose vosi voso vozi vozu
vpil vpis vrag vran vrat vrba vrbe vrbi vrbo vred vrha vrne vrni vroč vrst vrta vrti vrzi vrča vrži vsaj vsak vseh
vsej vsem vtis vzel vzet vzor vžge vžgi vžig zaba zala zale zali zame zanj zare zate zato zbil zbor zdaj zelo zeta
zgib zima zime zimi zimo zlat zlom zmag zmaj znak znal znam znan znaš znoj zoba zobe zobi zobu zona zora zore zori
zrak zrna zrno zver zvil zvit zvok zvon čaja čaju čaka čapa časa čase časi čast času čaša čeka čeki čela čelo čelu
čemu čepi čeri česa četa četo češe čipa čist član člen čoln črka črke črki črko črna črni črno črpa črta črto črva
črvi čuda čudo čuje čuti čuva šaha šala šale šali šalo šank šans šapa šarm šefa šefi šejk šele šema šest šipa šipe
šipi šipo šive škaf škof škot šoka šoku šola šole šoli šolo šopa šopi špik štab štel štet štor štos šuma žaba žabe
žabi žabo žaga žage žagi žago žali žalo žara žare žaru žeja žeje žena žene ženi ženo žepa žica žila žile žili žilo
žima žita žito žitu živa žive živi živo žoga žoge žogi žogo žolč žuli župa žura
agent ajdov alarm album alija aloha ampak angel arena areni arhiv arija avion avtom avtor babic balet banda bande
bando banka banki barka barki baron barva barvi barvo bazen bedak bedna bedni bedno bedro belca belci belih benda
bendu besni beton biser bitja bitje bitka bitke bivša blaga blago blata blato blatu bledo blizu bliža blond bluza
bluzo bobek bober boden bodež bogat bogve bojem bojev bojne bojni bojno bojte bolan bolha bolje bolna bolno bonus
borba borca borci borec boril borim borzi bosta boste boter brada brade brado brala brali brani brata brati bratu
bravo breza briga brije brisa brlog broda brska bruha brusi buden bujno butec bučka cekin celih celim cenil cenim
centa cesar cesta ceste cesti cesto cevko cigan cilje cimra cunja cunje cveti cvika dajal dajem dajmo dajta dajva
danes daste datum davek davke davki davno debel deblo dedek dekan dekle delaj delam delci delni delno delov denar
deset deska deske deski desko desna desni desno dečka dečki dečko dečku dežja dirka dirke dirko diska disko divja
dlaka dlake dlako dleto dneva dnevi dnevu dober dobra dobre dobri dobro dojel dokaj dokaz dolar dolga dolgo domač
domov dopis dosje dosti draga drage dragi drago drama drame dramo draži drevo droga druga drugi drugo drzen drzna
držav duhan dvema dvoje dvoma edina edino ekipa ekipo ekran enaka enaki enako enota enoti enoto etika falot fanta
fante fanti fantu farma farme farmi farmo filma firma floti galeb garal gasil glava glave glavi glavo glina globa
gluha gluhi gluma golob gorah gorak gorel gorje gosja gosli gosti gozdu grabi grada gradi grehi grejo gremo grize
groba grobi grobu groza grozd groze grozi gruča gumba gumbe gumbi haljo harfa hecam hecaš heroj hipec hiter hitra
hitre hitri hitro hišni hlada hlače hmelj hodil hodim hokej hotel hočem hrana hrane hrani hrast hrbet hrbta hrbtu
hriba hribe hribu hrček hudič hujša hujše hvala hvali hčera idejo igrah igraj igral igram igrat igrač imajo imata
imate imava imela imeli imena iraku irska irske iskan iskat iskra iskre izbor izjav izjem izlet izvem izven izvir
izvor jabka jadra jadro jahal jahač jahte jahto jajca jajcu jakna jakne jakni janka jarek jasen jasli jasna jasne
jasni jasno javim javna javne javni javno javor jašek jedel jedra jedro jeklo jelen jelka jelke jelki jelko jerič
jesen jesti jetra jezer jezik jezna jezni jezno jezus jokaj jokam jokaš jočem jočeš junak jutra jutri jutro južna
južne kabel kadar kader kadet kadil kadim kadiš kajak kajti kakao kalij kamen kamer kamin kamna kamne kamni kamnu
kamor kampu kanal kanta kapca kapla karte karti kaset kasno katja kavka kavču kazal kazen kazni kačji kažem kažeš
kdove kesan kečap kijem kipec kislo kitov klada klana klapa klepa kleti kleče klica klice klicu klima kliče klopi
klovn kluba klube kmalu kmeta kmetu kobra kocka kocke kocki kocko koder kogar kokos kolač kolen koles komad komaj
komar kombi komet komur konce koncu konec konja konje konji konju kopal kopel kopje kopno korak koren kosec kosil
kosov kosti kotel kovač kovin košek krade kraji kralj krava kreda krede krema kresa krije krila krilo kriva krive
krivo kriza krize krizo križa kroga kroge krona krone krono kroži krsta krsti kruha kruhu kruta krvav krvjo krvne
krvni krčmi kuhal kuham kuhaš kulta kupca kupci kupec kupil kupim kupom kupon labod ladje ladji ladjo lahek lahka
lahko lakaj laseh laser lasje lačen lačna lačni lažem lažen lažeš lažje lažne lenuh lepak lepih lepim lepša lepše
lesen leska letak letel letih letim letna letni letno letos letov levja levji lijak liker lipov liste listo liter
litra lička lična ljuba lonec lopar lopov losos lotim lovca lovce lovci lovec lovim lovit lovka ločim lutka lutke
lutki lutko lučka lučke lučki lučko lučmi madež mahal majna major malce malec malih mamin maral maram maraš marec
marka maska maske masko masla maslo maslu mater matič mavec maček mačje mačji mačke mački mačko media medic megla
mehak mehka mehki mehko mejah menda menja menoj meril mesar mesec mesta mesto mestu metal meter metki metla metle
metli metra metro mešaj midva minil minut miren mirna mirne mirno mitov mizar mišji miška miške miški miško mlada
mlade mladi mlado mlaka mleku mnogo modra mojih moker mokra mokri mokro molči moral moraš morda morja morje morju
motil motiv močan močer močna močno moška možak možje mraza mreža mrtev mrtve mrtvi mrtvo mrzel mrzla mrzle mrzlo
mucek mulca mulci muzej mučil naboj nadel nafta nafte nafto nagel najde najel najem najet nakit nakup napak napet
napil napis napoj napol napor nared narod nasip naspi navad nazaj naziv načrt našel našem našle nebes neboj nebom
nehaj neham nehaš nekaj nekam nekdo nekih nekod nekom nekoč nemir nerad nesla nesli nesti nečak nihče nikar nikdo
nista niste nisva nitka nizek nizka nizke nizko njega njemu nocoj nohte nohti norce norci norec norih norma nosač
nosil nosim noter notri novec novic novih novim nočem nožek nožič nožna nujno obala obdan obema obesi obeta obisk
objel objem oblak oboje obrat obraz obred obril obrne obrni obrok obroč obrti obrvi ocean ocena oceni oceno ocvrt
odeja odeje odejo odkar odnos odpre odsev odtis ogenj oglas ogled ognja ogrel oklep oknih oknom okoli okraj okrog
okusa okusi okvir oleje oltar omaka omako omara omare omari omega omeni onega opeka opeko opera operi opero opice
opico opisu oreha orehi organ orgle orkan orlov oseba osebi osebo ostal oster ostra ostre ostri ostro otoka otoke
otrok ovira ovire ovčar ovčka očala očali očesa očeta očija packa padal padam padec padem padla pajek pajka pajki
paket palač palca palec palic palma palme palmi palmo pamet panda papir parka parku parom pasja pasje pasji pasjo
pasom pasti pasto pavzo pazim pegam pekar peklo peklu pelin penca pesek pesem pesku pesti peten petih petja petka
petko pevca pevci pevec pevka pečat pečen pečka piano pihal pijan pijač pijem pijte pilot pilul pirat pisar pisec
pisma pismo pisno pivec pišem plano plast plata plati plava plača plačo plašč plaža plaže plaži plažo plena plesa
plesu plete pleza pleše plima plina pline plinu pljuč pluta pobeg pobič pobje podre pohod pojav pojdi pojem poješ
pojma pojte pokal pokla pokoj pokol pokra polet polja polje polju polna polne polni polno polom pomen pomoč ponev
ponje ponjo ponos ponvi posel posla posle posli poslu poteh potek potem potez potni potok pouka povej povem poveš
pozen pozna pozno počel počne pošta pošte pošti pošto praha prase prati prava prave pravi pravo praše preko prhat
prida pride prima prime princ priča prosi prost prsih prsni prsta prste prsti prvak prvič psica psico psiho ptice
ptici ptico ptiča ptiče ptiči ptiču punca punce punci punco puran puška puške puško pušča rabil rabim rabiš radia
radio radič rahla rahlo rajše rajši rakec raket rakom rakun ranil rasla raste rasti ravne ravni ravno razen razna
razum račka račke rački račun ražen rdeča rdeče rdeči rdečo redek reden redka redki redko redna redni redno rekel
rekla rekli rekoč repek resda resen resna resne resni resno revež revij revna revni rečmi rešen rešil ribah ribar
ribič ribja ribje ribji risba risbe risbi risbo ritem ritma rizik rišem rjava rjavi rjavo rjuhe robec robot rodil
rogat rogač rojen roman rosen ročaj ročno rožic rubin rumen runde ruska ruske ruski rusko rusov sadja sadje sadju
sadni sadov salon samca samec sanja sanje scena sceni seboj sedaj sedem sedež sedla sedli sedlo sejmu senat senca
sence senci senco serji serum sesti sever sicer sidro sinji sinko sinov sirup siten skala skale skali skače skica
skice sklep skoki skoči skrbi skrij skrit skuša slabe slabo slama slame slami slamo slano slave slavo sleci sledi
sledu slepa slepi slepo slika slike sliki sliko slina sline slino sliva slive slivi slivo sloga slone sloni slonu
slovo sluga služi smeha smeje smejo smela smeta smeti smeva smrad smrka smuka snega snegu snela sneli snema sneti
sneži snovi sobah sobar sobno sodba sodbe sodil sodna sodne sodni sodno sokol solza solze sonca soncu sonda sonde
sondo sorta sorte sosed sočen sočna spaka spala spati speče spije spijo spite spiti splav splet sploh spola spora
spore sporu sprej srajc srake srbin srcih sreda sredi sredo sreča sreče srečo srček srčna stalo stana stane stara
stare stari staro starš stavb stave stavi stavo steci stena stene steni steno steza stika stike stoje stoji stoka
stola stole stoli stolp stolu stopa stopi stori strah stran strel stric stroj strop stvar stvor suhec sukno super
surov sveta svete sveti sveto svetu sveče sveči svečo sveža svila svile svili svilo svita svoja svoje svoji svojo
tabla table tabli tabor tadva tajna tajne tajno takem takih takoj taksi talca talce talci talec talna tamle tanek
tanka tanke tanki tarči tarčo tačas tačka tačke tački tačko taška tašča teboj tedaj teden tedna tedni tednu tekač
tekla tekli tekma tekme tekmi telec telje temen temna temne temni temno tenis tepca tepci tepec tepka tepla tepli
terja tesar tesen teslo tesna tesno testo tečaj težak težav težka težko tigra tigre tigri tigru tihec tihem tipko
tipom tipov tiran tiska tisoč tisti tičem tkiva tkivo tlaka tlemi tobak tolar tolpa tolpe tolpi tolpo tolče tonem
topel topla tople topli toplo topov torba torbe torbi torbo torej torek torte torti torto tovor točaj točka točke
točki točko trapa trava trave trden trdna trdne trdno treba tremi tremo trend tresk trije trike trkaj trnek trnje
trobi troje trska trudi tujca tujce tujec tujka tukaj tulec tunel turbo turek turka tvega tvoja tvoje tvoji tvojo
ubija ubije ubila ubile ubita uboga uboge ubogi uboja ugriz uhaja uhane ujeta ujeti ukaza ukazi ukrep ulezi ulica
ulice ulici ulico ulovi ultra umika umira umiti umora umore umret unuka unuke upajo upala upali upamo upate upati
upava urada urama urami ureja urina urnik usedi usnje usoda usode usodi usodo uspeh uspel ustje ustna ustne ustno
uteha utrip učimo ušesa vabil vabim vabiš vadbo vadim vadiš vajah vajen vajin vanja vanje vanjo varal varen varne
varni varno varuh varuj vašem vaših vašim važen važna važno vdala vdani veder vedno vedra vedro vegan velik velja
vesel vesla veslo vesta vesti veter vetru vezan večen večer večja večjo večna vešča vhoda videa viden video vidim
vidiš vidna vidne vidno vidra vidre vidri vidro vihar vijak vinom viola visel visok vitez višek višja višje vlada
vlade vladi vlado vlaga vlaka vlake vlaki vlaku vleci vleče vloma vlomi vneto vnuka vnuke vnuki vodja vodje vodka
vodke vodna vodne vodni vodno vohaš vohun vojak vojna vojne vojni vojno volan volja volje volka volki volku volna
volne volni volno vonja vosek vozel vozil vozim vozni vpila vrana vrane vrani vrata vratu vrelo vreme vreča vreče
vreči vrečo vrnem vrneš vroča vroče vroči vrste vrsti vrsto vrtec vrtel vrček vržem vsaki vsako vsedi vsota vsote
vsoto vstop vzami vzela vzeli vzelo vzemi vzeti vzeto vzgoj vzlet vzrok zabav zabil zabit zaboj zadah zadaj zadev
zagon zajca zajci zajcu zajec zakaj zakon zaliv zalog zamah zaman zanje zanjo zanju zanka zapel zapoj zares zarja
zaspi zasuk zatem zaupa zavij zavil zavit zavod zavoj začel začne zašel zberi zboli zboru zbuja zdrav zebra zebre
zelen zelje zgubi zgubo zibka zidak zidar zidek zidka zijat zlaga zlata zlate zlati zlato zlatu zloba zlobe zloma
zmaga zmagi zmago zmaja zmaji zmeda zmeni zmeša zmore zmota znajo znaka znaki znaku znala znali znamo znata znate
znati znava znaša znebi znori znova zobeh zobek zobje zobmi zobne zobni zombi zopet zrele zreli zrelo zunaj zveni
zveri zveza zvezi zvija zvita zvito zvoka zvoke zvoki čakaj čakal čakam čakaš časov časti čebel čekov čelni čemur
česar čimer člana čreda čreva črevo čudak čuden čudež čudim čudno čukov čutim čuval šanse šepet šesti šibek šibka
širok škoda škodi škrat škrge šolar šopek šotor špela špica šport štaba štala štedi šteje štiri šunka žabec žagar
žalik žarek žarki žejna želim želja željo želod želva želve želvi želvo žensk žepek žetev žgati žival živec živel
živim žlica žlice žlici žlico žolna žrtev žrtve žrtvi župan žveči žvižg
`
  .split(/\s+/)
  .filter(Boolean);

export const SL_LEXICON: readonly string[] = [
  ...new Set([...EVERYDAY, ...SL_LEVELS.flatMap((level) => level.words.map((entry) => entry.word))]),
];
