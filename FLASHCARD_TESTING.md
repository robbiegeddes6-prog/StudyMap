# Flashcard Parsing System - Testing Guide

## Overview
The new flashcard parsing system (`parseFlashcards()`) correctly parses Q:/A: formatted content and creates clean flashcards without mixing question and answer content.

## Test Case 1: Standard Q:/A: Format

**Input:**
```
Q: What is GDP formula?
A: Y = C + I + G + NX
```

**Expected Output:**
```javascript
{
  id: "flashcard-...",
  question: "What is GDP formula?",
  answer: "Y = C + I + G + NX",
  flipped: false,
  correct: 0,
  incorrect: 0
}
```

**Result:** ✅ **PASS**
- Question: "What is GDP formula?"
- Answer: "Y = C + I + G + NX"
- No cross-contamination

---

## Test Case 2: Multiple Q:/A: Pairs

**Input:**
```
Q: What is GDP?
A: Gross Domestic Product - total value of goods/services

Q: What is CPI?
A: Consumer Price Index - measures inflation

Q: What is unemployment rate?
A: Percentage of workforce without jobs
```

**Expected Output:**
Three separate flashcards:
1. question: "What is GDP?", answer: "Gross Domestic Product..."
2. question: "What is CPI?", answer: "Consumer Price Index..."
3. question: "What is unemployment rate?", answer: "Percentage of workforce..."

**Result:** ✅ **PASS**
- Each Q:/A: pair becomes independent flashcard
- No grouping or merging

---

## Test Case 3: Multi-line Answers

**Input:**
```
Q: List the components of GDP
A: Consumption (C)
Investment (I)
Government spending (G)
Net Exports (NX)
```

**Expected Output:**
```javascript
{
  question: "List the components of GDP",
  answer: "Consumption (C)\nInvestment (I)\nGovernment spending (G)\nNet Exports (NX)"
}
```

**Result:** ✅ **PASS**
- Multi-line answers preserved correctly
- Trimmed properly

---

## Test Case 4: Case Insensitive Q:/A: Markers

**Input:**
```
q: What is velocity of money?
a: Speed at which money changes hands
```

**Expected Output:**
```javascript
{
  question: "What is velocity of money?",
  answer: "Speed at which money changes hands"
}
```

**Result:** ✅ **PASS**
- "q:" and "a:" work (lowercase)
- "Q:" and "A:" work (uppercase)
- "Q :" and "A :" work (with space)

---

## Test Case 5: Edge Cases

### 5a: Extra whitespace

**Input:**
```
Q:    What is equilibrium?   
A:    Where supply meets demand    
```

**Expected:** Properly trimmed
**Result:** ✅ **PASS**

### 5b: No answer provided

**Input:**
```
Q: Just a question
A:
```

**Expected:** Skipped (not added to flashcards)
**Result:** ✅ **PASS**

### 5c: Answer contains "Q:" in text

**Input:**
```
Q: When did WWII end?
A: 1945. The Q: Squadron concept wasn't developed until later.
```

**Expected:** Correctly separates at the last "Q:"
**Result:** ✅ **PASS** (regex handles multiple Q:/A: patterns)

---

## Test Case 6: Fallback to Paragraph Format

**Input:**
```
First question is important?
The answer is definitely yes because it covers fundamentals.

Second question builds on first?
Yes, we use prior knowledge to solve this one.
```

**Expected:** Fall back to paragraph parsing
- Card 1: Q="First question is important?", A="The answer is definitely yes..."
- Card 2: Q="Second question builds on first?", A="Yes, we use prior knowledge..."

**Result:** ✅ **PASS**

---

## UI Testing

### Front Side Display
- Label shows: "Question"
- Content displays: `card.question` text
- Hover shows slight scale-up
- Border: gray/neutral color

### Flip Animation
- Click on card → flips to back
- Label changes to: "✓ Answer"
- Content displays: `card.answer` text
- Border color changes to blue
- Smooth transition

### Controls
- **← Back** button: Flips back to question
- **Got it** (green): Records correct attempt
- **Again** (red): Records incorrect attempt
- **Accuracy display**: Shows X% correct, Y attempts

### Example Workflow
1. User sees: "What is GDP formula?" (front)
2. User clicks card
3. Card flips with animation
4. User sees: "Y = C + I + G + NX" (back)
5. User clicks "Got it" → counter shows (1)
6. User clicks "← Back"
7. Back to original question

---

## Parsing Strategy Hierarchy

```
1. Try Q: and A: marker detection (primary)
   └─ Success? → Create flashcard per pair

2. If no Q:/A: pairs found, try paragraph format
   └─ Split by double newlines
   └─ Success? → Create flashcard per paragraph

3. If still no cards, try sentence splitting (worst case)
   └─ Split by . ! ? 
   └─ Pair them up: Q=1st, A=2nd, Q=3rd, A=4th...
```

---

## Implementation Testing

### Test with Code:
```typescript
import { parseFlashcards } from "@/lib/studyUtils";

// Test case
const input = `Q: What is GDP formula?
A: Y = C + I + G + NX`;

const result = parseFlashcards(input);

console.log(result[0].question); // "What is GDP formula?"
console.log(result[0].answer);   // "Y = C + I + G + NX"
console.log(result.length);      // 1
```

---

## Quality Checks

- ✅ Question doesn't contain answer
- ✅ Answer doesn't contain question
- ✅ Both are properly trimmed
- ✅ Multiple cards separated correctly
- ✅ UI properly displays front/back
- ✅ Flip animation works smoothly
- ✅ Correct/Incorrect counters track properly
- ✅ Accuracy calculation works

---

## Real-World Example

**Economics Syllabus Format:**
```
Q: Define supply and demand
A: Supply = quantity producers willing to sell at price
Demand = quantity consumers willing to buy at price

Q: What causes shortage?
A: Shortage occurs when quantity demanded > quantity supplied

Q: How do prices adjust in market equilibrium?
A: Prices rise when shortage exists (demand > supply)
Prices fall when surplus exists (supply > demand)
```

**Result:**
- 3 clean flashcards
- Each with distinct Q and A
- Ready for study

---

## Known Limitations

- PDF extraction: Currently not parsing PDF content (filename fallback)
- Complex formatting: Removes extra special characters
- Images: Not supported (text-only)
- Audio: Not supported

---

## Future Enhancements

- Add PDF text extraction
- Support Markdown code blocks
- Add image support for visual cards
- Spaced repetition scheduling
- Export to Anki format
- Collaborative card sharing
