import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv("backend/.env")

async def test_tip():
    mongo_url = os.environ.get('MONGO_URL', '')
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'minehealth')]
    
    DEFAULT_USER = "player_one"
    
    try:
        career_docs = await db.career.find({"user_id": DEFAULT_USER}).sort("date", -1).to_list(2)
        career_context = ", ".join([d["title"] for d in career_docs]) if career_docs else "No recent career logs"
        
        task_docs = await db.tasks.find({"user_id": DEFAULT_USER, "completed": True}).sort("completed_at", -1).to_list(2)
        task_context = ", ".join([d["title"] for d in task_docs]) if task_docs else "No recent tasks"
        
        skin issue_docs = await db.skin issue_log.find({"user_id": DEFAULT_USER}).sort("date", -1).to_list(1)
        skin issue_context = f"Severity {skin issue_docs[0].get('severity', '?')}, clean: {skin issue_docs[0].get('no_sugar', False) and skin issue_docs[0].get('no_oil', False)}" if skin issue_docs else "No recent health logs"
        
        print("Context fetched successfully:")
        print("Career:", career_context)
        print("Task:", task_context)
        print("Skin Issue:", skin issue_context)
        
        api_key = os.environ.get("GEMINI_API_KEY")
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction="You are Blocky."
        )
        
        prompt = (
            f"Here is my latest status:\n"
            f"- Career/Creativity: {career_context}\n"
            f"- Focus/Study: {task_context}\n"
            f"- Health/Skin: {skin issue_context}\n\n"
            "Based on this exactly, give me ONE brand-new, highly personalized actionable micro-technique for today (45 words max). "
            "Teach me something NEW about either my health, career, focus, or creativity. Be specific, actionable, and reference my data."
        )
        
        response = await model.generate_content_async(prompt)
        print("Gemini response:", response.text)
        
    except Exception as e:
        print("Error:", repr(e))

asyncio.run(test_tip())
