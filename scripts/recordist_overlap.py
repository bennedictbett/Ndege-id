"""How much do test recordings share a recordist or location with training recordings?"""
import json
from pathlib import Path

import pandas as pd

meta = pd.read_csv("data/recordings_metadata.csv", dtype={"id": str})
meta = meta.drop_duplicates("id")
meta["rec"] = meta["rec"].fillna("unknown_" + meta["id"])    # unknown != same person
meta["loc"] = meta["loc"].fillna("unknown_" + meta["id"])
meta = meta.set_index("id")

split = json.loads(Path("ml/models/split_v2.json").read_text())
total = sum(len(split[k]) for k in ("train", "val", "test"))

rows = []
for part in ("train", "val", "test"):
    for rid in split[part]:
        xc_id = rid.split("/")[-1]
        if xc_id in meta.index:
            m = meta.loc[xc_id]
            rows.append((part, xc_id, m["species"], m["rec"], m["loc"]))
df = pd.DataFrame(rows, columns=["part", "id", "species", "rec", "place"])
print(f"recordings matched to metadata: {len(df)} of {total}")

train, test = df[df.part == "train"], df[df.part == "test"].copy()
tr_rec = set(zip(train.species, train.rec))
tr_loc = set(zip(train.species, train.place))
test["rec_in_train"] = [(s, r) in tr_rec for s, r in zip(test.species, test.rec)]
test["loc_in_train"] = [(s, p) in tr_loc for s, p in zip(test.species, test.place)]

print(f"\nTest recordings whose recordist (same species) is also in train: "
      f"{test.rec_in_train.mean():.0%}")
print(f"Test recordings whose exact location (same species) is also in train: "
      f"{test.loc_in_train.mean():.0%}")
print(f"Either: {(test.rec_in_train | test.loc_in_train).mean():.0%}")

print("\nDistinct recordists per species (fewest first):")
print(meta.groupby("species")["rec"].nunique().sort_values().head(10).to_string())
print("\nShare of the single biggest recordist per species (highest first):")
share = meta.groupby("species")["rec"].apply(lambda s: s.value_counts(normalize=True).iloc[0])
print(share.sort_values(ascending=False).head(10).round(2).to_string())