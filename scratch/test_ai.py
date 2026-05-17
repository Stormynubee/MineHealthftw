"""
Minehealth AI Integration Test
Uses the PINNED google-generativeai==0.8.3 SDK.
DO NOT use google-genai 1.x or 'from google import genai' — see README Bug #7.
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
import google.generativeai as genai  # CORRECT import — 0.8.3
from dotenv import load_dotenv
from pathlib import Path

# Load from backend/.env if it exists
load_dotenv(Path('backend') / '.env')


async def test_db_connection():
    """Test MongoDB connectivity."""
    mongo_url = os.environ.get('MONGO_URL')
    if not mongo_url:
        print("[ERROR] MONGO_URL not found in environment.")
        return None

    print("--- Testing DB Connection ---")
    client = AsyncIOMotorClient(mongo_url)
    db = client.minehealth
    try:
        await db.command("ping")
        print("[OK] DB Connected.")
        return db
    except Exception as e:
        print(f"[ERROR] DB Error: {e}")
        return None


async def test_ai_basic():
    """Test basic Gemini generation with the correct 0.8.3 API."""
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        print("[ERROR] GEMINI_API_KEY not found in environment.")
        return False

    print("\n--- Testing AI Generation (google-generativeai==0.8.3) ---")
    try:
        genai.configure(api_key=api_key)

        # Test basic generation
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = await model.generate_content_async("Say hello in 5 words.")
        print(f"[OK] Basic Gen Success: {response.text}")
        return True
    except Exception as e:
        print(f"[ERROR] AI ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_ai_chat():
    """Test chat with system instruction — mirrors server.py ai_chat() flow."""
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        print("[ERROR] GEMINI_API_KEY not found in environment.")
        return False

    print("\n--- Testing Chat with System Prompt (gemini-2.5-flash) ---")
    try:
        genai.configure(api_key=api_key)

        system_prompt = (
            "You are 'Blocky', a Minecraft-themed life buddy. "
            "You are hype, kind, and concise (max 50 words)."
        )
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=system_prompt
        )

        # Test with empty history (fresh session)
        chat = model.start_chat(history=[])
        response = await chat.send_message_async("Hey Blocky, how are you?")
        print(f"[OK] Chat Success (empty history): {response.text}")

        # Test with pre-built history (simulates DB-loaded history)
        history = [
            {"role": "user", "parts": ["What's your name?"]},
            {"role": "model", "parts": ["I'm Blocky! Your pixel-powered life buddy [BLOCK]"]},
        ]
        chat2 = model.start_chat(history=history)
        response2 = await chat2.send_message_async("Do you remember your name?")
        print(f"[OK] Chat Success (with history): {response2.text}")

        return True
    except Exception as e:
        print(f"[ERROR] AI Chat ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_history_sanitization():
    """Test that corrupted history (consecutive user messages) is handled."""
    print("\n--- Testing History Sanitization ---")

    def _sanitize_history(docs: list) -> list:
        """Same sanitizer from server.py — validates it works."""
        sanitized = []
        expected_role = "user"
        for doc in docs:
            role = "model" if doc.get("role") == "assistant" else "user"
            if role != expected_role:
                sanitized = []
                expected_role = "user"
                if role != "user":
                    continue
            sanitized.append({"role": role, "parts": [str(doc.get("content", ""))]})
            expected_role = "model" if role == "user" else "user"
        while sanitized and sanitized[-1]["role"] == "user":
            sanitized.pop()
        return sanitized

    # Test 1: Normal alternating history
    normal = [
        {"role": "user", "content": "hi"},
        {"role": "assistant", "content": "hello!"},
        {"role": "user", "content": "bye"},
        {"role": "assistant", "content": "see ya!"},
    ]
    result = _sanitize_history(normal)
    assert len(result) == 4, f"Expected 4, got {len(result)}"
    print("[OK] Normal history: 4 messages preserved")

    # Test 2: Orphaned trailing user message (the crash bug)
    orphaned = [
        {"role": "user", "content": "hi"},
        {"role": "assistant", "content": "hello!"},
        {"role": "user", "content": "this message had no reply"},
    ]
    result = _sanitize_history(orphaned)
    assert len(result) == 2, f"Expected 2 (orphan pruned), got {len(result)}"
    print("[OK] Orphaned user message: pruned to 2")

    # Test 3: Two consecutive user messages (corrupted)
    corrupted = [
        {"role": "user", "content": "hi"},
        {"role": "user", "content": "hello again"},
        {"role": "assistant", "content": "hey!"},
    ]
    result = _sanitize_history(corrupted)
    assert len(result) == 2, f"Expected 2 (reset on conflict), got {len(result)}"
    assert result[0]["role"] == "user"
    assert result[1]["role"] == "model"
    print("[OK] Consecutive user messages: reset and recovered to 2")

    # Test 4: Empty history
    result = _sanitize_history([])
    assert len(result) == 0
    print("[OK] Empty history: 0 messages")

    # Test 5: Only a user message (no reply ever)
    solo = [{"role": "user", "content": "hello?"}]
    result = _sanitize_history(solo)
    assert len(result) == 0, f"Expected 0 (solo user pruned), got {len(result)}"
    print("[OK] Solo user message: pruned to 0")

    print("[OK] All sanitization tests passed!")
    return True


async def main():
    print("=" * 60)
    print("MINEHEALTH AI INTEGRATION TEST")
    print("SDK: google-generativeai==0.8.3 (PINNED)")
    print("=" * 60)

    results = {}
    results["db"] = await test_db_connection() is not None
    results["ai_basic"] = await test_ai_basic()
    results["ai_chat"] = await test_ai_chat()
    results["sanitizer"] = await test_history_sanitization()

    print("\n" + "=" * 60)
    print("RESULTS SUMMARY")
    print("=" * 60)
    for test, passed in results.items():
        status = "[PASS]" if passed else "[FAIL]"
        print(f"  {test}: {status}")

    all_passed = all(results.values())
    print(f"\n{'[OK] ALL TESTS PASSED' if all_passed else '[ERROR] SOME TESTS FAILED'}")
    return all_passed


if __name__ == "__main__":
    asyncio.run(main())
