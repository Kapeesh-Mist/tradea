import os
import openai
import json
from dotenv import load_dotenv

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

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
    prompt = f"""
You are analyzing chat messages from a {role}.
Extract their core demand or offer in one sentence.

Chat:
{chat}

Output: [Summarize clearly]
"""
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that extracts concise demands from chat."},
                {"role": "user", "content": prompt}
            ]
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"OpenAI Demand Extraction Error: {e}")
        return "Demand unclear"

def generate_trade_terms(buyer_demand: str, seller_demand: str, item: str, initiator: str) -> str:
    """
    Generates a detailed, legally clear trade agreement using OpenAI GPT-3.5.
    """
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

### Trade Agreement

**1. Parties Involved:**
- **Buyer:** [Name or ID if known]
- **Seller:** [Name or ID if known]
- **Trade Initiated By:** {initiator}

**2. Item/Service Description:**
{item}

**3. Deliverables:**
[Clearly list what the seller agrees to deliver based on seller offer]

**4. Timeline:**
[Specify delivery deadlines if mentioned, otherwise write "As agreed between parties"]

**5. Payment Terms:**
[Specify amount, currency, and payment method or escrow terms]

**6. Revisions:**
[State number of revisions allowed, or "To be discussed"]

**7. Ownership & Rights:**
[Clarify who owns the final product, usage rights, and copyright]

**8. Original Demands (for transparency):**
- **Buyer Demand:** {buyer_demand}
- **Seller Offer:** {seller_demand}

**9. Legal Disclaimer:**
Tradea is a neutral platform that facilitates communication and escrow between users. Tradea is not a party to this agreement and assumes no responsibility for the content, quality, legality, or delivery of the services or items exchanged. All disputes must be resolved directly between the Buyer and Seller. By proceeding with this trade, both parties acknowledge and accept these terms.

If any section is unclear or missing in the trade details, use "To be discussed" or reasonable assumptions based on standard freelance practices.
"""
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a legal assistant that drafts trade agreements."},
                {"role": "user", "content": prompt}
            ]
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
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo-1106",
            messages=[
                {"role": "system", "content": "You are a trade assistant that extracts structured trade terms from chat."},
                {"role": "user", "content": chat}
            ],
            functions=extract_trade_terms_schema,
            function_call={"name": "extract_trade_terms"}
        )
        args = response["choices"][0]["message"]["function_call"]["arguments"]
        return json.loads(args)
    except Exception as e:
        print(f"OpenAI Structured Extraction Error: {e}")
        return {"error": str(e)}