export type ProficiencyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export interface SkillOption { id: number; name: string; }
export interface StudentSkill {
  skillId: number;
  skillName: string;
  proficiencyLevel: ProficiencyLevel;
  createdAt: string;
}
