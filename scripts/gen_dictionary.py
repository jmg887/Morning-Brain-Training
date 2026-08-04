#!/usr/bin/env python3
"""Generate a comprehensive English dictionary for word games."""
import json

words = set()

# 3-letter common words
three = """ace act add ado age ago aid aim air ale all and ant any ape apt arc are ark arm art ash ask ate awe axe
bad bag ban bar bat bay bed bet bid big bin bit boa bog bon bow box boy bud bug bun bur bus but buy
cab cam can cap car cat cop cow cry cub cud cup cur cut
dab dad dam day den dew did dig dim din dip doe dog don dot dry dub dud due dug dun duo dye
ear eat eel egg ego elm emu end era eve ewe eye
fad fan far fat fax fed fee few fig fin fir fit fix fly foe fog fop for fox fry fun fur
gag gal gap gas gem get gig gin gnu gob god got gum gun gut guy gym
had ham has hat hay hem hen her hew hid him hip his hit hob hod hog hop hot how hub hue hug hum hut
ice icy ill imp ink inn ion ire irk ivy
jab jag jam jar jaw jay jet jig job jog jot joy jug jut
keg ken key kid kin kit
lab lad lag lap law lay lea led leg let lid lie lip lit log lot low lug
mad man map mar mat maw may men met mid mix mob mod mom mop mow mrs mud mug mum
nab nag nap nay net new nil nip nit nod nor not now nun nut
oak oar oat odd ode off oft oil old one opt orb ore our out owe owl own
pad pal pan pap par pat paw pay pea peg pen pep per pet pew pie pig pin pit ply pod pop pot pow pox pro pry pub pug pun pup pus put
rad rag ram ran rap rat raw ray red ref rib rid rig rim rip rob rod rot row rub rug rum run rut rye
sac sad sag sap sat saw say sea set sew she shy sin sip sir sit six ski sky sly sob sod son sop sot sow soy spa spy sty sub sue sum sun sup
tab tad tag tan tap tar tat tax tea ten the thy tic tie tin tip toe ton too top tot tow toy try tub tug tun two
ump urn use
van vat vet vex via vie vim vow
wad wag war was wax way web wed wet who why wig win wit woe wok won woo wow
yak yam yap yaw yea yes yet yew you yow
zap zed zen zig zip zoo"""

for w in three.split():
    w = w.strip().lower()
    if len(w) >= 3:
        words.add(w)

