#!/usr/bin/env python3
"""Supplement the dictionary with more common words."""
import json

with open('/home/z/my-project/src/lib/dictionary.json', 'r') as f:
    words = set(json.load(f))

print(f"Before: {len(words)} words")

# Bulk addition - just a massive space-separated list of common words
bulk = ""
bulk += "ace ado aft age ago aha aid ail aim air ale all and ant ape apt arc are ark arm art ash ask ate awe axe "
bulk += "bad bag ban bar bat bay bed bet bid big bin bit boa bog bon bow box boy bud bug bum bun bur bus but buy "
bulk += "cab cam can cap car cat cob cod cog cop cot cow cry cub cud cue cup cur cut "
bulk += "dab dad dam day den dew did dig dim din dip doe dog don dot dry dub dud due dug dun duo dyed dye "
bulk += "ear eat eel egg ego elk elm emu end era eve ewe eye "
bulk += "fad fan far fat fax fed fee few fig fin fir fit fix fly foe fog for fox fry fun fur "
bulk += "gag gal gap gas gem get gig gin god got gum gun gut guy gym "
bulk += "had ham has hat hay hem hen her hew hid him hip his hit hob hod hog hop hot how hub hue hug hum hut "
bulk += "ice icy ill imp ink inn ion ire irk its ivy "
bulk += "jab jag jam jar jaw jay jet jig job jog jot joy jug jut "
bulk += "keg ken key kid kin kit "
bulk += "lab lad lag lap law lax lay lea led leg let lid lie lip lit log lot low lug "
bulk += "mad man map mar mat maw may men met mid mix mob mod mom mop mow mrs mud mug mum "
bulk += "nab nag nap nay net new nil nip nit nod nor not now nun nut "
bulk += "oak oar oat odd ode off oft oil old one opt orb ore our out owe owl own "
bulk += "pad pal pan pap par pat paw pay pea peg pen pep per pet pew pie pig pin pit ply pod pop pot pow pox pro pry pub pug pun pup pus put "
bulk += "rad rag ram ran rap rat raw ray red ref rib rid rig rim rip rob rod rot row rub rug rum run rut rye "
bulk += "sac sad sag sap sat saw say sea set sew she shy sin sip sir sit six ski sky sly sob sod son sop sot sow soy spa spy sty sub sue sum sun sup "
bulk += "tab tad tag tan tap tar tat tax tea ten the thy tic tie tin tip toe ton too top tot tow toy try tub tug tun two "
bulk += "ump urn use "
bulk += "van vat vet vex via vie vim vow "
bulk += "wad wag war was wax way web wed wet who why wig win wit woe wok won woo wow "
bulk += "yak yam yap yaw yea yes yet yew you yow "
bulk += "zap zed zen zig zip zoo "
bulk += "able also area army away baby back ball band bank base bath bead beam bean bear beat been beer bell belt bend best bill bird bite blow blue boat body bold bolt bomb bond bone book boot born boss both bowl burn busy "
bulk += "cafe cage cake call calm came camp card care case cash cast cave cell chat chip city clad clam clan clap clay clip club clue coal coat code coin cold come cook cool cope copy cord core corn cost crew crop cure cute "
bulk += "dale damp dare dark dawn dead deaf deal dear deck deed deem deep deer deny desk dial dice diet dirt disc dish dock does done doom door dose down drag draw drew drip drop drum dual duck dude dull dumb dump dune dusk dust duty "
bulk += "each earn ease east easy edge else emit ends epic even ever evil exam exit eyes "
bulk += "face fact fade fail fair fake fall fame fare farm fast fate fawn fear feat feed feel feet fell felt fend file fill film find fine fire firm fish fist five flag flat flaw flea fled flew flip flit flog flop flow foam foil fold folk fond food fool foot ford fork form fort foul four free from fuel full fund fury fuse fuss "
bulk += "gain gale game gang gape gash gasp gate gave gaze gear gene gift gild gist give glad glee glen glow glue gnaw goat goes gold golf gone good gore gown grab gram gray grew grid grim grin grip grit grow grub gulf gull gulp gust guts "
bulk += "hack hail hair hale half hall halt hand hang hare harm harp hash hate haul have haze head heal heap hear heat heed heel held hell helm help herb herd here hero hide high hike hill hint hire hiss hive hoax hold hole holy home hone hood hook hope horn hose host hour howl huge hull hump hung hunt hurl hurt hush hymn "
bulk += "icon idea idle inch info into iron isle item "
bulk += "jack jade jail jams jars java jazz jean jest joke jolt joy judge jump jury just "
bulk += "keen keep kept kick kill kind king kiss kite knee knew knit knob knot know "
bulk += "lace lack laid lake lamb lame lamp land lane lark lash lass last late lawn lazy lead leaf leak lean leap left lend lens less lick lied life lift like limb lime limp line link lint lion lips list live load loaf loan lock loft logo lone long look loom loop lord lore lose loss lost loud love luck lull lump lung lure lurk lush lust lynx "
bulk += "mace made maid mail main make male mall malt mane many mare mark mash mask mass mast mate maze meal mean meat meek meet meld melt memo mend menu mere mesh mess mice mild mile milk mill mime mind mine mint miss mist moan moat mock mode mold mole monk mood moon moor more moss most moth move much muck mule mull muse mush musk must mute myth "
bulk += "nail name nape navy near neat neck need nest nice nine node none noon norm nose note noun nude null numb "
bulk += "oath obey odds okay omen omit once only onto open oral oven over owed owns "
bulk += "pace pack page paid pail pain pair pale palm pane pang park part pass past path pave pawn peak pear peat peck peel peer pelt perk pest pick pier pike pile pine pink pipe plan play plea plot plow ploy plug plum plus poem poet poke pole poll polo pond pool poor pope pork port pose post pour pout pray prep prey prod prop pull pulp pump punk pure push "
bulk += "quit race rack raft rage raid rail rain rake ramp rang rank rare rash rate rave rays read real ream reap rear reed reef reel rely rend rent rest rice rich ride rift rile rill rind ring riot rise risk road roam roar robe rock rode role roll roof room root rope rose rosy rote rout rove rude ruin rule rump rung runt ruse rush rust "
bulk += "sack safe sage said sail sake sale salt same sand sane sang sank sash save scan scar seal seam sear seat sect seed seek seem seen self sell send sent sewn shed shin ship shoe shop shot show shun shut sick side sigh sign silk sill silt sing sink site size skit slab slag slam slap slat sled slew slid slim slit slob slop slot slow slug slum slur smog snap snag snip snow snub soak soap soar sock soda sofa soft soil sold sole some song soon soot sore sort soul soup sour span spar spin spit spot spry spur stab stag star stay stem step stew stir stop stow stub stud stun such suck suit sulk sump sung sunk sure surf swan swap swim "
bulk += "tack tact tail take tale talk tall tame tang tank tape taps tart task taxi teak team tear teen tell tend tent term test text than that them then they thin this thud thus tick tide tidy tied tier tile till tilt time tiny tire toad toil told toll tomb tone took tool tops tore torn toss tour town trap tray tree trek trim trio trip trod trot true tube tuck tuft tuna tune turf turn tusk twin type "
bulk += "ugly undo unit unto upon urge used user "
bulk += "vain vale vane vary vase vast veil vein vent verb very vest vial vice view vine visa void volt vote "
bulk += "wade wage wail wait wake walk wall wand want ward warm warn warp wart wary wash wasp wave wavy waxy weak wean wear weed week weep weigh weld well went were west what when whim whip whom wick wide wife wild will wilt wily wind wine wing wink wipe wire wise wish wisp with woke wolf womb wood wool word wore work worm worn wove wrap wren writ "
bulk += "yard yarn yawn year yell your "
bulk += "zeal zero zest zinc zone zoom "
# 5-letter
bulk += "abort above abuse admit adopt adult after again agent agree ahead alarm album alert alien align alike alive alley allot allow alone along alter among amply angel anger angle angry annex apart apple apply arena argue arise armor array arrow aside asset atlas audio audit avoid awake award aware awful "
bulk += "badge badly bake basin basis batch beach beard beast begin being below bench birth black blade blame bland blank blast blaze bleak bleed blend bless blind blink bliss block blond blood bloom blown blunt board boast bonus booth bound brace brain brand brass brave bread break breed brick bride brief bring broad broke brook brood broom broth brown brush budge build built bunch burst buyer "
bulk += "cabin cable candy cargo carry catch cause cedar chain chair chalk champ chaos charm chart chase cheap cheat check cheek cheer chess chest chief child chill china chips choir chord chose chunk churn cigar claim clamp clash clasp class clean clear clerk click cliff climb cling cloak clock clone close cloth cloud clown coach coast cobra color comet comic coral could count couch cough court cover crack craft crane crash cream creek creep crest crime crisp cross crowd crown crude crush curve cycle "
bulk += "daily dance dealt death decay decoy delay delta dense depot depth derby devil diary dirty ditch dizzy dodge doing donor doubt dough draft drain drama drank drape drawn dream dress dried drift drill drink drive drone drove drown drums drunk dusty dwarf dwell dying "
bulk += "eager eagle early earth eater edge eight elbow elder elect elite ember empty ended enemy enjoy enter equal equip erase error essay evade event every exact exalt excel exert exile exist extra "
bulk += "fable faced facet faint fairy faith false fancy fatal fault favor feast fetch fever fewer fiber field fifth fifty fight final first flame flash flask fleet flesh flick fling flint float flock flood floor flora flour flown fluid flush flute focal focus force forge forth forum found frame frank fraud fresh front frost froze fruit fully funds funny fuzzy "
bulk += "gauge genre ghost giant given glade glare glass gleam glide globe gloom glory gloss glove going grace grade grain grand grant grape grasp grass grave great green greet grief grill grind gripe groan groin groom grope gross group grove grown guard guess guest guide guild guilt "
bulk += "habit handy happy harsh haste haven heart heavy hedge hello hence herbs hinge hobby honey honor horse hotel house human humor hurry "
bulk += "ideal image imply index infer inner input issue ivory "
bulk += "jewel joint joker judge juice jumbo juror "
bulk += "knack kneel knife knock known "
bulk += "label labor lance large laser latch later laugh layer learn lease least leave legal lemon level lever light limit linen liver local lodge logic loose lover lower loyal lucid lunar lunch lunge lying "
bulk += "magic major maker manor maple march match maybe mayor media merit metal might minor minus model money month moral mount mouse mouth movie muddy music "
bulk += "naive naked nasty naval nerve never night noble noise north notch noted novel nurse "
bulk += "occur ocean offer often olive onset opera orbit order other outer owner oxide "
bulk += "paint panel panic paper party paste patch pause peace peach pearl pedal penny phase phone photo piano piece pilot pitch pixel pizza place plain plane plant plate plaza plead pleat pluck plumb plume plump plunge point polar porch poser pouch pound power press price pride prime print prior prize probe prone proof proud prove prune pulse punch pupil purge purse "
bulk += "quake qualm queen query quest quick quiet quilt quirk quota quote "
bulk += "radar radio raise rally ranch range rapid ratio reach react realm rebel reign relax relay renal repay reply resin retro rider ridge rifle right rigid rinse rival river roast robin robot rocky rouge round route royal rugby ruler rural "
bulk += "sadly saint salad salon sauce scale scare scene scent scope score scout scrap seize sense serve setup seven shade shaft shake shall shame shape share shark sharp shave shear sheer sheet shelf shell shift shine shirt shock shore short shout shown shrub sight since sixth sixty skill skull slack slain slash slate slave sleep slice slide slope small smart smell smile smoke snack snake solar solid solve sorry sound south space spare spark speak speed spend spent spice spike spine split spoke spoon sport spray squad stack staff stage stain stair stake stale stall stamp stand stare start state stays steak steal steam steel steep steer stern stick stiff still sting stink stock stoic stone stood stool store storm story stout stove strap straw stray strip strive stroke stroll strong stuck study stuff stump style sugar suite super surge swamp swarm swear sweep sweet swept swift swing sword sworn syrup "
bulk += "table taken taste teach tempo tense terms thank theme thick thief thing think third thorn those three threw throw thumb tidal tiger tight timer title toast today token topic torch total touch tough tower trace track trade trail train trait trash tread treat trend trial tribe trick tried troop trout truck truly trump trunk trust truth tumor twist "
bulk += "ultra uncle under union unite unity until upper upset urban usage usual utter "
bulk += "vague valid value valve vapor vault verse video vigor vinyl viola viral virus visit vista vital vivid vocal voice voter "
bulk += "waist waste watch water weary weave wedge weigh weird wheat wheel where which while white whole whose widen width witch woman world worry worse worst worth would wound wrath write wrong wrote "
bulk += "yearn yield young youth zone "
# Pattern-specific words
bulk += "brat chat flat mat pat rat sat scat spat splat that vat "
bulk += "bog cog dog fog frog glob hog jog log slog smog tog "
bulk += "dub fob grub hub nub rub shrub slab snub sub stub tub thud thug "
bulk += "bop chop cop crop drop flop glop hop lop mop pop prop shop slop stop top "
bulk += "bun dug dun fun gun hun nun pun run shun spun stun sun "
bulk += "ban can fan man pan ran tan van bran clan plan scan span than "
bulk += "bit fit hit kit lit pit sit wit grit flit knit slit spit split "
bulk += "brad chad tad glad "
bulk += "block clock crock dock flock knock lock mock rock shock smock sock stock "
bulk += "choke cloak joke poke smoke spoke stroke woke yoke "
bulk += "brink chink clink drink kink link mink pink rink shrink sink slink stink think "
bulk += "ball call fall gall hall mall pall tall wall small stall "
bulk += "bill fill gill hill kill mill pill rill sill till will chill drill grill quill skill spill still thrill "
bulk += "bash cash crash dash flash gash hash lash mash rash slash smash trash clash splash "
bulk += "bell cell dell dwell fell hell jell knell sell shell smell spell tell well yell "
# 6-letter
bulk += "absorb accept access accord accuse across action active actual adjust admire advise afford agency agenda almost amount animal annual answer anyone appeal appear arctic armory artist assign assist assume attack attend august "
bulk += "author barely basket battle beacon beauty become before behind belong beside better beyond bishop bitter blanch bounce branch breach breath bridge bright broken bronze bubble bucket budget bundle burden bureau butter "
bulk += "cabinet camera cancel canvas carbon career castle casual caught center chance change charge cheese choice choose chosen church circle client climax closed closer coffee colony column combat comedy common comply convey cookie corner costly cotton county couple course cousin covers crack craft create credit crisis critic crowd cruise custom "
bulk += "damage danger dealer debate decade decide defeat defend define degree demand denial depart deploy derive desert design desire detail detect device devote dialog differ digest dinner direct divide domain double dragon driven driver during "
bulk += "easily editor effect effort eleven emerge empire enable endure energy engage engine enough ensure entire escape estate evolve exceed except excess excite excuse exempt expand expect expert export expose extend extent "
bulk += "fabric factor fairly family famous farmer father fellow figure filter finale finger finish fiscal flight flower follow forced forest forget formal former fossil foster fourth freeze frozen future "
bulk += "galaxy garden gather gender gentle gifted ginger global golden govern gravel ground growth guilty guitar "
bulk += "handle happen harbor hatred health heaven height hidden holder honest horror hungry hunter "
bulk += "ignore immune impact import impose income indeed indoor infant inform injure injury inland insect inside insist intact intend invest island itself "
bulk += "jacket jersey jumble jungle junior kernel kidney knight "
bulk += "launch lawyer layout league lessen lesson letter linear liquid listen little lively locate lonely lovely luxury "
bulk += "mainly manage manner marble margin market master matter medium member memory mental merely method middle mingle minute mirror mobile modern modest moment monkey mortal mostly mother motion motive moving murder museum mutual myself "
bulk += "namely narrow nation nature nearby nearly neatly needle nicely noble normal notice number "
bulk += "object obtain occupy offend office online opener oppose option orange origin output "
bulk += "palace parent parish patrol patron people period permit person phrase planet player please pledge plunge pocket poetry poison police policy portal poster potato powder prayer prefer pretty prince prison profit prompt proper proven public punish purple pursue puzzle "
bulk += "rabbit racial random ranger rarely rather reader reason recall recent record reduce reform regard region reject relate relief remain remind remote remove render rental repair repeat report rescue resign resist resort result retail retire reveal review revolt reward rigid ritual robust rocket ruling runner rustic "
bulk += "sacred safely salary sample savage screen script search season second secure select senior series server settle severe shadow shield signal silent silver simple singer single sister sketch slight smooth soccer social soften source spirit spoken sponge spread square stable status steady stolen strain strand stream street stress strict strike string stroke strong studio submit subtle sudden suffer summit summer supply surely survey switch symbol system "
bulk += "tablet tackle talent target temple tender tennis thanks thirty threat thrill throne timber tissue toward travel treaty tribal triple trophy tunnel twelve typical "
bulk += "unfair unique unless unlike update uphold urgent useful "
bulk += "valley vendor versus victim violin virtue visual volume "
bulk += "wander warmth wealth weapon weekly weight widely window winner winter wisdom within wonder worker worthy writer zodiac "
# 7-letter
bulk += "abandon ability absence academy account achieve acquire address adjacent admiral advance adverse advisor against airport alcohol already amazing analyze ancient another anxiety anybody applied arrange article assault attempt attract auction average awesome "
bulk += "balance banking barrier battery because bedroom beneath benefit besides between billion blanket bombing borough bracket bridge broken brother budget builder building burden burning "
bulk += "cabinet calcium calling capable capital capture careful catalog caution ceiling central certain chamber channel chapter charged chicken chronic circuit classic climate cluster coastal collect combine comfort command comment compact company compare compete complex compose concept concern conduct confirm connect consent consist contact contain content context control convert cooking correct council counter country coupled courage covered creator cricket current customs "
bulk += "damage dealing decades decided decline default defense deficit deliver density deposit derived desire desktop despite destroy develop devoted digital disable display dispute distant divided donate doubled drafting drawing dressed dropped durable dynamic "
bulk += "earning eastern economy edition elderly element embrace emotion emperor endless enforce engaged english enhance enormous enquiry episode equally essence ethanol evident exactly examine example excited execute exhibit existed expense explain explore extreme "
bulk += "factory failure fashion feature fiction fighter finally finding fishing fitness flutter foreign forever formula fortune forward founded freedom freight funding further "
bulk += "gallery gateway general genetic genuine gesture glimpse gradual grammar granted graphic gravity grocery growing "
bulk += "habitat hallway handing harness harvest heading healthy hearing helpful herself highway himself history holding holiday horizon hosting housing however hundred hunting husband "
bulk += "imagine imaging implied improve impulse include indexed initial inquiry insight install instant instead integer interim invalid involve islands "
bulk += "journey justice justify keeping kingdom kitchen landing lasting lateral leading leather lending lesson library limited linking listing literal logical longest loyalty "
bulk += "machine managed manager mandate mansion mapping marine marked martial massive meaning measure medical meeting mention million mineral minimum missing mission mixture modular monitor morning mounted mystery "
bulk += "nearest neglect neither network neutral notable nothing noticed nuclear nursing "
bulk += "obvious offense officer ongoing opening opinion organic outcome outline outside overall overlap oversee "
bulk += "package parking partial partner passage passing patient pattern payment penalty pension percent perform perhaps persist picture pioneer plastic pleased popular portion pottery poverty premium prepare present prevent primary private problem proceed process produce product profile project promise promote propose protect protein provide publish pulling purpose pursuit putting "
bulk += "quality quarter quickly radical rainbow ranging reactor reality receipt receive recover reflect regular related release remains removal replace request require reserve resolve respect restore retreat revenue reverse revival routine running "
bulk += "satisfy scratch section segment serious service session several shelter shifted shortly silence similar sitting skilled slavery smoking society soldier somehow speaker special sponsor startup storage strange stretch student subject succeed success suggest support supreme surface surgery surplus survive suspect sustain symptom "
bulk += "therapy thought through tonight tourism traffic trainer transit trouble turning typical "
bulk += "undertake unified unknown upgrade utility "
bulk += "vacation vaccine venture version veteran village violent virtual visible visiting volcanic volume "
bulk += "walking warrant weather website weekend welcome western whistle willing witness working writing younger"

for w in bulk.split():
    w = w.strip().lower()
    if w.isalpha() and 3 <= len(w) <= 7:
        words.add(w)

print(f"After: {len(words)} words")

sorted_words = sorted(words)
print(f"3-letter: {len([w for w in sorted_words if len(w) == 3])}")
print(f"4-letter: {len([w for w in sorted_words if len(w) == 4])}")
print(f"5-letter: {len([w for w in sorted_words if len(w) == 5])}")
print(f"6-letter: {len([w for w in sorted_words if len(w) == 6])}")
print(f"7-letter: {len([w for w in sorted_words if len(w) == 7])}")

with open('/home/z/my-project/src/lib/dictionary.json', 'w') as f:
    json.dump(sorted_words, f)

print("Updated dictionary.json")
