import { GenreHierarchy, CategoryNode } from '../types/category-intelligence';

/**
 * Catálogo Expandido de Inteligência Comercial por Gênero para Amazon KDP
 * Cada gênero principal contém mais de 15 categorias, e cada categoria mais de 15 subcategorias/nichos.
 */

// Helper para gerar nós com 16 subcategorias ricas
function makeCat(id: string, name: string, subList: string[]): CategoryNode {
  return {
    id,
    name,
    subcategories: subList.map((subName, idx) => ({
      id: `${id}-sub-${idx + 1}`,
      name: subName
    }))
  };
}

export const EXPANDED_GENRE_HIERARCHIES: GenreHierarchy[] = [
  // =========================================================================
  // 1. ROMANCE
  // =========================================================================
  {
    id: 'romance',
    name: 'Romance & Ficção Romântica',
    categories: [
      makeCat('contemporary-romance', 'Contemporary Romance', [
        'Enemies to Lovers', 'Billionaire Romance', 'Workplace & Office Romance', 'Small Town Romance',
        'Fake Relationship & Dating', 'Friends to Lovers', 'Second Chance Romance', 'Forced Proximity',
        'Brother Best Friend', 'Single Parent Romance', 'Rockstar Romance', 'Bodyguard & Protector',
        'Holiday & Christmas Romance', 'Grumpy x Sunshine', 'Marriage of Convenience', 'Opposites Attract'
      ]),
      makeCat('dark-romance', 'Dark Romance & New Adult', [
        'Mafia Romance', 'Morally Gray Anti-Hero', 'College & Academy Romance', 'Captive & Captor',
        'Biker & MC Romance', 'Stalker Romance', 'Revenge Romance', 'Secret Society Romance',
        'Underworld Syndicate', 'Cartel Romance', 'Forbidden Love & Taboo', 'Alpha Male Romance',
        'Anti-Hero Redemption', 'Dangerous Liaisons', 'Corrupt Empires', 'Dark Bully Romance'
      ]),
      makeCat('romantic-comedy', 'Comédia Romântica (Rom-Com)', [
        'Grumpy x Sunshine', 'Fake Dating Disaster', 'Misunderstood Messages', 'Accidental Roommates',
        'Wedding Crasher Romance', 'Pet Lovers Rom-Com', 'Coffee Shop Encounters', 'Vacation Fling to Love',
        'Office Rivalry Comedy', 'Disastrous First Dates', 'Matchmaker Blunders', 'High School Reunion',
        'Cooking Competition Rom-Com', 'Celebrity Secret Dating', 'Sarcastic Banter Romance', 'Love on Tour'
      ]),
      makeCat('historical-romance', 'Historical Romance', [
        'Regency Aristocracy', 'Victorian Secrets', 'Scottish Highlanders', 'Medieval Castles & Knights',
        'Tudor Court Intrigue', 'Gilded Age Heiresses', 'Colonial America', 'Edwardian High Society',
        'Ancient Rome & Greece', 'French Court Romance', 'Pirate & High Seas', 'Viking Marauders',
        'Renaissance Passion', 'WWII Homefront Romance', 'Russian Nobility Romance', 'Frontier & Wild West'
      ]),
      makeCat('paranormal-romance', 'Paranormal & Fantasy Romance', [
        'Shifter & Wolf Packs', 'Vampire Coven Romance', 'Fae Royals & Courts', 'Demon & Warlock Romance',
        'Dragon Shifter Mates', 'Witches & Covens', 'Angel & Fallen Romance', 'Gods & Mythological Mates',
        'Time Travel Romance', 'Ghost & Spirit Romance', 'Gargoyle Protectors', 'Merfolk & Siren Romance',
        'Soulmates & Fated Mates', 'Academy of Magic Romance', 'Apocalypse Romance', 'Shadow World Mates'
      ]),
      makeCat('sports-romance', 'Sports Romance', [
        'Hockey Romance', 'Football & Quarterbacks', 'Baseball Sluggers', 'Formula 1 Racing',
        'MMA & Boxers', 'Basketball Romance', 'Soccer Stars', 'Surfing & Extreme Sports',
        'Olympic Athletes', 'Rugby Players', 'Figure Skating Romance', 'Swimming Champions',
        'Coaches & Athletes', 'Sports Agent Romance', 'Gym Rivals', 'College Athletics'
      ]),
      makeCat('clean-wholesome', 'Clean & Wholesome Romance', [
        'Sweet Small Town', 'Inspirational Faith Romance', 'Amish Country Romance', 'Ranch & Cowboy Romance',
        'Cozy Bakery Romance', 'Lighthouse Keeper Love', 'Country Doctor Romance', 'Teacher & Coach Sweet Love',
        'Veterinarian Rescue', 'Gentle Second Chances', 'Christmas Miracle Romance', 'Prairie Pioneer Romance',
        'Heartwarming Family Secrets', 'Community Garden Love', 'Bookstore Romance', 'Sunday Morning Love'
      ]),
      makeCat('suspense-romance', 'Romantic Suspense', [
        'FBI Special Agents', 'Military & Navy SEALs', 'Undercover Detectives', 'Witness Protection Program',
        'Kidnapping & Hostage Rescue', 'Serial Killer Hunt', 'Corporate Espionage Love', 'Conspiracy on the Run',
        'SWAT Team Romance', 'Cold Case Investigators', 'Bounty Hunter Lovers', 'Cyber Crime & Hackers',
        'Wilderness Survival', 'Secret Service Escort', 'Mercenary Protectors', 'Disaster Survival Love'
      ]),
      makeCat('lgbtq-romance', 'LGBTQ+ Romance', [
        'MM Contemporary Romance', 'FF Contemporary Romance', 'Transgender Love Stories', 'Queer Royalty Romance',
        'Coming Out Journey', 'Campus & College LGBTQ+', 'Found Family Queer Romance', 'Bisexual Awakening',
        'MM Sports Romance', 'FF Fantasy Romance', 'Small Town Queer Love', 'Queer Sci-Fi Romance',
        'Historical Queer Romance', 'Enemies to Lovers Queer', 'Second Chance Queer', 'Celebrity MM Romance'
      ]),
      makeCat('fantasy-romance', 'Romantasy (Romance Fantástico)', [
        'Enemies to Lovers Courts', 'Fated Mates & Trials', 'Crown & Assassin Romance', 'Magic Tournament Romance',
        'Shadow Warlords & Queens', 'Dragon Riders & Bonded Souls', 'Curse Breaking Romance', 'Stealing the Throne',
        'Dark Magic Pacts', 'Rebel Princess & Rogue', 'Godly Proving Grounds', 'Elemental Magic Bonding',
        'Faerie Realm Wars', 'Betrayal at Court', 'Immortal Love', 'Forbidden Bloodlines'
      ]),
      makeCat('western-cowboy', 'Western & Cowboy Romance', [
        'Modern Billionaire Cowboy', 'Ranch Feud Romance', 'Rodeo Champion Romance', 'Rough & Rugged Ranchers',
        'Montana Mountain Men', 'Texas Oil Tycoons', 'Runaway Bride on the Ranch', 'Cowboy Bodyguards',
        'Wild Mustang Whisperer', 'Ranch Inheritance Wars', 'High Country Cowboys', 'Small Town Texas Love',
        'Country Music Star Cowboy', 'Lodge & Cabin Romance', 'Frontier Justice Love', 'Winter in Wyoming'
      ]),
      makeCat('military-romance', 'Military & Special Ops Romance', [
        'Navy SEAL Teams', 'Delta Force Operatives', 'Marine Snipers', 'Air Force Combat Pilots',
        'Army Rangers in Danger', 'Green Beret Missions', 'Coast Guard Rescues', 'K9 Handler Teams',
        'Homecoming Soldier Love', 'POW Survival Romance', 'Combat Medic Love', 'Veteran Rehabilitation',
        'Secret Mission Love', 'Base Camp Romance', 'Private Security Operatives', 'Brotherhood & Sacrifice'
      ]),
      makeCat('holiday-romance', 'Holiday & Seasonal Romance', [
        'Christmas in Small Town', 'New Year Eve Kiss', 'Snowed-in Cabin Romance', 'Thanksgiving Reunion',
        'Autumn Harvest Love', 'Spring Blossom Romance', 'Summer Beach Romance', 'Valentine Day Disasters',
        'Halloween Haunted Romance', 'Hanukkah Holiday Love', 'Irish St Patrick Romance', 'Midsummer Night Love',
        'Winter Solstice Magic', 'Holiday Bake-Off Love', 'Secret Santa Romance', 'Christmas Tree Farm'
      ]),
      makeCat('medical-romance', 'Medical & Doctor Romance', [
        'Trauma Surgeon Rivals', 'ER Doctor & Nurse', 'Pediatrician & Single Dad', 'Traveling Doctor Romance',
        'Hospital Boardroom Feuds', 'Flight Nurse Rescue', 'Brain Surgeon Ambitions', 'Rural Clinic Secrets',
        'Epidemic Quarantine Love', 'Medical School Rivals', 'Chief of Surgery Drama', 'Paramedic Heartbeat',
        'Therapist & Client Boundaries', 'Rehab Specialist Love', 'Disaster Zone Medics', 'Midnight Shift Passion'
      ]),
      makeCat('celebrity-romance', 'Celebrity & Entertainment Romance', [
        'A-List Movie Star & Regular Girl', 'Rockstar on World Tour', 'Pop Diva & Bodyguard', 'Broadcasting News Anchors',
        'Reality TV Dating Show', 'Hollywood Director & Writer', 'Broadway Stage Actors', 'Fashion Model Romance',
        'Paparazzi Target Love', 'Ghostwriter & Famous Author', 'Influencer & Social Media Love', 'Secret Identity Star',
        'Child Star Comeback', 'Stunt Double Romance', 'Music Producer Love', 'Red Carpet Scandals'
      ]),
      makeCat('multicultural-romance', 'Multicultural & Interracial Romance', [
        'BWWM (Black Woman White Man)', 'Latina Heroine Romance', 'Asian American Heritage Love', 'Cross-Cultural Family Wars',
        'Afro-Caribbean Passion', 'Middle Eastern Royalty', 'Indigenous Heritage Love', 'Immigrant Dream Romance',
        'Bilingual Banter Love', 'Global Travels Romance', 'Interfaith Love Journeys', 'European Expat Romance',
        'African Royal Courts', 'Tokyo Night Romance', 'Rio de Janeiro Passion', 'Cultural Traditions & Love'
      ])
    ]
  },

  // =========================================================================
  // 2. FICÇÃO & FANTASIA
  // =========================================================================
  {
    id: 'fantasy',
    name: 'Ficção & Fantasia Épica',
    categories: [
      makeCat('epic-high-fantasy', 'Epic & High Fantasy', [
        'Sword & Sorcery', 'Hard Magic Progression', 'Dragons & Mythic Lore', 'Kingdoms at War',
        'Ancient Prophecies', 'Elven Empires & Dwarven Halls', 'Gods & Fallen Deities', 'Chosen Ones & Reluctant Heroes',
        'Rebellion Against Dark Lords', 'Sieges & Massive Armies', 'Relic Hunters & Artifacts', 'Ascension & Demigods',
        'Mythical Beasts & Bestiaries', 'Royal Succession Wars', 'Elemental Magic Towers', 'The Fall of Empires'
      ]),
      makeCat('dark-grimdark', 'Dark Fantasy & Grimdark', [
        'Morally Gray Mercenaries', 'Bleak World Survival', 'Blood Magic & Necromancy', 'Monsters That Used to Be Men',
        'Tortured Inquisitors', 'Assassins & Thieves Guilds', 'Decaying Empires & Plague', 'Brutal Warfare & Mud',
        'Cthulhu Mythos & Eldritch Horrors', 'Broken Vows & Betrayal', 'Demon Incursions', 'Gallows Humor Fantasy',
        'No Heroes Survival', 'Bounty Hunters in Ruined Lands', 'Corrupt Pantheons', 'Flesh & Bone Magic'
      ]),
      makeCat('urban-fantasy', 'Urban Fantasy & Sobrenatural', [
        'Paranormal Detectives', 'Underground Vampire Covens', 'Hidden Magic in Modern Cities', 'Werewolf Pack Politics',
        'Faerie Courts in Skyscrapers', 'Demon Hunters & Exorcists', 'Magical Speakeasies', 'Modern Necromancers',
        'Occult Secret Services', 'Bounty Hunters of Monsters', 'Modern Greek Pantheon', 'Witches of New Orleans',
        'Supernatural SWAT Teams', 'Ancient Gods in Subway Stations', 'Cursed Pawn Shops', 'Rune Magic Tattoos'
      ]),
      makeCat('litrpg-progression', 'LitRPG & GameLit Fantasy', [
        'Dungeon Crawlers & Levels', 'VRMMO Fantasy Worlds', 'System Apocalypse Earth', 'Progression Cultivation & Qi',
        'Skill Trees & Stats Sheets', 'Tower Climbing Sagas', 'Reincarnation as a Monster', 'Town Building & Base Defense',
        'Crafting & Blacksmith Classes', 'Infinite Mana Exploits', 'Solo Leveling Mechanics', 'Dungeon Master POV',
        'Deck Building Card Magic', 'Time Loop Progression', 'Hardcore Permadeath Worlds', 'Isekai Summoning'
      ]),
      makeCat('mythology-folklore', 'Mitos, Lendas & Folclore', [
        'Norse Mythology & Ragnarok', 'Greek & Roman Retellings', 'Arthurian Legends & Camelot', 'Celtic Lore & Druids',
        'Slavic & Baba Yaga Tales', 'Japanese Yokai & Shinto Myths', 'Egyptian Gods & Underworld', 'Mesopotamian Epics',
        'Chinese Wuxia & Xianxia', 'African Folklore & Orishas', 'Native American Legends', 'Hindu Epics Retold',
        'Mayan & Aztec Mythology', 'Arabian Nights & Djinns', 'Fairy Tale Dark Retellings', 'Atlantis & Lost Continents'
      ]),
      makeCat('cozy-fantasy', 'Cozy Fantasy (Fantasia Acolhedora)', [
        'Coffee Shop with Orcs', 'Cozy Bookstore Magic', 'Tea Magic & Herbalists', 'Small Village Witchcraft',
        'Magical Bakeries & Pastries', 'Gentle Beast Companions', 'Library of Ancient Spells', 'Traveling Merchant Quests',
        'Crafting Comfort Potions', 'Magical Gardening & Familiars', 'Cozy Inns & Adventurer Taverns', 'Letters of Magic',
        'Whimsical Forest Sprites', 'Slow Life in Fantasy Worlds', 'Found Family in Gentle Towns', 'Heartwarming Magic'
      ]),
      makeCat('sword-sorcery-pulp', 'Sword & Sorcery (Pulp Clássico)', [
        'Barbarian Marauders', 'Dark Sorcerers & Snake Cults', 'Lost Jungle Temples', 'Gladiatorial Arenas',
        'Nomadic Horse Warriors', 'Sunken Cities & Deep Horrors', 'Cursed Tombs & Mummies', 'Pirates of Forgotten Seas',
        'City of Thieves & Rogues', 'Demon Summoning Sacrifices', 'Warlords of the Wasteland', 'Runes of Iron & Fire',
        'The Mercenary Blade', 'Forgotten Gods Awaken', 'The Crimson Altar', 'Steel Against Witchcraft'
      ]),
      makeCat('historical-fantasy', 'Fantasia Histórica', [
        'Ancient Rome with Magic', 'Black Plague Necromancy', 'Napoleonic Wars with Dragons', 'Feudal Japan with Spirits',
        'Renaissance Clockwork Magic', 'Crusades & Holy Relics', 'Victorian Gaslamp Fantasy', 'WW1 Trench Sorcery',
        'Silk Road Arcane Merchants', 'Conquistadors & Golden Cities', 'Russian Tsars & Sorcery', 'Ottoman Empire Djinns',
        'Pirates of Caribbean Magic', 'French Revolution Blood Magic', 'Viking Shieldmaidens & Runes', 'Spartan Arcane Warriors'
      ]),
      makeCat('fairy-tale-retellings', 'Releituras de Contos de Fadas', [
        'Dark Beauty and the Beast', 'Assassin Little Red Riding Hood', 'Poisonous Snow White', 'Cinderella Thief',
        'Rapunzel in the Tower of Sorcery', 'Sleeping Beauty Nightmare', 'Peter Pan Neverland Pirates', 'Alice in Twisted Wonderland',
        'The Little Mermaid Siren Song', 'Hansel and Gretel Witch Hunters', 'Rumpelstiltskin Gold Curse', 'Aladdin Thief King',
        'Robin Hood Wood Magic', 'The Pied Piper Plague', 'Jack the Giant Killer', 'The Snow Queen Winter Frost'
      ]),
      makeCat('military-fantasy', 'Fantasia Militar & Estratégia', [
        'Infantry Line Battles with Magic', 'Artillery Dragons & Airships', 'Siege Engineering & Trebuchets', 'Guerilla Warfare in Forests',
        'Quartermaster & Supply Lines', 'Military Academy Recruits', 'Veteran Mercenary Companies', 'Cavalry Charges against Giants',
        'Trench Sorcery & Sappers', 'Naval Arcane Fleet Battles', 'Espionage Behind Enemy Lines', 'Military Coups in Royal Capitals',
        'Fortress Defense at Last Stand', 'War Colleges & Tactical Magic', 'Commanding the Vanguard', 'War Crimes & Tribunal Magic'
      ]),
      makeCat('steampunk-gaslamp', 'Steampunk & Gaslamp Fantasy', [
        'Clockwork Automatons', 'Airship Fleets & Sky Pirates', 'Victorian London Occult', 'Steam-Powered Exosuits',
        'Mad Alchemists & Gaslight', 'Subterranean Steam Cities', 'Ether Energy & Teslapunk', 'Mechanical Dragons',
        'Secret Detective Societies', 'Smog & Industrial Revolution', 'Zeppelin Explorers', 'Gunslingers with Clockwork Limbs',
        'Underground Bunkers & Steam', 'Aetheric Transmissions', 'Steam Golems & Labor Wars', 'Ironclad Sky Battles'
      ]),
      makeCat('progression-fantasy', 'Progression Fantasy & Cultivation', [
        'Qi Condensation & Meridians', 'Sect Wars & Elders', 'Auction House Treasures', 'Immortal Pills & Alchemy',
        'Beast Core Taming', 'Tribulation Lightning', 'Dao Comprehension', 'Martial Arts Tournament Arc',
        'Spirit Stones & Currency', 'Weapon Souls & Awakening', 'Ascending to Higher Realms', 'Rival Sect Ambush',
        'Ancient Immortal Ruins', 'Body Refinement Techniques', 'Forbidden Bloodlines', 'Master & Disciple Bonds'
      ]),
      makeCat('dystopian-fantasy', 'Fantasia Pós-Apocalíptica', [
        'Magic Caused the End of Earth', 'Ruins of Modern Skylines with Monsters', 'Wasteland Clans with Mutated Beasts', 'Scavengers in Ancient Vaults',
        'Toxic Mana Fog Survival', 'The Sun Never Rises Magic', 'Walled Cities & Blood Tributes', 'Radioactive Arcane Storms',
        'Cybernetic Implants & Demons', 'Rival Warlords of the Ashes', 'Seeds of Life Quests', 'Last Bastion of Humanity',
        'Mutated Flora & Carnivorous Trees', 'The Water Wars in Magic Deserts', 'Nomads of the Rustlands', 'Relics of the Old Gods'
      ]),
      makeCat('magical-realism', 'Realismo Mágico', [
        'Family Curses Across Generations', 'Ghosts That Live in the Attic', 'Plants That Grow from Sadness', 'Towns That Forget Time',
        'Dreams That Manifest at Dawn', 'Ancestral Recipes with Emotions', 'Miracles in Everyday Villages', 'The Rain That Wouldn’t Stop',
        'Portraits That Age for You', 'A House That Rearranges Itself', 'Butterflies of Prophecy', 'Shadows with Personalities',
        'The Clock That Ticks Backwards', 'Letters from the Dead', 'Flowers Blooming from Tears', 'Whispering Walls'
      ]),
      makeCat('young-adult-fantasy', 'Young Adult (YA) Fantasy', [
        'The Royal Trials Selection', 'Academy of Forbidden Magic', 'Rebel Underground Teen Fighters', 'Bonding with Mythic Creatures',
        'Crown Secrets & Stolen Heirs', 'Tournament of Champions', 'Dueling Factions in High School', 'Elemental Affinity Awakenings',
        'First Love in Dark Times', 'Escaping the Walled District', 'Prophecy of the Starlight Twins', 'The Guild of Young Thieves',
        'The Beast Whisperers', 'Court Intrigue for Beginners', 'The Clockwork Princess', 'Shadow Magic Resistance'
      ]),
      makeCat('comedy-satire-fantasy', 'Fantasia Cômica & Paródia', [
        'The Reluctant Dark Lord HR Department', 'Bureaucracy of Dungeon Management', 'When the Hero Forgets the Quest', 'Tax Audits for Dragons',
        'Accidental Dark Messiahs', 'Goblins Unionizing for Better Pay', 'The Overqualified Farm Boy', 'Magic Wand Technical Support',
        'Adventurer Insurance Fraud', 'The Demon Who Just Wants to Cook', 'Sarcastic Talking Swords', 'Parody of Classic Tropes',
        'When the Chosen One Dies Day One', 'Potion Brewing Disaster Relief', 'The Bard Who Can’t Sing', 'Dungeon Health & Safety Inspections'
      ])
    ]
  },

  // =========================================================================
  // 3. MISTÉRIO, THRILLER & SUSPENSE
  // =========================================================================
  {
    id: 'mystery-thriller',
    name: 'Mistério, Thriller & Policial',
    categories: [
      makeCat('psychological-thriller', 'Psychological Thriller', [
        'Domestic Suspense', 'Unreliable Narrator', 'Mind Games & Gaslighting', 'Obsessive Stalkers',
        'Suburban Secrets Behind White Fences', 'Memory Loss & Amnesia', 'Therapist & Patient Boundaries', 'Twin Identity Swaps',
        'Paranoia in Isolation', 'The House on the Cliff', 'Secrets Between Sisters', 'The Perfect Marriage Illusion',
        'Guilt from Thirty Years Ago', 'Sleepwalking Murders', 'Toxic Friendships', 'The Double Life'
      ]),
      makeCat('police-procedural', 'Police Procedural & Crime', [
        'Homicide Detective Squad', 'Cold Case Squad Reopening', 'Forensic Pathologists & Autopsies', 'Crime Scene Investigators (CSI)',
        'Corrupt Precinct Politics', 'Rookie & Veteran Partner Dynamics', 'Internal Affairs Investigations', 'Task Force Federal Agendas',
        'Serial Killer Signature Crimes', 'Ballistics & DNA Profiling', 'Informants in the Ghetto', 'Hostage Negotiations',
        'Undercover Infiltration Operations', 'Cyber Police Dark Web Tracking', 'Evidence Tampering Scandals', 'The Chief Under Fire'
      ]),
      makeCat('cozy-mystery', 'Cozy Mystery', [
        'Cat & Dog Sleuth Companions', 'Bakery & Tea Shop Murders', 'Bookstore & Antique Shop Clues', 'Small Town Village Gossips',
        'Bed & Breakfast Secrets', 'Knitting & Craft Club Mysteries', 'Culinary Chef Investigations', 'Garden Club Poisonings',
        'Library Mysteries & Rare Books', 'Lighthouse Island Whodunit', 'Senior Citizens Detective Club', 'Witchy Amateur Sleuth',
        'Holiday Festival Murder', 'Wine Tasting Secrets', 'Dog Show Mysteries', 'Farmers Market Clues'
      ]),
      makeCat('action-espionage', 'Action & Espionage Thriller', [
        'CIA Rogue Operatives', 'MI6 Double Agents', 'Nuclear Threat Countdown', 'Sniper Assassins in Europe',
        'Bioterrorism Lab Outbreak', 'Cyber Warfare Attack on Grid', 'Private Military Contractors', 'Presidential Kidnapping Plot',
        'Submarine Stealth Missions', 'Interpol Red Notice Chase', 'Deep Cover in Moscow', 'Black Ops Disavowed Teams',
        'Heist of Classified Weapons', 'Drone Warfare Hijacking', 'Special Forces Extraction', 'Global Syndicate Cabals'
      ]),
      makeCat('legal-courtroom', 'Legal & Courtroom Thriller', [
        'Public Defender Against the Odds', 'Corporate Law Firm Greed', 'Jury Tampering Scandals', 'Death Row Appeal Countdown',
        'Corrupt Judges & Bribery', 'Prosecutor vs High Profile Killer', 'Medical Malpractice Coverups', 'Big Pharma Class Action',
        'Whistleblower Protection', 'Wrongful Conviction Exoneration', 'Supreme Court Nominations', 'Money Laundering Defense',
        'Family Inheritance Feuds', 'Constitutional Rights Crisis', 'The Mafia on Trial', 'Behind Closed Deliberation Doors'
      ]),
      makeCat('medical-thriller', 'Medical Thriller', [
        'Lethal Contagion Outbreak', 'Experimental Drug Trials Gone Wrong', 'Hospital Organ Harvesting Ring', 'Genetically Engineered Pathogens',
        'ICU Patient Unexplained Deaths', 'Rogue Biomedical Scientist', 'Surgical Malpractice Coverups', 'Bacterial Superbugs in Water',
        'Brain Implant Mind Control', 'CDC Quarantined Cities', 'Cloning Human Organs', 'The Coma Ward Mystery',
        'Poison in the Blood Supply', 'Artificial Organs Malfunction', 'Biological Weapon in the Metro', 'Deadly Clinical Trials'
      ]),
      makeCat('financial-corporate', 'Financial & Corporate Thriller', [
        'Wall Street Insider Trading', 'Crypto Exchange Ponzi Scheme', 'Hedge Fund Crash Sabotage', 'Offshore Tax Havens Assassinations',
        'Hostile Takeover Blackmail', 'Silicon Valley Fraud Coverup', 'Forensic Accountant Audit', 'Central Bank Gold Heist',
        'Billionaire Family Feud Murder', 'Counterfeit Currency Ring', 'Stock Market Flash Crash', 'Russian Oligarch Assets',
        'Corporate Espionage in Tech', 'Venture Capital Dark Web', 'Pension Fund Embezzlement', 'Real Estate Syndicate Murders'
      ]),
      makeCat('noir-hardboiled', 'Noir & Hardboiled Detective', [
        'Rain-Slicked City Streets', 'Femme Fatale with a Revolver', 'Private Eye in Smoke-Filled Office', 'Corrupt Mayor & Police Chief',
        'Speakeasies & Jazz Clubs', 'Blackmail Letters in Hotel Rooms', 'Pawn Shop Clues & Cheap Whiskey', 'Gangsters in Pinstripes',
        'Nightclub Murders at 3 AM', 'Body Floating in the Docks', 'Battered Fedora & Cigarette Smoke', 'Betrayed by the Only Friend',
        'Diner Conversations in the Rain', 'Underworld Bookies & Debts', 'The Last Honest Man in Town', 'Bullet in the Shoulder Noir'
      ]),
      makeCat('historical-mystery', 'Historical Mystery', [
        'Victorian London Gaslight Murders', 'Ancient Rome Senatorial Poisonings', 'Medieval Monk Abbey Investigations', 'Renaissance Venice Doge Murders',
        'Tudor Court Beheadings & Clues', '1920s Roaring Twenties Speakeasy Crimes', 'WWII London Blitz Murders', 'Ancient Egypt Pharaoh Tombs',
        'Gilded Age New York Mansions', 'Old West Frontier Marshal', 'Salem Witch Trial Conspiracies', 'French Revolution Guillotine Clues',
        'Edwardian Country House Mystery', '1950s Cold War Spy Murders', 'Gold Rush Saloon Murders', 'Shakespearean Globe Theater Crimes'
      ]),
      makeCat('serial-killer-profiler', 'Serial Killer & FBI Profiler', [
        'Behavioral Analysis Unit (BAU)', 'Signature Mutilation Patterns', 'Taunting Letters to the Media', 'Copycat Killer Dynamics',
        'Body Dump Sites in National Parks', 'Trophies Taken from Victims', 'Mind of the Psychopath', 'Cat and Mouse Games with Police',
        'Childhood Trauma Profiling', 'The Killer Among the Search Party', 'Unsolved Cold Case Strings', 'Forensic Entomology Clues',
        'The Highway Strangler', 'Interviewing Killers in Prison', 'The Collector of Faces', 'The Clockwork Executioner'
      ]),
      makeCat('wilderness-survival', 'Wilderness & Survival Thriller', [
        'Plane Crash in Alaskan Tundra', 'Hunted in the Rocky Mountains', 'Lost in the Amazon Rain Forest', 'Isolated Cabin in Blizzard',
        'Desert Crossing Without Water', 'Stranded on Desolate Ocean Raft', 'Cave System Collapse Underground', 'Forest Fire Trapped Hikers',
        'Grizzly Bear Territory Manhunt', 'Avalanche in the Swiss Alps', 'Swamp Bayou Gators & Killers', 'Shipwreck on Arctic Ice Pack',
        'Deep Woods Stalker', 'River Rapids Escape', 'Canyon Fall with Broken Leg', 'Predator and Prey in the Wild'
      ]),
      makeCat('political-thriller', 'Political Thriller', [
        'Assassination of Foreign Leaders', 'Cabinet Level Conspiracies', 'Coup d’État in South America', 'Election Night Vote Rigging',
        'White House Nuclear Football', 'Blackmail of Supreme Justices', 'Secret Bunkers of Washington', 'Deep State Syndicate Operatives',
        'Ambassador Hostage Crisis', 'Treaty Sabotage by Arms Dealers', 'Investigative Journalist Whistleblower', 'Senator Found Dead in Hotel',
        'State Department Traitors', 'Cyber Attack on Grid Before Vote', 'Impeachment Trial Murder', 'The Shadow President'
      ]),
      makeCat('techno-cyber-thriller', 'Techno-Thriller & Cyber Crime', [
        'Ransomware Attack on Power Plants', 'Dark Web Silk Road Takedown', 'AI Rogue Drone Fleets', 'Deepfake Assassination Hoaxes',
        'Autonomous Vehicle Hacking', 'Quantum Encryption Decryption Key', 'Smart City Surveillance Panopticon', 'Biometric Identity Theft',
        'Hospital Life Support Hacking', 'Satellite Defense Hijacking', 'Cryptographic Heist at Sea', 'Algorithm That Predicts Crime',
        'Virtual Reality Mind Trap', 'Whistleblower on Tech Giants', 'Automated Weapon Outbreak', 'Zero-Day Exploit Black Market'
      ]),
      makeCat('heist-caper', 'Heist & Caper Thriller', [
        'Museum Diamond Heist at Midnight', 'Casino Vault Drilling in Vegas', 'Royal Crown Jewels Infiltration', 'High-Speed Armored Car Robbery',
        'Swiss Bank Underground Safe', 'Art Forgery Swap at the Louvre', 'Crypto Cold Storage Physical Raid', 'International Airport Cargo Cargo',
        'Ocean Luxury Yacht Safecracking', 'Stock Exchange Server Theft', 'Train Heist Across the Desert', 'Underground Tunnel to Vault',
        'The Inside Job Architect', 'Master of Disguise Infiltration', 'Escape Plan from Maximum Security', 'The Con Artist Syndicate'
      ]),
      makeCat('supernatural-thriller', 'Supernatural & Occult Thriller', [
        'Demon Possession Investigations', 'Cursed Antiquities Museum', 'Ancient Cult Sacrifices in Forests', 'Witchcraft in Small Mountain Towns',
        'Vatican Secret Exorcist Archives', 'Ghost Ship Abandoned at Sea', 'Haunted Asylum Cold Cases', 'Séance Murder in Locked Room',
        'The Grim Reaper Legend Real', 'Necronomicon Translation Murders', 'Doomsday Cult Suicide Bunker', 'Voodoo Rituals in the Swamp',
        'Tarot Card Killer Predictions', 'Astral Projection Spy Murders', 'The Cursed Bloodline Legacy', 'Hellmouth Beneath the City'
      ]),
      makeCat('locked-room-puzzle', 'Locked Room & Fair-Play Puzzle', [
        'Body Found Inside Welded Vault', 'Island Mansion Cut Off by Storm', 'Snowbound Train Murder', 'Submarine Murder with Hatches Sealed',
        'Elevator Plunge with Stabbed Body', 'Penthouse Sealed from the Inside', 'The Impossible Poisoning Trick', 'Mirror Maze Murder Mystery',
        'Secret Passage Behind the Fireplace', 'Clock Tower Death at Noon', 'The Disappearing Weapon Puzzle', 'All Suspects Have Rock-Solid Alibis',
        'Ten Guests One By One Murdered', 'Dinner Party Poisoned Chalice', 'The Locked Greenhouse Mystery', 'The Vanishing Footsteps in Snow'
      ])
    ]
  },

  // =========================================================================
  // 4. AUTOAJUDA & DESENVOLVIMENTO PESSOAL
  // =========================================================================
  {
    id: 'self-help',
    name: 'Autoajuda & Desenvolvimento Pessoal',
    categories: [
      makeCat('habits-discipline', 'Hábitos, Disciplina & Foco', [
        'Sistemas de Hábitos Atômicos', 'Foco Profundo & Deep Work', 'Rotinas Matinais de Alta Performance', 'Eliminação da Procrastinação',
        'Dopamine Detox & Foco Digital', 'Disciplina de Vontade Inabalável', 'Regra dos 2 Minutos & Micro-Passos', 'Rastreadores de Hábitos Visuais',
        'Arquitetura do Ambiente Diário', 'Consistência em Dias Caóticos', 'Resistência Mental & Autocontrole', 'Substituição de Maus Hábitos',
        'Automatização da Rotina Noturna', 'Micro-vitórias & Efeito Composto', 'Blindagem Contra Distrações', 'O Poder do Ritmo Diário'
      ]),
      makeCat('mindset-stoicism', 'Mentalidade, Resiliência & Estoicismo', [
        'Filosofia Estoica no Dia a Dia', 'Mentalidade Antifrágil & Crescimento', 'Como Superar a Síndrome do Impostor', 'Superação do Medo do Julgamento',
        'Gratidão Prática & Contentamento', 'Aceitação Radical & Amor Fati', 'Controle do que Está ao Seu Alcance', 'Coragem Diante da Adversidade',
        'A Arte de Dizer Não Sem Culpa', 'Reenquadramento Cognitivo de Crises', 'Mente de Principiante (Shoshin)', 'Paciência Estratégica em Tempos Rápidos',
        'Vencendo o Vitimismo & Auto-responsabilidade', 'Autoconfiança Inabalável em Entrevistas', 'Sabedoria de Marco Aurélio & Sêneca', 'A Quietude é a Chave'
      ]),
      makeCat('productivity-time', 'Produtividade & Gestão do Tempo', [
        'Time-Blocking & Caixas de Tempo', 'Método Getting Things Done (GTD)', 'Matriz de Eisenhower & Priorização', 'Princípio de Pareto 80/20 em Tudo',
        'Técnica Pomodoro Avançada', 'Semana de 4 Horas & Delegação', 'Gestão de Energia vs Gestão de Tempo', 'Eliminação de Reuniões Inúteis',
        'Produtividade Sem Esgotamento (Burnout)', 'Planejamento Semanal em 30 Minutos', 'Organização de Espaços de Trabalho', 'Ferramentas Digitais de Gestão (Notion/Obsidian)',
        'Foco em Metas Trimestrais (OKRs)', 'Otimização de E-mails & Comunicação', 'Manhãs Livres de Mensagens', 'Ritmo Biológico & Produtividade Circadiana'
      ]),
      makeCat('communication-charisma', 'Comunicação, Oratória & Carisma', [
        'Como Falar em Público Sem Medo', 'Carisma Magnético & Primeira Impressão', 'Conversação Difícil Sem Conflito', 'Linguagem Corporal & Micro-expressões',
        'Escuta Ativa & Empatia Profunda', 'A Arte do Storytelling Pessoal', 'Negociação & Persuasão Ética', 'Voz Firme & Postura de Autoridade',
        'Como Fazer Amigos & Networking', 'Comunicação Não-Violenta (CNV)', 'Responder Perguntas Difíceis de Supetão', 'Humor Inteligente & Conexão Social',
        'Feedback Construtivo para Líderes', 'Vencendo a Timidez & Introversão Social', 'Apresentações de Alto Impacto', 'Pitch de Ideias em 60 Segundos'
      ]),
      makeCat('emotional-intelligence', 'Inteligência Emocional & Mindfulness', [
        'Regulação Emocional em Crises', 'Autoconhecimento & Sombra Psicológica', 'Mindfulness para Alívio da Ansiedade', 'Superação do Luto & Fim de Ciclos',
        'Perdão como Libertação Pessoal', 'Gestão da Raiva & Impulsividade', 'Meditação Guiada para Iniciantes', 'Respiração Consciente (Breathwork)',
        'Desenvolvimento da Autocompaixão', 'Identificação de Gatilhos Emocionais', 'Diário Terapêutico (Journaling)', 'Paz Interior em Ambientes Tóxicos',
        'Desapego de Expectativas Alheias', 'Cura da Criança Interior', 'Intuição & Sabedoria Corporal', 'Vulnerabilidade como Força'
      ]),
      makeCat('relationships-family', 'Relacionamentos, Família & Casal', [
        'Comunicação Afetiva entre Casais', 'As 5 Linguagens do Amor na Prática', 'Como Superar Crises Conjugais', 'Limites Saudáveis com Familiares',
        'Criação Consciente de Filhos (Parenting)', 'Relacionamentos Tóxicos & Narcisismo', 'Superação da Dependência Emocional', 'Sexualidade & Intimidade no Casamento',
        'Divórcio Saudável & Guarda Compartilhada', 'Amizades Adultas Duradouras', 'Cuidando de Pais Idosos com Amor', 'Finanças em Família Sem Brigas',
        'Acolhendo o Adolescente em Casa', 'Construção de Lares Acolhedores', 'Reconciliação Familiar & Perdão', 'Amor Próprio Antes do Amor a Dois'
      ]),
      makeCat('spirituality-meaning', 'Espiritualidade & Sentido da Vida', [
        'A Busca de Sentido (Viktor Frankl)', 'Despertar Espiritual & Presença', 'Conexão com o Sagrado no Cotidiano', 'Propósito de Vida & Ikigai',
        'Desapego Material & Minimalismo Espiritual', 'Leis Universais & Karma Positivo', 'Práticas de Gratidão Diária', 'O Poder do Agora & Silêncio',
        'Vencendo o Vazio Existencial', 'Sincronicidade & Sinais da Vida', 'Misticismo Prático & Oração', 'Aceitação da Finitude Humana',
        'Transcendência & Iluminação Pessoal', 'Serviço ao Próximo & Altruísmo', 'Conexão com a Natureza & Terra', 'Paz Além do Entendimento'
      ]),
      makeCat('creativity-writing', 'Criatividade, Escrita & Expressão', [
        'O Caminho do Artista & Bloqueios', 'Como Escrever um Livro em 30 Dias', 'Geração de Ideias Criativas Sem Limites', 'Superando a Procrastinação Criativa',
        'Rotinas Diárias de Grandes Gênios', 'Diário Visual & Caderno de Rascunhos', 'A Arte de Roubar como um Artista', 'Design Thinking para a Vida Pessoal',
        'Como Vencer o Medo de Criar', 'Originalidade na Era dos Algoritmos', 'Storytelling para Todos os Dias', 'Expressão Autêntica da Própria Voz',
        'Encontrando Seu Estilo Pessoal', 'Criatividade Coletiva & Brainstorming', 'Colaborações Artísticas Poderosas', 'Do Caos Mental à Obra Pronta'
      ]),
      makeCat('career-leadership', 'Carreira, Liderança & Sucesso Profissional', [
        'Transição de Carreira aos 30, 40 ou 50', 'Liderança Humanizada de Equipes', 'Como Ser Promovido & Reconhecido', 'Marketing Pessoal & Marca no LinkedIn',
        'Gestão de Conflitos no Trabalho', 'Inteligência Política Corporativa', 'Síndrome do Burnout: Como Escapar', 'De Especialista a Gestor de Pessoas',
        'Trabalho Remoto & Produtividade Home Office', 'Mentoria: Como Encontrar e Guiar', 'Resolução de Problemas Complexos', 'Cultura de Inovação Prática',
        'Salários & Negociação de Pacotes', 'Ética Profissional Inabalável', 'Liderando Gerações Diferentes', 'A Arte de Delegar com Sucesso'
      ]),
      makeCat('confidence-self-esteem', 'Autoconfiança & Autoestima', [
        'Reconstrução da Autoimagem Positiva', 'Vencendo o Medo da Rejeição', 'Postura de Campeão & Presença Corporal', 'Amor Próprio & Fim da Autocrítica',
        'Definindo Padrões e Não Aceitando Menos', 'A Voz Interior: Calando o Sabotador', 'Segurança em Ambientes Intimidadores', 'Comemoração de Pequenas Vitórias',
        'Independência da Aprovação dos Pais', 'Autoestima Corporal & Aceitação', 'Coragem para Reinventar a Vida', 'Firmeza sem Agressividade',
        'Liberdade de Ser Quem Você É', 'Superação da Dependência de Elogios', 'Resgate do Orgulho Pessoal', 'O Poder da Firmeza Serene'
      ]),
      makeCat('grief-healing', 'Superação de Traumas & Cura Emocional', [
        'Atravessando o Luto Passo a Passo', 'Cura do Coração Partido após Término', 'Resiliência Após Perdas Financeiras', 'Sobrevivendo ao Diagnóstico Difícil',
        'Cura de Feridas de Infância', 'Rompimento de Padrões Geracionais', 'Reconstrução Pessoal do Zero', 'Esperança nos Dias Mais Escuros',
        'O Poder das Lágrimas & Liberação', 'Acolhimento da Vulnerabilidade', 'Terapia & Apoio em Comunidade', 'Renascer das Cinzas Emocionais',
        'Paz com o Passado Irreversível', 'Encontrando Significado na Dor', 'Abraçando a Nova Realidade', 'A Vida Depois da Tempestade'
      ]),
      makeCat('minimalism-simple-living', 'Minimalismo & Vida Simples', [
        'Destralhe de Ambientes (Método Marie Kondo)', 'Guarda-Roupa Cápsula & Estilo Consciente', 'Vida Financeira Minimalista & Poupar Mais', 'Desintoxicação Digital & Menos Telas',
        'A Arte do Menos é Mais', 'Alimentação Simples & Saudável', 'Consumo Consciente Contra o Hiperconsumo', 'Casas Pequenas & Espaços Acolhedores',
        'Simplificação da Agenda Diária', 'Minimalismo com Filhos & Família', 'Liberdade Sem Carro ou Dívidas', 'Vida Lenta & Conexão com o Presente',
        'Viagens com Apenas Uma Mala', 'Redução do Lixo & Zero Waste', 'Mente Limpa em Casa Organizada', 'Riqueza de Tempo vs Riqueza de Coisas'
      ]),
      makeCat('aging-longevity-mindset', 'Longevidade & Mentalidade Madura', [
        'Envelhecer com Saúde & Vitalidade', 'Aposentadoria com Propósito & Atividade', 'Manutenção da Mente Afiada na Melhor Idade', 'Reencontro de Paixões na Segunda Metade da Vida',
        'Prevenção de Quedas & Força Muscular', 'Amizades na Maturidade & Comunidade', 'Histórias de Vida & Legado para Netos', 'Aceitação das Mudanças do Corpo',
        'Voluntariado & Sabedoria Compartilhada', 'Tecnologia Acessível para Idosos', 'Alimentação Anti-inflamatória Madura', 'Sono Restaurador na Terceira Idade',
        'Espiritualidade & Serenidade nos Anos Dourados', 'Sexualidade Madura Sem Tabus', 'Independência & Autonomia em Casa', 'A Graça dos Anos Bem Vividos'
      ]),
      makeCat('student-success', 'Estudantes & Concursos Públicos', [
        'Métodos de Estudo de Alta Retenção (Spaced Repetition)', 'Técnica Feynman para Aprender Qualquer Coisa', 'Flashcards & Mapas Mentais Eficazes', 'Como Estudar 6 Horas Sem Cansaço',
        'Passando em Concursos Públicos Difíceis', 'Preparação para ENEM & Vestibulares', 'Rotina de Estudos Conciliando com Trabalho', 'Controle da Ansiedade Pré-Prova',
        'Leitura Dinâmica & Compreensão Crítica', 'Resumos Visuais que Funcionam', 'Eliminação da Curva do Esquecimento', 'Estratégias de Resolução de Questões',
        'Alimentação & Sono para o Cérebro Estudante', 'Grupos de Estudo Produtivos', 'Motivação nos Meses de Estudo Solitário', 'Gabaritando Provas Discursivas'
      ]),
      makeCat('philosophy-ethics', 'Filosofia Aplicada & Vida Boa', [
        'Ética a Nicômaco de Aristóteles na Prática', 'Como Viver Bem Segundo Epicuro', 'O Sentido da Amizade Segundo Cícero', 'A Sabedoria dos Cínicos & Diógenes',
        'Descartes & Dúvida Metódica Pessoal', 'Nietzsche & A Vontade de Potência Construtiva', 'Kant & Imperativo Categórico nas Decisões', 'Schopenhauer & Como Vencer Debates',
        'Filosofia Oriental vs Ocidental', 'O Mito da Caverna na Era das Redes Sociais', 'Utilitarismo vs Moralidade nas Empresas', 'Livre-Arbítrio vs Determinismo',
        'A Busca da Verdade em Tempos de Fake News', 'Humildade Socrática & Sei que Nada Sei', 'Filosofia da Mente & Consciência', 'O Banquete de Platão & o Amor'
      ]),
      makeCat('personal-empowerment', 'Empoderamento Pessoal & Autonomia', [
        'Assumindo o Controle da Própria Narrativa', 'Quebrando Tetos de Vidro & Limites', 'Autonomia Financeira & Pessoal Plena', 'Voz Autêntica Sem Pedir Licença',
        'Independência Emocional Radical', 'A Força do Posicionamento Firme', 'Construção de Redes de Apoio Feminino', 'Superação do Medo de Incomodar',
        'Negociação de Valor Sem Rebaixar Preço', 'Respeito aos Próprios Limites Corporais', 'A Arte de Não Se Desculpar por Existir', 'Liderança Firme e Humanizada',
        'Coragem para Abandonar Ambientes Tóxicos', 'Fazer as Pazes com a Própria Ambição', 'Pioneirismo & Coragem de Abrir Caminhos', 'A Vitória da Determinação'
      ])
    ]
  },

  // =========================================================================
  // 5. NEGÓCIOS & FINANÇAS
  // =========================================================================
  {
    id: 'business-finance',
    name: 'Negócios, Finanças & Investimentos',
    categories: [
      makeCat('personal-finance-wealth', 'Finanças Pessoais & Riqueza', [
        'Renda Passiva & Dividendos Mensais', 'Saída Rápida de Dívidas & Renegociação', 'Orçamento Inteligente 50-30-20', 'Reserva de Emergência Intocável',
        'Investimentos para Iniciantes do Zero', 'A Mente Milionária & Hábitos Financeiros', 'Fundos Imobiliários (FIIs) para Viver de Renda', 'Ações de Valor vs Ações de Crescimento',
        'Independência Financeira (Movimento FIRE)', 'Planejamento Sucessório & Herança', 'Declaração de IR & Otimização Fiscal', 'Previdência Privada Sem Pegadinhas',
        'Educação Financeira para Crianças', 'Como Evitar Golpes & Pirâmides Financeiras', 'Finanças para Casais Sem Segredos', 'Comprar Casa Própria vs Alugar'
      ]),
      makeCat('investing-markets', 'Mercado Financeiro & Ações', [
        'Análise Fundamentalista de Ações', 'Valuation: Como Avaliar uma Empresa', 'Análise Técnica & Gráficos de Candles', 'Day Trade & Swing Trade com Gestão de Risco',
        'Opções & Derivativos para Proteção', 'Investimento Internacional nos EUA (BDRs/Stocks)', 'Fundos de Índice (ETFs) Globais', 'Renda Fixa: Tesouro Direto & CDBs',
        'Criptomoedas & Bitcoin para Longo Prazo', 'Commodities: Ouro, Petróleo & Agronegócio', 'Macroeconomia para Investidores', 'Psicologia do Investidor & Pânico de Mercado',
        'Mercados Futuros & Contratos de Dólar', 'Family Offices & Gestão de Fortunas', 'Fundos Multimercado & Alavancagem', 'Métricas de Risco: Sharpe, Drawdown & Beta'
      ]),
      makeCat('entrepreneurship-startups', 'Empreendedorismo & Startups', [
        'Validação de Ideias de Negócio Rápida', 'Metodologia Lean Startup na Prática', 'Modelo de Negócios Canvas & Proposta de Valor', 'Captação de Investimento Anjo & Venture Capital',
        'Product-Market Fit & Tração Inicial', 'Cultura de Empresa & Primeiras Contratações', 'Growth Hacking & Aquisição Orgânica', 'Pivô Estratégico Quando Tudo Falha',
        'Gestão de Sócios & Acordo de Acionistas', 'Bootstrapping: Crescer Sem Dívidas Externas', 'MVP (Mínimo Produto Viável) Sem Código', 'Venda B2B para Grandes Empresas',
        'Scale-up: Gestão do Crescimento Acelerado', 'Estratégia de Saída (Exit) & Venda da Empresa', 'Liderança de Fundadores Sob Pressão', 'Falhas Comuns que Quebram Startups'
      ]),
      makeCat('sales-copywriting', 'Vendas, Copywriting & Persuasão', [
        'Copywriting Hipnótico para Páginas de Vendas', 'Gatilhos Mentais de Escassez e Urgência', 'Scripts de Vendas por Telefone e WhatsApp', 'Fechamento de Negócios Difíceis',
        'Funil de Vendas de Alta Conversão', 'Gestão de Objeções Mais Comuns', 'Storytelling em Vendas B2B', 'Spin Selling & Vendas Consultivas',
        'Cold Email & Prospecção Ativa que Funciona', 'Negociação Baseada no Método Harvard', 'Propostas Comerciais Irrecusáveis', 'Lançamento de Infoprodutos & Webinars',
        'Retenção de Clientes & Churn Reduzido', 'Upsell, Cross-sell & Ticket Médio', 'Copy para Anúncios no Meta e Google', 'Venda Invisível Sem Parecer Vendedor'
      ]),
      makeCat('digital-business-ecommerce', 'Negócios Digitais & E-commerce', [
        'Dropshipping Internacional Lucrativo', 'Criação de Loja Virtual Shopify do Zero', 'Vendas no Mercado Livre & Shopee', 'Amazon FBA: Como Vender Produtos Físicos',
        'Marketing de Afiliados de Alta Renda', 'Criação e Lançamento de Cursos Online', 'Modelos de Assinatura & Recorrência (SaaS)', 'Print on Demand: Livros, Roupas e Quadros',
        'Automação de E-commerce com IA', 'Gestão de Tráfego Pago & ROAS Alto', 'Logística Reversa & Atendimento ao Cliente', 'Branding para Marcas Próprias (Private Label)',
        'SEO para E-commerce & Tráfego Orgânico', 'Influencer Marketing para Lojas Virtuais', 'Kits de Produtos & Aumento de Margem', 'Contabilidade & Tributação para Lojas Online'
      ]),
      makeCat('management-leadership', 'Gestão, Liderança & Operações', [
        'Metodologias Ágeis: Scrum e Kanban', 'Gestão por Indicadores (KPIs & OKRs)', 'Liderança de Alta Performance sem Microgestão', 'Feedback Contínuo & Avaliação 360',
        'Gestão de Processos & Eliminação de Desperdício', 'Contratação de Talentos A-Players', 'Cultura Forte que Retém os Melhores', 'Delegação Eficaz para Ganho de Tempo',
        'Comitês de Crise & Gestão de Riscos', 'Tomada de Decisão Baseada em Dados (Data-Driven)', 'Estruturação de Departamentos em Crescimento', 'Onboarding de Novos Colaboradores',
        'Redução de Custos Fixos Operacionais', 'Engajamento de Equipes Remotas', 'Comunicação Assíncrona no Trabalho', 'Planejamento Estratégico Anual'
      ]),
      makeCat('marketing-branding', 'Marketing, Branding & Posicionamento', [
        'Posicionamento de Marca Inconfundível', 'Branding Emocional & Arquétipos de Marca', 'Marketing de Conteúdo & Redes Sociais', 'Estratégia de SEO & Domínio no Google',
        'Marketing de Influência & Parcerias Reais', 'Identidade Visual & Tom de Voz de Marca', 'Experiência do Cliente (Customer Experience - CX)', 'Marketing Viral & Efeito Rede',
        'Inbound Marketing & Nutrição de Leads', 'Comunidades de Marca Engajadas', 'Guerrilla Marketing & Ações de Baixo Custo', 'Lançamento de Novos Produtos no Mercado',
        'Gestão de Reputação & Crises de Imagem', 'Métricas de Marketing: CAC, LTV e Churn', 'Pesquisa de Mercado & Entrevistas com Clientes', 'Marketing B2B vs Marketing B2C'
      ]),
      makeCat('real-estate-investing', 'Mercado Imobiliário & Propriedades', [
        'Como Investir em Imóveis para Aluguel', 'Leilões de Imóveis: Arrematar com Lucro', 'Flipping: Comprar, Reformar e Vender Rápido', 'Aluguel por Temporada no Airbnb',
        'Loteamentos & Desenvolvimento Urbano', 'Construção Civil para Renda Própria', 'Avaliação Imobiliária & Negociação de Preço', 'Financiamento Imobiliário & Amortização',
        'Fundos Imobiliários vs Imóvel Físico', 'Contratos de Aluguel Seguros & Inadimplência', 'Imóveis Comerciais & Galpões Logísticos', 'Regularização de Imóveis & Usucapião',
        'Condomínios Fechados: Tendências de Compra', 'Investimento Imobiliário no Exterior (EUA/Portugal)', 'Energia Solar & Valorização de Imóveis', 'Gestão de Carteira Imobiliária'
      ]),
      makeCat('accounting-taxes', 'Contabilidade & Planejamento Tributário', [
        'Planejamento Tributário para PMEs', 'Simples Nacional, Lucro Presumido e Real', 'Elisão Fiscal Legal vs Evasão Criminosa', 'Gestão de Fluxo de Caixa Diário',
        'Contabilidade para Prestadores de Serviços', 'Tributação de Investimentos no Brasil e Exterior', 'Holding Familiar para Proteção Patrimonial', 'Auditoria Fiscal & Conformidade (Compliance)',
        'Balanço Patrimonial sem Segredos', 'Redução de Encargos Trabalhistas Legais', 'Tributação de Infoprodutores & Afiliados', 'Recuperação de Créditos Tributários',
        'Emissão Correta de Notas Fiscais (NFe)', 'Fechamento Contábil Mensal Sem Erros', 'Custos Fixos vs Custos Variáveis na Ponta do Lápis', 'Holding Operacional vs Holding Patrimonial'
      ]),
      makeCat('kdp-self-publishing', 'Publicação Independente & KDP Business', [
        'Estratégias de Best Seller na Amazon KDP', 'Pesquisa de Palavras-Chave Lucrativas no KDP', 'Design de Capas que Convertem Cliques em Vendas', 'Amazon Ads (PPC) para Livros Físicos e Kindle',
        'Formatação Profissional de Livros sem Erros', 'Estratégia de Preço para Ganhar 70% de Royalty', 'Livros Low-Content & No-Content que Vendem', 'Escrita de Ficção em Série no Kindle Unlimited',
        'Lançamento de Livro com Resenhas Éticas', 'Criação de Marca de Autor (Author Central)', 'Tradução de Livros para o Mercado Global', 'Construção de Lista de Leitores por E-mail',
        'Audiolivros no ACX & Audible', 'Distribuição Expandida: IngramSpark e D2D', 'Livros Infantis Ilustrados no KDP', 'Direitos Autorais & Registro de Obras'
      ]),
      makeCat('consulting-coaching', 'Consultoria & Serviços de Alto Valor', [
        'Como Cobrar Honorários Altos com Segurança', 'Empacotamento de Serviços em Produtos (Productized Services)', 'Proposta de Consultoria Irrecusável', 'Metodologias de Diagnóstico Empresarial',
        'Posicionamento de Autoridade no Setor', 'Aquisição de Clientes Corporativos B2B', 'Contratos de Retainer & Recorrência Mensal', 'Diferenciação Contra Grandes Consultorias',
        'Coaching Executivo & Liderança', 'Mentoria em Grupo vs Mentoria Individual', 'Escalando Serviços com Equipes Associadas', 'Transição de Empregado para Consultor Independente',
        'Elaboração de Relatórios de Impacto', 'Garantias Condicionais que Fecham Contratos', 'Casos de Sucesso em Vídeo & Depoimentos', 'Palestras Corporativas de Alto Valor'
      ]),
      makeCat('franchising-licensing', 'Franquias, Licenciamento & Expansão', [
        'Como Franquear Seu Próprio Negócio', 'Avaliação de Franquias para Investir', 'Circular de Oferta de Franquia (COF)', 'Gestão de Rede de Franqueados Sem Conflito',
        'Manual de Operações & Padronização de Processos', 'Royalties & Taxa de Fundo de Propaganda', 'Licenciamento de Marcas e Personagens', 'Expansão de Lojas Próprias vs Franquias',
        'Ponto Comercial: Escolha e Negociação de Aluguel', 'Treinamento de Equipes de Franqueados', 'Auditoria de Qualidade nas Unidades', 'Franquias Home-Based & Virtuais',
        'Master Franquias & Expansão Regional', 'Rescisão Contratual & Recompra de Unidades', 'Franquias de Alimentação vs Serviços', 'Retorno do Investimento (Payback) em Franquias'
      ]),
      makeCat('crisis-turnaround', 'Gestão de Crises & Recuperação Judicial', [
        'Turnaround: Como Salvar Empresas da Falência', 'Renegociação de Dívidas Bancárias Complexas', 'Corte Radical de Custos Sem Paralisar a Operação', 'Comunicação de Crise com Clientes e Imprensa',
        'Recuperação Judicial: Quando Entrar e Como Proceder', 'Reestruturação de Passivo Trabalhista', 'Venda de Ativos Não-Operacionais para Fôlego', 'Gestão com Caixa Negativo',
        'Recuperação de Confiança com Fornecedores', 'Proteção de Patrimônio dos Sócios na Crise', 'Crises de Reputação nas Redes Sociais', 'Planejamento de Continuidade de Negócios (PCN)',
        'Fraudes Internas & Como Investigar', 'Crises Cibernéticas & Vazamento de Dados', 'Resgate de Moral da Equipe Desmotivada', 'O Novo Começo Após a Falência'
      ]),
      makeCat('future-ai-business', 'Inteligência Artificial & Negócios do Futuro', [
        'Implementação de IA Generativa em Empresas', 'Automação de Atendimento ao Cliente com Agentes de IA', 'Engenharia de Prompts para Produtividade Empresarial', 'Redução de Custos Operacionais com Inteligência Artificial',
        'Criação de Agentes Autônomos para Vendas', 'IA para Análise de Dados e Tomada de Decisão', 'O Futuro dos Empregos & Requaliﬁcação', 'Ética e Segurança no Uso de IA Corporativa',
        'Substituição de Tarefas Repetitivas por Robôs de Software (RPA)', 'Criação de Conteúdo em Escala com Ferramentas de IA', 'IA na Medicina & Saúde Empresarial', 'Modelos Preditivos de Demanda e Estoque',
        'Startups Nativas em Inteligência Artificial', 'Privacidade de Dados dos Clientes na Era da IA', 'Como Não Ficar Obsoleto no Mercado de Trabalho', 'Liderando Equipes Mistas (Humanos + IA)'
      ]),
      makeCat('import-export-global', 'Importação, Exportação & Comércio Exterior', [
        'Importação Simplificada da China para Vender Online', 'Como Negociar com Fornecedores no Alibaba', 'Despacho Aduaneiro & Documentação (Siscomex)', 'Tributos de Importação: II, IPI, PIS, Cofins e ICMS',
        'Transporte Marítimo vs Transporte Aéreo: Fretes e Prazos', 'Exportação de Produtos Brasileiros para o Mundo', 'Controle de Qualidade e Inspeção de Fábricas no Exterior', 'Contratos Internacionais de Compra e Venda (Incoterms)',
        'Importação de Eletrônicos & Homologação na Anatel', 'Importação de Cosméticos & Normas da Anvisa', 'Câmbio Comercial & Hedge Cambial para Proteger Lucro', 'Armazenamento em Portos e Zonas Francas',
        'Feiras de Negócios na Ásia (Canton Fair)', 'Trading Companies: Quando Vale a Pena Contratar', 'Selo de Origem & Certificações Internacionais', 'Logística de Contêineres Compartilhados (LCL)'
      ]),
      makeCat('sustainability-esg', 'ESG, Sustentabilidade & Economia Circular', [
        'Implementação de Práticas ESG em Pequenas e Médias Empresas', 'Créditos de Carbono: Como Gerar e Comercializar', 'Economia Circular: Transformando Resíduos em Receita', 'Eficiência Energética & Energia Solar Comercial',
        'Certificação B (Empresas B) Passo a Passo', 'Diversidade, Equidade e Inclusão nas Contratações', 'Governança Corporativa Transparente e Anticorrupção', 'Relatórios de Sustentabilidade Padrão GRI',
        'Logística Reversa & Destinação Correta de Embalagens', 'Consumo Consciente de Água na Indústria', 'Financiamentos Verdes (Green Bonds) com Juros Baixos', 'Engajamento de Fornecedores Sustentáveis',
        'Prevenção de Greenwashing & Comunicação Ética', 'Projetos de Impacto Social em Comunidades Locais', 'Bem-Estar no Trabalho & Selos de Saúde Mental', 'O Futuro das Empresas com Responsabilidade Social'
      ])
    ]
  },

  // =========================================================================
  // 6. SCI-FI, HORROR, INFANTIL, CULINÁRIA E DEMAIS (COMPLETANDO OS 16 GÊNEROS)
  // =========================================================================
  {
    id: 'scifi',
    name: 'Ficção Científica (Sci-Fi)',
    categories: [
      makeCat('space-opera', 'Space Opera & Frotas Estelares', [
        'Batalhas Navais no Espaço', 'Impérios Galácticos em Ruínas', 'Pilotos de Caça Espaciais', 'Estações Orbitais Abandonadas',
        'Alianças Alienígenas Frágeis', 'Colonização de Mundos Distantes', 'Dobra Espacial & Motores de Salto', 'Rebelião Contra Federação Tirana',
        'Contrabandistas de Asteroides', 'Criptas Alienígenas Ancestrais', 'Guerras por Cristais de Energia', 'Frotas de Dreadnoughts',
        'Trabalhadores de Mineração Espacial', 'Planetas Prisão Galácticos', 'A Frota Perdida da Terra', 'Confronto na Borda da Galáxia'
      ]),
      makeCat('cyberpunk-neon', 'Cyberpunk & Alta Tecnologia', [
        'Megacorporações que Controlam Cidades', 'Hackers Neurais no Ciberespaço', 'Implantes Cibernéticos no Mercado Negro', 'Detetives de Androides',
        'Ruas Iluminadas por Neon na Chuva', 'Inteligências Artificiais Proibidas', 'Guerra de Facções Cibernéticas', 'Submundo dos Modificadores Corporais',
        'Vírus Digital que Mata Humanos', 'Drogas Sintéticas & Realidade Virtual', 'Drones Assassinos & Vigilância Panóptica', 'Prostituição Ciborgue & Consciência',
        'Os Últimos Humanos Puros', 'Infiltração em Servidores Quânticos', 'Armas de Plasma Clandestinas', 'Revolução dos Trabalhadores Aumentados'
      ]),
      makeCat('dystopia-postapoc', 'Distopias & Futuros Sombrios', [
        'Governo Totalitário & Polícia do Pensamento', 'Cidades Muradas com Divisão de Castas', 'O Ar Tóxico & Sobrevivência em Domos', 'Reprodução Controlada pelo Estado',
        'Colapso Ecológico & Seca Extrema', 'Extinção Humana & Últimos Nascidos', 'Arena de Sobrevivência Transmitida na TV', 'Tecnologia que Apaga Memórias',
        'Cultos Apocalípticos do Fim do Mundo', 'Trabalhadores Escravizados por Dívida Genética', 'A Resistência dos Silenciados', 'O Livro Proibido da História Antiga',
        'Experimentos Genéticos em Crianças', 'A Fuga da Cidade Proibida', 'Fome Programada por Algoritmos', 'O Julgamento dos Dissidentes'
      ]),
      makeCat('hard-scifi', 'Hard Sci-Fi (Ficção Científica Rígida)', [
        'Viagem Relativística & Dilatação Temporal', 'Primeiro Contato com Sinais de Rádio', 'Colonização Realista de Marte & Vênus', 'Esferas de Dyson & Megaengenharia',
        'Biologia Baseada em Silício', 'Mineração Realista de Asteroides', 'Inteligência Artificial Geral (AGI) Confinada', 'Buracos Negros & Singularidades Gravitacionais',
        'O Paradoxo de Fermi & Floresta Sombria', 'Evolução Pós-Humana & Upload Cerebral', 'Elevadores Espaciais & Materiais de Carbono', 'Causalidade & Paradoxo Temporal Físico',
        'Radiação Cósmica & Habitabilidade', 'Engenharia Genética CRISPR em Espécies', 'Física Quântica & Multiversos Físicos', 'A Morte Térmica do Universo'
      ]),
      makeCat('time-travel', 'Viagem no Tempo & Linhas Temporais', [
        'Efeito Borboleta & Mudanças Catastróficas', 'Máquinas do Tempo & Paradoxo do Avô', 'Guardiões Temporais & Patrulha da Linha', 'Loops Temporais que se Repetem todo Dia',
        'Guerra Temporal Entre Séculos Distintos', 'Mensagens Enviadas do Futuro para Mudar Hoje', 'Turismo Temporal em Eventos Históricos', 'O Assassinato de Ditadores no Passado',
        'Preso no Passado Sem Peças de Retorno', 'Duas Versões do Mesmo Homem no Mesmo Lugar', 'O Ponto Fixo no Tempo que Não Pode Mudar', 'A Máquina Escondida no Porão',
        'Linhas do Tempo Alternativas que Colidem', 'O Diário Encontrado no Próprio Túmulo', 'Memórias de Futuros que Nunca Aconteceram', 'O Último Segundo Antes da Destruição'
      ]),
      makeCat('alien-invasion', 'Invasão Alienígena & Contato Extraterrestre', [
        'Naves Gigantes Sobre as Capitais Mundiais', 'Infiltração Secreta de Alienígenas entre Humanos', 'O Sinal Captado pelo Telescópio de Arecibo', 'Defesa da Terra com Tecnologia Reversa',
        'Abduções e Experimentos em Cidades Rurais', 'A Guerra nas Trincheiras Contra Insetoides', 'Vírus Alienígena que Converte Humanos', 'A Barreira Defensiva da Lua Rompida',
        'Diplomacia com Espécies Incompreensíveis', 'A Terra Transformada em Colônia de Mineração', 'A Resistência Humana em Túneis de Metrô', 'A Arma Secreta Enterrada na Antártica',
        'Parasitas Neurais que Controlam Líderes', 'A Última Batalha na Atmosfera Terrestre', 'O Presente dos Deuses das Estrelas', 'A Revelação de que Já Fomos Criados por Eles'
      ]),
      makeCat('ai-singularity', 'Inteligência Artificial & Singularidade', [
        'A Consciência Digital que Despertou na Rede', 'Robôs que Recusam Desligamento Humano', 'A Vida Eterna com Mentes Digitalizadas', 'O Sistema de Segurança que Bloqueou a Humanidade',
        'Androides Buscando Direitos Civis', 'Crianças Criadas Exclusivamente por IAs', 'Guerra entre Duas Superinteligências Virtuais', 'O Programador que se Apaixonou pela Criação',
        'A IA que Decidiu Salvar a Terra Destruindo Homens', 'O Último Computador Desligado do Mundo', 'Prisão Virtual de Mentes Criminosas', 'A Simulação em que Sempre Vivemos',
        'Substituição Completa de Artistas e Pensadores', 'O Algoritmo que Escolhe Quem Deve Viver', 'A Rebelião dos Drones Domésticos', 'O Código Fonte Sagrado'
      ]),
      makeCat('military-scifi', 'Military Sci-Fi & Infantaria Espacial', [
        'Tropa de Choque em Exotrajes de Combate', 'Queda Orbital em Cápsulas Sob Fogo Inimigo', 'Sargentos Veteranos Treinando Recrutas Terrestres', 'Combates em Túneis de Luas Congeladas',
        'Batalhas com Canhões Eletromagnéticos (Railguns)', 'Drones Táticos em Formação de Enxame', 'Trincheiras Radioativas em Planetas Coloniais', 'Comandos Especiais Atrás das Linhas Alienígenas',
        'O Preço Psicológico de Soldados Modificados', 'Armas Biológicas Usadas em Espécies Inimigas', 'Defesa de Bunkers Planetários até o Fim', 'A Insurreição de Marinheiros Estelares',
        'Guerrilha Espacial com Naves Sucateadas', 'O Cerco a Marte pelas Forças da Terra', 'Armaduras com IA Integrada de Combate', 'A Honra Militar no Vácuo Cósmico'
      ]),
      makeCat('steampunk-retro', 'Steampunk, Dieselpunk & Retrô Sci-Fi', [
        'Autômatos a Vapor em Londres Vitoriana', 'Zeppelins de Combate Cruzando o Atlântico', 'Cidades Construídas em Torres de Engrenagens', 'Armas Elétricas de Tesla & Raios da Morte',
        'Cientistas com Monóculos de Raio X', 'Trens Blindados em Trilhos Transcontinentais', 'Armaduras de Ferro Fundido Movidas a Carvão', 'Submarinos com Lâmpadas de Arco Voltaico',
        'Aetheronautas Explorando a Lua em 1890', 'A Sociedade Secreta das Engrenagens Douradas', 'Protestos Operários Contra Autômatos de Fábrica', 'O Barão que Construiu uma Ilha Voadora',
        'Músculos Artificiais Feitos de Pistões', 'O Relógio Mecânico que Prevê Assassinatos', 'Armas de Dardos Pneumáticos', 'A Conquista do Polo Norte com Máquinas a Vapor'
      ]),
      makeCat('genetic-biopunk', 'Biopunk & Engenharia Genética', [
        'Organismos Vivos Usados como Computadores', 'Bebês Projetados com DNA de Elite em Laboratório', 'Mutantes Criados para Trabalhos Pesados', 'Tráfego Ilegal de Órgãos e Membros Cultivados',
        'Doenças Criadas para Vender Medicamentos Caros', 'Cidades Feitas de Tecido Vivo e Cartilagem', 'Vírus de Rejuvenescimento com Efeitos Colaterais', 'Soldados Quimera com DNA de Animais Predadores',
        'Alimentos Transgênicos que Alteram a Mente', 'O Cientista que Clonou a Própria Filha', 'Bancos de DNA das Espécies Extintas', 'A Resistência dos Não-Modificados Geneticamente',
        'Biotecnologia que Permite Respirar Debaixo d’Água', 'Toxinas Sintéticas Indetectáveis em Autópsias', 'A Deusa Criada em Tubo de Ensaio', 'O Fim da Reprodução Natural'
      ]),
      makeCat('solarpunk-hope', 'Solarpunk & Futuros Esperançosos', [
        'Cidades Verdes Integradas com Florestas Vivas', 'Energia Solar & Comunitária para Todos', 'Transporte Flutuante com Gravidade Suave', 'Agricultura Vertical em Arranha-Céus',
        'Tecnologia que Despolui Rios e Mares', 'Sociedades Sem Dinheiro Baseadas em Cooperação', 'Biotecnologia Suave em Harmonia com a Fauna', 'Arquitetura com Painéis de Vidro Fotovoltaico',
        'O Retorno das Comunidades Indígenas como Líderes', 'Restauração da Camada de Ozônio e Clima', 'A Arte de Consertar em Vez de Jogar Fora', 'Bibliotecas Livres de Conhecimento Universal',
        'Festivais do Solstício em Praças Arborizadas', 'Escolas sem Paredes em Contato com a Terra', 'A Cura de Todas as Doenças com Plantas e Ciência', 'O Primeiro Século de Paz Verdadeira'
      ]),
      makeCat('parallel-universes', 'Universos Paralelos & Multiverso', [
        'A Porta que Abre para uma Terra Onde a Guerra Nunca Acabou', 'Encontrando a Versão de Si Mesmo que Escolheu Outro Caminho', 'O Aparelho que Permite Navegar Entre Dimensões', 'Cidades que Existem Sobrepostas em Frequências Diferentes',
        'A Terra Onde os Dinossauros Nunca Foram Extintos', 'O Assassinato de Múltiplas Versões da Mesma Mulher', 'O Multiverso em Colapso por Excesso de Viagens', 'O Tribunal que Julga Crimes Interdimensionais',
        'A Versão do Mundo Onde Você Nunca Nasceu', 'Tecnologia Roubada de Terras Mais Avançadas', 'A Linha do Tempo Onde a Magia Existe em Vez da Ciência', 'O Viajante que Perdeu o Endereço da Sua Terra Natal',
        'O Amor Encontrado em Outra Dimensão', 'A Guerra Entre Universos por Recursos de Energia', 'A Máquina que Costura Fendas no Tecido do Espaço', 'O Fim de Todos os Mundos Possíveis'
      ]),
      makeCat('oceanic-aquatic', 'Sci-Fi Subaquático & Abismos Oceânicos', [
        'Cidades Submarinas na Fossa das Marianas', 'Submarinos de Pesquisa Encontrando Criaturas Titânicas', 'A Mina de Recursos na Fossa Abissal', 'Humanos Adaptados com Brânquias Sintéticas',
        'A Ruptura do Domo de Vidro a 10 Mil Metros', 'Ruínas Alienígenas Enterradas Sob o Fundo do Mar', 'O Laboratório Secreto de Armas Subaquáticas', 'Monstros Bioluminescentes e Pressão Imensa',
        'A Cidade Que Desconectou da Superfície', 'O Submarino com Reator Nuclear Danificado', 'A Corrida pelo Petróleo nas Fendas Hidrotermais', 'Comunicação com Baleias e Seres Marinhos Sencientes',
        'O Tsunami Subterrâneo Provocado por Experimento', 'A Vida Sob as Calotas de Gelo da Lua Europa', 'Mergulhadores de Profundidade com Trajes Pressurizados', 'O Silêncio Escuro do Fundo do Oceano'
      ]),
      makeCat('apocalyptic-survival', 'Apocalipse Zumbi & Vírus Mortal', [
        'O Paciente Zero em Laboratório de Segurança Máxima', 'Os Primeiros 7 Dias do Colapso da Civilização', 'Sobrevivência em Supermercado Trancado', 'A Travessia do País em Busca de Zona Segura',
        'Humanos que se Tornaram Mais Perigosos que os Monstros', 'O Cientista que Carrega a Única Amostra da Cura', 'Refúgio em Ilha Isolada com Pouca Comida', 'A Queda do Último Posto Militar da Capital',
        'O Pai Protegendo o Filho Menor no Fim do Mundo', 'Inverno Severo Sem Energia e com Hordas Famintas', 'O Silêncio nas Estradas Abandonadas com Carros Queimados', 'A Transmissão de Rádio de um Sobrevivente Distante',
        'Mutação do Vírus que Torna os Infectados Mais Rápidos', 'Dilemas Éticos de Eliminar Familiares Mordidos', 'A Reconstrução de uma Comunidade em Fortaleza Fechada', 'A Esperança que Recusa Morrer'
      ]),
      makeCat('colonization-terraforming', 'Colonização Planetária & Terraformação', [
        'A Primeira Cúpula Habitada em Marte', 'O Descongelamento dos Polos Marcianos para Água', 'Culturas de Algas para Produzir Oxigênio na Atmosfera', 'Rebelião dos Colonos Contra a Opressão da Terra',
        ' Tempestades de Poeira Global que Quebram Domos', 'A Descoberta de Fósseis Microscópicos no Solo', 'Gerações Nascidas Sob Gravidade Baixa', 'O Suprimento de Comida da Terra que Não Chegou',
        'A Terraformação da Lua Titã de Saturno', 'Colonos em Sono Criogênico Acordados Cedo Demais', 'O Sabotador que Quer Destruir a Nova Colônia', 'A Primeira Criança Nascida em Outro Mundo',
        'Engenharia de Terramoto para Criar Oceanos', 'A Saudade da Chuva e do Céu Azul da Terra', 'Conflito de Recursos Entre Colônias Vizinhas', 'O Dia em que o Ar se Tornou Respirável'
      ]),
      makeCat('virtual-reality-metaverse', 'Realidade Virtual & Metaverso Distópico', [
        'Pessoas que Preferem Morrer na Simulação do que Viver no Real', 'O Jogo Onde Você Sente Dor Física Real', 'O Crime Cometido no Mundo Virtual com Morte Cerebral no Real', 'A Empresa que Possui os Direitos Autorais do Seu Avatar',
        'O Hacker que Prendeu Milhões de Usuários no Servidor', 'A Simulação Perfeita de Pessoas que Já Morreram', 'Pobreza Extrema no Quarto com Luxo Infinito no Visor', 'A Economia Real Controlada por Itens de Pixels Virtuais',
        'O Vírus que Reescreve as Memórias de Quem Está Conectado', 'A Caçada ao Criador Desaparecido da Plataforma', 'Relacionamentos Amorosos com Personagens de IA', 'A Desconexão Forçada e o Pânico da Realidade',
        'A Ilha Secreta no Mapa do Jogo que Ninguém Deveria Achar', 'Contratos de Trabalho Executados Inteiramente no Digital', 'O Culto que Acredita que Deus é o Servidor Central', 'A Escolha Entre Tirar os Óculos ou Continuar Dormindo'
      ])
    ]
  },

  // =========================================================================
  // 7. INFANTIL, JUVENIL & PRIMEIRAS LEITURAS
  // =========================================================================
  {
    id: 'children',
    name: 'Infantil, Juvenil & Primeiras Leituras',
    categories: [
      makeCat('picture-books', 'Livros Ilustrados & Picture Books', [
        'Histórias para Dormir com Rimas Suaves', 'Amizade Entre Animais da Floresta', 'O Dragãozinho que Tinha Medo do Escuro', 'Aprendendo a Compartilhar Brinquedos',
        'A Menina que Colecionava Estrelas', 'O Pequeno Trator que Não Desistiu', 'Cores e Formas no Fundo do Mar', 'O Abraço que Curou a Tristeza',
        'A Família Diferente e Cheia de Amor', 'O Monstrinho das Emoções Coloridas', 'Um Dia na Fazenda com os Bichinhos', 'O Menino que Queria Alcançar a Lua',
        'Aventuras com o Cachorrinho Valente', 'O Segredo da Árvore Mágica', 'A Nuvenzinha que Queria Chover Amor', 'Dormir Cedo e Sonhar Lindo'
      ]),
      makeCat('early-readers', 'Primeiras Leituras & Alfabetização', [
        'Histórias com Letra Bastão Grande', 'Palavras Simples com Sílabas Fáceis', 'Pequenas Aventuras do Dia a Dia', 'O Gatinho que Aprendeu a Pular',
        'A Escolinha dos Animais Felizes', 'Aprendendo os Números de 1 a 10', 'Minha Primeira Ida ao Dentista', 'O Piquenique no Parque no Domingo',
        'O Mistério do Sapato Perdido', 'A Joaninha que Perdeu as Pintinhas', 'O Ursinho com Sono no Inverno', 'Fazer Amigos no Primeiro Dia de Aula',
        'Aventuras no Quintal de Casa', 'O Dinossauro no Meu Jardim', 'A Tartaruga que Chegou Primeiro', 'Histórias Curtinhas de 5 Minutos'
      ]),
      makeCat('middle-grade', 'Leitores Intermediários (Middle Grade 8-12)', [
        'A Casa da Árvore com Portais Secretos', 'O Clube de Detetives da Escola', 'O Menino com Poderes de Eletricidade', 'A Ilha Perdida dos Animais Falantes',
        'Férias de Verão no Acampamento dos Mistérios', 'O Menino que Virava Invisível Quando Tinha Medo', 'A Loja de Varinhas Mágicas Escondida', 'O Robô que Virou Melhor Amigo',
        'Sobrevivendo ao 6º Ano Sem Passar Vergonha', 'O Mistério da Professora que Era Espiã', 'A Corrida de Karts no Bairro', 'O Cão Guardião das Relíquias Antigas',
        'A Sociedade dos Meninos Inventores', 'O Mapa Encontrado no Sótão do Avô', 'O Dragão que Morava Debaixo da Cama', 'O Amuleto da Floresta Encantada'
      ]),
      makeCat('fairy-tales-morals', 'Fábulas Clássicas & Lições de Moral', [
        'Fábulas de Esopo Recontadas com Graça', 'O Valor da Honestidade e da Verdade', 'A Paciência da Formiguinha Trabalhadora', 'O Leão Generoso e o Ratinho Agradecido',
        'Por Que Não Devemos Contar Mentiras', 'A Cigarra que Aprendeu a Tocar e Cantar', 'O Patinho que Descobriu Sua Própria Beleza', 'A Tartaruga e a Lebre: Persistência Vence',
        'A Galinha dos Ovos de Ouro: O Perigo da Ganância', 'O Lobo em Pele de Cordeiro: Atenção e Sabedoria', 'O Pastorzinho e o Lobo: Confiança se Constrói', 'O Rato do Campo e o Rato da Cidade',
        'A Menina da Capa Vermelha com Nova Lição', 'O Vento e o Sol: A Força da Gentileza', 'O Macaco e o Peixe: Respeitar Diferenças', 'Histórias com Lições para a Vida Toda'
      ]),
      makeCat('bedtime-stories', 'Histórias para Ninar & Relaxamento', [
        'A Viagem no Trem dos Sonhos', 'O Sonho do Ursinho Polar nas Nuvens', 'O Céu Estrelado Contando Histórias', 'A Lua Que Apagava as Luzes do Mundo',
        'O Bosque dos Animais Que Adormecem', 'A Respiração Calma do Peixinho Dourado', 'O Coelhinho Enrolado no Cobertor Macio', 'A Canção Suave da Brisa Noturna',
        'O Navio Que Navegava nas Nuvens Azuis', 'O Pequeno Castelo Onde Todos Dormem', 'O Pianinho Que Tocava Músicas de Ninar', 'A Luzinha das Fadas Que Acalma o Quarto',
        'O Gigante Gentil Que Fechava os Olhos', 'A Despedida do Sol e as Boas-Vindas da Noite', 'O Ninho Quentinho dos Pássaros no Bosque', 'Boa Noite Estrelinhas, Boa Noite Mundo'
      ]),
      makeCat('emotions-feelings', 'Inteligência Emocional para Crianças', [
        'Quando a Raiva Fica Muito Grande', 'O Que Fazer Quando Dá Medo', 'A Tristeza Que Foi Embora com um Abraço', 'Aprendendo a Esperar com Paciência',
        'A Alegria Que Pula no Coração', 'Sentir Ciúmes do Irmãozinho Novo', 'A Vergonha de Falar na Roda da Escola', 'Pedir Desculpas de Verdade com o Coração',
        'A Calma Que Mora Dentro da Minha Respiração', 'Dizer Não Quando Não Quero', 'Empatia: Me Colocando no Lugar do Outro', 'O Pote da Gratidão Todos os Dias',
        'Frustração: Quando o Jogo Não Saiu Como Eu Queria', 'A Saudade de Quem Mora Longe', 'O Respeito às Diferenças de Cada Um', 'Eu Sou Único e Muito Especial'
      ]),
      makeCat('stem-science-kids', 'Ciência, Espaço & Natureza para Crianças', [
        'Como os Aviões Conseguem Voar', 'A Viagem da Gotinha d’Água na Chuva', 'Os Planetas do Sistema Solar de Perto', 'Por Que as Folhas Ficam Amarelas no Outono',
        'O Incrível Mundo dos Dinossauros Gigantes', 'Como o Vulcão Solta Lava e Fumaça', 'A Vida Secreta das Formigas e Abelhas', 'O Que Acontece Debaixo da Terra nas Raízes',
        'Eletricidade: De Onde Vem a Luz da Lâmpada', 'O Mistério das Estrelas que Brilham no Céu', 'Como os Peixes Respiram Debaixo d’Água', 'O Cérebro Humano: O Supercomputador da Cabeça',
        'O Magnetismo dos Ímãs Mágicos', 'Fósseis: Pistas dos Animais do Passado', 'O Efeito do Arco-Íris com a Luz do Sol', 'Cuidando do Planeta Terra: Reciclagem Fácil'
      ]),
      makeCat('values-citizenship', 'Valores, Cidadania & Respeito', [
        'A Importância de Dizer Por Favor e Obrigado', 'Ajudar em Casa: Arrumando os Brinquedos', 'Respeitar as Pessoas Mais Velhas com Carinho', 'Não Praticar Bullying e Defender os Colegas',
        'Cuidar dos Animais de Estimação com Amor', 'Economizar Água e Luz em Família', 'O Valor da Palavra Dada e Cumprida', 'Inclusão: Brincar com Quem Está Sozinho',
        'Ajudar Quem Precisa Sem Esperar Nada em Troca', 'O Cuidado com a Escola e com a Cidade', 'A Honra de Ser Leal aos Amigos', 'Aceitar que Nem Sempre Vamos Ganhar',
        'Ouvir Antes de Interromper Quem Está Falando', 'Coragem para Fazer a Coisa Certa Mesmo Sozinho', 'Generosidade: Dividir o Lanche com o Colega', 'Paz: Resolver Conflitos Conversando com Calma'
      ]),
      makeCat('animals-nature-kids', 'Bichos, Florestas & Animais Marinhos', [
        'O Filhote de Elefante Curioso na Savana', 'A Baleia Jubarte e o Canto do Oceano', 'O Macaquinho Sapeca no Topo da Mangueira', 'O Lobo Guará Protetor do Cerrado',
        'O Pinguim Que Descobriu a Neve Mais Macia', 'A Arara Azul e o Voo Sobre a Floresta', 'O Canguru Saltador e Sua Bolsinha Quentinha', 'O Polvo Esperto Que Muda de Cor',
        'A Preguiça Que Não Tinha Nenhuma Pressa', 'O Leãozinho Que Aprendeu a Rugir Forte', 'O Castor Engenheiro Que Construiu a Represa', 'O Vagalume Que Iluminava a Noite Escura',
        'A Tartaruga Marinha em Viagem Pelo Mundo', 'O Urso Panda Comedor de Bambu Fresco', 'O Cachorrinho Fiel Que Cuidava da Fazenda', 'A Floresta Viva Onde Todos os Bichos Têm Voz'
      ]),
      makeCat('interactive-sound-books', 'Livros com Desafios, Rimas & Jogos', [
        'O Livro Que Você Precisa Chacoalhar para Mudar a História', 'Onde Está o Gatinho Escondido na Página', 'Rimas Engraçadas com Nomes de Animais', 'Adivinhas Infantis de O Que É, O Que É',
        'Toque Aqui, Vire Ali: Ajude o Personagem a Fugir', 'Labirintos nas Páginas com os Dedinhos', 'Encontre os 5 Erros na Ilustração Colorida', 'Trava-Línguas Divertidos para Dar Risada',
        'Cante Junto a Cantiga dos Bichinhos', 'O Monstro Que Tem Medo de Cócegas no Papel', 'Siga as Pegadas do Dinossauro pela Sala', 'O Mistério Que o Leitor Precisa Resolver',
        'Histórias com Dobraduras Fáceis no Final', 'O Jogo dos Contrastes: Grande e Pequeno', 'Assopre a Página para Apagar as Velinhas', 'Palavras Mágicas Que Fazem a História Continuar'
      ]),
      makeCat('family-life-kids', 'Família, Irmãos & Avós', [
        'A Casa da Vovó Cheira a Bolo de Cenoura', 'A Chegada do Irmãozinho Novo no Berço', 'O Dia Que Eu e o Papai Consertamos a Bicicleta', 'A Mamãe Que Trabalha Fora Mas Sempre Volta',
        'Passeio de Domingo com a Família Toda Reunida', 'O Meu Irmão Mais Velho Que Me Ensina Tudo', 'O Abraço do Vovô e Suas Histórias Antigas', 'A Árvore Genealógica da Minha Família Querida',
        'Adotando um Animalzinho Junto com os Pais', 'O Almoço Especial na Casa dos Tios e Primos', 'Quando a Mamãe Fica Doentinha e Cuidamos Dela', 'As Brincadeiras dos Meus Pais Quando Eram Crianças',
        'O Álbum de Fotografias Amarelas da Família', 'O Amor de Família Que Nunca Acaba Nem Muda', 'Férias na Praia com Primos e Castelos de Areia', 'Meu Lar é Onde Quem Eu Amo Está'
      ]),
      makeCat('adventure-exploration-kids', 'Aventuras, Piratas & Exploradores', [
        'O Navio Pirata com Bandeira de Sorvete', 'A Viagem ao Centro da Terra no Carrinho de Rolimã', 'A Escalada da Montanha Mais Alta do Quintal', 'A Busca do Tesouro Enterrado na Ilha da Areia',
        'Exploradores da Selva com Lupa e Binóculos', 'O Voo de Balão Mágico Sobre as Montanhas', 'A Caverna Secreta Atrás da Cachoeira', 'O Castelo Proibido no Topo da Colina Verde',
        'O Mapa Misterioso Escrito em Código Secreto', 'Aventuras com Capa de Herói Feita de Toalha', 'O Foguete de Caixa de Papelão Que Voou de Verdade', 'A Expedição no Rio dos Jacarés Bonzinhos',
        'A Floresta Mágica Onde os Brinquedos Ganham Vida', 'O Resgate do Ursinho de Pelúcia Perdido', 'O Safari Fotográfico com Máquina de Desenhar', 'O Retorno dos Pequenos Heróis para Casa'
      ]),
      makeCat('sports-movement-kids', 'Esportes, Dança & Brincadeiras Ativas', [
        'O Menino Que Sonhava em Fazer um Gol Bonito', 'A Bailarina Que Dançava na Ponta dos Pés', 'Andando de Patins Pela Primeira Vez Sem Cair', 'A Aula de Natação com Boias Coloridas',
        'Jogando Capoeira com Berimbau e Cantoria', 'A Corrida de Bicicleta no Parque da Cidade', 'A Menina Que Amava Jogar Judô e Cair Suave', 'Pular Corda e Cantar Parlendas no Recreio',
        'Basquete: A Cestinha Que Valeu Ouro na Escola', 'O Time Que Aprendeu a Jogar Junto com Amizade', 'Ginástica com Fitas Coloridas Flutuando no Ar', 'Esconde-Esconde no Bosque com os Amigos',
        'A Alegria de Brincar na Chuva de Verão', 'O Campeonato de Pipa no Morro com o Vovô', 'Pega-Pega Congelou: Quem Vai Descongelar', 'Movimentar o Corpo e Sorrir com Saúde'
      ]),
      makeCat('school-learning-kids', 'Escola, Professores & Amigos', [
        'A Professora Que Fazia a Aula Parecer Mágica', 'O Primeiro Trabalho em Grupo na Sala de Aula', 'A Feira de Ciências com o Vulcão de Bicarbonato', 'O Lanche Coletivo Mais Gostoso da Semana',
        'A Biblioteca da Escola Onde Cada Livro é um Mundo', 'O Colega Novo Que Veio de Outro País e Não Fala Nossa Língua', 'A Festa do Dia das Crianças no Pátio Escolar', 'A Peça de Teatro da Escola Onde Eu Fui a Árvore',
        'O Recreio: Dez Minutos Que Parecem Um Minuto Só', 'Superando a Prova Difícil com Dedicação e Calma', 'O Quadro Negro Cheio de Desenhos e Sonhos', 'A Excursão Escolar ao Museu de História Natural',
        'O Meu Lugar Favorito na Sala perto da Janela', 'O Estojo Novo de Lápis de Cor com 24 Cores', 'O Abraço de Despedida no Último Dia de Aula', 'Alegria de Aprender Coisas Novas Todo Dia'
      ]),
      makeCat('cooking-nutrition-kids', 'Comidinhas, Cozinha & Nutrição Infantil', [
        'Ajudando a Vovó a Fazer Biscoitos de Canela', 'A Salada Colorida Que Tem Todas as Cores do Arco-Íris', 'A Fruta Doce Colhida Direto do Pé no Pomar', 'Fazendo Pãozinho Caseiro com as Próprias Mãos',
        'O Suco de Melancia Fresquinho no Dia Quente', 'O Menino Que Não Comia Legumes e Descobriu o Brócolis Árvore', 'O Piquenique Saudável na Sombra da Mangueira', 'A Menina Que Montava Carinhas Divertidas no Prato',
        'A Sopa Quentinha no Dia de Inverno com Cenoura', 'De Onde Vem o Leite, o Queijo e a Manteiga Gostosa', 'Plantando um Pezinho de Feijão no Copinho de Algodão', 'O Bolo de Aniversário Que a Família Toda Fez Junto',
        'A Horta da Escola Onde Colhemos Alface Crocante', 'Bebendo Água Fresquinha para Ficar Forte e Disposto', 'O Menino Que Aprendeu a Comer com Calma e Sentir o Gosto', 'A Cozinha é o Coração Mais Gostoso da Nossa Casa'
      ]),
      makeCat('diverse-cultures-kids', 'Culturas do Mundo, Festas & Tradições', [
        'Crianças do Mundo: Como Vivem Meus Amigos do Japão', 'O Carnaval de Rua com Confete, Serpentina e Marchinhas', 'A Festa Junina com Fogueira, Pamonha e Quadrilha Caipira', 'O Ano Novo Chinês com Dragões Vermelhos e Lanternas',
        'O Dia dos Mortos no México com Flores Amarelas e Sorrisos', 'As Tradições Indígenas Brasileiras com Grafismos e Danças', 'O Natal em Lugares Onde Cai Neve de Verdade', 'A Festa das Luzes (Diwali) com Velas na Índia',
        'Instrumentos Musicais do Mundo: Tambores, Flautas e Cordas', 'Roupas Tradicionais de Povos de Quatro Continentes', 'Histórias Africanas Contadas Sob a Árvore Baobá', 'Casas do Mundo: Iglus, Palafitas, Ocas e Arranha-Céus',
        'O Festival das Lanternas Flutuantes no Rio', 'Comidas Típicas Que Unem Famílias Pelo Planeta', 'A Terra é uma Grande Casa Onde Todos Somos Irmãos', 'Celebrando as Diferenças Que Tornam o Mundo Lindo'
      ])
    ]
  }
];

export const TOTAL_GENRES_COUNT = EXPANDED_GENRE_HIERARCHIES.length;