# 4-letter common words  
four = """able ache acid acme acre aged aide airy alas ally also arch area army arts atom auto avid axle
back bade bail bait bake bald bale ball balm band bane bang bank bare bark barn base bash bask bass bath bead beak beam bean bear beat been beer bell belt bend bent best bias bike bill bind bird bite blah bled blew blob bloc blog blot blow blue blur boar boat body bold bolt bomb bond bone book boom boot bore born boss both bout bowl brag brat bred brew brim brit broad buck buff bulb bulk bull bump burn burp bust busy buzz
cafe cage cake calf call calm came camp cane cape card care cart case cash cast cave cent char chat chef chin chip chop cite city clad clam clan clap clay clip clod clog clot club clue coal coat code coil coin cold colt comb come cone cook cool cope copy cord core cork corn cost cozy crab crew crop crow cube cult curb cure curl cute
dale dame damn damp dare dark darn dart dash data date dawn days dead deaf deal dear deck deed deem deep deer demo deny desk dial dice diet digs dime dine dire dirt disc dish disk dock does dole doll dome done doom door dose down doze drag draw drew drip drop drum dual duck dude duel duke dull dumb dump dune dung dunk dusk dust duty
each earl earn ease east easy edge edit else emit ends envy epic even ever evil exam exit eyed eyes
face fact fade fail fair fake fall fame fang fare farm fast fate fawn fear feat feed feel feet fell felt fend fern feud file fill film find fine fire firm fish fist five flag flak flam flan flap flat flaw flea fled flew flip flit flog flop flow flux foam foil fold folk fond font food fool foot ford fore fork form fort foul four fowl free frog from fuel full fume fund funk fury fuse fuss
gain gait gale game gang gape garb gash gasp gate gave gaze gear gene gift gild gill gist give glad glee glen glib glow glue gnaw goat goes gold golf gone good gore gory gown grab gram gray grew grid grim grin grip grit grow grub gulf gull gulp gung gust guts
hack hail hair hale half hall halt hand hang hare harm harp hash haste hate haul have haze head heal heap hear heat heed heel heir held hell helm help herb herd here hero hide high hike hill hilt hind hint hire hiss hive hoard hoax hock hoed hold hole holy home hone hood hook hope horn hose host hour howl hued huge hull hump hung hunt hurl hurt hush hymn hype
icon idea idle inch info into iron isle item
jack jade jail jams jars java jazz jean jeer jest jilt jive jobs john join joke jolt jury just jute
kale keen keep kelp kept kick kids kill kind king kiss kite knack knee knew knit knob knot know
lace lack laid lair lake lamb lame lamp land lane lark lash lass last late lawn lazy lead leaf leak lean leap left lend lens less lick lied life lift like limb lime limp line link lint lion lips list live load loaf loam loan lock loft logo lone long look loom loop lord lore lose loss lost loud love luck lull lump lung lure lurk lush lust lynx
mace made maid mail main make male mall malt mane many mare mark mars mash mask mass mast mate maze mead meal mean meat meek meet meld melt memo mend menu mere mesh mess mice mild mile milk mill mime mind mine mint miss mist moan moat mock mode mold mole molt monk mood moon moor more moss most moth move much muck mule mull muse mush musk must mute myth
nail name nape navy near neat neck need nest nice nine node none noon norm nose note noun nude null numb
oath obey odds odor offs okay omen omit once only onto opal open opts oral orca oven over owed owes owl owly owns
pace pack page paid pail pain pair pale palm pane pang park part pass past path pave pawn peak peal pear peat peck peel peer pelt pend perk pest pick pier pike pile pine pink pipe plan play plea plod plot plow ploy plug plum plus pock poem poet poke pole poll polo pond pool poor pope pork port pose post pour pout pray prep prey prod prop pull pulp pump punk pure push
quad quay quit quiz
race rack raft rage raid rail rain rake ramp rang rank rare rash rate rave rays read real ream reap rear reed reef reel rely rend rent rest rice rich ride rift rile rill rind ring riot rise risk road roam roar robe rock rode role roll roof room root rope rose rosy rote rout rove rude ruin rule rump rung runt ruse rush rust
sack safe sage said sail sake sale salt same sand sane sang sank sash save scan scar seal seam sear seat sect seed seek seem seen self sell send sent sept sewn shed shin ship shoe shop shot show shun shut sick side sigh sign silk sill silt sing sink site size skit slab slag slam slap slat sled slew slid slim slit slob slop slot slow slug slum slur smog snap snag snip snow snub soak soap soar sock soda sofa soft soil sold sole some song soon soot sore sort soul soup sour span spar spin spit spot spry spur stab stag star stay stem step stew stir stop stow stub stud stun such suck suit sulk sump sung sunk sure surf swan swap swim
swift swirl
tack tact tail take tale talk tall tame tang tank tape taps tart task taxi teak team tear teen tell tend tent term test text than that them then they thin this thud thus tick tide tidy tied tier tile till tilt time tiny tire toad toil told toll tomb tone took tool tops tore torn toss tour town trap tray tree trek trim trio trip trod trot true tube tuck tuft tuna tune turf turn tusk twin type
ugly undo unit unto upon urge used user
vain vale vane vary vase vast veil vein vent verb very vest vial vice view vine visa void volt vote
wade wage wail wait wake walk wall wand want ward warm warn warp wart wary wash wasp wave wavy waxy weak wean wear weed week weep weigh weld well went were west what when whim whip whom wick wide wife wild will wilt wily wind wine wing wink wipe wire wise wish wisp with woke wolf womb wood wool word wore work worm worn wove wrap wren writ
yard yarn yawn year yell your
zeal zero zest zinc zone zoom"""

