import requests
import json
import time
import sys

BASE_URL = "http://127.0.0.1:8000"

def log(msg, status="INFO"):
    print(f"[{status}] {msg}")

def test_full_live_system():
    log("=== Starting Live End-to-End System Test ===")

    # 1. Health check
    log("1. Testing GET /health...")
    r = requests.get(f"{BASE_URL}/health", timeout=5)
    assert r.status_code == 200, f"Health check failed: {r.text}"
    health = r.json()
    log(f"Health OK: lyzr_configured={health.get('lyzr_configured')}, qdrant_configured={health.get('qdrant_configured')}", "PASS")

    # 2. Stats
    log("2. Testing GET /api/stats...")
    r = requests.get(f"{BASE_URL}/api/stats", timeout=5)
    assert r.status_code == 200, f"Stats failed: {r.text}"
    stats_before = r.json()
    log(f"Current Stats: {stats_before}", "PASS")

    # 3. Ingest Spoken Transcript via Lyzr Multi-Agent Pipeline
    log("3. Testing POST /api/transcripts (Lyzr Multi-Agent Ingestion)...")
    sample_transcript = (
        "Meeting with Jordan and Maya on Redis architecture. We agreed to deploy the new caching layer by next Tuesday. "
        "Jordan will configure the Redis cluster and sentinel nodes by Friday. Maya is responsible for updating the API gateway routes. "
        "We also confirmed the benchmark latency target must stay under 50 milliseconds under 10k RPS."
    )
    t_start = time.perf_counter()
    r = requests.post(f"{BASE_URL}/api/transcripts", json={
        "transcript": sample_transcript,
        "title": "Redis Architecture & Latency Alignment",
        "source": "voice"
    }, timeout=120)
    dur = round(time.perf_counter() - t_start, 2)
    assert r.status_code == 200, f"Ingestion failed ({r.status_code}): {r.text}"
    exec_data = r.json()
    log(f"Ingestion Succeeded in {dur}s! Execution Status: {exec_data.get('status')}, ID: {exec_data.get('execution_id')}", "PASS")
    log(f"Correlation ID: {exec_data.get('correlation_id')}")
    for step in exec_data.get("steps", []):
        log(f"  Step: {step.get('agent_name')} [{step.get('status')}] - {step.get('duration_ms')}ms")

    # 4. Verify Memory in Local & Qdrant Store
    log("4. Testing GET /api/memories...")
    r = requests.get(f"{BASE_URL}/api/memories", timeout=5)
    assert r.status_code == 200, f"Memories failed: {r.text}"
    memories = r.json()
    matching_mem = next((m for m in memories if "Redis Architecture" in m.get("title", "")), None)
    assert matching_mem is not None, "Newly ingested memory not found in /api/memories"
    log(f"Found Ingested Memory: '{matching_mem['title']}', ID: {matching_mem['id']}", "PASS")
    log(f"  Summary: {matching_mem.get('summary')}")
    log(f"  Facts: {matching_mem.get('key_facts') or matching_mem.get('facts')}")
    log(f"  Topics: {matching_mem.get('topics')}")

    # 5. Verify Tasks Extracted by Task Agent
    log("5. Testing GET /api/tasks...")
    r = requests.get(f"{BASE_URL}/api/tasks", timeout=5)
    assert r.status_code == 200, f"Tasks failed: {r.text}"
    tasks = r.json()
    log(f"Total Tasks in store: {len(tasks)}", "PASS")
    for t in tasks[-3:]:
        log(f"  Task: '{t.get('title')}' | Owner: {t.get('assigned_owner')} | Priority: {t.get('priority')} | Status: {t.get('status')}")

    # 6. Test Task PATCH Update
    if tasks:
        target_task = tasks[0]
        log(f"6. Testing PATCH /api/tasks/{target_task['id']} (Toggle status)...")
        new_status = "completed" if target_task.get("status") != "completed" else "in_progress"
        r = requests.patch(f"{BASE_URL}/api/tasks/{target_task['id']}", json={"status": new_status}, timeout=5)
        assert r.status_code == 200, f"Task update failed: {r.text}"
        updated = r.json()
        assert updated.get("status") == new_status
        log(f"Task updated successfully to '{new_status}'!", "PASS")

    # 7. Test Memory Assistant RAG Chat
    log("7. Testing POST /api/chat (Lyzr Memory Assistant with Qdrant Retrieval)...")
    chat_question = "Who is responsible for the Redis cluster and what is the latency target?"
    t_chat_start = time.perf_counter()
    r = requests.post(f"{BASE_URL}/api/chat", json={"message": chat_question}, timeout=90)
    chat_dur = round(time.perf_counter() - t_chat_start, 2)
    assert r.status_code == 200, f"Chat failed ({r.status_code}): {r.text}"
    chat_res = r.json()
    log(f"Chat Succeeded in {chat_dur}s!", "PASS")
    log(f"Answer: {chat_res.get('answer')}")
    log(f"Citations count: {len(chat_res.get('citations', []))}")
    for c in chat_res.get("citations", []):
        log(f"  Citation: '{c.get('title')}' (Score: {c.get('similarity_score')})")

    # 8. Test Agent Activity Telemetry
    log("8. Testing GET /api/agents and /api/agents/activity...")
    r = requests.get(f"{BASE_URL}/api/agents", timeout=5)
    assert r.status_code == 200
    agents = r.json()
    log(f"Agents configured count: {len(agents)}", "PASS")

    r = requests.get(f"{BASE_URL}/api/agents/activity?limit=5", timeout=5)
    assert r.status_code == 200
    activity = r.json()
    log(f"Recent workflow executions count: {len(activity)}", "PASS")

    # 9. Test Omi Webhook Ingestion
    log("9. Testing POST /webhook/omi...")
    omi_payload = {
        "conversation_id": "omi-test-sync-101",
        "title": "Omi Quick Audio Note",
        "transcript": "Quick note: need to verify API token renewal with the security team on Monday.",
        "duration_seconds": 18
    }
    r = requests.post(f"{BASE_URL}/webhook/omi", json=omi_payload, timeout=90)
    assert r.status_code == 200, f"Omi webhook failed: {r.text}"
    omi_res = r.json()
    log(f"Omi Webhook Succeeded! Status: {omi_res.get('status')}", "PASS")

    # 10. Check Final Stats
    log("10. Testing GET /api/stats (Post-run verification)...")
    r = requests.get(f"{BASE_URL}/api/stats", timeout=5)
    assert r.status_code == 200
    stats_after = r.json()
    log(f"Final Stats: {stats_after}", "PASS")

    log("=== ALL 10 LIVE SYSTEM TESTS PASSED SUCCESSFULLY! ===", "SUCCESS")

if __name__ == "__main__":
    try:
        test_full_live_system()
    except Exception as e:
        log(f"TEST FAILED: {str(e)}", "FAIL")
        sys.exit(1)
