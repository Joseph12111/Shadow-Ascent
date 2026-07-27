const QUESTION_CATEGORIES = ['iq', 'general', 'health', 'science', 'logic', 'maths'];
const REQUIRED_QUESTIONS_PER_CATEGORY = 20;

function buildQuestion(category, index, difficulty, question, options, correctAnswer, explanation, points) {
  return {
    id: `${category}-${String(index).padStart(2, '0')}`,
    category,
    difficulty,
    question,
    options,
    correctAnswer,
    explanation,
    points,
  };
}

const iqQuestions = [
  buildQuestion('iq', 1, 'easy', 'Which shape has the most sides?', ['Triangle', 'Square', 'Hexagon', 'Pentagon'], 'Hexagon', 'A hexagon has 6 sides, more than the other listed shapes.', 10),
  buildQuestion('iq', 2, 'easy', 'Find the next number: 2, 4, 8, 16, ?', ['18', '24', '32', '64'], '32', 'Each number doubles the one before it.', 10),
  buildQuestion('iq', 3, 'easy', 'Book is to reading as fork is to what?', ['Drawing', 'Eating', 'Running', 'Sleeping'], 'Eating', 'A book is used for reading, and a fork is used for eating.', 10),
  buildQuestion('iq', 4, 'easy', 'Which word does not belong?', ['Apple', 'Banana', 'Carrot', 'Grape'], 'Carrot', 'Carrot is a vegetable; the others are fruits.', 10),
  buildQuestion('iq', 5, 'normal', 'If all Zarns are Blips and all Blips are Tarns, what must be true?', ['All Tarns are Zarns', 'All Zarns are Tarns', 'No Zarns are Tarns', 'Some Blips are not Tarns'], 'All Zarns are Tarns', 'The relationship carries forward through both groups.', 15),
  buildQuestion('iq', 6, 'normal', 'Which number completes the pattern: 3, 6, 11, 18, ?', ['25', '26', '27', '29'], '27', 'The gaps are 3, 5, 7, then 9.', 15),
  buildQuestion('iq', 7, 'normal', 'Which pair has the same relationship as bird and nest?', ['Dog and kennel', 'Fish and river', 'Horse and saddle', 'Tree and leaf'], 'Dog and kennel', 'A nest and kennel are shelters for the first item.', 15),
  buildQuestion('iq', 8, 'normal', 'Rearrange "LISENT" to make a word.', ['Silent', 'Listen', 'Enlist', 'All of these'], 'All of these', 'The same letters can form silent, listen, and enlist.', 15),
  buildQuestion('iq', 9, 'normal', 'Which letter comes next: A, C, F, J, O, ?', ['T', 'U', 'V', 'W'], 'U', 'The jumps are 2, 3, 4, 5, then 6 letters.', 15),
  buildQuestion('iq', 10, 'normal', 'If NORTH is coded as OPSUI, how is SOUTH coded?', ['TPVUI', 'RNTVG', 'UQWVK', 'TQXUI'], 'TPVUI', 'Each letter is shifted forward by one alphabet position.', 15),
  buildQuestion('iq', 11, 'normal', 'Which figure would balance 3 circles if 1 circle equals 2 squares?', ['2 squares', '3 squares', '6 squares', '8 squares'], '6 squares', 'Three circles equal six squares because each circle equals two squares.', 15),
  buildQuestion('iq', 12, 'normal', 'What is the odd one out?', ['Compass', 'Map', 'Thermometer', 'Route'], 'Thermometer', 'The others help with navigation; a thermometer measures temperature.', 15),
  buildQuestion('iq', 13, 'hard', 'A sequence goes 1, 1, 2, 3, 5, 8, ?. What is next?', ['11', '12', '13', '15'], '13', 'Each term is the sum of the two previous terms.', 20),
  buildQuestion('iq', 14, 'hard', 'If five machines make five parts in five minutes, how long do 100 machines take to make 100 parts?', ['5 minutes', '20 minutes', '50 minutes', '100 minutes'], '5 minutes', 'Each machine makes one part in five minutes, so 100 machines make 100 parts in five minutes.', 20),
  buildQuestion('iq', 15, 'hard', 'Which statement is logically equivalent to "If it rains, the ground gets wet"?', ['If the ground is wet, it rained', 'If the ground is not wet, it did not rain', 'If it does not rain, the ground is dry', 'The ground is always wet'], 'If the ground is not wet, it did not rain', 'This is the contrapositive and preserves the same logical meaning.', 20),
  buildQuestion('iq', 16, 'hard', 'Which number completes the grid pattern: 4, 9, 16, 25, ?', ['30', '32', '36', '49'], '36', 'The values are consecutive squares: 2 squared through 6 squared.', 20),
  buildQuestion('iq', 17, 'hard', 'A clock shows 3:15. What is the smaller angle between the hands?', ['0 degrees', '7.5 degrees', '15 degrees', '30 degrees'], '7.5 degrees', 'At 3:15 the hour hand has moved 7.5 degrees past 3 while the minute hand is at 3.', 20),
  buildQuestion('iq', 18, 'hard', 'Which word best completes the analogy: seed is to tree as spark is to ?', ['Smoke', 'Fire', 'Ash', 'Light'], 'Fire', 'A seed can grow into a tree, and a spark can grow into a fire.', 20),
  buildQuestion('iq', 19, 'hard', 'If every red gem is rare and some rare gems glow, what can be concluded?', ['All red gems glow', 'Some glowing gems are red', 'No red gems glow', 'No certain glow conclusion follows'], 'No certain glow conclusion follows', 'The statements do not prove whether any red gems are among the glowing rare gems.', 20),
  buildQuestion('iq', 20, 'hard', 'What comes next: 1, 4, 9, 16, 25, ?', ['30', '35', '36', '49'], '36', 'The sequence lists square numbers from 1 squared to 6 squared.', 20),
];