for w in four.split():
    w = w.strip().lower()
    if len(w) >= 3:
        words.add(w)

# 5-letter common words
five = """abide about above abuse acted adapt added admin admit adopt adult after again agent agile aging agree ahead aisle alarm alert alias alibi alien align alike alive allay alley allot allow alone along aloof alter amaze ample angel anger angle angry anime annex apart apple apply arena argue arise armor aroma arose array arrow aside asset atlas attic audio audit avoid awake award aware awful
badge badly baker baron basal based basic basin basis batch beach beard beast began begin being below bench berry birth black blade blame bland blank blare blast blaze bleak bleed blend bless blind blink bliss block blond blood bloom blown blues bluff blunt blurt board boast bonus booth bound boxer brace brain brand brass brave bread break breed brick bride brief bring broad broke brook brood broom broth brown brush budge build built bunch burst buyer
cabin cable camel candy cargo carry catch cater cause cedar chain chair chalk champ chaos charm chart chase cheap cheat check cheek cheer chess chest chief child chill china chips choir chord chose chunk churn cigar claim clamp clash clasp class clean clear clerk click cliff climb cling cloak clock clone close cloth cloud clown coach coast cobra color comet comic coral could count couch cough court cover crack craft crane crash cream creek creep crest crime crisp cross crowd crown crude crush curve cycle
daily dance dealt death decay decoy decry delay delta dense depot depth derby devil diary dirty disco ditch dizzy dodge doing donor doubt dough draft drain drama drank drape drawn dream dress dried drift drill drink drive drone drool drops drove drown drums drunk dryer dusty dwarf dwell dying
eager eagle early earth eater edge eight elbow elder elect elite ember empty ended enemy enjoy enter equal equip erase error essay evade event every exact exalt excel exert exile exist extra
fable faced facet faint fairy faith false fancy fatal fault favor feast fetch fever fewer fiber field fifth fifty fight final first flame flash flask fleet flesh flick fling flint float flock flood floor flora flour flown fluid flush flute focal focus force forge forth forum found frame frank fraud fresh front frost froze fruit fully funds funny fuzzy
gauge genre ghost giant given glade glare glass gleam glide globe gloom glory gloss glove going grace grade grain grand grant grape grasp grass grave great green greet grief grill grind gripe groan groin groom grope gross group grove grown guard guess guest guide guild guilt
habit handy happy harsh haste haven heart heavy hedge hello hence herbs hinge hobby honey honor horse hotel house human humor hurry
ideal image imply index infer inner input issue ivory
jewel joint joker judge juice jumbo juror
knack kneel knife knock known
label labor lance large laser latch later laugh layer learn lease least leave legal lemon level lever light limit linen liver local lodge logic loose lover lower loyal lucid lunar lunch lunge lying
magic major maker manor maple march match maybe mayor media merit metal might minor minus model money month moral mount mouse mouth movie muddy music
naive naked nasty naval nerve never night noble noise north notch noted novel nurse
occur ocean offer often olive onset opera orbit order other outer owner oxide
paint panel panic paper party paste patch pause peace peach pearl pedal penny phase phone photo piano piece pilot pitch pixel pizza place plain plane plant plate plaza plead pleat pluck plumb plume plump plunge point polar porch poser pouch pound power press price pride prime print prior prize probe prone proof proud prove prune pulse punch pupil purge purse
quake qualm queen query quest quick quiet quilt quirk quota quote
radar radio raise rally ranch range rapid ratio reach react realm rebel reign relax relay renal repay reply resin retro rider ridge rifle right rigid rinse rival river roast robin robot rocky rouge round route royal rugby ruler rural
sadly saint salad salon sauce scale scare scene scent scope score scout scrap seize sense serve setup seven shade shaft shake shall shame shape share shark sharp shave shear sheer sheet shelf shell shift shine shirt shock shore short shout shown shrub sight since sixth sixty skill skull slack slain slash slate slave sleep slice slide slope small smart smell smile smoke snack snake solar solid solve sorry sound south space spare spark speak speed spend spent spice spike spine split spoke spoon sport spray squad stack staff stage stain stair stake stale stall stamp stand stare start state stave stays steak steal steam steel steep steer stern stick stiff still sting stink stock stoic stone stood stool store storm story stout stove strap straw stray strip strive stroke stroll strong stuck study stuff stump style sugar suite super surge swamp swarm swear sweep sweet swept swift swing sword sworn syrup
table taken taste teach tempo tense terms thank theme thick thief thing think third thorn those three threw throw thumb tidal tiger tight timer title toast today token topic torch total touch tough tower trace track trade trail train trait trash tread treat trend trial tribe trick tried troop trout truck truly trump trunk trust truth tumor twist
ultra uncle under union unite unity until upper upset urban usage usual utter
vague valid value valve vapor vault verse video vigor vinyl viola viral virus visit vista vital vivid vocal voice voter
waist waste watch water weary weave wedge weigh weird wheat wheel where which while white whole whose widen width witch woman world worry worse worst worth would wound wrath write wrong wrote
yearn yield young youth
zone"""

