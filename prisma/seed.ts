import { fallbackShelterSettings, resolveShelterSettings } from "@/app/lib/utils/shelter-settings";
import fs from "node:fs";
import path from "node:path";
import { betterAuth } from "better-auth";
import { authOptions } from "@/auth.options";
import { PrismaClient } from "@/prisma/generated/client";
import { Prisma } from "@/prisma/generated/client";
import {
  Role,
  Sex,
  AnimalSize,
  PartnerType,
  AnimalListingStatus,
  IntakeType,
  AnimalHealthStatus,
  NoteCategory,
  TaskCategory,
  TaskPriority,
  TaskStatus,
  AnimalActivityType,
  NoteEventAction,
  NoteTargetType,
  AiActionTargetType,
  CharacteristicCategory,
  OutcomeType,
  LocationType,
  ApplicationSource,
  ApplicationStatus,
  LivingSituation,
  FosterStatus,
  FosterPlacementType,
  FosterReturnReason,
  AssessmentSignal,
} from "@/prisma/generated/enums";
import {
  getRandomDate,
  getRandomItem,
  generateOrderedTimeline,
  randomInt,
} from "@/app/lib/utils/seeding-utils";
import { computeStays, findTimelineBreaks } from "@/app/lib/utils/stay-utils";
import {
  calendarDay,
  shelterDayKey,
  shelterDaysBetweenKeys,
  shelterToday,
  shiftDayKey,
  startOfShelterDay,
  type CalendarDay,
} from "@/app/lib/utils/shelter-day";
import { recordNoteMutation } from "@/app/lib/services/note-audit";
import { formatSingleEnumOption } from "@/app/lib/utils/enum-formatter";
import { LATEST_ENTRY_ORDER } from "@/app/lib/utils/vitals-order";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolveDatabaseUrl } from "@/app/lib/db-url";
import { phoneNormalizationExtension } from "@/app/lib/prisma-extensions/phone-normalization";
import { emailNormalizationExtension } from "@/app/lib/prisma-extensions/email-normalization";
import {
  syncTemplateRegistry,
  type TemplateRegistryStore,
} from "@/app/lib/assessments/sync-templates";
import { getActiveTemplate } from "@/app/lib/assessments/templates";
import { formatDateToLongString } from "@/app/lib/utils/date-utils";
































const mulberry32 = (seed: number) => {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};




const installDeterministicRandom = (): (() => void) => {
  const raw = process.env.SEED_RANDOM_SEED;
  const seed = Number(raw ?? 20260101);

  if (!Number.isFinite(seed)) {
    throw new Error(`SEED_RANDOM_SEED must be a number (got "${raw}").`);
  }

  const original = Math.random;
  Math.random = mulberry32(seed);

  return () => {
    Math.random = original;
  };
};

const adapter = new PrismaPg({ connectionString: resolveDatabaseUrl("direct") });
const rawPrisma = new PrismaClient({ adapter });
const readCountry = async () => resolveShelterSettings(
  await rawPrisma.shelterSettings.findUnique({ where: { id: "shelter" } }),
).defaultPhoneCountry;
const prisma = rawPrisma
  .$extends(phoneNormalizationExtension(readCountry))
  .$extends(emailNormalizationExtension);









const seedAuth = betterAuth({
  ...authOptions(prisma, { trustProvidedEmails: true }),
  emailAndPassword: { enabled: true, disableSignUp: false, autoSignIn: false },
});









const baseUrl = "/seed-images";

const personData = [
  {
    name: "External Agency",
    email: "agency@example.com",
  },
  {
    name: "Admin User",
    email: "admin@example.com",
    role: Role.ADMIN,
  },
  {
    name: "Olivia Chen",
    email: "staff1@example.com",
    role: Role.STAFF,
  },
  {
    name: "Benjamin Carter",
    email: "staff2@example.com",
    role: Role.STAFF,
  },
  {
    name: "Sam Rivera",
    email: "volunteer1@example.com",
    role: Role.VOLUNTEER,
  },
  {
    name: "Jane Doe",
    email: "surrenderer1@example.com",
    role: Role.USER,
    phone: "212-555-0199",
    address: "482 Lexington Ave",
    city: "New York",
    state: "NY",
    zipCode: "10017",
  },
  {
    name: "John Smith",
    email: "finder1@example.com",
    role: Role.USER,
    phone: "718-555-0142",
    address: "77 Court St",
    city: "Brooklyn",
    state: "NY",
    zipCode: "11201",
  },
  {
    name: "Alex Duplicate",
    email: "alex.duplicate@example.com",
    phone: "(212) 555-0188",
    address: "100 Broadway",
    city: "New York",
    state: "NY",
    zipCode: "10005",
  },
  {
    name: "Sam Duplicate",
    email: "sam.duplicate@example.com",
    phone: "212.555.0188",
    address: "200 Broadway",
    city: "New York",
    state: "NY",
    zipCode: "10005",
  },
  {
    name: "Unparseable Phone Contact",
    email: "unparseable.phone@example.com",
    phone: "call the front desk",
    address: "300 Madison Ave",
    city: "New York",
    state: "NY",
    zipCode: "10017",
  },
  {
    
    
    
    
    
    
    
    
    
    name: "Pat Mislinked",
    email: "pat.mislinked@example.com",
    role: Role.USER,
    phone: "212-555-0166",
    address: "12 Carmine St",
    city: "New York",
    state: "NY",
    zipCode: "10014",
  },
  {
    
    
    
    
    
    name: "Casey Deactivated",
    email: "casey.deactivated@example.com",
    role: Role.USER,
    deactivatedAt: new Date(),
    phone: "212-555-0133",
    address: "58 Bleecker St",
    city: "New York",
    state: "NY",
    zipCode: "10012",
  },
  {
    
    
    
    
    
    name: "WalkIn TestUser",
    email: "walkin.testuser@example.com",
    phone: "212-555-0177",
    address: "410 Amsterdam Ave",
    city: "New York",
    state: "NY",
    zipCode: "10024",
  },
];













const NON_APPLICANT_PERSON_NAMES = new Set([
  "Alex Duplicate",
  "Sam Duplicate",
  "Unparseable Phone Contact",
  "WalkIn TestUser",
]);































const FIXTURE_APPLICANT_PERSON_NAMES = new Set([
  "Jane Doe",
  "John Smith",
  "Pat Mislinked",
  "Casey Deactivated",
]);

const allColors = {
  BLACK: { name: "Black" },
  WHITE: { name: "White" },
  BROWN: { name: "Brown" },
  GOLDEN: { name: "Golden" },
  GRAY: { name: "Gray" },
  BRINDLE: { name: "Brindle" },
  TABBY: { name: "Tabby" },
  TRICOLOR: { name: "Tricolor" },
  ORANGE: { name: "Orange" },
  GREEN: { name: "Green" },
};

const allSpecies = {
  DOG: {
    name: "Dog",
    breeds: {
      GOLDEN_RETRIEVER: { name: "Golden Retriever", typicalSize: AnimalSize.LARGE },
      AMERICAN_ESKIMO: { name: "American Eskimo Dog", typicalSize: AnimalSize.SMALL },
      AIREDALE_TERRIER: { name: "Airedale Terrier", typicalSize: AnimalSize.MEDIUM },
      
      MIXED_BREED: { name: "Mixed Breed", typicalSize: null },
      LABRADOR: { name: "Labrador", typicalSize: AnimalSize.LARGE },
    },
  },
  CAT: {
    name: "Cat",
    breeds: {
      SIAMESE: { name: "Siamese", typicalSize: AnimalSize.SMALL },
      BRITISH_SHORTHAIR: { name: "British Shorthair", typicalSize: AnimalSize.MEDIUM },
      DOMESTIC_SHORTHAIR: { name: "Domestic Shorthair", typicalSize: AnimalSize.MEDIUM },
      TABBY: { name: "Tabby", typicalSize: AnimalSize.SMALL },
    },
  },
  BIRD: {
    name: "Bird",
    breeds: {
      HOUSE_FINCH: { name: "House Finch", typicalSize: AnimalSize.SMALL },
      NORTHERN_CARDINAL: { name: "Northern Cardinal", typicalSize: AnimalSize.SMALL },
      PARAKEET: { name: "Parakeet", typicalSize: AnimalSize.SMALL },
    },
  },
  RABBIT: {
    name: "Rabbit",
    breeds: {
      NETHERLAND_DWARF: { name: "Netherland Dwarf", typicalSize: AnimalSize.SMALL },
      LIONHEAD: { name: "Lionhead", typicalSize: AnimalSize.SMALL },
    },
  },
  REPTILE: {
    name: "Reptile",
    breeds: {
      IGUANA: { name: "Iguana", typicalSize: AnimalSize.LARGE },
      GREEN_SEA_TURTLE: { name: "Green Sea Turtle", typicalSize: AnimalSize.LARGE },
      BEARDED_DRAGON: { name: "Bearded Dragon", typicalSize: AnimalSize.MEDIUM },
    },
  },
  OTHER: {
    name: "Other",
    breeds: {
      GUINEA_PIG: { name: "Guinea Pig", typicalSize: AnimalSize.SMALL },
      HAMSTER: { name: "Hamster", typicalSize: AnimalSize.SMALL },
    },
  },
};

const allCharacteristics = {
  GOOD_WITH_KIDS: {
    name: "Good with Kids",
    category: CharacteristicCategory.ENVIRONMENT,
  },
  HOUSEBROKEN: {
    name: "Housebroken",
    category: CharacteristicCategory.ENVIRONMENT,
  },
  GOOD_WITH_DOGS: {
    name: "Good with other dogs",
    category: CharacteristicCategory.BEHAVIOR,
  },
  GOOD_WITH_CATS: {
    name: "Good with cats",
    category: CharacteristicCategory.BEHAVIOR,
  },
  NEEDS_QUIET_HOME: {
    name: "Needs a quiet home",
    category: CharacteristicCategory.ENVIRONMENT,
  },
  LEASH_REACTIVE: {
    name: "On-Leash Reactivity",
    category: CharacteristicCategory.BEHAVIOR,
  },
  DEAF: { name: "Deaf", category: CharacteristicCategory.MEDICAL },
  HEARTWORM_POSITIVE: {
    name: "Heartworm Positive",
    category: CharacteristicCategory.MEDICAL,
  },
  FEE_WAIVED: {
    name: "Adoption Fee Waived",
    category: CharacteristicCategory.ADMINISTRATIVE,
  },
};

const partnerData: Prisma.PartnerCreateManyInput[] = [
  {
    name: "City Animal Control",
    type: PartnerType.GOVERNMENT_AGENCY,
    email: "contact@cityanimalcontrol.gov",
    phone: "555-0101",
    website: "https://cityanimalcontrol.gov",
    address: "123 Public Works Rd",
    city: "New York",
    state: "NY",
    zipCode: "10001",
  },
  {
    name: "Second Chance Rescue",
    type: PartnerType.RESCUE_GROUP,
    email: "sarah@secondchancerescue.org",
    phone: "555-0102",
    website: "https://secondchancerescue.org",
    address: "456 Rescue Ave",
    city: "New York",
    state: "NY",
    zipCode: "10002",
  },
  {
    name: "Downtown Veterinary Clinic",
    type: PartnerType.VET_CLINIC,
    email: "reception@downtownvet.com",
    phone: "555-0103",
    website: "https://downtownvet.com",
    address: "789 Health St",
    city: "New York",
    state: "NY",
    zipCode: "10003",
  },
];



const allLocations = {
  DOG_BLOCK_A: {
    name: "Dog block A",
    type: LocationType.KENNEL,
    units: {
      A1: { name: "A-1", capacity: 1 },
      A2: { name: "A-2", capacity: 1 },
      A3: { name: "A-3", capacity: 2 },
      A4: { name: "A-4", capacity: 2 },
    },
  },
  ISOLATION: {
    name: "Isolation",
    type: LocationType.ISOLATION,
    units: {
      ISO1: { name: "ISO-1", capacity: 1 },
      ISO2: { name: "ISO-2", capacity: 1 },
    },
  },
  MEDICAL_WING: {
    name: "Medical wing",
    type: LocationType.MEDICAL,
    units: {
      MED1: { name: "MED-1", capacity: 1 },
      MED2: { name: "MED-2", capacity: 1 },
    },
  },
  CAT_ROOM: {
    name: "Cat room",
    type: LocationType.KENNEL,
    units: {
      C1: { name: "C-1", capacity: 3 },
      C2: { name: "C-2", capacity: 3 },
    },
  },
};


const allUnitNames = Object.values(allLocations).flatMap((location) =>
  Object.values(location.units).map((unit) => unit.name),
);


const generatedNamesBySpecies: Record<keyof typeof allSpecies, string[]> = {
  DOG: [
    "Rex", "Bella", "Max", "Luna", "Charlie", "Lucy", "Cooper", "Bailey",
    "Rocky", "Sadie", "Duke", "Molly", "Bear", "Zoe", "Tank", "Ruby",
    "Blue", "Thor", "Penny", "Winston",
  ],
  CAT: [
    "Shadow", "Simba", "Nala", "Oliver", "Milo", "Cleo", "Tiger", "Smokey",
    "Jasper", "Willow", "Salem", "Peanut", "Loki", "Coco", "Ash", "Pepper",
    "Mochi", "Biscuit", "Ziggy", "Olive",
  ],
  BIRD: [
    "Sunny", "Kiwi", "Sky", "Peaches", "Rio", "Echo", "Pip", "Sunshine",
    "Robin", "Skye",
  ],
  RABBIT: [
    "Thumper", "Clover", "Hazel", "Cinnamon", "Buttons", "Oreo", "Snowball",
    "Marshmallow", "Clyde", "Dash",
  ],
  REPTILE: [
    "Rango", "Spike", "Draco", "Scales", "Norbert", "Puff", "Iggy", "Zilla",
    "Torpedo", "Blaze",
  ],
  OTHER: [
    "Nibbles", "Waffles", "Pebbles", "Squeaky", "Truffle", "Nugget",
    "Pudding", "Cotton", "Hazelnut", "Marbles",
  ],
};



interface SpeciesIndividual {
  photos: string[]; 
}







function buildSpeciesImagePools(): Record<keyof typeof allSpecies, SpeciesIndividual[]> {
  const speciesKeys = Object.keys(allSpecies) as (keyof typeof allSpecies)[];
  const pools = {} as Record<keyof typeof allSpecies, SpeciesIndividual[]>;

  for (const speciesKey of speciesKeys) {
    const folder = speciesKey.toLowerCase();
    const dirPath = path.join(process.cwd(), "public/seed-images", folder);

    let filenames: string[];
    try {
      filenames = fs
        .readdirSync(dirPath, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name);
    } catch {
      filenames = [];
    }

    const byIndividual = new Map<number, { photoNum: number; filename: string }[]>();
    for (const filename of filenames) {
      const match = filename.match(/^[a-z]+-(\d+)-(\d+)\.[a-z0-9]+$/i);
      if (!match) continue;
      const individualNum = Number(match[1]);
      const photoNum = Number(match[2]);
      const photos = byIndividual.get(individualNum) ?? [];
      photos.push({ photoNum, filename });
      byIndividual.set(individualNum, photos);
    }

    if (byIndividual.size === 0) {
      throw new Error(
        `Seed image pool for species "${speciesKey}" is missing or empty. ` +
          `Expected photos named like "${folder}-01-1.webp" under public/seed-images/${folder}/.`,
      );
    }

    pools[speciesKey] = [...byIndividual.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, photos]) => ({
        photos: photos
          .sort((a, b) => a.photoNum - b.photoNum)
          .map((p) => `${folder}/${p.filename}`),
      }));
  }

  return pools;
}

const speciesImagePools = buildSpeciesImagePools();




let individualDealQueues: Partial<Record<keyof typeof allSpecies, SpeciesIndividual[]>> = {};






let pendingCharacteristicAssignments: {
  animalId: string;
  assignedAt: Date;
  characteristicIds: string[];
}[] = [];

function dealIndividual(speciesKey: keyof typeof allSpecies): SpeciesIndividual {
  let queue = individualDealQueues[speciesKey];
  if (!queue || queue.length === 0) {
    queue = [...speciesImagePools[speciesKey]].sort(() => Math.random() - 0.5);
  }
  const [individual, ...rest] = queue;
  individualDealQueues[speciesKey] = rest;
  return individual;
}





function pickSpeciesImages(speciesName: string): string[] {
  const speciesKey = (Object.keys(allSpecies) as (keyof typeof allSpecies)[]).find(
    (key) => allSpecies[key].name === speciesName,
  );
  if (!speciesKey) {
    throw new Error(
      `pickSpeciesImages: no species in allSpecies is named "${speciesName}". ` +
        `Every blueprint/generated animal must map to a known species image pool.`,
    );
  }

  const individual = dealIndividual(speciesKey);
  return individual.photos
    .slice(0, 3)
    .map((relativePath) => `${baseUrl}/${relativePath}`);
}




const bodyStatsBySpecies: Record<
  keyof typeof allSpecies,
  { weightMin: number; weightMax: number; heightMin: number; heightMax: number }
> = {
  DOG: { weightMin: 3, weightMax: 42, heightMin: 20, heightMax: 70 },
  CAT: { weightMin: 2.5, weightMax: 7, heightMin: 20, heightMax: 30 },
  BIRD: { weightMin: 0.03, weightMax: 0.6, heightMin: 10, heightMax: 30 },
  RABBIT: { weightMin: 1, weightMax: 3, heightMin: 20, heightMax: 30 },
  REPTILE: { weightMin: 0.2, weightMax: 8, heightMin: 10, heightMax: 50 },
  OTHER: { weightMin: 0.3, weightMax: 1.5, heightMin: 8, heightMax: 15 },
};



const walkInFirstNames = [
  "Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia", "Mason",
  "Isabella", "Lucas", "Mia", "Logan", "Amelia", "Jackson", "Harper", "Aiden",
  "Evelyn", "Elijah", "Abigail", "James", "Charlotte", "Benjamin", "Emily",
  "Alexander", "Ella", "Michael", "Scarlett", "Daniel", "Grace", "Henry",
  "Chloe", "Sebastian", "Victoria", "Jack", "Riley", "Owen", "Aria", "Wyatt",
  "Lily", "Luke", "Zoey", "Gabriel", "Hannah", "Carter", "Layla", "Julian",
  "Nora", "Levi", "Addison", "Isaac",
];

const walkInLastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
  "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark",
  "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King",
  "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams",
  "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter",
  "Roberts",
];

const walkInStreetNames = [
  "Maple", "Oak", "Cedar", "Elm", "Pine", "Birch", "Willow", "Chestnut",
  "Walnut", "Spruce", "Sycamore", "Magnolia", "Aspen", "Cherry", "Poplar",
];

const walkInLocations = [
  { city: "New York", state: "NY", zipCode: "10001" },
  { city: "Brooklyn", state: "NY", zipCode: "11201" },
  { city: "Queens", state: "NY", zipCode: "11101" },
  { city: "Bronx", state: "NY", zipCode: "10451" },
  { city: "Staten Island", state: "NY", zipCode: "10301" },
];

const WALK_IN_PERSON_COUNT = 50;













type Archetype =
  | "IN_CARE"
  | "TRANSFERRED_OUT"
  | "RETURNED_TO_OWNER"
  | "DECEASED_EUTHANIZED"
  | "ADOPTED"
  | "RETURN_READOPT";

interface AnimalBlueprint {
  name: string;
  sex: Sex;
  
  
  size: AnimalSize | null;
  weightGrams: number;
  heightCm: number;
  microchipNumber?: string;
  species: { name: string };
  breeds: { name: string }[];
  colors: { name: string }[];
  primaryColor: { name: string };
  characteristics: { name: string }[];
  images: string[];
  unitName: string | null;
  archetype: Archetype;
  intakeType: IntakeType;
  healthStatus: AnimalHealthStatus;
  listingStatus: AnimalListingStatus;
  
  
  longStay?: boolean;
  
  
  
  
  
  
  
  skipIntakeFollowUpTask?: boolean;
  
  
  
  
  
  
  birthDate?: CalendarDay;
  
  
  
  isSpayedNeutered?: boolean;
  
  
  description?: string;
}




