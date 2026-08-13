import os
import requests
from dotenv import load_dotenv
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

def call_gemini(prompt: str) -> str:
    import time
    try:
        for attempt in range(3):
            response = requests.post(
                f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                json={
                    "contents": [
                        {"parts": [{"text": prompt}]}
                    ]
                }
            )
            if response.status_code == 429:
                if attempt < 2:
                    time.sleep(2)
                    continue
            
            try:
                response.raise_for_status()
            except requests.exceptions.HTTPError:
                print(f"Gemini API HTTP Error: {response.status_code} - {response.text}")
                raise

            return response.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return "Error generating response"

def extract_demand_from_chat_gemini(chat: str, role: str) -> str:
    prompt = f"""
You are analyzing chat messages from a {role}.
Extract their core demand or if not generate default most common demand by understanding which sector the trade is about.
(the bullet points should contain every important demand by user in trade and understandable so that easy to generate terms by u with that demands by u in next prompt)

Chat:
{chat}

Output: 
    - Use concise bullet points
    - Each point should be a standalone keyword or phrase
    - Do not write full sentences
"""
    return call_gemini(prompt)

def generate_trade_terms_gemini(buyer_demand: str, seller_demand: str, item: str, initiator: str) -> str:
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
[Specify delivery deadlines if mentioned, otherwise write ""]

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
    return call_gemini(prompt)