for w in five.split():
    w = w.strip().lower()
    if len(w) >= 3:
        words.add(w)

# 6-letter common words
six = """absorb accept access accord accuse across action active actual adjust admire advise afford agency agenda almost amount animal annual answer anyone appeal appear arctic armory artist assign assist assume attack attend august
author
barely basket battle beacon beauty become before behind belong beside better beyond bishop bitter blanch bounce branch breach breath bridge bright broken bronze bubble bucket budget bundle burden bureau butter
cabinet camera cancel canvas carbon career castle casual caught center chance change charge cheese choice choose chosen church circle client climax closed closer coffee colony column combat comedy common comply convey cookie corner costly cotton county couple course cousin covers crack craft create credit crisis critic crowd cruise custom
cycle
damage danger dealer debate decade decide defeat defend define degree demand denial depart deploy derive desert design desire detail detect device devote dialog differ digest dinner direct divide domain double dragon driven driver during
easily editor effect effort eleven emerge empire enable endure energy engage engine enough ensure entire escape estate evolve exceed except excess excite excuse exempt expand expect expert export expose extend extent
fabric factor fairly family famous farmer father fellow figure filter finale finger finish fiscal flight flower follow forced forest forget formal former fossil foster fourth freeze frozen future
galaxy garden gather gender gentle gifted ginger global golden govern gravel ground growth guilty guitar
handle happen harbor hatred health heaven height hidden holder honest horror hungry hunter
ignore immune impact import impose income indeed indoor infant inform injure injury inland insect inside insist intact intend invest island itself
jacket jersey jumble jungle junior
kernel kidney knight
launch lawyer layout league lessen lesson letter linear liquid listen little lively locate lonely lovely luxury
mainly manage manner marble margin market master matter medium member memory mental merely method middle mingle minute mirror mobile modern modest moment monkey mortal mostly mother motion motive moving murder museum mutual myself
namely narrow nation nature nearby nearly neatly needle nicely noble normal notice number
object obtain occupy offend office online opener oppose option orange origin output
palace parent parish patrol patron people period permit person phrase planet player please pledge plunge pocket poetry poison police policy portal poster potato powder prayer prefer pretty prince prison profit prompt proper proven public punish purple pursue puzzle
rabbit racial random ranger rarely rather reader reason recall recent record reduce reform regard region reject relate relief remain remind remote remove render rental repair repeat report rescue resign resist resort result retail retire reveal review revolt reward rigid ritual robust rocket ruling runner rustic
sacred safely salary sample savage screen script search season second secure select senior series server settle severe shadow shield signal silent silver simple singer single sister sketch slight smooth soccer social soften source spirit spoken sponge spread square stable status steady stolen strain strand stream street stress strict strike string stroke strong studio submit subtle sudden suffer summit summer supply surely survey switch symbol system
tablet tackle talent target temple tender tennis thanks thirty threat thrill throne timber tissue toward travel treaty tribal triple trophy tunnel twelve
typical
unfair unique unless unlike update uphold urgent useful
valley vendor versus victim violin virtue visual volume
wander warmth wealth weapon weekly weight widely window winner winter wisdom within wonder worker worthy writer
zodiac"""

