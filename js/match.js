/*
 * BridgeCap
 * Author: Aseel
 * (c) 2026 Aseel. All rights reserved.
 * Do not copy or reuse this code or idea without written permission.
 *
 * File: match.js
 * The "brain" of the platform: matching score, explanation, team building, skills gap.
 */

"use strict";

// Turn a skills object like {"Python": 4} into a list of numbers in SKILLS order.
function vectorFor(skillDict) {
  return SKILLS.map(skill => Number(skillDict[skill]) || 0);
}

// Cosine similarity = how close two lists of numbers point in the same direction.
// Result is between 0 (no match) and 1 (perfect match).
function cosineSimilarity(aDict, bDict) {
  const a = vectorFor(aDict);
  const b = vectorFor(bDict);
  let dot = 0, sizeA = 0, sizeB = 0;

  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i]; // multiply and add
    sizeA += a[i] * a[i];
    sizeB += b[i] * b[i];
  }

  // If one list is all zeros we can't divide, so the score is 0.
  if (sizeA === 0 || sizeB === 0) return 0;
  return dot / (Math.sqrt(sizeA) * Math.sqrt(sizeB));
}

// Same score but as a percentage (0 - 100) to show on screen.
function compatibilityScore(studentSkills, challengeRequired) {
  return Math.round(cosineSimilarity(studentSkills, challengeRequired) * 100);
}

// Explain the score: which required skills the student has and which are missing.
function explainMatch(studentSkills, challengeRequired) {
  const covered = [];
  const missing = [];
  Object.keys(challengeRequired).forEach(skill => {
    if ((Number(studentSkills[skill]) || 0) > 0) covered.push(skill);
    else missing.push(skill);
  });
  return { covered, missing };
}

/*
 * Build a balanced team (greedy method):
 * every round we add the student who fills the biggest part of what is STILL needed.
 * So we get students who complete each other, not 4 people with the same skill.
 *
 * Returns: { team, coveragePct, remaining }
 */
function formBalancedTeam(required, candidates, teamSize = 4) {
  // Keep team size safe (between 1 and 10).
  const size = Math.min(Math.max(parseInt(teamSize, 10) || 4, 1), 10);

  const remaining = { ...required }; // what is still needed
  const pool = [...candidates];      // copy so we don't change the original
  const team = [];

  while (team.length < size && pool.length > 0) {
    let best = null;
    let bestPoints = 0;
    let bestIndex = -1;

    // Check every candidate: how many needed points can they cover?
    pool.forEach((cand, index) => {
      let points = 0;
      SKILLS.forEach(skill => {
        const need = remaining[skill] || 0;
        const has = Number(cand.skills[skill]) || 0;
        points += Math.min(need, has);
      });
      if (points > bestPoints) {
        bestPoints = points;
        best = cand;
        bestIndex = index;
      }
    });

    // Nobody adds anything new -> stop.
    if (!best) break;

    // Reduce what is still needed by what this student brings.
    SKILLS.forEach(skill => {
      if (remaining[skill]) {
        remaining[skill] = Math.max(0, remaining[skill] - (Number(best.skills[skill]) || 0));
      }
    });

    team.push({ id: best.id, name: best.name, skills: { ...best.skills }, contribution: bestPoints });
    pool.splice(bestIndex, 1); // remove from pool
  }

  // Coverage % = how much of the required points the team covers.
  const totalNeed = Object.values(required).reduce((sum, v) => sum + v, 0);
  const totalLeft = Object.values(remaining).reduce((sum, v) => sum + v, 0);
  const coveragePct = totalNeed ? Math.round(((totalNeed - totalLeft) / totalNeed) * 100) : 100;

  return { team, coveragePct, remaining };
}

/*
 * Skills gap for the University/Ministry portal.
 * supply = average level of ALL students in this skill.
 * demand = average level asked by the challenges that need this skill.
 * gap = demand - supply (positive = students are behind the market).
 */
function computeSkillsGap(students, challenges) {
  return SKILLS.map(skill => {
    const supplyList = students.map(s => Number(s.skills[skill]) || 0);
    const demandList = challenges.map(c => c.required[skill] || 0).filter(v => v > 0);

    const avgSupply = supplyList.length
      ? supplyList.reduce((a, b) => a + b, 0) / supplyList.length : 0;
    const avgDemand = demandList.length
      ? demandList.reduce((a, b) => a + b, 0) / demandList.length : 0;

    return {
      skill,
      avgSupply: +avgSupply.toFixed(2),
      avgDemand: +avgDemand.toFixed(2),
      gap: +(avgDemand - avgSupply).toFixed(2),
    };
  }).sort((a, b) => b.gap - a.gap); // biggest gap first
}
