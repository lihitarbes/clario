import type { FormFieldDefinition } from "@/types/database";

export const HEALTH_DECLARATION_STARTER_KEY = "health_declaration";
export const HEALTH_DECLARATION_HEBREW_STARTER_KEY = "health_declaration_he";

export type FormStarterKey =
  | typeof HEALTH_DECLARATION_STARTER_KEY
  | typeof HEALTH_DECLARATION_HEBREW_STARTER_KEY;

export type FormStarterDefinition = {
  key: FormStarterKey;
  pageTitle: string;
  pageDescription: string;
  title: string;
  description: string;
  fields: FormFieldDefinition[];
};

/**
 * Application-defined starter for "Health Declaration — English".
 * IDs are generated when instantiated; they remain stable for that form row.
 */
export function createHealthDeclarationStarterFields(): FormFieldDefinition[] {
  const qMedConditions = crypto.randomUUID();
  const qMedConditionsDetail = crypto.randomUUID();
  const qAllergies = crypto.randomUUID();
  const qAllergiesDetail = crypto.randomUUID();
  const qMedications = crypto.randomUUID();
  const qMedicationsDetail = crypto.randomUUID();
  const qSurgery = crypto.randomUUID();
  const qSurgeryDetail = crypto.randomUUID();
  const qPregnancy = crypto.randomUUID();
  const qOtherHealth = crypto.randomUUID();
  const qDeclaration = crypto.randomUUID();

  return [
    {
      id: qMedConditions,
      label: "Do you currently have any medical conditions?",
      type: "yes_no",
      required: true,
      order: 0,
    },
    {
      id: qMedConditionsDetail,
      label: "Please specify.",
      type: "long_text",
      required: true,
      order: 1,
      visibleWhen: { questionId: qMedConditions, value: "yes" },
    },
    {
      id: qAllergies,
      label: "Do you have any allergies or sensitivities?",
      type: "yes_no",
      required: true,
      order: 2,
    },
    {
      id: qAllergiesDetail,
      label: "Please specify.",
      type: "long_text",
      required: true,
      order: 3,
      visibleWhen: { questionId: qAllergies, value: "yes" },
    },
    {
      id: qMedications,
      label: "Do you take any medications regularly?",
      type: "yes_no",
      required: true,
      order: 4,
    },
    {
      id: qMedicationsDetail,
      label: "Medication details",
      type: "long_text",
      required: true,
      order: 5,
      visibleWhen: { questionId: qMedications, value: "yes" },
    },
    {
      id: qSurgery,
      label: "Have you undergone surgery or been hospitalized?",
      type: "yes_no",
      required: true,
      order: 6,
    },
    {
      id: qSurgeryDetail,
      label: "Please provide details.",
      type: "long_text",
      required: true,
      order: 7,
      visibleWhen: { questionId: qSurgery, value: "yes" },
    },
    {
      id: qPregnancy,
      label: "Are you currently pregnant or could you be pregnant?",
      type: "single_choice",
      required: true,
      order: 8,
      options: ["Yes", "No", "Not applicable"],
    },
    {
      id: qOtherHealth,
      label: "Is there any other health information your practitioner should know?",
      type: "long_text",
      required: false,
      order: 9,
    },
    {
      id: qDeclaration,
      label:
        "I confirm that the information provided is accurate and up to date.",
      type: "checkbox",
      required: true,
      order: 10,
    },
  ];
}

/**
 * Application-defined starter "הצהרת בריאות — עברית".
 * yes_no conditional rules use canonical values "yes" / "no" (not Hebrew labels).
 */
export function createHealthDeclarationHebrewStarterFields(): FormFieldDefinition[] {
  const qMedConditions = crypto.randomUUID();
  const qMedConditionsDetail = crypto.randomUUID();
  const qAllergies = crypto.randomUUID();
  const qAllergiesDetail = crypto.randomUUID();
  const qMedications = crypto.randomUUID();
  const qMedicationsDetail = crypto.randomUUID();
  const qSurgery = crypto.randomUUID();
  const qSurgeryDetail = crypto.randomUUID();
  const qPregnancy = crypto.randomUUID();
  const qOtherHealth = crypto.randomUUID();
  const qDeclaration = crypto.randomUUID();

  return [
    {
      id: qMedConditions,
      label: "האם קיימים מצבים רפואיים שחשוב שנדע עליהם?",
      type: "yes_no",
      required: true,
      order: 0,
    },
    {
      id: qMedConditionsDetail,
      label: "אנא פרט/י",
      type: "long_text",
      required: true,
      order: 1,
      visibleWhen: { questionId: qMedConditions, value: "yes" },
    },
    {
      id: qAllergies,
      label: "האם קיימות אלרגיות או רגישויות?",
      type: "yes_no",
      required: true,
      order: 2,
    },
    {
      id: qAllergiesDetail,
      label: "אנא פרט/י",
      type: "long_text",
      required: true,
      order: 3,
      visibleWhen: { questionId: qAllergies, value: "yes" },
    },
    {
      id: qMedications,
      label: "האם את/ה נוטל/ת תרופות באופן קבוע?",
      type: "yes_no",
      required: true,
      order: 4,
    },
    {
      id: qMedicationsDetail,
      label: "אנא פרט/י אילו תרופות",
      type: "long_text",
      required: true,
      order: 5,
      visibleWhen: { questionId: qMedications, value: "yes" },
    },
    {
      id: qSurgery,
      label: "האם עברת ניתוח או אשפוז בעבר?",
      type: "yes_no",
      required: true,
      order: 6,
    },
    {
      id: qSurgeryDetail,
      label: "אנא פרט/י",
      type: "long_text",
      required: true,
      order: 7,
      visibleWhen: { questionId: qSurgery, value: "yes" },
    },
    {
      id: qPregnancy,
      label: "האם את בהריון או ייתכן שאת בהריון?",
      type: "single_choice",
      required: true,
      order: 8,
      options: ["כן", "לא", "לא רלוונטי"],
    },
    {
      id: qOtherHealth,
      label: "מידע רפואי נוסף שחשוב שנדע",
      type: "long_text",
      required: false,
      order: 9,
    },
    {
      id: qDeclaration,
      label: "אני מאשר/ת שהמידע שמסרתי נכון ומעודכן.",
      type: "checkbox",
      required: true,
      order: 10,
    },
  ];
}

export function getFormStarterDefinition(
  starter: string | undefined,
): FormStarterDefinition | null {
  if (starter === HEALTH_DECLARATION_STARTER_KEY) {
    return {
      key: HEALTH_DECLARATION_STARTER_KEY,
      pageTitle: "New Health Declaration",
      pageDescription:
        "Review and customize the English Health Declaration starter before saving.",
      title: "Health Declaration",
      description: "Please complete this health declaration before your visit.",
      fields: createHealthDeclarationStarterFields(),
    };
  }

  if (starter === HEALTH_DECLARATION_HEBREW_STARTER_KEY) {
    return {
      key: HEALTH_DECLARATION_HEBREW_STARTER_KEY,
      pageTitle: "הצהרת בריאות חדשה",
      pageDescription:
        "Review and customize the Hebrew Health Declaration starter before saving.",
      title: "הצהרת בריאות",
      description: "יש למלא הצהרת בריאות זו לפני הטיפול.",
      fields: createHealthDeclarationHebrewStarterFields(),
    };
  }

  return null;
}

/** @deprecated Use getFormStarterDefinition */
export function isHealthDeclarationStarterKey(
  value: string | undefined,
): boolean {
  return value === HEALTH_DECLARATION_STARTER_KEY;
}
