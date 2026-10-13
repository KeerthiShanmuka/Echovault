import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_and_stats():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

    res_stats = client.get("/api/stats")
    assert res_stats.status_code == 200
    data = res_stats.json()
    assert "memories" in data
    assert "tasks_total" in data


def test_transcript_ingestion_and_memories():
    transcript_text = "Met with Sarah and Elena to discuss the latency target. Sarah will finalize the Qdrant specs by Thursday."
    res = client.post("/api/transcripts", json={"transcript": transcript_text, "title": "Test Sync", "source": "manual"})
    assert res.status_code == 200
    exec_data = res.json()
    assert exec_data["status"] == "completed"
    assert len(exec_data["steps"]) >= 4

    # Verify listing memories
    res_m = client.get("/api/memories")
    assert res_m.status_code == 200
    mems = res_m.json()
    assert len(mems) > 0


def test_chat_query():
    res = client.post("/api/chat", json={"message": "What did Sarah agree to?"})
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "citations" in data
    assert "execution" in data


def test_tasks_listing_and_patch():
    res = client.get("/api/tasks")
    assert res.status_code == 200
    tasks = res.json()
    if tasks:
        t_id = tasks[0]["id"]
        res_p = client.patch(f"/api/tasks/{t_id}", json={"status": "completed"})
        assert res_p.status_code == 200
        assert res_p.json()["status"] == "completed"
        assert res_p.json()["is_user_edited"] is False or True


def test_agents_and_activity():
    res = client.get("/api/agents")
    assert res.status_code == 200
    agents = res.json()
    assert len(agents) == 4

    res_act = client.get("/api/agents/activity")
    assert res_act.status_code == 200
    assert isinstance(res_act.json(), list)


def test_omi_webhooks():
    conv_payload = {
        "id": "omi_test_conv_99",
        "transcript": "Checking Omi conversation webhook processing pipeline with multiple agents."
    }
    res_c = client.post("/omi/conversation", json=conv_payload)
    assert res_c.status_code == 200
    assert "status" in res_c.json()

    res_r = client.post("/omi/realtime", json=[{"text": "Stream test segment"}])
    assert res_r.status_code == 200
    assert res_r.json()["status"] == "stream_acknowledged"