for w in six.split():
    w = w.strip().lower()
    if len(w) >= 3:
        words.add(w)

# 7-letter common words
seven = """abandon ability absence academy account achieve acquire address adjacent admiral advance adverse advisor against airport alcohol already amazing analyze ancient another anxiety anybody applied arrange article assault attempt attract auction average
awesome
balance banking barrier battery because bedroom beneath benefit besides between billion blanket bombing borough bracket bridge broken brother budget builder building burden burning
cabinet calcium calling capable capital capture careful catalog caution ceiling central certain chamber channel chapter charged chicken chronic circuit classic climate cluster coastal collect combine comfort command comment compact company compare compete complex compose concept concern conduct confirm connect consent consist contact contain content context control convert cooking correct council counter country coupled courage covered creator cricket current customs
damage dealing decades decided decline default defense deficit deliver density deposit derived desire desktop despite destroy develop devoted digital disable display dispute distant divided donate doubled drafting drawing dressed dropped durable dynamic
earning eastern economy edition elderly element embrace emotion emperor endless enforce engaged english enhance enormous enquiry episode equally essence ethanol evident exactly examine example excited execute exhibit existed expense explain explore extreme
factory failure fashion feature fiction fighter finally finding fishing fitness flutter foreign forever formula fortune forward founded freedom freight funding further
gallery gateway general genetic genuine gesture glimpse gradual grammar granted graphic gravity grocery growing
habitat hallway handing harness harvest heading healthy hearing helpful herself highway himself history holding holiday horizon hosting housing however hundred hunting husband
imagine imaging implied improve impulse include indexed initial inquiry insight install instant instead integer interim invalid involve islands
journey justice justify keeping kingdom kitchen landing lasting lateral leading leather lending lesson library limited linking listing literal logical longest loyalty
machine managed manager mandate mansion mapping marine marked martial massive meaning measure medical meeting mention million mineral minimum missing mission mixture modular monitor morning mounted mystery
nearest neglect neither network neutral notable nothing noticed nuclear nursing
obvious offense officer ongoing opening opinion organic outcome outline outside overall overlap oversee
package parking partial partner passage passing patient pattern payment penalty pension percent perform perhaps persist picture pioneer plastic pleased popular portion pottery poverty premium prepare present prevent primary private problem proceed process produce product profile project promise promote propose protect protein provide publish pulling purpose pursuit putting
quality quarter quickly
radical rainbow ranging reactor reality receipt receive recover reflect regular related release remains removal replace request require reserve resolve respect restore retreat revenue reverse revival routine running
satisfy scratch section segment serious service session several shelter shifted shortly silence similar sitting skilled slavery smoking society soldier somehow speaker special sponsor startup storage strange stretch student subject succeed success suggest support supreme surface surgery surplus survive suspect sustain symptom
therapy thought through tonight tourism traffic trainer transit trouble turning typical
undertake unified unknown upgrade utility
vacation vaccine venture version veteran village violent virtual visible visiting volcanic volume
walking warrant weather website weekend welcome western whistle willing witness working writing
younger"""

for w in seven.split():
    w = w.strip().lower()
    if len(w) >= 3:
        words.add(w)

# Remove any entries that aren't purely alphabetic or are too short/long
words = {w for w in words if w.isalpha() and 3 <= len(w) <= 7}

# Sort and output
sorted_words = sorted(words)
print(f"Total words: {len(sorted_words)}")
print(f"3-letter: {len([w for w in sorted_words if len(w) == 3])}")
print(f"4-letter: {len([w for w in sorted_words if len(w) == 4])}")
print(f"5-letter: {len([w for w in sorted_words if len(w) == 5])}")
print(f"6-letter: {len([w for w in sorted_words if len(w) == 6])}")
print(f"7-letter: {len([w for w in sorted_words if len(w) == 7])}")

# Save to JSON
with open('/home/z/my-project/src/lib/dictionary.json', 'w') as f:
    json.dump(sorted_words, f)

print("Saved to dictionary.json")