const generalQuestions = [
  buildQuestion('general', 1, 'easy', 'What is the capital city of France?', ['Madrid', 'Paris', 'Berlin', 'Rome'], 'Paris', 'Paris is the capital city of France.', 10),
  buildQuestion('general', 2, 'easy', 'Which ocean is the largest on Earth?', ['Atlantic Ocean', 'Indian Ocean', 'Pacific Ocean', 'Arctic Ocean'], 'Pacific Ocean', 'The Pacific Ocean is the largest ocean by area.', 10),
  buildQuestion('general', 3, 'easy', 'How many days are in a leap year?', ['364', '365', '366', '367'], '366', 'A leap year has one extra day in February.', 10),
  buildQuestion('general', 4, 'easy', 'Which continent is Egypt in?', ['Asia', 'Africa', 'Europe', 'South America'], 'Africa', 'Egypt is located in northeastern Africa.', 10),
  buildQuestion('general', 5, 'normal', 'Who wrote "Romeo and Juliet"?', ['Charles Dickens', 'Jane Austen', 'William Shakespeare', 'Mark Twain'], 'William Shakespeare', 'Romeo and Juliet is one of Shakespeare plays.', 15),
  buildQuestion('general', 6, 'normal', 'Which planet is known as the Red Planet?', ['Venus', 'Mars', 'Jupiter', 'Mercury'], 'Mars', 'Mars appears reddish because of iron oxide on its surface.', 15),
  buildQuestion('general', 7, 'normal', 'What is the currency of Japan?', ['Yuan', 'Won', 'Yen', 'Ringgit'], 'Yen', 'Japan uses the yen as its currency.', 15),
  buildQuestion('general', 8, 'normal', 'Which language has the most native speakers worldwide?', ['English', 'Mandarin Chinese', 'Spanish', 'Hindi'], 'Mandarin Chinese', 'Mandarin Chinese has the largest number of native speakers.', 15),
  buildQuestion('general', 9, 'normal', 'What is the tallest mountain above sea level?', ['K2', 'Mount Everest', 'Kilimanjaro', 'Denali'], 'Mount Everest', 'Mount Everest is the highest mountain above sea level.', 15),
  buildQuestion('general', 10, 'normal', 'Which instrument measures atmospheric pressure?', ['Barometer', 'Thermometer', 'Hygrometer', 'Altimeter'], 'Barometer', 'A barometer measures atmospheric pressure.', 15),
  buildQuestion('general', 11, 'normal', 'Which country is home to the city of Kyoto?', ['China', 'Japan', 'Thailand', 'South Korea'], 'Japan', 'Kyoto is a historic city in Japan.', 15),
  buildQuestion('general', 12, 'normal', 'What does UNESCO primarily protect and promote?', ['World heritage and culture', 'Private banking', 'Military alliances', 'Space launches'], 'World heritage and culture', 'UNESCO focuses on education, science, culture, and heritage.', 15),
  buildQuestion('general', 13, 'hard', 'Which year did the Berlin Wall fall?', ['1987', '1989', '1991', '1993'], '1989', 'The Berlin Wall fell in November 1989.', 20),
  buildQuestion('general', 14, 'hard', 'Which ancient civilization built Machu Picchu?', ['Maya', 'Aztec', 'Inca', 'Olmec'], 'Inca', 'Machu Picchu was built by the Inca civilization.', 20),
  buildQuestion('general', 15, 'hard', 'Which treaty formally ended World War I for Germany?', ['Treaty of Paris', 'Treaty of Versailles', 'Treaty of Rome', 'Treaty of Ghent'], 'Treaty of Versailles', 'The Treaty of Versailles was signed in 1919.', 20),
  buildQuestion('general', 16, 'hard', 'Who painted "The Starry Night"?', ['Pablo Picasso', 'Vincent van Gogh', 'Claude Monet', 'Salvador Dali'], 'Vincent van Gogh', 'Van Gogh painted The Starry Night in 1889.', 20),
  buildQuestion('general', 17, 'hard', 'Which river is the longest in South America?', ['Amazon River', 'Parana River', 'Orinoco River', 'Sao Francisco River'], 'Amazon River', 'The Amazon River is the longest river system in South America.', 20),
  buildQuestion('general', 18, 'hard', 'What is the official language of Brazil?', ['Spanish', 'Portuguese', 'French', 'English'], 'Portuguese', 'Brazil official language is Portuguese.', 20),
  buildQuestion('general', 19, 'hard', 'Which branch of government interprets laws in the United States?', ['Executive', 'Legislative', 'Judicial', 'Municipal'], 'Judicial', 'The judicial branch interprets laws through courts.', 20),
  buildQuestion('general', 20, 'hard', 'Which composer became deaf later in life yet continued composing?', ['Mozart', 'Beethoven', 'Bach', 'Haydn'], 'Beethoven', 'Ludwig van Beethoven continued composing after major hearing loss.', 20),
];

