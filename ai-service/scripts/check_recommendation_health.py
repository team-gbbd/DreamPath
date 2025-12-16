
import sys
import json
import urllib.request
import urllib.error
import time

URL = "http://127.0.0.1:8000/api/agent/recommendation"

PAYLOAD = {
    "summary": "Verified User for Integration Test",
    "goals": ["Test Goal"],
    "values": ["Test Value"],
    "strengths": ["Test Strength"],
    "risks": ["Test Risk"],
    "personality": {
        "openness": 50,
        "conscientiousness": 50,
        "extraversion": 50,
        "agreeableness": 50,
        "neuroticism": 50
    }
}

def check_health():
    print(f"--- Recommendation Agent Health Check ---")
    print(f"Target URL: {URL}")
    
    req = urllib.request.Request(
        URL, 
        data=json.dumps(PAYLOAD).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        start_time = time.time()
        with urllib.request.urlopen(req) as response:
            status = response.getcode()
            body = response.read().decode('utf-8')
            duration = time.time() - start_time
            
            print(f"Status: {status}")
            print(f"Latency: {duration:.2f}s")
            
            if status != 200:
                print(f"[FAIL] Expected 200, got {status}")
                return False
                
            try:
                data = json.loads(body)
            except json.JSONDecodeError:
                print("[FAIL] Response is not valid JSON")
                return False
                
            # Check Keys
            missing = []
            if "jobs" not in data: missing.append("jobs")
            if "majors" not in data: missing.append("majors")
            
            # Check Explanations Nesting (The crucial fix)
            if "explanations" not in data:
                missing.append("explanations")
            else:
                expl = data["explanations"]
                if "jobs" not in expl: missing.append("explanations.jobs")
                if "majors" not in expl: missing.append("explanations.majors")
            
            if missing:
                print(f"[FAIL] Missing Keys: {missing}")
                print(f"Received Keys: {list(data.keys())}")
                return False
                
            print(f"[PASS] Response format is correct. Jobs: {len(data['jobs'])}, Majors: {len(data['majors'])}")
            return True
            
    except urllib.error.URLError as e:
        print(f"[FAIL] Connection Error: {e}")
        print("Tip: Is the FastAPI server running on port 8000?")
        return False
    except urllib.error.HTTPError as e:
        print(f"[FAIL] HTTP Error: {e.code} - {e.reason}")
        print(f"Body: {e.read().decode('utf-8')}")
        return False
    except Exception as e:
        print(f"[FAIL] Unexpected Error: {e}")
        return False

if __name__ == "__main__":
    if check_health():
        sys.exit(0)
    else:
        sys.exit(1)
