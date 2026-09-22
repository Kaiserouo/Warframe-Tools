> ref. src\data\inventory\parse_inventory.py, get_inventory()

# Types

## Dates
For dates (e.g., in `inventory['Created']`), it is in Unix timestamp. Use any unix timestamp converter to your liking :
```json
{"$date":{"$numberLong":"1716994060234"}}
```

## Oid
For things like upgraded mods, loadouts, etc, there needs to be some sort of ID or pointer system in place.

For example, for an upgraded Pressure Point mod, there would be an oid attached to its entry:

```json
// a random entry in inventory['Upgrades']
{
    "UpgradeFingerprint": "{\"lvl\":5}",
    "ItemType": "/Lotus/Upgrades/Mods/Melee/WeaponMeleeDamageMod",
    "ItemId": {
        "$oid": "66587400533fb1bd260377a2"
    }
}
```

This will be used in e.g., `inventory['Melee']`'s configs. 

# General Information

- `Created`: Account creation date.
- `RewardSeed`: Not sure. browse.wf seems to use it for some prediction?
- `DuviriInfo`: Duviri randomness stuff.
- `GiftsRemaining`: Remaining gift count for the day.
- `TradesRemaining`: s/a
- `Mailbox`: There's only one `LastInboxId`, and the `$oid` doesn't exist in the inventory file. Maybe it lies in somewhere else?
- `SeasonChallengeHistory`: Nightwave mission. Only writes challenge uname and id, not sure the real meaning of them.
- `StoryModeChoice`: A string, for me it's `"WARFRAME"`. Most possibly what the user choose how to start the game at the beginning.
- `PlayedParkourTutorial`: Boolean. Not sure.
- `QuestKeys`: Stuff about quests. Seems to use some sort of key item (`Key`, `KeyChain`) to represent what mission, and with it the records of completion status, completion dates, etc. Some other data exists within that I don't the meaning of.
- `ReceivedStartingGear`: Boolean. Not sure.
- `ChallengeProgress`: Progres, including the achievements in the profile page, honoria (`Title`), incarnon `<weaponName>Challenge<alphabet>`, POM-2 calendar missions (`Calendar*`), nightwave missions (`Season[Weekly]*`)
- `LastRegionPlayed`: String. Possibly to zoom in to the planet when entering Navigation's star chart.
- `Missions`: Seems to be the completion count of a star chart mission? And some sort of `Tier` tag, may be 0 for normal and 1 for steel path?
- `XPInfo`: For all warframe and weapon's affinity gained. Viewable in profile page.
- `Affiliations`: Syndicate related. Level and standings.
- `CompletedJobs`: Bounty related stuff?
- `LoreFragmentScans`: Scans for items. Should be viewable in the codex.
- `Boosters`: The booster currently have and when it will expire.
- `DiscoveredMarkers`: Not sure. Most possibly to record which caves in open maps have the player visited or not. Represented with an integer, possibly bitmap.
- `PlayerLevel`: Current mastery rank. 
- `DeathMarks`: Current death marks. Note that there's different stalker death marks for each boss.
- `EmailItems`: Not sure. Might be inbox but it only records types and count, and not the time received?
- `LoginMilestoneRewards`: One-time milestone reward chosen before
- `GuildId`: Clan ID
- `ActiveDojoColorResearch`: The color thing the guild is currently researching
- `Drones`: Extractor related
- `FocusXP`: Focus point for operator school
- `ActiveAvatarImageType`: Current glyph
- `PlayerSkills`: Intrinsics
- `OneTimePurchases`: All sorts of one-time purchases, e.g., Aoi songs, Prex card, scene, etc.
- `Wishlist`: Market wishlist
- `TitleType`: Currently used honoria
- `EvolutionProgress`: incarnon progress, recorded based on item type, i.e., you don't need to run incarnon upgrades for every same items you have (e.g., burston & burston prime)
- `BlessingCooldown`: For true master's font.


# Warframe Website Information
- `SubscribedToEmails`: Some sort of subscribe thing on the website?
- `SubscribedToEmailsPersonalized`: s/a
- `WebFlags`: All sorts of website related stuff, e.g., have you got the orion / sirius glyphs? when is the last time you enter a page? etc.

# Inventory

