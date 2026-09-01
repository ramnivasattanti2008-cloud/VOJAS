#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate all 17 VOJAS locale files for Indian languages.
This script creates files in the locales directory.
"""

import json
import os

LOCALE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src", "i18n", "locales")


def get_en():
    en_path = os.path.join(LOCALE_DIR, "en.json")
    with open(en_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def set_nested(obj, key, value):
    parts = key.split('.')
    current = obj
    for p in parts[:-1]:
        if p not in current:
            current[p] = {}
        current = current[p]
    current[parts[-1]] = value


def write_file(lang_code, translations):
    """Generate locale file."""
    en = get_en()
    result = json.loads(json.dumps(en))
    for key, value in translations.items():
        set_nested(result, key, value)

    out_path = os.path.join(LOCALE_DIR, f"{lang_code}.json")
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"Generated {out_path}: {len(translations)} keys")


# All translations go here
TRANSLATIONS = {}


if __name__ == "__main__":
    for lang, tr in TRANSLATIONS.items():
        write_file(lang, tr)
