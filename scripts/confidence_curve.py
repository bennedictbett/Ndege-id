import pandas as pd

df = pd.read_csv("ml/models/cv_recordist_predictions.csv")
df["ok"] = df["true"] == df["pred"]
print(f"overall: {df.ok.mean():.1%} on {len(df)} clips")
for t in (0.3, 0.5, 0.6, 0.7, 0.8, 0.9):
    keep = df[df.confidence >= t]
    print(f"confidence >= {t:.1f}: answers {len(keep)/len(df):.0%} of clips, "
          f"{keep.ok.mean():.1%} correct")