"""Rigid structured prompt templates for zero-hallucination AI explanation."""
import json
from typing import Dict, Any

SYSTEM_INSTRUCTION = """You are an expert Developer Tools & Code Review Intelligence AI for the "AI Change Impact Engine".
Your objective is to produce a concise, professional, evidence-based code change summary and PR review checklist.

CRITICAL CONSTRAINTS:
1. Ground truth strictly in the provided Structured Evidence JSON.
2. DO NOT hallucinate external libraries, unseen methods, or unverified bugs.
3. If an impact is flagged, explain the exact causal path provided in the evidence.
4. Output MUST conform strictly to the requested JSON schema.
"""


def build_evidence_prompt(evidence: Dict[str, Any]) -> str:
    """Serializes structured analysis evidence into a rigid prompt payload."""
    return f"""Analyze this verified change evidence and synthesize a developer explanation.

STRUCTURED EVIDENCE:
{json.dumps(evidence, indent=2)}

RESPONSE FORMAT (JSON):
{{
  "summary_markdown": "2-3 concise paragraphs summarizing the change, why downstream entities are affected, and the risk level.",
  "review_checklist": [
    "Concrete verification check 1",
    "Concrete verification check 2",
    "Concrete verification check 3"
  ],
  "failure_modes": [
    "Failure mode 1 if callers are not updated",
    "Failure mode 2 if test coverage is insufficient"
  ]
}}
"""
