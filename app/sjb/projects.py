"""Routes for projects: list, create, rename, switch, duplicate, delete."""

import os
import shutil
from flask import request, jsonify, Blueprint

from sjb import paths
from sjb.storage import load_json, save_json, slugify
from sjb.library import free_name, load_app_state, write_app_state
from sjb.history import move_to_trash

bp = Blueprint("projects", __name__)

@bp.route('/projects', methods=['GET'])
def api_get_projects():

    os.makedirs(paths.PROJECTS_DIR, exist_ok=True)

    projects = []

    for folder in os.listdir(paths.PROJECTS_DIR):

        project_dir = os.path.join(paths.PROJECTS_DIR, folder)

        # Skip hidden folders such as .trash
        if not os.path.isdir(project_dir) or folder.startswith("."):
            continue

        meta_path = os.path.join(project_dir, "project.json")

        if os.path.exists(meta_path):
            meta = load_json(meta_path)

            projects.append({
                "id": meta.get("id", folder),
                "title": meta.get("title", folder)
            })

        else:
            projects.append({
                "id": folder,
                "title": folder.replace("-", " ").title()
            })

    projects.sort(key=lambda p: p["title"].lower())

    app_state = load_app_state()

    return jsonify({
        "projects": projects,
        "recent": app_state.get("recent_projects", []),
        "current": app_state.get("current_project", "default")
    })


@bp.route('/create_project', methods=['POST'])
def api_create_project():

    data = request.json

    name = data.get("name", "").strip()

    if not name:
        return jsonify({"error": "Missing project name"}), 400

    if os.path.exists(os.path.join(paths.PROJECTS_DIR, slugify(name))):
        return jsonify({"error": "Project already exists"}), 400

    project_slug = make_project(name)

    return jsonify({
        "status": "created",
        "project": project_slug
    })


def make_project(name, project_slug=None):
    """Create an empty project folder and open it; returns its id."""
    project_slug = project_slug or slugify(name)
    project_dir = os.path.join(paths.PROJECTS_DIR, project_slug)

    # Create folders
    os.makedirs(os.path.join(project_dir, "background"))
    os.makedirs(os.path.join(project_dir, "writing"))

    # Create project metadata
    save_json(
        os.path.join(project_dir, "project.json"),
        {
            "id": project_slug,
            "title": name
        }
    )

    # Create state
    save_json(
        os.path.join(project_dir, "state.json"),
        {
            "background": [],
            "writing": [],
            "last_opened_project": {}
        }
    )

    # Update app state
    app_state = load_app_state()

    app_state["current_project"] = project_slug

    recent = app_state.get("recent_projects", [])

    if project_slug in recent:
        recent.remove(project_slug)

    recent.insert(0, project_slug)

    app_state["recent_projects"] = recent[:5]

    write_app_state(app_state)

    return project_slug

@bp.route('/rename_project', methods=['POST'])
def api_rename_project():

    data = request.json

    old_id = data.get("project")
    new_name = data.get("name", "").strip()

    if not old_id or not new_name:
        return jsonify({"error": "Missing data"}), 400

    new_slug = slugify(new_name)

    old_dir = os.path.join(paths.PROJECTS_DIR, old_id)
    new_dir = os.path.join(paths.PROJECTS_DIR, new_slug)

    if not os.path.exists(old_dir):
        return jsonify({"error": "Project not found"}), 404

    if os.path.exists(new_dir):
        return jsonify({"error": "Target project exists"}), 400

    # Rename folder
    os.rename(old_dir, new_dir)

    # Update metadata
    meta_path = os.path.join(new_dir, "project.json")

    meta = load_json(meta_path)

    meta["id"] = new_slug
    meta["title"] = new_name

    save_json(meta_path, meta)

    # Update app state
    app_state = load_app_state()

    if app_state.get("current_project") == old_id:
        app_state["current_project"] = new_slug

    recent = app_state.get("recent_projects", [])

    recent = [
        new_slug if p == old_id else p
        for p in recent
    ]

    app_state["recent_projects"] = recent

    write_app_state(app_state)

    return jsonify({
        "status": "renamed",
        "project": new_slug
    })

@bp.route('/delete_project', methods=['POST'])
def api_delete_project():

    data = request.json

    project = data.get("project")

    if not project:
        return jsonify({"error": "Missing project"}), 400

    if project == "default":
        return jsonify({
            "error": "Cannot delete default project"
        }), 400

    project_dir = os.path.join(paths.PROJECTS_DIR, project)

    if not os.path.exists(project_dir):
        return jsonify({"error": "Project not found"}), 404

    app_state = load_app_state()

    # Get all existing projects BEFORE deletion
    all_projects = [
        p for p in os.listdir(paths.PROJECTS_DIR)
        if os.path.isdir(os.path.join(paths.PROJECTS_DIR, p))
        and not p.startswith(".")
    ]

    # Prevent deleting final project
    if len(all_projects) <= 1:
        return jsonify({
            "error": "At least one project must exist"
        }), 400

    # Move the whole project to Projects/.trash instead of deleting it
    move_to_trash(project_dir, os.path.join(paths.PROJECTS_DIR, ".trash"))

    # Remove from recents
    recent = app_state.get("recent_projects", [])

    recent = [
        p for p in recent
        if p != project
    ]

    app_state["recent_projects"] = recent

    # Determine surviving project
    remaining_projects = [
        p for p in all_projects
        if p != project
    ]

    # Prefer most recent surviving project
    new_current = None

    for p in recent:
        if p in remaining_projects:
            new_current = p
            break

    # Fallback alphabetical
    if not new_current and remaining_projects:
        new_current = sorted(remaining_projects)[0]

    # Emergency fallback
    if not new_current:
        new_current = "default"

    # Update current project
    if app_state.get("current_project") == project:
        app_state["current_project"] = new_current

    write_app_state(app_state)

    return jsonify({
        "status": "deleted",
        "current_project": app_state["current_project"]
    })

@bp.route('/switch_project', methods=['POST'])
def api_switch_project():

    data = request.json

    project = data.get("project")

    if not project:
        return jsonify({"error": "Missing project"}), 400

    project_dir = os.path.join(paths.PROJECTS_DIR, project)

    if not os.path.exists(project_dir):
        return jsonify({"error": "Project not found"}), 404

    app_state = load_app_state()

    app_state["current_project"] = project

    recent = app_state.get("recent_projects", [])

    if project in recent:
        recent.remove(project)

    recent.insert(0, project)

    app_state["recent_projects"] = recent[:5]

    write_app_state(app_state)

    return jsonify({"status": "switched"})


@bp.route('/duplicate_project', methods=['POST'])
def api_duplicate_project():
    data = request.json
    project = data.get("project")
    src = os.path.join(paths.PROJECTS_DIR, project or "")

    if not project or not os.path.isdir(src):
        return jsonify({"error": "Project not found"}), 404

    new_id = free_name(lambda c: os.path.exists(os.path.join(paths.PROJECTS_DIR, c)), project)
    dest = os.path.join(paths.PROJECTS_DIR, new_id)
    # The copy starts clean: no version history, trash, or temp files
    shutil.copytree(src, dest, ignore=shutil.ignore_patterns(".history", ".trash", ".tmp-*"))

    meta = load_json(os.path.join(src, "project.json")) or {}
    title = f"{meta.get('title') or project} (copy)"
    save_json(os.path.join(dest, "project.json"), {**meta, "id": new_id, "title": title})
    return jsonify({"status": "duplicated", "project": new_id, "title": title})