## General
- `Consumables`: Consumables. Has `ItemCount: int` and `ItemType: uname`
- `FlavourItems`: Should be stuff about cosmetic / skins (`Skins`, landing craft, etc) / animation set / emote (`Emotes`) / glyph (`AvatarImages`) / color palette / honoria (`Titles`) / games from cephalon simaris (`Arcade`).  Since there's no count information in here, I suppose anything that can only be obtained once / each player can only have one would be here
- `RawUpgrades`: Unupgraded mod
- `Upgrades`: Upgraded mod
- `WeaponSkins`: warframe skin, mainly skins and helmets, maybe also everything else that can be installed on a warframe? And also weapon skins.
- `MiscItems`: Normal resources, e.g., rubedo, orokin cell, etc. Also other stuff that you can see in your in-game inventory page. Note that blueprints AREN'T in here, they're in `Recipes` instead
- `Recipes`: Blueprints
- `PendingRecipes`: Foundry stuff
- `ShipDecorations`: Decoration in the operation base
- `LevelKeys`: Should have anything that is needed to open a mission (e.g., grendel, dagath, infested alad v)
- `FusionTreasures`: ayatan sculpture
- `InfestedFoundry`: helminth
- `KubrowPetPrints`: individual imprint data

## Currency
- `FusionPoints`: endo
- `RegularCredits`: credit / hollar
- `PremiumCreditsFree`: free platinum
- `PremiumCredits`: platinum (paid?)
- `PrimeTokens`: regal aya

## Loadouts

### Frame / Wings
- `Ships`: landing craft
- `Suits`: warframe
- `SpaceSuits`: archwing
- `MechSuits`: necramech
- `Sentinels`: companion (sentient / robot related, e.g., carrier)
- `KubrowPets`: companion (dog related, e.g., kubrow)
- `MoaPets`: companion (moa related)
- `Hoverboards`: K drive
- `AdultOperatorLoadOuts`: drifter skin and arcanes
- `KahlLoadOuts`: kahl skin
- `OperatorLoadOuts`: operator skin and arcanes
- `OperatorSuits`: operator skin... I mean real skins, instead of outfit
- `Horses`: horse / kaithe skin
- `FocusAbility`: string, should be current chosen school?
- `FocusUpgrades`: school upgrades

### Weapons (general attack weapon)

