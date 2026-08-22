import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List
from auth_utils import get_current_user
from database import query
from google import genai
from google.genai import types

router = APIRouter()

SYSTEM_PROMPT = """You are VetriBot, an expert AI assistant for cattle health and veterinary care.
Answer questions about cattle diseases, symptoms, causes, prevention, and treatment.
Be concise, warm, and easy to understand for farmers.
Key diseases: Lumpy Skin Disease, Foot and Mouth Disease, Mastitis, Blackleg, Bovine Respiratory Disease."""

LANG_SUFFIX = {
    "en": "Always respond in English only.",
    "hi": "हमेशा केवल हिंदी में जवाब दें।",
    "mr": "नेहमी फक्त मराठीत उत्तर द्या.",
}


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    language: str = "en"
    history: List[ChatMessage] = []


@router.post("/chat")
def chat(req: ChatRequest, user=Depends(get_current_user)):
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return {"response": "Chatbot not configured."}

    try:
        client = genai.Client(api_key=api_key)
        history = []
        for msg in req.history[-10:]:
            role = "user" if msg.role == "user" else "model"
            history.append(types.Content(role=role, parts=[types.Part(text=msg.content)]))
        history.append(types.Content(role="user", parts=[types.Part(text=req.message)]))

        system = SYSTEM_PROMPT + "\n" + LANG_SUFFIX.get(req.language, "")

        for model_name in ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest", "gemini-2.0-flash-lite"]:
            try:
                resp = client.models.generate_content(
                    model=model_name, contents=history,
                    config=types.GenerateContentConfig(
                        system_instruction=system, temperature=0.7, max_output_tokens=512
                    ),
                )
                response_text = resp.text
                try:
                    query(
                        "INSERT INTO chat_logs (user_id, user_message, bot_response) VALUES (%s,%s,%s)",
                        (int(user["sub"]), req.message, response_text),
                    )
                except Exception:
                    pass  # Don't fail if logging fails
                return {"response": response_text}
            except Exception as e:
                err = str(e)
                if "429" in err or "quota" in err.lower():
                    continue
                if "PERMISSION_DENIED" in err or "leaked" in err.lower():
                    return {"response": "The AI API key has been revoked. Please update the GEMINI_API_KEY in the backend .env file."}
                raise e

        return {"response": "AI service is temporarily busy due to rate limits. Please wait 1 minute and try again."}
    except Exception as e:
        return {"response": f"Error: {str(e)}"}
