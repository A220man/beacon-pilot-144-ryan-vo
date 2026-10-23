import json
import subprocess
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.models import Capsule


class CapsuleFreshness:
    PROPOSED = "proposed"
    VERIFIED = "verified"
    STALE = "stale"
    UNKNOWN = "unknown"


async def check_capsule_freshness(capsule: Capsule) -> dict[str, Any]:
    """
    Check capsule freshness against Git history.
    Equivalent to check-memory.sh - returns machine-readable state.
    Never executes commands embedded in capsule.
    """
    try:
        # Get repository root
        repo_root = await _get_repo_root()
        if not repo_root:
            return {
                "state": CapsuleFreshness.UNKNOWN,
                "usable": False,
                "changed_paths": [],
                "error": "Not a git repository",
            }

        # Check if capsule exists on trusted base ref
        trusted_ref = settings.trusted_base_ref
        capsule_path = Path(capsule.path)

        # Verify capsule file exists and matches trusted version
        on_trusted_ref = await _file_exists_on_ref(trusted_ref, capsule.path)
        if not on_trusted_ref:
            return {
                "state": CapsuleFreshness.PROPOSED,
                "usable": False,
                "changed_paths": [capsule.path],
                "reason": "Capsule not found on trusted base ref",
            }

        # Check if working tree copy is byte-identical to trusted ref
        identical = await _file_identical_to_ref(trusted_ref, capsule.path)
        if not identical:
            return {
                "state": CapsuleFreshness.PROPOSED,
                "usable": False,
                "changed_paths": [capsule.path],
                "reason": "Capsule differs from trusted base ref version",
            }

        # Find last commit on trusted ref that changed this capsule
        last_commit = await _get_last_commit_changing_path(trusted_ref, capsule.path)
        if not last_commit:
            return {
                "state": CapsuleFreshness.UNKNOWN,
                "usable": False,
                "changed_paths": [],
                "reason": "Could not determine last commit changing capsule",
            }

        # Build invalidation set from scope, evidence, invalidated_by, claim verifiers
        invalidation_paths = set()
        for path in json.loads(capsule.scope):
            invalidation_paths.add(path.split("#")[0])
        for path in json.loads(capsule.evidence):
            invalidation_paths.add(path.split("#")[0])
        for path in json.loads(capsule.invalidated_by):
            invalidation_paths.add(path.split("#")[0])
        for claim in json.loads(capsule.claims):
            if "verifier" in claim:
                invalidation_paths.add(claim["verifier"].split("#")[0])

        # Expand globs against trusted commit and current workspace
        expanded_paths = await _expand_globs(repo_root, trusted_ref, last_commit, invalidation_paths)

        # Compare trees: any modification in invalidation set returns stale
        changed = await _compare_trees(repo_root, trusted_ref, last_commit, expanded_paths)

        if changed:
            return {
                "state": CapsuleFreshness.STALE,
                "usable": False,
                "changed_paths": changed,
                "reason": "Declared dependencies have changed since last verification",
            }

        # All checks passed
        return {
            "state": CapsuleFreshness.VERIFIED,
            "usable": True,
            "changed_paths": [],
            "last_verified_commit": last_commit,
        }

    except Exception as e:
        return {
            "state": CapsuleFreshness.UNKNOWN,
            "usable": False,
            "changed_paths": [],
            "error": str(e),
        }


