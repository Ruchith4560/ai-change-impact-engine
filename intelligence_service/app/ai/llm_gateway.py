"""Controlled Gemini LLM Gateway for evidence-grounded developer explanations."""
import json
import os
from typing import Dict, Any, Optional
from app.core.config import settings
from app.core.logging import get_logger
from app.models.analysis_models import AIExplanation
from app.ai.prompt_templates import SYSTEM_INSTRUCTION, build_evidence_prompt

logger = get_logger("llm_gateway")


class GeminiExplanationGateway:
    """Interfaces with Gemini models to synthesize evidence into actionable reports."""

    @classmethod
    def synthesize_explanation(cls, structured_evidence: Dict[str, Any]) -> AIExplanation:
        """Synthesizes structured evidence using Gemini LLM with deterministic fallback."""
        api_key = settings.gemini_api_key or os.getenv("GEMINI_API_KEY", "")

        if not api_key:
            logger.info("No GEMINI_API_KEY detected; using deterministic template synthesis.")
            return cls._generate_deterministic_fallback(structured_evidence)

        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            prompt = build_evidence_prompt(structured_evidence)

            # Use gemini-2.5-flash or fallback model
            model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config={
                    "system_instruction": SYSTEM_INSTRUCTION,
                    "response_mime_type": "application/json",
                    "temperature": 0.1,  # Low temperature for factual precision
                },
            )

            raw_json = json.loads(response.text)
            return AIExplanation(
                summary_markdown=raw_json.get("summary_markdown", ""),
                review_checklist=raw_json.get("review_checklist", []),
                failure_modes=raw_json.get("failure_modes", []),
                is_generated_by_llm=True,
            )
        except Exception as e:
            logger.warning(f"Gemini API generation failed ({e}); falling back to deterministic template.")
            return cls._generate_deterministic_fallback(structured_evidence)

    @classmethod
    def _generate_deterministic_fallback(cls, evidence: Dict[str, Any]) -> AIExplanation:
        """Deterministic rule-based explanation generated directly from ground-truth evidence."""
        changed_symbols = evidence.get("changed_symbols", [])
        risk_score = evidence.get("risk_score", 0)
        risk_level = evidence.get("risk_level", "LOW")
        impacted_count = evidence.get("impacted_entities_count", 0)
        top_factors = evidence.get("top_factors", [])
        recommended_tests = evidence.get("recommended_tests", [])

        sym_names = [s.get("qualified_name", "") for s in changed_symbols[:3]]
        sym_text = ", ".join(f"`{s}`" for s in sym_names) if sym_names else "modified files"

        factor_bullets = []
        for f in top_factors[:3]:
            factor_bullets.append(f"**{f.get('name')}**: {f.get('evidence')} (+{f.get('contribution_points')} pts)")

        summary = (
            f"### Change Risk Assessment: {risk_level} ({risk_score}/100)\n\n"
            f"This change modifies {len(changed_symbols)} code entities ({sym_text}). "
            f"Reverse reachability analysis determined a downstream blast radius of **{impacted_count} affected components**.\n\n"
            f"**Key Risk Drivers:**\n"
            + "\n".join(f"- {b}" for b in factor_bullets)
        )

        checklist = [
            f"Verify all downstream callers of {sym_text} handle modified signatures/return types.",
            f"Execute the {len(recommended_tests)} recommended test suites before merging.",
            "Inspect error logs for any runtime unhandled rejections or parameter mismatches.",
        ]

        failure_modes = [
            "Downstream callers may encounter runtime type errors or signature mismatch if unpatched.",
            "Unhandled edge cases in modified bodies could cause silent data corruption in dependent pipelines.",
        ]

        return AIExplanation(
            summary_markdown=summary,
            review_checklist=checklist,
            failure_modes=failure_modes,
            is_generated_by_llm=False,
        )
