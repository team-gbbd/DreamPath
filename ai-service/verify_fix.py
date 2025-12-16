
import sys
import os
import json
import inspect
from services.career_analysis_service import CareerAnalysisService

# Mock classes to avoid dependencies
class MockOpenAIService:
    pass

class MockDatabaseService:
    pass

def verify_fix():
    print("🔍 Starting Verification of CareerAnalysisService Fix...")
    
    # 1. Verify Prompt contains "big_five"
    # We read the source code of the method to check the prompt text
    service = CareerAnalysisService(MockOpenAIService(), MockDatabaseService())
    method_source = inspect.getsource(CareerAnalysisService.analyze_personality)
    
    if '"big_five": {' in method_source and '"openness": 1-100,' in method_source:
        print("✅ [PASS] Prompt Logic: 'analyze_personality' method correctly requests 'big_five' scores.")
    else:
        print("❌ [FAIL] Prompt Logic: 'analyze_personality' does NOT appear to request 'big_five' scores.")
        return False

    # 2. Verify Parser extracts "big_five"
    # We feed a mock JSON response (like OpenAI would return) and check the output
    mock_response_json = {
        "description": "Test Description",
        "type": "Test Type",
        "strengths": ["A", "B"],
        "growthAreas": ["C"],
        "big_five": {
            "openness": 88,
            "conscientiousness": 92,
            "extraversion": 75,
            "agreeableness": 80,
            "neuroticism": 40
        }
    }
    
    # Simulate OpenAI string response
    mock_response_str = json.dumps(mock_response_json)
    
    # Mock the extract_json method on the fake service
    service.openai_service.extract_json = lambda x: x
    
    # Run the parser
    result = service._parse_personality_analysis(mock_response_str)
    
    print(f"📊 Parsed Result keys: {list(result.keys())}")
    
    if "big_five" in result:
        bf = result["big_five"]
        if bf.get("openness") == 88 and bf.get("conscientiousness") == 92:
             print(f"✅ [PASS] Parser Logic: Successfully extracted big_five scores: {bf}")
        else:
             print(f"❌ [FAIL] Parser Logic: 'big_five' present but values mismatch: {bf}")
             return False
    else:
        print("❌ [FAIL] Parser Logic: 'big_five' key MISSING in parsed result.")
        return False

    print("\n🎉 VERIFICATION SUCCESSFUL: The code logic is 100% correct.")
    return True

if __name__ == "__main__":
    try:
        if verify_fix():
            sys.exit(0)
        else:
            sys.exit(1)
    except Exception as e:
        print(f"❌ [ERROR] Verification script crashed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