- `LongGuns`: primary
- `Melee`: melee
- `Pistols`: secondary
- `SpecialItems`: exalted weapon, including necramech / companion weapons that can't be unequipped (claws, etc) / Yareli merilina / Orion
- `SpaceGuns`: archgun
- `SpaceMelee`: archmelee
- `SentinelWeapons`: companion weapons (note that companion weapons that can't be unequipped would `SpecialItems`)
- `Antiques`: tektolyst artifact mod and skin
- `OperatorAmps`: Amp related

### Railjack
- `CrewShipHarnesses`: railjack mods?
- `CrewShips`: railjack stuff (weapon, crew members, skin)
- `CrewMembers`: crew members
- `CrewShipRawSalvage`: salvage you haven't touched / opened yet (weapon and non-weapon)
- `CrewShipSalvagedWeaponSkins`: opened non-weapon  (shield array, engine, hull, reactor)
- `CrewShipSalvagedWeapons`: opened weapon
- `CrewShipWeaponSkins`: currently possessed non-weapon (shield array, engine, hull, reactor)
- `CrewShipWeapons`: currently possessed weapon

### Other
- `DataKnives`: Parazon
- `Scoops`: lunaro
- `LoadOutPresets`: loadout stuff?
- `SpectreLoadouts`: spectre
- `EquippedGear`: all equipped gear's uname
- `DrifterMelee`: drifter melee skin?
- `CurrentLoadOutIds`: Not sure. There're 11 ids, should be the loadouts currently using. The ids seems to be in `LoadoutPresets`.
- `PersonalTechProjects`: How much materials have you already given in railjack component crafting

## Bin / Slots
Should be (some) integer(s)
- `CrewMemberBin`: crew member
- `CrewShipSalvageBin`: railjack related 
- `MechBin`: necramech
- `OperatorAmpBin`: amp 
- `PveBonusLoadoutBin`: loadout 
- `PvpBonusLoadoutBin`: loadout
- `RandomModBin`: riven
- `SentinelBin`: companion (all companions)
- `SpaceSuitBin`: archwing
- `SpaceWeaponBin`: archgun + archmelee?
- `SuitBin`: warframe
- `WeaponBin`: primary / secondary / melee

# Daily Standing
- `SupportedSyndicate`: Currently chosen syndicate (6 main ones)
- `DailyAffiliation`: Syndicate standing (6 main ones). The value would be how much you have NOT gained. (e.g., 34000 means you can still get 34000 more standing)
- `DailyAffiliationCavia`: cavia
- `DailyAffiliationCetus`: cetus
- `DailyAffiliationEntrati`: necralisk
- `DailyAffiliationKahl`: kahl's garrison?
- `DailyAffiliationLibrary`: cephalon simaris
- `DailyAffiliationNecraloid`: necraloid
- `DailyAffiliationPvp`: conclaive
- `DailyAffiliationQuills`: cetus quill
- `DailyAffiliationSolaris`: solaris united
- `DailyAffiliationVentkids`: ventkids
- `DailyAffiliationVox`: vox solaris
- `DailyAffiliationZariman`: holdfast
- `DailyAffiliationHex`: hex
- `DailyFocus`: focus point for operator

# Archimedea
- `EntratiLabConquestActiveFrameVariants`: personal modifiers
- `EntratiLabConquestHardModeStatus`: bool, whether EDA is selected
- `EntratiVaultCountResetDate`: not sure, weekly renewal time?
- `EntratiLabConquestUnlocked`: bool, whether EDA is unlocked
- `EntratiVaultCountLastPeriod`: not sure, for me it's a number `5`
- `EntratiLabConquestCacheScoreMission`: the scores already gotten this week (for the progress bar below)

- `EchoesHexConquestActiveFrameVariants`: s/a
- `EchoesHexConquestActiveStickers`: uname for the mission stickers
- `EchoesHexConquestHardModeStatus`: s/a
- `EchoesHexConquestUnlocked`: s/a
- `EchoesHexConquestCacheScoreMission`: s/a
- `EchoesHexConquestBonusTokensGiven`: not sure, list[int] length 3

# KIM System
- `DialogueHistory`: all dialogue records, flags etc
- `RetroDisableKissInboxMessage`: kim settings
- `RetroFastTyping`: s/a
- `RetroPlayAllConvos`: s/a
- `RetroWallpaperId`: s/a

# Unknown / Unimportant
(if i didn't write anything it's either not sure / literally obvious / not really obvious but it's just so useless i don't even wanna write a description for it)
- `ChallengesFixVersion`: 
- `TauntHistory`: 
- `TrainingDate`: 
- `SentientSpawnChanceBoosters`: 
- `ArchwingEnabled`: archwing related
- `Alignment`: 
- `CompletedSyndicates`: 
- `FactionScores`: 
- `PeriodicMissionCompletions`: 
- `HWIDProtectEnabled`: 
- `PendingTrades`: 
- `Settings`: 
- `CompletedSorties`: 
- `LastSortieReward`: 
- `CrewShipAmmo`
- `LotusCustomization`: 
- `UseAdultOperatorLoadout`: using operator or drifter
- `RecentVendorPurchases`: 
- `PersonalGoalProgress`: 
- `CompletedAlerts`: 
- `EndlessXP`: circuit rewards
- `BountyScore`: 
- `LastLiteSortieReward`: archon hunt
- `SortieRewardAttenuation`: 
- `SongChallenges`: duviri music game
- `HubNpcCustomizations`: 
- `CompletedJobChains`: 
- `NemesisHistory`: Kuva / tenet / coda
- `EquippedEmotes`: 
- `Motorcycles`: 
- `CustomMarkers`: loc-pin
- `OperatorCustomizationSlotPurchases`: 
- `SpecialItemRewardAttenuation`: baro void cache reward attenuation
- `CalendarProgress`: calendar
- `NokkoColony`: mushrooms
- `DescentRewards`: descendia
- `FocusLoadouts`: focus related but not sure
- `LastNemesisAllySpawnTime`: 
- `QualifyingInvasions`: 
- `WeeklyGuildVaultBonusInfo`: 
- `NemesisAbandonedRewards`: 
- `Sketches`: follie
- `AlignmentReplay`: 
- `NewItems`: 
- `MiscAccountData`: seems interesting but actually not, for now it records some sort of tennocon related stuff
- `LastInventorySync`: an oid
- `NextRefill`: not sure, weekly or daily reset?
- `ClaimedJunctionChallengeRewards`: junction
- `HasOwnedVoidProjectionsPreviously`: unsure, for me it's true
- `CollectibleSeries`: not sure, maybe kuria and the entries from the entrati books bosses？
- `LibraryAvailableDailyTaskInfo`: simaris daily
- `HasResetAccount`: unsure, false
- `PendingCoupon`: 
- `Harvestable`: 
- `NodeIntrosCompleted`: maybe records whether you've watched any cutscene? unsure
- `DeathSquadable'`: 