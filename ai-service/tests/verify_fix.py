import sys
import os

# Add the project root to the python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.agents.personality_agent import PersonalityAgent

def test_sanitize_big_five():
    agent = PersonalityAgent()
    
    # Test case 1: String scores
    input_1 = {
        "openness": {"score": "80", "reason": "High"},
        "conscientiousness": "70",  # Simple value
        "extraversion": {"score": 60},
        # Missing others
    }
    
    expected_keys = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]
    
    print("Testing Sanitization Logic...")
    result = agent._sanitize_big_five(input_1)
    
    import json
    print(json.dumps(result, indent=2))
    
    # Assertions
    assert isinstance(result["openness"]["score"], int), "Openness score should be int"
    assert result["openness"]["score"] == 80, "Openness score should be 80"
    
    assert isinstance(result["conscientiousness"]["score"], int), "Conscientiousness score should be int"
    assert result["conscientiousness"]["score"] == 70, "Conscientiousness score should be 70"
    
    # Missing extraversion reason should be empty string
    assert result["extraversion"]["score"] == 60
    
    # Missing traits should default to 50
    assert result["agreeableness"]["score"] == 50
    assert result["neuroticism"]["score"] == 50
    
    print("✅ All checks passed!")

if __name__ == "__main__":
    test_sanitize_big_five()
