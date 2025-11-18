# Formula Testing Plan

This document outlines manual tests for the formula functionality in SheetIsSmart.

## Formula Autocomplete Tests

### Test 1: Autocomplete Trigger
1. Double-click a cell to edit
2. Type `=`
3. **Expected**: Autocomplete dropdown appears showing all formulas (SUM, AVG, COUNT, MIN, MAX, PRODUCT, CONCAT, IF)

### Test 2: Autocomplete Filtering
1. Double-click a cell to edit
2. Type `=S`
3. **Expected**: Only `SUM` appears in autocomplete
4. Type `=CO`
5. **Expected**: `COUNT` and `CONCAT` appear in autocomplete

### Test 3: Autocomplete Selection
1. Double-click a cell to edit
2. Type `=S`
3. Press Tab or Enter
4. **Expected**: Formula is inserted as `=SUM()`
5. Cursor should be positioned inside the parentheses

### Test 4: Autocomplete Close
1. Double-click a cell to edit
2. Type `=SUM(`
3. **Expected**: Autocomplete closes when `(` is typed

## Basic Formula Tests

### Test 5: SUM Formula
1. Create cells with values: A1=10, A2=20, A3=30
2. In cell A4, enter `=SUM(10,20,30)`
3. **Expected**: Cell displays `60`

### Test 6: AVG Formula
1. Create cells with values: B1=10, B2=20, B3=30
2. In cell B4, enter `=AVG(10,20,30)`
3. **Expected**: Cell displays `20`

### Test 7: COUNT Formula
1. Create cells with values: C1=5, C2=10, C3=15, C4=""
2. In cell C5, enter `=COUNT(5,10,15)`
3. **Expected**: Cell displays `3`

### Test 8: MIN Formula
1. In a cell, enter `=MIN(5,2,9,1,7)`
2. **Expected**: Cell displays `1`

### Test 9: MAX Formula
1. In a cell, enter `=MAX(5,2,9,1,7)`
2. **Expected**: Cell displays `9`

### Test 10: PRODUCT Formula
1. In a cell, enter `=PRODUCT(2,3,4)`
2. **Expected**: Cell displays `24`

### Test 11: CONCAT Formula
1. In a cell, enter `=CONCAT("Hello"," ","World")`
2. **Expected**: Cell displays `Hello World`

### Test 12: IF Formula - True Condition
1. In a cell, enter `=IF(5>3,"Yes","No")`
2. **Expected**: Cell displays `Yes`

### Test 13: IF Formula - False Condition
1. In a cell, enter `=IF(2>5,"Yes","No")`
2. **Expected**: Cell displays `No`

## Cell Reference Tests

### Test 14: Cell Click in Formula Mode
1. Double-click a cell to edit
2. Type `=SUM(`
3. Click another cell (e.g., A1)
4. **Expected**: Cell reference added to formula (e.g., `=SUM(A1`)
5. Type `,`
6. Click another cell (e.g., A2)
7. **Expected**: Formula becomes `=SUM(A1,A2`

### Test 15: Multiple Cell References
1. Create cells: A1=10, A2=20
2. In cell A3, double-click to edit
3. Type `=SUM(`
4. Click A1
5. Type `,`
6. Click A2
7. Type `)`
8. Press Enter
9. **Expected**: Cell displays `30`

## Formula Editing Tests

### Test 16: Auto-Close Parentheses
1. Double-click a cell to edit
2. Type `=SUM(1,2,3`
3. Press Enter or click outside
4. **Expected**: Formula auto-completes to `=SUM(1,2,3)`

### Test 17: Escape Cancels Edit
1. Double-click a cell to edit
2. Type `=SUM(1,2,3)`
3. Press Escape
4. **Expected**: Edit is cancelled, original value remains

### Test 18: Formula Display
1. Create a cell with `=SUM(1,2,3)`
2. **Expected**:
   - When editing: Shows `=SUM(1,2,3)`
   - When not editing: Shows computed value `6`

## Edge Cases

### Test 19: Empty Formula
1. In a cell, enter `=SUM()`
2. **Expected**: Should handle gracefully (likely shows 0 or error)

### Test 20: Invalid Syntax
1. In a cell, enter `=SUM(1,2,`
2. **Expected**: Auto-closes parenthesis to `=SUM(1,2,)`

### Test 21: Nested Formulas
1. In A1, enter `=SUM(1,2,3)` (result: 6)
2. In A2, enter `=PRODUCT(2,3)` (result: 6)
3. In A3, enter `=SUM(6,6)` (manually type the results from A1 and A2)
4. **Expected**: A3 displays `12`

### Test 22: Mixed Types in CONCAT
1. In a cell, enter `=CONCAT("Total: ",10)`
2. **Expected**: Cell displays `Total: 10`

### Test 23: IF with Numbers
1. In a cell, enter `=IF(10>5,100,200)`
2. **Expected**: Cell displays `100`

### Test 24: Long Formula
1. In a cell, enter `=SUM(1,2,3,4,5,6,7,8,9,10)`
2. **Expected**: Cell displays `55`

## Visual Feedback Tests

### Test 25: Formula Mode Highlighting
1. Double-click a cell to edit
2. Type `=SUM(`
3. **Expected**:
   - Input field has green border (formula mode)
   - Other cells have crosshair cursor
   - Hovering over cells shows green highlight

### Test 26: Cell Selection Visual
1. Double-click a cell to edit
2. Type `=SUM(`
3. Click another cell
4. **Expected**: Clicked cell gets highlighted/outlined

## Performance Tests

### Test 27: Multiple Formulas
1. Create 10 cells with different formulas
2. **Expected**: All compute correctly without lag

### Test 28: Formula Recalculation
1. Create A1=10
2. Create A2 with `=SUM(10,20)`
3. Change the first value in the formula
4. **Expected**: Result updates automatically

## Integration Tests

### Test 29: Copy-Paste Formula Cell
1. Create a cell with `=SUM(1,2,3)`
2. Copy the cell (Cmd/Ctrl+C)
3. Paste in another cell (Cmd/Ctrl+V)
4. **Expected**: Formula is copied and computes correctly

### Test 30: Delete Cell with Formula Reference
1. Create A1=10
2. Create A2 with formula referencing A1
3. Delete A1
4. **Expected**: A2 should handle gracefully (show error or update)

## Known Limitations
- Cell references in formulas are not dynamic (A1, B2, etc. are not supported yet)
- Formulas use literal values passed as arguments
- No cell range syntax (A1:A10)

## Test Results
Date: ___________
Tester: ___________

| Test # | Pass/Fail | Notes |
|--------|-----------|-------|
| 1      |           |       |
| 2      |           |       |
| ...    |           |       |
