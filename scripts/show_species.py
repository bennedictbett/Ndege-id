import json

r = json.load(open("ml/models/cv_recordist_results.json"))["per_species"]
rows = sorted(r.items(), key=lambda kv: kv[1]["f1-score"])

def show(title, subset):
    print(title)
    for name, v in subset:
        print(f"  {name:32s} f1={v['f1-score']:.2f}  recall={v['recall']:.2f}  n={int(v['support'])}")

show("WORST 10", rows[:10])
show("BEST 10", rows[-10:])
print("\nspecies with F1 = 0:", sum(1 for _, v in rows if v["f1-score"] == 0))
print("species with F1 >= 0.5:", sum(1 for _, v in rows if v["f1-score"] >= 0.5))