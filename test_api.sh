#!/bin/bash
# Test the compare API endpoint

echo "Testing /api/compile with compare_stage parameter"
echo ""

# Simple LLVM IR for testing
IR_CODE='define i32 @simple_add(i32 %a, i32 %b) {
  %sum = add i32 %a, %b
  ret i32 %sum
}'

# Test with compare
curl -X POST http://localhost:8080/api/compile \
  -H "Content-Type: application/json" \
  -d "{
    \"ir_code\": \"$IR_CODE\",
    \"stage\": \"isel\",
    \"compare_stage\": \"legalize\",
    \"llc_path\": \"/utg/TheRockDogFooding/TheRock/compiler/amd-llvm/build-debug/bin/llc\"
  }" \
  2>/dev/null | python3 -m json.tool | head -50

echo ""
echo "✅ API test complete!"