const healthQuestions = [
  buildQuestion('health', 1, 'easy', 'Which nutrient is the body main quick energy source?', ['Protein', 'Carbohydrate', 'Vitamin C', 'Calcium'], 'Carbohydrate', 'Carbohydrates are commonly used as a quick energy source.', 10),
  buildQuestion('health', 2, 'easy', 'What is a common sign of dehydration?', ['Increased thirst', 'Sharper eyesight', 'Lower heart rate only', 'Blue skin'], 'Increased thirst', 'Thirst is a common early signal that fluid intake is needed.', 10),
  buildQuestion('health', 3, 'easy', 'Which activity strengthens the heart most directly?', ['Cardiovascular exercise', 'Reading', 'Stretching only', 'Meditation only'], 'Cardiovascular exercise', 'Cardio training challenges and strengthens the cardiovascular system.', 10),
  buildQuestion('health', 4, 'easy', 'Which mineral is important for healthy bones?', ['Calcium', 'Sodium', 'Copper only', 'Fluoride only'], 'Calcium', 'Calcium supports bone structure and strength.', 10),
  buildQuestion('health', 5, 'normal', 'What does protein help repair and build?', ['Muscle tissue', 'Tooth enamel only', 'Hair color', 'Blood type'], 'Muscle tissue', 'Protein supplies amino acids used for tissue repair and growth.', 15),
  buildQuestion('health', 6, 'normal', 'Which sleep stage is strongly linked with vivid dreaming?', ['REM sleep', 'Light sleep only', 'Awake rest', 'Sleep latency'], 'REM sleep', 'REM sleep is commonly associated with vivid dreams.', 15),
  buildQuestion('health', 7, 'normal', 'What is progressive overload in training?', ['Gradually increasing challenge', 'Skipping warmups', 'Only training once', 'Avoiding all resistance'], 'Gradually increasing challenge', 'Progressive overload means increasing demand over time to drive adaptation.', 15),
  buildQuestion('health', 8, 'normal', 'Which habit best supports recovery after hard training?', ['Adequate sleep', 'Ignoring soreness', 'Never drinking water', 'Training maximal daily'], 'Adequate sleep', 'Sleep supports hormonal balance, repair, and performance recovery.', 15),
  buildQuestion('health', 9, 'normal', 'What is fiber most known for supporting?', ['Digestive health', 'Bone length', 'Eye color', 'Blood type'], 'Digestive health', 'Dietary fiber helps digestion and bowel regularity.', 15),
  buildQuestion('health', 10, 'normal', 'Which warmup style usually prepares joints for movement best?', ['Dynamic warmup', 'Heavy max lift', 'Long nap', 'Static-only cold stretch'], 'Dynamic warmup', 'Dynamic warmups increase blood flow and rehearse movement patterns.', 15),
  buildQuestion('health', 11, 'normal', 'Which vitamin is produced in skin with sunlight exposure?', ['Vitamin A', 'Vitamin D', 'Vitamin K', 'Vitamin B12'], 'Vitamin D', 'Sunlight helps the body synthesize vitamin D.', 15),
  buildQuestion('health', 12, 'normal', 'What does BMI estimate from height and weight?', ['Body mass category', 'Exact body fat percentage', 'Blood oxygen level', 'Daily protein need exactly'], 'Body mass category', 'BMI is a broad screening ratio based on height and weight.', 15),
  buildQuestion('health', 13, 'hard', 'Which macronutrient has 9 calories per gram?', ['Protein', 'Carbohydrate', 'Fat', 'Fiber'], 'Fat', 'Dietary fat provides about 9 calories per gram.', 20),
  buildQuestion('health', 14, 'hard', 'What is VO2 max a measure of?', ['Maximal oxygen uptake', 'Bone density', 'Grip width', 'Resting glucose only'], 'Maximal oxygen uptake', 'VO2 max estimates the body maximum ability to use oxygen during exercise.', 20),
  buildQuestion('health', 15, 'hard', 'Which training zone is typically easiest to sustain for aerobic base work?', ['Zone 2', 'Zone 5', 'One rep max', 'Anaerobic sprint only'], 'Zone 2', 'Zone 2 is commonly used for sustainable aerobic development.', 20),
  buildQuestion('health', 16, 'hard', 'What is the main role of electrolytes during exercise?', ['Support fluid balance and nerve signaling', 'Replace all calories', 'Build bones instantly', 'Stop sweating completely'], 'Support fluid balance and nerve signaling', 'Electrolytes help fluid balance, muscle contraction, and nerve impulses.', 20),
  buildQuestion('health', 17, 'hard', 'Which marker is commonly used to estimate training recovery strain?', ['Resting heart rate', 'Shoe size', 'Hair length', 'Eye color'], 'Resting heart rate', 'Elevated resting heart rate can indicate stress or incomplete recovery.', 20),
  buildQuestion('health', 18, 'hard', 'What is sarcopenia?', ['Age-related muscle loss', 'Excess hydration', 'Improved eyesight', 'Temporary hunger'], 'Age-related muscle loss', 'Sarcopenia refers to loss of muscle mass and function with age.', 20),
  buildQuestion('health', 19, 'hard', 'Which principle says training adaptations are specific to the work performed?', ['SAID principle', 'Archimedes principle', 'Pareto principle', 'Uncertainty principle'], 'SAID principle', 'SAID means specific adaptation to imposed demands.', 20),
  buildQuestion('health', 20, 'hard', 'What does RPE measure in training?', ['Perceived effort', 'Protein efficiency', 'Pulse electricity', 'Resting posture estimate'], 'Perceived effort', 'RPE is rating of perceived exertion, a subjective effort scale.', 20),
];