async def _get_repo_root() -> Path | None:
    """Find git repository root."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            cwd=Path.cwd(),
        )
        if result.returncode == 0:
            return Path(result.stdout.strip())
    except Exception:
        pass
    return None


async def _file_exists_on_ref(ref: str, path: str) -> bool:
    """Check if file exists at given ref."""
    try:
        result = subprocess.run(
            ["git", "ls-tree", ref, path],
            capture_output=True,
            text=True,
            cwd=Path.cwd(),
        )
        return result.returncode == 0 and result.stdout.strip() != ""
    except Exception:
        return False


async def _file_identical_to_ref(ref: str, path: str) -> bool:
    """Check if working tree file is byte-identical to ref version."""
    try:
        # Get file content from ref
        result = subprocess.run(
            ["git", "show", f"{ref}:{path}"],
            capture_output=True,
            text=True,
            cwd=Path.cwd(),
        )
        if result.returncode != 0:
            return False
        ref_content = result.stdout

        # Read working tree file
        file_path = Path.cwd() / path
        if not file_path.exists():
            return False
        working_content = file_path.read_text(encoding="utf-8")

        return ref_content == working_content
    except Exception:
        return False


async def _get_last_commit_changing_path(ref: str, path: str) -> str | None:
    """Get last commit on ref that changed the given path."""
    try:
        result = subprocess.run(
            ["git", "log", "-1", "--format=%H", ref, "--", path],
            capture_output=True,
            text=True,
            cwd=Path.cwd(),
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass
    return None


async def _expand_globs(repo_root: Path, trusted_ref: str, last_commit: str, paths: set[str]) -> set[str]:
    """Expand globs against both trusted commit and current workspace."""
    expanded = set()
    for pattern in paths:
        if "*" in pattern or "?" in pattern or "[" in pattern:
            # Expand against trusted commit tree
            try:
                result = subprocess.run(
                    ["git", "ls-tree", "-r", "--name-only", trusted_ref],
                    capture_output=True,
                    text=True,
                    cwd=repo_root,
                )
                if result.returncode == 0:
                    for file_path in result.stdout.strip().split("\n"):
                        if _match_glob(file_path, pattern):
                            expanded.add(file_path)
            except Exception:
                pass

            # Expand against current workspace
            try:
                for file_path in repo_root.rglob(pattern):
                    if file_path.is_file():
                        rel_path = file_path.relative_to(repo_root)
                        expanded.add(str(rel_path))
            except Exception:
                pass
        else:
            expanded.add(pattern)
    return expanded


def _match_glob(path: str, pattern: str) -> bool:
    """Simple glob matching."""
    import fnmatch
    return fnmatch.fnmatch(path, pattern)


async def _compare_trees(repo_root: Path, trusted_ref: str, last_commit: str, paths: set[str]) -> list[str]:
    """Compare trees between last_commit and current HEAD/index/working tree."""
    changed = []

    for path in paths:
        # Check if path exists in last_commit
        try:
            result = subprocess.run(
                ["git", "ls-tree", last_commit, path],
                capture_output=True,
                text=True,
                cwd=repo_root,
            )
            existed_before = result.returncode == 0 and result.stdout.strip() != ""
        except Exception:
            existed_before = False

        # Check current state
        file_path = repo_root / path
        exists_now = file_path.exists()

        if existed_before != exists_now:
            changed.append(path)
            continue

        if exists_now:
            # Compare content
            try:
                result = subprocess.run(
                    ["git", "show", f"{last_commit}:{path}"],
                    capture_output=True,
                    text=True,
                    cwd=repo_root,
                )
                if result.returncode == 0:
                    old_content = result.stdout
                    new_content = file_path.read_text(encoding="utf-8")
                    if old_content != new_content:
                        changed.append(path)
            except Exception:
                changed.append(path)

    # Also check index (staged changes)
    try:
        result = subprocess.run(
            ["git", "diff", "--cached", "--name-only"],
            capture_output=True,
            text=True,
            cwd=repo_root,
        )
        if result.returncode == 0:
            for staged_path in result.stdout.strip().split("\n"):
                if staged_path and any(_match_glob(staged_path, p) for p in paths):
                    if staged_path not in changed:
                        changed.append(staged_path)
    except Exception:
        pass

    # Check working tree changes
    try:
        result = subprocess.run(
            ["git", "diff", "--name-only"],
            capture_output=True,
            text=True,
            cwd=repo_root,
        )
        if result.returncode == 0:
            for wt_path in result.stdout.strip().split("\n"):
                if wt_path and any(_match_glob(wt_path, p) for p in paths):
                    if wt_path not in changed:
                        changed.append(wt_path)
    except Exception:
        pass

    # Check untracked files
    try:
        result = subprocess.run(
            ["git", "ls-files", "--others", "--exclude-standard"],
            capture_output=True,
            text=True,
            cwd=repo_root,
        )
        if result.returncode == 0:
            for untracked_path in result.stdout.strip().split("\n"):
                if untracked_path and any(_match_glob(untracked_path, p) for p in paths):
                    if untracked_path not in changed:
                        changed.append(untracked_path)
    except Exception:
        pass

    return changed