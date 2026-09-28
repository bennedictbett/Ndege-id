"""
ml/labels.py: single source of truth for species and class indices.

Used by scripts/download_xeno_canto.py, ml/prepare_data.py and ml/train_v2.py
(and import it in your backend too, so predictions map back to the same names).

RULES
- The position in CORE_SPECIES IS the class index. Never reorder or insert;
  only append. Indices 0-72 match the original ml/train.py.
- Folder names use underscores (Genus_species); the downloader converts them
  back to "Genus species" for Xeno-canto queries.
"""

CORE_SPECIES = [
    # Original (0-9)
    "Haliaeetus_vocifer", "Bostrychia_hagedash", "Cuculus_solitarius",
    "Ceryle_rudis", "Milvus_migrans", "Lophoceros_nasutus",
    "Laniarius_aethiopicus", "Pycnonotus_barbatus", "Lamprotornis_superbus",
    "Cossypha_heuglini",
    # Starlings (10-17)
    "Lamprotornis_hildebrandti", "Cinnyricinclus_leucogaster",
    "Lamprotornis_chalybaeus", "Onychognathus_morio", "Creatophora_cinerea",
    "Lamprotornis_purpuroptera", "Lamprotornis_unicolor",
    "Onychognathus_tenuirostris",
    # Doves (18-20)
    "Streptopelia_capicola", "Columba_guinea", "Turtur_chalcospilos",
    # Weavers (21-28)
    "Ploceus_cucullatus", "Ploceus_intermedius", "Ploceus_baglafecht",
    "Ploceus_spekei", "Ploceus_jacksoni", "Ploceus_xanthops",
    "Ploceus_ocularis", "Ploceus_melanocephalus",
    # Sunbirds (29-36)
    "Cinnyris_venustus", "Chalcomitra_senegalensis", "Nectarinia_kilimensis",
    "Cinnyris_mediocris", "Cinnyris_erythrocercus", "Cinnyris_mariquensis",
    "Hedydipna_collaris", "Anthreptes_orientalis",
    # Kingfishers (37-41)
    "Megaceryle_maxima", "Halcyon_senegalensis", "Halcyon_chelicuti",
    "Halcyon_albiventris", "Halcyon_leucocephala",
    # Eagles & raptors (42-48)
    "Stephanoaetus_coronatus", "Lophaetus_occipitalis", "Buteo_buteo",
    "Elanus_caeruleus", "Falco_tinnunculus", "Falco_peregrinus",
    "Polyboroides_typus",
    # Thrushes (49-53)
    "Turdus_pelios", "Turdus_abyssinicus", "Geokichla_piaggiae",
    "Monticola_rufocinereus", "Monticola_saxatilis",
    # Ducks & waterfowl (54-60)
    "Alopochen_aegyptiaca", "Anas_capensis", "Anas_erythrorhyncha",
    "Anas_sparsa", "Anas_undulata", "Spatula_hottentota",
    "Dendrocygna_viduata",
    # Coucals (61-64)
    "Centropus_grillii", "Centropus_monachus", "Centropus_senegalensis",
    "Centropus_superciliosus",
    # Turacos (65-72)
    "Corythaeola_cristata", "Tauraco_schalowi", "Tauraco_schuettii",
    "Tauraco_leucolophus", "Tauraco_fischeri", "Tauraco_hartlaubi",
    "Gallirex_porphyreolophus", "Musophaga_rossae",
]

# These 12 were in the old download list but never in the label maps, so they
# were downloaded and then ignored. Off by default: changing the class count
# means the deployed model/backend must be swapped together.
# Note: vultures and the Secretarybird vocalise rarely, so they suit a
# sound-based identifier poorly.
EXTRA_SPECIES = [
    "Streptopelia_senegalensis", "Alcedo_cristata", "Corythornis_cyanostigma",
    "Aquila_verreauxii", "Circaetus_pectoralis", "Polemaetus_bellicosus",
    "Buteo_augur", "Falco_biarmicus", "Gyps_africanus", "Gyps_rueppelli",
    "Necrosyrtes_monachus", "Sagittarius_serpentarius",
]
INCLUDE_EXTRA = False

ACTIVE_SPECIES = CORE_SPECIES + (EXTRA_SPECIES if INCLUDE_EXTRA else [])
SPECIES_LABELS = {name: i for i, name in enumerate(ACTIVE_SPECIES)}
LABEL_TO_SPECIES = {i: name for name, i in SPECIES_LABELS.items()}


def scientific_name(folder_name: str) -> str:
    return folder_name.replace("_", " ")