const scienceQuestions = [
  buildQuestion('science', 1, 'easy', 'What gas do plants absorb for photosynthesis?', ['Oxygen', 'Carbon dioxide', 'Hydrogen', 'Neon'], 'Carbon dioxide', 'Plants use carbon dioxide, water, and light to make sugars.', 10),
  buildQuestion('science', 2, 'easy', 'What is H2O commonly called?', ['Salt', 'Water', 'Hydrogen peroxide', 'Oxygen'], 'Water', 'H2O is the chemical formula for water.', 10),
  buildQuestion('science', 3, 'easy', 'Which force pulls objects toward Earth?', ['Magnetism', 'Gravity', 'Friction', 'Buoyancy'], 'Gravity', 'Gravity attracts mass toward mass, including objects toward Earth.', 10),
  buildQuestion('science', 4, 'easy', 'What part of a cell contains genetic material?', ['Nucleus', 'Ribosome only', 'Cell wall only', 'Cytoplasm only'], 'Nucleus', 'In many cells, the nucleus houses DNA.', 10),
  buildQuestion('science', 5, 'normal', 'What is the chemical symbol for gold?', ['Go', 'Gd', 'Au', 'Ag'], 'Au', 'Gold chemical symbol is Au, from the Latin aurum.', 15),
  buildQuestion('science', 6, 'normal', 'Which planet has the strongest known rings?', ['Mars', 'Saturn', 'Venus', 'Mercury'], 'Saturn', 'Saturn is famous for its large ring system.', 15),
  buildQuestion('science', 7, 'normal', 'What is the basic unit of life?', ['Atom', 'Cell', 'Organ', 'Molecule'], 'Cell', 'Cells are the basic structural and functional units of life.', 15),
  buildQuestion('science', 8, 'normal', 'What does DNA stand for?', ['Deoxyribonucleic acid', 'Dynamic nuclear atom', 'Dual nitrogen array', 'Direct nutrient acid'], 'Deoxyribonucleic acid', 'DNA stands for deoxyribonucleic acid.', 15),
  buildQuestion('science', 9, 'normal', 'Which particle has a negative charge?', ['Proton', 'Neutron', 'Electron', 'Photon'], 'Electron', 'Electrons carry negative electric charge.', 15),
  buildQuestion('science', 10, 'normal', 'What process changes liquid water into vapor?', ['Condensation', 'Evaporation', 'Freezing', 'Deposition'], 'Evaporation', 'Evaporation is the transition from liquid to gas at a surface.', 15),
  buildQuestion('science', 11, 'normal', 'Which organ pumps blood around the body?', ['Liver', 'Heart', 'Lung', 'Kidney'], 'Heart', 'The heart pumps blood through the circulatory system.', 15),
  buildQuestion('science', 12, 'normal', 'Which layer protects Earth from much ultraviolet radiation?', ['Ozone layer', 'Core layer', 'Mantle layer', 'Crust layer'], 'Ozone layer', 'The ozone layer absorbs much of the Sun ultraviolet radiation.', 15),
  buildQuestion('science', 13, 'hard', 'What is Newton second law commonly written as?', ['E = mc2', 'F = ma', 'PV = nRT', 'V = IR'], 'F = ma', 'Newton second law relates force, mass, and acceleration.', 20),
  buildQuestion('science', 14, 'hard', 'Which molecule carries energy in cells?', ['ATP', 'RNA only', 'Keratin', 'Cellulose only'], 'ATP', 'ATP is a primary energy carrier in living cells.', 20),
  buildQuestion('science', 15, 'hard', 'What type of bond involves sharing electron pairs?', ['Ionic bond', 'Covalent bond', 'Metallic scrape', 'Hydraulic bond'], 'Covalent bond', 'Covalent bonds form when atoms share electron pairs.', 20),
  buildQuestion('science', 16, 'hard', 'Which law says energy cannot be created or destroyed in an isolated system?', ['Conservation of energy', 'Law of supply', 'Boyle naming rule', 'Hooke naming rule'], 'Conservation of energy', 'The conservation of energy states total energy remains constant in an isolated system.', 20),
  buildQuestion('science', 17, 'hard', 'What is the pH of a neutral solution at room temperature?', ['0', '7', '10', '14'], '7', 'Neutral water is approximately pH 7 at room temperature.', 20),
  buildQuestion('science', 18, 'hard', 'Which telescope type uses mirrors as its primary light-gathering element?', ['Refracting telescope', 'Reflecting telescope', 'Radio clock', 'Spectral scale'], 'Reflecting telescope', 'Reflecting telescopes use mirrors to gather and focus light.', 20),
  buildQuestion('science', 19, 'hard', 'What is the powerhouse of the cell?', ['Mitochondrion', 'Golgi apparatus', 'Nucleolus', 'Cell membrane'], 'Mitochondrion', 'Mitochondria produce much of the ATP used by eukaryotic cells.', 20),
  buildQuestion('science', 20, 'hard', 'Which scale measures earthquake magnitude?', ['Richter scale', 'Beaufort scale', 'Mohs scale', 'Kelvin scale'], 'Richter scale', 'The Richter scale is a classic measure of earthquake magnitude.', 20),
];

