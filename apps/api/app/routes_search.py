"""Search API routes — public, read-only endpoints for class catalog search."""
from __future__ import annotations

import dataclasses

from flask import Blueprint, current_app, g, jsonify, request

from app.catalog_cache import get_or_fetch_catalog

bp = Blueprint("search", __name__)


def _school_to_dict(school) -> dict:
    return dataclasses.asdict(school)


@bp.get("/schools")
def list_schools():
    schools = current_app.extensions["schools"]
    return jsonify([_school_to_dict(s) for s in schools])


@bp.get("/terms")
def list_terms():
    school_id = request.args.get("school_id")
    if not school_id:
        return jsonify({"error": "school_id is required"}), 400

    search_registry = current_app.extensions["search_registry"]
    adapter = search_registry.get(school_id)
    if adapter is None:
        return jsonify({"error": f"Unknown school: {school_id}"}), 404

    terms = adapter.get_terms()
    return jsonify([dataclasses.asdict(t) for t in terms])


@bp.get("/subjects")
def list_subjects():
    school_id = request.args.get("school_id")
    term_ref = request.args.get("term_ref")
    if not school_id or not term_ref:
        return jsonify({"error": "school_id and term_ref are required"}), 400

    search_registry = current_app.extensions["search_registry"]
    adapter = search_registry.get(school_id)
    if adapter is None:
        return jsonify({"error": f"Unknown school: {school_id}"}), 404

    subjects = adapter.get_subjects(term_ref)
    return jsonify([dataclasses.asdict(s) for s in subjects])


@bp.get("/classes")
def list_classes():
    school_id = request.args.get("school_id")
    term_ref = request.args.get("term_ref")
    subject_code = request.args.get("subject_code")
    if not school_id or not term_ref or not subject_code:
        return jsonify({"error": "school_id, term_ref, and subject_code are required"}), 400

    search_registry = current_app.extensions["search_registry"]
    adapter = search_registry.get(school_id)
    if adapter is None:
        return jsonify({"error": f"Unknown school: {school_id}"}), 404

    try:
        payload = get_or_fetch_catalog(
            db=g.db,
            school_id=school_id,
            term_ref=term_ref,
            subject_code=subject_code,
            search_provider=adapter,
        )
        return jsonify(payload)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 502
