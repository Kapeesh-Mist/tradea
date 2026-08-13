import os
import json
from dotenv import load_dotenv
from openai import OpenAI
from openai.types.chat import ChatCompletionMessageParam

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

__all__ = [
    "extract_demand_from_chat",
    "generate_trade_terms",
    "extract_structured_terms"
]

# Function schema for structured trade term extraction
extract_trade_terms_schema = [
    {
        "name": "extract_trade_terms",
        "description": "Extract trade terms from chat",
        "parameters": {
            "type": "object",
            "properties": {
                "price": {"type": "number"},
                "deadline": {"type": "string"},
                "deliverables": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            },
            "required": ["price", "deadline", "deliverables"]
        }
    }
]

def extract_demand_from_chat(chat: str, role: str) -> str:
    """
    Extracts the core demand or offer from a chat message using OpenAI.
    """
    try:
        messages: list[ChatCompletionMessageParam] = [
            {"role": "system", "content": "You are a helpful assistant that extracts concise demands from chat."},
            {"role": "user", "content": f"You are analyzing chat messages from a {role}. Extract their core demand or offer in one sentence.\n\nChat:\n{chat}\n\nOutput: [Summarize clearly]"}
        ]
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"OpenAI Demand Extraction Error: {e}")
        return "Demand unclear"

def generate_trade_terms(buyer_demand: str, seller_demand: str, item: str, initiator: str) -> str:
    """
    Generates a detailed, legally clear trade agreement using OpenAI GPT-3.5.
    """
    try:
        prompt = f"""
You are a legal assistant for a freelance trade platform called Tradea.

Your task is to generate a clear, structured, and legally sound "Trade Agreement" based on the following trade details between a Buyer and a Seller.

The agreement must:
- Clearly state who initiated the trade
- Summarize what each party is offering and expecting
- Specify deliverables, payment, timeline, revisions, and ownership rights
- Include a section showing the original demands from both parties
- End with a legal disclaimer that Tradea is not a party to the agreement and holds no liability

Trade Details:
- Buyer Demand: {buyer_demand}
- Seller Offer: {seller_demand}
- Item/Service: {item}
- Trade Initiated By: {initiator}

Output Format (Markdown):
[Follow the structure with 9 sections as described]
        """
        messages: list[ChatCompletionMessageParam] = [
            {"role": "system", "content": "You are a legal assistant that drafts trade agreements."},
            {"role": "user", "content": prompt}
        ]
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"OpenAI Trade Terms Generation Error: {e}")
        return "Error generating terms. Please try again or draft manually."

def extract_structured_terms(chat: str) -> dict:
    """
    Uses OpenAI function calling to extract structured trade terms from chat.
    """
    try:
        messages: list[ChatCompletionMessageParam] = [
            {"role": "system", "content": "You are a trade assistant that extracts structured trade terms from chat."},
            {"role": "user", "content": chat}
        ]
        response = client.chat.completions.create(
            model="gpt-3.5-turbo-1106",
            messages=messages,
            functions=extract_trade_terms_schema,
            function_call={"name": "extract_trade_terms"}
        )
        args = response.choices[0].message.function_call.arguments
        return json.loads(args)
    except Exception as e:
        print(f"OpenAI Structured Extraction Error: {e}")
        return {"error": str(e)}