const logicQuestions = [
  buildQuestion('logic', 1, 'easy', 'If the lamp is on, the room is lit. The lamp is on. What follows?', ['The room is lit', 'The room is dark', 'The lamp is broken', 'Nothing follows'], 'The room is lit', 'This follows by direct implication.', 10),
  buildQuestion('logic', 2, 'easy', 'Which statement contradicts "All keys are metal"?', ['Some keys are metal', 'No keys exist', 'One key is plastic', 'Metal can be shiny'], 'One key is plastic', 'A single non-metal key contradicts the claim that all keys are metal.', 10),
  buildQuestion('logic', 3, 'easy', 'A and B are true. Which is true?', ['A and B', 'A and not B', 'Not A and B', 'Neither A nor B'], 'A and B', 'If both statements are true, their conjunction is true.', 10),
  buildQuestion('logic', 4, 'easy', 'Which option is always true if "No cats are birds" is true?', ['Some cats are birds', 'No birds are cats', 'All birds are cats', 'All cats fly'], 'No birds are cats', 'The relationship is symmetric for a no-overlap claim.', 10),
  buildQuestion('logic', 5, 'normal', 'If A implies B, and B implies C, what does A imply?', ['C', 'Not C', 'Only B', 'Nothing'], 'C', 'Implications chain from A to B to C.', 15),
  buildQuestion('logic', 6, 'normal', 'Which is the negation of "Everyone trained today"?', ['Everyone rested today', 'No one trained today', 'At least one person did not train today', 'Someone trained yesterday'], 'At least one person did not train today', 'Negating everyone means at least one exception exists.', 15),
  buildQuestion('logic', 7, 'normal', 'If exactly one of A or B is true, and A is false, what is B?', ['True', 'False', 'Both true', 'Unknown'], 'True', 'Exactly one must be true, so B must be true.', 15),
  buildQuestion('logic', 8, 'normal', 'Which argument form is valid?', ['If P then Q. P. Therefore Q.', 'If P then Q. Q. Therefore P.', 'If P then Q. Not P. Therefore not Q.', 'P or Q. P. Therefore not Q.'], 'If P then Q. P. Therefore Q.', 'This is modus ponens, a valid argument form.', 15),
  buildQuestion('logic', 9, 'normal', 'If a box cannot be both open and closed, and it is open, what is false?', ['It is open', 'It is closed', 'It exists', 'It is a box'], 'It is closed', 'Mutual exclusivity means closed is false when open is true.', 15),
  buildQuestion('logic', 10, 'normal', 'Which statement is a tautology?', ['P or not P', 'P and not P', 'If P then not P', 'P only if false'], 'P or not P', 'A statement or its negation is always true in classical logic.', 15),
  buildQuestion('logic', 11, 'normal', 'If all runners are athletes and Mia is a runner, what is Mia?', ['Athlete', 'Coach', 'Spectator', 'Unknown only'], 'Athlete', 'Membership in runners implies membership in athletes.', 15),
  buildQuestion('logic', 12, 'normal', 'Which is an example of circular reasoning?', ['A is true because A is true', 'A is true because B proves A', 'A is false because C', 'A is unknown'], 'A is true because A is true', 'Circular reasoning uses the conclusion as its own support.', 15),
  buildQuestion('logic', 13, 'hard', 'What is the contrapositive of "If P, then Q"?', ['If Q, then P', 'If not P, then not Q', 'If not Q, then not P', 'P and Q'], 'If not Q, then not P', 'The contrapositive reverses and negates both sides.', 20),
  buildQuestion('logic', 14, 'hard', 'Which fallacy attacks the person instead of the argument?', ['Ad hominem', 'Straw man', 'False dilemma', 'Appeal to nature'], 'Ad hominem', 'Ad hominem attacks target a person rather than their claim.', 20),
  buildQuestion('logic', 15, 'hard', 'If P is false and Q is true, what is P AND Q?', ['True', 'False', 'Both', 'Cannot determine'], 'False', 'A conjunction is true only when both parts are true.', 20),
  buildQuestion('logic', 16, 'hard', 'If P is false and Q is true, what is P OR Q?', ['True', 'False', 'Neither', 'Cannot determine'], 'True', 'An inclusive OR is true if at least one part is true.', 20),
  buildQuestion('logic', 17, 'hard', 'Which statement follows from "Some artists are engineers"?', ['Some engineers are artists', 'All engineers are artists', 'No artists are engineers', 'All artists are engineers'], 'Some engineers are artists', 'Some overlap works in both directions for the two sets.', 20),
  buildQuestion('logic', 18, 'hard', 'Which inference is invalid?', ['Denying the antecedent', 'Modus ponens', 'Modus tollens', 'Disjunctive syllogism'], 'Denying the antecedent', 'Denying the antecedent does not logically prove the consequent false.', 20),
  buildQuestion('logic', 19, 'hard', 'If a claim is necessary, what does that mean in modal logic?', ['It is true in all possible worlds', 'It is sometimes false', 'It is only guessed', 'It is never true'], 'It is true in all possible worlds', 'Necessity means truth across all possible worlds in modal semantics.', 20),
  buildQuestion('logic', 20, 'hard', 'Which connective is false only when both inputs are true?', ['NAND', 'AND', 'OR', 'Biconditional'], 'NAND', 'NAND is the negation of AND, so it is false only when both inputs are true.', 20),
];