const animalSeedData: AnimalBlueprint[] = [
  {
    name: "Frisco",
    sex: Sex.FEMALE,
    size: AnimalSize.LARGE,
    weightGrams: 30000,
    heightCm: 58,
    microchipNumber: "985141000100001",
    species: allSpecies.DOG,
    breeds: [allSpecies.DOG.breeds.GOLDEN_RETRIEVER],
    colors: [allColors.GOLDEN, allColors.WHITE],
    primaryColor: allColors.GOLDEN,
    characteristics: [
      allCharacteristics.GOOD_WITH_KIDS,
      allCharacteristics.GOOD_WITH_DOGS,
    ],
    intakeType: IntakeType.OWNER_SURRENDER,
    healthStatus: AnimalHealthStatus.HEALTHY,
    images: [`${baseUrl}/dog/dog-01-1.webp`, `${baseUrl}/dog/dog-01-2.webp`],
    unitName: allLocations.DOG_BLOCK_A.units.A1.name,
    archetype: "IN_CARE",
    listingStatus: AnimalListingStatus.PUBLISHED,
    longStay: true,
    description:
      "She jumps when she is happy, which is most of the time. Good with children, easy with other dogs, untested with cats.",
  },
  {
    name: "Flash",
    sex: Sex.MALE,
    
    
    size: AnimalSize.XLARGE,
    weightGrams: 8000,
    heightCm: 32,
    microchipNumber: "985141000100002",
    species: allSpecies.DOG,
    breeds: [
      allSpecies.DOG.breeds.AMERICAN_ESKIMO,
      allSpecies.DOG.breeds.MIXED_BREED,
    ],
    colors: [allColors.WHITE, allColors.BROWN],
    primaryColor: allColors.WHITE,
    characteristics: [allCharacteristics.NEEDS_QUIET_HOME],
    intakeType: IntakeType.STRAY,
    healthStatus: AnimalHealthStatus.AWAITING_VET_EXAM,
    images: [`${baseUrl}/dog/dog-02-1.webp`, `${baseUrl}/dog/dog-02-2.webp`],
    unitName: allLocations.DOG_BLOCK_A.units.A2.name,
    archetype: "IN_CARE",
    listingStatus: AnimalListingStatus.PUBLISHED,
  },
  {
    name: "Fido",
    sex: Sex.MALE,
    size: AnimalSize.MEDIUM,
    weightGrams: 18000,
    heightCm: 45,
    microchipNumber: "985141000100003",
    species: allSpecies.DOG,
    breeds: [allSpecies.DOG.breeds.AIREDALE_TERRIER],
    colors: [allColors.BROWN, allColors.BLACK],
    primaryColor: allColors.BROWN,
    characteristics: [allCharacteristics.HOUSEBROKEN],
    intakeType: IntakeType.TRANSFER_IN,
    healthStatus: AnimalHealthStatus.UNDER_VET_CARE,
    images: [`${baseUrl}/dog/dog-03-1.webp`, `${baseUrl}/dog/dog-03-2.webp`],
    unitName: allLocations.MEDICAL_WING.units.MED1.name,
    archetype: "IN_CARE",
    listingStatus: AnimalListingStatus.PUBLISHED,
    longStay: true,
    description:
      "Quietly determined about the door — he will stand and wait rather than ask twice.",
  },
  {
    name: "Whiskers",
    sex: Sex.FEMALE,
    size: AnimalSize.SMALL,
    weightGrams: 3500,
    heightCm: 24,
    microchipNumber: "985141000100004",
    species: allSpecies.CAT,
    breeds: [allSpecies.CAT.breeds.SIAMESE],
    colors: [allColors.WHITE, allColors.BROWN],
    primaryColor: allColors.WHITE,
    characteristics: [allCharacteristics.GOOD_WITH_CATS],
    intakeType: IntakeType.OWNER_SURRENDER,
    healthStatus: AnimalHealthStatus.HEALTHY,
    images: [
      `${baseUrl}/cat/cat-07-1.webp`,
      `${baseUrl}/cat/cat-07-2.webp`,
      `${baseUrl}/cat/cat-07-3.webp`,
    ],
    unitName: allLocations.CAT_ROOM.units.C1.name,
    archetype: "IN_CARE",
    listingStatus: AnimalListingStatus.PUBLISHED,
    longStay: true,
    description:
      "Whiskers will hold a conversation from the top of the cat tree for as long as you keep answering, and shares the run without a fuss.",
  },
  {
    name: "Misty",
    sex: Sex.FEMALE,
    
    
    size: null,
    weightGrams: 3000,
    heightCm: 23,
    microchipNumber: "985141000100005",
    species: allSpecies.CAT,
    breeds: [allSpecies.CAT.breeds.DOMESTIC_SHORTHAIR],
    colors: [allColors.GRAY, allColors.TABBY, allColors.WHITE],
    primaryColor: allColors.GRAY,
    characteristics: [],
    intakeType: IntakeType.BORN_IN_CARE,
    healthStatus: AnimalHealthStatus.AWAITING_SPAY_NEUTER,
    images: [
      `${baseUrl}/cat/cat-09-1.webp`,
      `${baseUrl}/cat/cat-09-2.webp`,
      `${baseUrl}/cat/cat-09-3.webp`,
    ],
    unitName: allLocations.CAT_ROOM.units.C1.name,
    archetype: "IN_CARE",
    listingStatus: AnimalListingStatus.PUBLISHED,
  },
  {
    name: "Godzilla",
    sex: Sex.MALE,
    size: AnimalSize.LARGE,
    weightGrams: 6000,
    heightCm: 40,
    microchipNumber: "985141000100006",
    species: allSpecies.REPTILE,
    breeds: [allSpecies.REPTILE.breeds.IGUANA],
    colors: [allColors.GREEN, allColors.ORANGE],
    primaryColor: allColors.GREEN,
    characteristics: [],
    intakeType: IntakeType.SEIZE,
    healthStatus: AnimalHealthStatus.AWAITING_TRIAGE,
    images: [
      `${baseUrl}/reptile/reptile-01-1.webp`,
      `${baseUrl}/reptile/reptile-01-2.webp`,
      `${baseUrl}/reptile/reptile-01-3.webp`,
    ],
    unitName: allLocations.ISOLATION.units.ISO1.name,
    archetype: "IN_CARE",
    listingStatus: AnimalListingStatus.PUBLISHED,
    longStay: true,
    description:
      "Six feet of iguana, most of it tail. He spends the warm half of the day under the basking lamp and the rest watching the corridor.",
  },
  {
    name: "Buddy",
    sex: Sex.MALE,
    size: AnimalSize.LARGE,
    weightGrams: 32000,
    heightCm: 57,
    microchipNumber: "985141000100007",
    species: allSpecies.DOG,
    breeds: [allSpecies.DOG.breeds.LABRADOR, allSpecies.DOG.breeds.MIXED_BREED],
    colors: [allColors.BLACK, allColors.WHITE],
    primaryColor: allColors.BLACK,
    characteristics: [
      allCharacteristics.GOOD_WITH_KIDS,
      allCharacteristics.HOUSEBROKEN,
    ],
    intakeType: IntakeType.STRAY,
    healthStatus: AnimalHealthStatus.HEALTHY,
    images: [`${baseUrl}/dog/dog-04-1.webp`],
    unitName: allLocations.DOG_BLOCK_A.units.A3.name,
    archetype: "IN_CARE",
    listingStatus: AnimalListingStatus.PUBLISHED,
    longStay: true,
    description:
      "Housetrained since the day he arrived and never once asked twice. Patient with children, happy to be climbed on all afternoon.",
  },
  {
    name: "Leo",
    sex: Sex.MALE,
    size: AnimalSize.SMALL,
    weightGrams: 3200,
    heightCm: 22,
    microchipNumber: "985141000100008",
    species: allSpecies.CAT,
    breeds: [
      allSpecies.CAT.breeds.TABBY,
      allSpecies.CAT.breeds.DOMESTIC_SHORTHAIR,
    ],
    colors: [allColors.TABBY, allColors.ORANGE],
    primaryColor: allColors.TABBY,
    characteristics: [allCharacteristics.GOOD_WITH_CATS],
    intakeType: IntakeType.BORN_IN_CARE,
    healthStatus: AnimalHealthStatus.HEALTHY,
    images: [`${baseUrl}/cat/cat-01-1.webp`],
    
    unitName: null,
    archetype: "IN_CARE",
    
    listingStatus: AnimalListingStatus.DRAFT,
  },
  {
    name: "Daisy",
    sex: Sex.FEMALE,
    size: AnimalSize.LARGE,
    weightGrams: 28000,
    heightCm: 55,
    microchipNumber: "985141000100009",
    species: allSpecies.DOG,
    breeds: [allSpecies.DOG.breeds.GOLDEN_RETRIEVER],
    colors: [allColors.GOLDEN, allColors.WHITE],
    primaryColor: allColors.GOLDEN,
    characteristics: [allCharacteristics.DEAF],
    intakeType: IntakeType.TRANSFER_IN,
    healthStatus: AnimalHealthStatus.UNDER_VET_CARE,
    images: [`${baseUrl}/dog/dog-05-1.webp`],
    unitName: allLocations.MEDICAL_WING.units.MED2.name,
    archetype: "IN_CARE",
    listingStatus: AnimalListingStatus.PUBLISHED,
    longStay: true,
    description:
      "Daisy is deaf and does not appear to consider it a problem. She watches faces instead of listening, and learns hand signals fast.",
  },

  
  
  
  
  
  
  
  {
    name: "Marigold",
    sex: Sex.FEMALE,
    size: AnimalSize.SMALL,
    weightGrams: 3600,
    heightCm: 24,
    microchipNumber: "985141000100010",
    species: allSpecies.CAT,
    breeds: [allSpecies.CAT.breeds.DOMESTIC_SHORTHAIR],
    colors: [allColors.BLACK, allColors.WHITE],
    primaryColor: allColors.BLACK,
    characteristics: [],
    intakeType: IntakeType.STRAY,
    healthStatus: AnimalHealthStatus.HOSPITALISED,
    images: [`${baseUrl}/cat/cat-02-1.webp`],
    unitName: null,
    archetype: "IN_CARE",
    listingStatus: AnimalListingStatus.PUBLISHED,
    skipIntakeFollowUpTask: true,
  },
  {
    name: "Rocket",
    sex: Sex.MALE,
    size: AnimalSize.MEDIUM,
    weightGrams: 15000,
    heightCm: 42,
    microchipNumber: "985141000100011",
    species: allSpecies.DOG,
    breeds: [allSpecies.DOG.breeds.MIXED_BREED],
    colors: [allColors.BROWN],
    primaryColor: allColors.BROWN,
    characteristics: [],
    intakeType: IntakeType.OWNER_SURRENDER,
    healthStatus: AnimalHealthStatus.UNDER_VET_CARE,
    images: [`${baseUrl}/dog/dog-06-1.webp`],
    unitName: allLocations.DOG_BLOCK_A.units.A4.name,
    archetype: "IN_CARE",
    listingStatus: AnimalListingStatus.PUBLISHED,
    skipIntakeFollowUpTask: true,
  },
  {
    name: "Fern",
    sex: Sex.FEMALE,
    size: AnimalSize.SMALL,
    weightGrams: 1600,
    heightCm: 22,
    microchipNumber: "985141000100012",
    species: allSpecies.RABBIT,
    breeds: [allSpecies.RABBIT.breeds.LIONHEAD],
    colors: [allColors.WHITE, allColors.GRAY],
    primaryColor: allColors.WHITE,
    characteristics: [],
    intakeType: IntakeType.STRAY,
    healthStatus: AnimalHealthStatus.AWAITING_TRIAGE,
    images: [`${baseUrl}/rabbit/rabbit-01-1.webp`],
    unitName: allLocations.ISOLATION.units.ISO2.name,
    archetype: "IN_CARE",
    listingStatus: AnimalListingStatus.PUBLISHED,
    skipIntakeFollowUpTask: true,
  },
  {
    name: "Rusty",
    sex: Sex.MALE,
    size: AnimalSize.LARGE,
    weightGrams: 26000,
    heightCm: 54,
    microchipNumber: "985141000100013",
    species: allSpecies.DOG,
    breeds: [allSpecies.DOG.breeds.LABRADOR],
    colors: [allColors.GOLDEN],
    primaryColor: allColors.GOLDEN,
    characteristics: [allCharacteristics.HOUSEBROKEN],
    intakeType: IntakeType.TRANSFER_IN,
    healthStatus: AnimalHealthStatus.RECOVERING_FROM_SURGERY,
    images: [`${baseUrl}/dog/dog-07-1.webp`],
    unitName: null,
    archetype: "IN_CARE",
    listingStatus: AnimalListingStatus.PUBLISHED,
    skipIntakeFollowUpTask: true,
  },
  {
    
    
    
    name: "Nutmeg",
    sex: Sex.FEMALE,
    size: AnimalSize.SMALL,
    weightGrams: 3200,
    heightCm: 23,
    microchipNumber: "985141000100014",
    species: allSpecies.CAT,
    breeds: [allSpecies.CAT.breeds.TABBY],
    colors: [allColors.TABBY],
    primaryColor: allColors.TABBY,
    characteristics: [],
    intakeType: IntakeType.OWNER_SURRENDER,
    healthStatus: AnimalHealthStatus.AWAITING_SPAY_NEUTER,
    images: [`${baseUrl}/cat/cat-03-1.webp`],
    unitName: allLocations.CAT_ROOM.units.C2.name,
    archetype: "IN_CARE",
    listingStatus: AnimalListingStatus.PUBLISHED,
    skipIntakeFollowUpTask: true,
  },
  {
    
    
    
    name: "Juniper",
    sex: Sex.FEMALE,
    size: AnimalSize.MEDIUM,
    weightGrams: 19000,
    heightCm: 46,
    microchipNumber: "985141000100015",
    species: allSpecies.DOG,
    breeds: [allSpecies.DOG.breeds.AIREDALE_TERRIER],
    colors: [allColors.BLACK, allColors.BROWN],
    primaryColor: allColors.BLACK,
    characteristics: [allCharacteristics.GOOD_WITH_DOGS],
    intakeType: IntakeType.STRAY,
    healthStatus: AnimalHealthStatus.HEALTHY,
    images: [`${baseUrl}/dog/dog-08-1.webp`],
    unitName: allLocations.DOG_BLOCK_A.units.A4.name,
    archetype: "IN_CARE",
    listingStatus: AnimalListingStatus.PUBLISHED,
  },

  
  
  
  
  
  
  
  
  {
    name: "Bruno",
    sex: Sex.MALE,
    size: AnimalSize.LARGE,
    weightGrams: 27000,
    heightCm: 55,
    microchipNumber: "985141000100016",
    species: allSpecies.DOG,
    breeds: [allSpecies.DOG.breeds.LABRADOR],
    colors: [allColors.GOLDEN],
    primaryColor: allColors.GOLDEN,
    characteristics: [allCharacteristics.GOOD_WITH_KIDS],
    intakeType: IntakeType.OWNER_SURRENDER,
    healthStatus: AnimalHealthStatus.HEALTHY,
    images: [`${baseUrl}/dog/dog-09-1.webp`],
    unitName: allLocations.DOG_BLOCK_A.units.A3.name,
    archetype: "IN_CARE",
    listingStatus: AnimalListingStatus.PUBLISHED,
    birthDate: calendarDay("2023-04-11"),
  },
  {
    name: "Bruno",
    sex: Sex.MALE,
    size: AnimalSize.MEDIUM,
    weightGrams: 19000,
    heightCm: 46,
    microchipNumber: "985141000100017",
    species: allSpecies.DOG,
    breeds: [allSpecies.DOG.breeds.MIXED_BREED],
    colors: [allColors.BLACK, allColors.WHITE],
    primaryColor: allColors.BLACK,
    characteristics: [allCharacteristics.HOUSEBROKEN],
    intakeType: IntakeType.STRAY,
    healthStatus: AnimalHealthStatus.HEALTHY,
    images: [`${baseUrl}/dog/dog-10-1.webp`],
    unitName: null,
    archetype: "IN_CARE",
    listingStatus: AnimalListingStatus.PUBLISHED,
    birthDate: calendarDay("2019-08-02"),
  },
];




const attentionQueueScenarioAnimalNames = [
  "Marigold",
  "Rocket",
  "Fern",
  "Rusty",
  "Nutmeg",
  "Juniper",
];






const disambiguationScenarioAnimalNames = ["Bruno"];







const heroLongStayAnimalNames = animalSeedData
  .filter((a) => a.longStay)
  .map((a) => a.name);




const taskSeedData = [
  {
    title: "Administer flea and tick medication",
    details: "Administer monthly flea and tick prevention for a dog.",
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    category: TaskCategory.MEDICAL,
    
    daysUntilDue: 5,
  },
  {
    title: "Behavioral assessment for new dog",
    details:
      "Conduct a standard behavioral assessment, focusing on leash reactivity.",
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    category: TaskCategory.BEHAVIORAL,
    
    daysUntilDue: 12,
  },
  {
    title: "Update adoption profile photos",
    details:
      "Take new photos and write a new bio for an animal's online adoption profile.",
    status: TaskStatus.DONE,
    priority: TaskPriority.LOW,
    category: TaskCategory.ADMINISTRATIVE,
    
    daysUntilDue: 3,
  },
];






const overdueTaskSeedData: {
  animalName: string;
  title: string;
  details: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  daysOverdue: number;
}[] = [
  {
    animalName: "Frisco",
    title: "Nail trim and ear check",
    details: "Overdue routine grooming; check both ears while restrained.",
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    category: TaskCategory.MEDICAL,
    daysOverdue: 8,
  },
  {
    animalName: "Frisco",
    title: "Refresh adoption listing copy",
    details: "Bio still says 'just arrived'; update tone and photos.",
    status: TaskStatus.TODO,
    priority: TaskPriority.LOW,
    category: TaskCategory.ADMINISTRATIVE,
    daysOverdue: 2,
  },
  {
    animalName: "Whiskers",
    title: "Deep-clean enclosure C-1",
    details: "Due today on the rotation board.",
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    category: TaskCategory.CLEANING,
    daysOverdue: 0,
  },
  {
    animalName: "Buddy",
    title: "Leash-reactivity reassessment",
    details: "Follow-up on the intake behavioral flag.",
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    category: TaskCategory.BEHAVIORAL,
    daysOverdue: 5,
  },
  {
    animalName: "Leo",
    title: "Switch to adult kibble",
    details: "Transition plan was supposed to start last week.",
    status: TaskStatus.TODO,
    priority: TaskPriority.LOW,
    category: TaskCategory.FEEDING,
    daysOverdue: 10,
  },
  {
    
    
    animalName: "Daisy",
    title: "Post-op wound recheck",
    details: "Recheck incision site; overdue by several days.",
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    category: TaskCategory.MEDICAL,
    daysOverdue: 3,
  },
  {
    
    animalName: "Juniper",
    title: "Collect foster progress photos",
    details: "Foster hasn't sent an update; needed for the adoption listing.",
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    category: TaskCategory.ADMINISTRATIVE,
    daysOverdue: 6,
  },
];





