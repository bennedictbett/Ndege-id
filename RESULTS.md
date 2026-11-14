# Bird-audio model: results and evaluation history

## Data
49 species, 1,459 Xeno-canto recordings, 6,509 five-second mel-spectrogram clips (up to the 8
loudest windows from the first 90 s of each recording). Recordist, location and licence
metadata for every recording is in `data/recordings_metadata.csv`.

Recordings come from many countries (counts in the metadata file, which also lists a few
recordings outside the 49-species roster): Kenya 507, Tanzania 211, South Africa 187,
Uganda 114, Ethiopia 85, Zambia 48, Gambia 36, Senegal 33, others fewer.

## Model
ResNet18 (ImageNet weights). Only `layer4` and a new classification head are trained; the rest
is frozen. AdamW, class-weighted cross-entropy with label smoothing 0.1, time-shift and
time/frequency-mask augmentation, early stopping on validation macro-F1 (patience 8).

## Evaluation history (each step removes a source of leakage)
| Protocol | Accuracy | Macro-F1 |
|---|---|---|
| Original run: not reproducible (logs lost) | "75%", validation set | n/a |
| Recording-grouped split, seed 42 | 62.1% | 0.522 |
| Recording-grouped split, seed 7 | 52.7% | 0.442 |
| **Recordist-grouped 5-fold CV, clip level** | **36.7%** | **0.276** |
| Same, recording level (clip probabilities averaged per recording) | 45.7% | 0.332 |

Chance is 2.0%; always predicting the commonest species gives about 8%.
Per-fold accuracy of the final protocol: 37.1%, 32.5%, 36.2%, 37.9%, 40.7%.

### The original 75%
I no longer have the logs for this run, so I cannot reproduce it and I treat it as superseded.
From the code history at the time: each species was capped at 20 recordings, one 5-second
clip from the start of each file was used per recording, the split was a random, unstratified
80/20 `train_test_split` with no test set, and the checkpoint was chosen by best validation
accuracy. That makes 75% a small, selection-biased validation score, not comparable to the
figures above.

### Why the number fell
- **Recording-grouped splits** (`ml/train.py`) stop clips from one recording appearing on both
  sides of the split. The split is saved in `ml/models/split_v2.json` and the code asserts that
  no recording is in two sets. The test set is used once, after early stopping.
- **Recordist overlap remained:** 67% of test recordings shared a recordist with a training
  recording of the same species, and 48% shared an exact location, so the model could partly
  learn recording setups.
- **Recordist-grouped CV** (`ml/cv_recordist.py`) groups by (species, recordist), so no
  recordist contributes the same species to both training and test. Every recording is tested
  exactly once.
- Example: Elanus_caeruleus (one recordist supplied 65% of its recordings) had F1 0.65 under the
  recording-grouped split and 0.03 under the recordist-grouped CV.

## Per-species results (recordist-grouped CV)
- Best (F1): Cuculus_solitarius 0.88, Bostrychia_hagedash 0.75, Haliaeetus_vocifer 0.71,
  Columba_guinea 0.71, Streptopelia_capicola 0.64. Loud, simple, distinctive calls.
- Worst (F1): Lamprotornis_chalybaeus 0.01, Lamprotornis_superbus 0.01, Ploceus_intermedius 0.02,
  Polyboroides_typus 0.02, Elanus_caeruleus 0.03. Starlings, weavers and sunbirds are near chance.
- 9 of 49 species reach F1 of 0.5 or more; none score exactly 0.
- Full table: `ml/models/cv_recordist_results.json`; per-clip predictions:
  `ml/models/cv_recordist_predictions.csv`.

## Accuracy by recording country (recordist-grouped CV, clip level)
| Country | Accuracy | Clips |
|---|---|---|
| Kenya | 26.8% | 2,207 |
| Tanzania | 32.3% | 834 |
| Uganda | 51.2% | 471 |
| All other countries | 42.9% | 2,997 |

Descriptive only: species composition differs by country, so part of the gap may reflect which
species are recorded where. Kenyan recordings are the hardest for the model, and Kenya is the
intended deployment region.

## Confidence (pooled out-of-fold, clip level)
| Threshold | Share of clips answered | Correct |
|---|---|---|
| 0.3 | 56% | 49.3% |
| 0.5 | 29% | 59.8% |
| 0.7 | 13% | 67.9% |
| 0.9 | 4% | 78.5% |

The scores are overconfident (78.5% correct at 0.9 or above) and are not calibrated
probabilities. The app should show candidate matches, not a single confident answer.

## Limitations
- Xeno-canto recordings only; no phone field recordings, so real-world accuracy may differ.
- Grouping by recordist does not remove all shared conditions (same site, same equipment).
- The final cross-validation used one seed; the earlier single splits differed by 9 points
  between two seeds.
- Some species have few recordists (e.g. Hedydipna_collaris: 4), so their scores are unstable.
- Recordings are almost all under non-commercial Creative Commons licences (1,492 of the 1,503 in the metadata file; mostly CC BY-NC-SA 4.0 and CC BY-NC-ND 4.0). Use for research and demonstration, credit the recordists, and check the terms before any commercial use.
- The deployed backend still serves the earlier model, not the one evaluated here.

## Reproduce
- `python ml/prepare_data.py` builds the spectrograms.
- `python ml/train.py` runs the recording-grouped split (seed 42).
- `python ml/cv_recordist.py` runs the recordist-grouped 5-fold cross-validation.
- `python scripts/recordist_overlap.py` measures recordist and location overlap between splits.
- Result files: `ml/models/split_v2.json`, `results_v2.json`, `test_report_v2.txt`,
  `cv_recordist_results.json`, `cv_recordist_predictions.csv`.