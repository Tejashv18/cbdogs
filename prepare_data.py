import os
import re
import json
import pandas as pd
from datetime import datetime

xlsx_path = r"d:\DogWebsite\Breed.xlsx"
image_dir = r"d:\DogWebsite"

# 1. Read Excel for the 15 original breeds
df = pd.read_excel(xlsx_path)

breeds_raw = []
current_breed = None

for idx, row in df.iterrows():
    breed_name = row['Breed']
    color_val = row['Colour']
    
    if pd.notna(breed_name) and str(breed_name).strip() != "":
        current_breed = {
            "name": str(breed_name).strip(),
            "colors": []
        }
        breeds_raw.append(current_breed)
    
    if pd.notna(color_val) and str(color_val).strip() != "":
        color_str = str(color_val).strip()
        if current_breed is not None:
            current_breed["colors"].append(color_str)

# Combine colors into single descriptions and clean up
breeds = []
for b in breeds_raw:
    name = b["name"]
    all_colors_raw = " | ".join(b["colors"])
    
    # Normalize name
    if "Doberman" in name:
        name = "Doberman (European/American)"
    elif "Golden retriever" in name:
        name = "Golden Retriever"
    elif "Toy pomeranian" in name:
        name = "Toy Pomeranian"
        
    breeds.append({
        "name": name,
        "colors_raw": all_colors_raw,
        "images": []
    })

