import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { stretches, routines, routineStretches } from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// ─── 50 Stretches ─────────────────────────────────────────────────────────────

const STRETCH_DATA: schema.NewStretch[] = [
  // NECK (4)
  { slug: "neck-side-tilt", name: "Neck Side Tilt", instructions: "Sit tall, drop right ear toward right shoulder. Hold, then switch sides.", cues: ["Keep shoulders relaxed", "Do not raise the opposite shoulder"], cautions: ["Avoid if you have acute neck injury"], bodyAreas: ["neck"], intensity: "gentle", bilateral: true, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  { slug: "neck-rotation", name: "Neck Rotation", instructions: "Slowly rotate head to the right, hold, return to center, rotate left.", cues: ["Move within pain-free range", "Keep chin level"], cautions: ["Stop if dizziness occurs"], bodyAreas: ["neck"], intensity: "gentle", bilateral: true, defaultDurationSec: 20, mediaUrl: null, thumbnailUrl: null },
  { slug: "chin-tucks", name: "Chin Tucks", instructions: "Sit or stand tall. Gently draw chin straight back, creating a double chin. Hold 5s, release.", cues: ["Eyes stay level", "Do not look down"], cautions: ["Avoid with cervical disc issues unless cleared by PT"], bodyAreas: ["neck"], intensity: "gentle", bilateral: false, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  { slug: "levator-scapulae-stretch", name: "Levator Scapulae Stretch", instructions: "Tilt head forward and to the side at 45 degrees. Use hand to gently increase the stretch.", cues: ["Keep opposite shoulder depressed", "Breathe into the stretch"], cautions: ["Gentle pressure only — no forcing"], bodyAreas: ["neck", "upper_back"], intensity: "moderate", bilateral: true, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  // SHOULDERS (5)
  { slug: "cross-body-shoulder-stretch", name: "Cross-Body Shoulder Stretch", instructions: "Bring one arm across body at shoulder height. Use opposite arm to press it closer to chest.", cues: ["Keep elbow below shoulder height", "Avoid hunching"], cautions: ["Be cautious with rotator cuff injuries"], bodyAreas: ["shoulders"], intensity: "moderate", bilateral: true, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  { slug: "doorway-chest-opener", name: "Doorway Chest Opener", instructions: "Place forearms on door frame, step forward with one foot, lean gently through the doorway.", cues: ["Keep core engaged", "Elbows at 90 degrees"], cautions: ["Avoid with shoulder impingement"], bodyAreas: ["shoulders", "chest"], intensity: "moderate", bilateral: false, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  { slug: "shoulder-circles", name: "Shoulder Circles", instructions: "Roll shoulders slowly forward 5 times, then backward 5 times.", cues: ["Full range of motion", "Breathe steadily"], cautions: [], bodyAreas: ["shoulders"], intensity: "gentle", bilateral: false, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  { slug: "thread-the-needle", name: "Thread the Needle", instructions: "Start on all fours. Slide right arm under body toward left side, resting right shoulder on floor.", cues: ["Keep hips level", "Breathe into upper back"], cautions: ["Avoid with shoulder or wrist pain"], bodyAreas: ["shoulders", "upper_back"], intensity: "moderate", bilateral: true, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  { slug: "overhead-shoulder-stretch", name: "Overhead Shoulder Stretch", instructions: "Reach right arm overhead, bend elbow. Use left hand to gently push right elbow back.", cues: ["Do not arch lower back", "Keep ribs down"], cautions: ["Avoid if shoulder is acutely inflamed"], bodyAreas: ["shoulders"], intensity: "moderate", bilateral: true, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  // CHEST (3)
  { slug: "chest-expansion-clasped-hands", name: "Chest Expansion", instructions: "Clasp hands behind your back, squeeze shoulder blades together, and lift arms slightly.", cues: ["Chest lifts up", "No hyperextension of spine"], cautions: [], bodyAreas: ["chest", "shoulders"], intensity: "gentle", bilateral: false, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  { slug: "prone-cobra", name: "Prone Cobra", instructions: "Lie face down, arms by sides. Lift head and chest slightly, squeezing shoulder blades.", cues: ["Keep neck neutral", "Squeeze glutes lightly"], cautions: ["Avoid with lumbar disc herniation"], bodyAreas: ["chest", "upper_back"], intensity: "moderate", bilateral: false, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  { slug: "seated-chest-opener", name: "Seated Chest Opener", instructions: "Sit on edge of chair, clasp hands behind head, gently arch back and open elbows wide.", cues: ["Do not collapse lumbar spine", "Exhale as you open"], cautions: [], bodyAreas: ["chest"], intensity: "gentle", bilateral: false, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  // UPPER BACK (4)
  { slug: "cat-cow", name: "Cat-Cow", instructions: "On all fours, arch back toward ceiling (cat), then drop belly toward floor (cow). Repeat.", cues: ["Sync breath with movement", "Full spinal articulation"], cautions: ["Modify range for acute back pain"], bodyAreas: ["upper_back", "lower_back"], intensity: "gentle", bilateral: false, defaultDurationSec: 40, mediaUrl: null, thumbnailUrl: null },
  { slug: "thoracic-rotation-seated", name: "Seated Thoracic Rotation", instructions: "Sit upright, cross arms on chest, rotate upper body to the right, hold, return, rotate left.", cues: ["Pivot from mid-back, not lower back", "Keep hips facing forward"], cautions: [], bodyAreas: ["upper_back"], intensity: "moderate", bilateral: true, defaultDurationSec: 20, mediaUrl: null, thumbnailUrl: null },
  { slug: "foam-roller-thoracic", name: "Thoracic Foam Roll", instructions: "Place foam roller perpendicular to spine at mid-back. Support head, lean back over roller.", cues: ["Move slowly up/down thoracic spine", "Breathe deeply"], cautions: ["Avoid rolling lumbar spine"], bodyAreas: ["upper_back"], intensity: "moderate", bilateral: false, defaultDurationSec: 60, mediaUrl: null, thumbnailUrl: null },
  { slug: "child-pose", name: "Child Pose", instructions: "Kneel, sit back on heels, extend arms forward on floor, rest forehead down.", cues: ["Widen knees if needed for hips", "Let back round naturally"], cautions: ["Avoid with knee pain — sit on folded blanket"], bodyAreas: ["upper_back", "lower_back", "hips"], intensity: "gentle", bilateral: false, defaultDurationSec: 60, mediaUrl: null, thumbnailUrl: null },
  // LOWER BACK (4)
  { slug: "knee-to-chest", name: "Knee to Chest", instructions: "Lie on back. Pull one knee toward chest, hold, then switch sides.", cues: ["Keep opposite leg relaxed", "Breathe slowly"], cautions: [], bodyAreas: ["lower_back", "glutes"], intensity: "gentle", bilateral: true, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  { slug: "supine-spinal-twist", name: "Supine Spinal Twist", instructions: "Lie on back, pull right knee to chest, then let it fall across body to the left. Arms out wide.", cues: ["Keep both shoulders on the floor", "Turn head opposite knee"], cautions: ["Avoid with acute disc herniation"], bodyAreas: ["lower_back", "hips"], intensity: "moderate", bilateral: true, defaultDurationSec: 40, mediaUrl: null, thumbnailUrl: null },
  { slug: "pelvic-tilt", name: "Pelvic Tilt", instructions: "Lie on back with knees bent. Flatten lower back into floor by contracting abs. Hold 5s, release.", cues: ["Engage core lightly", "Do not hold breath"], cautions: [], bodyAreas: ["lower_back"], intensity: "gentle", bilateral: false, defaultDurationSec: 40, mediaUrl: null, thumbnailUrl: null },
  { slug: "sphinx-pose", name: "Sphinx Pose", instructions: "Lie face down, prop on forearms with elbows under shoulders. Gently press up, opening chest.", cues: ["Keep pubic bone on floor", "Lengthen tailbone back"], cautions: ["Avoid with spondylolisthesis"], bodyAreas: ["lower_back", "chest"], intensity: "gentle", bilateral: false, defaultDurationSec: 45, mediaUrl: null, thumbnailUrl: null },
  // HIPS (5)
  { slug: "figure-four-stretch", name: "Figure-Four Hip Stretch", instructions: "Lie on back, cross right ankle over left thigh. Clasp hands behind left thigh and pull toward chest.", cues: ["Flex the crossed foot", "Keep lower back grounded"], cautions: ["Avoid with hip replacement"], bodyAreas: ["hips", "glutes"], intensity: "moderate", bilateral: true, defaultDurationSec: 45, mediaUrl: null, thumbnailUrl: null },
  { slug: "low-lunge-hip-flexor", name: "Low Lunge Hip Flexor", instructions: "Step right foot forward, lower left knee to floor. Sink hips down and forward, arms on thigh.", cues: ["Keep front knee over ankle", "Square hips forward"], cautions: ["Pad knee if needed"], bodyAreas: ["hips", "quads"], intensity: "moderate", bilateral: true, defaultDurationSec: 45, mediaUrl: null, thumbnailUrl: null },
  { slug: "butterfly-stretch", name: "Butterfly Stretch", instructions: "Sit, bring soles of feet together, hold feet. Gently press knees toward floor.", cues: ["Sit tall", "Breathe into inner thighs"], cautions: [], bodyAreas: ["hips"], intensity: "moderate", bilateral: false, defaultDurationSec: 45, mediaUrl: null, thumbnailUrl: null },
  { slug: "pigeon-pose", name: "Pigeon Pose", instructions: "From downward dog, bring right knee to right wrist. Lower hip down, extend left leg back.", cues: ["Square hips to mat", "Support hip with block if needed"], cautions: ["Avoid with acute hip or knee injury"], bodyAreas: ["hips", "glutes"], intensity: "deep", bilateral: true, defaultDurationSec: 60, mediaUrl: null, thumbnailUrl: null },
  { slug: "hip-circles", name: "Hip Circles", instructions: "Stand with feet shoulder-width. Place hands on hips, make large circles with hips, 5 each direction.", cues: ["Control the movement", "Keep knees soft"], cautions: [], bodyAreas: ["hips"], intensity: "gentle", bilateral: false, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  // GLUTES (3)
  { slug: "glute-bridge", name: "Glute Bridge Hold", instructions: "Lie on back, knees bent. Push through heels, lift hips to form straight line from knees to shoulders.", cues: ["Squeeze glutes at the top", "Do not hyperextend lower back"], cautions: [], bodyAreas: ["glutes", "lower_back"], intensity: "moderate", bilateral: false, defaultDurationSec: 45, mediaUrl: null, thumbnailUrl: null },
  { slug: "seated-glute-stretch", name: "Seated Glute Stretch", instructions: "Sit in chair, cross right ankle over left knee. Hinge forward until stretch is felt in glute.", cues: ["Keep back straight when hinging", "Hold chair for balance"], cautions: [], bodyAreas: ["glutes"], intensity: "moderate", bilateral: true, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  { slug: "standing-figure-four", name: "Standing Figure-Four", instructions: "Stand on one leg, cross opposite ankle over thigh. Slowly lower into a squat on standing leg.", cues: ["Use wall for balance", "Keep chest tall"], cautions: ["Avoid with knee instability"], bodyAreas: ["glutes", "hips"], intensity: "deep", bilateral: true, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  // QUADS (3)
  { slug: "standing-quad-stretch", name: "Standing Quad Stretch", instructions: "Stand on left leg, pull right heel toward glute. Keep knees together, stand tall.", cues: ["Do not lean forward", "Squeeze glutes to increase stretch"], cautions: ["Hold wall for balance if needed"], bodyAreas: ["quads"], intensity: "moderate", bilateral: true, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  { slug: "prone-quad-stretch", name: "Prone Quad Stretch", instructions: "Lie face down. Bend right knee, hold ankle with right hand, gently pull heel toward glute.", cues: ["Keep both hip bones on floor", "Do not rotate pelvis"], cautions: [], bodyAreas: ["quads"], intensity: "moderate", bilateral: true, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  { slug: "kneeling-quad-stretch", name: "Kneeling Quad Stretch", instructions: "Kneel on right knee, left foot forward. Tuck pelvis slightly, lean forward slightly.", cues: ["Feel stretch in right quad", "Keep torso upright"], cautions: ["Pad knee if needed"], bodyAreas: ["quads", "hips"], intensity: "moderate", bilateral: true, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  // HAMSTRINGS (4)
  { slug: "standing-forward-fold", name: "Standing Forward Fold", instructions: "Stand with feet hip-width. Hinge at hips, let torso hang over legs. Bend knees slightly.", cues: ["Weight shifts slightly to toes", "Release tension in neck"], cautions: ["Avoid fast bouncing"], bodyAreas: ["hamstrings", "lower_back"], intensity: "moderate", bilateral: false, defaultDurationSec: 45, mediaUrl: null, thumbnailUrl: null },
  { slug: "supine-hamstring-stretch", name: "Supine Hamstring Stretch", instructions: "Lie on back, extend right leg up, hold behind thigh or calf, gently pull toward face.", cues: ["Keep lower back on floor", "Flex foot for deeper stretch"], cautions: [], bodyAreas: ["hamstrings"], intensity: "moderate", bilateral: true, defaultDurationSec: 45, mediaUrl: null, thumbnailUrl: null },
  { slug: "seated-hamstring-stretch", name: "Seated Hamstring Stretch", instructions: "Sit on floor with legs extended. Hinge forward from hips, reaching toward feet.", cues: ["Lead with chest, not forehead", "Keep knees slightly soft"], cautions: ["Avoid rounding aggressively if disc issues"], bodyAreas: ["hamstrings", "lower_back"], intensity: "moderate", bilateral: false, defaultDurationSec: 45, mediaUrl: null, thumbnailUrl: null },
  { slug: "doorway-hamstring-stretch", name: "Doorway Hamstring Stretch", instructions: "Lie in doorway, rest left leg against wall at 90 degrees, extend right leg through doorway on floor.", cues: ["Adjust distance from wall to control intensity", "Relax both legs"], cautions: [], bodyAreas: ["hamstrings"], intensity: "gentle", bilateral: true, defaultDurationSec: 60, mediaUrl: null, thumbnailUrl: null },
  // CALVES (3)
  { slug: "standing-calf-stretch", name: "Standing Calf Stretch", instructions: "Face wall, hands on wall. Step right foot back, press heel down. Keep back leg straight.", cues: ["Keep back heel flat", "Lean body forward"], cautions: [], bodyAreas: ["calves"], intensity: "moderate", bilateral: true, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  { slug: "downward-dog", name: "Downward Dog", instructions: "Form inverted V with hips high. Alternate pressing heels toward floor.", cues: ["Spread fingers wide", "Externally rotate upper arms"], cautions: ["Avoid with wrist pain"], bodyAreas: ["calves", "hamstrings", "shoulders"], intensity: "moderate", bilateral: false, defaultDurationSec: 45, mediaUrl: null, thumbnailUrl: null },
  { slug: "seated-calf-stretch", name: "Seated Calf Stretch", instructions: "Sit on floor, legs straight. Loop towel around ball of foot, gently pull toes toward you.", cues: ["Keep knee straight", "Pull steadily — do not jerk"], cautions: [], bodyAreas: ["calves"], intensity: "gentle", bilateral: true, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  // ANKLES (3)
  { slug: "ankle-circles", name: "Ankle Circles", instructions: "Sit or stand, lift one foot, rotate ankle 10 times clockwise then 10 counterclockwise.", cues: ["Full range of motion", "Move slowly and controlled"], cautions: [], bodyAreas: ["ankles"], intensity: "gentle", bilateral: true, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  { slug: "ankle-dorsiflexion-stretch", name: "Ankle Dorsiflexion Stretch", instructions: "Kneel, place one foot flat. Shift knee forward over toes, keeping heel on ground.", cues: ["Keep heel flat", "Knee tracks over pinky toe"], cautions: [], bodyAreas: ["ankles"], intensity: "moderate", bilateral: true, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  { slug: "standing-toe-raise", name: "Standing Toe Raise and Lower", instructions: "Stand at wall, raise up onto toes, hold 2s, slowly lower. Repeat 10 times.", cues: ["Control the lowering phase", "Stay tall through spine"], cautions: [], bodyAreas: ["ankles", "calves"], intensity: "gentle", bilateral: false, defaultDurationSec: 40, mediaUrl: null, thumbnailUrl: null },
  // WRISTS (2)
  { slug: "wrist-circles", name: "Wrist Circles", instructions: "Interlace fingers, rotate wrists in circles, 10 in each direction.", cues: ["Full range of motion", "Move slowly"], cautions: [], bodyAreas: ["wrists"], intensity: "gentle", bilateral: false, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  { slug: "wrist-extensor-stretch", name: "Wrist Extensor Stretch", instructions: "Extend one arm forward, palm down. Use opposite hand to gently press fingers down.", cues: ["Keep elbow straight", "Gentle pressure only"], cautions: ["Avoid with carpal tunnel flare"], bodyAreas: ["wrists"], intensity: "gentle", bilateral: true, defaultDurationSec: 20, mediaUrl: null, thumbnailUrl: null },
  // FULL BODY (7)
  { slug: "sun-salutation-a", name: "Sun Salutation A", instructions: "Flow through: mountain, forward fold, halfway lift, plank, chaturanga, updog, downdog.", cues: ["Sync breath with each movement", "Modify chaturanga to knees if needed"], cautions: ["Avoid with shoulder or wrist injury"], bodyAreas: ["full_body"], intensity: "moderate", bilateral: false, defaultDurationSec: 90, mediaUrl: null, thumbnailUrl: null },
  { slug: "standing-side-bend", name: "Standing Side Bend", instructions: "Stand tall, reach right arm overhead, bend to the left. Hold, then switch sides.", cues: ["Hips stay square", "No rounding forward"], cautions: [], bodyAreas: ["full_body", "shoulders"], intensity: "gentle", bilateral: true, defaultDurationSec: 20, mediaUrl: null, thumbnailUrl: null },
  { slug: "warrior-i", name: "Warrior I", instructions: "Step right foot back, angle it 45 degrees, bend front knee, raise arms overhead. Square hips.", cues: ["Press back heel into floor", "Lift ribs away from hips"], cautions: [], bodyAreas: ["hips", "quads", "full_body"], intensity: "moderate", bilateral: true, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  { slug: "warrior-ii", name: "Warrior II", instructions: "Wide stance, bend front knee, arms extended parallel to floor, gaze over front hand.", cues: ["Front knee tracks over second toe", "Back arm reaches back actively"], cautions: [], bodyAreas: ["hips", "full_body"], intensity: "moderate", bilateral: true, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  { slug: "standing-mountain-pose", name: "Mountain Pose with Breathing", instructions: "Stand tall, feet hip-width. Take 5 deep belly breaths, arms relaxed at sides.", cues: ["Feel feet rooted", "Soften jaw and shoulders"], cautions: [], bodyAreas: ["full_body"], intensity: "gentle", bilateral: false, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  { slug: "seated-twist-spinal", name: "Seated Spinal Twist", instructions: "Sit cross-legged, place right hand on left knee, left hand behind. Rotate torso left.", cues: ["Lengthen spine before twisting", "Exhale deeper into the twist"], cautions: [], bodyAreas: ["full_body", "upper_back", "lower_back"], intensity: "moderate", bilateral: true, defaultDurationSec: 30, mediaUrl: null, thumbnailUrl: null },
  { slug: "corpse-pose", name: "Corpse Pose (Savasana)", instructions: "Lie on back, arms and legs relaxed, eyes closed. Focus on breath, allow muscles to release.", cues: ["Let each body part feel heavy", "No effort required"], cautions: [], bodyAreas: ["full_body"], intensity: "gentle", bilateral: false, defaultDurationSec: 120, mediaUrl: null, thumbnailUrl: null },
];

interface RoutineSpec {
  routine: schema.NewRoutine;
  stretchSlugs: string[];
}

const ROUTINE_SPECS: RoutineSpec[] = [
  { routine: { slug: "morning-mobility-kickstart", title: "Morning Mobility Kickstart", description: "Gently wake up your body with full-range joint mobility.", goal: "mobility", level: "gentle", totalDurationSec: 600, isPremium: false, isAiGenerated: false, ownerId: null }, stretchSlugs: ["ankle-circles", "wrist-circles", "hip-circles", "shoulder-circles", "neck-rotation", "cat-cow", "standing-mountain-pose"] },
  { routine: { slug: "desk-worker-relief", title: "Desk Worker Relief", description: "Undo the damage of sitting: neck, shoulders, and back.", goal: "posture", level: "moderate", totalDurationSec: 900, isPremium: false, isAiGenerated: false, ownerId: null }, stretchSlugs: ["chin-tucks", "neck-side-tilt", "levator-scapulae-stretch", "cross-body-shoulder-stretch", "doorway-chest-opener", "thoracic-rotation-seated", "pelvic-tilt", "seated-hamstring-stretch"] },
  { routine: { slug: "post-run-recovery", title: "Post-Run Recovery", description: "Cool down and flush out legs after a run.", goal: "recovery", level: "gentle", totalDurationSec: 900, isPremium: false, isAiGenerated: false, ownerId: null }, stretchSlugs: ["standing-forward-fold", "standing-calf-stretch", "supine-hamstring-stretch", "figure-four-stretch", "knee-to-chest", "supine-spinal-twist", "corpse-pose"] },
  { routine: { slug: "full-body-flexibility", title: "Full Body Flexibility Flow", description: "Head-to-toe flexibility work for all major muscle groups.", goal: "flexibility", level: "moderate", totalDurationSec: 1800, isPremium: false, isAiGenerated: false, ownerId: null }, stretchSlugs: ["neck-side-tilt", "shoulder-circles", "chest-expansion-clasped-hands", "cat-cow", "butterfly-stretch", "low-lunge-hip-flexor", "standing-quad-stretch", "downward-dog", "seated-hamstring-stretch", "standing-calf-stretch", "corpse-pose"] },
  { routine: { slug: "stress-relief-wind-down", title: "Stress Relief Wind Down", description: "Calm the nervous system with slow, restorative stretching.", goal: "stress_relief", level: "gentle", totalDurationSec: 1200, isPremium: false, isAiGenerated: false, ownerId: null }, stretchSlugs: ["standing-mountain-pose", "neck-side-tilt", "seated-chest-opener", "child-pose", "supine-spinal-twist", "knee-to-chest", "corpse-pose"] },
  { routine: { slug: "hip-opener-deep", title: "Deep Hip Opener", description: "Unlock tight hips with sustained, progressive stretches.", goal: "flexibility", level: "deep", totalDurationSec: 1500, isPremium: true, isAiGenerated: false, ownerId: null }, stretchSlugs: ["hip-circles", "butterfly-stretch", "low-lunge-hip-flexor", "warrior-ii", "pigeon-pose", "figure-four-stretch", "supine-spinal-twist"] },
  { routine: { slug: "athletes-performance-prep", title: "Athlete Performance Prep", description: "Pre-training mobility to prime muscles for peak performance.", goal: "athletic_performance", level: "moderate", totalDurationSec: 900, isPremium: false, isAiGenerated: false, ownerId: null }, stretchSlugs: ["ankle-dorsiflexion-stretch", "hip-circles", "warrior-i", "warrior-ii", "low-lunge-hip-flexor", "downward-dog", "standing-forward-fold"] },
  { routine: { slug: "lower-back-pain-relief", title: "Lower Back Pain Relief", description: "Evidence-based stretches to ease lower back tension.", goal: "pain_relief", level: "gentle", totalDurationSec: 1200, isPremium: false, isAiGenerated: false, ownerId: null }, stretchSlugs: ["pelvic-tilt", "knee-to-chest", "cat-cow", "sphinx-pose", "child-pose", "supine-spinal-twist", "glute-bridge"] },
  { routine: { slug: "wfh-quick-break", title: "WFH Quick Break (10 min)", description: "A fast desk-side routine to reset body and mind.", goal: "posture", level: "gentle", totalDurationSec: 600, isPremium: false, isAiGenerated: false, ownerId: null }, stretchSlugs: ["chin-tucks", "neck-rotation", "shoulder-circles", "seated-chest-opener", "standing-side-bend", "wrist-circles"] },
  { routine: { slug: "bedtime-body-scan", title: "Bedtime Body Scan", description: "A slow, restorative routine to prepare body for restful sleep.", goal: "recovery", level: "gentle", totalDurationSec: 1800, isPremium: true, isAiGenerated: false, ownerId: null }, stretchSlugs: ["standing-mountain-pose", "seated-twist-spinal", "child-pose", "supine-hamstring-stretch", "figure-four-stretch", "knee-to-chest", "supine-spinal-twist", "corpse-pose"] },
];

async function seed() {
  console.log("Seeding database...");

  console.log(`  Inserting ${STRETCH_DATA.length} stretches...`);
  await db.insert(stretches).values(STRETCH_DATA).onConflictDoNothing();

  const stretchRows = await db.select().from(stretches);
  const slugToId = Object.fromEntries(stretchRows.map((s) => [s.slug, s.id]));

  for (const spec of ROUTINE_SPECS) {
    console.log(`  Creating routine: ${spec.routine.title}`);
    const [routine] = await db
      .insert(routines)
      .values(spec.routine)
      .onConflictDoNothing()
      .returning();
    if (!routine) { console.log("    (skipped — already exists)"); continue; }

    const rsValues = spec.stretchSlugs.flatMap((slug, idx) => {
      const stretchId = slugToId[slug];
      if (!stretchId) { console.warn(`    Unknown slug: ${slug}`); return []; }
      const stretch = stretchRows.find((s) => s.slug === slug)!;
      return [{ routineId: routine.id, stretchId, orderIndex: idx, durationSec: stretch.defaultDurationSec, sideFirst: null }];
    });

    if (rsValues.length > 0) {
      await db.insert(routineStretches).values(rsValues).onConflictDoNothing();
    }
  }

  console.log("Seed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
