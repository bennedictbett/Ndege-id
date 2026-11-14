"""
ml/cv_recordist.py: 5-fold cross-validation in which no (species, recordist) pair is ever
split between train, validation and test. Every recording is tested exactly once, so
per-species results use all recordings, not a 20% slice.

Run from the repo root (GPU recommended; roughly 1.5-2 hours on a Colab T4):
    python ml/cv_recordist.py
Needs data/recordings_metadata.csv (see scripts/backfill_metadata.py).
Writes into ml/models/: cv_recordist_results.json, cv_recordist_predictions.csv and one
cv_fold<k>.npz per finished fold (re-running skips folds that are already done).
Does not save model weights.
"""
import copy
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.model_selection import StratifiedGroupKFold
from torch.utils.data import DataLoader

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import ml.train as T  # noqa: E402  (reuses data loading, model, transforms, constants)

META_CSV = ROOT / "data" / "recordings_metadata.csv"
OUT_DIR = Path(T.MODEL_DIR)
N_FOLDS = 5


# ------------------------------------------------------------ pure-numpy helpers
def recordist_groups(rec_ids, meta_rec):
    """Group key per clip: 'species|recordist'. Unknown recordist -> its own recording."""
    out = []
    for rid in rec_ids:
        species, xc_id = rid.split("/", 1)
        who = meta_rec.get(xc_id)
        if who is None or pd.isna(who) or not str(who).strip():
            who = f"unknown_{xc_id}"
        out.append(f"{species}|{who}")
    return np.array(out)


def make_folds(labels, groups, seed):
    """Yield (train, val, test) index arrays; groups never cross a boundary."""
    idx = np.arange(len(labels))
    outer = StratifiedGroupKFold(n_splits=N_FOLDS, shuffle=True, random_state=seed)
    for rest, te in outer.split(idx, labels, groups):
        inner = StratifiedGroupKFold(n_splits=4, shuffle=True, random_state=seed)
        tr_i, va_i = next(inner.split(rest, labels[rest], groups[rest]))
        tr, va = rest[tr_i], rest[va_i]
        for a, b in ((tr, te), (va, te), (tr, va)):
            assert not (set(groups[a]) & set(groups[b])), "a group is in two sets"
        yield tr, va, te


def summarise(oof_prob, labels, rec_ids, class_names):
    """Pooled out-of-fold metrics at clip level and at recording level."""
    pred = oof_prob.argmax(1)
    present = sorted(set(labels) | set(pred))
    report = classification_report(
        labels, pred, labels=present, target_names=[class_names[i] for i in present],
        zero_division=0, output_dict=True)

    rec_df = pd.DataFrame(oof_prob)
    rec_df["rec"] = rec_ids
    rec_mean = rec_df.groupby("rec").mean()
    rec_label = pd.Series(labels).groupby(rec_ids).first().loc[rec_mean.index].to_numpy()
    rec_pred = rec_mean.to_numpy().argmax(1)

    return {
        "clip_accuracy": float(accuracy_score(labels, pred)),
        "clip_macro_f1": float(f1_score(labels, pred, average="macro", zero_division=0)),
        "n_clips": int(len(labels)),
        "recording_accuracy": float(accuracy_score(rec_label, rec_pred)),
        "recording_macro_f1": float(f1_score(rec_label, rec_pred, average="macro",
                                             zero_division=0)),
        "n_recordings": int(len(rec_label)),
        "per_species": {k: v for k, v in report.items()
                        if k not in ("accuracy", "macro avg", "weighted avg")},
    }