# Get WhatsApp images from 2026-07-27 (the first 41 chronologically)
files = [f for f in os.listdir(image_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
pattern = re.compile(r"WhatsApp Image (\d{4}-\d{2}-\d{2}) at (\d{1,2})\.(\d{2})\.(\d{2})\s*(AM|PM)(?:\s*\((\d+)\))?")

parsed_files = []
for f in files:
    match = pattern.search(f)
    if match:
        date_str = match.group(1)
        hour = int(match.group(2))
        minute = int(match.group(3))
        second = int(match.group(4))
        ampm = match.group(5)
        duplicate_idx = int(match.group(6)) if match.group(6) else 0
        
        if ampm == "PM" and hour < 12:
            hour += 12
        elif ampm == "AM" and hour == 12:
            hour = 0
            
        dt = datetime.strptime(f"{date_str} {hour:02d}:{minute:02d}:{second:02d}", "%Y-%m-%d %H:%M:%S")
        parsed_files.append((dt, duplicate_idx, f))
    else:
        if "WhatsApp" in f:
            parsed_files.append((datetime.min, 0, f))

# Sort only files from 2026-07-27
files_2026_07_27 = [f for f in parsed_files if f[0].strftime('%Y-%m-%d') == '2026-07-27' or f[0] == datetime.min]
files_2026_07_27.sort(key=lambda x: (x[0], x[1]))

breed_image_counts = [3, 4, 3, 4, 2, 2, 4, 2, 2, 2, 2, 2, 2, 3, 4]
image_index = 0
for idx, count in enumerate(breed_image_counts):
    if idx < len(breeds):
        for _ in range(count):
            if image_index < len(files_2026_07_27):
                img_name = files_2026_07_27[image_index][2]
                breeds[idx]["images"].append(img_name)
                image_index += 1

# Define details (Description, Price ranges, Locations, and initial ratings) for the 15 original breeds
details_original = [
    {
        "description": "The Labrador Retriever is one of the most popular dog breeds worldwide, known for its friendly, outgoing nature, intelligence, and high energy. They make excellent family companions.",
        "locations": ["Chikkaballapur", "Shidlagatt"],
        "price_usd_min": 800, "price_usd_max": 2000,
        "price_inr_min": 15000, "price_inr_max": 120000,
        "ratings": [4.8, 5.0, 4.9]
    },
    {
        "description": "Intelligent, friendly, and devoted, the Golden Retriever is a classic family dog. They have a beautiful golden coat, a gentle temperament, and a love for retrieving and play.",
        "locations": ["Chikkaballapur"],
        "price_usd_min": 1000, "price_usd_max": 2500,
        "price_inr_min": 30000, "price_inr_max": 150000,
        "ratings": [4.9, 5.0, 5.0, 4.8]
    },
    {
        "description": "French Bulldogs are playful, adaptable, and smart companions. With their signature 'bat ears' and stocky build, they make quiet, affectionate indoor lapdogs.",
        "locations": ["Shidlagatt"],
        "price_usd_min": 1500, "price_usd_max": 4000,
        "price_inr_min": 50000, "price_inr_max": 200000,
        "ratings": [4.7, 4.9, 4.8]
    },
    {
        "description": "Beagles are merry, friendly, and curious hounds. They have an excellent sense of smell, love tracking scents, and are incredibly gentle with children.",
        "locations": ["Chikkaballapur", "Shidlagatt"],
        "price_usd_min": 500, "price_usd_max": 1200,
        "price_inr_min": 25000, "price_inr_max": 90000,
        "ratings": [4.6, 4.8, 4.7]
    },
    {
        "description": "Jack Russell Terriers are lively, bold, and energetic working dogs. Known for their high intelligence, speed, and vocal personality, they require active owners.",
        "locations": ["Chikkaballapur"],
        "price_usd_min": 600, "price_usd_max": 1200,
        "price_inr_min": 25000, "price_inr_max": 120000,
        "ratings": [4.5, 4.7, 4.6]
    },
    {
        "description": "Tiny dogs with massive personalities, Chihuahuas are loyal, alert, and sassy. They are perfect companions for apartments and love cuddling close to their owners.",
        "locations": ["Shidlagatt"],
        "price_usd_min": 500, "price_usd_max": 1500,
        "price_inr_min": 20000, "price_inr_max": 200000,
        "ratings": [4.4, 4.6, 4.5]
    },
    {
        "description": "Toy Pomeranians are bright, extroverted, and intensely fluffy. They resemble miniature lions and possess a friendly, curious mind packed inside a tiny body.",
        "locations": ["Chikkaballapur", "Shidlagatt"],
        "price_usd_min": 800, "price_usd_max": 2500,
        "price_inr_min": 80000, "price_inr_max": 250000,
        "ratings": [4.8, 4.9, 4.7, 4.8]
    },
    {
        "description": "The Maltese is a gentle, fearless toy dog wrapped in silky white hair. They are elegant, responsive, and make highly affectionate family pets.",
        "locations": ["Chikkaballapur"],
        "price_usd_min": 1000, "price_usd_max": 3000,
        "price_inr_min": 45000, "price_inr_max": 140000,
        "ratings": [4.7, 4.8]
    },
    {
        "description": "A popular crossbreed between a Maltese and a Toy Poodle, Maltipoos are friendly, affectionate, and low-shedding. Their charming puppy-like looks last a lifetime.",
        "locations": ["Shidlagatt"],
        "price_usd_min": 1000, "price_usd_max": 3000,
        "price_inr_min": 60000, "price_inr_max": 140000,
        "ratings": [4.8, 4.9, 4.8]
    },
    {
        "description": "Toy Poodles are exceptionally smart, highly trainable, and active. With their elegant posture and hypoallergenic curly coats, they excel in agility and tricks.",
        "locations": ["Chikkaballapur", "Shidlagatt"],
        "price_usd_min": 1200, "price_usd_max": 3500,
        "price_inr_min": 45000, "price_inr_max": 150000,
        "ratings": [4.9, 4.7, 4.8]
    },
    {
        "description": "Gentle, graceful, and sweet, the Cavalier King Charles Spaniel has a silky coat and a melting expression. They get along famously with children and other pets.",
        "locations": ["Chikkaballapur"],
        "price_usd_min": 1500, "price_usd_max": 3500,
        "price_inr_min": 95000, "price_inr_max": 350000,
        "ratings": [4.8, 4.9]
    },
    {
        "description": "German Shepherds are courageous, intelligent, and highly versatile working dogs. Extremely loyal to their family, they excel in protection, training, and tracking.",
        "locations": ["Chikkaballapur", "Shidlagatt"],
        "price_usd_min": 800, "price_usd_max": 2500,
        "price_inr_min": 25000, "price_inr_max": 80000,
        "ratings": [4.9, 5.0, 4.8]
    },
    {
        "description": "Dobermans are sleek, powerful, and alert guardians. Possessing high intelligence and fearless protective instincts, they are deeply loyal and affectionate with owners.",
        "locations": ["Shidlagatt"],
        "price_usd_min": 1000, "price_usd_max": 2500,
        "price_inr_min": 24000, "price_inr_max": 120000,
        "ratings": [4.7, 4.8, 4.8]
    },
    {
        "description": "Rottweilers are robust, confident, and powerful companions. They have a calm, courageous nature, making them excellent family protectors when properly trained.",
        "locations": ["Chikkaballapur"],
        "price_usd_min": 1200, "price_usd_max": 3000,
        "price_inr_min": 30000, "price_inr_max": 120000,
        "ratings": [4.8, 4.7, 4.9]
    },
    {
        "description": "The Cane Corso is an ancient Italian mastiff breed, highly valued as a protector and hunter. They are assertive, muscular, and carry a majestic, imposing presence.",
        "locations": ["Chikkaballapur", "Shidlagatt"],
        "price_usd_min": 1500, "price_usd_max": 3500,
        "price_inr_min": 42000, "price_inr_max": 200000,
        "ratings": [4.7, 4.9, 4.8, 4.9]
    }
]

for idx, b in enumerate(breeds):
    if idx < len(details_original):
        b.update(details_original[idx])

# Define the updated list of 15 new breeds explicitly (total 30 breeds)
new_breeds_data = [
    {
        "name": "Siberian Husky",
        "colors_raw": "Black & White | Silver & White | Gray & White",
        "images": ["husky_1.png", "husky_2.png"],
        "description": "Siberian Huskies are beautiful, energetic dogs with striking eyes and high endurance. They are friendly, outgoing, and thrive in active households.",
        "locations": ["Chikkaballapur"],
        "price_usd_min": 1000, "price_usd_max": 3500,
        "price_inr_min": 40000, "price_inr_max": 150000,
        "ratings": [4.8, 4.7]
    },
    {
        "name": "Shih Tzu",
        "colors_raw": "Gold & White | Black & White | Brindle & White",
        "images": ["shih_tzu_1.png", "shih_tzu_2.png"],
        "description": "Shih Tzus are affectionate, playful lapdogs with long silky coats. They are compact, friendly, and adjust well to apartment living.",
        "locations": ["Shidlagatt"],
        "price_usd_min": 800, "price_usd_max": 2500,
        "price_inr_min": 25000, "price_inr_max": 100000,
        "ratings": [4.7, 4.6]
    },
    {
        "name": "Pug",
        "colors_raw": "Fawn | Black",
        "images": ["pug_1.png", "pug_2.png"],
        "description": "Pugs are small, muscular dogs with short muzzles and wrinkled faces. They are charming, mischievous, and loving companions.",
        "locations": ["Chikkaballapur", "Shidlagatt"],
        "price_usd_min": 600, "price_usd_max": 2000,
        "price_inr_min": 20000, "price_inr_max": 70000,
        "ratings": [4.6, 4.8]
    },
    {
        "name": "Bergamasco Sheepdog",
        "colors_raw": "Gray | Coal Black | Silver Gray",
        "images": ["bergamasco_1.png"],
        "description": "The Bergamasco Sheepdog is a rustic, intelligent herding breed with a unique corded coat. They are vigilant, patient, and deeply devoted to their family.",
        "locations": ["Chikkaballapur"],
        "price_usd_min": 2000, "price_usd_max": 5000,
        "price_inr_min": 150000, "price_inr_max": 300000,
        "ratings": [4.8, 4.9]
    },
    {
        "name": "Afghan Hound",
        "colors_raw": "Cream | Golden | Black | Silver",
        "images": ["afghan_hound_1.png"],
        "description": "Afghan Hounds are distinguished by their thick, fine, silky coat and exotic appearance. They are elegant, independent, and fast runners.",
        "locations": ["Shidlagatt"],
        "price_usd_min": 1500, "price_usd_max": 4000,
        "price_inr_min": 120000, "price_inr_max": 500000,
        "ratings": [4.9, 4.8]
    },
    {
        "name": "Greyhound",
        "colors_raw": "Fawn | Brindle | White | Black | Blue",
        "images": ["greyhound_1.png"],
        "description": "Greyhounds are gentle, quiet, and athletic hounds built for speed. They are affectionate, low-maintenance indoors, and make surprisingly good apartment dogs.",
        "locations": ["Chikkaballapur", "Shidlagatt"],
        "price_usd_min": 1200, "price_usd_max": 3500,
        "price_inr_min": 90000, "price_inr_max": 350000,
        "ratings": [4.7, 4.7]
    },
    {
        "name": "Akita",
        "colors_raw": "Red | Fawn | Sesame | Brindle | Pure White",
        "images": ["akita_1.png"],
        "description": "Akitas are large, powerful, and dignified dogs with a strong protective instinct. They are intensely loyal to their families and quiet in the home.",
        "locations": ["Chikkaballapur"],
        "price_usd_min": 1000, "price_usd_max": 3000,
        "price_inr_min": 65000, "price_inr_max": 180000,
        "ratings": [4.8, 4.9]
    },
    {
        "name": "American Bulldog",
        "colors_raw": "White",
        "images": [
            "WhatsApp Image 2026-07-28 at 10.54.52 AM (1).jpeg",
            "WhatsApp Image 2026-07-28 at 10.54.52 AM.jpeg",
            "WhatsApp Image 2026-07-28 at 10.54.53 AM (1).jpeg",
            "WhatsApp Image 2026-07-28 at 10.54.53 AM.jpeg"
        ],
        "description": "American Bulldogs are strong, muscular working dogs. They are confident, active, protective, and make wonderful active companions.",
        "locations": ["Shidlagatt"],
        "price_usd_min": 1200, "price_usd_max": 3500,
        "price_inr_min": 90000, "price_inr_max": 320000,
        "ratings": [4.8, 4.7]
    },
    {
        "name": "Standard Bulldog",
        "colors_raw": "Red | White | Fawn | Brindle",
        "images": ["english_bulldog_1.png"],
        "description": "Standard Bulldogs (English Bulldogs) are thickset, low-slung, and muscular. They are docile, friendly, and courageous with a calm disposition.",
        "locations": ["Chikkaballapur", "Shidlagatt"],
        "price_usd_min": 1000, "price_usd_max": 3000,
        "price_inr_min": 60000, "price_inr_max": 300000,
        "ratings": [4.5, 4.6]
    },
    {
        "name": "Great Dane",
        "colors_raw": "Fawn | Black | Harlequin | Blue | Brindle",
        "images": [
            "WhatsApp Image 2026-07-28 at 10.30.25 AM (1).jpeg",
            "WhatsApp Image 2026-07-28 at 10.30.26 AM (1).jpeg",
            "WhatsApp Image 2026-07-28 at 10.30.26 AM.jpeg",
            "WhatsApp Image 2026-07-28 at 10.30.27 AM.jpeg"
        ],
        "description": "Great Danes are gentle giants, combining majesty, strength, and elegance with a friendly and playful personality.",
        "locations": ["Chikkaballapur", "Shidlagatt"],
        "price_usd_min": 1000, "price_usd_max": 3000,
        "price_inr_min": 40000, "price_inr_max": 150000,
        "ratings": [4.9, 4.8]
    },
    {
        "name": "Belgian Malinois",
        "colors_raw": "Fawn | Mahogany | Fawn Sable with Black Mask",
        "images": [
            "WhatsApp Image 2026-07-28 at 10.33.26 AM (1).jpeg",
            "WhatsApp Image 2026-07-28 at 10.33.26 AM.jpeg",
            "WhatsApp Image 2026-07-28 at 10.33.27 AM (1).jpeg",
            "WhatsApp Image 2026-07-28 at 10.33.27 AM.jpeg"
        ],
        "description": "Belgian Malinois are highly intelligent, versatile herding dogs. Confident and hardworking, they are widely used in police work and protection.",
        "locations": ["Chikkaballapur", "Shidlagatt"],
        "price_usd_min": 800, "price_usd_max": 2500,
        "price_inr_min": 75000, "price_inr_max": 150000,
        "ratings": [4.9, 5.0, 4.9]
    },
    {
        "name": "Newfoundland",
        "colors_raw": "Brown | Black | Landseer (Black & White)",
        "images": [
            "WhatsApp Image 2026-07-28 at 10.43.26 AM (1).jpeg",
            "WhatsApp Image 2026-07-28 at 10.43.27 AM (1).jpeg",
            "WhatsApp Image 2026-07-28 at 10.43.27 AM.jpeg",
            "WhatsApp Image 2026-07-28 at 10.43.28 AM.jpeg"
        ],
        "description": "The Newfoundland is a large, strong, and heavy-coated working dog breed. They are famous for their sweet disposition, calm strength, and natural life-saving abilities.",
        "locations": ["Chikkaballapur", "Shidlagatt"],
        "price_usd_min": 1200, "price_usd_max": 3500,
        "price_inr_min": 120000, "price_inr_max": 350000,
        "ratings": [4.9, 4.8]
    },
    {
        "name": "Mudhol Hound",
        "colors_raw": "White | Fawn | Black",
        "images": [
            "WhatsApp Image 2026-07-28 at 10.44.55 AM.jpeg",
            "WhatsApp Image 2026-07-28 at 10.44.56 AM.jpeg"
        ],
        "description": "The Mudhol Hound (also known as the Caravan Hound) is a native Indian breed known for its speed, stamina, and keen sight. They are exceptionally loyal.",
        "locations": ["Chikkaballapur", "Shidlagatt"],
        "price_usd_min": 500, "price_usd_max": 1500,
        "price_inr_min": 8000, "price_inr_max": 25000,
        "ratings": [4.8, 4.7]
    },
    {
        "name": "Boxer",
        "colors_raw": "Fawn | Brindle | White",
        "images": [
            "WhatsApp Image 2026-07-28 at 10.47.10 AM.jpeg",
            "WhatsApp Image 2026-07-28 at 10.47.11 AM.jpeg",
            "WhatsApp Image 2026-07-28 at 10.47.12 AM.jpeg"
        ],
        "description": "Boxers are intelligent, high-energy, and playful dogs with a protective nature. They make outstanding family companions and guardians.",
        "locations": ["Chikkaballapur"],
        "price_usd_min": 800, "price_usd_max": 2500,
        "price_inr_min": 20000, "price_inr_max": 80000,
        "ratings": [4.8, 4.9]
    },
    {
        "name": "Tibetan Mastiff",
        "colors_raw": "Black & Tan | Red Gold | Solid Black",
        "images": [
            "WhatsApp Image 2026-07-28 at 11.22.49 AM.jpeg",
            "WhatsApp Image 2026-07-28 at 11.22.50 AM.jpeg"
        ],
        "description": "The Tibetan Mastiff is a massive, powerful guardian breed from the Himalayas. They are independent, strong-willed, and deeply protective of their territory and family.",
        "locations": ["Chikkaballapur"],
        "price_usd_min": 2000, "price_usd_max": 8000,
        "price_inr_min": 100000, "price_inr_max": 800000,
        "ratings": [4.9, 5.0]
    }
]

# Append the new breeds to the breeds list
breeds.extend(new_breeds_data)

# Save data as JSON
out_path = r"d:\DogWebsite\breeds_data.json"
with open(out_path, 'w', encoding='utf-8') as out_f:
    json.dump(breeds, out_f, indent=2)

print("breeds_data.json created successfully!")
print("Total breeds processed:", len(breeds))