function randomFloat(min: number, max: number, decimals = 1): number {
  const value = min + Math.random() * (max - min);
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function pickWeighted<T>(options: { value: T; weight: number }[]): T {
  const total = options.reduce((sum, option) => sum + option.weight, 0);
  let r = Math.random() * total;
  for (const option of options) {
    if (r < option.weight) return option.value;
    r -= option.weight;
  }
  return options[options.length - 1].value;
}







function pickGeneratedSpeciesKey(): keyof typeof allSpecies {
  return pickWeighted([
    { value: "DOG" as const, weight: 40 },
    { value: "CAT" as const, weight: 35 },
    { value: "RABBIT" as const, weight: 10 },
    { value: "BIRD" as const, weight: 6 },
    { value: "REPTILE" as const, weight: 5 },
    { value: "OTHER" as const, weight: 4 },
  ]);
}

function pickIntakeType(archetype: Archetype): IntakeType {
  if (archetype === "RETURNED_TO_OWNER") {
    
    return pickWeighted([
      { value: IntakeType.OWNER_SURRENDER, weight: 55 },
      { value: IntakeType.STRAY, weight: 35 },
      { value: IntakeType.ACO_IMPOUND, weight: 10 },
    ]);
  }
  return pickWeighted([
    { value: IntakeType.OWNER_SURRENDER, weight: 28 },
    { value: IntakeType.STRAY, weight: 28 },
    { value: IntakeType.TRANSFER_IN, weight: 16 },
    { value: IntakeType.BORN_IN_CARE, weight: 10 },
    { value: IntakeType.SEIZE, weight: 6 },
    { value: IntakeType.ACO_IMPOUND, weight: 8 },
    { value: IntakeType.SERVICE_IN, weight: 4 },
  ]);
}





const typicalSizeWeightsBySpecies: Record<
  keyof typeof allSpecies,
  { value: AnimalSize | null; weight: number }[]
> = {
  DOG: [
    { value: AnimalSize.SMALL, weight: 20 },
    { value: AnimalSize.MEDIUM, weight: 30 },
    { value: AnimalSize.LARGE, weight: 30 },
    { value: AnimalSize.XLARGE, weight: 10 },
    { value: null, weight: 10 },
  ],
  CAT: [
    { value: AnimalSize.SMALL, weight: 35 },
    { value: AnimalSize.MEDIUM, weight: 40 },
    { value: AnimalSize.LARGE, weight: 15 },
    { value: null, weight: 10 },
  ],
  BIRD: [
    { value: AnimalSize.SMALL, weight: 80 },
    { value: AnimalSize.MEDIUM, weight: 10 },
    { value: null, weight: 10 },
  ],
  RABBIT: [
    { value: AnimalSize.SMALL, weight: 70 },
    { value: AnimalSize.MEDIUM, weight: 20 },
    { value: null, weight: 10 },
  ],
  REPTILE: [
    { value: AnimalSize.SMALL, weight: 40 },
    { value: AnimalSize.MEDIUM, weight: 30 },
    { value: AnimalSize.LARGE, weight: 20 },
    { value: null, weight: 10 },
  ],
  OTHER: [
    { value: AnimalSize.SMALL, weight: 80 },
    { value: null, weight: 20 },
  ],
};

function pickTypicalSize(
  speciesKey: keyof typeof allSpecies,
): AnimalSize | null {
  return pickWeighted(typicalSizeWeightsBySpecies[speciesKey]);
}

function pickHealthStatus(): AnimalHealthStatus {
  return pickWeighted([
    { value: AnimalHealthStatus.HEALTHY, weight: 60 },
    { value: AnimalHealthStatus.AWAITING_VET_EXAM, weight: 10 },
    { value: AnimalHealthStatus.AWAITING_TRIAGE, weight: 5 },
    { value: AnimalHealthStatus.UNDER_VET_CARE, weight: 8 },
    { value: AnimalHealthStatus.HOSPITALISED, weight: 3 },
    { value: AnimalHealthStatus.AWAITING_SPAY_NEUTER, weight: 8 },
    { value: AnimalHealthStatus.AWAITING_OTHER_SURGERY, weight: 3 },
    { value: AnimalHealthStatus.RECOVERING_FROM_SURGERY, weight: 3 },
  ]);
}

function pickBreeds(
  species: (typeof allSpecies)[keyof typeof allSpecies],
): { name: string }[] {
  const breedPool = Object.values(species.breeds);
  const count = Math.random() < 0.7 ? 1 : Math.min(2, breedPool.length);
  const shuffled = [...breedPool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function pickColors(): {
  primary: { name: string };
  all: { name: string }[];
} {
  const colorPool = Object.values(allColors);
  const primary = getRandomItem(colorPool);
  const others = colorPool.filter((c) => c.name !== primary.name);
  const additionalCount = Math.random() < 0.6 ? 0 : randomInt(1, 2);
  const shuffled = [...others].sort(() => Math.random() - 0.5);
  return { primary, all: [primary, ...shuffled.slice(0, additionalCount)] };
}

function pickCharacteristics(): { name: string }[] {
  const pool = Object.values(allCharacteristics);
  const count = randomInt(0, 2);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randomFoundLocation(): {
  foundAddress: string;
  foundCity: string;
  foundState: string;
} {
  const location = getRandomItem(walkInLocations);
  const street = getRandomItem(walkInStreetNames);
  return {
    foundAddress: `${randomInt(10, 9999)} ${street} St`,
    foundCity: location.city,
    foundState: location.state,
  };
}





function buildIntakeRelations(
  intakeType: IntakeType,
  walkInPersons: { id: string }[],
  allPartners: { id: string }[],
): {
  surrenderingPersonId?: string;
  foundByPersonId?: string;
  sourcePartnerId?: string;
  foundAddress?: string;
  foundCity?: string;
  foundState?: string;
} {
  if (intakeType === IntakeType.OWNER_SURRENDER) {
    return { surrenderingPersonId: getRandomItem(walkInPersons).id };
  }
  if (intakeType === IntakeType.STRAY) {
    const foundLocation = randomFoundLocation();
    return {
      foundByPersonId: getRandomItem(walkInPersons).id,
      foundAddress: foundLocation.foundAddress,
      foundCity: foundLocation.foundCity,
      foundState: foundLocation.foundState,
    };
  }
  if (intakeType === IntakeType.TRANSFER_IN) {
    return { sourcePartnerId: getRandomItem(allPartners).id };
  }
  return {};
}

interface GeneratedWalkInPerson {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}




function generateWalkInPersons(count: number): GeneratedWalkInPerson[] {
  const persons: GeneratedWalkInPerson[] = [];
  for (let i = 0; i < count; i++) {
    const first = getRandomItem(walkInFirstNames);
    const last = getRandomItem(walkInLastNames);
    const location = getRandomItem(walkInLocations);
    const street = getRandomItem(walkInStreetNames);
    const num = String(1000 + i).padStart(4, "0");
    const phoneFormats = [
      `212-555-${num}`,
      `(212) 555-${num}`,
      `212.555.${num}`,
      `+1 212-555-${num}`,
      `212555${num}`,
    ];
    const phone = phoneFormats[i % phoneFormats.length];
    persons.push({
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}.${i}@example.com`,
      phone,
      address: `${100 + i * 3} ${street} St`,
      city: location.city,
      state: location.state,
      zipCode: location.zipCode,
    });
  }
  return persons;
}




function generateAnimalBlueprints(
  archetype: Archetype,
  count: number,
  opts: { longStayCount?: number; draftCount?: number } = {},
): AnimalBlueprint[] {
  const { longStayCount = 0, draftCount = 0 } = opts;

  const blueprints: AnimalBlueprint[] = [];
  for (let i = 0; i < count; i++) {
    const speciesKey = pickGeneratedSpeciesKey();
    const species = allSpecies[speciesKey];
    const bodyStats = bodyStatsBySpecies[speciesKey];
    const { primary, all: colors } = pickColors();
    const intakeType = pickIntakeType(archetype);

    const isLongStay = archetype === "IN_CARE" && i < longStayCount;
    const isDraft =
      archetype === "IN_CARE" &&
      i >= longStayCount &&
      i < longStayCount + draftCount;

    blueprints.push({
      name: getRandomItem(generatedNamesBySpecies[speciesKey]),
      sex: getRandomItem([Sex.MALE, Sex.FEMALE]),
      size: pickTypicalSize(speciesKey),
      
      
      weightGrams: Math.round(
        randomFloat(bodyStats.weightMin, bodyStats.weightMax) * 1000,
      ),
      heightCm: randomFloat(bodyStats.heightMin, bodyStats.heightMax, 0),
      species,
      breeds: pickBreeds(species),
      colors,
      primaryColor: primary,
      characteristics: pickCharacteristics(),
      images: pickSpeciesImages(species.name),
      unitName:
        archetype === "IN_CARE" && Math.random() < 0.5
          ? getRandomItem(allUnitNames)
          : null,
      archetype,
      intakeType,
      healthStatus: pickHealthStatus(),
      listingStatus: isDraft
        ? AnimalListingStatus.DRAFT
        : AnimalListingStatus.PUBLISHED,
      longStay: isLongStay,
    });
  }
  return blueprints;
}





const FIRST_GENERATED_MICROCHIP = 985141000100018;























function resolveBlueprintDerivedFields(blueprints: AnimalBlueprint[]): void {
  const now = new Date();
  const sixMonthsAgo = new Date(
    now.getFullYear(),
    now.getMonth() - 6,
    now.getDate(),
  );
  let nextMicrochip = FIRST_GENERATED_MICROCHIP;

  for (const blueprint of blueprints) {
    
    
    if (!blueprint.birthDate) {
      blueprint.birthDate = shelterDayKey(
        blueprint.longStay ? getRandomDate(8, 2) : getRandomDate(),
        seedTimezone,
      );
    }

    
    if (blueprint.isSpayedNeutered === undefined) {
      if (blueprint.longStay) {
        blueprint.isSpayedNeutered = true;
      } else {
        const neuterRate =
          blueprint.birthDate > shelterDayKey(sixMonthsAgo, seedTimezone) ? 0.15 : 0.85;
        blueprint.isSpayedNeutered = Math.random() < neuterRate;
      }
    }

    
    
    if (!blueprint.microchipNumber) {
      const chipRate = blueprint.isSpayedNeutered ? 0.95 : 0.65;
      if (blueprint.longStay || Math.random() < chipRate) {
        blueprint.microchipNumber = String(nextMicrochip);
        nextMicrochip += 1;
      }
    }
  }
}









type ApplicantPerson = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
};

interface HouseholdProfileData {
  livingSituation: LivingSituation;
  hasYard: boolean | null;
  landlordPermission: boolean | null;
  householdSize: number;
  hasChildren: boolean | null;
  childrenAges: number[];
  otherAnimalsDescription: string | null;
  animalExperience: string | null;
}

interface AppTransition {
  status: ApplicationStatus;
  reason: string;
  changedById: string;
  at: Date;
}

const adoptionReasonPool = [
  "Looking for a loyal companion for our family.",
  "Our kids have been asking for a pet and we're ready.",
  "Recently lost a pet and want to open our home to another animal.",
  "Have the space and experience to give this animal a great home.",
  "Working from home now and want a companion during the day.",
  "Retired and looking for a companion to keep us active.",
];

const rejectionReasonPool = [
  "Home visit revealed insufficient space for the animal's needs.",
  "Unable to verify landlord permission for pet ownership.",
  "Application incomplete after follow-up requests.",
  "Another applicant was a better match for this animal's needs.",
];

const withdrawalReasonPool = [
  "Applicant found another pet elsewhere.",
  "Applicant's circumstances changed.",
  "No longer able to commit to pet ownership at this time.",
];

const animalExperiencePool = [
  "First-time pet owner, eager to learn.",
  "Grew up with dogs and cats.",
  "Currently fosters for a local rescue.",
  "Experienced with senior and special-needs animals.",
  "Has owned multiple pets over the years.",
];

function generateHouseholdProfileData(): HouseholdProfileData {
  const livingSituation = getRandomItem(Object.values(LivingSituation));
  const isRenter =
    livingSituation === LivingSituation.RENT_APARTMENT ||
    livingSituation === LivingSituation.RENT_HOUSE;
  const hasChildren = Math.random() < 0.4;
  return {
    livingSituation,
    hasYard: Math.random() < 0.55,
    landlordPermission: isRenter ? Math.random() < 0.85 : null,
    householdSize: randomInt(1, 5),
    hasChildren,
    childrenAges: hasChildren
      ? Array.from({ length: randomInt(1, 3) }, () => randomInt(1, 17))
      : [],
    otherAnimalsDescription:
      Math.random() < 0.5 ? "One friendly cat already at home." : null,
    animalExperience: getRandomItem(animalExperiencePool),
  };
}




function applicantSnapshot(person: ApplicantPerson) {
  return {
    applicantName: person.name,
    applicantEmail: person.email ?? "",
    applicantPhone: person.phone ?? "",
    applicantAddressLine1: person.address ?? "",
    applicantAddressLine2: null,
    applicantCity: person.city ?? "",
    applicantState: person.state ?? "",
    applicantZipCode: person.zipCode ?? "",
  };
}

function pickDistinct<T>(pool: T[], count: number): T[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, pool.length));
}



function addDaysClamped(base: Date, days: number, notAfter: Date): Date {
  const candidate = new Date(base);
  candidate.setDate(candidate.getDate() + days);
  if (candidate >= notAfter) {
    return new Date(notAfter.getTime() - 60 * 60 * 1000);
  }
  return candidate;
}


function daysAgo(n: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date;
}













async function seedVitalsLogSeries(opts: {
  animalId: string;
  recordedById: string;
  startWeightGrams: number;
  trend: "rising" | "stable" | "falling";
  entryCount: number;
  windowStart: Date;
  windowEnd: Date;
  includeTemperatureOnlyEntry?: boolean;
  includeSoftDeletedEntry?: boolean;
}) {
  const {
    animalId,
    recordedById,
    startWeightGrams,
    trend,
    entryCount,
    windowStart,
    windowEnd,
    includeTemperatureOnlyEntry = false,
    includeSoftDeletedEntry = false,
  } = opts;

  const DAY_MS = 24 * 60 * 60 * 1000;
  
  
  
  
  
  const defaultStart = daysAgo(entryCount * 7);
  const roomy = defaultStart >= windowStart;
  let cursor = roomy
    ? addDaysClamped(defaultStart, randomInt(0, 3), windowEnd)
    : addDaysClamped(windowStart, randomInt(1, 3), windowEnd);
  const compressedStepDays = roomy
    ? null
    : Math.max(
        1,
        Math.floor(
          (windowEnd.getTime() - cursor.getTime()) / DAY_MS / entryCount,
        ),
      );
  let weight = startWeightGrams;

  for (let i = 0; i < entryCount; i++) {
    if (i > 0) {
      cursor = addDaysClamped(
        cursor,
        compressedStepDays ?? randomInt(4, 8),
        windowEnd,
      );
    }

    if (trend === "rising") {
      weight += randomInt(50, 150); 
    } else if (trend === "falling") {
      weight -= randomInt(20, 80);
    } else {
      weight += randomInt(-20, 20); 
    }
    weight = Math.max(weight, 50);

    
    
    const isTemperatureOnly =
      includeTemperatureOnlyEntry && i === entryCount - 2;
    
    
    const isSoftDeleted = includeSoftDeletedEntry && i === 0;

    await prisma.vitalsLog.create({
      data: {
        animalId,
        recordedById,
        recordedAt: cursor,
        weightGrams: isTemperatureOnly ? null : Math.round(weight),
        temperatureC: isTemperatureOnly ? randomFloat(37.8, 39.5, 1) : null,
        deletedAt: isSoftDeleted ? cursor : null,
      },
    });
  }

  
  
  
  
  
  
  
  const latest = await prisma.vitalsLog.findFirst({
    where: { animalId, deletedAt: null, weightGrams: { not: null } },
    orderBy: LATEST_ENTRY_ORDER,
    select: { weightGrams: true },
  });
  if (latest) {
    await prisma.animal.update({
      where: { id: animalId },
      data: { currentWeightGrams: latest.weightGrams },
    });
  }
}





async function seedApplicationWithHistory(opts: {
  animalId: string;
  applicant: ApplicantPerson;
  submittedAt: Date;
  reasonForAdoption: string;
  householdProfileData: HouseholdProfileData;
  transitions: AppTransition[];
  
  
  
  submittedByStaffId?: string;
  
  
  
  
  lastEdit?: { byPersonId: string; at: Date };
}): Promise<string> {
  const application = await prisma.adoptionApplication.create({
    data: {
      ...applicantSnapshot(opts.applicant),
      applicantId: opts.applicant.id,
      animalId: opts.animalId,
      ...opts.householdProfileData,
      reasonForAdoption: opts.reasonForAdoption,
      status: ApplicationStatus.PENDING,
      submittedAt: opts.submittedAt,
      source: opts.submittedByStaffId
        ? ApplicationSource.STAFF
        : ApplicationSource.SELF,
      lastEditedById: opts.lastEdit?.byPersonId ?? null,
      lastEditedAt: opts.lastEdit?.at ?? null,
      history: {
        create: {
          status: ApplicationStatus.PENDING,
          statusChangeReason: opts.submittedByStaffId
            ? "Application submitted by staff on behalf of applicant."
            : "Application submitted by applicant.",
          changedById: opts.submittedByStaffId ?? opts.applicant.id,
          changedAt: opts.submittedAt,
        },
      },
    },
  });

  await prisma.householdProfile.upsert({
    where: { personId: opts.applicant.id },
    create: { personId: opts.applicant.id, ...opts.householdProfileData },
    update: opts.householdProfileData,
  });

  for (const transition of opts.transitions) {
    await prisma.adoptionApplication.update({
      where: { id: application.id },
      data: { status: transition.status },
    });
    await prisma.applicationStatusHistory.create({
      data: {
        applicationId: application.id,
        status: transition.status,
        statusChangeReason: transition.reason,
        changedById: transition.changedById,
        changedAt: transition.at,
      },
    });
  }

  return application.id;
}


















async function seedAdoption(opts: {
  animalId: string;
  intakeDate: Date;
  outcomeDate: Date;
  staffMembers: { id: string }[];
  applicantPool: ApplicantPerson[];
  winner?: {
    applicant: ApplicantPerson;
    reasonForAdoption: string;
    householdProfileData: HouseholdProfileData;
  };
}) {
  const reviewingStaff = getRandomItem(opts.staffMembers);
  const approvingStaff = getRandomItem(opts.staffMembers);

  const drawn = opts.winner
    ? []
    : pickDistinct(opts.applicantPool, 1 + randomInt(0, 2));
  const winner = opts.winner?.applicant ?? drawn[0];
  const others = drawn.slice(1);

  const submittedAt = addDaysClamped(
    opts.intakeDate,
    randomInt(1, 5),
    opts.outcomeDate,
  );
  const reviewedAt = addDaysClamped(submittedAt, randomInt(1, 3), opts.outcomeDate);
  const approvedAt = addDaysClamped(reviewedAt, randomInt(1, 5), opts.outcomeDate);

  const winnerAppId = await seedApplicationWithHistory({
    animalId: opts.animalId,
    applicant: winner,
    submittedAt,
    reasonForAdoption:
      opts.winner?.reasonForAdoption ?? getRandomItem(adoptionReasonPool),
    householdProfileData:
      opts.winner?.householdProfileData ?? generateHouseholdProfileData(),
    transitions: [
      {
        status: ApplicationStatus.REVIEWING,
        reason: "Application moved to review.",
        changedById: reviewingStaff.id,
        at: reviewedAt,
      },
      {
        status: ApplicationStatus.APPROVED,
        reason: "Approved after a successful home visit.",
        changedById: approvingStaff.id,
        at: approvedAt,
      },
    ],
  });

  for (const other of others) {
    const otherSubmittedAt = addDaysClamped(
      opts.intakeDate,
      randomInt(1, 6),
      opts.outcomeDate,
    );
    const otherStatus = getRandomItem([
      ApplicationStatus.PENDING,
      ApplicationStatus.REVIEWING,
      ApplicationStatus.WAITLISTED,
    ]);
    const transitions: AppTransition[] =
      otherStatus === ApplicationStatus.PENDING
        ? []
        : [
            {
              status: otherStatus,
              reason:
                otherStatus === ApplicationStatus.WAITLISTED
                  ? "Strong application, held as a backup for this animal."
                  : "Application moved to review.",
              changedById: reviewingStaff.id,
              at: addDaysClamped(otherSubmittedAt, randomInt(1, 3), opts.outcomeDate),
            },
          ];

    await seedApplicationWithHistory({
      animalId: opts.animalId,
      applicant: other,
      submittedAt: otherSubmittedAt,
      reasonForAdoption: getRandomItem(adoptionReasonPool),
      householdProfileData: generateHouseholdProfileData(),
      transitions,
    });
  }

  await prisma.outcome.create({
    data: {
      animalId: opts.animalId,
      type: OutcomeType.ADOPTION,
      outcomeDate: shelterDayKey(opts.outcomeDate, seedTimezone),
      
      
      
      
      createdAt: opts.outcomeDate,
      
      
      previousListingStatus: AnimalListingStatus.PUBLISHED,
      staffMemberId: approvingStaff.id,
      adoptionApplicationId: winnerAppId,
    },
  });

  
  
  
  await prisma.animalActivityLog.create({
    data: {
      animalId: opts.animalId,
      activityType: "OUTCOME_PROCESSED",
      changedById: approvingStaff.id,
      changedAt: opts.outcomeDate,
      changeSummary: "Animal was processed for outcome: adoption.",
    },
  });

}







async function seedReturnAndReadoptAnimal(opts: {
  blueprint: AnimalBlueprint;
  species: { id: string; name: string };
  connectedBreeds: { id: string }[];
  connectedColors: { id: string }[];
  primaryColor: { id: string };
  connectedChars: { id: string }[];
  processingStaff: { id: string };
  dbUnits: { id: string; name: string }[];
  walkInPersons: ApplicantPerson[];
  allPartners: { id: string }[];
  staffMembers: { id: string }[];
  applicantPool: ApplicantPerson[];
}) {
  const {
    blueprint,
    species,
    connectedBreeds,
    connectedColors,
    primaryColor,
    connectedChars,
    processingStaff,
    dbUnits,
    walkInPersons,
    allPartners,
    staffMembers,
    applicantPool,
  } = opts;

  const stage2EndsOpen = Math.random() < 0.6;
  const [stay1, stay2] = generateOrderedTimeline({
    stayCount: 2,
    endsOpen: stage2EndsOpen,
    windowDays: 180,
    minStayDays: 15,
    maxStayDays: 80,
  });

  const unitName =
    stage2EndsOpen && Math.random() < 0.5 ? getRandomItem(allUnitNames) : null;
  const currentUnit = unitName
    ? dbUnits.find((u) => u.name === unitName)
    : undefined;

  
  
  
  
  
  
  
  const animal = await prisma.animal.create({
    data: {
      name: blueprint.name,
      birthDate: blueprint.birthDate ?? shelterDayKey(getRandomDate(), seedTimezone),
      sex: blueprint.sex,
      size: blueprint.size,
      currentWeightGrams: blueprint.weightGrams,
      heightCm: blueprint.heightCm,
      microchipNumber: blueprint.microchipNumber,
      isSpayedNeutered: blueprint.isSpayedNeutered,
      description:
        blueprint.description ?? "A wonderful companion looking for a home.",
      listingStatus: AnimalListingStatus.PUBLISHED,
      publishedAt: stay1.intakeDate,
      healthStatus: blueprint.healthStatus,
      species: { connect: { id: species.id } },
      breeds: { connect: connectedBreeds },
      colors: { connect: connectedColors },
      primaryColor: { connect: { id: primaryColor.id } },
      animalImages: {
        create: blueprint.images.map((imageUrl, index) => ({
          url: imageUrl,
          sortOrder: index,
        })),
      },
      ...(currentUnit ? { currentUnit: { connect: { id: currentUnit.id } } } : {}),
    },
  });

  
  
  
  if (connectedChars.length > 0) {
    pendingCharacteristicAssignments.push({
      animalId: animal.id,
      assignedAt: stay1.intakeDate,
      characteristicIds: connectedChars.map((c) => c.id),
    });
  }

  
  const firstRelations = buildIntakeRelations(
    blueprint.intakeType,
    walkInPersons,
    allPartners,
  );
  await prisma.intake.create({
    data: {
      animalId: animal.id,
      type: blueprint.intakeType,
      intakeDate: shelterDayKey(stay1.intakeDate, seedTimezone),
      staffMemberId: processingStaff.id,
      ...firstRelations,
    },
  });

  
  
  
  await prisma.vitalsLog.create({
    data: {
      animalId: animal.id,
      recordedById: processingStaff.id,
      recordedAt: stay1.intakeDate,
      weightGrams: blueprint.weightGrams,
    },
  });

  await prisma.animalActivityLog.create({
    data: {
      animalId: animal.id,
      activityType: "INTAKE_PROCESSED",
      changedById: processingStaff.id,
      changedAt: stay1.intakeDate,
      changeSummary: `Animal was admitted as ${blueprint.intakeType
        .replace(/_/g, " ")
        .toLowerCase()}.`,
    },
  });

  await prisma.animalNote.create({
    data: {
      animalId: animal.id,
      authorId: processingStaff.id,
      category: NoteCategory.GENERAL,
      createdAt: stay1.intakeDate,
      content: `Initial intake notes. Animal appears to be in ${blueprint.healthStatus} condition.`,
    },
  });

  await seedAdoption({
    animalId: animal.id,
    intakeDate: stay1.intakeDate,
    outcomeDate: stay1.outcomeDate as Date,
    staffMembers,
    applicantPool,
  });

  
  
  const reIntakeType = pickWeighted([
    { value: IntakeType.OWNER_SURRENDER, weight: 70 },
    { value: IntakeType.STRAY, weight: 20 },
    { value: IntakeType.ACO_IMPOUND, weight: 10 },
  ]);
  const reIntakeRelations = buildIntakeRelations(
    reIntakeType,
    walkInPersons,
    allPartners,
  );
  const reIntakeHealthStatus = pickHealthStatus();

  await prisma.intake.create({
    data: {
      animalId: animal.id,
      type: reIntakeType,
      intakeDate: shelterDayKey(stay2.intakeDate, seedTimezone),
      staffMemberId: processingStaff.id,
      ...reIntakeRelations,
    },
  });

  await prisma.animal.update({
    where: { id: animal.id },
    data: {
      healthStatus: reIntakeHealthStatus,
    },
  });

  await prisma.animalActivityLog.create({
    data: {
      animalId: animal.id,
      activityType: "INTAKE_PROCESSED",
      changedById: processingStaff.id,
      changedAt: stay2.intakeDate,
      changeSummary: `Animal was re-intaked as ${reIntakeType
        .replace(/_/g, " ")
        .toLowerCase()}.`,
    },
  });

  await prisma.animalNote.create({
    data: {
      animalId: animal.id,
      authorId: processingStaff.id,
      category: NoteCategory.GENERAL,
      createdAt: stay2.intakeDate,
      content: `Re-intake notes. Animal appears to be in ${reIntakeHealthStatus} condition.`,
    },
  });

  if (!stage2EndsOpen) {
    await seedAdoption({
      animalId: animal.id,
      intakeDate: stay2.intakeDate,
      outcomeDate: stay2.outcomeDate as Date,
      staffMembers,
      applicantPool,
    });

    
    
    await prisma.animal.update({
      where: { id: animal.id },
      data: {
        listingStatus: AnimalListingStatus.ARCHIVED,
        archiveReason: OutcomeType.ADOPTION,
        currentUnitId: null,
      },
    });
  } else if (reIntakeHealthStatus !== AnimalHealthStatus.HEALTHY) {
    await prisma.task.create({
      data: {
        animalId: animal.id,
        createdById: processingStaff.id,
        title: "Schedule Vet Examination",
        category: TaskCategory.MEDICAL,
        priority: TaskPriority.HIGH,
        status: TaskStatus.TODO,
        dueDate: shiftDayKey(
          shelterToday(seedTimezone),
          Math.floor(Math.random() * 5) + 3,
        ),
      },
    });
  }
}





async function seedPersonsAndUsers() {
  console.log("Seeding persons and users...");

  if (!process.env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD is not set in your .env.local file.");
  }

  for (const pData of personData) {
    await prisma.person.create({
      data: {
        name: pData.name,
        email: pData.email,
        phone: pData.phone,
        address: pData.address,
        city: pData.city,
        state: pData.state,
        zipCode: pData.zipCode,
      },
    });

    if (pData.role) {
      let password = "7dJbys5@?tMA"; 

      if (pData.role === Role.ADMIN) {
        password = process.env.ADMIN_PASSWORD;
      }

      
      
      
      
      
      const { user } = await seedAuth.api.signUpEmail({
        body: { name: pData.name, email: pData.email, password },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { role: pData.role, deactivatedAt: pData.deactivatedAt },
      });
    }
  }
  console.log("Seeded persons and users.");
}




const linkTestEmail = process.env.DEV_LINK_TEST_EMAIL;







async function seedWalkInPersons() {
  console.log("Seeding walk-in person pool...");
  const persons = generateWalkInPersons(WALK_IN_PERSON_COUNT);
  if (linkTestEmail) {
    persons[0].email = linkTestEmail;
  }
  for (const p of persons) {
    await prisma.person.create({ data: p });
  }
  console.log(`Seeded ${persons.length} walk-in persons.`);
}

async function seedLookupTables() {
  console.log("Seeding species, breeds, colors, characteristics...");
  try {
    
    for (const color of Object.values(allColors)) {
      await prisma.color.create({ data: color });
    }

    
    for (const char of Object.values(allCharacteristics)) {
      await prisma.characteristic.create({ data: char });
    }

    
    for (const s of Object.values(allSpecies)) {
      const species = await prisma.species.create({
        data: { name: s.name },
      });
      for (const breed of Object.values(s.breeds)) {
        await prisma.breed.create({
          data: {
            name: breed.name,
            speciesId: species.id,
            typicalSize: breed.typicalSize,
          },
        });
      }
    }
  } catch (error) {
    console.error("Error seeding lookup tables:", error);
    throw error;
  }
  console.log("Seeded species, breeds, colors, characteristics.");
}

async function seedPartners() {
  console.log("Seeding partners...");
  try {
    for (const pData of partnerData) {
      await prisma.partner.create({ data: pData });
    }
  } catch (error) {
    console.error("Error seeding partners:", error);
    throw error;
  }
  console.log("Seeded partners.");
}

async function seedLocationsAndUnits() {
  console.log("Seeding locations and units...");
  try {
    for (const locationData of Object.values(allLocations)) {
      await prisma.location.create({
        data: {
          name: locationData.name,
          type: locationData.type,
          units: {
            create: Object.values(locationData.units).map((unit) => ({
              name: unit.name,
              capacity: unit.capacity,
            })),
          },
        },
      });
    }
    console.log("Seeded locations and units.");
  } catch (error) {
    console.error("Error seeding locations and units:", error);
    throw error;
  }
}

async function seedAnimalsAndRelations() {
  console.log("Seeding animals and their relations...");

  const staffMembers = await prisma.person.findMany({
    where: { user: { role: Role.STAFF } },
  });
  
  
  
  const walkInPersons = await prisma.person.findMany({
    where: { user: null, name: { notIn: ["External Agency", "SYSTEM"] } },
  });
  
  
  const userRolePersons = await prisma.person.findMany({
    where: { user: { role: Role.USER } },
  });
  const applicantPool: ApplicantPerson[] = [
    ...walkInPersons.filter((p) => !NON_APPLICANT_PERSON_NAMES.has(p.name)),
    ...userRolePersons.filter(
      (p) => !FIXTURE_APPLICANT_PERSON_NAMES.has(p.name),
    ),
  ];
  const allPartners = await prisma.partner.findMany();
  const dbBreeds = await prisma.breed.findMany();
  const dbColors = await prisma.color.findMany();
  const dbChars = await prisma.characteristic.findMany();
  const dbSpecies = await prisma.species.findMany();
  const dbUnits = await prisma.unit.findMany();

  if (staffMembers.length === 0) {
    throw new Error(
      "No staff members found. Please ensure staff are seeded before animals.",
    );
  }
  if (walkInPersons.length === 0) {
    throw new Error(
      "No walk-in persons found. Please ensure the walk-in person pool is seeded before animals.",
    );
  }

  
  const IN_CARE_COUNT = 60;
  const TRANSFERRED_OUT_COUNT = 15;
  const RETURNED_TO_OWNER_COUNT = 12;
  const DECEASED_EUTHANIZED_COUNT = 11;
  const ADOPTED_COUNT = 45;
  const RETURN_READOPT_COUNT = 7;

  const handAuthoredInCareCount = animalSeedData.filter(
    (a) => a.archetype === "IN_CARE",
  ).length;

  const blueprints: AnimalBlueprint[] = [
    ...animalSeedData,
    ...generateAnimalBlueprints(
      "IN_CARE",
      IN_CARE_COUNT - handAuthoredInCareCount,
      { longStayCount: 0, draftCount: 5 },
    ),
    ...generateAnimalBlueprints("TRANSFERRED_OUT", TRANSFERRED_OUT_COUNT),
    ...generateAnimalBlueprints("RETURNED_TO_OWNER", RETURNED_TO_OWNER_COUNT),
    ...generateAnimalBlueprints(
      "DECEASED_EUTHANIZED",
      DECEASED_EUTHANIZED_COUNT,
    ),
    ...generateAnimalBlueprints("ADOPTED", ADOPTED_COUNT),
    ...generateAnimalBlueprints("RETURN_READOPT", RETURN_READOPT_COUNT),
  ];

  
  
  resolveBlueprintDerivedFields(blueprints);

  
  
  
  
  
  
  const failures: { name: string; error: unknown }[] = [];

  for (const blueprint of blueprints) {
    try {
      
      const species = dbSpecies.find((s) => s.name === blueprint.species.name);
      if (!species) {
        console.warn(
          `Skipping animal "${blueprint.name}" because its species "${blueprint.species.name}" was not found.`,
        );
        continue;
      }

      const breedNames = blueprint.breeds.map((b) => b.name);
      const connectedBreeds = dbBreeds
        .filter((dbBreed) => breedNames.includes(dbBreed.name))
        .map((b) => ({ id: b.id }));

      const colorNames = blueprint.colors.map((c) => c.name);
      const connectedColors = dbColors
        .filter((dbColor) => colorNames.includes(dbColor.name))
        .map((c) => ({ id: c.id }));

      const primaryColorName = blueprint.primaryColor.name;
      const primaryColor = dbColors.find((c) => c.name === primaryColorName);
      if (!primaryColor) {
        console.warn(
          `Skipping animal "${blueprint.name}" because its primary color "${primaryColorName}" was not found.`,
        );
        continue;
      }

      const characteristicNames = blueprint.characteristics.map((c) => c.name);
      const connectedChars = dbChars
        .filter((dbChar) => characteristicNames.includes(dbChar.name))
        .map((dbChar) => ({ id: dbChar.id }));

      const processingStaff = getRandomItem(staffMembers);

      
      
      
      if (blueprint.archetype === "RETURN_READOPT") {
        await seedReturnAndReadoptAnimal({
          blueprint,
          species,
          connectedBreeds,
          connectedColors,
          primaryColor,
          connectedChars,
          processingStaff,
          dbUnits,
          walkInPersons,
          allPartners,
          staffMembers,
          applicantPool,
        });
        continue;
      }

      const isInCare = blueprint.archetype === "IN_CARE";

      
      
      
      const currentUnit =
        isInCare && blueprint.unitName
          ? dbUnits.find((u) => u.name === blueprint.unitName)
          : undefined;
      if (isInCare && blueprint.unitName && !currentUnit) {
        console.warn(
          `Animal "${blueprint.name}" references unit "${blueprint.unitName}" which was not found. Leaving it unplaced.`,
        );
      }

      
      
      const [stay] = generateOrderedTimeline({
        stayCount: 1,
        endsOpen: isInCare,
        windowDays: blueprint.longStay ? 160 : 90,
        
        
        minStayDays: blueprint.longStay ? 95 : 2,
        maxStayDays: blueprint.longStay ? 140 : 60,
      });

      let outcomeType: OutcomeType | undefined;
      if (blueprint.archetype === "TRANSFERRED_OUT") {
        outcomeType = OutcomeType.TRANSFER_OUT;
      } else if (blueprint.archetype === "RETURNED_TO_OWNER") {
        outcomeType = OutcomeType.RETURN_TO_OWNER;
      } else if (blueprint.archetype === "DECEASED_EUTHANIZED") {
        outcomeType = getRandomItem([
          OutcomeType.DECEASED,
          OutcomeType.EUTHANIZED,
        ]);
      } else if (blueprint.archetype === "ADOPTED") {
        outcomeType = OutcomeType.ADOPTION;
      }

      
      
      
      
      
      
      const interimListingStatus = isInCare
        ? blueprint.listingStatus
        : AnimalListingStatus.PUBLISHED;

      
      const animal = await prisma.animal.create({
        data: {
          name: blueprint.name,
          birthDate: blueprint.birthDate ?? shelterDayKey(getRandomDate(), seedTimezone),
          sex: blueprint.sex,
          
          size: blueprint.size,
          currentWeightGrams: blueprint.weightGrams,
          heightCm: blueprint.heightCm,
          microchipNumber: blueprint.microchipNumber,
          isSpayedNeutered: blueprint.isSpayedNeutered,
          description:
            blueprint.description ??
            "A wonderful companion looking for a home.",
          listingStatus: interimListingStatus,
          publishedAt: stay.intakeDate,
          healthStatus: blueprint.healthStatus,
          species: { connect: { id: species.id } },
          breeds: { connect: connectedBreeds },
          colors: { connect: connectedColors },
          primaryColor: { connect: { id: primaryColor.id } },
          animalImages: {
            create: blueprint.images.map((imageUrl, index) => ({
              url: imageUrl,
              sortOrder: index,
            })),
          },
          ...(currentUnit
            ? { currentUnit: { connect: { id: currentUnit.id } } }
            : {}),
        },
      });

      
      
      if (connectedChars.length > 0) {
        pendingCharacteristicAssignments.push({
          animalId: animal.id,
          assignedAt: stay.intakeDate,
          characteristicIds: connectedChars.map((c) => c.id),
        });
      }

      
      
      
      const intakeRelations = buildIntakeRelations(
        blueprint.intakeType,
        walkInPersons,
        allPartners,
      );

      await prisma.intake.create({
        data: {
          animalId: animal.id,
          type: blueprint.intakeType,
          intakeDate: shelterDayKey(stay.intakeDate, seedTimezone),
          staffMemberId: processingStaff.id,
          ...intakeRelations,
        },
      });

      
      
      
      
      
      await prisma.vitalsLog.create({
        data: {
          animalId: animal.id,
          recordedById: processingStaff.id,
          recordedAt: stay.intakeDate,
          weightGrams: blueprint.weightGrams,
        },
      });

      
      
      
      
      
      
      const vitalsSeriesByName: Record<
        string,
        {
          trend: "rising" | "stable" | "falling";
          entryCount: number;
          includeTemperatureOnlyEntry?: boolean;
          includeSoftDeletedEntry?: boolean;
        }
      > = {
        Misty: { trend: "rising", entryCount: 6, includeTemperatureOnlyEntry: true },
        Frisco: { trend: "stable", entryCount: 5, includeSoftDeletedEntry: true },
        Buddy: { trend: "falling", entryCount: 5 },
      };
      const vitalsSeriesConfig = vitalsSeriesByName[blueprint.name];
      if (vitalsSeriesConfig) {
        await seedVitalsLogSeries({
          animalId: animal.id,
          recordedById: processingStaff.id,
          startWeightGrams: blueprint.weightGrams,
          windowStart: stay.intakeDate,
          windowEnd: new Date(),
          ...vitalsSeriesConfig,
        });
      }

      
      
      
      
      
      if (!isInCare && outcomeType) {
        if (blueprint.archetype === "ADOPTED") {
          await seedAdoption({
            animalId: animal.id,
            intakeDate: stay.intakeDate,
            outcomeDate: stay.outcomeDate as Date,
            staffMembers,
            applicantPool,
          });
        } else {
          let ownerId: string | undefined;
          let destinationPartnerId: string | undefined;

          if (blueprint.archetype === "RETURNED_TO_OWNER") {
            
            ownerId =
              intakeRelations.surrenderingPersonId ??
              getRandomItem(walkInPersons).id;
          } else if (blueprint.archetype === "TRANSFERRED_OUT") {
            destinationPartnerId = getRandomItem(allPartners).id;
          }

          const outcomeStaff = getRandomItem(staffMembers);
          await prisma.outcome.create({
            data: {
              animalId: animal.id,
              type: outcomeType,
              outcomeDate: shelterDayKey(stay.outcomeDate as Date, seedTimezone),
              
              createdAt: stay.outcomeDate as Date,
              
              previousListingStatus: AnimalListingStatus.PUBLISHED,
              staffMemberId: outcomeStaff.id,
              ownerId,
              destinationPartnerId,
            },
          });

          
          
          await prisma.animalActivityLog.create({
            data: {
              animalId: animal.id,
              activityType: "OUTCOME_PROCESSED",
              changedById: outcomeStaff.id,
              changedAt: stay.outcomeDate as Date,
              changeSummary: `Animal was processed for outcome: ${outcomeType
                .replace(/_/g, " ")
                .toLowerCase()}.`,
            },
          });
        }

        
        
        
        await prisma.animal.update({
          where: { id: animal.id },
          data: {
            listingStatus: AnimalListingStatus.ARCHIVED,
            archiveReason: outcomeType,
            currentUnitId: null,
          },
        });
      }

      
      await prisma.animalActivityLog.create({
        data: {
          animalId: animal.id,
          activityType: "INTAKE_PROCESSED",
          changedById: processingStaff.id,
          changedAt: stay.intakeDate,
          changeSummary: `Animal was admitted as ${blueprint.intakeType
            .replace(/_/g, " ")
            .toLowerCase()}.`,
        },
      });

      await prisma.animalNote.create({
        data: {
          animalId: animal.id,
          authorId: processingStaff.id,
          category: NoteCategory.GENERAL,
          createdAt: stay.intakeDate,
          content: `Initial intake notes. Animal appears to be in ${blueprint.healthStatus} condition.`,
        },
      });

      
      
      
      if (
        isInCare &&
        blueprint.healthStatus !== AnimalHealthStatus.HEALTHY &&
        !blueprint.skipIntakeFollowUpTask
      ) {
        await prisma.task.create({
          data: {
            animalId: animal.id,
            createdById: processingStaff.id,
            title: "Schedule Vet Examination",
            category: TaskCategory.MEDICAL,
            priority: TaskPriority.HIGH,
            status: TaskStatus.TODO,
            
            dueDate: shiftDayKey(
              shelterToday(seedTimezone),
              Math.floor(Math.random() * 5) + 3,
            ),
          },
        });
      }
    } catch (error) {
      failures.push({ name: blueprint.name, error });
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`Error seeding animal "${failure.name}":`, failure.error);
    }
    throw new Error(
      `Failed to seed ${failures.length} of ${blueprints.length} animals. ` +
        "Aborting — a partial/inconsistent animal must not be silently persisted.",
    );
  }

  console.log(`Seeded ${blueprints.length} animals and their relations.`);
}







async function seedFostering() {
  console.log("Seeding foster profiles, applications, and placements...");

  const staffMembers = await prisma.person.findMany({
    where: { user: { role: Role.STAFF } },
  });
  const walkInPersons = await prisma.person.findMany({
    where: { user: null, name: { notIn: ["External Agency", "SYSTEM"] } },
  });
  const volunteerPersons = await prisma.person.findMany({
    where: { user: { role: Role.VOLUNTEER } },
  });
  const userRolePersons = await prisma.person.findMany({
    where: { user: { role: Role.USER } },
  });
  const dbSpecies = await prisma.species.findMany();

  if (staffMembers.length === 0 || walkInPersons.length < 6) {
    console.log(
      "Skipping foster seeding: insufficient staff or walk-in persons.",
    );
    return;
  }

  const dogSpecies = dbSpecies.find((s) => s.name === "Dog");
  const catSpecies = dbSpecies.find((s) => s.name === "Cat");
  const rabbitSpecies = dbSpecies.find((s) => s.name === "Rabbit");
  const approver = getRandomItem(staffMembers);

  const shuffledWalkIns = [...walkInPersons]
    .filter((p) => !NON_APPLICANT_PERSON_NAMES.has(p.name))
    .sort(() => Math.random() - 0.5);
  
  
  const fosterPeople: ApplicantPerson[] = [
    volunteerPersons[0] ?? shuffledWalkIns[0],
    userRolePersons[0] ?? shuffledWalkIns[1],
    shuffledWalkIns[2],
    shuffledWalkIns[3],
  ];
  
  const applicantPeople = shuffledWalkIns.slice(4, 6);

  const speciesIds = (species: (typeof dbSpecies)[number] | undefined) =>
    species ? { connect: [{ id: species.id }] } : undefined;

  const [activeGeneralist, activeMedical, paused, activeHighCapacity] =
    await Promise.all([
      prisma.fosterProfile.create({
        data: {
          personId: fosterPeople[0].id,
          status: FosterStatus.ACTIVE,
          maxAnimals: 2,
          canGiveOralMeds: true,
          canTransport: true,
          availabilityNotes: "Available most weekends, prefers dogs.",
          approvedAt: daysAgo(90),
          speciesCapabilities: {
            connect: [dogSpecies, catSpecies]
              .filter((s): s is NonNullable<typeof s> => !!s)
              .map((s) => ({ id: s.id })),
          },
        },
      }),
      prisma.fosterProfile.create({
        data: {
          personId: fosterPeople[1].id,
          status: FosterStatus.ACTIVE,
          maxAnimals: 1,
          hasQuarantineSpace: true,
          canGiveOralMeds: true,
          acceptsMedical: true,
          availabilityNotes: "Experienced with post-surgical recovery cats.",
          approvedAt: daysAgo(150),
          speciesCapabilities: speciesIds(catSpecies),
        },
      }),
      prisma.fosterProfile.create({
        data: {
          personId: fosterPeople[2].id,
          status: FosterStatus.PAUSED,
          maxAnimals: 1,
          canBottleFeed: true,
          acceptsHospice: true,
          availabilityNotes:
            "Currently paused — traveling until further notice.",
          approvedAt: daysAgo(200),
          speciesCapabilities: speciesIds(dogSpecies),
        },
      }),
      prisma.fosterProfile.create({
        data: {
          personId: fosterPeople[3].id,
          status: FosterStatus.ACTIVE,
          maxAnimals: 3,
          hasQuarantineSpace: true,
          canGiveOralMeds: true,
          canTransport: true,
          availabilityNotes: "High-capacity home, happy to take litters.",
          approvedAt: daysAgo(45),
          speciesCapabilities: {
            connect: [dogSpecies, catSpecies, rabbitSpecies]
              .filter((s): s is NonNullable<typeof s> => !!s)
              .map((s) => ({ id: s.id })),
          },
        },
      }),
    ]);
  
  void paused;

  
  
  const applicationPlans: { applicant: ApplicantPerson; reviewed: boolean }[] =
    applicantPeople.map((applicant, i) => ({
      applicant,
      reviewed: i === 1,
    }));

  for (const plan of applicationPlans) {
    const submittedAt = daysAgo(randomInt(5, 20));
    const householdData = generateHouseholdProfileData();

    const application = await prisma.fosterApplication.create({
      data: {
        ...applicantSnapshot(plan.applicant),
        personId: plan.applicant.id,
        ...householdData,
        maxAnimals: randomInt(1, 2),
        canGiveOralMeds: Math.random() < 0.5,
        canTransport: Math.random() < 0.5,
        availabilityNotes: "Submitted via the foster application form.",
        status: ApplicationStatus.PENDING,
        submittedAt,
        speciesCapabilities: speciesIds(dogSpecies),
        history: {
          create: {
            status: ApplicationStatus.PENDING,
            statusChangeReason: "Application submitted by applicant.",
            changedById: plan.applicant.id,
            changedAt: submittedAt,
          },
        },
      },
    });

    await prisma.householdProfile.upsert({
      where: { personId: plan.applicant.id },
      create: { personId: plan.applicant.id, ...householdData },
      update: householdData,
    });

    if (plan.reviewed) {
      const reviewedAt = addDaysClamped(
        submittedAt,
        randomInt(1, 4),
        new Date(),
      );
      await prisma.fosterApplication.update({
        where: { id: application.id },
        data: { status: ApplicationStatus.REVIEWING },
      });
      await prisma.fosterApplicationStatusHistory.create({
        data: {
          applicationId: application.id,
          status: ApplicationStatus.REVIEWING,
          statusChangeReason: "Application moved to review.",
          changedById: approver.id,
          changedAt: reviewedAt,
        },
      });
    }
  }

  

  
  
  
  
  
  const today = shelterToday(seedTimezone);
  const firstFosterDay = (intakeDay: CalendarDay, daysBack: number) => {
    const target = shiftDayKey(today, -daysBack);
    const dayAfterIntake = shiftDayKey(intakeDay, 1);
    const earliest = dayAfterIntake < today ? dayAfterIntake : intakeDay;
    return target > earliest ? target : earliest;
  };
  
  
  const momentOn = (day: CalendarDay) => {
    const now = Date.now();
    const dayStart = startOfShelterDay(day, seedTimezone).getTime();
    const midday = dayStart + 12 * 60 * 60 * 1000;
    return new Date(
      midday < now ? midday : Math.max(dayStart, now - 60 * 1000),
    );
  };
  const latestIntakeDay = (intakes: { intakeDate: string }[]) =>
    calendarDay(intakes[0].intakeDate);

  
  
  
  
  
  
  const housedInCareAnimals = await prisma.animal.findMany({
    where: {
      listingStatus: {
        in: [AnimalListingStatus.PUBLISHED, AnimalListingStatus.DRAFT],
      },
      currentUnitId: { not: null },
      name: {
        notIn: [
          ...attentionQueueScenarioAnimalNames,
          ...disambiguationScenarioAnimalNames,
          ...heroLongStayAnimalNames,
        ],
      },
    },
    select: {
      id: true,
      currentUnitId: true,
      intake: {
        select: { intakeDate: true },
        orderBy: { intakeDate: "desc" },
        take: 1,
      },
    },
  });
  
  const fosterableAnimals = housedInCareAnimals.filter(
    (animal) =>
      animal.intake.length > 0 &&
      latestIntakeDay(animal.intake) <= shiftDayKey(today, -2),
  );

  if (fosterableAnimals.length >= 3) {
    const [openAnimal, closedAnimal1, closedAnimal2] = pickDistinct(
      fosterableAnimals,
      3,
    );

    
    const openStart = firstFosterDay(latestIntakeDay(openAnimal.intake), 6);
    await prisma.fosterPlacement.create({
      data: {
        animalId: openAnimal.id,
        
        
        fosterProfileId: activeMedical.id,
        type: FosterPlacementType.GENERAL,
        startDate: openStart,
        
        
        
        expectedEndDate: shiftDayKey(shelterToday(seedTimezone), 9),
        previousUnitId: openAnimal.currentUnitId,
        placedById: approver.id,
      },
    });
    await prisma.animal.update({
      where: { id: openAnimal.id },
      data: { currentUnitId: null },
    });
    await prisma.animalActivityLog.create({
      data: {
        animalId: openAnimal.id,
        activityType: "FOSTER_PLACED",
        changedById: approver.id,
        changedAt: momentOn(openStart),
        changeSummary: "Animal was placed with a foster.",
      },
    });

    const closedPlans = [
      {
        animal: closedAnimal1,
        reason: FosterReturnReason.RETURNED_TO_SHELTER,
        profile: activeGeneralist,
        notes: "Foster's circumstances changed; animal returned to the shelter.",
      },
      {
        animal: closedAnimal2,
        reason: FosterReturnReason.MEDICAL,
        profile: activeHighCapacity,
        notes:
          "Returned for a vet follow-up the foster couldn't provide at home.",
      },
    ];

    for (const plan of closedPlans) {
      const intakeDay = latestIntakeDay(plan.animal.intake);
      const stayDays = shelterDaysBetweenKeys(intakeDay, today);
      const start = shiftDayKey(intakeDay, randomInt(1, stayDays - 1));
      const end = shiftDayKey(
        start,
        randomInt(1, Math.min(45, shelterDaysBetweenKeys(start, today))),
      );
      const returnStaff = getRandomItem(staffMembers);

      await prisma.fosterPlacement.create({
        data: {
          animalId: plan.animal.id,
          fosterProfileId: plan.profile.id,
          type: FosterPlacementType.GENERAL,
          startDate: start,
          endDate: end,
          previousUnitId: plan.animal.currentUnitId,
          placedById: approver.id,
          returnedById: returnStaff.id,
          returnReason: plan.reason,
          returnNotes: plan.notes,
        },
      });
      await prisma.animalActivityLog.create({
        data: {
          animalId: plan.animal.id,
          activityType: "FOSTER_PLACED",
          changedById: approver.id,
          changedAt: momentOn(start),
          changeSummary: "Animal was placed with a foster.",
        },
      });
      await prisma.animalActivityLog.create({
        data: {
          animalId: plan.animal.id,
          activityType: "FOSTER_RETURNED",
          changedById: returnStaff.id,
          changedAt: momentOn(end),
          changeSummary: `Animal was returned from foster: ${plan.reason
            .replace(/_/g, " ")
            .toLowerCase()}.`,
        },
      });
    }
  } else {
    console.log(
      "Skipping open/closed placement seeding: not enough housed in-care animals.",
    );
  }

  
  
  
  
  const juniper = await prisma.animal.findFirst({
    where: { name: "Juniper" },
    select: {
      id: true,
      currentUnitId: true,
      intake: {
        select: { intakeDate: true },
        orderBy: { intakeDate: "desc" },
        take: 1,
      },
    },
  });
  if (juniper && juniper.intake.length > 0) {
    
    
    
    const juniperPlacementStart = firstFosterDay(
      latestIntakeDay(juniper.intake),
      21,
    );
    const fourDaysAgo = shiftDayKey(today, -4);
    await prisma.fosterPlacement.create({
      data: {
        animalId: juniper.id,
        fosterProfileId: activeGeneralist.id,
        type: FosterPlacementType.GENERAL,
        startDate: juniperPlacementStart,
        
        
        expectedEndDate:
          juniperPlacementStart > fourDaysAgo
            ? juniperPlacementStart
            : fourDaysAgo,
        previousUnitId: juniper.currentUnitId,
        placedById: approver.id,
      },
    });
    await prisma.animal.update({
      where: { id: juniper.id },
      data: { currentUnitId: null },
    });
    await prisma.animalActivityLog.create({
      data: {
        animalId: juniper.id,
        activityType: "FOSTER_PLACED",
        changedById: approver.id,
        changedAt: momentOn(juniperPlacementStart),
        changeSummary: "Animal was placed with a foster.",
      },
    });
  }

  
  
  const dogBreeds = dogSpecies
    ? await prisma.breed.findMany({ where: { speciesId: dogSpecies.id } })
    : [];
  const dbColors = await prisma.color.findMany();
  const dbUnits = await prisma.unit.findMany();

  if (
    dogSpecies &&
    dogBreeds.length > 0 &&
    dbColors.length > 0 &&
    dbUnits.length > 0
  ) {
    const primaryColor = getRandomItem(dbColors);
    const breed = getRandomItem(dogBreeds);
    const startUnit = getRandomItem(dbUnits);

    const fosterAdopter = fosterPeople[0];
    const winstonWeightGrams = 22000;
    const intakeDate = daysAgo(70);
    const placedAt = daysAgo(45);
    const reviewedAt = daysAgo(30);
    const approvedAt = daysAgo(15);
    const adoptedAt = daysAgo(3);

    const animal = await prisma.animal.create({
      data: {
        name: "Winston",
        
        
        birthDate: shelterDayKey(getRandomDate(6, 1), seedTimezone),
        sex: Sex.MALE,
        size: AnimalSize.LARGE,
        currentWeightGrams: winstonWeightGrams,
        heightCm: 48,
        
        
        
        isSpayedNeutered: true,
        microchipNumber: "985141000109999",
        description: "A wonderful companion looking for a home.",
        listingStatus: AnimalListingStatus.PUBLISHED,
        publishedAt: intakeDate,
        healthStatus: AnimalHealthStatus.HEALTHY,
        species: { connect: { id: dogSpecies.id } },
        breeds: { connect: [{ id: breed.id }] },
        colors: { connect: [{ id: primaryColor.id }] },
        primaryColor: { connect: { id: primaryColor.id } },
        animalImages: {
          create: pickSpeciesImages("Dog").map((url, index) => ({
            url,
            sortOrder: index,
          })),
        },
        currentUnit: { connect: { id: startUnit.id } },
      },
    });

    const surrenderer = getRandomItem(walkInPersons);
    await prisma.intake.create({
      data: {
        animalId: animal.id,
        type: IntakeType.OWNER_SURRENDER,
        intakeDate: shelterDayKey(intakeDate, seedTimezone),
        staffMemberId: approver.id,
        surrenderingPersonId: surrenderer.id,
      },
    });
    
    
    
    await prisma.vitalsLog.create({
      data: {
        animalId: animal.id,
        recordedById: approver.id,
        recordedAt: intakeDate,
        weightGrams: winstonWeightGrams,
      },
    });
    await prisma.animalActivityLog.create({
      data: {
        animalId: animal.id,
        activityType: "INTAKE_PROCESSED",
        changedById: approver.id,
        changedAt: intakeDate,
        changeSummary: "Animal was admitted as owner surrender.",
      },
    });

    const placement = await prisma.fosterPlacement.create({
      data: {
        animalId: animal.id,
        fosterProfileId: activeGeneralist.id,
        type: FosterPlacementType.FOSTER_TO_ADOPT,
        startDate: shelterDayKey(placedAt, seedTimezone),
        previousUnitId: startUnit.id,
        previousListingStatus: AnimalListingStatus.PUBLISHED,
        placedById: approver.id,
      },
    });
    await prisma.animal.update({
      where: { id: animal.id },
      data: {
        currentUnitId: null,
        listingStatus: AnimalListingStatus.PENDING_ADOPTION,
      },
    });
    await prisma.animalActivityLog.create({
      data: {
        animalId: animal.id,
        activityType: "FOSTER_PLACED",
        changedById: approver.id,
        changedAt: placedAt,
        changeSummary: "Animal was placed with a foster (foster-to-adopt).",
      },
    });

    const applicationId = await seedApplicationWithHistory({
      animalId: animal.id,
      applicant: fosterAdopter,
      submittedAt: placedAt,
      reasonForAdoption:
        "Fell in love with this foster placement and decided to make it permanent.",
      householdProfileData: generateHouseholdProfileData(),
      transitions: [
        {
          status: ApplicationStatus.REVIEWING,
          reason: "Application moved to review.",
          changedById: approver.id,
          at: reviewedAt,
        },
        {
          status: ApplicationStatus.APPROVED,
          reason: "Approved — foster-to-adopt conversion.",
          changedById: approver.id,
          at: approvedAt,
        },
      ],
    });

    const outcome = await prisma.outcome.create({
      data: {
        animalId: animal.id,
        type: OutcomeType.ADOPTION,
        outcomeDate: shelterDayKey(adoptedAt, seedTimezone),
        
        createdAt: adoptedAt,
        
        previousListingStatus: AnimalListingStatus.PENDING_ADOPTION,
        staffMemberId: approver.id,
        adoptionApplicationId: applicationId,
      },
    });
    await prisma.animalActivityLog.create({
      data: {
        animalId: animal.id,
        activityType: "OUTCOME_PROCESSED",
        changedById: approver.id,
        changedAt: adoptedAt,
        changeSummary: "Animal was processed for outcome: adoption.",
      },
    });
    await prisma.fosterPlacement.update({
      where: { id: placement.id },
      data: {
        endDate: shelterDayKey(adoptedAt, seedTimezone),
        returnReason: FosterReturnReason.ADOPTED_BY_FOSTER,
        returnedById: approver.id,
        outcomeId: outcome.id,
        adoptionApplicationId: applicationId,
      },
    });
    await prisma.animalActivityLog.create({
      data: {
        animalId: animal.id,
        activityType: "FOSTER_RETURNED",
        changedById: approver.id,
        changedAt: adoptedAt,
        changeSummary: "Foster-to-adopt placement converted to an adoption.",
      },
    });

    await prisma.animal.update({
      where: { id: animal.id },
      data: {
        listingStatus: AnimalListingStatus.ARCHIVED,
        archiveReason: OutcomeType.ADOPTION,
        currentUnitId: null,
      },
    });
  } else {
    console.log(
      "Skipping foster-to-adopt conversion seeding: missing species/breed/color/unit data.",
    );
  }

  console.log("Seeded foster profiles, applications, and placements.");
}





async function seedApplicationNoise() {
  console.log("Seeding standalone adoption applications...");

  const staffMembers = await prisma.person.findMany({
    where: { user: { role: Role.STAFF } },
  });
  const walkInPersons = await prisma.person.findMany({
    where: { user: null, name: { notIn: ["External Agency", "SYSTEM"] } },
  });
  const userRolePersons = await prisma.person.findMany({
    where: { user: { role: Role.USER } },
  });
  const applicantPool: ApplicantPerson[] = [
    ...walkInPersons.filter((p) => !NON_APPLICANT_PERSON_NAMES.has(p.name)),
    ...userRolePersons.filter(
      (p) => !FIXTURE_APPLICANT_PERSON_NAMES.has(p.name),
    ),
  ];

  const publishedAnimals = await prisma.animal.findMany({
    where: { listingStatus: AnimalListingStatus.PUBLISHED },
    select: {
      id: true,
      intake: {
        select: { intakeDate: true },
        orderBy: [{ intakeDate: "desc" }, { createdAt: "desc" }],
        take: 1,
      },
    },
  });

  if (publishedAnimals.length === 0 || applicantPool.length === 0) {
    console.log(
      "No published animals or applicants found, skipping application noise.",
    );
    return;
  }

  type NoisePlan = { status: ApplicationStatus; reactivate?: boolean };
  const plans: NoisePlan[] = [
    ...Array(10).fill({ status: ApplicationStatus.PENDING }),
    ...Array(6).fill({ status: ApplicationStatus.REVIEWING }),
    ...Array(4).fill({ status: ApplicationStatus.WAITLISTED }),
    ...Array(6).fill({ status: ApplicationStatus.APPROVED }),
    ...Array(5).fill({ status: ApplicationStatus.REJECTED }),
    { status: ApplicationStatus.WITHDRAWN },
    { status: ApplicationStatus.WITHDRAWN },
    { status: ApplicationStatus.WITHDRAWN, reactivate: true },
    { status: ApplicationStatus.WITHDRAWN, reactivate: true },
  ];

  const shuffledAnimals = [...publishedAnimals].sort(() => Math.random() - 0.5);
  const shuffledApplicants = [...applicantPool].sort(() => Math.random() - 0.5);

  
  
  const usedPairs = new Set<string>();
  let animalIdx = 0;
  let applicantIdx = 0;

  for (const plan of plans) {
    const animal = shuffledAnimals[animalIdx % shuffledAnimals.length];
    let applicant = shuffledApplicants[applicantIdx % shuffledApplicants.length];
    let attempts = 0;
    while (
      usedPairs.has(`${applicant.id}:${animal.id}`) &&
      attempts < shuffledApplicants.length
    ) {
      applicantIdx++;
      applicant = shuffledApplicants[applicantIdx % shuffledApplicants.length];
      attempts++;
    }
    usedPairs.add(`${applicant.id}:${animal.id}`);
    animalIdx++;
    applicantIdx++;

    const now = new Date();
    
    
    
    const latestIntake = animal.intake[0];
    const intakeDate = latestIntake
      ? startOfShelterDay(calendarDay(latestIntake.intakeDate), seedTimezone)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const submittedAt = addDaysClamped(intakeDate, randomInt(1, 20), now);
    const staffMember = getRandomItem(staffMembers);

    const transitions: AppTransition[] = [];
    let cursor = submittedAt;

    if (plan.status !== ApplicationStatus.PENDING) {
      cursor = addDaysClamped(cursor, randomInt(1, 5), now);
      transitions.push({
        status: ApplicationStatus.REVIEWING,
        reason: "Application moved to review.",
        changedById: staffMember.id,
        at: cursor,
      });
    }

    if (plan.status === ApplicationStatus.WAITLISTED) {
      cursor = addDaysClamped(cursor, randomInt(1, 5), now);
      transitions.push({
        status: ApplicationStatus.WAITLISTED,
        reason: "Strong application, held as a backup for this animal.",
        changedById: staffMember.id,
        at: cursor,
      });
    } else if (plan.status === ApplicationStatus.APPROVED) {
      cursor = addDaysClamped(cursor, randomInt(1, 7), now);
      transitions.push({
        status: ApplicationStatus.APPROVED,
        reason: "Approved after a successful home visit.",
        changedById: staffMember.id,
        at: cursor,
      });
    } else if (plan.status === ApplicationStatus.REJECTED) {
      cursor = addDaysClamped(cursor, randomInt(1, 7), now);
      transitions.push({
        status: ApplicationStatus.REJECTED,
        reason: getRandomItem(rejectionReasonPool),
        changedById: staffMember.id,
        at: cursor,
      });
    } else if (plan.status === ApplicationStatus.WITHDRAWN) {
      cursor = addDaysClamped(cursor, randomInt(1, 10), now);
      transitions.push({
        status: ApplicationStatus.WITHDRAWN,
        reason: getRandomItem(withdrawalReasonPool),
        changedById: applicant.id,
        at: cursor,
      });
      if (plan.reactivate) {
        cursor = addDaysClamped(cursor, randomInt(1, 5), now);
        transitions.push({
          status: ApplicationStatus.PENDING,
          reason: "Application reactivated by user.",
          changedById: applicant.id,
          at: cursor,
        });
      }
    }

    await seedApplicationWithHistory({
      animalId: animal.id,
      applicant,
      submittedAt,
      reasonForAdoption: getRandomItem(adoptionReasonPool),
      householdProfileData: generateHouseholdProfileData(),
      transitions,
    });

    
    
    const finalStatus =
      transitions.length > 0
        ? transitions[transitions.length - 1].status
        : ApplicationStatus.PENDING;
    if (finalStatus === ApplicationStatus.APPROVED) {
      await prisma.animal.updateMany({
        where: { id: animal.id, listingStatus: AnimalListingStatus.PUBLISHED },
        data: { listingStatus: AnimalListingStatus.PENDING_ADOPTION },
      });
    }
  }

  console.log(`Seeded ${plans.length} standalone adoption applications.`);
}







const HAND_AUTHORED_ANIMAL_NAMES = animalSeedData.map((animal) => animal.name);




const WALK_IN_REAPPLY_ANIMAL_NAME = "Peppercorn";







const FIXTURE_HOUSEHOLD: HouseholdProfileData = {
  livingSituation: LivingSituation.RENT_HOUSE,
  hasYard: true,
  landlordPermission: true,
  householdSize: 3,
  hasChildren: true,
  childrenAges: [7, 11],
  otherAnimalsDescription: "One senior cat, indoor only.",
  animalExperience: "Grew up with dogs and cats.",
};






const SECOND_FIXTURE_HOUSEHOLD: HouseholdProfileData = {
  livingSituation: LivingSituation.OWN_HOME,
  hasYard: false,
  
  
  landlordPermission: null,
  householdSize: 1,
  hasChildren: false,
  childrenAges: [],
  otherAnimalsDescription: "No other animals at home.",
  animalExperience: "Fostered two cats for a rescue in Brooklyn.",
};













































async function seedRegisteredUserApplicationFixtures() {
  console.log("Seeding the registered-user adoption application fixtures...");

  const applicant = await prisma.person.findFirst({
    where: { name: "Jane Doe", user: { role: Role.USER } },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
    },
  });

  if (!applicant) {
    throw new Error(
      "Expected the seeded 'Jane Doe' registered user for the adoption application fixtures.",
    );
  }

  const staffMembers = await prisma.person.findMany({
    where: { user: { role: Role.STAFF } },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: { id: true, email: true },
  });
  if (staffMembers.length === 0) {
    throw new Error(
      "No staff members found for the adoption application fixtures.",
    );
  }
  
  
  const reviewer =
    staffMembers.find((s) => s.email === "staff1@example.com") ??
    staffMembers[0];

  
  
  
  
  
  const claimedAnimalIds: string[] = [];
  const claimAnimal = async (
    label: string,
    where: Prisma.AnimalWhereInput,
  ) => {
    const animal = await prisma.animal.findFirst({
      where: {
        ...where,
        id: { notIn: claimedAnimalIds },
        name: { notIn: HAND_AUTHORED_ANIMAL_NAMES },
        adoptionApplications: { none: { applicantId: applicant.id } },
      },
      
      
      
      
      
      
      
      
      
      orderBy: [{ name: "desc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        intake: {
          select: { intakeDate: true },
          orderBy: [{ intakeDate: "desc" }, { createdAt: "desc" }],
          take: 1,
        },
        Outcome: {
          where: { reversedAt: null },
          select: { outcomeDate: true },
          orderBy: [{ outcomeDate: "desc" }, { createdAt: "desc" }],
          take: 1,
        },
      },
    });
    if (!animal?.intake[0]) {
      throw new Error(
        `No animal available for the "${label}" adoption application fixture.`,
      );
    }
    claimedAnimalIds.push(animal.id);
    return {
      id: animal.id,
      name: animal.name,
      
      
      
      intakeDate: startOfShelterDay(calendarDay(animal.intake[0].intakeDate), seedTimezone),
      outcomeDate: animal.Outcome[0]
        ? startOfShelterDay(calendarDay(animal.Outcome[0].outcomeDate), seedTimezone)
        : null,
    };
  };

  
  
  
  
  
  const publishedWhere: Prisma.AnimalWhereInput = {
    listingStatus: AnimalListingStatus.PUBLISHED,
    intake: { some: {}, every: { intakeDate: { lte: shelterDayKey(daysAgo(45), seedTimezone) } } },
  };

  
  
  
  const openStayDates = [daysAgo(30), daysAgo(21), daysAgo(12)];

  
  
  
  const withinStay = (stay: { intakeDate: Date; outcomeDate: Date | null }, fraction: number) => {
    if (!stay.outcomeDate) {
      throw new Error("Expected a closed stay for an archived fixture animal.");
    }
    const span = stay.outcomeDate.getTime() - stay.intakeDate.getTime();
    return new Date(stay.intakeDate.getTime() + span * fraction);
  };

  
  
  
  
  const adoptedAnimal = await claimAnimal("ADOPTED", publishedWhere);
  await seedAdoption({
    animalId: adoptedAnimal.id,
    
    
    
    
    
    intakeDate: openStayDates[0],
    outcomeDate: daysAgo(6),
    staffMembers,
    applicantPool: [],
    winner: {
      applicant,
      reasonForAdoption:
        "We have been visiting for weeks and the whole family agrees.",
      householdProfileData: FIXTURE_HOUSEHOLD,
    },
  });
  await prisma.animal.update({
    where: { id: adoptedAnimal.id },
    data: {
      listingStatus: AnimalListingStatus.ARCHIVED,
      archiveReason: OutcomeType.ADOPTION,
      currentUnitId: null,
    },
  });

  
  const pendingAnimal = await claimAnimal("PENDING", publishedWhere);
  await seedApplicationWithHistory({
    animalId: pendingAnimal.id,
    applicant,
    submittedAt: openStayDates[2],
    reasonForAdoption: "Looking for a calm companion for a quiet household.",
    householdProfileData: FIXTURE_HOUSEHOLD,
    transitions: [],
  });

  
  const reviewingAnimal = await claimAnimal("REVIEWING", publishedWhere);
  await seedApplicationWithHistory({
    animalId: reviewingAnimal.id,
    applicant,
    submittedAt: openStayDates[0],
    reasonForAdoption:
      "Our last dog passed last year and the house is too quiet.",
    householdProfileData: FIXTURE_HOUSEHOLD,
    transitions: [
      {
        status: ApplicationStatus.REVIEWING,
        reason: "References received. Scheduling a home visit next week.",
        changedById: reviewer.id,
        at: openStayDates[1],
      },
    ],
  });

  
  const waitlistedAnimal = await claimAnimal("WAITLISTED", publishedWhere);
  await seedApplicationWithHistory({
    animalId: waitlistedAnimal.id,
    applicant,
    submittedAt: openStayDates[0],
    reasonForAdoption: "We have the space and the time for an active dog.",
    householdProfileData: FIXTURE_HOUSEHOLD,
    transitions: [
      {
        status: ApplicationStatus.REVIEWING,
        reason: "Application moved to review.",
        changedById: reviewer.id,
        at: openStayDates[1],
      },
      {
        status: ApplicationStatus.WAITLISTED,
        reason:
          "A strong application. Held as our backup while the first-choice adopter completes their home visit.",
        changedById: reviewer.id,
        at: openStayDates[2],
      },
    ],
  });

  
  
  
  const approvedAnimal = await claimAnimal("APPROVED", publishedWhere);
  await seedApplicationWithHistory({
    animalId: approvedAnimal.id,
    applicant,
    submittedAt: openStayDates[0],
    reasonForAdoption:
      "Working from home now and ready for a companion during the day.",
    householdProfileData: FIXTURE_HOUSEHOLD,
    transitions: [
      {
        status: ApplicationStatus.REVIEWING,
        reason: "Application moved to review.",
        changedById: reviewer.id,
        at: openStayDates[1],
      },
      {
        status: ApplicationStatus.APPROVED,
        reason:
          "Approved after a successful home visit. Please call us to arrange pickup.",
        changedById: reviewer.id,
        at: openStayDates[2],
      },
    ],
  });
  await prisma.animal.update({
    where: { id: approvedAnimal.id },
    data: { listingStatus: AnimalListingStatus.PENDING_ADOPTION },
  });

  
  
  
  const rejectedAnimal = await claimAnimal("REJECTED", publishedWhere);
  await seedApplicationWithHistory({
    animalId: rejectedAnimal.id,
    applicant,
    submittedAt: openStayDates[0],
    reasonForAdoption: "The kids have been asking and we are ready.",
    householdProfileData: FIXTURE_HOUSEHOLD,
    transitions: [
      {
        status: ApplicationStatus.REVIEWING,
        reason: "Application moved to review.",
        changedById: reviewer.id,
        at: openStayDates[1],
      },
      {
        status: ApplicationStatus.REJECTED,
        reason:
          "This dog needs a home without young children. We would be glad to talk about our older cats.",
        changedById: reviewer.id,
        at: openStayDates[2],
      },
    ],
  });

  
  
  const withdrawnAnimal = await claimAnimal(
    "WITHDRAWN (reactivatable)",
    publishedWhere,
  );
  await seedApplicationWithHistory({
    animalId: withdrawnAnimal.id,
    applicant,
    submittedAt: openStayDates[0],
    reasonForAdoption: "Retired and looking for a companion to keep us active.",
    householdProfileData: FIXTURE_HOUSEHOLD,
    transitions: [
      {
        
        
        status: ApplicationStatus.WITHDRAWN,
        reason: "Application withdrawn by user.",
        changedById: applicant.id,
        at: openStayDates[1],
      },
    ],
  });

  
  
  
  
  
  const goneAnimal = await claimAnimal("WITHDRAWN (animal gone)", {
    listingStatus: AnimalListingStatus.ARCHIVED,
    archiveReason: OutcomeType.TRANSFER_OUT,
  });
  await seedApplicationWithHistory({
    animalId: goneAnimal.id,
    applicant,
    submittedAt: withinStay(goneAnimal, 0.2),
    reasonForAdoption: "A friend fostered him and spoke very highly of him.",
    householdProfileData: FIXTURE_HOUSEHOLD,
    transitions: [
      {
        status: ApplicationStatus.WITHDRAWN,
        reason: "Application withdrawn by user.",
        changedById: applicant.id,
        at: withinStay(goneAnimal, 0.6),
      },
    ],
  });

  
  
  
  
  const closedAnimal = await claimAnimal("CLOSED", {
    listingStatus: AnimalListingStatus.ARCHIVED,
    archiveReason: OutcomeType.ADOPTION,
  });
  await seedApplicationWithHistory({
    animalId: closedAnimal.id,
    applicant,
    submittedAt: withinStay(closedAnimal, 0.2),
    reasonForAdoption: "We have wanted a cat for a long time and finally can.",
    householdProfileData: FIXTURE_HOUSEHOLD,
    transitions: [
      {
        status: ApplicationStatus.REVIEWING,
        reason: "Application moved to review.",
        changedById: reviewer.id,
        at: withinStay(closedAnimal, 0.5),
      },
    ],
  });

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  const returnedAnimal = await claimAnimal("CLOSED (animal returned)", {
    listingStatus: AnimalListingStatus.ARCHIVED,
    archiveReason: OutcomeType.ADOPTION,
    intake: { every: { intakeDate: { lte: shelterDayKey(daysAgo(30), seedTimezone) } } },
    Outcome: { every: { outcomeDate: { lte: shelterDayKey(daysAgo(30), seedTimezone) } } },
  });
  await seedApplicationWithHistory({
    animalId: returnedAnimal.id,
    applicant,
    submittedAt: withinStay(returnedAnimal, 0.2),
    reasonForAdoption:
      "We met him at the open day and have not stopped talking about him.",
    householdProfileData: FIXTURE_HOUSEHOLD,
    transitions: [
      {
        status: ApplicationStatus.REVIEWING,
        reason: "Application moved to review.",
        changedById: reviewer.id,
        at: withinStay(returnedAnimal, 0.5),
      },
    ],
  });

  
  
  
  
  const reIntakeDate = daysAgo(20);
  await prisma.intake.create({
    data: {
      animalId: returnedAnimal.id,
      type: IntakeType.OWNER_SURRENDER,
      intakeDate: shelterDayKey(reIntakeDate, seedTimezone),
      staffMemberId: reviewer.id,
    },
  });
  await prisma.animal.update({
    where: { id: returnedAnimal.id },
    data: {
      listingStatus: AnimalListingStatus.DRAFT,
      archiveReason: null,
    },
  });
  await prisma.animalActivityLog.create({
    data: {
      animalId: returnedAnimal.id,
      activityType: AnimalActivityType.INTAKE_PROCESSED,
      changedById: reviewer.id,
      changedAt: reIntakeDate,
      changeSummary: "Animal was re-intaked as owner surrender.",
    },
  });

  
  
  
  const rePublishDate = daysAgo(19);
  await prisma.animal.update({
    where: { id: returnedAnimal.id },
    data: {
      listingStatus: AnimalListingStatus.PUBLISHED,
      publishedAt: rePublishDate,
    },
  });
  await prisma.animalActivityLog.create({
    data: {
      animalId: returnedAnimal.id,
      activityType: AnimalActivityType.STATUS_CHANGE,
      changedById: reviewer.id,
      changedAt: rePublishDate,
      changeSummary: "Listing status changed from DRAFT to PUBLISHED.",
    },
  });

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  const handOverAnimal = await claimAnimal("WITHDRAWN + PENDING (hand-over)", {
    listingStatus: AnimalListingStatus.PUBLISHED,
    intake: { some: {}, every: { intakeDate: { lte: shelterDayKey(daysAgo(20), seedTimezone) } } },
  });
  const handOverDates = [daysAgo(18), daysAgo(16), daysAgo(12), daysAgo(9)];
  await seedApplicationWithHistory({
    animalId: handOverAnimal.id,
    applicant,
    submittedAt: handOverDates[0],
    reasonForAdoption: "A neighbour has one from the same litter and we adore her.",
    householdProfileData: FIXTURE_HOUSEHOLD,
    submittedByStaffId: reviewer.id,
    transitions: [
      {
        status: ApplicationStatus.WITHDRAWN,
        reason: "Applicant called to withdraw.",
        changedById: reviewer.id,
        at: handOverDates[1],
      },
    ],
  });
  await seedApplicationWithHistory({
    animalId: handOverAnimal.id,
    applicant,
    submittedAt: handOverDates[2],
    reasonForAdoption: "We talked it over and would like to apply again.",
    householdProfileData: FIXTURE_HOUSEHOLD,
    submittedByStaffId: reviewer.id,
    lastEdit: { byPersonId: applicant.id, at: handOverDates[3] },
    transitions: [],
  });

  
  
  
  
  
  
  
  
  
  if (
    (await prisma.animal.count({ where: { name: WALK_IN_REAPPLY_ANIMAL_NAME } })) >
    0
  ) {
    throw new Error(
      `"${WALK_IN_REAPPLY_ANIMAL_NAME}" is already an animal name; the walk-in fixture needs a unique one.`,
    );
  }
  await prisma.animal.update({
    where: { id: returnedAnimal.id },
    data: { name: WALK_IN_REAPPLY_ANIMAL_NAME },
  });
  const walkIn = await prisma.person.create({
    data: {
      name: "Casey Reapply",
      email: "casey.reapply@example.com",
      phone: "212-555-0155",
      address: "55 Bleecker St",
      city: "New York",
      state: "NY",
      zipCode: "10012",
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
    },
  });
  await seedApplicationWithHistory({
    animalId: returnedAnimal.id,
    applicant: walkIn,
    submittedAt: withinStay(returnedAnimal, 0.25),
    reasonForAdoption: "We saw him at the adoption fair and could not stop thinking about him.",
    householdProfileData: FIXTURE_HOUSEHOLD,
    submittedByStaffId: reviewer.id,
    transitions: [],
  });

  
  
  
  
  
  
  
  const secondApplicant = await prisma.person.findFirst({
    where: { name: "John Smith", user: { role: Role.USER } },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
    },
  });
  if (!secondApplicant) {
    throw new Error(
      "Expected the seeded 'John Smith' registered user for the adoption application fixtures.",
    );
  }
  const secondApplicantAnimal = await claimAnimal(
    "REVIEWING (second applicant)",
    publishedWhere,
  );
  await seedApplicationWithHistory({
    animalId: secondApplicantAnimal.id,
    applicant: secondApplicant,
    submittedAt: openStayDates[0],
    reasonForAdoption:
      "My flat is quiet and I am home most days — I would like the company.",
    householdProfileData: SECOND_FIXTURE_HOUSEHOLD,
    transitions: [
      {
        status: ApplicationStatus.REVIEWING,
        reason: "Application moved to review.",
        changedById: reviewer.id,
        at: openStayDates[1],
      },
    ],
  });

  console.log(
    `Seeded 12 adoption application fixtures for ${applicant.name} (${applicant.email}), 1 for ${secondApplicant.name} (${secondApplicant.email}), and 1 for ${walkIn.name}.`,
  );
}

async function seedTasks() {
  console.log("Seeding tasks...");
  try {
    const staffMembers = await prisma.person.findMany({
      where: { user: { role: Role.STAFF } },
    });
    const animals = await prisma.animal.findMany();

    if (!staffMembers.length || !animals.length) {
      console.log("No staff or animals found, skipping task seeding.");
      return;
    }

    for (const { daysUntilDue, ...taskData } of taskSeedData) {
      await prisma.task.create({
        data: {
          ...taskData,
          dueDate: shiftDayKey(shelterToday(seedTimezone), daysUntilDue),
          animalId: getRandomItem(animals).id,
          assigneeId: getRandomItem(staffMembers).id,
          createdById: getRandomItem(staffMembers).id,
        },
      });
    }

    
    
    const overdueAssignee =
      staffMembers.find((s) => s.email === "staff1@example.com") ??
      staffMembers[0];
    for (const taskData of overdueTaskSeedData) {
      const animal = animals.find((a) => a.name === taskData.animalName);
      if (!animal) {
        throw new Error(
          `overdueTaskSeedData references animal "${taskData.animalName}", which was not seeded.`,
        );
      }
      const dueDate = shiftDayKey(
        shelterToday(seedTimezone),
        -taskData.daysOverdue,
      );

      await prisma.task.create({
        data: {
          title: taskData.title,
          details: taskData.details,
          status: taskData.status,
          priority: taskData.priority,
          category: taskData.category,
          dueDate,
          animalId: animal.id,
          assigneeId: overdueAssignee.id,
          createdById: overdueAssignee.id,
        },
      });
    }
  } catch (error) {
    console.error("Error seeding tasks:", error);
    throw error;
  }
  console.log("Seeded tasks.");
}







async function seedAiActivityLog() {
  console.log("Seeding AI activity log...");
  try {
    const [staff1, staff2] = await Promise.all([
      prisma.person.findFirst({
        where: { user: { email: "staff1@example.com" } },
      }),
      prisma.person.findFirst({
        where: { user: { email: "staff2@example.com" } },
      }),
    ]);
    if (!staff1 || !staff2) {
      console.log("Staff not found, skipping AI activity log seeding.");
      return;
    }

    const animalByName = async (name: string) =>
      prisma.animal.findFirst({ where: { name } });

    const [frisco, buddy, whiskers] = await Promise.all([
      animalByName("Frisco"),
      animalByName("Buddy"),
      animalByName("Whiskers"),
    ]);
    if (!frisco || !buddy || !whiskers) {
      console.log(
        "Expected animals for AI activity log not found, skipping.",
      );
      return;
    }

    const daysAgo = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return d;
    };

    
    
    const makeTask = (animalId: string, title: string, status: TaskStatus) =>
      prisma.task.create({
        data: {
          title,
          details: "Seeded for the AI activity log demo.",
          status,
          priority: TaskPriority.MEDIUM,
          category: TaskCategory.ADMINISTRATIVE,
          animalId,
          assigneeId: staff1.id,
          createdById: staff1.id,
        },
      });

    const logStatusChange = (
      animalId: string,
      title: string,
      from: TaskStatus,
      to: TaskStatus,
      changedById: string,
      changedAt: Date,
    ) =>
      prisma.animalActivityLog.create({
        data: {
          animalId,
          activityType: AnimalActivityType.TASK_STATUS_CHANGED,
          changedById,
          changedAt,
          changeSummary: `Task "${title}" status changed from ${from} to ${to}.`,
        },
      });

    
    
    const undoable = await makeTask(
      frisco.id,
      "Weigh-in and body condition score",
      TaskStatus.DONE,
    );
    await logStatusChange(
      frisco.id,
      undoable.title,
      TaskStatus.TODO,
      TaskStatus.DONE,
      staff1.id,
      daysAgo(2),
    );
    await prisma.aiActionLog.create({
      data: {
        toolName: "setTaskStatus",
        toolCallId: "seed-toolcall-undoable",
        approvalId: "seed-approval-undoable",
        targetType: AiActionTargetType.TASK,
        targetId: undoable.id,
        input: { taskId: undoable.id, status: TaskStatus.DONE },
        before: { status: TaskStatus.TODO },
        after: { status: TaskStatus.DONE },
        actorId: staff1.id,
        createdAt: daysAgo(2),
      },
    });

    
    
    
    const stale = await makeTask(
      buddy.id,
      "Draft adoption listing copy",
      TaskStatus.DONE,
    );
    await logStatusChange(
      buddy.id,
      stale.title,
      TaskStatus.TODO,
      TaskStatus.IN_PROGRESS,
      staff1.id,
      daysAgo(1),
    );
    await prisma.aiActionLog.create({
      data: {
        toolName: "setTaskStatus",
        toolCallId: "seed-toolcall-stale",
        approvalId: "seed-approval-stale",
        targetType: AiActionTargetType.TASK,
        targetId: stale.id,
        input: { taskId: stale.id, status: TaskStatus.IN_PROGRESS },
        before: { status: TaskStatus.TODO },
        after: { status: TaskStatus.IN_PROGRESS },
        actorId: staff1.id,
        createdAt: daysAgo(1),
      },
    });
    await logStatusChange(
      buddy.id,
      stale.title,
      TaskStatus.IN_PROGRESS,
      TaskStatus.DONE,
      staff2.id,
      daysAgo(0),
    );

    
    
    const undone = await makeTask(
      whiskers.id,
      "Confirm microchip registration",
      TaskStatus.TODO,
    );
    await prisma.aiActionLog.create({
      data: {
        toolName: "setTaskStatus",
        toolCallId: "seed-toolcall-undone",
        approvalId: "seed-approval-undone",
        targetType: AiActionTargetType.TASK,
        targetId: undone.id,
        input: { taskId: undone.id, status: TaskStatus.DONE },
        before: { status: TaskStatus.TODO },
        after: { status: TaskStatus.DONE },
        actorId: staff2.id,
        createdAt: daysAgo(4),
        undoneAt: daysAgo(3),
      },
    });
    await logStatusChange(
      whiskers.id,
      undone.title,
      TaskStatus.TODO,
      TaskStatus.DONE,
      staff2.id,
      daysAgo(4),
    );
    await logStatusChange(
      whiskers.id,
      undone.title,
      TaskStatus.DONE,
      TaskStatus.TODO,
      staff1.id,
      daysAgo(3),
    );
  } catch (error) {
    console.error("Error seeding AI activity log:", error);
    throw error;
  }
  console.log("Seeded AI activity log.");
}































async function seedNoteAudit() {
  console.log("Seeding note audit fixtures...");

  const [olivia, benjamin] = await Promise.all([
    prisma.person.findFirst({
      where: { user: { email: "staff1@example.com" } },
    }),
    prisma.person.findFirst({
      where: { user: { email: "staff2@example.com" } },
    }),
  ]);
  if (!olivia || !benjamin) {
    throw new Error(
      "seedNoteAudit: staff fixtures (staff1@example.com / staff2@example.com) not found.",
    );
  }

  const [frisco, buddy] = await Promise.all([
    prisma.animal.findFirst({ where: { name: "Frisco" } }),
    prisma.animal.findFirst({ where: { name: "Buddy" } }),
  ]);
  const [janeDoe, johnSmith, patMislinked] = await Promise.all([
    prisma.person.findFirst({ where: { email: "surrenderer1@example.com" } }),
    prisma.person.findFirst({ where: { email: "finder1@example.com" } }),
    prisma.person.findFirst({ where: { email: "pat.mislinked@example.com" } }),
  ]);
  const [cityAnimalControl, secondChanceRescue, downtownVet] = await Promise.all([
    prisma.partner.findFirst({ where: { name: "City Animal Control" } }),
    prisma.partner.findFirst({ where: { name: "Second Chance Rescue" } }),
    prisma.partner.findFirst({ where: { name: "Downtown Veterinary Clinic" } }),
  ]);
  if (
    !frisco ||
    !buddy ||
    !janeDoe ||
    !johnSmith ||
    !cityAnimalControl ||
    !secondChanceRescue ||
    !downtownVet
  ) {
    throw new Error(
      "seedNoteAudit: expected named animal / person / partner fixtures not found.",
    );
  }

  
  
  
  const friscoNote = await seedAnimalNote({
    animalId: frisco.id,
    authorId: olivia.id,
    category: NoteCategory.BEHAVIORAL,
    content:
      "Startles at the hose reel on A-block but recovers within a minute. No resource guarding at meals.",
    createdAt: daysAgo(6),
  });
  await prisma.$transaction(async (tx) => {
    await tx.animalNote.update({
      where: { id: friscoNote },
      data: {
        category: NoteCategory.ADOPTION_UPDATE,
        content:
          "Meet-and-greet with an approved adopter went well. Moving to a trial adoption next week.",
        lastEditedById: benjamin.id,
        lastEditedAt: new Date(),
      },
    });
    await recordNoteMutation(tx, {
      targetType: NoteTargetType.ANIMAL,
      targetId: friscoNote,
      action: NoteEventAction.EDITED,
      actorId: benjamin.id,
      animalId: frisco.id,
      categoryLabel: formatSingleEnumOption(NoteCategory.ADOPTION_UPDATE),
    });
  });

  
  
  
  const buddyNote = await seedAnimalNote({
    animalId: buddy.id,
    authorId: olivia.id,
    category: NoteCategory.MEDICAL,
    content: "Kennel cough suspected — starting doxycycline, recheck in a week.",
    createdAt: daysAgo(9),
  });
  await prisma.$transaction(async (tx) => {
    await tx.animalNote.update({
      where: { id: buddyNote },
      data: {
        deletedAt: new Date(),
        lastEditedById: olivia.id,
        lastEditedAt: new Date(),
      },
    });
    await recordNoteMutation(tx, {
      targetType: NoteTargetType.ANIMAL,
      targetId: buddyNote,
      action: NoteEventAction.DELETED,
      actorId: olivia.id,
      animalId: buddy.id,
      categoryLabel: formatSingleEnumOption(NoteCategory.MEDICAL),
    });
  });
  await prisma.$transaction(async (tx) => {
    await tx.animalNote.update({
      where: { id: buddyNote },
      data: {
        deletedAt: null,
        lastEditedById: benjamin.id,
        lastEditedAt: new Date(),
      },
    });
    await recordNoteMutation(tx, {
      targetType: NoteTargetType.ANIMAL,
      targetId: buddyNote,
      action: NoteEventAction.RESTORED,
      actorId: benjamin.id,
      animalId: buddy.id,
      categoryLabel: formatSingleEnumOption(NoteCategory.MEDICAL),
    });
  });

  
  await seedPersonNote({
    personId: janeDoe.id,
    authorId: benjamin.id,
    content:
      "Called about the return-to-owner paperwork for her cat. Front-desk copy mailed 6/12.",
    createdAt: daysAgo(5),
  });
  await seedPersonNote({
    personId: johnSmith.id,
    authorId: olivia.id,
    content:
      "Found the stray on Court St; happy to be listed as the finder contact if the owner turns up.",
    createdAt: daysAgo(8),
  });
  
  
  
  if (patMislinked) {
    await seedPersonNote({
      personId: patMislinked.id,
      authorId: olivia.id,
      content:
        "Came in about the grey tabby in the window. Asked us to call the landline, not email.",
      createdAt: daysAgo(9),
    });
  }
  
  const janeNoteToEdit = await seedPersonNote({
    personId: janeDoe.id,
    authorId: olivia.id,
    content: "Interested in fostering once her lease renews in the spring.",
    createdAt: daysAgo(12),
  });
  await prisma.$transaction(async (tx) => {
    await tx.personNote.update({
      where: { id: janeNoteToEdit },
      data: {
        content:
          "Lease renewed early — cleared to foster. Sent the foster application on 6/14.",
        lastEditedById: benjamin.id,
        lastEditedAt: new Date(),
      },
    });
    await recordNoteMutation(tx, {
      targetType: NoteTargetType.PERSON,
      targetId: janeNoteToEdit,
      action: NoteEventAction.EDITED,
      actorId: benjamin.id,
    });
  });

  
  await seedPartnerNote({
    partnerId: downtownVet.id,
    authorId: olivia.id,
    content:
      "After-hours emergencies go to the Riverside branch, not this location — front desk confirmed.",
    createdAt: daysAgo(7),
  });
  
  const cityNoteToEdit = await seedPartnerNote({
    partnerId: cityAnimalControl.id,
    authorId: olivia.id,
    content: "Transfer intake days are Tuesday and Thursday mornings only.",
    createdAt: daysAgo(14),
  });
  await prisma.$transaction(async (tx) => {
    await tx.partnerNote.update({
      where: { id: cityNoteToEdit },
      data: {
        content:
          "Transfer intake now Monday/Wednesday/Friday mornings; email the shift lead 24h ahead.",
        lastEditedById: benjamin.id,
        lastEditedAt: new Date(),
      },
    });
    await recordNoteMutation(tx, {
      targetType: NoteTargetType.PARTNER,
      targetId: cityNoteToEdit,
      action: NoteEventAction.EDITED,
      actorId: benjamin.id,
    });
  });
  
  
  const rescueNote = await seedPartnerNote({
    partnerId: secondChanceRescue.id,
    authorId: olivia.id,
    content: "Primary contact Sarah is on parental leave until August.",
    createdAt: daysAgo(10),
  });
  await prisma.$transaction(async (tx) => {
    await tx.partnerNote.update({
      where: { id: rescueNote },
      data: {
        deletedAt: new Date(),
        lastEditedById: olivia.id,
        lastEditedAt: new Date(),
      },
    });
    await recordNoteMutation(tx, {
      targetType: NoteTargetType.PARTNER,
      targetId: rescueNote,
      action: NoteEventAction.DELETED,
      actorId: olivia.id,
    });
  });
  await prisma.$transaction(async (tx) => {
    await tx.partnerNote.update({
      where: { id: rescueNote },
      data: {
        deletedAt: null,
        lastEditedById: benjamin.id,
        lastEditedAt: new Date(),
      },
    });
    await recordNoteMutation(tx, {
      targetType: NoteTargetType.PARTNER,
      targetId: rescueNote,
      action: NoteEventAction.RESTORED,
      actorId: benjamin.id,
    });
  });

  console.log("Seeded note audit fixtures.");
}





async function seedAnimalNote(opts: {
  animalId: string;
  authorId: string;
  category: NoteCategory;
  content: string;
  createdAt: Date;
}): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const note = await tx.animalNote.create({
      data: {
        animalId: opts.animalId,
        authorId: opts.authorId,
        category: opts.category,
        content: opts.content,
        createdAt: opts.createdAt,
      },
      select: { id: true },
    });
    await recordNoteMutation(tx, {
      targetType: NoteTargetType.ANIMAL,
      targetId: note.id,
      action: NoteEventAction.CREATED,
      actorId: opts.authorId,
      animalId: opts.animalId,
      categoryLabel: formatSingleEnumOption(opts.category),
    });
    return note.id;
  });
}



async function seedPersonNote(opts: {
  personId: string;
  authorId: string;
  content: string;
  createdAt: Date;
}): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const note = await tx.personNote.create({
      data: {
        personId: opts.personId,
        authorId: opts.authorId,
        content: opts.content,
        createdAt: opts.createdAt,
      },
      select: { id: true },
    });
    await recordNoteMutation(tx, {
      targetType: NoteTargetType.PERSON,
      targetId: note.id,
      action: NoteEventAction.CREATED,
      actorId: opts.authorId,
    });
    return note.id;
  });
}



async function seedPartnerNote(opts: {
  partnerId: string;
  authorId: string;
  content: string;
  createdAt: Date;
}): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const note = await tx.partnerNote.create({
      data: {
        partnerId: opts.partnerId,
        authorId: opts.authorId,
        content: opts.content,
        createdAt: opts.createdAt,
      },
      select: { id: true },
    });
    await recordNoteMutation(tx, {
      targetType: NoteTargetType.PARTNER,
      targetId: note.id,
      action: NoteEventAction.CREATED,
      actorId: opts.authorId,
    });
    return note.id;
  });
}

async function clearDatabase() {
  console.log("Clearing existing data...");

  await prisma.medicationLog.deleteMany();
  await prisma.medicationSchedule.deleteMany();

  
  
  await prisma.assessmentAnswer.deleteMany();
  
  
  await prisma.animalCharacteristic.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.assessmentTemplateField.deleteMany();
  await prisma.assessmentTemplate.deleteMany();
  
  
  
  await prisma.aiActionLog.deleteMany();
  await prisma.animalActivityLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.intake.deleteMany();
  await prisma.outcome.deleteMany();
  await prisma.applicationStatusHistory.deleteMany();
  await prisma.adoptionApplication.deleteMany();

  
  
  
  await prisma.fosterPlacement.deleteMany();
  
  await prisma.fosterApplication.deleteMany();

  await prisma.animalNote.deleteMany();
  await prisma.personNote.deleteMany();
  await prisma.partnerNote.deleteMany();
  
  
  
  
  
  await prisma.noteEvent.deleteMany();
  await prisma.partnerContact.deleteMany();
  await prisma.favorite.deleteMany();

  await prisma.fosterProfile.deleteMany();
  await prisma.householdProfile.deleteMany();

  await prisma.animalImage.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.animal.deleteMany();

  
  
  await prisma.unit.deleteMany();
  await prisma.location.deleteMany();

  await prisma.partner.deleteMany();

  await prisma.breed.deleteMany();
  await prisma.species.deleteMany();
  await prisma.color.deleteMany();
  await prisma.characteristic.deleteMany();

  
  
  
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();
  await prisma.person.deleteMany();

  console.log("Cleared existing data.");
}







async function assertAnimalLifecycleConsistency() {
  console.log("Verifying animal lifecycle consistency...");

  const animals = await prisma.animal.findMany({
    select: {
      id: true,
      name: true,
      listingStatus: true,
      archiveReason: true,
      intake: { select: { intakeDate: true } },
      Outcome: {
        where: { reversedAt: null },
        select: {
          outcomeDate: true,
          type: true,
          ownerId: true,
          destinationPartnerId: true,
          adoptionApplicationId: true,
        },
      },
    },
  });

  const violations: string[] = [];
  const today = shelterToday(seedTimezone);

  for (const animal of animals) {
    const events = [
      ...animal.intake.map((i) => ({
        kind: "intake" as const,
        date: calendarDay(i.intakeDate),
      })),
      ...animal.Outcome.map((o) => ({
        kind: "outcome" as const,
        date: calendarDay(o.outcomeDate),
      })),
    ];
    const { isInCare, stays } = computeStays(events, today);
    const lastStay = stays[stays.length - 1];
    const isArchived = animal.listingStatus === AnimalListingStatus.ARCHIVED;
    const label = `"${animal.name}" (${animal.id})`;

    
    
    
    
    
    
    
    
    for (const timelineBreak of findTimelineBreaks(events)) {
      violations.push(
        timelineBreak.kind === "leading-outcome"
          ? `${label} has an outcome (${timelineBreak.event.date}) with no preceding open intake.`
          : `${label} has two consecutive ${timelineBreak.second.kind}s with no ${
              timelineBreak.second.kind === "intake" ? "outcome" : "intake"
            } between them (${timelineBreak.first.date}, ${timelineBreak.second.date}).`,
      );
    }

    if (isArchived) {
      if (isInCare || !lastStay || lastStay.outcomeDate === null) {
        violations.push(
          `${label} is ARCHIVED but its latest event is not a closing outcome.`,
        );
      }
      if (!animal.archiveReason) {
        violations.push(`${label} is ARCHIVED but has no archiveReason.`);
      }
    } else if (!isInCare) {
      violations.push(
        `${label} is ${animal.listingStatus} but its latest event is a closing outcome with no following intake (it should be ARCHIVED).`,
      );
    }

    
    
    
    for (const outcome of animal.Outcome) {
      if (outcome.type === OutcomeType.RETURN_TO_OWNER && !outcome.ownerId) {
        violations.push(
          `${label} has a RETURN_TO_OWNER outcome with no ownerId.`,
        );
      }
      if (outcome.type === OutcomeType.TRANSFER_OUT && !outcome.destinationPartnerId) {
        violations.push(
          `${label} has a TRANSFER_OUT outcome with no destinationPartnerId.`,
        );
      }
      if (outcome.type === OutcomeType.ADOPTION && !outcome.adoptionApplicationId) {
        violations.push(
          `${label} has an ADOPTION outcome with no adoptionApplicationId.`,
        );
      }
    }
  }

  
  
  
  
  
  
  const weightCached = await prisma.animal.findMany({
    where: { currentWeightGrams: { not: null } },
    select: {
      id: true,
      name: true,
      currentWeightGrams: true,
      
      vitalsLogs: {
        where: { deletedAt: null, weightGrams: { not: null } },
        orderBy: LATEST_ENTRY_ORDER,
        take: 1,
        select: { weightGrams: true },
      },
    },
  });

  for (const animal of weightCached) {
    const label = `"${animal.name}" (${animal.id})`;
    const latest = animal.vitalsLogs[0];
    if (!latest) {
      violations.push(
        `${label} has currentWeightGrams=${animal.currentWeightGrams} but no non-deleted VitalsLog with a weight behind it.`,
      );
    } else if (latest.weightGrams !== animal.currentWeightGrams) {
      violations.push(
        `${label} has currentWeightGrams=${animal.currentWeightGrams} but its latest weigh-in is ${latest.weightGrams}.`,
      );
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `Animal lifecycle consistency check failed for ${violations.length} of ${animals.length} animal(s):\n` +
        violations.join("\n"),
    );
  }

  console.log(`Verified lifecycle consistency for ${animals.length} animals.`);
}


async function seedPublicFavorites() {
  console.log("Seeding favorites for the public pages...");

  const owner = await prisma.person.findFirst({
    where: { user: { email: "surrenderer1@example.com" } },
  });

  if (!owner) {
    throw new Error(
      "No person found for surrenderer1@example.com. Ensure persons and users are seeded before favorites.",
    );
  }

  const pick = (listingStatus: AnimalListingStatus, take: number) =>
    prisma.animal.findMany({
      where: { listingStatus },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true },
      take,
    });

  
  const [published, pending, archived] = await Promise.all([
    pick(AnimalListingStatus.PUBLISHED, 5),
    pick(AnimalListingStatus.PENDING_ADOPTION, 1),
    pick(AnimalListingStatus.ARCHIVED, 2),
  ]);

  const animals = [...published, ...pending, ...archived];

  await prisma.favorite.createMany({
    data: animals.map((animal) => ({
      userId: owner.id,
      animalId: animal.id,
    })),
    skipDuplicates: true,
  });

  console.log(
    `Seeded ${animals.length} favorites for ${owner.name} (${archived.length} unavailable).`,
  );
}







async function seedAnimalCharacteristics() {
  console.log("Seeding animal characteristics with provenance...");

  if (pendingCharacteristicAssignments.length === 0) {
    console.log("No characteristic assignments to seed.");
    return;
  }

  const staff = await prisma.person.findMany({
    where: { user: { role: Role.STAFF } },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: { id: true, user: { select: { email: true } } },
  });
  if (staff.length === 0) {
    console.log("No staff found, skipping characteristic provenance seeding.");
    return;
  }
  const assigner =
    staff.find((s) => s.user?.email === "staff1@example.com") ?? staff[0];

  let rows = 0;
  for (const assignment of pendingCharacteristicAssignments) {
    for (const characteristicId of assignment.characteristicIds) {
      await prisma.animalCharacteristic.create({
        data: {
          animalId: assignment.animalId,
          characteristicId,
          assignedById: assigner.id,
          assignedAt: assignment.assignedAt,
        },
      });
      rows += 1;
    }
  }

  console.log(
    `Seeded ${rows} characteristic assignments across ${pendingCharacteristicAssignments.length} animals.`,
  );
}





async function seedAssessmentTemplates() {
  console.log("Seeding assessment templates from the registry...");

  const store: TemplateRegistryStore = {
    async upsertTemplate(input) {
      return prisma.assessmentTemplate.upsert({
        where: { key_version: { key: input.key, version: input.version } },
        create: {
          key: input.key,
          version: input.version,
          name: input.name,
          description: input.description,
          species: input.species,
          stage: input.stage,
          isActive: input.isActive,
        },
        update: {
          name: input.name,
          description: input.description,
          species: input.species,
          stage: input.stage,
          isActive: input.isActive,
        },
        select: { id: true },
      });
    },
    async upsertField(input) {
      await prisma.assessmentTemplateField.upsert({
        where: {
          templateId_key: { templateId: input.templateId, key: input.key },
        },
        create: {
          templateId: input.templateId,
          key: input.key,
          label: input.label,
          fieldType: input.fieldType,
          options: input.options,
          concerningValues: input.concerningValues,
          isRequired: input.isRequired,
          order: input.order,
          proposesCharacteristicId: input.proposesCharacteristicId,
          proposesOnValues: input.proposesOnValues,
        },
        update: {
          label: input.label,
          fieldType: input.fieldType,
          options: input.options,
          concerningValues: input.concerningValues,
          isRequired: input.isRequired,
          order: input.order,
          proposesCharacteristicId: input.proposesCharacteristicId,
          proposesOnValues: input.proposesOnValues,
        },
      });
    },
    async findProposedCharacteristicId(templateId, key) {
      const row = await prisma.assessmentTemplateField.findUnique({
        where: { templateId_key: { templateId, key } },
        select: { proposesCharacteristicId: true },
      });
      return row?.proposesCharacteristicId ?? null;
    },
    async resolveCharacteristicId(name) {
      const row = await prisma.characteristic.findFirst({
        where: { name, deletedAt: null },
        select: { id: true },
      });
      return row?.id ?? null;
    },
  };

  const result = await syncTemplateRegistry(store);
  console.log(
    `Seeded ${result.templates} assessment templates (${result.fields} fields).`,
  );
}




interface SeedAnswer {
  fieldKey: string;
  value: string;
  valueNumber?: number;
  notes?: string;
}

interface SeedAssessment {
  animalName: string;
  templateKey: string;
  signal: AssessmentSignal;
  observedAt: Date;
  summary: string;
  answers: SeedAnswer[];
  
  
  
  sourcesCharacteristics?: string[];
  
  
  deletedAt?: Date;
}








interface HandAssignedCharacteristic {
  animalName: string;
  characteristic: string;
  assignedAt: Date;
}






interface ClearedCharacteristic {
  animalName: string;
  characteristic: string;
}

const clearedCharacteristics: ClearedCharacteristic[] = [
  
  { animalName: "Frisco", characteristic: "Good with other dogs" },
  
  
  { animalName: "Buddy", characteristic: "Good with cats" },
];

const handAssignedCharacteristics: HandAssignedCharacteristic[] = [
  {
    animalName: "Frisco",
    characteristic: "Good with cats",
    assignedAt: daysAgo(35),
  },
  {
    animalName: "Rocket",
    characteristic: "Good with other dogs",
    assignedAt: daysAgo(3),
  },
  {
    animalName: "Buddy",
    characteristic: "Good with other dogs",
    assignedAt: daysAgo(15),
  },
  {
    
    
    
    animalName: "Flash",
    characteristic: "Good with other dogs",
    assignedAt: daysAgo(20),
  },
];





const assessmentSeedData: SeedAssessment[] = [
  {
    animalName: "Frisco",
    templateKey: "INTAKE_MEDICAL",
    signal: AssessmentSignal.NO_CONCERNS,
    observedAt: daysAgo(38),
    summary: "Healthy adult dog, no findings on the intake exam.",
    answers: [
      { fieldKey: "dental", value: "Mild tartar" },
      { fieldKey: "parasites", value: "None seen" },
      { fieldKey: "heart_lungs", value: "Clear" },
    ],
  },
  {
    animalName: "Frisco",
    templateKey: "INTAKE_BEHAVIORAL",
    signal: AssessmentSignal.NO_CONCERNS,
    observedAt: daysAgo(36),
    summary:
      "Social, soft, no resource guarding. Solicits attention from handlers.",
    answers: [
      { fieldKey: "kennel_presence", value: "Alert" },
      { fieldKey: "handler_sociability", value: "Solicits attention" },
      { fieldKey: "food_guarding", value: "None" },
      { fieldKey: "body_handling", value: "Tolerates all" },
      { fieldKey: "arousal_recovery", value: "Quick" },
    ],
  },
  {
    
    
    
    animalName: "Frisco",
    templateKey: "CAT_TEST",
    signal: AssessmentSignal.ESCALATE,
    observedAt: daysAgo(9),
    summary:
      "Hard fixation and sustained lunging at the barrier; could not be redirected. Not safe to place with cats — flag before any listing claims 'good with cats'.",
    answers: [
      { fieldKey: "visual_response", value: "Lunges or barks" },
      {
        fieldKey: "proximity_response",
        value: "Predatory (stalk, hard stare, lunge)",
        notes: "Whale eye, stiff tail, would not take food.",
      },
      { fieldKey: "recovery", value: "Cannot redirect" },
      { fieldKey: "recommendation", value: "Not cat-safe" },
    ],
  },
  {
    
    
    animalName: "Frisco",
    templateKey: "DOG_INTRO",
    signal: AssessmentSignal.NO_CONCERNS,
    observedAt: daysAgo(6),
    summary:
      "Loose, social greetings with the helper dog; appropriate play with good breaks. Reads as dog-social.",
    answers: [
      { fieldKey: "greeting_style", value: "Loose and social" },
      { fieldKey: "play_style", value: "Appropriate, takes breaks" },
      { fieldKey: "correction_response", value: "Defers appropriately" },
      { fieldKey: "resource_around_dogs", value: "Neutral" },
      { fieldKey: "recommendation", value: "Dog-social" },
    ],
  },
  {
    animalName: "Buddy",
    templateKey: "INTAKE_BEHAVIORAL",
    signal: AssessmentSignal.MONITOR,
    observedAt: daysAgo(30),
    summary:
      "Mild food guarding — stiffens over a high-value chew but disengages when asked. Worth watching, not a placement blocker.",
    answers: [
      { fieldKey: "kennel_presence", value: "Relaxed" },
      { fieldKey: "handler_sociability", value: "Solicits attention" },
      {
        fieldKey: "food_guarding",
        value: "Stiffens",
        notes: "Freezes for ~2s over a bully stick, then releases.",
      },
      { fieldKey: "body_handling", value: "Tolerates all" },
      { fieldKey: "arousal_recovery", value: "Moderate" },
    ],
  },
  {
    animalName: "Buddy",
    templateKey: "DAILY_ROUNDS",
    signal: AssessmentSignal.NO_CONCERNS,
    observedAt: daysAgo(12),
    summary: "Bright, eating well, no concerns on rounds.",
    answers: [
      { fieldKey: "appetite", value: "Normal" },
      { fieldKey: "stool", value: "Normal" },
      { fieldKey: "energy", value: "Bright" },
      { fieldKey: "respiratory", value: "Normal" },
      { fieldKey: "demeanor", value: "Comfortable" },
    ],
  },
  {
    
    
    animalName: "Buddy",
    templateKey: "DOG_INTRO",
    signal: AssessmentSignal.NO_CONCERNS,
    observedAt: daysAgo(5),
    summary:
      "Loose greetings, took a natural play break, easy recall off the helper dog. Reads as dog-social.",
    answers: [
      { fieldKey: "greeting_style", value: "Loose and social" },
      { fieldKey: "play_style", value: "Appropriate, takes breaks" },
      { fieldKey: "correction_response", value: "Defers appropriately" },
      { fieldKey: "resource_around_dogs", value: "Neutral" },
      { fieldKey: "recommendation", value: "Dog-social" },
    ],
  },
  {
    animalName: "Whiskers",
    templateKey: "INTAKE_MEDICAL",
    signal: AssessmentSignal.NO_CONCERNS,
    observedAt: daysAgo(50),
    summary: "Healthy senior-ish cat; moderate dental disease noted.",
    answers: [
      { fieldKey: "dental", value: "Moderate disease" },
      { fieldKey: "parasites", value: "Treated" },
      { fieldKey: "heart_lungs", value: "Clear" },
    ],
  },
  {
    animalName: "Whiskers",
    templateKey: "HANDLING",
    signal: AssessmentSignal.NO_CONCERNS,
    observedAt: daysAgo(48),
    summary: "Easy to handle all over; no restraint issues.",
    answers: [
      { fieldKey: "collar_leash", value: "Accepts readily" },
      { fieldKey: "restraint", value: "Relaxed" },
      { fieldKey: "paws_nails", value: "No concern" },
      { fieldKey: "ears_mouth", value: "No concern" },
      { fieldKey: "overall_sensitivity", value: "Low" },
    ],
  },
  {
    animalName: "Leo",
    templateKey: "INTAKE_MEDICAL",
    signal: AssessmentSignal.FOLLOW_UP,
    observedAt: daysAgo(20),
    summary:
      "Severe dental disease — needs a dental before the profile goes public.",
    answers: [
      {
        fieldKey: "dental",
        value: "Severe disease",
        notes: "Multiple fractured teeth, gingival recession.",
      },
      { fieldKey: "parasites", value: "Ear mites" },
      { fieldKey: "heart_lungs", value: "Clear" },
    ],
  },
  {
    
    
    animalName: "Daisy",
    templateKey: "CAT_TEST",
    signal: AssessmentSignal.ESCALATE,
    observedAt: daysAgo(24),
    summary:
      "Fixated at the barrier a week after surgery and couldn't be called off — she can't hear the cue. Not safe with cats as she is now; retest once she's off pain medication and on hand signals.",
    answers: [
      { fieldKey: "visual_response", value: "Fixated" },
      { fieldKey: "proximity_response", value: "Overstimulated" },
      { fieldKey: "recovery", value: "Cannot redirect" },
      { fieldKey: "recommendation", value: "Not cat-safe" },
    ],
  },
  {
    animalName: "Daisy",
    templateKey: "CAT_TEST",
    signal: AssessmentSignal.NO_CONCERNS,
    observedAt: daysAgo(10),
    summary:
      "Calm and disengaged behind the barrier and at proximity; glanced at the cat and looked away. Safe to list as good with cats.",
    answers: [
      { fieldKey: "visual_response", value: "Curious and calm" },
      { fieldKey: "proximity_response", value: "Mild interest" },
      { fieldKey: "recovery", value: "Redirects easily" },
      { fieldKey: "recommendation", value: "Cat-safe" },
    ],
    sourcesCharacteristics: ["Good with cats"],
  },
  {
    animalName: "Daisy",
    templateKey: "DOG_INTRO",
    signal: AssessmentSignal.MONITOR,
    observedAt: daysAgo(15),
    summary:
      "Social but rude — bulldozes greetings and misses cut-off signals. Fine with a tolerant playmate, needs slow intros otherwise.",
    answers: [
      { fieldKey: "greeting_style", value: "Over-the-top but not aggressive" },
      { fieldKey: "play_style", value: "Rude but recovers" },
      { fieldKey: "correction_response", value: "Defers appropriately" },
      { fieldKey: "resource_around_dogs", value: "Neutral" },
      { fieldKey: "recommendation", value: "Needs slow introductions" },
    ],
  },
  {
    
    
    animalName: "Rocket",
    templateKey: "DOG_INTRO",
    signal: AssessmentSignal.MONITOR,
    observedAt: daysAgo(21),
    summary:
      "Stiff and shut down on his second day in; froze when the helper dog sniffed him and never offered play. Recommend a solo-dog home for now.",
    answers: [
      { fieldKey: "greeting_style", value: "Tense" },
      { fieldKey: "play_style", value: "No interest in play" },
      { fieldKey: "correction_response", value: "Freezes" },
      { fieldKey: "resource_around_dogs", value: "Neutral" },
      { fieldKey: "recommendation", value: "Solo-dog home" },
    ],
  },
  {
    
    
    
    
    animalName: "Daisy",
    templateKey: "DOG_INTRO",
    signal: AssessmentSignal.NO_CONCERNS,
    observedAt: daysAgo(8),
    summary:
      "Easy, loose greeting with the helper dog and polite play with plenty of breaks. Dog-social.",
    answers: [
      { fieldKey: "greeting_style", value: "Loose and social" },
      { fieldKey: "play_style", value: "Appropriate, takes breaks" },
      { fieldKey: "correction_response", value: "Defers appropriately" },
      { fieldKey: "resource_around_dogs", value: "Neutral" },
      { fieldKey: "recommendation", value: "Dog-social" },
    ],
    sourcesCharacteristics: ["Good with other dogs"],
    deletedAt: daysAgo(6),
  },
  {
    
    animalName: "Fido",
    templateKey: "DAILY_ROUNDS",
    signal: AssessmentSignal.ESCALATE,
    observedAt: daysAgo(2),
    summary:
      "Off his food for a second day and flat in the kennel. Escalated to the vet team.",
    answers: [
      { fieldKey: "appetite", value: "Not eating" },
      { fieldKey: "stool", value: "Normal" },
      { fieldKey: "energy", value: "Lethargic" },
      { fieldKey: "respiratory", value: "Normal" },
      { fieldKey: "demeanor", value: "High stress" },
    ],
  },
  {
    
    animalName: "Flash",
    templateKey: "DOG_INTRO",
    signal: AssessmentSignal.MONITOR,
    observedAt: daysAgo(14),
    summary:
      "Hard stare and a stiff approach; went over the top of the helper dog twice. Solo-dog home.",
    answers: [
      { fieldKey: "greeting_style", value: "Tense" },
      { fieldKey: "play_style", value: "Bullying" },
      { fieldKey: "correction_response", value: "Escalates" },
      { fieldKey: "resource_around_dogs", value: "Neutral" },
      { fieldKey: "recommendation", value: "Solo-dog home" },
    ],
  },
];

async function seedAssessments() {
  console.log("Seeding assessments...");

  const staff = await prisma.person.findMany({
    where: { user: { role: Role.STAFF } },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: { id: true, user: { select: { email: true } } },
  });
  if (staff.length === 0) {
    console.log("No staff found, skipping assessment seeding.");
    return;
  }
  const assessor =
    staff.find((s) => s.user?.email === "staff1@example.com") ?? staff[0];

  const animalNames = [
    ...new Set([
      ...assessmentSeedData.map((a) => a.animalName),
      ...handAssignedCharacteristics.map((h) => h.animalName),
      ...clearedCharacteristics.map((c) => c.animalName),
    ]),
  ];
  const animals = await prisma.animal.findMany({
    where: { name: { in: animalNames } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, name: true, species: { select: { name: true } } },
  });
  const animalByName = new Map<string, (typeof animals)[number]>();
  for (const animal of animals) {
    if (!animalByName.has(animal.name)) animalByName.set(animal.name, animal);
  }

  const templates = await prisma.assessmentTemplate.findMany({
    where: { isActive: true },
    select: {
      id: true,
      key: true,
      name: true,
      version: true,
      species: true,
      fields: {
        select: {
          id: true,
          key: true,
          label: true,
          concerningValues: true,
          proposesCharacteristicId: true,
        },
      },
    },
  });
  const templateByKey = new Map(templates.map((t) => [t.key, t]));

  const sourcedNames = [
    ...new Set([
      ...assessmentSeedData.flatMap((a) => a.sourcesCharacteristics ?? []),
      ...handAssignedCharacteristics.map((h) => h.characteristic),
      ...clearedCharacteristics.map((c) => c.characteristic),
    ]),
  ];
  const characteristicIdByName = new Map(
    (
      await prisma.characteristic.findMany({
        where: { name: { in: sourcedNames } },
        select: { id: true, name: true },
      })
    ).map((c) => [c.name, c.id]),
  );

  let created = 0;
  for (const spec of assessmentSeedData) {
    const animal = animalByName.get(spec.animalName);
    const template = templateByKey.get(spec.templateKey);
    if (!animal || !template) {
      throw new Error(
        `assessmentSeedData references ${spec.animalName}/${spec.templateKey}, which was not seeded.`,
      );
    }
    const registryDef = getActiveTemplate(spec.templateKey);
    if (
      registryDef?.species &&
      animal.species.name !== registryDef.species
    ) {
      throw new Error(
        `${spec.templateKey} is a ${registryDef.species} template but ${spec.animalName} is a ${animal.species.name}.`,
      );
    }

    const fieldByKey = new Map(template.fields.map((f) => [f.key, f]));

    await prisma.$transaction(async (tx) => {
      const assessment = await tx.assessment.create({
        data: {
          animalId: animal.id,
          templateId: template.id,
          assessorId: assessor.id,
          observedAt: spec.observedAt,
          signal: spec.signal,
          summary: spec.summary,
          deletedAt: spec.deletedAt ?? null,
        },
        select: { id: true },
      });

      for (const answer of spec.answers) {
        const field = fieldByKey.get(answer.fieldKey);
        if (!field) {
          throw new Error(
            `${spec.templateKey} has no field "${answer.fieldKey}".`,
          );
        }
        await tx.assessmentAnswer.create({
          data: {
            assessmentId: assessment.id,
            templateFieldId: field.id,
            questionLabel: field.label,
            value: answer.value,
            valueNumber: answer.valueNumber ?? null,
            notes: answer.notes ?? null,
          },
        });
      }

      await tx.animalActivityLog.create({
        data: {
          animalId: animal.id,
          activityType: AnimalActivityType.ASSESSMENT_COMPLETED,
          changedById: assessor.id,
          changedAt: spec.observedAt,
          changeSummary: `${template.name} assessment recorded — ${formatSingleEnumOption(
            spec.signal,
          )}.`,
        },
      });
      if (spec.deletedAt) {
        await tx.animalActivityLog.create({
          data: {
            animalId: animal.id,
            activityType: AnimalActivityType.FIELD_UPDATE,
            changedById: assessor.id,
            changedAt: spec.deletedAt,
            changeSummary: "An assessment was deleted.",
          },
        });
      }

      
      
      
      for (const name of spec.sourcesCharacteristics ?? []) {
        const characteristicId = characteristicIdByName.get(name);
        if (!characteristicId) {
          throw new Error(
            `assessmentSeedData sources "${name}", which is not in the characteristic catalog.`,
          );
        }
        await tx.animalCharacteristic.upsert({
          where: {
            animalId_characteristicId: {
              animalId: animal.id,
              characteristicId,
            },
          },
          create: {
            animalId: animal.id,
            characteristicId,
            assignedById: assessor.id,
            assignedAt: spec.observedAt,
            sourceAssessmentId: assessment.id,
          },
          update: {
            assignedById: assessor.id,
            assignedAt: spec.observedAt,
            sourceAssessmentId: assessment.id,
            removedAt: null,
            removedById: null,
          },
        });
        await tx.animalActivityLog.create({
          data: {
            animalId: animal.id,
            activityType: AnimalActivityType.FIELD_UPDATE,
            changedById: assessor.id,
            changedAt: spec.observedAt,
            changeSummary: `${name} added, citing the ${template.name} of ${formatDateToLongString(
              spec.observedAt,
            )}.`,
          },
        });
      }
    });
    created += 1;
  }

  
  for (const hand of handAssignedCharacteristics) {
    const animal = animalByName.get(hand.animalName);
    if (!animal) {
      throw new Error(
        `handAssignedCharacteristics references ${hand.animalName}, which was not seeded.`,
      );
    }
    const characteristicId = characteristicIdByName.get(hand.characteristic);
    if (!characteristicId) {
      throw new Error(
        `handAssignedCharacteristics references "${hand.characteristic}", which is not in the characteristic catalog.`,
      );
    }
    await prisma.$transaction(async (tx) => {
      await tx.animalCharacteristic.upsert({
        where: {
          animalId_characteristicId: { animalId: animal.id, characteristicId },
        },
        create: {
          animalId: animal.id,
          characteristicId,
          assignedById: assessor.id,
          assignedAt: hand.assignedAt,
        },
        update: {
          assignedById: assessor.id,
          assignedAt: hand.assignedAt,
          sourceAssessmentId: null,
          removedAt: null,
          removedById: null,
        },
      });
      await tx.animalActivityLog.create({
        data: {
          animalId: animal.id,
          activityType: AnimalActivityType.FIELD_UPDATE,
          changedById: assessor.id,
          changedAt: hand.assignedAt,
          changeSummary: `Characteristics updated: added ${hand.characteristic}.`,
        },
      });
    });
  }

  
  
  for (const cleared of clearedCharacteristics) {
    const animal = animalByName.get(cleared.animalName);
    if (!animal) {
      throw new Error(
        `clearedCharacteristics references ${cleared.animalName}, which was not seeded.`,
      );
    }
    const characteristicId = characteristicIdByName.get(cleared.characteristic);
    if (!characteristicId) {
      throw new Error(
        `clearedCharacteristics references "${cleared.characteristic}", which is not in the characteristic catalog.`,
      );
    }
    await prisma.animalCharacteristic.updateMany({
      where: { animalId: animal.id, characteristicId, removedAt: null },
      data: { removedAt: new Date(), removedById: assessor.id },
    });
  }

  console.log(`Seeded ${created} assessments across ${animalByName.size} animals.`);
}






const animalsWithoutPhotos = ["Leo"];

async function seedReadinessFixtures() {
  console.log("Seeding readiness fixtures...");

  for (const name of animalsWithoutPhotos) {
    const animal = await prisma.animal.findFirst({
      where: { name },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, listingStatus: true },
    });
    if (!animal) {
      throw new Error(
        `animalsWithoutPhotos references ${name}, which was not seeded.`,
      );
    }
    if (animal.listingStatus !== AnimalListingStatus.DRAFT) {
      throw new Error(
        `${name} must be a draft to go without a photo — a public profile needs one.`,
      );
    }
    await prisma.animalImage.deleteMany({ where: { animalId: animal.id } });
  }

  console.log(`Removed photos from ${animalsWithoutPhotos.join(", ")}.`);
}

let seedTimezone = fallbackShelterSettings().timezone;

export async function main() {
  const restoreRandom = installDeterministicRandom();
  
  
  
  individualDealQueues = {};
  pendingCharacteristicAssignments = [];

  try {
    await seedAll();
  } finally {
    restoreRandom();
  }
}

async function seedAll() {
  console.log("Start seeding new data...");
  await clearDatabase();
  const settings = fallbackShelterSettings();
  const row = await prisma.shelterSettings.upsert({
    where: { id: "shelter" },
    create: {
      id: "shelter",
      ...settings,
      phoneIndexCountry: settings.defaultPhoneCountry,
    },
    update: {},
  });
  
  const resolvedSettings = resolveShelterSettings(row);
  await prisma.shelterSettings.update({
    where: { id: "shelter" },
    data: { phoneIndexCountry: resolvedSettings.defaultPhoneCountry },
  });
  seedTimezone = resolvedSettings.timezone;
  await seedPersonsAndUsers();
  await seedWalkInPersons();
  await seedLookupTables();
  await seedPartners();
  await seedLocationsAndUnits();
  await seedAnimalsAndRelations();
  await seedFostering();
  await seedApplicationNoise();
  await seedRegisteredUserApplicationFixtures();
  await seedTasks();
  await seedAiActivityLog();
  await seedNoteAudit();
  
  
  await seedPublicFavorites();
  
  
  
  
  await seedAnimalCharacteristics();
  await seedAssessmentTemplates();
  await seedAssessments();
  await seedReadinessFixtures();
  await assertAnimalLifecycleConsistency();
  console.log("Seeding finished successfully.");
}

const isExplicitSeedRun =
  process.argv.includes("seed") ||
  process.env.PRISMA_SEEDING === "true" ||
  (typeof require !== "undefined" && require.main === module);

if (isExplicitSeedRun) {
  main()
    .then(async () => {
      console.log("Disconnecting Prisma Client...");
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error("An error occurred during the seeding process:", e);
      await prisma.$disconnect();
      process.exit(1);
    });
} else {
  console.log(
    "ℹ️ Seed script evaluated during build phase. Database seeding skipped.",
  );
}
