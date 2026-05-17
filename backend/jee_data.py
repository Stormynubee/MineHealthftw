"""Hardcoded JEE 11th/12th syllabus - Physics, Chemistry, Maths."""

JEE_SYLLABUS = {
    "physics": {
        "11": [
            "Units & Measurements",
            "Kinematics",
            "Laws of Motion",
            "Work, Energy & Power",
            "System of Particles & Rotational Motion",
            "Gravitation",
            "Mechanical Properties of Solids & Fluids",
            "Thermal Properties of Matter",
            "Thermodynamics",
            "Kinetic Theory of Gases",
            "Oscillations",
            "Waves",
        ],
        "12": [
            "Electrostatics",
            "Current Electricity",
            "Moving Charges & Magnetism",
            "Magnetism and Matter",
            "Electromagnetic Induction",
            "Alternating Current",
            "Electromagnetic Waves",
            "Ray Optics",
            "Wave Optics",
            "Dual Nature of Radiation & Matter",
            "Atoms & Nuclei",
            "Semiconductor Electronics",
        ],
    },
    "chemistry": {
        "11": [
            "Some Basic Concepts of Chemistry",
            "Structure of Atom",
            "Classification of Elements & Periodicity",
            "Chemical Bonding & Molecular Structure",
            "States of Matter",
            "Thermodynamics",
            "Equilibrium",
            "Redox Reactions",
            "Hydrogen",
            "The s-Block Elements",
            "The p-Block Elements",
            "Organic Chemistry: Basic Principles",
            "Hydrocarbons",
            "Environmental Chemistry",
        ],
        "12": [
            "The Solid State",
            "Solutions",
            "Electrochemistry",
            "Chemical Kinetics",
            "Surface Chemistry",
            "General Principles of Metallurgy",
            "The p-Block Elements",
            "The d and f-Block Elements",
            "Coordination Compounds",
            "Haloalkanes and Haloarenes",
            "Alcohols, Phenols and Ethers",
            "Aldehydes, Ketones & Carboxylic Acids",
            "Amines",
            "Biomolecules",
            "Polymers",
            "Chemistry in Everyday Life",
        ],
    },
    "maths": {
        "11": [
            "Sets",
            "Relations and Functions",
            "Trigonometric Functions",
            "Principle of Mathematical Induction",
            "Complex Numbers & Quadratic Equations",
            "Linear Inequalities",
            "Permutations & Combinations",
            "Binomial Theorem",
            "Sequences & Series",
            "Straight Lines",
            "Conic Sections",
            "3D Geometry Intro",
            "Limits & Derivatives",
            "Mathematical Reasoning",
            "Statistics",
            "Probability",
        ],
        "12": [
            "Relations and Functions",
            "Inverse Trigonometric Functions",
            "Matrices",
            "Determinants",
            "Continuity & Differentiability",
            "Application of Derivatives",
            "Integrals",
            "Application of Integrals",
            "Differential Equations",
            "Vector Algebra",
            "3D Geometry",
            "Linear Programming",
            "Probability",
        ],
    },
}


def flat_topics():
    """Yield (subject, class_level, chapter, topic_id)."""
    items = []
    for subject, grades in JEE_SYLLABUS.items():
        for grade, chapters in grades.items():
            for chapter in chapters:
                topic_id = f"{subject}-{grade}-{chapter.lower().replace(' ', '-').replace('&', 'and').replace(',', '').replace(':', '').replace('(', '').replace(')', '')}"
                items.append({
                    "id": topic_id,
                    "subject": subject,
                    "class": grade,
                    "chapter": chapter,
                })
    return items
