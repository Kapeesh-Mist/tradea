import os
import google.generativeai as genai

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def generate_trade_terms(buyer_demand: str, seller_demand: str, item: str, initiator: str) -> str:
    """
    Generates a detailed, legally clear trade agreement using Gemini based on structured trade inputs.
    """
    try:
        model = genai.GenerativeModel('gemini-pro')

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

        response = model.generate_content(prompt)
        return response.text.strip()

    except Exception as e:
        print(f"Gemini API Error: {e}")
        return "Error generating terms. Please try again or draft manually."

def extract_demand_from_chat(chat: str, role: str) -> str:
    prompt = f"""
    You are analyzing chat messages from a {role}.
    Extract their core demand or offer in one sentence.
    
    Chat:
    {chat}
    
    Output: [Summarize clearly]
    """
    try:
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Gemini Demand Extraction Error: {e}")
        return "Demand unclear"