# ------------------------------------------------------------ training (torch)
def train_fold(tr, va, paths, labels, n_cls, device):
    mk = lambda idx, tf, shuffle: DataLoader(
        T.SpectrogramDataset(paths[idx], labels[idx], tf),
        batch_size=T.BATCH_SIZE, shuffle=shuffle, num_workers=0)
    train_loader, val_loader = mk(tr, T.train_transform, True), mk(va, T.eval_transform, False)

    model = T.build_model(n_cls).to(device)
    counts = np.maximum(np.bincount(labels[tr], minlength=n_cls), 1)
    weights = torch.tensor(len(tr) / (n_cls * counts), dtype=torch.float32).to(device)
    criterion = nn.CrossEntropyLoss(weight=weights, label_smoothing=0.1)
    optimizer = optim.AdamW([
        {"params": [p for n, p in model.named_parameters() if n.startswith("layer4")],
         "lr": T.LR_BACKBONE},
        {"params": model.fc.parameters(), "lr": T.LR_HEAD},
    ], weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=T.EPOCHS)

    best_f1, best_state, bad = -1.0, None, 0
    for epoch in range(T.EPOCHS):
        model.train()
        for x, y in train_loader:
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad()
            loss = criterion(model(x), y)
            loss.backward()
            optimizer.step()
        scheduler.step()

        v_logits, v_y = T.predict(model, val_loader, device)
        v_f1 = f1_score(v_y, v_logits.argmax(1), average="macro", zero_division=0)
        print(f"    epoch {epoch+1:02d} val macro-F1 {v_f1:.3f}")
        if v_f1 > best_f1:
            best_f1, best_state, bad = v_f1, copy.deepcopy(model.state_dict()), 0
        else:
            bad += 1
            if bad >= T.PATIENCE:
                break
    model.load_state_dict(best_state)
    return model


def main():
    paths, labels, rec_ids, class_names = T.load_data()
    meta_rec = (pd.read_csv(META_CSV, dtype={"id": str})
                .drop_duplicates("id").set_index("id")["rec"])
    groups = recordist_groups(rec_ids, meta_rec)
    n_cls = len(class_names)
    print(f"{len(set(groups))} (species, recordist) groups; "
          f"{sum(g.split('|')[1].startswith('unknown_') for g in set(groups))} unknown-recordist")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("Device:", device)
    oof = np.zeros((len(paths), n_cls), dtype=np.float32)
    fold_of = np.full(len(paths), -1)
    fold_rows = []

    for k, (tr, va, te) in enumerate(make_folds(labels, groups, T.SEED)):
        ck = OUT_DIR / f"cv_fold{k}.npz"
        if ck.exists():
            saved = np.load(ck)
            assert np.array_equal(saved["te"], te), "saved fold does not match this split"
            probs = saved["probs"]
            print(f"Fold {k}: loaded from {ck.name}")
        else:
            print(f"Fold {k}: train {len(tr)} | val {len(va)} | test {len(te)} clips")
            model = train_fold(tr, va, paths, labels, n_cls, device)
            loader = DataLoader(T.SpectrogramDataset(paths[te], labels[te], T.eval_transform),
                                batch_size=T.BATCH_SIZE, shuffle=False, num_workers=0)
            logits, _ = T.predict(model, loader, device)
            probs = torch.softmax(logits, 1).numpy()
            np.savez(ck, te=te, probs=probs)
        oof[te], fold_of[te] = probs, k
        acc = accuracy_score(labels[te], probs.argmax(1))
        f1 = f1_score(labels[te], probs.argmax(1), average="macro", zero_division=0)
        fold_rows.append({"fold": k, "n_test_clips": int(len(te)),
                          "accuracy": float(acc), "macro_f1": float(f1)})
        print(f"Fold {k}: test accuracy {acc:.1%} macro-F1 {f1:.3f}")

    assert (fold_of >= 0).all(), "some clips were never tested"
    res = summarise(oof, labels, rec_ids, class_names)
    res.update({"seed": T.SEED, "n_species": n_cls, "grouping": "species|recordist",
                "folds": fold_rows,
                "baseline_uniform_chance": 1.0 / n_cls})
    (OUT_DIR / "cv_recordist_results.json").write_text(json.dumps(res, indent=2))
    pd.DataFrame({
        "path": paths, "recording": rec_ids, "group": groups, "fold": fold_of,
        "true": [class_names[i] for i in labels],
        "pred": [class_names[i] for i in oof.argmax(1)],
        "confidence": oof.max(1)}).to_csv(OUT_DIR / "cv_recordist_predictions.csv", index=False)

    print(f"\nPooled out-of-fold, recordist-grouped ({N_FOLDS} folds)")
    print(f"  clip level     : accuracy {res['clip_accuracy']:.1%} | macro-F1 {res['clip_macro_f1']:.3f}")
    print(f"  recording level: accuracy {res['recording_accuracy']:.1%} | macro-F1 {res['recording_macro_f1']:.3f}")
    print("  per-fold accuracy:", ", ".join(f"{r['accuracy']:.1%}" for r in fold_rows))


if __name__ == "__main__":
    main()