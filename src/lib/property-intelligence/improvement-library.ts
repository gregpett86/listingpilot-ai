import {
  ConfidenceLevel,
  ImprovementRecord,
  PropertyCondition,
  RoomType,
} from "./types";

type ImprovementSeed = {
  name: string;
  description: string;
  cost: [number, number];
  value: [number, number];
  confidence: ConfidenceLevel;
  targetConditions: PropertyCondition[];
  priorityBase: number;
  talkingPoints: string[];
};

const defaultTargets: PropertyCondition[] = [
  "Average",
  "Dated",
  "Needs Improvement",
];

const roomSeeds: Record<RoomType, ImprovementSeed[]> = {
  Kitchen: [
    seed("Cabinet hardware refresh", "Replace dated cabinet pulls and knobs with a consistent modern finish.", [200, 900], [1200, 3500], "High", 76, ["Small kitchen details can make the whole space feel more current."]),
    seed("Cabinet paint or refinish", "Repaint or refinish visible cabinetry to brighten the kitchen without a full remodel.", [1800, 6500], [6000, 18000], "High", 92, ["This can change buyer perception faster than most kitchen projects."]),
    seed("Countertop upgrade", "Replace worn counters with durable stone, quartz, or quality solid-surface material.", [3500, 12000], [9000, 28000], "Medium", 88, ["Buyers tend to notice counters immediately in listing photos."]),
    seed("Backsplash update", "Install a clean neutral backsplash to add texture and protect wall surfaces.", [900, 3500], [2500, 8000], "Medium", 70, ["A simple backsplash helps the kitchen feel finished and intentional."]),
    seed("Modern faucet install", "Replace an older faucet with a streamlined pull-down fixture.", [250, 900], [800, 2500], "High", 62, ["A newer faucet suggests the kitchen has been maintained."]),
    seed("Under-cabinet lighting", "Add warm under-cabinet lighting to improve task light and evening photos.", [600, 2200], [1500, 5000], "Medium", 58, ["Better lighting helps the kitchen show cleanly online and in person."]),
    seed("Appliance finish alignment", "Align visible appliance finishes where mismatched pieces distract buyers.", [1200, 7500], [3500, 15000], "Medium", 74, ["Matching appliances make the kitchen feel more cohesive."]),
    seed("Deep clean and declutter", "Remove countertop clutter and detail-clean grout, sink, appliances, and floors.", [250, 900], [1000, 4000], "High", 84, ["Clean surfaces help buyers focus on space instead of wear."]),
    seed("Pendant or fixture replacement", "Replace dated kitchen light fixtures with simple modern fixtures.", [300, 1600], [1200, 4500], "High", 64, ["Lighting is a low-friction update that photographs well."]),
    seed("Island surface staging", "Stage the island or breakfast bar with restrained, useful visual cues.", [150, 600], [800, 2500], "Medium", 44, ["A staged island helps buyers imagine daily use."]),
    seed("Flooring touch-up", "Repair visible flooring scratches, chipped tiles, or transition strips.", [500, 3500], [1800, 7000], "Medium", 68, ["Buyers often read floor wear as overall maintenance risk."]),
    seed("Wall paint refresh", "Apply a neutral paint refresh around the kitchen and eating area.", [500, 2200], [1800, 6500], "High", 66, ["Fresh paint keeps the room from feeling tired before showings."]),
  ],
  Bathroom: [
    seed("Caulk and grout renewal", "Replace stained caulk and clean or refresh grout in wet areas.", [200, 900], [1000, 4000], "High", 86, ["Crisp grout and caulk reduce buyer concerns about moisture."]),
    seed("Vanity hardware update", "Replace dated vanity pulls, knobs, and towel hardware.", [150, 700], [700, 2500], "High", 58, ["Small fixture updates can make the bathroom feel cared for."]),
    seed("Faucet replacement", "Install a current vanity faucet in a finish that matches other fixtures.", [250, 1000], [900, 3500], "High", 64, ["A new faucet is a quick signal of upkeep."]),
    seed("Mirror replacement", "Replace builder-grade or damaged mirrors with framed or modern mirrors.", [250, 1200], [900, 3500], "Medium", 56, ["A better mirror makes the vanity feel more finished."]),
    seed("Lighting upgrade", "Replace dim or dated vanity lighting with brighter neutral fixtures.", [300, 1500], [1200, 4500], "High", 70, ["Better lighting helps bathrooms photograph cleaner."]),
    seed("Toilet replacement", "Replace stained, inefficient, or visibly older toilets.", [350, 1200], [900, 3000], "Medium", 52, ["A newer toilet removes an easy buyer objection."]),
    seed("Shower door cleaning or replacement", "Detail-clean glass or replace worn shower doors and tracks.", [250, 2500], [1200, 6000], "Medium", 68, ["Clear glass helps the bathroom feel brighter and larger."]),
    seed("Vanity paint refresh", "Paint or refinish the vanity cabinet where replacement is unnecessary.", [500, 2200], [1800, 6500], "Medium", 72, ["A vanity refresh can create a strong before-and-after effect."]),
    seed("Neutral wall paint", "Repaint bold or worn bathroom walls in a light neutral color.", [300, 1200], [900, 3500], "High", 60, ["Neutral paint keeps the bathroom from feeling personalized."]),
    seed("Exhaust fan replacement", "Replace noisy or ineffective exhaust fans.", [300, 1000], [700, 2500], "Medium", 48, ["Good ventilation reassures buyers about long-term care."]),
    seed("Linen staging", "Use clean towels, bath mats, and minimal counter accessories.", [100, 400], [500, 1800], "Medium", 38, ["Simple staging makes the bathroom feel move-in ready."]),
    seed("Tile repair", "Repair cracked, loose, or missing tile before listing photos.", [400, 3000], [1500, 6500], "Medium", 78, ["Visible tile problems can trigger negotiation pressure."]),
  ],
  Bedroom: [
    seed("Neutral paint refresh", "Repaint bedrooms with a calm neutral color and clean trim lines.", [500, 1800], [1500, 5500], "High", 68, ["Fresh paint helps bedrooms feel calm and move-in ready."]),
    seed("Carpet cleaning", "Professionally clean bedroom carpeting and treat visible stains.", [150, 700], [700, 2500], "High", 58, ["Clean floors prevent buyers from mentally deducting replacement cost."]),
    seed("Carpet replacement", "Replace heavily worn or stained bedroom carpet.", [1200, 4500], [3000, 9000], "Medium", 82, ["New carpet can make private spaces feel much newer."]),
    seed("Closet organization", "Reduce closet contents and add simple organization where needed.", [150, 1200], [800, 3500], "Medium", 54, ["Organized closets make storage feel more generous."]),
    seed("Lighting fixture update", "Replace dated bedroom fixtures or fans with cleaner current options.", [250, 1200], [800, 3200], "Medium", 50, ["Updated fixtures keep bedrooms from feeling overlooked."]),
    seed("Window treatment simplification", "Remove heavy or dated window coverings and install simple blinds or panels.", [300, 1800], [1000, 4500], "Medium", 46, ["Cleaner window treatments improve light and room proportion."]),
    seed("Baseboard and trim touch-up", "Touch up scuffed baseboards, casing, and high-contact trim.", [250, 1200], [900, 3000], "High", 56, ["Trim condition quietly affects perceived maintenance."]),
    seed("Furniture editing", "Remove oversized or excess furniture to improve scale.", [0, 500], [800, 3000], "High", 48, ["Less furniture helps bedrooms photograph larger."]),
    seed("Bedding and textile staging", "Use simple bedding and a restrained color palette.", [200, 1000], [800, 2800], "Medium", 36, ["Calm staging helps buyers imagine restful spaces."]),
    seed("Door hardware refresh", "Replace mismatched or worn knobs and hinges.", [200, 900], [700, 2500], "Medium", 44, ["Consistent hardware makes the home feel more cohesive."]),
    seed("Wall repair", "Patch nail holes, wall dents, and visible drywall damage.", [250, 1500], [900, 3500], "High", 62, ["Clean walls reduce the sense of deferred maintenance."]),
    seed("Ceiling fan update", "Replace older ceiling fans with simple modern fixtures.", [300, 1600], [900, 3500], "Medium", 46, ["A cleaner fan keeps the bedroom from feeling dated."]),
  ],
  "Living Room": [
    seed("Declutter and furniture edit", "Reduce furniture density to improve flow and sight lines.", [0, 800], [1200, 4500], "High", 72, ["Open living areas help buyers feel the home's usable space."]),
    seed("Neutral paint refresh", "Repaint main living walls in a broad-appeal neutral.", [800, 3000], [3000, 9000], "High", 78, ["Main living spaces set the tone for the whole showing."]),
    seed("Floor refinishing", "Refinish worn hardwood or visible traffic paths.", [2500, 8000], [7000, 22000], "Medium", 86, ["Better floors can lift the entire first impression."]),
    seed("Area rug staging", "Use a correctly sized rug to define the seating area.", [300, 1800], [1000, 4500], "Medium", 38, ["A properly scaled rug helps buyers understand furniture layout."]),
    seed("Fireplace refresh", "Clean, paint, or update the fireplace surround where dated.", [500, 4500], [2000, 10000], "Medium", 70, ["The fireplace can become a stronger focal point."]),
    seed("Window cleaning", "Professionally clean windows and tracks in main living spaces.", [150, 800], [700, 3000], "High", 50, ["Clean windows maximize natural light for photos."]),
    seed("Lighting plan update", "Add lamps or replace dated fixtures to balance room lighting.", [300, 2200], [1200, 6000], "Medium", 56, ["Layered lighting makes the room feel warmer during showings."]),
    seed("Built-in styling", "Edit and style shelves or built-ins with neutral decor.", [150, 900], [800, 3000], "Medium", 34, ["Styled built-ins highlight storage and character without clutter."]),
    seed("TV wire concealment", "Hide visible cords and simplify media equipment.", [150, 800], [500, 2000], "High", 42, ["Clean media walls keep attention on the room, not cables."]),
    seed("Trim and door touch-up", "Repair scuffs on trim, door frames, and baseboards.", [300, 1600], [1000, 4000], "High", 58, ["Trim touch-ups make the home feel better maintained."]),
    seed("Ceiling repair", "Address visible stains, cracks, or texture damage.", [500, 3000], [1500, 7000], "Medium", 74, ["Ceiling issues can create avoidable buyer concern."]),
    seed("Traffic flow staging", "Arrange seating to show clear paths through the room.", [0, 600], [800, 3000], "High", 44, ["Better flow helps buyers feel comfortable during walkthroughs."]),
  ],
  "Dining Room": [
    seed("Lighting fixture replacement", "Replace dated chandeliers or off-scale dining fixtures.", [350, 2200], [1200, 6000], "High", 66, ["Dining lighting is a prominent photo focal point."]),
    seed("Table scale staging", "Use a correctly scaled table and reduce excess chairs.", [0, 900], [700, 3000], "Medium", 36, ["Right-sized furniture helps the room feel usable."]),
    seed("Wall paint refresh", "Repaint bold or worn dining room walls in a neutral tone.", [500, 1800], [1500, 5500], "High", 60, ["Neutral dining rooms appeal to more buyer styles."]),
    seed("Trim detail touch-up", "Refresh chair rail, crown, or baseboard paint.", [300, 1600], [900, 3500], "Medium", 48, ["Clean trim helps formal spaces feel polished."]),
    seed("Window treatment update", "Replace heavy curtains with simpler panels or shades.", [300, 1800], [900, 3800], "Medium", 42, ["Lighter window treatments make dining areas feel brighter."]),
    seed("Floor polish", "Clean, polish, or repair dining room flooring.", [250, 2500], [1000, 5500], "Medium", 54, ["Dining rooms often show floor wear around furniture."]),
    seed("Buffet or storage staging", "Edit sideboards and surfaces to reduce visual clutter.", [0, 500], [500, 2000], "Medium", 30, ["Clear surfaces help the room feel more spacious."]),
    seed("Accent wall simplification", "Remove dated wallpaper or overly personal accent treatments.", [600, 3500], [1800, 7000], "Medium", 68, ["Simplifying finishes keeps buyers focused on the home."]),
    seed("Outlet and switch plate refresh", "Replace yellowed or mismatched plates.", [80, 400], [300, 1200], "High", 30, ["Small details can make the room look cleaner in person."]),
    seed("Ceiling medallion removal or update", "Remove or modernize dated ceiling medallions.", [150, 900], [500, 2000], "Low", 28, ["Updating ornamental details can modernize the dining room."]),
    seed("Artwork editing", "Use fewer, larger neutral pieces for photography.", [0, 700], [400, 1800], "Low", 24, ["Simple art helps buyers imagine their own style."]),
    seed("Doorway sight-line cleanup", "Remove visible clutter from adjacent spaces seen from dining photos.", [0, 500], [500, 2000], "Medium", 34, ["Clean sight lines make the floor plan feel more connected."]),
  ],
  Exterior: [
    seed("Power washing", "Clean siding, walkways, driveway, porch, and exterior touchpoints.", [250, 1200], [1500, 6000], "High", 86, ["A clean exterior immediately improves buyer confidence."]),
    seed("Front door paint", "Repaint or refinish the front door in a polished, brand-safe color.", [250, 900], [1200, 5000], "High", 74, ["The front door anchors curb appeal and listing photos."]),
    seed("House numbers replacement", "Install modern, visible house numbers.", [80, 400], [400, 1800], "High", 34, ["Updated numbers make the entry feel intentional."]),
    seed("Exterior light fixtures", "Replace dated or mismatched exterior lighting.", [250, 1600], [1000, 4500], "High", 60, ["Exterior lighting contributes to the maintained look."]),
    seed("Paint touch-up", "Touch up peeling, chipped, or faded exterior paint areas.", [600, 5000], [2500, 12000], "Medium", 82, ["Visible paint wear can make buyers question maintenance."]),
    seed("Gutter cleaning", "Clean gutters and remove visible debris.", [150, 700], [500, 2500], "High", 50, ["Clean gutters reduce easy inspection and showing objections."]),
    seed("Porch staging", "Add restrained seating, planters, or a clean entry mat.", [150, 900], [700, 3000], "Medium", 38, ["A welcoming porch improves the emotional first impression."]),
    seed("Driveway crack repair", "Patch visible driveway cracks or staining.", [400, 3500], [1500, 7000], "Medium", 70, ["Driveway condition shapes the first maintenance impression."]),
    seed("Fence repair", "Repair sagging gates, broken boards, or peeling fence sections.", [400, 4000], [1500, 8500], "Medium", 76, ["A tidy fence helps outdoor areas feel secure and complete."]),
    seed("Roof debris removal", "Remove leaves, moss, or visible roof debris where safe.", [250, 1500], [1000, 5000], "Medium", 64, ["A cleaner roofline reduces buyer concern before inspection."]),
    seed("Mailbox refresh", "Replace or repaint a worn mailbox.", [80, 500], [300, 1500], "Medium", 26, ["Small curb details reinforce overall care."]),
    seed("Window trim cleanup", "Clean or touch up exterior window trim and shutters.", [300, 2500], [1200, 6000], "Medium", 58, ["Clean window trim sharpens the exterior photo."]),
  ],
  Landscaping: [
    seed("Fresh mulch", "Add fresh mulch to visible beds and entry areas.", [200, 1200], [1000, 4500], "High", 74, ["Fresh mulch gives the property an immediate cared-for look."]),
    seed("Bed edging", "Sharpen landscape bed edges along the front elevation.", [150, 800], [700, 3000], "High", 58, ["Crisp edging makes the yard look maintained."]),
    seed("Shrub trimming", "Trim overgrown shrubs around windows, paths, and the entry.", [200, 1200], [900, 4000], "High", 78, ["Trimming helps the home feel brighter and less hidden."]),
    seed("Seasonal color planters", "Add simple seasonal color near the entry.", [150, 800], [700, 2800], "Medium", 42, ["A few planters can make photos feel warmer without over-investing."]),
    seed("Lawn repair", "Patch thin lawn areas visible from the street.", [300, 2500], [1200, 6000], "Medium", 72, ["A healthier lawn strengthens curb appeal."]),
    seed("Weed removal", "Remove weeds from beds, walkways, driveway seams, and hardscapes.", [150, 900], [700, 3000], "High", 66, ["Weed-free surfaces reduce the look of deferred maintenance."]),
    seed("Tree limb clearance", "Trim low branches that block views or touch the structure.", [400, 3000], [1500, 7000], "Medium", 70, ["Clearance helps buyers see the home and reduces maintenance concerns."]),
    seed("Path lighting", "Add simple low-voltage lighting along entry paths.", [600, 3000], [1800, 7000], "Low", 44, ["Path lighting can make evening showings feel more polished."]),
    seed("Hardscape cleaning", "Clean patios, pavers, retaining walls, and garden borders.", [250, 1500], [900, 4500], "Medium", 54, ["Clean hardscapes make outdoor spaces feel more usable."]),
    seed("Remove dead plantings", "Remove dead shrubs, plants, and damaged pots.", [100, 800], [500, 2500], "High", 62, ["Removing dead plantings prevents a negative first impression."]),
    seed("Backyard staging", "Add simple seating or define an outdoor entertaining area.", [250, 1800], [1000, 5500], "Medium", 46, ["Defined outdoor areas help buyers picture lifestyle use."]),
    seed("Irrigation check", "Repair visible sprinkler issues or dry patches before photos.", [250, 2200], [900, 4500], "Medium", 52, ["Healthy landscaping supports the maintained-home story."]),
  ],
  Garage: [
    seed("Declutter and organize", "Remove excess storage and organize visible shelving.", [0, 800], [800, 3500], "High", 68, ["A tidy garage makes storage feel larger and more useful."]),
    seed("Floor cleaning", "Clean oil stains, dirt, and debris from the garage floor.", [150, 700], [600, 2500], "High", 52, ["Clean floors reduce the sense of hard use."]),
    seed("Epoxy floor coating", "Apply a durable floor coating where the garage is a selling point.", [1800, 5500], [3500, 11000], "Medium", 56, ["A finished garage can feel like bonus usable space."]),
    seed("Garage door paint", "Repaint or touch up a worn garage door.", [300, 1500], [1000, 4500], "Medium", 58, ["The garage door is a large exterior visual surface."]),
    seed("Garage door opener service", "Service or replace noisy or unreliable openers.", [250, 900], [600, 2500], "Medium", 44, ["Reliable operation removes a simple buyer concern."]),
    seed("Lighting improvement", "Add brighter LED garage lighting.", [200, 1200], [600, 2500], "Medium", 42, ["Better lighting helps buyers see storage and utility."]),
    seed("Wall patch and paint", "Patch holes and repaint stained or scuffed garage walls.", [500, 2200], [1200, 5000], "Medium", 60, ["Finished walls make the garage feel better maintained."]),
    seed("Storage system install", "Add simple wall-mounted storage or shelving.", [400, 2500], [1000, 4500], "Low", 38, ["Organized storage can be a practical buyer benefit."]),
    seed("Door weather seal replacement", "Replace worn garage door seals.", [150, 600], [400, 1800], "Medium", 34, ["Fresh seals suggest better care and utility."]),
    seed("Utility area cleanup", "Organize water heater, electrical panel, and utility access areas.", [0, 500], [500, 2000], "High", 46, ["Clear utility access looks safer and more inspection-ready."]),
    seed("Exterior keypad replacement", "Replace damaged or yellowed garage keypads.", [100, 400], [300, 1200], "Low", 24, ["Small working details reinforce convenience."]),
    seed("Garage threshold repair", "Repair trip hazards or damaged thresholds.", [250, 1500], [700, 3000], "Medium", 50, ["A clean threshold improves safety and function."]),
  ],
  Basement: [
    seed("Moisture issue review", "Address visible moisture stains, odors, or damp areas.", [500, 6000], [2500, 15000], "High", 94, ["Moisture concerns can quickly derail buyer confidence."]),
    seed("Dehumidifier setup", "Add or service dehumidification where appropriate.", [250, 1200], [800, 3500], "Medium", 54, ["A dry basement feels more usable and lower risk."]),
    seed("Wall paint refresh", "Paint unfinished or scuffed basement walls with a clean neutral finish.", [600, 3000], [1500, 7000], "Medium", 58, ["Fresh walls make basement space feel cleaner."]),
    seed("Flooring cleanup", "Clean, patch, or replace worn basement flooring.", [500, 4500], [1800, 9000], "Medium", 72, ["Better floors make basement space feel more usable."]),
    seed("Lighting upgrade", "Add brighter overhead lighting to reduce dark corners.", [300, 2200], [1000, 5000], "Medium", 62, ["Basements need strong lighting to show well."]),
    seed("Storage organization", "Organize storage areas and clear access paths.", [0, 900], [700, 3000], "High", 48, ["Organized storage helps buyers see practical value."]),
    seed("Ceiling repair", "Repair missing tiles, damaged drywall, or exposed problem areas.", [500, 3500], [1500, 7000], "Medium", 66, ["A cleaner ceiling reduces the unfinished feel."]),
    seed("Stairwell paint and lighting", "Refresh stairwell paint, railings, and lighting.", [400, 2200], [1200, 5000], "Medium", 56, ["The stairwell sets expectations before buyers enter the basement."]),
    seed("Mechanical area cleanup", "Clear clutter around HVAC, water heater, and panels.", [0, 600], [500, 2500], "High", 46, ["Clear mechanical areas look more inspection-ready."]),
    seed("Egress window cleaning", "Clean and clear egress windows and wells.", [150, 900], [600, 2800], "Medium", 42, ["Clear egress areas help the basement feel safer and brighter."]),
    seed("Odor remediation", "Address musty odors with cleaning, ventilation, or source repair.", [300, 3000], [1200, 7000], "High", 82, ["Odor is one of the fastest ways to create buyer hesitation."]),
    seed("Functional zone staging", "Define a gym, media, storage, or flex zone with simple staging.", [250, 1800], [900, 4500], "Low", 34, ["Defined zones help buyers understand basement potential."]),
  ],
};

function seed(
  name: string,
  description: string,
  cost: [number, number],
  value: [number, number],
  confidence: ConfidenceLevel,
  priorityBase: number,
  talkingPoints: string[],
  targetConditions: PropertyCondition[] = defaultTargets,
): ImprovementSeed {
  return {
    name,
    description,
    cost,
    value,
    confidence,
    priorityBase,
    talkingPoints,
    targetConditions,
  };
}

function toId(category: RoomType, name: string) {
  return `${category}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const IMPROVEMENT_LIBRARY: ImprovementRecord[] = Object.entries(
  roomSeeds,
).flatMap(([category, improvements]) =>
  improvements.map((improvement) => ({
    id: toId(category as RoomType, improvement.name),
    improvementName: improvement.name,
    category: category as RoomType,
    description: improvement.description,
    typicalCostRange: {
      min: improvement.cost[0],
      max: improvement.cost[1],
    },
    potentialAddedSaleValueRange: {
      min: improvement.value[0],
      max: improvement.value[1],
    },
    confidenceLevel: improvement.confidence,
    sellerTalkingPoints: improvement.talkingPoints,
    targetConditions: improvement.targetConditions,
    priorityBase: improvement.priorityBase,
  })),
);