const mathsQuestions = [
  buildQuestion('maths', 1, 'easy', 'What is 7 + 8?', ['13', '14', '15', '16'], '15', '7 plus 8 equals 15.', 10),
  buildQuestion('maths', 2, 'easy', 'What is 9 x 6?', ['42', '48', '54', '63'], '54', '9 multiplied by 6 equals 54.', 10),
  buildQuestion('maths', 3, 'easy', 'What is half of 50?', ['20', '25', '30', '35'], '25', 'Half means divide by 2, and 50 divided by 2 is 25.', 10),
  buildQuestion('maths', 4, 'easy', 'How many sides does a triangle have?', ['2', '3', '4', '5'], '3', 'A triangle has three sides.', 10),
  buildQuestion('maths', 5, 'normal', 'What is 12 squared?', ['24', '64', '121', '144'], '144', '12 squared means 12 multiplied by 12.', 15),
  buildQuestion('maths', 6, 'normal', 'What is 15 percent of 200?', ['15', '20', '30', '45'], '30', '0.15 multiplied by 200 equals 30.', 15),
  buildQuestion('maths', 7, 'normal', 'Solve for x: x + 9 = 17.', ['6', '7', '8', '9'], '8', 'Subtract 9 from both sides to get x = 8.', 15),
  buildQuestion('maths', 8, 'normal', 'What is the perimeter of a square with side length 5?', ['10', '15', '20', '25'], '20', 'A square perimeter is 4 times its side length.', 15),
  buildQuestion('maths', 9, 'normal', 'What is 3/4 as a decimal?', ['0.25', '0.5', '0.75', '1.25'], '0.75', '3 divided by 4 equals 0.75.', 15),
  buildQuestion('maths', 10, 'normal', 'What is the mean of 4, 6, and 8?', ['5', '6', '7', '8'], '6', 'The sum is 18, and 18 divided by 3 is 6.', 15),
  buildQuestion('maths', 11, 'normal', 'What is 81 divided by 9?', ['7', '8', '9', '10'], '9', '81 divided by 9 equals 9.', 15),
  buildQuestion('maths', 12, 'normal', 'What is the area of a rectangle 4 by 7?', ['11', '14', '22', '28'], '28', 'Rectangle area equals length multiplied by width.', 15),
  buildQuestion('maths', 13, 'hard', 'What is the square root of 169?', ['11', '12', '13', '14'], '13', '13 multiplied by 13 equals 169.', 20),
  buildQuestion('maths', 14, 'hard', 'Solve: 2x - 5 = 11.', ['6', '7', '8', '9'], '8', 'Add 5 to get 2x = 16, then divide by 2.', 20),
  buildQuestion('maths', 15, 'hard', 'What is 2 to the power of 5?', ['16', '24', '32', '64'], '32', '2 multiplied by itself five times equals 32.', 20),
  buildQuestion('maths', 16, 'hard', 'What is the next prime after 17?', ['18', '19', '21', '23'], '19', '19 is prime and comes directly after 17 among prime numbers.', 20),
  buildQuestion('maths', 17, 'hard', 'What is the sum of interior angles in a quadrilateral?', ['180 degrees', '270 degrees', '360 degrees', '540 degrees'], '360 degrees', 'A quadrilateral can be divided into two triangles, totaling 360 degrees.', 20),
  buildQuestion('maths', 18, 'hard', 'What is 5 factorial?', ['25', '60', '120', '240'], '120', '5 factorial is 5 x 4 x 3 x 2 x 1.', 20),
  buildQuestion('maths', 19, 'hard', 'If a circle radius is 3, what is its area?', ['3 pi', '6 pi', '9 pi', '12 pi'], '9 pi', 'Circle area is pi times radius squared, so pi times 9.', 20),
  buildQuestion('maths', 20, 'hard', 'What is the slope between points (0, 0) and (4, 8)?', ['1', '2', '4', '8'], '2', 'Slope is change in y divided by change in x: 8 divided by 4.', 20),
];

