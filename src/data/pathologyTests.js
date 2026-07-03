export const TESTS_STORAGE_KEY = 'billing_pathology_tests'

export const pathologyTests = [
  { name: "Complete Blood Count (CBC)", amount: 350 },
  { name: "Hemoglobin (Hb)", amount: 100 },
  { name: "Total Leucocyte Count (TLC)", amount: 100 },
  { name: "Differential Leucocyte Count (DLC)", amount: 100 },
  { name: "Platelet Count", amount: 150 },
  { name: "Erythrocyte Sedimentation Rate (ESR)", amount: 100 },
  { name: "Blood Group & Rh Type", amount: 150 },
  { name: "Peripheral Smear Examination", amount: 200 },
  { name: "Absolute Eosinophil Count (AEC)", amount: 150 },
  { name: "Reticulocyte Count", amount: 200 },
  { name: "Malaria Parasite (MP) Slide", amount: 150 },
  { name: "Malaria Antigen (Rapid)", amount: 300 },
  { name: "Dengue NS1 Antigen", amount: 600 },
  { name: "Dengue IgG & IgM", amount: 600 },
  { name: "Typhoid (Widal)", amount: 200 },
  { name: "Typhoid IgG & IgM", amount: 400 },
  { name: "Blood Sugar Fasting (BSF)", amount: 100 },
  { name: "Blood Sugar Post Prandial (BSPP)", amount: 100 },
  { name: "Blood Sugar Random (BSR)", amount: 100 },
  { name: "HbA1c (Glycosylated Hemoglobin)", amount: 500 },
  { name: "Lipid Profile", amount: 600 },
  { name: "Liver Function Test (LFT)", amount: 600 },
  { name: "Kidney Function Test (KFT)", amount: 600 },
  { name: "Uric Acid", amount: 200 },
  { name: "Calcium (Total)", amount: 200 },
  { name: "Phosphorus", amount: 200 },
  { name: "Alkaline Phosphatase", amount: 200 },
  { name: "Total Protein & Albumin", amount: 200 },
  { name: "Bilirubin (Total, Direct, Indirect)", amount: 200 },
  { name: "SGOT (AST)", amount: 200 },
  { name: "SGPT (ALT)", amount: 200 },
  { name: "Thyroid Profile (T3, T4, TSH)", amount: 500 },
  { name: "TSH (Thyroid Stimulating Hormone)", amount: 250 },
  { name: "Urine Routine & Microscopy", amount: 150 },
  { name: "Stool Routine & Microscopy", amount: 150 },
  { name: "Semen Analysis", amount: 300 },
  { name: "Pregnancy Test (Urine)", amount: 100 },
  { name: "HIV 1 & 2 (Rapid)", amount: 300 },
  { name: "HBsAg (Hepatitis B)", amount: 300 },
  { name: "HCV (Hepatitis C)", amount: 300 },
  { name: "VDRL / RPR", amount: 200 },
  { name: "RA Factor", amount: 300 },
  { name: "CRP (C-Reactive Protein)", amount: 300 },
  { name: "ASO Titre", amount: 300 },
  { name: "Vitamin B12", amount: 800 },
  { name: "Vitamin D3", amount: 1000 },
  { name: "Serum Electrolytes (Na, K, Cl)", amount: 500 },
  { name: "Serum Amylase", amount: 400 },
  { name: "Serum Lipase", amount: 400 },
  { name: "Iron Studies", amount: 800 },
  { name: "Ferritin", amount: 500 },
  { name: "Coagulation Profile (PT/INR, APTT)", amount: 600 },
  { name: "Bleeding Time (BT) & Clotting Time (CT)", amount: 100 },
  { name: "Blood Group & Rh Factor", amount: 150 },
  { name: "Peripheral Smear", amount: 200 },
  { name: "Dengue IgG", amount: 600 },
  { name: "Dengue IgM", amount: 600 },
  { name: "Widal Test", amount: 200 },
  { name: "Fasting Blood Sugar (FBS)", amount: 100 },
  { name: "Post Prandial Blood Sugar (PPBS)", amount: 100 },
  { name: "Random Blood Sugar (RBS)", amount: 100 },
  { name: "HbA1c", amount: 500 },
  { name: "Total Cholesterol", amount: 250 },
  { name: "HDL Cholesterol", amount: 250 },
  { name: "LDL Cholesterol", amount: 250 },
  { name: "Triglycerides", amount: 250 },
  { name: "VLDL", amount: 250 },
  { name: "Alkaline Phosphatase (ALP)", amount: 200 },
  { name: "Bilirubin Total", amount: 200 },
  { name: "Bilirubin Direct", amount: 200 },
  { name: "Bilirubin Indirect", amount: 200 },
  { name: "Total Protein", amount: 200 },
  { name: "Albumin", amount: 200 },
  { name: "Globulin", amount: 200 },
  { name: "A/G Ratio", amount: 200 },
  { name: "Serum Creatinine", amount: 250 },
  { name: "Blood Urea", amount: 200 },
  { name: "Sodium", amount: 200 },
  { name: "Potassium", amount: 200 },
  { name: "Chloride", amount: 200 },
  { name: "Calcium", amount: 200 },
  { name: "T3", amount: 250 },
  { name: "T4", amount: 250 },
  { name: "TSH", amount: 250 },
  { name: "Urine Routine", amount: 150 },
  { name: "Urine Microscopy", amount: 150 },
  { name: "Urine Culture & Sensitivity", amount: 400 },
  { name: "Microalbumin (Urine)", amount: 300 },
  { name: "Stool Routine", amount: 150 },
  { name: "Stool Occult Blood", amount: 200 },
  { name: "COVID-19 RT-PCR", amount: 800 },
  { name: "COVID-19 Rapid Antigen", amount: 500 },
  { name: "HIV 1 & 2", amount: 300 },
  { name: "HBsAg", amount: 300 },
  { name: "Anti-HCV", amount: 300 },
  { name: "VDRL", amount: 200 },
  { name: "CRP", amount: 300 },
  { name: "ASO", amount: 300 },
  { name: "Vitamin D (25-OH)", amount: 1000 },
  { name: "Iron", amount: 300 },
  { name: "TIBC", amount: 300 },
  { name: "ECG", amount: 300 },
  { name: "Troponin I", amount: 600 },
  { name: "CK-MB", amount: 600 },
  { name: "TMT", amount: 1500 },
  { name: "Echo", amount: 1500 },
  { name: "X-Ray", amount: 400 },
  { name: "Ultrasound (USG)", amount: 800 },
  { name: "CT Scan", amount: 2500 },
  { name: "MRI", amount: 3500 },
  { name: "Testosterone", amount: 800 },
  { name: "Estrogen", amount: 800 },
  { name: "Progesterone", amount: 800 },
  { name: "Prolactin", amount: 800 },
  { name: "LH", amount: 800 },
  { name: "FSH", amount: 800 },
  { name: "Beta hCG", amount: 600 },
  { name: "TORCH Profile", amount: 1500 },
  { name: "PCOD Profile", amount: 1500 },
  { name: "Full Body Checkup", amount: 2500 },
  { name: "Diabetes Package", amount: 1500 },
  { name: "Heart Checkup Package", amount: 3000 },
  { name: "Senior Citizen Package", amount: 2000 }
];

export const getDefaultPathologyTests = () => pathologyTests

export const getPathologyTests = () => {
  try {
    const raw = localStorage.getItem(TESTS_STORAGE_KEY)
    if (!raw) return pathologyTests
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return pathologyTests

    const clean = parsed
      .map((item) => ({
        name: String(item?.name || '').trim(),
        amount: Number(item?.amount) || 0,
      }))
      .filter((item) => item.name)

    return clean.length ? clean : pathologyTests
  } catch {
    return pathologyTests
  }
}

export const savePathologyTests = (tests) => {
  const clean = Array.isArray(tests)
    ? tests
        .map((item) => ({
          name: String(item?.name || '').trim(),
          amount: Math.max(0, Number(item?.amount) || 0),
        }))
        .filter((item) => item.name)
    : []

  localStorage.setItem(TESTS_STORAGE_KEY, JSON.stringify(clean))
  return clean
}

export const resetPathologyTests = () => {
  localStorage.removeItem(TESTS_STORAGE_KEY)
}
