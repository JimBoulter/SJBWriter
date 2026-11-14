
# PyInstaller build configuration for SJB Writer (macOS).

from pathlib import Path

from PyInstaller.utils.hooks import collect_all

ROOT = Path(SPECPATH)

# Collect package resources and hidden imports for runtime dependencies.
datas = []
binaries = []
hiddenimports = []

for package in ("flask", "waitress", "requests", "markdownify"):
    package_datas, package_binaries, package_hidden = collect_all(package)
    datas += package_datas
    binaries += package_binaries
    hiddenimports += package_hidden

# Flask application frontend.
datas += [
    (str(ROOT / "app" / "templates"), "app/templates"),
    (str(ROOT / "app" / "static"), "app/static"),
]

# Pristine starter content. These are installation sources only.
# User-editable copies are created in the Books folder on first launch.
datas += [
    (str(ROOT / "Global" / "state.json"), "Global"),
    (str(ROOT / "Global" / "prompts"), "Global/prompts"),
    (str(ROOT / "Global" / "system"), "Global/system"),
    (
        str(ROOT / "Projects" / "sample-project"),
        "Projects/sample-project",
    ),
]

a = Analysis(
    [str(ROOT / "sjb_launcher.py")],
    pathex=[str(ROOT / "app")],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="SJB Writer",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name="SJB Writer",
)

app = BUNDLE(
    coll,
    name="SJB Writer.app",
    bundle_identifier=None,
    info_plist={
        "CFBundleName": "SJB Writer",
        "CFBundleDisplayName": "SJB Writer",
    },
)