export const brainQuestBank = [
  ...iqQuestions,
  ...generalQuestions,
  ...healthQuestions,
  ...scienceQuestions,
  ...logicQuestions,
  ...mathsQuestions,
];

export function validateBrainQuestBank(questions = brainQuestBank) {
  const errors = [];
  const categoryCounts = QUESTION_CATEGORIES.reduce(
    (counts, category) => ({
      ...counts,
      [category]: 0,
    }),
    {},
  );
  const ids = new Set();

  if (!Array.isArray(questions)) {
    return {
      valid: false,
      errors: ['Question bank must be an array.'],
      total: 0,
      categoryCounts,
    };
  }

  questions.forEach((question, index) => {
    const path = `question[${index}]`;

    if (!question?.id) {
      errors.push(`${path} is missing id.`);
    } else if (ids.has(question?.id)) {
      errors.push(`${path} has duplicate id ${question?.id}.`);
    } else {
      ids.add(question?.id);
    }

    if (!QUESTION_CATEGORIES.includes(question?.category)) {
      errors.push(`${path} has invalid category ${question?.category || 'missing'}.`);
    } else {
      categoryCounts[question?.category] += 1;
    }

    if (!question?.difficulty) {
      errors.push(`${path} is missing difficulty.`);
    }

    if (!question?.question) {
      errors.push(`${path} is missing question text.`);
    }

    if (!Array.isArray(question?.options) || question?.options?.length !== 4) {
      errors.push(`${path} must include exactly 4 options.`);
    }

    if (!question?.correctAnswer) {
      errors.push(`${path} is missing correctAnswer.`);
    }

    if (Array.isArray(question?.options) && !question?.options?.some((option) => String(option).trim() === String(question?.correctAnswer).trim())) {
      errors.push(`${path} correctAnswer must match one option.`);
    }

    if (!question?.explanation) {
      errors.push(`${path} is missing explanation.`);
    }

    if (!Number.isFinite(Number(question?.points)) || Number(question?.points) <= 0) {
      errors.push(`${path} points must be a positive number.`);
    }
  });

  QUESTION_CATEGORIES.forEach((category) => {
    if (categoryCounts?.[category] < REQUIRED_QUESTIONS_PER_CATEGORY) {
      errors.push(`${category} must include at least ${REQUIRED_QUESTIONS_PER_CATEGORY} questions.`);
    }
  });

  return {
    valid: errors?.length === 0,
    errors,
    total: questions?.length || 0,
    categoryCounts,
  };
}

export { QUESTION_CATEGORIES, REQUIRED_QUESTIONS_PER_CATEGORY };
