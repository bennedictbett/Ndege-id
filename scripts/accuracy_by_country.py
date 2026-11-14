import pandas as pd

p = pd.read_csv("ml/models/cv_recordist_predictions.csv")
p["id"] = p["recording"].str.split("/").str[-1]
m = pd.read_csv("data/recordings_metadata.csv", dtype={"id": str}).drop_duplicates("id")[["id", "cnt"]]
p = p.merge(m, on="id", how="left")
p["ok"] = p["true"] == p["pred"]
p["where"] = p["cnt"].where(p["cnt"].isin(["Kenya", "Tanzania", "Uganda"]), "elsewhere")

print(p.groupby("where")["ok"].agg(["mean", "count"]).round(3))
print()
print(p.groupby("cnt")["ok"].agg(["mean", "count"]).sort_values("count", ascending=False).head(8).round(3))