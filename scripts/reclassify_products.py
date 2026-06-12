import os
import sys
import re
import io
import csv
import psycopg2
import psycopg2.extras
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Reconfigure stdout to use UTF-8 on Windows to prevent 'charmap' codec crashes
if sys.platform.startswith('win'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

load_dotenv('app/.env')
DATABASE_URL = os.getenv('DATABASE_URL')

# Rule definition: list of tuples (pattern, new_category, new_sub_category, exclude_pattern)
RECLASSIFICATION_RULES = [
    # 0a. Sweet Tooth: Mouth Fresheners (Saunf, Badisoap, etc.) - placed first so it intercepts "soap"
    (
        r'\b(saunf|sounf|badisoap|badisaop|mukhwas|mouth\s+freshner|mouth\s+freshener|pan\s+corner|pass-pass)\b',
        'Sweet Tooth',
        'Mouth Fresheners',
        None
    ),
    # 0b. Personal Care: Oral Care (Colgate, Colget, mouthwash) - intercepts salt/lemon/neem/tea
    (
        r'\b(toothpaste|toothbrush|colgate|closeup|close-up|pepsodent|sensodyne|meswak|dabur\s+red|mouthwash|oral-b|brush|colget|maxfresh|active\s+salt)\b',
        'Personal Care',
        'Oral Care',
        None
    ),
    # 0c. Cleaning Essentials: Laundry (rin, tide, surf excel, ariel, arial, ezee, comfort, wheel, ghari, laundry, detergent, vanish, ala, ujala, wash bar) - intercepts gel/liquids
    (
        r'\b(rin\s+soap|rin\s+bar|rin\s+liquid|tide\s+soap|tide\s+bar|tide\s+powder|surf\s+excel|ariel|arial|ezee|fabric\s+conditioner|comfort|wheel\s+powder|wheel\s+bar|ghari|laundry|detergent|vanish|ala|ujala|liquid\s+detergent|wash\s+bar)\b',
        'Cleaning Essentials',
        'Laundry',
        None
    ),
    # 0d. Cleaning Essentials: Dishwash (vim, pril, exo, dishwash, dish wash, dish liquid, scrub pad, steel scrubber, etc.) - intercepts gel
    (
        r'\b(vim|pril|exo|dishwash|dish\s+wash|dish\s+liquid|scrub\s+pad|steel\s+scrubber|dishwash\s+bar|dishwash\s+tub)\b',
        'Cleaning Essentials',
        'Dishwash',
        None
    ),
    # 0e. Cleaning Essentials: Household Cleaners (lizol, harpic, domex, colin, glass cleaner, toilet cleaner, floor cleaner, phenyl, dettol disinfectant, antiseptic, dettol liquid, dettol blue, dettol green)
    (
        r'\b(lizol|harpic|domex|colin|glass\s+cleaner|toilet\s+cleaner|floor\s+cleaner|phenyl|phenyle|dettol\s+disinfectant|disinfectant\s+spray|bleach|drainx|odonil|air\s+freshener|napthalene|camphor|kapur|antiseptic|anti-septic|dettol\s+liquid|dettol\s+(liq|leq|anti|blue|green))\b',
        'Cleaning Essentials',
        'Household Cleaners',
        r'\b(soap|handwash|hw)\b'
    ),
    # 0f. Personal Care: Hair Care (Vatika, hair oil) - intercepts coconut/mustard oil
    (
        r'\b(shampoo|conditioner|hair\s+oil|hairoil|vatika|parachute\s+hair|bajaj\s+almond|clinic\s+plus|head\s+&\s+shoulder|pantene|loreal|tresemme|sunsilk|indulekha|amla\s+oil|hair\s+color|mehendi|henna|casting)\b',
        'Personal Care',
        'Hair Care',
        r'\b(body\s+wash|handwash|soap)\b'
    ),
    # 0g. Personal Care: Skin Care (Fair & Handsome cream) - intercepts ghee/cooking fats/oils/soaps
    (
        r'\b(handsome|cream|fair\s+&\s+handsome|fai\s+&\s+handsome|fairness|moisturizer|face\s+cream|body\s+cream|gel)\b',
        'Personal Care',
        'Skin Care',
        r'\b(ice\s+cream|icecream|ghee|butter|cheese|shake|milkshake|biscuit|biscuits|cookies|cake|cakes|muffin|pastry|chocolate|chocolates|choco|chocos|mix|mixture|roasted|salted|fried|snack|snacks|curry|gravy|instant|ready|oil|shampoo|soap|detergent|shave|shaving|shower\s+gel|gel\s+bar|gelbar|fresh\s+cream|fresh\s+creme|amul|whipped|roll|rolls|sandwich|sandwiches|onion|herbs|vanilla|strawberry|orange|pineapple|mango|milk)\b'
    ),
    # 0h. Laddu Atta / flour (specific match to prevent matching sweet laddu)
    (
        r'\b(laddu|ladoo)\s+(atta|flour|flours|pith)\b',
        'Atta, Rice & Dal',
        'Atta & Flours',
        None
    ),
    # 1. Dals & Pulses (includes chawli and chawali)
    (
        r'\b(masur|masoor|urad|moong|mung|chana|tur|toor|arhar|lentil|lentils|vatana|rajma|rajama|kabuli|kulith|alsande|lobia|math|matki|dal|daal|chawli|chawali)\b', 
        'Atta, Rice & Dal', 
        'Dals & Pulses',
        r'\b(snack|snacks|masala|mix|fryums|papad|chivda|instant|ready|munchies|namkeen|roasted|fried|salted|makhani|tadka|fry|khichdi|soap|pith|atta|flour|sooji|rava|suji|mithai|ladoo|kheer|oil)\b'
    ),
    # 2. Rice & Poha
    (
        r'\b(rice|basmati|kolam|indrayani|ambemohar|poha|pohe|kurmura|mamra|puffed\s+rice|sonamasuri|sona\s+masuri)\b',
        'Atta, Rice & Dal',
        'Rice & Poha',
        r'\b(flour|atta|snack|snacks|masala|mix|kheer|instant|ready|chivda|namkeen|fried\s+rice|pulav|biryani\s+mix|ready-to-eat|soap|oil|chips|crisps|wafer|wafers|wefer|wefers)\b'
    ),
    # 3. Atta & Flours
    (
        r'\b(atta|maida|sooji|suji|rava|semolina|besan|pith|flour|bhajani)\b',
        'Atta, Rice & Dal',
        'Atta & Flours',
        r'\b(snack|snacks|laddu|ladoo|mix|instant|ready|chips|chikki|soap|detergent|oil|shampoo|toothpaste)\b'
    ),
    # 4. Sugar, Salt & Jaggery
    (
        r'\b(sugar|sakhar|salt|mith|jaggery|gud|gul|khandsari)\b',
        'Atta, Rice & Dal',
        'Sugar, Salt & Jaggery',
        r'\b(sugar\s+free|sugarfree|snack|snacks|biscuit|biscuits|cookies|chikki|tea|coffee|soap|shampoo|satva|mix|mixture|drink|drinks|juice|juices|cereal|cereals|candy|candies|toffees|chocolate|chocolates|sauce|ketchup|spread|jam|jams|colgate|colget|closeup|pepsodent|sensodyne|dentonic|mouthwash|toothpaste|brush)\b'
    ),
    # 5a. Ghee
    (
        r'\b(ghee|vanaspati)\b',
        'Oil & Ghee',
        'Ghee',
        r'\b(hair|amla|shampoo|body|massage|baby|soap|clear|wash|soanpapdi|soan\s+papdi|mithai|halwa|laddu|ladoo|chikki|biscuit|biscuits|cookies|cake|cakes|muffin|pastry|chocolate|chocolates|mix|mixture|roasted|salted|fried|snack|snacks|curry|gravy|instant|ready|rice|biryani)\b'
    ),
    # 5b. Cooking Oils
    (
        r'\b(mustard\s+oil|sunflower\s+oil|groundnut\s+oil|coconut\s+oil|sesame\s+oil|soyabean\s+oil|safola|fortune|rice\s+bran\s+oil|olive\s+oil)\b',
        'Oil & Ghee',
        'Cooking Oils',
        r'\b(hair|amla|shampoo|body|massage|baby|soap|clear|wash|soanpapdi|soan\s+papdi|mithai|halwa|laddu|ladoo|chikki|biscuit|biscuits|cookies|cake|cakes|muffin|pastry|chocolate|chocolates|mix|mixture|roasted|salted|fried|snack|snacks|curry|gravy|instant|ready|haircare|vatika|parachute|dabur|rice|basmati|biryani)\b'
    ),
    # 5c. Chips & Crisps (Snacks)
    (
        r'\b(chips|crisps|wafers|wefers|pringles|lays|bingo)\b',
        'Snacks & Munchies',
        'Chips & Crisps',
        r'\b(packet|bag)\b'
    ),
    # 5d. Namkeen & Farsan (Snacks - includes Chakali, Sev, Bhakarwadi, Puffs, etc. - excluded spice mixes)
    (
        r'\b(chakali|chakli|chakkuli|nippattu|kodubale|muruku|murukku|sev|shev|bhakarwadi|bhavnagari|gathiya|farsan|mixture|namkeen|bhel|chivda|kurkure|cheetos|puff|puffs)\b',
        'Snacks & Munchies',
        'Namkeen & Farsan',
        r'\b(atta|flour|bhajani|mix|instant|ready|oil|masala\s+(mix|powder)|(bhaji|rassa|misal|gravy|curry|sabji|paneer|chhole|biryani|chicken|mutton|fish|goda|garam|kadhai|chivda|chakli|chaat|chai|tea)\s+masala)\b'
    ),
    # 5e. Masalas & Spices (Dhana powder, spices) - added detailed exclusions for food items containing spice words
    (
        r'\b(masala|spices|spice|chilli\s+powder|mirchi\s+powder|haldi\s+powder|turmeric\s+powder|dhaniya|dhana|coriander|jeera|cumin|mustard\s+seeds|rai|hing|asafoetida|cardamom|elaichi|clove|laung|cinnamon|dalchini|black\s+pepper|kali\s+mirch|methi\s+seeds|fenugreek)\b',
        'Masala & Dry Fruits',
        'Masalas & Spices',
        r'\b(laundry|detergent|soap|shampoo|oil|ghee|snack|snacks|biscuit|biscuits|cookies|chikki|tea|coffee|chivda|namkeen|oats|noodles|noodle|pasta|bread|butter|cheese|sauce|chutney|dressing|dip|mayo|mayonnaise|ketchup|spread|jam|papad|papads|khari|toast|rusk|bun|roll|rolls|cake|pastry|muffin|khakhra|khakhara|bhel|puri|sev|chips|crisps|popcorn|makhana|peanuts|cashew|almond|pistachio|raisins|dates|figs|walnut|juice|shake|buttermilk|lassi|chaas|curd|yoghurt|premix|pre-mix|chai|sticks|stick|shave|shaving|cream|perfume|deo|deodorant|body\s+wash|face\s+wash|old\s+spice|taaza|society|girnar|good\s+day|goodday|bounce|krackjack|parle|britannia|malkist|sunfeast|oreo|hide\s+&\s+seek|hide\s+seek|bourbon|milano|monaco|5star|cadbury|nestle|amul|haldiram|haldirams|balaji|bikaji)\b'
    ),
    # 5f. Cold Drinks & Juices: Juices & Drinks (includes shakes/syrup)
    (
        r'\b(milk\s+shake|milkshake|shake|shakes|juice|juices|concentrate|squash|sharbat|lassi|chaas|buttermilk)\b',
        'Cold Drinks & Juices',
        'Juices & Drinks',
        r'\b(soap|shampoo|oil|ghee|snack|snacks)\b'
    ),
    # 6. Chocolates
    (
        r'\b(fuse|cadbury|dairy\s+milk|silk|5star|5\s+star|munch|kitkat|snickers|milkybar|chocolate|chocolates|choco|dark\s+chocolate|bournville|perk|barOne|eclairs|melody|koffee\s+bite|gems)\b',
        'Chocolates',
        'Chocolates',
        r'\b(biscuit|biscuits|cookies|cake|cakes|muffin|pastry|spread|ice\s+cream|syrup|drink|shake|milkshake|wafer|powder)\b'
    ),
    # 10. Personal Care: Bath & Body (Soaps, Shower gels, etc.)
    (
        r'\b(soap|soaps|saop|shower\s+gel|gel\s+bar|gelbar|body\s+wash|hand\s+wash|handwash|dettol|lifebuoy|dove|pears|cinthol|fiama|lux|santoor|liril|medimix|godrej\s+no\.1|mysore\s+sandal|sandal\s+soap|utane|ubtan|scrub|body\s+lotion|talc|talcum|ponds\s+powder|talcum\s+powder|cooling\s+powder|baby\s+powder|deo|deodorant|fogg|wild\s+stone|nivea|anuved)\b',
        'Personal Care',
        'Bath & Body',
        r'\b(rin|tide|surf|excel|ariel|wheel|ghari|dish|dishwash|vim|pril|exo|comfort|laundry|detergent|wash\s+powder|liquid\s+detergent|chilli|coriander|masala|turmeric|spices|milk|custard|baking|cocoa|powder\s+1kg|powder\s+500g|powder\s+250g)\b'
    )
]

# Specific hardcoded exceptions/fixes for known mismatches
SPECIFIC_FIXES = {
    "Rajgira 250G": ("Atta, Rice & Dal", "Atta & Flours"),
    "Masur 250G": ("Atta, Rice & Dal", "Dals & Pulses"),
    "Fuse 21G": ("Chocolates", "Chocolates"),
    "Utane 50G": ("Personal Care", "Bath & Body"),
    "Utane 100G": ("Personal Care", "Bath & Body"),
    "Godrej Ezee 250Ml": ("Cleaning Essentials", "Laundry"),
    "Godrej Ezee Liquid": ("Cleaning Essentials", "Laundry"),
}

def clean_html_entities(text: str) -> str:
    import html
    if not text:
        return ""
    prev = ""
    curr = str(text)
    while curr != prev:
        prev = curr
        curr = html.unescape(prev)
    return curr.strip()

def generate_report(conn, csv_path, report_path, updates_made_this_run):
    print("Generating reclassified products report...")
    # 1. Load CSV
    csv_products = {}
    if os.path.exists(csv_path):
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = clean_html_entities(row.get('name', '')).strip()
                csv_products[name] = {
                    'cat': clean_html_entities(row.get('Category', '')).strip(),
                    'sub': clean_html_entities(row.get('Sub_Category', '')).strip()
                }
                
    # 2. Fetch all products from DB
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT name, category, sub_category FROM products ORDER BY name")
    db_rows = cur.fetchall()
    cur.close()
    
    report_items = []
    
    # Track updates made this run by product name
    updated_names_this_run = {item['name']: item for item in updates_made_this_run}
    
    for r in db_rows:
        name = clean_html_entities(r['name'])
        db_cat = clean_html_entities(r['category'] or '')
        db_sub = clean_html_entities(r['sub_category'] or '')
        
        # Check against CSV
        if name in csv_products:
            csv_cat = csv_products[name]['cat']
            csv_sub = csv_products[name]['sub']
            if db_cat != csv_cat or db_sub != csv_sub:
                report_items.append({
                    'name': name,
                    'orig_cat': csv_cat,
                    'orig_sub': csv_sub,
                    'new_cat': db_cat,
                    'new_sub': db_sub
                })
        # If not in CSV, check if it was updated in this run
        elif name in updated_names_this_run:
            item = updated_names_this_run[name]
            report_items.append({
                'name': name,
                'orig_cat': item['old_cat'],
                'orig_sub': item['old_sub'],
                'new_cat': item['new_cat'],
                'new_sub': item['new_sub']
            })
            
    # Sort by name
    report_items.sort(key=lambda x: x['name'])
    
    # 3. Write Markdown Report
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write("# Reclassified Products Report\n\n")
        f.write(f"A total of **{len(report_items)}** products were automatically reclassified to correct their Category and Sub-category structures.\n\n")
        f.write("| Product Name | Original Category / Sub | Corrected Category / Sub |\n")
        f.write("|---|---|---|\n")
        for item in report_items:
            orig_str = f"[{item['orig_cat']}] > [{item['orig_sub']}]"
            new_str = f"[{item['new_cat']}] > [{item['new_sub']}]"
            f.write(f"| {item['name']} | {orig_str} | {new_str} |\n")
            
    print(f"✅ Report generated successfully: {report_path} with {len(report_items)} products.")

def run_reclassification(dry_run=True):
    print("Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("SELECT id, name, category, sub_category FROM products")
        products = cur.fetchall()
        print(f"Total products fetched: {len(products)}")
        
        updates = []
        mismatch_count = 0
        
        for p in products:
            p_id = p['id']
            p_name = clean_html_entities(p['name'])
            curr_cat = clean_html_entities(p['category'] or '')
            curr_sub = clean_html_entities(p['sub_category'] or '')
            
            new_cat, new_sub = None, None
            
            # Check specific overrides first
            if p_name in SPECIFIC_FIXES:
                new_cat, new_sub = SPECIFIC_FIXES[p_name]
            else:
                # Run through regex rules
                for pattern, rule_cat, rule_sub, exclude_pattern in RECLASSIFICATION_RULES:
                    if re.search(pattern, p_name, re.IGNORECASE):
                        if exclude_pattern and re.search(exclude_pattern, p_name, re.IGNORECASE):
                            continue
                        new_cat, new_sub = rule_cat, rule_sub
                        break
            
            # If a new category/sub-category is proposed and it differs from the current one
            if new_cat and new_sub:
                if curr_cat != new_cat or curr_sub != new_sub:
                    updates.append({
                        "id": p_id,
                        "name": p_name,
                        "old_cat": curr_cat,
                        "old_sub": curr_sub,
                        "new_cat": new_cat,
                        "new_sub": new_sub
                    })
                    mismatch_count += 1
                    
        print(f"Detected {mismatch_count} misclassified products.")
        
        if mismatch_count > 0:
            print("\nProposed Changes (showing first 60):")
            print(f"{'Name':<40} | {'Current Category / Sub':<45} -> {'Proposed Category / Sub':<45}")
            print("-" * 140)
            
            for item in updates[:60]:
                curr_str = f"[{item['old_cat']}] > [{item['old_sub']}]"
                new_str = f"[{item['new_cat']}] > [{item['new_sub']}]"
                print(f"{item['name'][:40]:<40} | {curr_str:<45} -> {new_str:<45}")
                
            if len(updates) > 60:
                print(f"... and {len(updates) - 60} more changes.")
                
            if not dry_run:
                print(f"\nApplying updates to {len(updates)} products in the database...")
                update_query = "UPDATE products SET category = %s, sub_category = %s WHERE id = %s"
                batch = [(item['new_cat'], item['new_sub'], item['id']) for item in updates]
                cur.executemany(update_query, batch)
                conn.commit()
                print("✅ Successfully updated all products in the database!")
                
                # Generate the report
                generate_report(conn, 'ULTIMATE_ZEPTO_CATALOG.csv', 'docs/reclassified_products_report.md', updates)
            else:
                print("\n⚠️  DRY RUN ONLY. No changes were applied to the database.")
                print("Run with the '--run' flag to execute: python scripts/reclassify_products.py --run")
        else:
            print("No misclassifications detected based on current rules.")
            
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    dry_run = True
    if len(sys.argv) > 1 and sys.argv[1] == '--run':
        dry_run = False
    run_reclassification(dry_run=dry_run)
