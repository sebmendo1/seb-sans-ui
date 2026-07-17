# Required Inputs for Seb Sans Studio

```yaml
id: INPUTS
title: Required implementation inputs
status: ready
depends_on: [GOV, A04]
priority: P0
normative: true
```

## Why these inputs are required

The v0.5.1 release package provides finished fonts, icons, documentation, and a specimen. It does not contain the production scripts that created and patched the variable font. Reconstructing those algorithms from binaries would violate the project rule to extend the existing pipeline rather than invent a second one.

Do not begin production font mutation, batch transforms, reset-to-Inter, or release export until the applicable inputs below are present and reviewed.

## Required from Sebastian

Place the following files in the project, or provide their current absolute paths.

### 1. Build pipeline

**Expected file:** `build_sebsans.py`

**Needed behavior:**

- Load the Seb Sans variable source
- Create Text statics at 430, 530, 620, and 720 with `opsz=14`
- Create Display statics at 400 and 700 with `opsz=32`
- Pin `XHGT=100` for all statics
- Rebuild variable TTF and WOFF2 with `opsz`, `wght`, and `XHGT`
- Apply Seb Sans family/style/version naming
- Preserve SIL OFL Reserved Font Name compliance
- Define the existing release directory and filename conventions

**Accepted alternative:** a renamed Python module containing the same production build logic. Include any imported local modules it depends on.

### 2. Letterform transformation pipeline

**Expected file:** `letterform_pass.py`

**Needed behavior:**

- Contour scale about a center/pivot (“the Point”)
- Width/outlines/advance/sidebearing transforms
- Ascender and descender depth transforms
- Composite offset handling
- gvar tuple-delta handling across all three axes
- Point-count-preserving behavior used for the v0.3 letterform pass

**Accepted alternative:** the actual script or notebook used to produce the v0.3 width, tittle, and descender changes, including helper modules.

### 3. GSUB patching pipeline

**Expected file:** `patch_gsub.py`

**Needed behavior:**

- Freeze `zero.slash`, `one.ss01`, `l.ss02`, and `G.1`
- Freeze round punctuation through the `ss03` family
- Extend substitutions/coverage through `tnum`, `numr`, `dnom`, `frac`, `sups`, `subs`, accents, and related contexts
- Re-sort modified coverage tables by glyph ID
- Preserve shaper-safe mappings

**Accepted alternative:** any production script that performed the v0.1.1/v0.2 GSUB patch described in `fonts/README.md`, including helper/config files.

### 4. Script dependencies and invocation notes

Provide any of the following that exist:

- `requirements.txt`, `pyproject.toml`, environment file, or dependency list
- Shell commands used to run each script
- Required working directory / expected relative paths
- External tools and versions (`ttfautohint`, HarfBuzz, WOFF2 compressor, OTS)
- Configuration files, glyph lists, naming maps, or release templates
- Manual post-processing steps not encoded in Python

If no dependency file exists, a short Markdown or text note with the commands previously used is sufficient.

### 5. Inter source provenance

No file is required from Sebastian unless the fork used a modified or nonstandard Inter build.

The implementation plan will download the exact official **Inter v4.1** upright variable font from:

- Release: `https://github.com/rsms/inter/releases/tag/v4.1`
- Reference page: `https://fonts.google.com/specimen/Inter`

The generic Google Fonts selection URL does not contain a selected family and may deliver a build that differs from the Inter 4.1 base named in Seb Sans. The official v4.1 release is therefore the reset/diff baseline. Its URL, license, version, and SHA-256 will be recorded during import.

If Seb Sans was forked from a specific custom Inter binary, provide that exact binary instead.

## Already received

### v0.5.1 release package

Source: `/Users/sebastianmendo/Downloads/SebSans`

- `SebSansVar.ttf`
- `SebSans-v0.5.1.zip`
- `SebSans-Specimen.html`

The zip contains the shipped statics, variable TTF/WOFF2, `fonts/README.md`, `OFL.txt`, 25 standalone SVG icons, SVG sprite, and `SebIcons.jsx`.

### SVG sketch utility

Source: `/Users/sebastianmendo/Downloads/files (1)/svg_roundtrip.py`

This tool is useful for static SVG sketch round-trips only. It explicitly does not preserve components, hinting, or multi-master consistency. It will be imported under `tools/` with guards that prohibit variable-font imports and protected source destinations. It is not a substitute for the three production scripts above.

## Optional but useful

- The original Glyphs/UFO/designspace source, if one exists
- Previous release folders before v0.5.1
- The manual HarfBuzz command history used for QA
- `FONTLOG.txt`, if it exists outside the v0.5.1 archive
- Screenshots or notes showing intended editor interactions

These improve fidelity but do not replace the three required production scripts.

## Handoff checklist

- [x] `build_sebsans.py` and all local imports supplied
- [x] `letterform_pass.py` and all local imports supplied
- [x] `patch_gsub.py` and all local imports supplied
- [x] Invocation/dependency notes supplied (see module `--help` and [P01–P03](pipeline/))
- [x] Confirm whether official Inter v4.1 is the exact fork baseline
- [ ] Confirm whether any Glyphs/UFO/designspace source exists

When the first four required items are present, update this document to `status: ready` and update [A04](architecture/A04-pipeline-inventory.md) with the observed module/function contracts.
