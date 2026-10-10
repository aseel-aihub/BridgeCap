/*
 * Wakib
 * Author: Aseel
 * (c) 2026 Aseel. All rights reserved.
 * Do not copy or reuse this code or idea without written permission.
 *
 * File: data.js
 * All the demo data of the project (skills, students, companies, challenges).
 *
 * NOTE: All names here are FICTIONAL. No real company or partnership.
 */

"use strict";

// The list of skills used everywhere in the platform.
const SKILLS = Object.freeze([
  "Python", "AI / ML", "Cyber Security", "UI / UX Design",
  "Data Analysis", "Cloud Systems", "Project Management", "Business Analysis",
]);

// Skill level goes from 0 (none) to 5 (expert).
const MIN_LEVEL = 0;
const MAX_LEVEL = 5;

// Fictional students. Each one has skills with a level from 1 to 5.
const STUDENT_POOL = Object.freeze([
  { id: "s1", name: "Lama",   skills: { "Data Analysis": 5, "AI / ML": 4, "Business Analysis": 3 } },
  { id: "s2", name: "Faisal", skills: { "Python": 5, "UI / UX Design": 3, "Cloud Systems": 3 } },
  { id: "s3", name: "Noura",  skills: { "UI / UX Design": 5, "Project Management": 4, "Business Analysis": 2 } },
  { id: "s4", name: "Omar",   skills: { "Cyber Security": 5, "Cloud Systems": 4, "Python": 2 } },
  { id: "s5", name: "Sara",   skills: { "Python": 4, "Data Analysis": 4, "UI / UX Design": 2 } },
  { id: "s6", name: "Khalid", skills: { "Project Management": 5, "Business Analysis": 4, "Cloud Systems": 2 } },
  { id: "s7", name: "Reem",   skills: { "AI / ML": 5, "Python": 4, "Data Analysis": 3 } },
  { id: "s8", name: "Yousef", skills: { "Cloud Systems": 5, "Cyber Security": 3, "Python": 3 } },
]);

// Fictional companies.
const COMPANIES = Object.freeze([
  { id: "c1", name: "Manara Energy",  sector: "Energy & Industrial" },
  { id: "c2", name: "Etisal Secure",  sector: "Telecom & Cybersecurity" },
  { id: "c3", name: "Najm Logistics", sector: "SME & Logistics" },
]);

// Challenges posted by the companies. "required" = skills + level needed.
const CHALLENGES = Object.freeze([
  {
    id: "ch1", companyId: "c1",
    title: "AI-Driven Predictive Maintenance for Pipeline Valves",
    description: "Develop ML algorithms to predict pipeline valve failure based on IoT sensor data streams.",
    required: { "Python": 5, "AI / ML": 4, "Data Analysis": 4 },
  },
  {
    id: "ch2", companyId: "c2",
    title: "Zero-Trust Security Framework for Telecom Infrastructure",
    description: "Implement a zero-trust policy model for securing edge nodes and cloud servers.",
    required: { "Cyber Security": 5, "Cloud Systems": 4 },
  },
  {
    id: "ch3", companyId: "c3",
    title: "Smart Logistics Platform for E-Commerce SMEs",
    description: "Build an intuitive dashboard connecting small merchants to local courier fleets.",
    required: { "UI / UX Design": 4, "Python": 3, "Data Analysis": 3, "Project Management": 2 },
  },
]);

// Project stages linked to the Saudi capstone courses:
// GP1 = proposal and design, GP2 = building and testing.
const MILESTONE_TEMPLATE = Object.freeze([
  { name: "Problem Definition & Proposal", course: "GP1" },
  { name: "Requirements & Design",         course: "GP1" },
  { name: "Development",                   course: "GP2" },
  { name: "Testing & Evaluation",          course: "GP2" },
  { name: "Final Report & Presentation",   course: "GP2" },
]);

// The only allowed milestone statuses (used to check saved data).
const MILESTONE_STATUSES = Object.freeze(["Not started", "In progress", "Done"]);

// Small helpers to find a company or a challenge by its id.
function getCompany(id) {
  return COMPANIES.find(c => c.id === id) || null;
}

function getChallenge(id) {
  return CHALLENGES.find(c => c.id === id) || null;
}
